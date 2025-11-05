import axios from 'axios';

// In Vite use import.meta.env.VITE_API_URL for runtime env vars.
// You can create a `.env` file at the project root with e.g.:
// VITE_API_URL=http://192.168.1.45:5019
// If VITE_API_URL is not provided, when running in the browser we derive the API host
// from the frontend by using window.location.hostname (works with both localhost and network IP)
// and appending the API port 5019 so mobile clients work when the frontend is served from
// http://<machine-ip>:5173.
const defaultApiPort = '5019';
const base = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? (() => {
  try {
    // Use hostname instead of origin to avoid the port confusion
    // e.g. if frontend is at http://192.168.141.29:5173, we want http://192.168.141.29:5019
    const protocol = window.location.protocol; // http: or https:
    const hostname = window.location.hostname; // 192.168.141.29 or localhost
    return `${protocol}//${hostname}:${defaultApiPort}`;
  } catch {
    return 'http://localhost:5019';
  }
})() : 'http://localhost:5019');

const api = axios.create({
  baseURL: base,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug: expose and log the resolved base URL to make mobile debugging easier.
try {
  // eslint-disable-next-line no-console
  console.log('[api] resolved base URL ->', base);
} catch {}

// Attach token from localStorage to each request
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
export { base as apiBase };
