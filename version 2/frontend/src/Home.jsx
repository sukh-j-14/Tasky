import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './home.css';
import { ProcessArt } from './ProcessArt';

const OrbitScene = lazy(() => import('./OrbitScene'));
const chapters = [
 { title: <>Ideas need people.<br/>Meet yours.</>, label: 'A WORLD OF INDEPENDENT TALENT', description: 'A bold idea. A fresh perspective. The right person to make it happen. Find your next collaborator on Tasky.', link: '/tasks', action: 'Explore opportunities', symbol: '✳', name: 'Design & creative' },
 { title: <>You imagine it.<br/>They build it.</>, label: '01 / DEVELOPMENT & TECHNOLOGY', description: 'From the first line of code to the final launch. Connect with people who turn complex challenges into working solutions.', link: '/tasks?search=coding', action: 'Explore development', symbol: '⌘', name: 'Development & IT' },
 { title: <>Good stories.<br/>Great possibilities.</>, label: '02 / WORDS & IDEAS', description: 'Find a voice for your brand, a fresh angle for your research, or the words that make your next idea click.', link: '/tasks?search=writing', action: 'Explore writing', symbol: 'Aa', name: 'Writing & research' },
 { title: <>Different skills.<br/>Shared ambition.</>, label: '03 / A WORLD OF CONNECTION', description: 'Your next opportunity could start with one conversation. Post a task, send a proposal, and make something worth doing.', link: '/post-task', action: 'Start your project', symbol: '↗', name: 'Your next chapter' }
];
const skills = [['Development & IT', 'coding', '⌘', 'Websites, apps & technical challenges'], ['Design & creative', 'design', '✳', 'Brands, visuals & digital experiences'], ['Writing & translation', 'writing', 'Aa', 'Words that get your idea across'], ['Research & analysis', 'research', '↗', 'Clarity for the questions that matter'], ['Presentations', 'presentation', '⊞', 'Ideas made impossible to ignore'], ['Data & insights', 'data', '◈', 'Information with a clear direction']];

export function Home() {
 const runway = useRef(null), progress = useRef(0);
 const [chapter, setChapter] = useState(0), [paused, setPaused] = useState(false);
 useEffect(() => {
  let frame;
  function update() {
   frame = undefined;
   const bounds = runway.current.getBoundingClientRect();
   const p = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height - window.innerHeight)));
   progress.current = p;
   setChapter(Math.min(3, Math.floor(p * 3 + .45)));
   runway.current.style.setProperty('--journey', p);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  update(); window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
  const reveals = document.querySelectorAll('.home-page [data-reveal]');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); } }), { threshold: .12 });
  reveals.forEach(element => observer.observe(element));
  return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); observer.disconnect(); };
 }, []);
 function choose(index) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: window.scrollY + runway.current.getBoundingClientRect().top + index / 3 * (runway.current.offsetHeight - window.innerHeight), behavior: reduced ? 'instant' : 'smooth' });
 }
 const current = chapters[chapter];
 return <div className="home-page"><section className="orbit-runway" ref={runway} aria-label="Explore Tasky’s world of work"><div className="orbit-stage">
  {!paused && <Suspense fallback={<div className="orbit-canvas"><div className="orbit-fallback"/></div>}><OrbitScene progress={progress}/></Suspense>}
  {paused && <div className="orbit-canvas"><div className="orbit-fallback"/></div>}
  <div className="space-horizon"/><div className="scene-copy" key={chapter}><p className="scene-kicker">{current.label}</p><h1>{current.title}</h1><p>{current.description}</p><Link className="scene-link" to={current.link}>{current.action}<span aria-hidden="true">↗</span></Link></div>
  <span className={`planet-symbol ${chapter === 3 ? 'globe-symbol' : ''}`} aria-hidden="true">{current.symbol}</span><span className="scene-side">THE TASKY CONSTELLATION</span>
  <div className="scene-bottom"><span className="scroll-hint">↓ Scroll to discover <span>· Drag to rotate</span></span><div className="scene-controls"><a href="#skills">Explore skills <span aria-hidden="true">↗</span></a><button onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label="Pause animated artwork">{paused ? 'Play' : 'Pause'}</button></div><span className="scene-count">0{chapter + 1}<span> / 04</span></span></div>
  <div className="chapter-nav" aria-label="Scene chapters">{chapters.map((item, index) => <button key={item.name} aria-label={`Show ${item.name}`} aria-pressed={chapter === index} onClick={() => choose(index)}><span>0{index + 1}</span>{item.name}</button>)}</div>
 </div></section>
 <section className="connection-section home-section" data-reveal><p className="scene-kicker">ONE CONNECTION. NEW POSSIBILITIES.</p><div className="editorial-heading"><h2>From your idea.<br/><span>To someone’s next big thing.</span></h2><div><p>Good work brings people together. Tasky connects the ambition behind a project with the skills to move it forward.</p><Link className="button" to="/post-task">Build your next thing ↗</Link></div></div><div className="connection-line"><span>Imagine</span><i/><span>Connect</span><i/><span>Create</span><i/><span>Deliver</span></div></section>
 <section className="home-section skill-index" id="skills"><div className="section-caption"><span>A CONSTELLATION OF SKILLS</span><span>01 — 06</span></div><div className="editorial-heading" data-reveal><h2>Find your kind<br/>of brilliant.</h2><p>Different disciplines.<br/>A world of work worth doing.</p></div><div>{skills.map(([name, query, symbol, description], index) => <Link key={name} className="skill-row" to={`/tasks?search=${query}`} data-reveal><span className="skill-number">0{index + 1}</span><span className="skill-symbol" aria-hidden="true">{symbol}</span><h3>{name}</h3><p>{description}</p><span className="row-arrow" aria-hidden="true">↗</span></Link>)}</div><form className="home-search" action="/tasks"><label htmlFor="home-task-search">Your next opportunity is out there.</label><div><input id="home-task-search" name="search" placeholder="Search tasks, skills or ideas"/><button className="button" type="submit">Find work ↗</button></div></form></section>
 <section className="studio-section"><div className="home-section"><div className="section-caption"><span>TASKY / MADE FOR DOERS</span><span>02</span></div><div className="editorial-heading" data-reveal><h2>From a “what if”.<br/>To a job well done.</h2><div><p>A place for people with something to build. And people with something to bring. Clear proposals, agreed expectations, and conversations that keep work moving.</p><a className="scene-link" href="#how-it-works">See how it works ↗</a></div></div><div className="audience-grid"><article data-reveal><div className="audience-art client-art" aria-hidden="true"><span className="brief-sheet"><small>THE NEXT BIG IDEA</small><b>What if<br/>we made<br/>it happen?</b><i>PROJECT / 001 ↗</i></span><span className="outline-orbit"/></div><p className="scene-kicker">FOR THE VISIONARIES</p><h3>You bring the idea.</h3><p>Post a clear brief, review proposals, and find the right person for your project.</p><Link className="scene-link" to="/post-task">Find your collaborator ↗</Link></article><article data-reveal><div className="audience-art talent-art" aria-hidden="true"><span className="talent-orb"/><span className="talent-word">MAKE<br/>YOUR<br/>MOVE.</span><small>YOUR SKILLS. YOUR NEXT CHAPTER.</small></div><p className="scene-kicker">FOR THE INDEPENDENT MINDS</p><h3>You bring the possibility.</h3><p>Discover work, share your approach, and turn your skills into your next opportunity.</p><Link className="scene-link" to="/tasks">Find your next project ↗</Link></article></div></div></section>
 <section className="home-section process-section" id="how-it-works"><div className="section-caption"><span>LESS FRICTION. MORE FORWARD.</span><span>03</span></div><div className="editorial-heading" data-reveal><h2>Great work.<br/><span>Starts with a conversation.</span></h2><p>From your first hello to your final handoff.<br/>A little structure. Plenty of possibility.</p></div><div className="process-grid">{[['DISCOVER', 'Find your people.', 'Post a project or explore tasks. Look for the skills, interests and ambition that fit.', '✳'], ['AGREE', 'Get on the same page.', 'Share a proposal. Talk through the scope, timeline and price before the work begins.'], ['DELIVER', 'Make something matter.', 'Stay connected through live messaging. Share progress and complete the agreed work.']].map(([label, title, text], index) => <article key={label} data-reveal><div className="process-label"><span>0{index + 1}</span><small>{label}</small></div><div className="process-art"><ProcessArt step={index}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
 <section className="home-section home-closing" data-reveal><div className="section-caption"><span>YOUR NEXT CHAPTER</span><span>04</span></div><div className="editorial-heading"><h2>Let’s make<br/><span>what’s next.</span></h2><div><p>A project you can’t stop thinking about.<br/>A skill ready for its next challenge.<br/>Start with one connection.</p><Link className="button" to="/signup">Make your move ↗</Link></div></div><Link className="closing-link" to="/tasks">A world of possibility. <span aria-hidden="true">↗</span></Link></section>
 </div>;
}
