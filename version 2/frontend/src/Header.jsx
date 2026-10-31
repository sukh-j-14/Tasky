import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
export function Header() {
 const {user,loading,logout}=useAuth(); const navigate=useNavigate();
 const [error,setError]=React.useState('');
 async function signout(){try{await logout();navigate('/');}catch(err){setError(err.message);}}
 return <><header className="header"><Link className="brand" to="/" aria-label="Tasky home">tasky<span>.</span></Link><nav aria-label="Main navigation"><NavLink to="/tasks">Explore tasks</NavLink>{user ? <><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/messages">Messages</NavLink><NavLink to="/profile">Profile</NavLink></> : <a href="/#how-it-works">How it works</a>}</nav><div className="header-actions">{user ? <><Link className="button" to="/post-task">Post a task ↗</Link><button className="logout" onClick={signout}>Log out</button></> : !loading && <><Link to="/login">Log in</Link><Link className="button" to="/signup">Get started ↗</Link></>}</div></header>{error && <p role="alert" className="form-error">{error}</p>}</>;
}
