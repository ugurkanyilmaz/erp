import React, { useState, useRef } from 'react';
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
  const [localYeniKayit, setLocalYeniKayit] = useState({
    seriNo: '',
    urunModeli: '',
    firmaIsmi: '',
    gelisTarihi: getDefaultDateTimeLocal(),
    belgeNo: '',
    alanKisi: '',
  });

  const yeniKayit = props.yeniKayit ?? localYeniKayit;
  const setYeniKayit = props.setYeniKayit ?? setLocalYeniKayit;
  // Prefer props, then Outlet context (from wrapper), then local defaults
  const outlet = useOutletContext?.() ?? {};
  const products = props.products ?? outlet.products ?? [];
  const productsLoading = props.productsLoading ?? outlet.productsLoading ?? false;
  const productsError = props.productsError ?? outlet.productsError ?? '';
  const filteredProductsProp = props.filteredProducts ?? outlet.filteredProducts ?? [];

  const localSuggestionsRef = useRef(null);
  const suggestionsRef = props.suggestionsRef ?? outlet.suggestionsRef ?? localSuggestionsRef;

  const [localShowSuggestions, setLocalShowSuggestions] = useState(false);
  const showProductSuggestions = props.showProductSuggestions ?? outlet.showProductSuggestions ?? localShowSuggestions;
  const setShowProductSuggestions = props.setShowProductSuggestions ?? outlet.setShowProductSuggestions ?? setLocalShowSuggestions;
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // If parent provided createRecord prop, use it; otherwise use local implementation
  const handleCreateRecord = props.createRecord ?? (async () => {
    try {
      setSubmitError('');
      setSubmitting(true);
      // map frontend keys (camelCase) to backend expected shape — backend is case-insensitive
      const payload = {
        seriNo: yeniKayit.seriNo,
        urunModeli: yeniKayit.urunModeli,
        firmaIsmi: yeniKayit.firmaIsmi,
        gelisTarihi: yeniKayit.gelisTarihi,
  // initial status when a record is created
  durum: 'Kayıt Açıldı',
        belgeNo: yeniKayit.belgeNo,
        alanKisi: yeniKayit.alanKisi,
      };
      const created = await serviceApi.createServiceRecord(payload);
      // refresh parent list if available instead of navigating away
      try {
        await outlet.reloadServisKayitlari?.();
      } catch (e) {
        // ignore
      }
      // clear form for next entry
      setYeniKayit({ seriNo: '', urunModeli: '', firmaIsmi: '', gelisTarihi: getDefaultDateTimeLocal(), belgeNo: '', alanKisi: '' });
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
          ["Seri No", "seriNo", "SN12345"],
          ["Firma İsmi", "firmaIsmi", "ACME Ltd."],
          ["Belge No", "belgeNo", "AUTO-0001"],
          ["Alan Kişi", "alanKisi", "Ahmet"],
        ].map(([label, key, placeholder]) => (
          <div className="form-control mb-6" key={key}>
            <label className="label text-sm font-semibold text-slate-700 mb-3">{label}:</label>
            <input type="text" className="input input-bordered rounded-xl py-3 mt-2" placeholder={placeholder} value={yeniKayit[key]} onChange={(e) => setYeniKayit({ ...yeniKayit, [key]: e.target.value })} />
          </div>
        ))}

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
