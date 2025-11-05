import api, { apiBase } from './api';

export async function login(username, password) {
  const payload = { userName: username, password };
  try {
    // Debug: log where we're sending the login request and the payload (no password in logs)
    // eslint-disable-next-line no-console
    console.log('[authApi] login ->', api.defaults.baseURL || apiBase, { userName: username });
    const res = await api.post('/api/auth/login', payload);
    // eslint-disable-next-line no-console
    console.log('[authApi] login response', res.status, res.data);
    return res.data;
  } catch (err) {
    // Log full error for debugging on mobile
    // eslint-disable-next-line no-console
    console.error('[authApi] login error', err && err.response ? { status: err.response.status, data: err.response.data } : err);
    throw err;
  }
}

export default { login };
