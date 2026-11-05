import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { identity } from '../api';
import { MessageActions } from './MessageActions';
import { useAuth } from '../auth';
import { useChat } from '../chat';
import { FormStatus, ResourceState, useResource } from './shared';

export function Messages() {
  const { conversationId = '' } = useParams();
  return <ChatWorkspace key={conversationId} conversationId={conversationId}/>;
}
function ChatWorkspace({ conversationId }) {
  const { user } = useAuth();
  const conversations = useResource('/messages/conversations?limit=50');
  const [page, setPage] = useState(1);
  const history = useResource(conversationId ? `/messages/conversations/${conversationId}/messages?page=${page}` : '/health');
  const [live, setLive] = useState([]), [draft, setDraft] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const messageKey = useRef(null), bottom = useRef(null);
  const chat = useChat(message => {
    if (String(message.conversationId) === conversationId && !message.hiddenFor?.some(id => String(id) === identity(user))) setLive(previous => [...previous.filter(item => item._id !== message._id), message].slice(-200));
    conversations.reload();
  });
  useEffect(() => { if (chat.generation > 0) { history.reload(); conversations.reload(); } }, [chat.generation]);
  const list = [...new Map([...(history.data?.messages || []), ...(page === 1 ? live : [])].map(message => [message._id, message])).values()].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  useEffect(() => { if (page === 1) bottom.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' }); }, [list.length, page]);
  async function submit(event) {
    event.preventDefault(); if (!draft.trim() || busy) return;
    setBusy(true); setError('');
    if (!messageKey.current) messageKey.current = crypto.randomUUID();
    try {
      const message = await chat.send(conversationId, draft, messageKey.current);
      setLive(previous => [...previous.filter(item => item._id !== message._id), message]);
      setDraft(''); messageKey.current = null; setPage(1);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="section messages-workspace"><div className="section-heading"><div><p className="eyebrow">A GOOD CONVERSATION GOES A LONG WAY</p><h1>Messages.</h1></div><span className="connection-status" role="status">{chat.status === 'connected' ? '● Live' : chat.status === 'session-expired' ? 'Session expired — log in again' : chat.status === 'unavailable' ? 'Live messaging unavailable on this deployment' : 'Connecting…'}</span></div><div className="chat-layout"><aside className="panel conversations"><h2 className="workspace-heading">Conversations</h2><ResourceState resource={conversations}>{conversations.data?.conversations?.length ? conversations.data.conversations.map(conversation => <Link className={`conversation-link ${conversation._id === conversationId ? 'selected' : ''}`} key={conversation._id} to={`/messages/${conversation._id}`}><strong>{conversation.title || 'Conversation'}</strong><span>{conversation.participants?.filter(person => identity(person) !== identity(user)).map(person => `${person.firstName} ${person.lastName}`).join(', ')}</span><small>{conversation.lastMessage?.message || 'Start the conversation'}</small></Link>) : <p className="muted">Conversations start when you send or receive a proposal.</p>}</ResourceState></aside><div className="panel chat-panel">{conversationId ? <><ResourceState resource={history}><div className="chat-toolbar"><button className="secondary-button" disabled={page >= (history.data?.totalPages || 1)} onClick={() => setPage(value => value + 1)}>Older messages</button><span>Page {page}</span><button className="secondary-button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Newer messages</button></div><div className="message-history" aria-label="Message history" role="log" aria-live="polite">{list.length ? list.map(message => <div className={`message-bubble ${identity(message.senderId) === identity(user) ? 'own' : ''} ${message.isSystemMessage ? 'system' : ''}`} key={message._id}><strong>{message.senderId?.firstName || 'Tasky'}</strong><p>{message.message}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time><MessageActions message={message} own={identity(message.senderId) === identity(user)} reload={() => { setLive([]); history.reload(); conversations.reload(); }}/></div>) : <p className="muted">Say hello. Your conversation starts here.</p>}<div ref={bottom}/></div></ResourceState><form className="message-composer" onSubmit={submit}><label className="sr-only" htmlFor="message-draft">Message</label><textarea id="message-draft" rows={3} maxLength={2000} placeholder="Write a message…" value={draft} disabled={busy} onChange={event => { setDraft(event.target.value); messageKey.current = null; }}/><button className="button" disabled={busy || chat.status !== 'connected' || !draft.trim() || !!history.error}>{busy ? 'Sending…' : 'Send message ↗'}</button></form><FormStatus error={error}/>{chat.status === 'session-expired' && <Link className="text-link" to="/login">Log in again</Link>}</> : <div className="chat-placeholder"><h2>Make a connection.</h2><p>Choose a conversation to get started.</p></div>}</div></div></section>;
}

