import React from 'react'
import { ChevronLeft, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function Header({ title, subtitle, IconComponent, showBack = false }) {
  const nav = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const userName = user?.name || '';

  const handleLogin = () => nav('/login');
  const handleLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button className="p-2 hover:bg-slate-100 rounded-lg transition" onClick={() => nav('/')}>
              <ChevronLeft size={22} className="text-slate-700" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              {IconComponent ? (
                <IconComponent size={22} className="text-white" />
              ) : (
                <span className="text-white font-bold">E</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="btn btn-ghost btn-circle">
            <div className="indicator">
              <Bell size={20} className="text-slate-600" />
              <span className="badge badge-xs badge-primary indicator-item"></span>
            </div>
          </button>

          {/* Login area: show 'Giriş Yap' if not logged in, otherwise show user name and a logout button */}
          {!isAuthenticated ? (
            <button onClick={handleLogin} className="btn btn-sm btn-outline">Giriş Yap</button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-slate-800">{userName}</div>
              <button onClick={handleLogout} className="btn btn-sm btn-ghost">Çıkış</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
