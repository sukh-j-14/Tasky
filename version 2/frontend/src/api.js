export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include', ...options,
    headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || data.errors?.join(', ') || data.message || 'Request failed. Please try again.'), { status: response.status });
  return data;
}
export const identity = value => String(value?._id || value?.id || value || '');
export const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
