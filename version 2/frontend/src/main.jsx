import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, Link, useLocation, useSearchParams } from 'react-router-dom';
import './styles.css';
import { Home } from './Home';
import { AuthProvider, Protected } from './auth';
import { Header } from './Header';
import { Account, Profile } from './pages/Account';
import { Dashboard, TaskEditor, TaskDetail, TaskBids } from './pages/Tasks';
import { Messages } from './pages/Messages';


function Search({ initial = '' }) {
 return <form className="search" action="/tasks" method="get" key={initial}><span aria-hidden="true" className="search-symbol">⌕</span><label className="sr-only" htmlFor="task-search">Search tasks</label><input id="task-search" name="search" defaultValue={initial} placeholder="What kind of work are you looking for?"/><button type="submit">Search <span aria-hidden="true">↗</span></button></form>;
}

function Browse() {
 const [params, setParams] = useSearchParams();
 const search = params.get('search') || '';
 const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
 const [attempt, setAttempt] = useState(0);
 const [state, setState] = useState({ loading: true, tasks: [], total: 0, totalPages: 0, error: '' });
 useEffect(() => {
  const controller = new AbortController();
  setState(previous => ({ ...previous, loading: true, error: '' }));
  const query = new URLSearchParams({ search, page: String(page) });
  fetch(`/api/tasks?${query}`, { credentials: 'include', signal: controller.signal })
   .then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not load tasks');
    setState({ loading: false, tasks: data.tasks || [], total: data.total || 0, totalPages: data.totalPages || 0, error: '' });
   }).catch(error => {
    if (error.name !== 'AbortError') setState({ loading: false, tasks: [], total: 0, totalPages: 0, error: error.message });
   });
  return () => controller.abort();
 }, [search, page, attempt]);
 function changePage(next) { setParams({ ...(search ? { search } : {}), page: String(next) }); }
 return <section className="browse section"><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h1>Work worth doing.</h1><p className="intro">Find a task that puts your skills to work.</p><Search initial={search}/><div className="chips" aria-label="Popular searches"><span>Explore:</span>{['Design', 'Coding', 'Writing'].map(term => <Link key={term} to={`/tasks?search=${term}`}>{term}</Link>)}</div>
 <div className="results-heading"><h2>{search ? `Results for “${search}”` : 'Latest opportunities'}</h2>{search && <Link to="/tasks">Clear search</Link>}</div>
 {state.loading ? <div className="notice" role="status">Finding opportunities…</div> : state.error ? <div className="notice" role="alert"><h3>We couldn’t load tasks</h3><p>{state.error}</p><button className="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : state.tasks.length ? <><p className="muted" role="status">{state.total} {state.total === 1 ? 'opportunity' : 'opportunities'}</p><div className="task-list">{state.tasks.map(task => <article className="task-card" key={task._id}><div className="task-meta"><span>{task.category}</span><span>{task.budgetType === 'hourly' ? 'Hourly' : 'Fixed price'}</span></div><h3><Link to={`/tasks/${task._id}`}>{task.title}</Link></h3><p>{task.description}</p><div className="task-bottom"><strong>₹{Number(task.budget).toLocaleString('en-IN')}</strong><span className="muted">Project budget</span></div></article>)}</div>{state.totalPages > 1 && <nav className="pagination" aria-label="Results pages"><button disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button><span>Page {page} of {state.totalPages}</span><button disabled={page >= state.totalPages} onClick={() => changePage(page + 1)}>Next</button></nav>}</> : <div className="notice"><h3>A little quiet here, for now.</h3><p>{search ? 'Try a different keyword or browse all tasks.' : 'New opportunities will appear here when tasks are posted.'}</p>{search && <Link className="button" to="/tasks">Browse all tasks</Link>}</div>}
 </section>;
}


function ScrollOnNavigation() {
 const { pathname, hash } = useLocation();
 useLayoutEffect(() => { if (!hash) window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname, hash]);
 return null;
}

function App() {
 return <BrowserRouter><ScrollOnNavigation/><AuthProvider><a className="skip-link" href="#main">Skip to content</a><Header/><main id="main"><Routes><Route path="/" element={<Home/>}/><Route path="/tasks" element={<Browse/>}/><Route path="/login" element={<Account/>}/><Route path="/signup" element={<Account signup/>}/><Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/><Route path="/profile" element={<Protected><Profile/></Protected>}/><Route path="/post-task" element={<Protected><TaskEditor/></Protected>}/><Route path="/tasks/:taskId" element={<TaskDetail/>}/><Route path="/tasks/:taskId/edit" element={<Protected><TaskEditor edit/></Protected>}/><Route path="/tasks/:taskId/bids" element={<Protected><TaskBids/></Protected>}/><Route path="/messages/:conversationId?" element={<Protected><Messages/></Protected>}/><Route path="*" element={<section className="section browse"><h1>Page not found</h1><Link className="button" to="/">Return home</Link></section>}/></Routes></main><footer className="footer"><div><Link className="brand" to="/">tasky<span>.</span></Link><p>Independent minds.<br/>Extraordinary possibilities.</p></div><nav aria-label="Footer navigation"><Link to="/tasks">Explore tasks</Link><a href="/#how-it-works">How it works</a></nav><div className="footer-end"><span>India / Everywhere</span><span>© {new Date().getFullYear()} Tasky</span></div></footer></AuthProvider></BrowserRouter>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);

