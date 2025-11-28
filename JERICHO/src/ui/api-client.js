const API_BASE = 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Request failed');
  }
  return res.json();
}

export function fetchPipeline() {
  return request('/pipeline');
}

export function fetchHealth() {
  return request('/health');
}

export function postGoal(goal) {
  return request('/goals', { method: 'POST', body: JSON.stringify(goal) });
}

export function postIdentity(payload) {
  return request('/identity', { method: 'POST', body: JSON.stringify(payload) });
}

export function postTaskStatus(payload) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(payload) });
}

export function resetState() {
  return request('/reset', { method: 'POST' });
}
