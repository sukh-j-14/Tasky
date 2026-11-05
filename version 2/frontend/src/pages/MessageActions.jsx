import React, { useState } from 'react';
import { api } from '../api';
import { FormStatus } from './shared';
export function MessageActions({ message, own, reload }) {
  const [editing, setEditing] = useState(false), [text, setText] = useState(message.message), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function perform(method, body) {
    setBusy(true); setError('');
    try { await api(`/messages/messages/${message._id}`, { method, body }); setEditing(false); reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <><div className="actions">{own && !message.isSystemMessage && Date.now() - new Date(message.createdAt).getTime() < 900000 && <button className="message-action" onClick={() => setEditing(value => !value)} disabled={busy}>Edit</button>}<button className="message-action" disabled={busy} onClick={() => perform('DELETE')}>Hide for me</button>{message.isEdited && <span className="muted">Edited</span>}</div>{editing && <form onSubmit={event => { event.preventDefault(); perform('PUT',{message:text}); }}><label className="field">Edit message<textarea value={text} onChange={event => setText(event.target.value)} maxLength={2000} required/></label><button className="secondary-button" disabled={busy}>Save message</button></form>}<FormStatus error={error}/></>;
}
