import React, { useEffect, useState } from 'react';

export function ThemeToggle() {
 const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
 useEffect(() => {
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  function followSystem(event) {
   try { if (localStorage.getItem('tasky-theme')) return; } catch {}
   const next = event.matches ? 'dark' : 'light';
   document.documentElement.dataset.theme = next;
   setTheme(next);
  }
  preference.addEventListener('change', followSystem);
  return () => preference.removeEventListener('change', followSystem);
 }, []);
 function toggle() {
  const next = theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  setTheme(next);
  try { localStorage.setItem('tasky-theme', next); } catch {}
 }
 return <button type="button" className="theme-toggle" onClick={toggle} aria-label="Dark mode" aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button>;
}
