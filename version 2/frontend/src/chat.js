import { api } from './api';
import { useEffect, useRef, useState } from 'react';
export function useChat(onMessage) {
  const callback = useRef(onMessage); callback.current = onMessage;
  const transport = useRef('websocket');
  const socket = useRef(null), pending = useRef(new Map());
  const [status, setStatus] = useState('connecting');
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let stopped = false, timer, retries = 0, hosted;
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
    fetch('/api/realtime/config', { credentials: 'include' }).then(async response => {
      if (stopped) return;
      if (!response.ok) { setStatus('unavailable'); return; }
      const config = await response.json();
      if (config.transport !== 'ably') { connect(); return; }
      transport.current = 'ably';
      const Ably = await import('ably');
      if (stopped) return;
      let userId, subscribed = false;
      hosted = new Ably.Realtime({ transports: ['web_socket'], authCallback: (_params, done) => {
        api('/realtime/token', {method:'POST'}).then(token => { userId=token.clientId; done(null,token); }).catch(error => done(error,null));
      }});
      hosted.connection.on('connected', async () => {
        if (stopped) return;
        try {
          if (!subscribed) {
            await hosted.channels.get('tasky-v2:user:'+userId).subscribe('tasky-event', event => {
              if (!stopped && event.data?.type === 'message:new') callback.current(event.data.message);
            });
            subscribed=true;
          }
          if (!stopped) { setStatus('connected'); setGeneration(value => value + 1); }
        } catch { if (!stopped) setStatus('unavailable'); }
      });
      hosted.connection.on('disconnected', () => { if (!stopped) setStatus('reconnecting'); });
      hosted.connection.on('suspended', () => { if (!stopped) setStatus('reconnecting'); });
      hosted.connection.on('failed', change => { if (!stopped) setStatus(change.reason?.statusCode === 401 ? 'session-expired' : 'unavailable'); });
    }).catch(() => { if (!stopped) setStatus('unavailable'); });
    return () => { stopped = true; clearTimeout(timer); socket.current?.close(); hosted?.close(); rejectPending(); };
  }, []);
  function send(conversationId, message, clientMessageId) {
    if (transport.current === 'ably') {
      if (status !== 'connected') return Promise.reject(new Error('Wait for the conversation to reconnect.'));
      return api('/messages/conversations/'+conversationId+'/messages', {method:'POST',body:{message,clientMessageId}}).then(result => result.newMessage);
    }
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
