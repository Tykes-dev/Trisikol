const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function api(path, { method = 'GET', body, form = false } = {}) {
  const headers = {};
  try {
    if (method !== 'GET' && navigator.onLine === false) throw new Error('You are offline. Reconnect before confirming this action.');
    if (method !== 'GET') {
      const csrfResponse = await fetch(`${BASE}/auth/csrf`, { credentials: 'include', signal: AbortSignal.timeout(15000) });
      if (!csrfResponse.ok) throw new Error('Unable to establish a secure session. Please retry.');
      const csrf = await csrfResponse.json();
      headers[csrf.headerName] = csrf.token;
    }
    if (body) headers['Content-Type'] = form ? 'application/x-www-form-urlencoded' : 'application/json';
    const response = await fetch(`${BASE}${path}`, {
      method, credentials: 'include', headers, signal: AbortSignal.timeout(15000),
      body: body ? form ? new URLSearchParams(body).toString() : JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.message || (response.status === 401 ? 'Please sign in again.' :
        response.status === 403 ? 'This action is not allowed. Refresh and try again.' : 'Request failed. Please try again.'));
      error.status = response.status;
      if (response.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('auth-expired'));
      throw error;
    }
    return response.status === 204 ? null : await response.json();
  } catch (error) {
    if (error.name === 'TimeoutError') throw new Error('The server took too long to respond. Please try again.', { cause: error });
    if (error instanceof TypeError) throw new Error('Cannot reach the server. Check your connection and try again.', { cause: error });
    throw error;
  }
}
