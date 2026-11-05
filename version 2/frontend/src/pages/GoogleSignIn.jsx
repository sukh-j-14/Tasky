import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
let scriptPromise;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = resolve; script.onerror = () => { scriptPromise = null; reject(new Error('Google sign-in could not load.')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export function GoogleSignIn({ onSuccess }) {
  const container = useRef(null), callback = useRef(onSuccess); callback.current = onSuccess;
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('/auth/google/config').then(async ({ clientId }) => {
      await loadGoogle(); if (!active) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
        try { const result = await api('/auth/google', { method: 'POST', body: { credential } }); if (active) callback.current(result.user); }
        catch (err) { if (active) setError(err.message); }
      } });
      window.google.accounts.id.renderButton(container.current, { type: 'standard', theme: 'outline', size: 'large' });
    }).catch(err => { if (active && err.status !== 503) setError(err.message); });
    return () => { active = false; };
  }, []);
  return <div className="google-sign-in"><div ref={container}/>{error && <p role="alert">{error}</p>}</div>;
}
