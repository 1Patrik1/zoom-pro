const API_BASE = import.meta.env.VITE_API_URL || '';

function buildUrl(path) {
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

export async function apiRequest(path, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || payload?.msg || 'Požadavek selhal';
    throw new Error(message);
  }

  return payload;
}

export const api = {
  request: (path, options) => apiRequest(path, options),
  login: (data) => apiRequest('/api/auth/login', { method: 'POST', body: data }),
  register: (data) => apiRequest('/api/auth/register', { method: 'POST', body: data }),
  sync: (token) => apiRequest('/api/sync', { token }),
  post: (path, token, body) => apiRequest(`/api/${path}`, { method: 'POST', token, body }),
  get: (path, token) => apiRequest(`/api/${path}`, { token }),
  put: (path, token, body) => apiRequest(`/api/${path}`, { method: 'PUT', token, body })
};
