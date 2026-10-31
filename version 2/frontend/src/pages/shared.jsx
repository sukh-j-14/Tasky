import React, { useEffect, useState } from 'react';
import { api } from '../api';
export function useResource(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: '' });
    api(path, { signal: controller.signal }).then(data => setState({ data, loading: false, error: '' })).catch(error => {
      if (error.name !== 'AbortError') setState({ data: null, loading: false, error: error.message });
    });
    return () => controller.abort();
  }, [path, revision]);
  return { ...state, reload: () => setRevision(value => value + 1) };
}
export function ResourceState({ resource, children }) {
  if (resource.loading) return <p role="status">Loading…</p>;
  if (resource.error) return <div className="notice" role="alert"><p>{resource.error}</p><button className="button" onClick={resource.reload}>Try again</button></div>;
  return children;
}
export function Field({ label, name, type = 'text', ...props }) {
  return <label className="field"><span>{label}</span>{type === 'textarea' ? <textarea name={name} {...props}/> : <input type={type} name={name} {...props}/>}</label>;
}
export function FormStatus({ error, success }) { return <>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}</>; }
export const taskCategories = ['coding','design','writing','translation','data-analysis','presentation','research-paper','assignment','lab-report','other'];
