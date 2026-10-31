import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from './api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function refresh() {
    setLoading(true); setError('');
    try { setUser(await api('/auth/profile')); }
    catch (err) { setUser(null); if (err.status !== 401) setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  async function logout() { await api('/auth/logout', { method: 'POST' }); setUser(null); }
  return <AuthContext.Provider value={{ user, setUser, loading, error, refresh, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
export function Protected({ children }) {
  const auth = useAuth(), location = useLocation();
  if (auth.loading) return <section className="section" role="status">Checking your session…</section>;
  if (auth.error) return <section className="section notice" role="alert"><h2>Connection unavailable</h2><p>{auth.error}</p><button className="button" onClick={auth.refresh}>Try again</button></section>;
  return auth.user ? children : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace/>;
}
