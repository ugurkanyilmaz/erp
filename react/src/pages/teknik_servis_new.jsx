import React, { useState, useRef, useEffect } from 'react';
import useOutsideClick from '../hooks/useOutsideClick';
import { useOutletContext, useNavigate } from 'react-router-dom';
import serviceApi from '../hooks/serviceApi';

function getDefaultDateTimeLocal() {
  const d = new Date();
  // convert to local timezone ISO string without seconds/milliseconds and without the trailing Z
  const tzOffset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ServisNew(props) {
  const [yeniKayit, setYeniKayit] = useState({
    servisTakipNo: '',
    urunModeli: '',
    firmaIsmi: '',
    gelisTarihi: getDefaultDateTimeLocal(),
    belgeNo: '',
    alanKisi: '',
    notlar: '',
  });
  // Prefer props, then Outlet context (from wrapper), then local defaults
  const outlet = useOutletContext?.() ?? {};
  const products = props.products ?? outlet.products ?? [];
  const productsLoading = props.productsLoading ?? outlet.productsLoading ?? false;
  const productsError = props.productsError ?? outlet.productsError ?? '';
  const filteredProductsProp = props.filteredProducts ?? outlet.filteredProducts ?? [];

  const localSuggestionsRef = useRef(null);
  const suggestionsRef = props.suggestionsRef ?? outlet.suggestionsRef ?? localSuggestionsRef;
  const customerRef = useRef(null);

  const [localShowSuggestions, setLocalShowSuggestions] = useState(false);
  const showProductSuggestions = props.showProductSuggestions ?? outlet.showProductSuggestions ?? localShowSuggestions;
  const setShowProductSuggestions = props.setShowProductSuggestions ?? outlet.setShowProductSuggestions ?? setLocalShowSuggestions;
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Alan kişi suggestions (persisted in localStorage)
  const [alanKisiSuggestions, setAlanKisiSuggestions] = useState([]);
  useEffect(() => {
    const key = 'ts_alanKisi_suggestions';
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/settings/suggestions/${encodeURIComponent(key)}`);
        if (res.ok) {
          const data = await res.json();
          if (!mounted) return;
          setAlanKisiSuggestions((data || []).map(d => d.value));
          return;
        }
      } catch (e) {
        // fallthrough to localStorage fallback
      }

      try {
        const stored = JSON.parse(localStorage.getItem(key) || 'null');
        if (Array.isArray(stored) && stored.length > 0) {
          if (mounted) setAlanKisiSuggestions(stored.map(s => (typeof s === 'string' ? s : (s.value || ''))));
          return;
        }
      } catch (e) { }

      const defaults = ['Fatmanur','Yeliz','Seray','Hatice'];
      try { localStorage.setItem(key, JSON.stringify(defaults)); } catch (e) { }
      if (mounted) setAlanKisiSuggestions(defaults);
    })();
    return () => { mounted = false; };
  }, []);

  // On mount, fetch the next BelgeNo and ServisTakipNo and prefill the fields if empty
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [belgeRes, takipRes] = await Promise.all([
          serviceApi.getNextBelgeNo(),
          serviceApi.getNextTakipNo()
        ]);
        console.log('Auto numbers fetched:', { belgeRes, takipRes });
        if (mounted && belgeRes && takipRes) {
          const newBelgeNo = belgeRes.BelgeNo || belgeRes.belgeNo || '';
          const newTakipNo = takipRes.ServisTakipNo || takipRes.servisTakipNo || '';
          console.log('Setting auto numbers:', { newBelgeNo, newTakipNo });
          setYeniKayit(prev => ({ 
            ...prev, 
            belgeNo: newBelgeNo,
            servisTakipNo: newTakipNo
          }));
        }
      } catch (e) {
        // ignore - optional
        console.error('Could not fetch next numbers', e);
      }
    })();

    // fetch customers for the Firma İsmi datalist
    (async () => {
      setCustomersLoading(true);
      try {
        const res = await fetch('/api/customers');
        if (res.ok) {
          const data = await res.json();
          if (mounted) setCustomers(data || []);
        }
      } catch (err) {
        console.error('Could not load customers', err);
      } finally {
        if (mounted) setCustomersLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Close suggestion panels when clicking outside their containers using reusable hook
  useOutsideClick([suggestionsRef, customerRef], () => {
    try {
      setShowProductSuggestions(false);
      setShowCustomerSuggestions(false);
    } catch (e) {
      // ignore
    }
  });

  // If parent provided createRecord prop, use it; otherwise use local implementation
  const handleCreateRecord = props.createRecord ?? (async () => {
    try {
      setSubmitError('');
      setSubmitting(true);
      // map frontend keys (camelCase) to backend expected shape — backend is case-insensitive
      const payload = {
  servisTakipNo: yeniKayit.servisTakipNo,
        urunModeli: yeniKayit.urunModeli,
        firmaIsmi: yeniKayit.firmaIsmi,
        gelisTarihi: yeniKayit.gelisTarihi,
  // initial status when a record is created
  durum: 'Kayıt Açıldı',
        belgeNo: yeniKayit.belgeNo,
        alanKisi: yeniKayit.alanKisi,
        notlar: yeniKayit.notlar,
      };
      const created = await serviceApi.createServiceRecord(payload);
      // refresh parent list if available instead of navigating away
      try {
        await outlet.reloadServisKayitlari?.();
      } catch (e) {
        // ignore
      }
      // clear form and fetch new auto numbers for next entry
      const [nextBelge, nextTakip] = await Promise.all([
        serviceApi.getNextBelgeNo(),
        serviceApi.getNextTakipNo()
      ]);
      setYeniKayit({ 
        servisTakipNo: nextTakip?.ServisTakipNo || nextTakip?.servisTakipNo || '', 
        urunModeli: '', 
        firmaIsmi: '', 
        gelisTarihi: getDefaultDateTimeLocal(), 
        belgeNo: nextBelge?.BelgeNo || nextBelge?.belgeNo || '', 
        alanKisi: '', 
        notlar: '' 
      });
      // let the parent show a notification if provided, otherwise fallback to alert
      if (outlet.setNotification) {
        outlet.setNotification({ type: 'success', message: 'Kayıt oluşturuldu.' });
      } else {
        alert('Kayıt oluşturuldu.');
      }
      return created;
    } catch (err) {
      console.error('Create record failed', err);
      setSubmitError(err?.message || 'Kayıt oluşturulamadı');
      throw err;
    } finally {
      setSubmitting(false);
    }
  });

  // If no filteredProducts are provided via props, perform a local filtering based on the typed SKU/product
  const localFilteredProducts = (filteredProductsProp && filteredProductsProp.length > 0)
    ? filteredProductsProp
    : (yeniKayit.urunModeli
      ? products.filter((p) => ((p.sku || p.title || p.model || '') + '').toLowerCase().includes((yeniKayit.urunModeli + '').toLowerCase()))
      : products);
  return (
    <div className="bg-white shadow-xl rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">Yeni Servis Kaydı Oluştur</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          ["Servis Takip No", "servisTakipNo", "SN12345"],
          ["Firma İsmi", "firmaIsmi", "ACME Ltd."],
          ["Belge No", "belgeNo", "AUTO-0001"],
        ].map(([label, key, placeholder]) => {
          if (key === 'firmaIsmi') {
            const filteredCustomers = (yeniKayit.firmaIsmi ? customers.filter(c => (c.name || '').toLowerCase().includes((yeniKayit.firmaIsmi || '').toLowerCase())) : customers);
            return (
              <div className="form-control mb-6" key={key}>
                <label className="label text-sm font-semibold text-slate-700 mb-3">{label}:</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input input-bordered rounded-xl py-3 mt-2 w-full"
                    placeholder={placeholder}
                    value={yeniKayit.firmaIsmi}
                    onChange={(e) => { setYeniKayit({ ...yeniKayit, firmaIsmi: e.target.value }); setShowCustomerSuggestions(true); }}
                    onFocus={() => setShowCustomerSuggestions(true)}
                  />

                  {showCustomerSuggestions && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-56 overflow-auto">
                      {customersLoading && <div className="px-4 py-3 text-sm text-slate-500">Müşteriler yükleniyor...</div>}
                      {!customersLoading && filteredCustomers.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">Eşleşen müşteri bulunamadı.</div>}
                      {!customersLoading && filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setYeniKayit({ ...yeniKayit, firmaIsmi: c.name }); setShowCustomerSuggestions(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex flex-col"
                        >
                          <div className="flex items-center justify-between"><div className="font-medium text-slate-800">{c.name}</div><div className="text-xs text-slate-500">{c.id ? `#${c.id}` : ''}</div></div>
                          <div className="text-xs text-slate-500">{c.email || ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">Listeden seçebilir veya yeni bir müşteri adı yazabilirsiniz.</p>
              </div>
            );
          }
          return (
            <div className="form-control mb-6" key={key}>
              <label className="label text-sm font-semibold text-slate-700 mb-3">{label}:</label>
              <input type="text" className="input input-bordered rounded-xl py-3 mt-2" placeholder={placeholder} value={yeniKayit[key]} onChange={(e) => setYeniKayit({ ...yeniKayit, [key]: e.target.value })} />
            </div>
          );
        })}

        {/* Alan Kişi - suggestions (managed in Ayarlar) */}
        <div className="form-control mb-6">
          <label className="label text-sm font-semibold text-slate-700 mb-3">Alan Kişi:</label>
          <div className="flex items-center gap-2">
            <select className="select select-bordered rounded-xl py-3 mt-2 flex-1" value={yeniKayit.alanKisi} onChange={(e) => setYeniKayit({ ...yeniKayit, alanKisi: e.target.value })}>
              <option value="">-- Seçin --</option>
              {alanKisiSuggestions.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            <button title="Yönet" onClick={() => navigate('/settings/suggestions#alan')} className="btn btn-ghost btn-sm ml-1">⚙</button>
            <button title="Mevcut değeri önerilere ekle" onClick={() => {
              const val = (yeniKayit.alanKisi || '').trim();
              if (!val) return;
              const key = 'ts_alanKisi_suggestions';
              (async () => {
                try {
                  const res = await fetch(`/api/settings/suggestions/${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: val }) });
                  if (res.ok) {
                    const created = await res.json();
                    setAlanKisiSuggestions(prev => [created.value, ...prev.filter(x => x !== created.value)]);
                    return;
                  }
                } catch (e) { }
                // fallback
                const next = [val, ...alanKisiSuggestions.filter(x => x !== val)];
                try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { }
                setAlanKisiSuggestions(next);
              })();
            }} className="btn btn-sm">+Ekle</button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Listeden seçebilir veya yeni bir isim yazıp '+Ekle' ile önerilere ekleyebilirsiniz. Tam yönetim için <button className="link" onClick={() => navigate('/settings/suggestions#alan')}>Ayarlar</button>.</p>
        </div>

        <div className="form-control mb-6" ref={suggestionsRef}>
          <label className="label text-sm font-semibold text-slate-700 mb-3">Ürün (SKU):</label>
          <div className="relative">
            <input type="text" className="input input-bordered rounded-xl py-3 mt-2 w-full" placeholder="SKU veya ürün seçin" value={yeniKayit.urunModeli} onChange={(e) => { setYeniKayit({ ...yeniKayit, urunModeli: e.target.value }); setShowProductSuggestions(true); }} onFocus={() => setShowProductSuggestions(true)} />
            {showProductSuggestions && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-56 overflow-auto">
                {productsLoading && <div className="px-4 py-3 text-sm text-slate-500">Ürünler yükleniyor...</div>}
                {!productsLoading && localFilteredProducts.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">Eşleşen ürün bulunamadı.</div>}
                {!productsLoading && localFilteredProducts.map((p) => (
                  <button key={p.id || p.sku || JSON.stringify(p)} onClick={() => { setYeniKayit({ ...yeniKayit, urunModeli: p.sku || p.title || p.model || '' }); setShowProductSuggestions(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex flex-col">
                    <div className="flex items-center justify-between"><div className="font-medium text-slate-800">{p.sku || p.title || p.model || ''}</div><div className="text-xs text-slate-500">{p.id ? `#${p.id}` : ''}</div></div>
                    <div className="text-xs text-slate-500">{p.title || p.model || ''}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">Listeden seçebilir veya yeni bir SKU yazabilirsiniz.</p>
          <div className="text-xs text-slate-500 mt-1">{productsLoading ? 'Ürünler yükleniyor...' : (productsError ? productsError : (products.length ? `${products.length} ürün yüklendi` : ''))}</div>
        </div>

        <div className="form-control mb-6">
          <label className="label text-sm font-semibold text-slate-700 mb-3">Geliş Tarihi:</label>
          <input type="datetime-local" className="input input-bordered rounded-xl mt-2" value={yeniKayit.gelisTarihi} onChange={(e) => setYeniKayit({ ...yeniKayit, gelisTarihi: e.target.value })} />
        </div>
      </div>

      {/* Notlar - full width textarea */}
      <div className="form-control mb-6">
        <label className="label text-sm font-semibold text-slate-700 mb-3">Notlar (İsteğe Bağlı):</label>
        <textarea 
          className="textarea textarea-bordered rounded-xl mt-2 min-h-[100px]" 
          placeholder="Bu kayıtla ilgili özel notlar, talepler veya açıklamalar..."
          value={yeniKayit.notlar}
          onChange={(e) => setYeniKayit({ ...yeniKayit, notlar: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2 mt-8">
        {submitError && <div className="text-sm text-red-600">{submitError}</div>}
        <div className="flex justify-end gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition">İptal</button>
          <button onClick={handleCreateRecord} disabled={submitting} className={`px-5 py-2.5 rounded-xl text-white font-semibold shadow-md transition ${submitting ? 'bg-slate-400 cursor-wait' : 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:opacity-90'}`}>{submitting ? 'Kaydediliyor...' : 'Kayıt Oluştur'}</button>
        </div>
      </div>
    </div>
  );
}
