import React, { useEffect } from 'react'

export default function Notification({ type = 'info', message = '', onClose }) {
  useEffect(() => {
    if (!message) return;
    // shorter auto-close so the notification doesn't linger too long
    const t = setTimeout(() => onClose && onClose(), 1500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const bg = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-emerald-600' : 'bg-slate-800';

  return (
    // inline zIndex ensures notification is above modals (which use z-50)
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50" style={{ zIndex: 99999 }}>
      <div className={`pointer-events-auto ${bg} text-white px-6 py-3 rounded-xl shadow-lg max-w-xl mx-4`}> 
        <div className="text-sm">{message}</div>
      </div>
    </div>
  )
}
