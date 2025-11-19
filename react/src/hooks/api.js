import axios from 'axios';

// In Vite use import.meta.env.VITE_API_URL for runtime env vars.
// You can create a `.env` file at the project root with e.g.:
// VITE_API_URL=http://192.168.1.45:5000
// If VITE_API_URL is not provided, when running in the browser we derive the API host
// from the frontend by using window.location.hostname (works with both localhost and network IP)
// and appending the API port 5000 so mobile clients work when the frontend is served from
// http://<machine-ip>:5173 or in production from the same origin.
const defaultApiPort = '5000';
const deriveBaseUrl = () => {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return `http://localhost:${defaultApiPort}`;

  try {
    const { protocol, hostname, port } = window.location;
    const devPorts = new Set(['5173', '5174', '3000']);
    if (devPorts.has(port)) {
      // Local dev server (Vite/React) -> talk to API port directly
      return `${protocol}//${hostname}:${defaultApiPort}`;
    }

    // In production or when served from Docker/Caddy we want same-origin calls (goes through /api)
    const portSegment = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portSegment}`;
  } catch {
    return `http://localhost:${defaultApiPort}`;
  }
};

const base = import.meta.env.VITE_API_URL || deriveBaseUrl();

const TOKEN_EVENT = 'keten-auth-token-changed';
const LOGOUT_EVENT = 'keten-auth-logout';
const broadcast = (eventName) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
};

const api = axios.create({
  baseURL: base,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send cookies (refresh token) along with requests
  withCredentials: true,
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

// Response interceptor: if 401, try to refresh once and retry the original request.
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;
    if (!originalRequest) return Promise.reject(err);

    // If 401 and we haven't retried yet, attempt refresh
    if (err.response && err.response.status === 401 && !originalRequest._retry) {
      // If a logout is in progress, do not attempt refresh — force redirect
      try {
        if (localStorage.getItem('keten-logging-out')) {
          localStorage.removeItem('token');
          broadcast(LOGOUT_EVENT);
          window.location.href = '/login';
          return Promise.reject(err);
        }
      } catch {}
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue the request until refresh finishes
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(err);
            }
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshRes = await api.post('/api/auth/refresh');
        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem('token', newToken);
          broadcast(TOKEN_EVENT);
          onRefreshed(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        // fallback: redirect to login
        localStorage.removeItem('token');
        broadcast(LOGOUT_EVENT);
        window.location.href = '/login';
        return Promise.reject(err);
      } catch (refreshErr) {
        // refresh failed -> force login
        localStorage.removeItem('token');
        broadcast(LOGOUT_EVENT);
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
export { base as apiBase };
