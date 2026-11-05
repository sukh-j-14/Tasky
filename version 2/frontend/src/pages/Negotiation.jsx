import React, { useState } from 'react';
import { api, identity, money } from '../api';
import { Field, FormStatus } from './shared';
export function Negotiation({ bid, owner, user, reload }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = bid.counterOffers?.find(offer => offer.status === 'pending');
  const ownOffer = pending && identity(pending.proposedBy) === identity(user);
  async function perform(body, offerId) {
    setBusy(true); setError('');
    try { await api(`/bids/${bid._id}/counter-offers${offerId ? `/${offerId}/accept` : ''}`, { method: 'POST', body }); reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <div className="negotiation"><h4>Price discussion</h4>{bid.counterOffers?.map(offer => <p className="muted" key={offer._id}>{money(offer.amount)} · {offer.status}</p>)}
    {pending && <p>{ownOffer ? 'Waiting for the other person to respond.' : `New offer: ${money(pending.amount)}`}</p>}
    {pending && !ownOffer && <button className="secondary-button" disabled={busy} onClick={() => perform({},pending._id)}>Agree to {money(pending.amount)}</button>}
    {(!pending ? owner : !ownOffer) && <form className="actions" onSubmit={event => { event.preventDefault(); perform({ amount: Number(new FormData(event.currentTarget).get('amount')) }); }}><Field label={pending ? 'Counter-offer (₹)' : 'Offer a different price (₹)'} name="amount" type="number" min="1" step="1" required/><button className="secondary-button" disabled={busy}>Send offer</button></form>}
    <FormStatus error={error}/></div>;
}
