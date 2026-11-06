import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, identity, money } from '../api';
import { Negotiation } from './Negotiation';
import { ProjectPayment } from './ProjectPayment';
import { useAuth } from '../auth';
import { Field, FormStatus, ResourceState, taskCategories, useResource } from './shared';

export function Dashboard() {
  const { user } = useAuth();
  const posted = useResource('/tasks/posted?limit=50'), proposals = useResource('/bids/my-bids?limit=50');
  return <section className="section workspace"><div className="section-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Hello, {user.firstName}.</h1><p className="intro">A little ambition. A lot of possibility.</p></div><Link className="button" to="/post-task">Post a task ↗</Link></div><h2 className="workspace-heading">Your projects</h2><ResourceState resource={posted}>{posted.data?.tasks?.length ? <div className="task-list">{posted.data.tasks.map(task => <Link className="task-card" key={task._id} to={`/tasks/${task._id}`}><span className="status-tag">{task.status}</span><h3>{task.title}</h3><span>{money(task.budget)} · {task.currentBidCount} proposals</span></Link>)}</div> : <div className="notice">No projects yet. <Link to="/post-task">Post your first task.</Link></div>}</ResourceState><h2 className="workspace-heading">Your proposals</h2><ResourceState resource={proposals}>{proposals.data?.bids?.length ? <div className="task-list">{proposals.data.bids.map(bid => <article className="task-card" key={bid._id}><span className="status-tag">{bid.status}</span><h3>{bid.taskId ? <Link to={`/tasks/${identity(bid.taskId)}`}>{bid.taskId.title}</Link> : 'Task no longer available'}</h3><p>{money(bid.amount)} · {bid.proposedTimeline} days</p>{bid.taskId && <Link className="text-link" to={`/tasks/${identity(bid.taskId)}/bids`}>View proposal</Link>}</article>)}</div> : <div className="notice">Your proposals will appear here. <Link to="/tasks">Find an opportunity.</Link></div>}</ResourceState></section>;
}

export function TaskEditor({ edit = false }) {
  const { taskId } = useParams();
  const existing = useResource(edit ? `/tasks/${taskId}` : '/health');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const task = edit ? existing.data : {};
 const [attachment,setAttachment]=useState(null), [uploading,setUploading]=useState(false);
 async function uploadDocument(event){const file=event.target.files?.[0];if(!file)return;setUploading(true);setError('');try{if(file.size>3*1024*1024)throw new Error('Choose a document under 3 MB.');const body=new FormData();body.set('taskFile',file);const result=await api('/tasks/attachments',{method:'POST',body});setAttachment(result.attachment);}catch(err){setError(err.message);}finally{setUploading(false);}}
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      if (attachment) body.attachments = [attachment];
      body.budget = Number(body.budget); body.skills = body.skills.split(',').map(value => value.trim()).filter(Boolean);
      body.deadline = new Date(`${body.deadline}T23:59:59`).toISOString();
      if (new Date(body.deadline) <= new Date()) throw new Error('Choose a future deadline.');
      const result = await api(edit ? `/tasks/${taskId}` : '/tasks', { method: edit ? 'PUT' : 'POST', body });
      navigate(`/tasks/${result._id}`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="section workspace"><p className="eyebrow">GIVE YOUR IDEA A START</p><h1>{edit ? 'Refine your brief.' : 'What are we building?'}</h1><ResourceState resource={existing}>{task && (!edit || identity(task.clientId) === identity(user)) ? <form className="panel form-grid two-columns" key={task._id || 'new'} onSubmit={submit}><div className="full-width"><Field label="Project title" name="title" defaultValue={task.title} required maxLength={200}/><Field label="Project brief" name="description" type="textarea" defaultValue={task.description} required maxLength={2000} rows={6}/></div><label className="field">Category<select name="category" defaultValue={task.category || 'coding'}>{taskCategories.map(value => <option key={value}>{value}</option>)}</select></label><Field label="Fixed project budget (₹)" name="budget" type="number" min="1" step="1" defaultValue={task.budget} required/><Field label="Deadline" name="deadline" type="date" min={new Date(Date.now() + 86400000).toLocaleDateString('en-CA')} defaultValue={task.deadline?.slice(0,10)} required/><Field label="Skills (comma separated)" name="skills" defaultValue={task.skills?.join(', ')}/><div className="full-width">{!edit && <label className="field">Supporting document (up to 3 MB)<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" disabled={busy || uploading} onChange={uploadDocument}/></label>}{uploading && <p role="status">Uploading document…</p>}{attachment && <p role="status">Attached: {attachment.originalName}</p>}</div><input type="hidden" name="contactMethod" value="email"/><input type="hidden" name="budgetType" value="fixed"/><div className="full-width"><FormStatus error={error}/><button className="button" disabled={busy || uploading}>{busy ? 'Saving…' : edit ? 'Save changes' : 'Publish task'}</button></div></form> : <p role="alert">You can only edit your own tasks.</p>}</ResourceState></section>;
}

export function TaskDetail() {
  const { taskId } = useParams(), resource = useResource(`/tasks/${taskId}`);
  const paymentConfig = useResource('/payments/config');
  const { user } = useAuth(); const navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const task = resource.data, owner = task && identity(task.clientId) === identity(user);
  async function propose(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      await api('/bids', { method: 'POST', body: { ...body, taskId, amount: Number(body.amount), proposedTimeline: Number(body.proposedTimeline) } });
      navigate(`/tasks/${taskId}/bids`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="section workspace"><Link className="text-link" to="/tasks">← Explore tasks</Link><ResourceState resource={resource}>{task && <><div className="section-heading detail-heading"><div><p className="eyebrow">{task.category} / {task.status}</p><h1>{task.title}</h1><p className="muted">Posted by {task.clientId?.firstName} {task.clientId?.lastName}</p></div><div className="budget-display">{money(task.budget)}<small>Fixed project budget</small></div></div><div className="detail-layout"><article className="panel"><h2 className="workspace-heading">The brief</h2><p className="preserve-lines">{task.description}</p><div className="chips">{task.skills?.map(skill => <span className="status-tag" key={skill}>{skill}</span>)}</div><p className="muted">Deadline: {new Date(task.deadline).toLocaleDateString()}</p>{task.attachments?.map(file => <a className="text-link" href={file.url} key={file.filename}>{file.originalName}</a>)}</article><aside className="panel"><h3>{owner ? 'Manage your project' : 'Make your next move'}</h3>{owner ? <div className="action-stack"><Link className="button" to={`/tasks/${taskId}/bids`}>Review proposals</Link>{task.status === 'open' && <Link className="text-link" to={`/tasks/${taskId}/edit`}>Edit brief</Link>}</div> : !user ? <Link className="button" to="/login" state={{ from: `/tasks/${taskId}` }}>Log in to propose</Link> : task.status !== 'open' ? <p>This task is {task.status}.</p> : <form className="form-grid" onSubmit={propose}><Field label="Your price (₹)" type="number" name="amount" min="1" required/><Field label="Delivery time (days)" type="number" name="proposedTimeline" min="1" max="365" required/><Field label="Your proposal" type="textarea" name="message" rows={5} maxLength={1000} required/><button className="button" disabled={busy}>{busy ? 'Sending…' : 'Send proposal'}</button><Link className="text-link" to={`/tasks/${taskId}/bids`}>View your proposal</Link></form>}<FormStatus error={error}/></aside></div>{paymentConfig.data && user && [task.clientId,task.selectedFreelancerId].some(id => identity(id) === identity(user)) && task.selectedBidId && <ProjectPayment task={task} owner={owner} simulation={paymentConfig.data?.mode === 'simulation'} onChanged={resource.reload}/>}</>}</ResourceState></section>;
}

export function TaskBids() {
  const { taskId } = useParams(), resource = useResource(`/bids/task/${taskId}`);
  const { user } = useAuth(); const navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const owner = identity(resource.data?.task?.clientId) === identity(user);
  async function action(bid, type) {
    setBusy(true); setError('');
    try { await api(`/bids/${bid._id}/${type}`, { method: 'POST' }); resource.reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function message(bid) {
    setBusy(true); setError('');
    try {
      const conversation = await api('/messages/conversations', { method: 'POST', body: { taskId, bidId: bid._id, participantId: owner ? identity(bid.bidderId) : identity(resource.data.task.clientId) } });
      navigate(`/messages/${conversation._id}`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="section workspace"><Link className="text-link" to={`/tasks/${taskId}`}>← Project brief</Link><h1>Good work starts here.</h1><FormStatus error={error}/><ResourceState resource={resource}><h2 className="workspace-heading">{resource.data?.task?.title}</h2>{resource.data?.bids?.length ? <div className="task-list">{resource.data.bids.map(bid => <article className="task-card" key={bid._id}><span className="status-tag">{bid.status}</span><h3>{bid.bidderId?.firstName} {bid.bidderId?.lastName}</h3><p>{money(bid.amount)} · {bid.proposedTimeline} days</p><p className="preserve-lines">{bid.message}</p>{bid.status === "pending" && resource.data.task.status === "open" && <Negotiation bid={bid} owner={owner} user={user} reload={resource.reload}/>}<div className="actions"><button className="button" disabled={busy} onClick={() => message(bid)}>Message</button>{owner && bid.status === 'pending' && resource.data.task.status === 'open' && <><button className="button" disabled={busy || bid.counterOffers?.some(offer => offer.status === 'pending')} onClick={() => action(bid,'accept')}>Accept proposal</button><button className="secondary-button" disabled={busy} onClick={() => action(bid,'reject')}>Decline</button></>}{!owner && bid.status === 'pending' && <button className="secondary-button" disabled={busy} onClick={() => action(bid,'withdraw')}>Withdraw proposal</button>}</div></article>)}</div> : <div className="notice">No proposals yet.</div>}</ResourceState></section>;
}
