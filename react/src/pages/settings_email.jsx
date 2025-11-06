import React, { useEffect, useState, useRef } from 'react';
import Header from '../components/Header';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

export default function SettingsEmail() {
  const STORAGE_KEY = 'email_accounts';
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const nameRef = useRef();
  const hostRef = useRef();
  const portRef = useRef();
  const userRef = useRef();
  const passRef = useRef();
  const fromRef = useRef();
  const tlsRef = useRef();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/settings/emailaccounts');
        if (res.ok) {
          const data = await res.json();
          if (!mounted) return;
          setAccounts(data || []);
          setLoading(false);
          return;
        }
      } catch (e) { }

      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (Array.isArray(stored)) setAccounts(stored);
      } catch (e) { }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const persist = (next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { console.warn('Could not persist email settings', e); }
    setAccounts(next);
  };

  const addAccount = () => {
    const name = (nameRef.current?.value || '').trim();
    const host = (hostRef.current?.value || '').trim();
    const port = parseInt(portRef.current?.value || '587', 10) || 587;
    const user = (userRef.current?.value || '').trim();
    const pass = (passRef.current?.value || '').trim();
    const from = (fromRef.current?.value || '').trim();
    const tls = !!tlsRef.current?.checked;
    if (!name || !host || !from) {
      alert('Lütfen en azından bir isim, SMTP host ve From adresi girin.');
      return;
    }
    const a = { name, host, port, userName: user, encryptedPassword: pass, fromAddress: from, useTls: tls, isActive: false, createdAt: new Date().toISOString() };
    (async () => {
      try {
        const res = await fetch('/api/settings/emailaccounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) });
        if (res.ok) {
          const created = await res.json();
          persist([created, ...accounts.map(acc => ({ ...acc }))]);
          return;
        }
      } catch (e) { }
      // fallback to local
      const fallback = [{ id: makeId(), name, host, port, userName: user, encryptedPassword: pass, fromAddress: from, useTls: tls, isActive: false, createdAt: new Date().toISOString() }, ...accounts.map(acc => ({...acc}))];
      persist(fallback);
    })();
    // clear
    nameRef.current.value = '';
    hostRef.current.value = '';
    portRef.current.value = '587';
    userRef.current.value = '';
    passRef.current.value = '';
    fromRef.current.value = '';
    tlsRef.current.checked = true;
  };

  const removeAccount = (id) => {
    if (!confirm('Bu e-posta hesabını silmek istediğinize emin misiniz?')) return;
    (async () => {
      try {
        const res = await fetch(`/api/settings/emailaccounts/${id}`, { method: 'DELETE' });
        if (res.ok || res.status === 204) {
          persist(accounts.filter(a => a.id !== id));
          return;
        }
      } catch (e) { }
      // fallback
      persist(accounts.filter(a => a.id !== id));
    })();
  };

  const setActive = (id) => {
    (async () => {
      try {
        const res = await fetch(`/api/settings/emailaccounts/${id}/activate`, { method: 'POST' });
        if (res.ok) {
          const updated = await res.json();
          // reload list from server
          try {
            const listRes = await fetch('/api/settings/emailaccounts');
            if (listRes.ok) {
              const list = await listRes.json();
              persist(list);
              return;
            }
          } catch (e) { }
        }
      } catch (e) { }
      // fallback: mark locally
      const next = accounts.map(a => ({ ...a, isActive: a.id === id }));
      persist(next);
    })();
  };

  const editAccount = async (id) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    const name = prompt('İsim', acc.name);
    if (name === null) return;
    const host = prompt('SMTP Host', acc.host);
    if (host === null) return;
    const port = prompt('Port', String(acc.port || 587));
    if (port === null) return;
  const from = prompt('From adresi', acc.fromAddress);
    if (from === null) return;
    const payload = { ...acc, name: name.trim() || acc.name, host: host.trim() || acc.host, port: Number(port) || acc.port, fromAddress: from.trim() || acc.fromAddress };
    try {
      const res = await fetch(`/api/settings/emailaccounts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const updated = await res.json();
        persist(accounts.map(a => a.id === id ? updated : a));
        return;
      }
    } catch (e) { }
    // fallback
    const next = accounts.map(a => a.id === id ? ({ ...a, name: name.trim() || a.name, host: host.trim() || a.host, port: Number(port) || a.port, fromAddress: from.trim() || a.fromAddress }) : a);
    persist(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Header title="Ayarlar" subtitle="E-Posta Hesapları" IconComponent={Settings} showBack={true} />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">E-Posta Hesapları</h2>
            <p className="text-sm text-slate-500">Teklif gönderirken kullanılacak e-posta hesaplarını buradan ekleyin. Bir hesabı aktif yaparsanız o an kullanılacak olan o olacaktır.</p>
          </div>
          <div>
            <Link to="/settings" className="text-sm text-slate-500">← Ayarlar</Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="font-semibold mb-3">Yeni E-Posta Hesabı Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input ref={nameRef} className="input input-bordered" placeholder="Görünen İsim (Örn: Firma - Teklif)" />
            <input ref={fromRef} className="input input-bordered" placeholder="From adresi (örn: teklif@firma.com)" />
            <input ref={hostRef} className="input input-bordered" placeholder="SMTP Host (örn: smtp.mail.com)" />
            <input ref={portRef} className="input input-bordered" placeholder="Port" defaultValue="587" />
            <input ref={userRef} className="input input-bordered" placeholder="SMTP Kullanıcı Adı" />
            <input ref={passRef} type="password" className="input input-bordered" placeholder="SMTP Parolası" />
            <label className="flex items-center gap-2"><input ref={tlsRef} type="checkbox" defaultChecked /> TLS/STARTTLS kullan</label>
            <div className="flex items-center justify-end">
              <button className="btn btn-primary" onClick={addAccount}>Hesap Ekle</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-semibold mb-3">Tanımlı Hesaplar</h3>
          {loading ? <div className="text-sm text-slate-500">Yükleniyor...</div> : (
            <ul className="divide-y">
              {accounts.length === 0 && <li className="py-4 text-sm text-slate-500">Henüz hesap eklenmemiş.</li>}
              {accounts.map(acc => (
                <li key={acc.id} className="py-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={!!acc.isActive} onChange={() => setActive(acc.id)} />
                      <div>
                        <div className="font-medium">{acc.name} {acc.isActive ? <span className="text-xs text-green-600 ml-2">(Aktif)</span> : null}</div>
                        <div className="text-xs text-slate-500">{acc.fromAddress} — {acc.host}:{acc.port} {acc.useTls ? 'TLS' : ''}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => editAccount(acc.id)}>Düzenle</button>
                    <button className="btn btn-ghost btn-sm text-rose-600" onClick={() => removeAccount(acc.id)}>Sil</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
