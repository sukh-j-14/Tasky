import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, Link, useSearchParams } from 'react-router-dom';
import './styles.css';
import { AuthProvider, Protected } from './auth';
import { Header } from './Header';
import { Account, Profile } from './pages/Account';
import { Dashboard, TaskEditor, TaskDetail, TaskBids } from './pages/Tasks';
import { Messages } from './pages/Messages';

const categories = [
 ['Development & IT', 'coding', '⌘', 'Websites, apps & everything in between'],
 ['Design & Creative', 'design', '✳', 'Ideas made visual. Brands made memorable.'],
 ['Writing & Translation', 'writing', 'Aa', 'Words that connect across languages'],
 ['Research & Analysis', 'research', '↗', 'Fresh perspectives. Deeper understanding.'],
 ['Presentations', 'presentation', '⊞', 'Make your next big idea stand out'],
 ['Data & Insights', 'data', '◈', 'Turn information into possibilities']
];

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

function WorkCollage() {
 return <div className="collage" role="img" aria-label="Illustration of a creative project: a brand moodboard, colour palette, and project brief"><div className="collage-grid"/><div className="studio-card"><div className="studio-top"><span>THE CREATIVE STUDIO</span><span>↗</span></div><div className="poster"><span>Make<br/><em>your mark.</em></span><div className="poster-orbit"/></div><div className="swatches"><i/><i/><i/><i/><span>Palette / 01</span></div></div><div className="collage-stamp">Ideas meet<br/><strong>possibility.</strong><span aria-hidden="true">✳</span></div><div className="brief-card"><span className="eyebrow">A FRESH PERSPECTIVE</span><h3>A brand with<br/>something to say.</h3><div><span>Design & Creative</span><span aria-hidden="true">↗</span></div></div><div className="collage-caption"><span className="live-dot"/>Independent minds. Shared ambition.</div></div>;
}

function Home() {
 return <><section className="hero section"><div className="hero-copy"><p className="eyebrow"><span className="live-dot"/>BUILT FOR INDEPENDENT AMBITION</p><h1>Big ideas.<br/><em>The right people.</em></h1><p className="intro">From your next big project to your next great opportunity. Connect through meaningful work, right here on Tasky.</p><Search/><div className="chips"><span>Popular:</span>{['Design', 'Coding', 'Writing'].map(term => <Link to={`/tasks?search=${term}`} key={term}>{term}</Link>)}</div><p className="hero-note">Made for India. Open to possibility.</p></div><WorkCollage/></section>
 <div className="skill-strip"><span>GOOD WORK, IN EVERY DIRECTION</span><span>Design</span><span>Development</span><span>Writing</span><span>Research</span></div>
 <section className="section categories" id="categories"><div className="section-heading"><div><p className="eyebrow">FIND YOUR SPECIALITY</p><h2>A world of work.<br/>A place for your skills.</h2></div><Link className="text-link" to="/tasks">Explore all tasks <span aria-hidden="true">↗</span></Link></div><div className="category-grid">{categories.map(([name, query, icon, description], index) => <Link className="category-card" to={`/tasks?search=${query}`} key={name}><div className="category-top"><span className="category-icon" aria-hidden="true">{icon}</span><span className="category-number">0{index + 1}</span></div><h3>{name}</h3><p>{description}</p><span className="category-arrow" aria-hidden="true">↗</span></Link>)}</div></section>
 <section className="workflow section" id="how-it-works"><p className="eyebrow">THE TASKY WAY</p><div className="workflow-heading"><h2>Less friction.<br/><em>More forward.</em></h2><p>Great work starts with a clear idea and a good conversation. Here’s how it comes together.</p></div><div className="steps">{[['Discover', 'Explore tasks that match your skills, interests, and ambitions.'], ['Connect', 'Share a proposal and agree on the scope with the person behind the project.'], ['Deliver', 'Bring your skills to the work. Stay aligned from the first idea to the final handoff.']].map(([title, description], index) => <div key={title}><span className="step-number">0{index + 1}</span><h3>{title}</h3><p>{description}</p></div>)}</div><Link className="button lime" to="/tasks">Find your next opportunity <span aria-hidden="true">↗</span></Link></section>
 <section className="closing section"><span className="eyebrow">THE NEXT CHAPTER IS YOURS</span><h2>Put your potential to work.</h2><Link to="/tasks" className="text-link">Explore tasks <span aria-hidden="true">↗</span></Link></section></>;
}

function App() {
 return <BrowserRouter><AuthProvider><a className="skip-link" href="#main">Skip to content</a><Header/><main id="main"><Routes><Route path="/" element={<Home/>}/><Route path="/tasks" element={<Browse/>}/><Route path="/login" element={<Account/>}/><Route path="/signup" element={<Account signup/>}/><Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/><Route path="/profile" element={<Protected><Profile/></Protected>}/><Route path="/post-task" element={<Protected><TaskEditor/></Protected>}/><Route path="/tasks/:taskId" element={<TaskDetail/>}/><Route path="/tasks/:taskId/edit" element={<Protected><TaskEditor edit/></Protected>}/><Route path="/tasks/:taskId/bids" element={<Protected><TaskBids/></Protected>}/><Route path="/messages/:conversationId?" element={<Protected><Messages/></Protected>}/><Route path="*" element={<section className="section browse"><h1>Page not found</h1><Link className="button" to="/">Return home</Link></section>}/></Routes></main><footer className="footer"><div><Link className="brand" to="/">tasky<span>.</span></Link><p>Independent minds.<br/>Extraordinary possibilities.</p></div><nav aria-label="Footer navigation"><Link to="/tasks">Explore tasks</Link><a href="/#how-it-works">How it works</a></nav><div className="footer-end"><span>India / Everywhere</span><span>© {new Date().getFullYear()} Tasky</span></div></footer></AuthProvider></BrowserRouter>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);

