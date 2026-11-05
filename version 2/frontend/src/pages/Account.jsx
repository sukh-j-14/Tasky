import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Field, FormStatus } from './shared';
import { GoogleSignIn } from './GoogleSignIn';

export function Account({ signup = false }) {
  const auth = useAuth(), navigate = useNavigate(), location = useLocation();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const target = location.state?.from?.startsWith('/') && !location.state.from.startsWith('//') ? location.state.from : '/dashboard';
  if (auth.user) return <Navigate to={target} replace/>;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await api(`/auth/${signup ? 'signup' : 'login'}`, { method: 'POST', body: values });
      auth.setUser(result.user); navigate(target, { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="section account"><p className="eyebrow">YOUR NEXT CHAPTER</p><h1>{signup ? 'Make room for possibility.' : 'Welcome back.'}</h1><p className="intro">{signup ? 'One account to find work and bring your projects to life.' : 'Good work is waiting. Let’s get back to it.'}</p><form className="panel form-grid" onSubmit={submit}>
    {signup && <><Field label="First name" name="firstName" required autoComplete="given-name" maxLength={70}/><Field label="Last name" name="lastName" required autoComplete="family-name" maxLength={70}/><Field label="Username" name="username" required autoComplete="username" pattern="[A-Za-z0-9_-]{3,30}" title="3–30 letters, numbers, underscores or hyphens"/></>}
    <Field label="Email" name="email" type="email" autoComplete="email" required/><Field label="Password" name="password" type="password" minLength={8} maxLength={128} required autoComplete={signup ? 'new-password' : 'current-password'}/><FormStatus error={error}/><button className="button" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}</button></form><GoogleSignIn onSuccess={user => { auth.setUser(user); navigate(target, { replace: true }); }}/><p className="account-switch">{signup ? 'Already have an account?' : 'New to Tasky?'} <Link to={signup ? '/login' : '/signup'} state={location.state}>{signup ? 'Log in' : 'Create an account'}</Link></p></section>;
}

export function Profile() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      body.skills = body.skills.split(',').map(value => value.trim()).filter(Boolean);
      body.hourlyRate = Number(body.hourlyRate);
      const result = await api('/auth/profile', { method: 'PUT', body });
      setUser(result.user); setSuccess('Your profile has been saved.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function upload(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const body = new FormData(); body.set('profilePicture', file);
      const result = await api('/auth/profile/upload', { method: 'POST', body });
      setUser({ ...user, profilePicture: result.profilePicture }); setSuccess('Profile photo updated.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="section workspace"><p className="eyebrow">YOUR PERSONAL INTRODUCTION</p><h1>Your profile.</h1><div className="profile-photo">{user.profilePicture && <img src={user.profilePicture} alt="Your profile"/>}<label className="field">Profile photo (JPG or PNG, up to 2 MB)<input type="file" accept="image/jpeg,image/png" disabled={busy} onChange={upload}/></label></div><form className="panel form-grid two-columns" key={user._id || user.id} onSubmit={submit}><Field label="First name" name="firstName" defaultValue={user.firstName} required/><Field label="Last name" name="lastName" defaultValue={user.lastName} required/><Field label="Location" name="location" defaultValue={user.location}/><Field label="Hourly rate (₹)" name="hourlyRate" type="number" min="0" defaultValue={user.hourlyRate || 0}/><Field label="Skills (comma separated)" name="skills" defaultValue={user.skills?.join(', ')}/><label className="field">Availability<select name="availability" defaultValue={user.availability || 'available'}><option value="available">Available</option><option value="busy">Busy</option><option value="unavailable">Unavailable</option></select></label><div className="full-width"><Field label="About you" name="bio" type="textarea" maxLength={500} defaultValue={user.bio}/><FormStatus error={error} success={success}/><button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button></div></form></section>;
}
