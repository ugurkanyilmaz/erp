import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import serviceApi from '../hooks/serviceApi';
import { QRCodeSVG } from 'qrcode.react';

export default function IslemEkle(props) {
  const outlet = useOutletContext?.() ?? {};
  const [localSelectedRecordId, setLocalSelectedRecordId] = useState('');
  const [localYeniParca, setLocalYeniParca] = useState({ partName: '', quantity: 1 });
  const [localIslemEkleme, setLocalIslemEkleme] = useState({ islemBitisTarihi: '', yapanKisi: '', changedParts: [], serviceItems: [] });
  // yapan kişi fields: two fields (dropdown or free-text). consumers may provide 'people' via props or outlet
  const peopleOptions = props.people ?? outlet.people ?? ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma'];
  const [yapan1, setYapan1] = useState('');
  const [yapan1Other, setYapan1Other] = useState('');
  const [yapan2, setYapan2] = useState('');
  const [yapan2Other, setYapan2Other] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

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
      // build yapanKisi string from up to two fields (dropdown or other). join non-empty parts with comma
      const yapans = [];
      if (yapan1 && yapan1 !== 'other') yapans.push(yapan1);
      if (yapan1 === 'other' && yapan1Other) yapans.push(yapan1Other);
      if (yapan2 && yapan2 !== 'other') yapans.push(yapan2);
      if (yapan2 === 'other' && yapan2Other) yapans.push(yapan2Other);

      const payload = {
        // if user didn't provide a timestamp, set current ISO timestamp so we know when the operation happened
        islemBitisTarihi: islemEkleme.islemBitisTarihi || new Date().toISOString(),
        yapanKisi: yapans.length > 0 ? yapans.join(', ') : (islemEkleme.yapanKisi || null),
        changedParts: (islemEkleme.changedParts || []).map((p) => ({ partName: p.partName || p.partName, quantity: p.quantity || p.quantity })),
        serviceItems: (islemEkleme.serviceItems || []).map((s) => ({ name: s.name || s.name, price: s.price || 0 })),
      };

      // Call backend: create operation first
      const createdOp = await serviceApi.createServiceOperation(recordId, payload);

      // If photo files were selected, upload them to the service record (max 7)
      if (photoFiles && photoFiles.length > 0) {
        try {
          const fd = new FormData();
          for (const f of photoFiles.slice(0, 7)) {
            fd.append('files', f, f.name);
          }
          await serviceApi.uploadServiceRecordPhotos(recordId, fd);
          // refresh photos for the record so newly uploaded images appear immediately
          try {
            const photos = await serviceApi.getServiceRecordPhotos(recordId);
            setRecordPhotos(photos || []);
          } catch (phErr) {
            console.warn('Fotoğraflar yüklenip getirilemedi', phErr);
          }
        } catch (upErr) {
          console.warn('Fotoğraf yüklenemedi', upErr);
          try { outlet.setNotification?.({ type: 'warning', message: 'Fotoğraf yüklenirken hata oluştu.' }); } catch (e) { /* ignore */ }
        }
      }

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
  setYapan1(''); setYapan1Other(''); setYapan2(''); setYapan2Other(''); setPhotoFiles([]); setPhotoError('');
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

  // helper to format a changed part label. If part is linked to another product (productId present),
  // display: "<PRODUCT_LABEL> ürünün <PART_LABEL> nolu parçası". Otherwise show raw partName.
  const formatPartLabel = (part) => {
    try {
      const pid = part?.productId ?? part?.productId;
      if (pid) {
        const prod = products.find(p => `${p.id}` === `${pid}`);
        const prodLabel = prod ? (prod.sku || prod.title || `#${prod.id}`) : `#${pid}`;
        // try to find spare part record for a nicer part label
        const sp = sparePartsFromOutlet.find(s => `${s.productId}` === `${pid}` && (
          (s.parcaNo && s.parcaNo === part.partName) ||
          (s.partNumber && s.partNumber === part.partName) ||
          (s.title && s.title === part.partName) ||
          (`${s.id}` === `${part.partName}`)
        ));
        const partLabel = sp ? (sp.parcaNo || sp.partNumber || sp.title || `${sp.id}`) : (part.partName || 'Parça');
        return `${prodLabel} ürünün ${partLabel} nolu parçası`;
      }
    } catch (e) {
      // fallback to simple name
    }
    return part?.partName || part?.title || 'Parça';
  };

  // Load existing operations when a record is selected
  const [existingOperations, setExistingOperations] = useState([]);
  const [existingOpsLoading, setExistingOpsLoading] = useState(false);
  const [existingOpsError, setExistingOpsError] = useState('');
  // Photos for the selected service record
  const [recordPhotos, setRecordPhotos] = useState([]);
  const [recordPhotosLoading, setRecordPhotosLoading] = useState(false);
  const [recordPhotosError, setRecordPhotosError] = useState('');

  React.useEffect(() => {
    let mounted = true;
    if (!selectedRecordId) {
      setExistingOperations([]);
      setExistingOpsError('');
      setRecordPhotos([]);
      setRecordPhotosError('');
      return;
    }
    setExistingOpsLoading(true);
    setExistingOpsError('');
    serviceApi.getServiceOperations(selectedRecordId)
      .then((ops) => { if (!mounted) return; setExistingOperations(ops || []); })
      .catch((err) => { if (!mounted) return; console.error('Could not load existing operations', err); setExistingOpsError(err?.message || 'İşlemler yüklenemedi'); setExistingOperations([]); })
      .finally(() => { if (!mounted) setExistingOpsLoading(false); else setExistingOpsLoading(false); });
    // fetch photos for this record as well
    setRecordPhotosLoading(true);
    setRecordPhotosError('');
    serviceApi.getServiceRecordPhotos(selectedRecordId)
      .then((photos) => { if (!mounted) return; setRecordPhotos(photos || []); })
      .catch((err) => { if (!mounted) return; console.error('Could not load record photos', err); setRecordPhotosError(err?.message || 'Fotoğraflar yüklenemedi'); setRecordPhotos([]); })
      .finally(() => { if (!mounted) setRecordPhotosLoading(false); else setRecordPhotosLoading(false); });
    return () => { mounted = false; };
  }, [selectedRecordId]);

  // Auto-refresh photos every 3 seconds when a record is selected (so mobile uploads appear instantly on PC)
  React.useEffect(() => {
    let mounted = true;
    let interval = null;
    
    if (selectedRecordId) {
      interval = setInterval(async () => {
        if (!mounted) return;
        try {
          const photos = await serviceApi.getServiceRecordPhotos(selectedRecordId);
          if (!mounted) return;
          // Only update if count changed (to avoid unnecessary re-renders)
          setRecordPhotos((prev) => {
            if (prev.length !== photos.length) {
              // Show a brief notification or just update silently
              try {
                outlet.setNotification?.({ type: 'info', message: `Fotoğraflar güncellendi (${photos.length})` });
              } catch (e) { /* ignore */ }
              return photos || [];
            }
            return prev;
          });
        } catch (err) {
          // ignore polling errors silently (don't spam user)
          console.warn('Photo polling error', err);
        }
      }, 3000); // poll every 3 seconds
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [selectedRecordId, outlet]);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-xl rounded-2xl p-6">
        <h4 className="text-md font-semibold text-slate-800 mb-3">Kayıt Seç</h4>
        <select className="select select-bordered w-full" value={selectedRecordId} onChange={(e) => setSelectedRecordId(e.target.value)}>
          <option value="">-- Bir kayıt seçin --</option>
          {servisKayitlari.map((r) => (<option key={r.id} value={r.id}>{r.servisTakipNo || r.seriNo} — {r.firmaIsmi} — {r.urunModeli}</option>))}
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
                    <div className="mb-1">Parçalar: {op.changedParts.map((p) => `${formatPartLabel(p)} (${p.quantity})`).join(', ')}</div>
                  ) : <div className="text-xs text-slate-500">Parça yok</div>}
                  {op.serviceItems && op.serviceItems.length > 0 ? (
                    <div>Hizmetler: {op.serviceItems.map((s) => s.name).join(', ')}</div>
                  ) : <div className="text-xs text-slate-500">Hizmet yok</div>}
                </div>
              </div>
            ))}
            {/* Record photos preview */}
            <div className="mt-3">
              <div className="text-sm font-semibold mb-2">Kayıt Fotoğrafları</div>
              {recordPhotosLoading && <div className="text-xs text-slate-500">Fotoğraflar yükleniyor...</div>}
              {recordPhotosError && <div className="text-xs text-rose-600">{recordPhotosError}</div>}
              {!recordPhotosLoading && recordPhotos.length === 0 && (
                <div className="text-xs text-slate-500">Bu kayıt için fotoğraf bulunmuyor.</div>
              )}
              {!recordPhotosLoading && recordPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {recordPhotos.map((p) => {
                    const url = p.url || p.Url || p.Url || p.url;
                    return (
                      <a key={p.id} href={url} target="_blank" rel="noreferrer" className="block">
                        <img src={url} alt={"foto-" + p.id} className="object-cover w-24 h-24 rounded-md border" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
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
              (() => {
                // If product-specific parts exist, render an editable input with datalist so user can type or pick
                if (filteredSpareParts && filteredSpareParts.length > 0) {
                  return (
                    <div className="flex-1">
                      <div className="relative">
                        <div className="select select-bordered flex items-center rounded-xl px-3">
                          <input
                            list={`product-${selectedProductId}-parts-list`}
                            placeholder={selectedRecordId ? "Parça adı veya seçin" : "Önce kayıt seçin"}
                            className="flex-1 bg-transparent border-0 outline-none py-2"
                            value={yeniParca.partName}
                            onChange={(e) => setYeniParca({ ...yeniParca, partName: e.target.value })}
                            disabled={!selectedRecordId}
                          />
                          <svg className="w-4 h-4 text-slate-500 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <datalist id={`product-${selectedProductId}-parts-list`}>
                          {filteredSpareParts.map(sp => (
                            <option key={sp.id} value={sp.parcaNo || sp.partNumber || sp.title || sp.id} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  );
                }

                const independentParts = sparePartsFromOutlet.filter(s => !s.productId);
                if (independentParts && independentParts.length > 0) {
                  return (
                    <div className="flex-1">
                      <div className="relative">
                        <div className="select select-bordered flex items-center rounded-xl px-3">
                          <input
                            list="independent-parts-list"
                            placeholder={selectedRecordId ? "Parça adı veya seçin" : "Önce kayıt seçin"}
                            className="flex-1 bg-transparent border-0 outline-none py-2"
                            value={yeniParca.partName}
                            onChange={(e) => setYeniParca({ ...yeniParca, partName: e.target.value })}
                            disabled={!selectedRecordId}
                          />
                          <svg className="w-4 h-4 text-slate-500 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <datalist id="independent-parts-list">
                          {independentParts.map(sp => (
                            <option key={sp.id} value={sp.parcaNo || sp.title || sp.partNumber || sp.id} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  );
                }

                // no independent parts list available -> fallback to free text
                return (
                  <input type="text" placeholder={selectedRecordId ? "Parça adı (manuel)" : "Önce kayıt seçin"} className="input input-bordered flex-1 rounded-xl" value={yeniParca.partName} onChange={(e) => setYeniParca({ ...yeniParca, partName: e.target.value })} disabled={!selectedRecordId} />
                );
              })()
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
                  <div className="font-medium">{p.productId ? formatPartLabel(p) : p.partName}</div>
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
                                <div>
                                  <div className="relative">
                                    <div className="select select-bordered flex items-center rounded-xl px-3">
                                      <input
                                        list={`product-${addPartProductId}-parts-list`}
                                        className="flex-1 bg-transparent border-0 outline-none py-2"
                                        value={addPartName}
                                        onChange={(e) => setAddPartName(e.target.value)}
                                        placeholder="Parça seçin veya yazın"
                                      />
                                      <svg className="w-4 h-4 text-slate-500 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                    <datalist id={`product-${addPartProductId}-parts-list`}>
                                      {productParts.map(sp => (
                                        <option key={sp.id} value={sp.parcaNo || sp.partNumber || sp.title || sp.id} />
                                      ))}
                                    </datalist>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <div className="select select-bordered flex items-center rounded-xl px-3">
                                    <input type="text" className="flex-1 bg-transparent border-0 outline-none py-2" value={addPartName} onChange={(e) => setAddPartName(e.target.value)} placeholder="Bu ürün için kayıtlı parça yok, manuel girin" />
                                    <svg className="w-4 h-4 text-slate-500 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </div>
                                </div>
                              );
                          })()
                        ) : (
                          <input type="text" className="input input-bordered" value={addPartName} onChange={(e) => setAddPartName(e.target.value)} placeholder="Önce ürün seçin" disabled />
                        )
                      ) : (
                        (() => {
                          const independentParts = sparePartsFromOutlet.filter(s => !s.productId);
                          return independentParts && independentParts.length > 0 ? (
                            <div>
                              <div className="relative">
                                <div className="select select-bordered flex items-center rounded-xl px-3">
                                  <input
                                    list="independent-parts-list"
                                    className="flex-1 bg-transparent border-0 outline-none py-2"
                                    value={addPartName}
                                    onChange={(e) => setAddPartName(e.target.value)}
                                    placeholder="Parça seçin veya yazın"
                                  />
                                  <svg className="w-4 h-4 text-slate-500 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                                <datalist id="independent-parts-list">
                                  {independentParts.map(sp => (
                                    <option key={sp.id} value={sp.parcaNo || sp.partNumber || sp.title || sp.id} />
                                  ))}
                                </datalist>
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="select select-bordered flex items-center rounded-xl px-3">
                                <input type="text" className="flex-1 bg-transparent border-0 outline-none py-2" value={addPartName} onChange={(e) => setAddPartName(e.target.value)} placeholder="Parça adı" />
                                <svg className="w-4 h-4 text-slate-500 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </div>
                            </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        <div className="bg-white shadow-xl rounded-2xl p-6">
          <h4 className="text-md font-semibold text-slate-800 mb-3">Yapan Kişiler</h4>
          <p className="text-xs text-slate-500 mb-3">İşlemi gerçekleştiren kişileri seçin. İsterseniz "Diğer" seçeneği ile serbest metin girebilirsiniz.</p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="label"><span className="label-text">Yapan Kişi 1</span></label>
              <div className="flex gap-2">
                <select className="select select-bordered flex-1" value={yapan1} onChange={(e) => setYapan1(e.target.value)} disabled={!selectedRecordId}>
                  <option value="">-- Seçin --</option>
                  {peopleOptions.slice(0,4).map((p) => (<option key={p} value={p}>{p}</option>))}
                  <option value="other">Diğer (yaz)</option>
                </select>
              </div>
              {yapan1 === 'other' && (
                <input type="text" className="input input-bordered mt-2" placeholder="Diğer kişi adı" value={yapan1Other} onChange={(e) => setYapan1Other(e.target.value)} />
              )}
            </div>

            <div>
              <label className="label"><span className="label-text">Yapan Kişi 2 (opsiyonel)</span></label>
              <div className="flex gap-2">
                <select className="select select-bordered flex-1" value={yapan2} onChange={(e) => setYapan2(e.target.value)} disabled={!selectedRecordId}>
                  <option value="">-- Seçin --</option>
                  {peopleOptions.slice(0,4).map((p) => (<option key={p+"2"} value={p}>{p}</option>))}
                  <option value="other">Diğer (yaz)</option>
                </select>
              </div>
              {yapan2 === 'other' && (
                <input type="text" className="input input-bordered mt-2" placeholder="Diğer kişi adı" value={yapan2Other} onChange={(e) => setYapan2Other(e.target.value)} />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-6">
          <h4 className="text-md font-semibold text-slate-800 mb-3">Fotoğraf (isteğe bağlı)</h4>
          <p className="text-xs text-slate-500 mb-3">Telefonla çekilmiş fotoğraf veya bilgisayardan yükleyin. En fazla 7 fotoğraf seçebilirsiniz.</p>
          <input type="file" accept="image/*" multiple onChange={(e) => {
            setPhotoError('');
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length > 7) {
              setPhotoError('En fazla 7 fotoğraf seçebilirsiniz.');
              setPhotoFiles(files.slice(0,7));
            } else {
              setPhotoFiles(files);
            }
          }} disabled={!selectedRecordId} />
          {photoError && (<div className="text-xs text-rose-600 mt-2">{photoError}</div>)}
          {photoFiles && photoFiles.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium">Seçilenler:</div>
              <ul className="mt-2">
                {photoFiles.map((f, i) => (
                  <li key={i} className="text-xs text-slate-700">{f.name} — {(f.size/1024).toFixed(1)} KB</li>
                ))}
              </ul>
            </div>
          )}

          {/* Telefonla Ekle Button */}
          <div className="mt-4 pt-4 border-t">
            <button
              disabled={!selectedRecordId}
              onClick={async () => {
                if (!selectedRecordId) return;
                try {
                  await serviceApi.signalWaitingForPhotos(selectedRecordId);
                  // Show QR modal
                  setShowQrModal(true);
                } catch (err) {
                  console.error('Could not signal waiting', err);
                  try { outlet.setNotification?.({ type: 'error', message: 'Sinyal gönderilemedi.' }); } catch (e) { /* ignore */ }
                }
              }}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Telefonla Fotoğraf Ekle
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button onClick={async () => { if (selectedRecordId) await createOperation(selectedRecordId); }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-md hover:opacity-90 transition" disabled={!selectedRecordId}>Kaydet (İşlem Ekle)</button>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-800 mb-4">📱 Mobil Fotoğraf Yükleme</h3>
              <p className="text-sm text-slate-600 mb-6">
                Telefonunuzdan aşağıdaki QR kodu okutun veya linki açın:
              </p>
              
              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-xl border-4 border-slate-200 inline-block">
                  <QRCodeSVG 
                    value={`${window.location.protocol}//${window.location.hostname}:5173/teknik-servis/foto`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>

              {/* Link */}
              <div className="mb-6">
                <div className="text-xs text-slate-500 mb-2">Veya bu linki açın:</div>
                <div className="bg-slate-50 rounded-lg p-3 text-sm font-mono text-indigo-600 break-all border border-slate-200">
                  {window.location.protocol}//{window.location.hostname}:5173/teknik-servis/foto
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.protocol}//${window.location.hostname}:5173/teknik-servis/foto`);
                    try { outlet.setNotification?.({ type: 'success', message: 'Link kopyalandı!' }); } catch (e) { /* ignore */ }
                  }}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  📋 Linki Kopyala
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-indigo-50 rounded-lg p-4 mb-6 text-left">
                <div className="text-sm font-semibold text-indigo-900 mb-2">Nasıl Kullanılır?</div>
                <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
                  <li>Telefonunuzdan QR kodu okutun veya linki açın</li>
                  <li>Kamera ile fotoğrafları çekin</li>
                  <li>"Tamam" butonuna basın</li>
                  <li>Fotoğraflar otomatik olarak bu kayda eklenecek</li>
                </ol>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
