import React, { useEffect, useState } from 'react';
import authApi from '../hooks/authApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { setToken, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      nav('/', { replace: true });
    }
  }, [isAuthenticated, nav]);

  const submit = async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await authApi.login(user, pwd);
      const token = res.token;
      setToken(token);
      nav('/');
    } catch (e) {
      console.error(e);
      setErr('Kullanıcı adı veya şifre hatalı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left illustration / promo */}
        <div className="hidden md:flex flex-col items-center justify-center gap-6 p-12 bg-gradient-to-br from-indigo-600 to-violet-500 text-white">
          <div className="w-14 h-14 bg-white bg-opacity-10 rounded-xl flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"/><path d="M8 3h8v4H8z"/></svg>
          </div>
          <h3 className="text-2xl font-bold">ERP Sistemine Hoş Geldiniz</h3>
          <p className="text-sm text-white/90 max-w-xs text-center">Servis kayıtlarınızı yönetin, işlemleri takip edin ve raporlarınızı görüntüleyin.</p>
        </div>

        {/* Form */}
        <div className="p-8 md:p-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Giriş Yap</h2>
          <p className="text-sm text-slate-500 mb-6">Hesabınızla oturum açın</p>

          {err && <div className="mb-4 alert alert-error shadow-sm">{err}</div>}

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-600">Kullanıcı</span>
              <input value={user} onChange={e => setUser(e.target.value)} placeholder="admin" className="input input-bordered w-full mt-2" />
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">Şifre</span>
              <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••" className="input input-bordered w-full mt-2" />
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="checkbox" /> <span>Beni hatırla</span>
              </label>
              <a className="text-sm text-indigo-600">Şifremi Unuttum</a>
            </div>

            <div className="pt-4">
              <button onClick={submit} className={`btn btn-primary w-full ${loading ? 'loading' : ''}`} disabled={loading}>Giriş Yap</button>
            </div>
          </div>

          <div className="mt-6 text-sm text-center text-slate-500">Henüz hesap yok mu? <a className="text-indigo-600">Kayıt Ol</a></div>
        </div>
      </div>
    </div>
  )
}
