import { useEffect, useRef, useState } from 'react';
export function useChat(onMessage) {
  const callback = useRef(onMessage); callback.current = onMessage;
  const socket = useRef(null), pending = useRef(new Map());
  const [status, setStatus] = useState('connecting');
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let stopped = false, timer, retries = 0;
    function rejectPending() { for (const entry of pending.current.values()) { clearTimeout(entry.timer); entry.reject(new Error('Connection interrupted. Your draft is kept; try sending again.')); } pending.current.clear(); }
    function connect() {
      if (stopped) return;
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
      socket.current = ws;
      ws.onmessage = event => {
        let data; try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'ready') { retries = 0; setStatus('connected'); setGeneration(value => value + 1); }
        if (data.type === 'message:new') callback.current(data.message);
        if (data.type === 'message:ack' || data.type === 'message:error') {
          const entry = pending.current.get(data.requestId);
          if (entry) { clearTimeout(entry.timer); pending.current.delete(data.requestId); data.type === 'message:ack' ? entry.resolve(data.message) : entry.reject(new Error(data.message)); }
        }
      };
      ws.onclose = event => {
        rejectPending(); if (stopped) return;
        if (event.code === 1008) { setStatus('session-expired'); return; }
        setStatus('reconnecting'); timer = setTimeout(connect, Math.min(1000 * 2 ** retries++, 15000));
      };
      ws.onerror = () => { if (!stopped) setStatus('reconnecting'); };
    }
    fetch('/api/realtime/config', { credentials: 'include' }).then(response => {
      if (stopped) return;
      if (!response.ok) { setStatus('unavailable'); return; }
      connect();
    }).catch(() => { if (!stopped) setStatus('unavailable'); });
    return () => { stopped = true; clearTimeout(timer); socket.current?.close(); rejectPending(); };
  }, []);
  function send(conversationId, message, clientMessageId) {
    return new Promise((resolve, reject) => {
      if (socket.current?.readyState !== WebSocket.OPEN || status !== 'connected') return reject(new Error('Wait for the conversation to reconnect.'));
      const requestId = crypto.randomUUID();
      const timer = setTimeout(() => { pending.current.delete(requestId); reject(new Error('Delivery not confirmed. Your draft is kept; retry to confirm delivery.')); }, 15000);
      pending.current.set(requestId, { resolve, reject, timer });
      socket.current.send(JSON.stringify({ type: 'message:send', conversationId, message, clientMessageId, requestId }));
    });
  }
  return { status, generation, send };
}
