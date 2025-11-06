import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { Settings } from 'lucide-react';

function useHashScroll() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);
}

function SuggestionsEditor({ storageKey, title, defaultList = [] }) {
  // items: array of { id?, value, sortOrder? }
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const apiKey = storageKey;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/settings/suggestions/${encodeURIComponent(apiKey)}`);
        if (!res.ok) throw new Error('API hata');
        const data = await res.json();
        if (!mounted) return;
        // data is [{id, value, sortOrder}]
        setItems((data || []).map(d => ({ id: d.id, value: d.value, sortOrder: d.sortOrder })));
      } catch (e) {
        // fallback to localStorage
        try {
          const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (Array.isArray(stored) && stored.length > 0) {
            // normalize strings or objects
            const norm = stored.map((s, i) => (typeof s === 'string' ? { value: s, sortOrder: i } : { id: s.id, value: s.value || s, sortOrder: s.sortOrder ?? i }));
            if (mounted) setItems(norm);
          } else {
            const norm = defaultList.map((v, i) => ({ value: v, sortOrder: i }));
            localStorage.setItem(storageKey, JSON.stringify(defaultList));
            if (mounted) setItems(norm);
          }
        } catch (e2) {
          const norm = defaultList.map((v, i) => ({ value: v, sortOrder: i }));
          localStorage.setItem(storageKey, JSON.stringify(defaultList));
          if (mounted) setItems(norm);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [storageKey, defaultList, apiKey]);

  const persistToServer = async (nextList) => {
    try {
      const body = nextList.map((it, i) => ({ value: it.value, sortOrder: it.sortOrder ?? i }));
      const res = await fetch(`/api/settings/suggestions/${encodeURIComponent(apiKey)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Could not persist');
      const updated = await res.json();
      // updated returns array with ids
      setItems((updated || []).map(u => ({ id: u.id, value: u.value, sortOrder: u.sortOrder })));
      // mirror to localStorage for offline fallback
      try { localStorage.setItem(storageKey, JSON.stringify((updated || []).map(u => u.value))); } catch (e) { }
      setError('');
      return true;
    } catch (err) {
      // fallback: save in localStorage as strings
      try { localStorage.setItem(storageKey, JSON.stringify(nextList.map(n => n.value))); } catch (e) { }
      setItems(nextList);
      setError('Sunucuya bağlanılamadı, değişiklikler localStorage üzerinde kaydedildi.');
      return false;
    }
  };

  return (
    <div id={storageKey.includes('alan') ? 'alan' : 'yapan'} className="bg-white shadow rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      <div className="mb-4">
        <div className="flex gap-2">
          <input ref={inputRef} className="input input-bordered flex-1" placeholder="Yeni öneri ekle" />
          <button className="btn btn-primary" onClick={async () => {
            const v = inputRef.current?.value?.trim();
            if (!v) return;
            // avoid duplicates
            if (items.some(it => it.value === v)) { inputRef.current.value = ''; return; }
            const next = [{ value: v, sortOrder: 0 }, ...items.map((it, i) => ({ value: it.value, sortOrder: (it.sortOrder ?? (i+1)) }))];
            await persistToServer(next);
            inputRef.current.value = '';
          }}>Ekle</button>
        </div>
        {error && <div className="text-xs text-rose-600 mt-2">{error}</div>}
      </div>

      {loading ? <div className="text-sm text-slate-500">Yükleniyor...</div> : (
        <ul className="divide-y">
          {items.map((it, idx) => (
            <li key={(it.id ?? it.value) + idx} className="py-3 flex items-center justify-between">
              <div className="text-sm">{it.value}</div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const newVal = prompt('Düzenle', it.value);
                  if (newVal === null) return;
                  const trimmed = (newVal || '').trim();
                  if (!trimmed) return;
                  const next = items.map((x, i) => i === idx ? { id: x.id, value: trimmed, sortOrder: x.sortOrder ?? i } : { id: x.id, value: x.value, sortOrder: x.sortOrder ?? i });
                  await persistToServer(next);
                }}>Düzenle</button>
                <button className="btn btn-ghost btn-sm text-rose-600" onClick={async () => {
                  if (!window.confirm('Silmek istediğinize emin misiniz?')) return;
                  const next = items.filter((_, i) => i !== idx).map((x, i) => ({ id: x.id, value: x.value, sortOrder: i }));
                  await persistToServer(next);
                }}>Sil</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SettingsSuggestions() {
  useHashScroll();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Header title="Ayarlar" subtitle="Öneriler" IconComponent={Settings} showBack={true} />
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ayarlar — Öneriler</h2>
          <div>
            <Link to="/" className="text-sm text-slate-500">🏠 Ana Sayfa</Link>
          </div>
        </div>

        <SuggestionsEditor storageKey={'ts_alanKisi_suggestions'} title={'Hazır Öneriler — Alan Kişi'} defaultList={['Fatmanur','Yeliz','Seray','Hatice']} />

        <SuggestionsEditor storageKey={'ts_yapanKisi_suggestions'} title={'Yapan Kişi Önerileri'} defaultList={['Ahmet','Mehmet','Ayşe','Fatma']} />
      </main>
    </div>
  );
}
