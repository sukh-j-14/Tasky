import React, { useRef, useState } from 'react';
import { api, money } from '../api';
import { Field, FormStatus, ResourceState, useResource } from './shared';

export function ProjectPayment({ task, owner, simulation, onChanged }) {
 const resource = useResource(simulation ? `/payments/simulation/tasks/${task._id}` : '/payments/config');
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
 const pendingOperation = useRef(null);
 async function fund(outcome) {
  setBusy(true); setError(''); setNotice('');
  if (pendingOperation.current?.outcome !== outcome) pendingOperation.current = { outcome, operationId: crypto.randomUUID() };
  try {
   const result = await api(`/payments/simulation/tasks/${task._id}/fund`, { method: 'POST', body: pendingOperation.current });
   pendingOperation.current = null;
   setNotice(result.declined ? 'Test payment declined. No funds were added. You can retry with a successful test.' : 'Test payment funded. No real money was collected.');
   resource.reload();
  } catch (err) { setError(err.message); } finally { setBusy(false); }
 }
 async function deliver(event) {
  event.preventDefault(); setBusy(true); setError('');
  const message = new FormData(event.currentTarget).get('message');
  try { await api(`/tasks/${task._id}/deliver`, { method: 'POST', body: { message } }); onChanged(); }
  catch (err) { setError(err.message); } finally { setBusy(false); }
 }
 async function approve() {
  setBusy(true); setError('');
  try { await api(`/tasks/${task._id}/complete`, { method: 'POST' }); onChanged(); }
  catch (err) { setError(err.message); } finally { setBusy(false); }
 }
 const payment = resource.data?.payment;
 return <section className="panel project-payment" aria-label="Delivery and payment"><p className="eyebrow">{simulation ? 'TEST MODE / SIMULATED PAYMENT' : 'DELIVERY & APPROVAL'}</p><h2 className="workspace-heading">{simulation ? 'Try the full project flow.' : 'From delivery to done.'}</h2>
  {simulation && <p className="simulation-notice" role="note"><strong>Simulation only.</strong> No real money is collected, held, or paid out. No card or bank details are needed.</p>}
  <FormStatus error={error} success={notice}/><ResourceState resource={resource}>
   {simulation && payment && <><div className="payment-summary"><strong>{money(payment.amountMinor / 100)}</strong><span className="status-tag">Test payment: {payment.status}</span></div><p className="muted">Agreed proposal price · INR</p>
    {task.status === 'in-progress' && payment.status === 'unfunded' && (owner ? <div className="actions"><button className="button" disabled={busy} onClick={() => fund('success')}>Simulate successful payment</button><button className="secondary-button" disabled={busy} onClick={() => fund('declined')}>Simulate declined payment</button></div> : <p>Waiting for the client to fund the simulated payment.</p>)}
   </>}
   {task.deliveredAt && <div className="delivery-note"><h3>Delivery submitted</h3><p className="preserve-lines">{task.deliveryNote}</p><p className="muted">{new Date(task.deliveredAt).toLocaleString()}</p></div>}
   {task.status === 'in-progress' && !task.deliveredAt && !owner && (!simulation || payment?.status === 'funded') && <form className="form-grid" onSubmit={deliver}><Field label="Delivery summary and handoff links" name="message" type="textarea" required maxLength={2000} rows={4}/><button className="button" disabled={busy}>{busy ? 'Submitting…' : 'Submit delivery for review'}</button></form>}
   {task.status === 'in-progress' && !task.deliveredAt && owner && (!simulation || payment?.status === 'funded') && <p>Waiting for the freelancer to submit delivery.</p>}
   {task.status === 'in-progress' && task.deliveredAt && (owner ? <button className="button" disabled={busy} onClick={approve}>{busy ? 'Approving…' : simulation ? 'Approve delivery & simulate release' : 'Approve delivery & complete'}</button> : <p>Waiting for the client to review and approve your delivery.</p>)}
   {task.status === 'completed' && <p role="status">Project completed.{simulation ? payment?.status === 'released' ? ' The test payment was released. No real money was transferred.' : ' No simulated payment was recorded for this project.' : ''}</p>}
   {simulation && payment?.events?.length > 0 && <details className="simulation-history"><summary>Test payment activity</summary><ol>{payment.events.map((item, index) => <li key={item._id || index}>{item.type === 'declined' ? 'Test payment declined' : item.type === 'funded' ? 'Test payment funded' : 'Test payment released'} · {new Date(item.at).toLocaleString()}</li>)}</ol></details>}
  </ResourceState>
 </section>;
}
