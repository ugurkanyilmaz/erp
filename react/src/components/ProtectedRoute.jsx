import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getToken, isTokenExpired, tryRefresh, getRolesFromToken } from '../utils/auth';

// usage: <ProtectedRoute roles={[ 'admin', 'muhasebe' ]}><MyPage/></ProtectedRoute>
export default function ProtectedRoute({ children, roles = [] }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'denied'

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = getToken();
      if (!token) {
        // try refresh
        const refreshed = await tryRefresh();
        if (!refreshed) {
          if (mounted) setStatus('denied');
          return;
        }
      }

      const effectiveToken = getToken();
      if (!effectiveToken) {
        if (mounted) setStatus('denied');
        return;
      }

      if (isTokenExpired(effectiveToken)) {
        const refreshed = await tryRefresh();
        if (!refreshed) {
          if (mounted) setStatus('denied');
          return;
        }
      }

      if (roles && roles.length > 0) {
        const userRoles = getRolesFromToken(getToken());
        const has = roles.some(r => userRoles.includes(r));
        if (!has) {
          if (mounted) setStatus('denied');
          return;
        }
      }

      if (mounted) setStatus('ok');
    })();
    return () => { mounted = false; };
  }, [roles]);

  if (status === 'checking') return null; // or a spinner
  if (status === 'denied') return <Navigate to="/login" replace />;
  return children;
}
