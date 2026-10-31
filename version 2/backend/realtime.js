const { WebSocketServer, WebSocket } = require('ws');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { sendMessage } = require('./services/chat');

function attachRealtime(server, { origins = [], authenticate } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  const sessions = new Map();
  const verify = authenticate || (async req => {
    const token = cookie.parse(req.headers.cookie || '').token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId || decoded.id).select('_id isActive');
    if (!user?.isActive) throw new Error('Sign in required');
    return { id: String(user._id), expires: decoded.exp * 1000 };
  });
  const send = (socket, data) => {
    if (socket.readyState === WebSocket.OPEN) {
      if (socket.bufferedAmount > 1024 * 1024) return socket.close(1013, 'Connection overloaded');
      socket.send(JSON.stringify(data));
    }
  };
  function publish(participants, data) {
    for (const id of participants) for (const socket of sessions.get(String(id)) || []) send(socket, data);
  }
  function disconnect(userId) {
    for (const socket of sessions.get(String(userId)) || []) socket.close(1008, 'Signed out');
  }
  server.on('upgrade', async (req, socket, head) => {
    socket.on('error', () => {});
    if (req.url !== '/ws') return socket.destroy();
    if (!req.headers.origin || !origins.includes(req.headers.origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return socket.destroy();
    }
    try {
      const identity = await verify(req);
      if (socket.destroyed) return;
      wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, identity));
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); socket.destroy();
    }
  });
  wss.on('connection', (socket, identity) => {
    if (!sessions.has(identity.id)) sessions.set(identity.id, new Set());
    sessions.get(identity.id).add(socket);
    socket.alive = true;
    socket.on('pong', () => { socket.alive = true; });
    const expiry = setTimeout(() => socket.close(1008, 'Session expired'), Math.max(0, identity.expires - Date.now()));
    let windowStart = Date.now(), count = 0;
    socket.on('error', () => {});
    // Serialize sends per connection so persisted messages retain order.
    let pending = Promise.resolve();
    socket.on('message', (raw, binary) => {
      if (Date.now() - windowStart > 60000) { windowStart = Date.now(); count = 0; }
      if (++count > 60) return socket.close(1008, 'Too many messages');
      pending = pending.then(async () => {
        let input;
        try {
          if (binary || Date.now() >= identity.expires) throw new Error('Invalid message or expired session');
          input = JSON.parse(raw.toString());
          if (input.type !== 'message:send') throw new Error('Unsupported event');
          if (!await User.exists({ _id: identity.id, isActive: true })) throw new Error('Sign in required');
          const result = await sendMessage(identity.id, input);
          publish(result.participants, { type: 'message:new', message: result.message });
          send(socket, { type: 'message:ack', requestId: input.requestId, message: result.message });
        } catch (error) {
          send(socket, { type: 'message:error', requestId: typeof input?.requestId === 'string' ? input.requestId.slice(0, 80) : undefined, message: error.status ? error.message : 'Message could not be sent.' });
        }
      });
    });
    socket.on('close', () => {
      clearTimeout(expiry); sessions.get(identity.id)?.delete(socket);
      if (!sessions.get(identity.id)?.size) sessions.delete(identity.id);
    });
    send(socket, { type: 'ready' });
  });
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.alive) { socket.terminate(); continue; }
      socket.alive = false; socket.ping();
    }
  }, 30000);
  heartbeat.unref();
  function close() { clearInterval(heartbeat); for (const socket of wss.clients) socket.terminate(); wss.close(); }
  server.once('close', close);
  return { publish, disconnect, close };
}
module.exports = { attachRealtime };
