const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function fetchApi(endpoint, options = {}) {
  const { method = 'GET', body = null } = options;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export async function getUsers() {
  return fetchApi('/api/users');
}

export async function createUser(data) {
  return fetchApi('/api/users', { method: 'POST', body: data });
}

export async function updateUser(id, data) {
  return fetchApi(`/api/users/${id}`, { method: 'PUT', body: data });
}

export async function deleteUser(id) {
  return fetchApi(`/api/users/${id}`, { method: 'DELETE' });
}

export async function createCheckout(id, priceId = null) {
  const body = priceId ? { price_id: priceId } : {};
  return fetchApi(`/api/users/${id}/checkout`, { method: 'POST', body });
}

export async function kickUser(id) {
  return fetchApi(`/api/users/${id}/kick`, { method: 'POST' });
}

export async function getActivity() {
  return fetchApi('/api/activity');
}

export async function getPlexFriends() {
  return fetchApi('/api/plex/friends');
}

export async function getPlexLibraries() {
  return fetchApi('/api/plex/libraries');
}

export async function healthCheck() {
  return fetchApi('/api/health');
}
