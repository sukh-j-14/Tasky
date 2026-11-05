import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { ThemeToggle } from './ThemeToggle';
export function Header() {
 const {user,loading,logout}=useAuth(); const navigate=useNavigate(); const location=useLocation();
 const [error,setError]=React.useState('');
 const [lightSection,setLightSection]=React.useState(false);
 React.useEffect(() => {
  if(location.pathname !== '/') return;
  function update(){const section=document.querySelector('.studio-section');const bounds=section?.getBoundingClientRect();setLightSection(Boolean(bounds && bounds.top < 80 && bounds.bottom > 80));}
  window.addEventListener('scroll',update,{passive:true}); update();
  return () => window.removeEventListener('scroll',update);
 },[location.pathname]);
 async function signout(){try{await logout();navigate('/');}catch(err){setError(err.message);}}
 return <><header className={`header ${location.pathname === '/' ? `home-header ${lightSection ? 'home-header-light' : ''}` : ''}`}><Link className="brand" to="/" aria-label="Tasky home">tasky<span>.</span></Link><nav aria-label="Main navigation"><NavLink to="/tasks">Explore tasks</NavLink>{user ? <><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/messages">Messages</NavLink><NavLink to="/profile">Profile</NavLink></> : <a href="/#how-it-works">How it works</a>}</nav><div className="header-actions"><ThemeToggle/>{user ? <><Link className="button" to="/post-task">Post a task ↗</Link><button className="logout" onClick={signout}>Log out</button></> : !loading && <><Link to="/login">Log in</Link><Link className="button" to="/signup">Get started ↗</Link></>}</div></header>{error && <p role="alert" className="form-error">{error}</p>}</>;
}
