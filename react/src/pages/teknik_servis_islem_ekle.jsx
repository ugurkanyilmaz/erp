import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import serviceApi from '../hooks/serviceApi';

export default function IslemEkle(props) {
  const outlet = useOutletContext?.() ?? {};
  const [localSelectedRecordId, setLocalSelectedRecordId] = useState('');
  const [localYeniParca, setLocalYeniParca] = useState({ partName: '', quantity: 1 });
  const [localIslemEkleme, setLocalIslemEkleme] = useState({ islemBitisTarihi: '', yapanKisi: '', changedParts: [], serviceItems: [] });

  const selectedRecordId = props.selectedRecordId ?? localSelectedRecordId;
  const setSelectedRecordId = props.setSelectedRecordId ?? setLocalSelectedRecordId;
  const servisKayitlari = props.servisKayitlari ?? outlet.servisKayitlari ?? [];
  const islemEkleme = props.islemEkleme ?? localIslemEkleme;
  const setIslemEkleme = props.setIslemEkleme ?? setLocalIslemEkleme;
  const yeniParca = props.yeniParca ?? localYeniParca;
  const setYeniParca = props.setYeniParca ?? setLocalYeniParca;
  // local handlers for adding/removing changed parts when parent doesn't provide handlers
  const localParcaEkle = () => {
    if (!selectedRecordId) return;
    if (!yeniParca || !yeniParca.partName || yeniParca.partName.trim() === '') return;
    setIslemEkleme((prev) => ({
      ...prev,
      changedParts: [...(prev.changedParts || []), { partName: yeniParca.partName.trim(), quantity: yeniParca.quantity || 1 }],
    }));
    // reset input
    setYeniParca({ partName: '', quantity: 1 });
  };

  const localParcaSil = (idx) => {
    setIslemEkleme((prev) => ({
      ...prev,
      changedParts: (prev.changedParts || []).filter((_, i) => i !== idx),
    }));
  };

  const parcaEkle = props.parcaEkle ?? localParcaEkle;
  const parcaSil = props.parcaSil ?? localParcaSil;
  // local service (hizmet) input state
  const [localHizmetName, setLocalHizmetName] = useState('');

  // Add part modal state
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [addPartMode, setAddPartMode] = useState('independent');
  const [addPartProductId, setAddPartProductId] = useState(null);
  const [addPartName, setAddPartName] = useState('');
  const [addPartQuantity, setAddPartQuantity] = useState(1);

  // Quick selectable suggestions for hizmet (but still editable)
  const HIZMET_SUGGESTIONS = [
    'Servis kiti',
    'Yağ değişimi',
    'Elektrikli Bakım',
    'Havalı Bakım',
  ];
  const [showHizmetSuggestions, setShowHizmetSuggestions] = useState(false);
  const hizmetRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!hizmetRef.current) return;
      if (!hizmetRef.current.contains(e.target)) setShowHizmetSuggestions(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Define local handlers for hizmetEkle/hizmetSil and prefer props if provided
  const localHizmetEkle = () => {
    if (!selectedRecordId) return;
    if (!localHizmetName || localHizmetName.trim() === '') return;
    setIslemEkleme((prev) => ({
      ...prev,
      serviceItems: [...(prev.serviceItems || []), { id: Date.now(), name: localHizmetName.trim(), price: 0 }],
    }));
    setLocalHizmetName('');
  };

  const localHizmetSil = (idx) => {
    setIslemEkleme((prev) => ({
      ...prev,
      serviceItems: (prev.serviceItems || []).filter((_, i) => i !== idx),
    }));
  };

  const hizmetEkle = props.hizmetEkle ?? localHizmetEkle;
  const hizmetSil = props.hizmetSil ?? localHizmetSil;
  const spareParts = props.spareParts ?? [];
  const sparePartsLoading = props.sparePartsLoading ?? outlet.sparePartsLoading ?? false;
  const sparePartsError = props.sparePartsError ?? outlet.sparePartsError ?? '';
  const createOperation = props.createOperation ?? (async (recordId) => {
    if (!recordId) return;
    try {
      const payload = {
        // if user didn't provide a timestamp, set current ISO timestamp so we know when the operation happened
        islemBitisTarihi: islemEkleme.islemBitisTarihi || new Date().toISOString(),
        yapanKisi: islemEkleme.yapanKisi || null,
        changedParts: (islemEkleme.changedParts || []).map((p) => ({ partName: p.partName || p.partName, quantity: p.quantity || p.quantity })),
        serviceItems: (islemEkleme.serviceItems || []).map((s) => ({ name: s.name || s.name, price: s.price || 0 })),
      };

      // Call backend
      await serviceApi.createServiceOperation(recordId, payload);

      // refresh list if wrapper provided
      try { await outlet.reloadServisKayitlari?.(); } catch (e) { /* ignore */ }

      // refresh existing operations preview for this record so the newly added operation (with timestamp) is visible
      try {
        const ops = await serviceApi.getServiceOperations(recordId);
        setExistingOperations(ops || []);
      } catch (e) {
        // ignore - preview refresh isn't critical
      }

      // clear local inputs
      setIslemEkleme({ islemBitisTarihi: '', yapanKisi: '', changedParts: [], serviceItems: [] });
      try { outlet.setNotification?.({ type: 'success', message: 'İşlem kaydedildi' }); } catch (e) { alert('İşlem kaydedildi'); }
    } catch (err) {
      console.error('Could not create operation', err);
      try { outlet.setNotification?.({ type: 'error', message: 'İşlem kaydedilirken hata oluştu: ' + (err?.message || 'Hata') }); } catch (e) { alert('İşlem kaydedilirken hata oluştu: ' + (err?.message || 'Hata')); }
    }
  });

  // If products/spareParts come from Outlet context (wrapper), prefer those
  const products = props.products ?? outlet.products ?? [];
  const sparePartsFromOutlet = props.spareParts ?? outlet.spareParts ?? spareParts;

  // determine selected record and associated product id (via SKU)
  const selectedRecord = servisKayitlari.find((r) => `${r.id}` === `${selectedRecordId}`) || null;
  const selectedProduct = products.find((p) => (p.sku || '').toLowerCase() === ((selectedRecord?.urunModeli || '') + '').toLowerCase());
  const selectedProductId = selectedProduct?.id ?? null;

  const filteredSpareParts = selectedProductId ? sparePartsFromOutlet.filter((s) => `${s.productId}` == `${selectedProductId}`) : [];

  // Load existing operations when a record is selected
  const [existingOperations, setExistingOperations] = useState([]);
  const [existingOpsLoading, setExistingOpsLoading] = useState(false);
  const [existingOpsError, setExistingOpsError] = useState('');

  React.useEffect(() => {
    let mounted = true;
    if (!selectedRecordId) {
      setExistingOperations([]);
      setExistingOpsError('');
      return;
    }
    setExistingOpsLoading(true);
    setExistingOpsError('');
    serviceApi.getServiceOperations(selectedRecordId)
      .then((ops) => { if (!mounted) return; setExistingOperations(ops || []); })
      .catch((err) => { if (!mounted) return; console.error('Could not load existing operations', err); setExistingOpsError(err?.message || 'İşlemler yüklenemedi'); setExistingOperations([]); })
      .finally(() => { if (!mounted) setExistingOpsLoading(false); else setExistingOpsLoading(false); });
    return () => { mounted = false; };
  }, [selectedRecordId]);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-xl rounded-2xl p-6">
        <h4 className="text-md font-semibold text-slate-800 mb-3">Kayıt Seç</h4>
        <select className="select select-bordered w-full" value={selectedRecordId} onChange={(e) => setSelectedRecordId(e.target.value)}>
          <option value="">-- Bir kayıt seçin --</option>
          {servisKayitlari.map((r) => (<option key={r.id} value={r.id}>{r.seriNo} — {r.firmaIsmi} — {r.urunModeli}</option>))}
        </select>
        {!selectedRecordId && <p className="text-sm text-slate-500 mt-2">İşlem eklemek için önce bir kayıt seçin.</p>}
        {/* Existing operations preview */}
        {selectedRecordId && (
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">Önceki İşlemler</div>
            {existingOpsLoading && <div className="text-sm text-slate-500">İşlemler yükleniyor...</div>}
            {existingOpsError && <div className="text-sm text-rose-600">{existingOpsError}</div>}
            {!existingOpsLoading && existingOperations.length === 0 && <div className="text-xs text-slate-500">Bu kayıt için önceki işlem bulunamadı.</div>}
            {!existingOpsLoading && existingOperations.map((op) => (
              <div key={op.id} className="border rounded-md p-2 mb-2 bg-slate-50">
                <div className="text-sm font-medium">İşlem #{op.id} — {op.yapanKisi || '-'} — {op.islemBitisTarihi || '-'}</div>
                <div className="text-xs mt-1">
                  {op.changedParts && op.changedParts.length > 0 ? (
                    <div className="mb-1">Parçalar: {op.changedParts.map((p) => `${p.partName}(${p.quantity})`).join(', ')}</div>
                  ) : <div className="text-xs text-slate-500">Parça yok</div>}
                  {op.serviceItems && op.serviceItems.length > 0 ? (
                    <div>Hizmetler: {op.serviceItems.map((s) => s.name).join(', ')}</div>
                  ) : <div className="text-xs text-slate-500">Hizmet yok</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-xl rounded-2xl p-6">
          <h4 className="text-md font-semibold text-slate-800 mb-4">Değişen Parçalar</h4>

          <div className="flex gap-3 mb-4">
            {sparePartsLoading ? (
              <div className="input input-bordered flex-1 rounded-xl flex items-center">Yükleniyor...</div>
            ) : (filteredSpareParts && filteredSpareParts.length > 0) ? (
              <select className="select select-bordered flex-1 rounded-xl" value={yeniParca.partName} onChange={(e) => setYeniParca({ ...yeniParca, partName: e.target.value })} disabled={!selectedRecordId}>
                <option value="">-- Parça seçin --</option>
                {filteredSpareParts.map(sp => (<option key={sp.id} value={sp.parcaNo || sp.partNumber || sp.parcaNo}>{sp.parcaNo}{sp.title ? ` — ${sp.title}` : ''}</option>))}
              </select>
            ) : (
              <input type="text" placeholder={selectedRecordId ? "Parça adı (manuel)" : "Önce kayıt seçin"} className="input input-bordered flex-1 rounded-xl" value={yeniParca.partName} onChange={(e) => setYeniParca({ ...yeniParca, partName: e.target.value })} disabled={!selectedRecordId} />
            )}

            <input type="number" min={1} className="input input-bordered w-28 rounded-xl" value={yeniParca.quantity} onChange={(e) => setYeniParca({ ...yeniParca, quantity: Number(e.target.value) })} />
            <button onClick={parcaEkle} className="btn btn-primary" disabled={!selectedRecordId}>Ekle</button>

            <div className="flex-0">
              <button className="btn btn-outline" onClick={() => setShowAddPartModal(true)} disabled={!selectedRecordId}>
                Farklı parça ekle
              </button>
            </div>
          </div>

          {sparePartsError && <div className="text-xs text-rose-600 mt-1">{sparePartsError}</div>}

          <ul className="divide-y">
            {islemEkleme.changedParts.length === 0 && <li className="text-sm text-slate-500 py-2">Henüz parça eklenmedi.</li>}
            {islemEkleme.changedParts.map((p, idx) => (
              <li key={idx} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{p.partName}{p.productId ? ` (Ürün #${p.productId})` : ''}</div>
                  <div className="text-xs text-slate-500">Adet: {p.quantity}</div>
                </div>
                <div><button onClick={() => parcaSil(idx)} className="btn btn-ghost btn-sm">Sil</button></div>
              </li>
            ))}
          </ul>

          {/* Add Part Modal */}
          {showAddPartModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Yeni Parça Ekle</h3>

                <div className="mb-4">
                  <label className="label"><span className="label-text font-semibold">Tip</span></label>
                  <div className="flex gap-4">
                    <label className={`btn ${addPartMode === 'independent' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAddPartMode('independent')}>Bağımsız Parça</label>
                    <label className={`btn ${addPartMode === 'linked' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAddPartMode('linked')}>Başka Ürünün Parçası</label>
                  </div>
                </div>

                {addPartMode === 'linked' && (
                  <div className="form-control mb-4">
                    <label className="label"><span className="label-text font-semibold">Ürün seç</span></label>
                    <select className="select select-bordered" value={addPartProductId ?? ''} onChange={(e) => setAddPartProductId(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">-- Ürün seçin --</option>
                      {products.map(p => (<option key={p.id} value={p.id}>{p.sku || p.title || `#${p.id}`}</option>))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                      <label className="label"><span className="label-text">Parça adı</span></label>
                      {addPartMode === 'linked' ? (
                        addPartProductId ? (
                          (() => {
                            const productParts = sparePartsFromOutlet.filter(s => `${s.productId}` === `${addPartProductId}`);
                            return productParts && productParts.length > 0 ? (
                              <select className="select select-bordered" value={addPartName} onChange={(e) => setAddPartName(e.target.value)}>
                                <option value="">-- Parça seçin --</option>
                                {productParts.map(sp => (
                                  <option key={sp.id} value={sp.parcaNo || sp.partNumber || sp.title || sp.id}>{sp.parcaNo}{sp.title ? ` — ${sp.title}` : ''}</option>
                                ))}
                              </select>
                            ) : (
                              <input type="text" className="input input-bordered" value={addPartName} onChange={(e) => setAddPartName(e.target.value)} placeholder="Bu ürün için kayıtlı parça yok, manuel girin" />
                            );
                          })()
                        ) : (
                          <input type="text" className="input input-bordered" value={addPartName} onChange={(e) => setAddPartName(e.target.value)} placeholder="Önce ürün seçin" disabled />
                        )
                      ) : (
                        (() => {
                          const independentParts = sparePartsFromOutlet.filter(s => !s.productId);
                          return independentParts && independentParts.length > 0 ? (
                            <select className="select select-bordered" value={addPartName} onChange={(e) => setAddPartName(e.target.value)}>
                              <option value="">-- Parça seçin --</option>
                              {independentParts.map(sp => (
                                <option key={sp.id} value={sp.parcaNo || sp.partNumber || sp.title || sp.id}>{sp.parcaNo || sp.title}{sp.title ? ` — ${sp.title}` : ''}</option>
                              ))}
                            </select>
                          ) : (
                            <input type="text" className="input input-bordered" value={addPartName} onChange={(e) => setAddPartName(e.target.value)} placeholder="Parça adı" />
                          );
                        })()
                      )}
                    </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Adet</span></label>
                    <input type="number" min={1} className="input input-bordered" value={addPartQuantity} onChange={(e) => setAddPartQuantity(Number(e.target.value))} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200" onClick={() => setShowAddPartModal(false)}>İptal</button>
                  <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white" onClick={() => {
                    // build part object and add
                    const name = addPartName || (addPartMode === 'linked' && addPartProductId ? `ÜrünParça-${addPartProductId}` : 'Parça');
                    const newPart = { partName: name, quantity: addPartQuantity || 1 };
                    if (addPartMode === 'linked' && addPartProductId) newPart.productId = addPartProductId;
                    setIslemEkleme(prev => ({ ...prev, changedParts: [...(prev.changedParts || []), newPart] }));
                    // reset and close
                    setAddPartName(''); setAddPartQuantity(1); setAddPartProductId(null); setAddPartMode('independent'); setShowAddPartModal(false);
                  }}>Ekle</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-6">
          <h4 className="text-md font-semibold text-slate-800 mb-4">Hizmetler</h4>
          <div className="flex gap-3 mb-4" ref={hizmetRef}>
            {/* Editable input that visually matches select style; clicking the chevron opens suggestion list */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={selectedRecordId ? 'Hizmet adı' : 'Önce kayıt seçin'}
                className={`input input-bordered w-full rounded-xl ${!selectedRecordId ? 'bg-slate-100' : ''}`}
                value={localHizmetName}
                onChange={(e) => { setLocalHizmetName(e.target.value); setShowHizmetSuggestions(true); }}
                onFocus={() => { if (selectedRecordId) setShowHizmetSuggestions(true); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); hizmetEkle(); setShowHizmetSuggestions(false); } }}
                disabled={!selectedRecordId}
              />

              {/* dropdown panel styled like other dropdowns */}
              {showHizmetSuggestions && (
                <ul className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-auto z-50">
                  {HIZMET_SUGGESTIONS.filter(h => (localHizmetName ? h.toLowerCase().includes(localHizmetName.toLowerCase()) : true)).map((h) => (
                    <li
                      key={h}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                      onMouseDown={(ev) => { ev.preventDefault(); setLocalHizmetName(h); setShowHizmetSuggestions(false); }}
                    >
                      {h}
                    </li>
                  ))}
                  {HIZMET_SUGGESTIONS.filter(h => (localHizmetName ? h.toLowerCase().includes(localHizmetName.toLowerCase()) : true)).length === 0 && (
                    <li className="px-4 py-2 text-slate-500 text-sm">Eşleşen öneri yok</li>
                  )}
                </ul>
              )}
            </div>

            <button onClick={() => { hizmetEkle(); setShowHizmetSuggestions(false); }} className="btn btn-primary" disabled={!selectedRecordId || !localHizmetName.trim()}>Ekle</button>
          </div>
          <ul className="divide-y">
            {islemEkleme.serviceItems.length === 0 && <li className="text-sm text-slate-500 py-2">Henüz hizmet eklenmedi.</li>}
            {islemEkleme.serviceItems.map((s, idx) => (
              <li key={idx} className="flex items-center justify-between py-2">
                <div><div className="font-medium">{s.name}</div></div>
                <div className="flex items-center gap-2"><button onClick={() => hizmetSil(idx)} className="btn btn-ghost btn-sm">Sil</button></div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button onClick={async () => { if (selectedRecordId) await createOperation(selectedRecordId); }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-md hover:opacity-90 transition" disabled={!selectedRecordId}>Kaydet (İşlem Ekle)</button>
      </div>
    </div>
  );
}
