const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { WebSocket } = require('ws');
const { createApp } = require('../app');
const { attachRealtime } = require('../realtime');

test('accounts, project lifecycle and authenticated persisted WebSocket messaging', { timeout: 180000 }, async () => {
  process.env.JWT_SECRET = 'test-only-secret-which-is-never-used-outside-tests';
  process.env.ENABLE_PAYMENTS = 'false';
  const database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let server, realtime;
  const sockets = [];
  try {
    await mongoose.connect(database.getUri(), { dbName: 'tasky_v2_test' });
    const User = require('../models/User');
    const { Message } = require('../models/Message');
    const Bid = require('../models/Bid');
    await Promise.all([User.init(), Message.init(), Bid.init()]);
    const app = createApp(); server = createServer(app);
    realtime = attachRealtime(server, { origins: ['http://localhost:5173'] }); app.locals.realtime = realtime;
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(path, { cookie, body, method = 'GET', status = 200, origin } = {}) {
      const response = await fetch(base + '/api' + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json();
      assert.equal(response.status, status, JSON.stringify(result));
      return { data: result, cookie: response.headers.get('set-cookie')?.split(';')[0] };
    }
    async function account(name) {
      return request('/auth/signup', { method: 'POST', status: 201, body: { username: name, firstName: name, lastName: 'Test', email: `${name}@example.test`, password: 'test-password-123' } });
    }
    const client = await account('client'), worker = await account('worker'), outsider = await account('outsider');
    await request('/auth/profile', { status: 401 });
    await request('/auth/login', { method: 'POST', status: 400, body: { email: 'worker@example.test', password: 'wrong-password' } });
    const login = await request('/auth/login', { method: 'POST', body: { email: 'worker@example.test', password: 'test-password-123' } });
    assert.ok(login.cookie.includes('token='));
    const profile = await request('/auth/profile', { cookie: worker.cookie, method: 'PUT', body: { bio: 'Hello from React', skills: ['React'] } });
    assert.equal(profile.data.user.bio, 'Hello from React');
    const created = await request('/tasks', { method: 'POST', cookie: client.cookie, status: 201, body: { title: 'Build a React website', description: 'A responsive product website', category: 'coding', budget: 5000, deadline: new Date(Date.now() + 7 * 86400000).toISOString(), contactMethod: 'email', skills: ['React'] } });
    const taskId = created.data._id;
    const browse = await request('/tasks?search=React'); assert.equal(browse.data.total, 1);
    await request(`/tasks/${taskId}`, { cookie: worker.cookie });
    await request(`/tasks/${taskId}`, { cookie: worker.cookie, method: 'PUT', status: 404, body: { title: 'not mine' } });
    const bid = await request('/bids', { method: 'POST', cookie: worker.cookie, status: 201, body: { taskId, amount: 4500, message: 'I can build this.', proposedTimeline: 3 } });
    await request('/bids', { method: 'POST', cookie: client.cookie, status: 400, body: { taskId, amount: 4500, message: 'Own task', proposedTimeline: 3 } });
    await request('/bids', { method: 'POST', cookie: worker.cookie, status: 400, body: { taskId, amount: 4600, message: 'Duplicate', proposedTimeline: 3 } });
    const list = await request('/messages/conversations', { cookie: worker.cookie });
    const conversationId = list.data.conversations[0]._id;
    await request(`/messages/conversations/${conversationId}/messages`, { cookie: outsider.cookie, status: 403 });
    async function connect(cookie) {
      const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws', { origin: 'http://localhost:5173', headers: cookie ? { Cookie: cookie } : {} });
      sockets.push(ws); const ready = await once(ws, 'message'); assert.equal(JSON.parse(String(ready[0])).type, 'ready'); return ws;
    }
    const clientSocket = await connect(client.cookie), workerSocket = await connect(worker.cookie), outsiderSocket = await connect(outsider.cookie);
    let leaked = false; outsiderSocket.on('message', data => { if (JSON.parse(String(data)).type === 'message:new') leaked = true; });
    function event(ws, type) { return new Promise((resolve, reject) => { const timer = setTimeout(() => { ws.off('message', listener); reject(new Error(`Missing event ${type}`)); }, 5000); function listener(raw) { const value = JSON.parse(String(raw)); if (value.type === type) { clearTimeout(timer); ws.off('message', listener); resolve(value); } } ws.on('message', listener); }); }
    const received = event(clientSocket, 'message:new'), ack = event(workerSocket, 'message:ack');
    const payload = { type: 'message:send', conversationId, message: 'Live from the worker', clientMessageId: 'integration-message-1', requestId: 'one' };
    workerSocket.send(JSON.stringify(payload));
    assert.equal((await received).message.message, payload.message); await ack;
    const repeat = event(workerSocket, 'message:ack'); workerSocket.send(JSON.stringify({ ...payload, requestId: 'two' })); await repeat;
    assert.equal(await Message.countDocuments({ clientMessageId: payload.clientMessageId }), 1);
    const blocked = event(outsiderSocket, 'message:error'); outsiderSocket.send(JSON.stringify({ ...payload, requestId: 'forbidden', clientMessageId: 'outsider-message' }));
    assert.match((await blocked).message, /unavailable/); assert.equal(leaked, false);
    const history = await request(`/messages/conversations/${conversationId}/messages`, { cookie: client.cookie }); assert.equal(history.data.messages[0].message, payload.message);
    await request(`/bids/${bid.data.bid._id}/accept`, { method: 'POST', cookie: worker.cookie, status: 403 });
    await request(`/bids/${bid.data.bid._id}/accept`, { method: 'POST', cookie: client.cookie });
    const inProgress = await request(`/tasks/${taskId}`); assert.equal(inProgress.data.status, 'in-progress');
    await request(`/tasks/${taskId}/complete`, { method: 'POST', cookie: client.cookie });
    assert.equal((await request(`/tasks/${taskId}`)).data.status, 'completed');
    await request('/auth/profile', { method: 'PUT', cookie: worker.cookie, body: { bio: 'Blocked' }, origin: 'https://untrusted.example', status: 403 });
    async function denied(options, expected) {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws', options); sockets.push(ws);
        ws.on('unexpected-response', (_req, res) => { assert.equal(res.statusCode, expected); res.resume(); ws.terminate(); resolve(); });
        ws.on('error', () => {}); ws.on('open', () => reject(new Error('Unexpected websocket access')));
      });
    }
    await denied({ origin: 'http://localhost:5173' }, 401);
    await denied({ origin: 'https://untrusted.example', headers: { Cookie: client.cookie } }, 403);
    const closed = once(workerSocket, 'close'); await request('/auth/logout', { method: 'POST', cookie: worker.cookie }); await closed;
  } finally {
    for (const ws of sockets) ws.terminate(); realtime?.close();
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); await database.stop();
  }
});


