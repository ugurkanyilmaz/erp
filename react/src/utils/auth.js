// Small auth helpers: token decoding, expiry check and refresh helper
export function getToken() {
  return localStorage.getItem('token');
}

export function clearAuth() {
  localStorage.removeItem('token');
}

export function decodeToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function getRolesFromToken(token) {
  const p = decodeToken(token);
  if (!p) return [];
  const role = p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  if (!role) return [];
  return Array.isArray(role) ? role : [role];
}

export function isTokenExpired(token) {
  const p = decodeToken(token);
  if (!p) return true;
  // exp is in seconds
  const exp = p.exp;
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
}

// Try refresh by calling the refresh endpoint using fetch so we avoid axios
// interceptors recursion. Returns true if refresh succeeded and token saved.
export async function tryRefresh() {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) return false;
    const body = await res.json();
    if (body?.token) {
      localStorage.setItem('token', body.token);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}
