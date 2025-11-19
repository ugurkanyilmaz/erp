import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const TOKEN_EVENT = 'keten-auth-token-changed';
const LOGOUT_EVENT = 'keten-auth-logout';

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('token');
  } catch {
    return null;
  }
};

const decodeToken = (token) => {
  if (!token) return null;
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;

    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    let binary = '';
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      binary = window.atob(padded);
    } else if (typeof Buffer !== 'undefined') {
      binary = Buffer.from(padded, 'base64').toString('binary');
    }
    const json = decodeURIComponent(Array.from(binary).map((char) =>
      `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`
    ).join(''));
    const payload = JSON.parse(json);

    const collectedRoles = new Set();
    const possibleKeys = [
      'role',
      'roles',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ];
    possibleKeys.forEach((key) => {
      const value = payload[key];
      if (!value) return;
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach(r => collectedRoles.add(r));
      } else {
        collectedRoles.add(value);
      }
    });

    const name = payload.unique_name
      || payload.name
      || payload.preferred_username
      || payload.sub
      || payload.email
      || '';

    return {
      name,
      roles: Array.from(collectedRoles),
      payload,
    };
  } catch (err) {
    console.warn('Failed to decode auth token', err);
    return null;
  }
};

const AuthContext = createContext({
  token: null,
  user: null,
  roles: [],
  isAuthenticated: false,
  setToken: () => {},
  logout: () => {},
  hasRole: () => false,
  hasAnyRole: () => false,
});

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => decodeToken(getStoredToken()));

  useEffect(() => {
    if (token) {
      try {
        window.localStorage.setItem('token', token);
      } catch {/* ignore quota errors */}
      setUser(decodeToken(token));
    } else {
      try {
        window.localStorage.removeItem('token');
      } catch {/* ignore */}
      setUser(null);
    }
  }, [token]);

  // Auto-clear token when it expires (based on JWT exp claim). This avoids showing
  // the app as authenticated if the access token is already expired. Refresh
  // attempts via cookie are handled by the axios interceptor on 401.
  const expiryTimerRef = useRef<number | null>(null);
  useEffect(() => {
    // clear previous timer
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    const t = decodeToken(token);
    const exp = t?.payload?.exp;
    if (!exp) return undefined;

    const expMs = Number(exp) * 1000;
    const now = Date.now();
    if (expMs <= now) {
      // token already expired — remove it
      setToken(null);
      return undefined;
    }

    // schedule a cleanup shortly after expiry
    const delay = expMs - now + 1000;
    expiryTimerRef.current = window.setTimeout(() => {
      try { setToken(null); } catch {}
    }, delay);

    return () => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    };
  }, [token, setToken]);

  const syncFromStorage = useCallback(() => {
    setTokenState(getStoredToken());
  }, []);

  useEffect(() => {
    const handler = () => syncFromStorage();
    window.addEventListener(TOKEN_EVENT, handler);
    window.addEventListener(LOGOUT_EVENT, handler);
    return () => {
      window.removeEventListener(TOKEN_EVENT, handler);
      window.removeEventListener(LOGOUT_EVENT, handler);
    };
  }, [syncFromStorage]);

  const broadcast = useCallback((eventName) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(eventName));
    }
  }, []);

  const setToken = useCallback((newToken) => {
    setTokenState(newToken ?? null);
    try {
      if (newToken) {
        window.localStorage.setItem('token', newToken);
      } else {
        window.localStorage.removeItem('token');
      }
    } catch {/* ignore storage errors */}
    broadcast(newToken ? TOKEN_EVENT : LOGOUT_EVENT);
  }, [broadcast]);

  const logout = useCallback(async () => {
    // Signal logout in progress to prevent refresh race, then clear local token
    try { window.localStorage.setItem('keten-logging-out', '1'); } catch {}
    setTokenState(null);
    try {
      window.localStorage.removeItem('token');
    } catch {/* ignore */}
    broadcast(LOGOUT_EVENT);

    // Then try to inform backend to revoke refresh cookie/token
    try {
      if (typeof window !== 'undefined') {
        await fetch((import.meta.env.VITE_API_URL || '') + '/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch {
      // ignore network errors
    } finally {
      // remove logging-out flag
      try { window.localStorage.removeItem('keten-logging-out'); } catch {}
    }
  }, [broadcast]);

  const roles = user?.roles ?? [];

  const value = useMemo(() => ({
    token,
    user,
    roles,
    isAuthenticated: Boolean(token && user),
    setToken,
    logout,
    hasRole: (role) => roles.includes(role),
    hasAnyRole: (requiredRoles = []) => requiredRoles.some(r => roles.includes(r)),
  }), [logout, roles, setToken, token, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const authEvents = {
  TOKEN_EVENT,
  LOGOUT_EVENT,
};
