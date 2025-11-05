import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import serviceApi from '../hooks/serviceApi';

export default function Muhasebe(props) {
  const [localSelectedRecordId, setLocalSelectedRecordId] = useState('');
  const [localAccountingOperations, setLocalAccountingOperations] = useState([]);
  const outlet = useOutletContext?.() ?? {};

  // determine roles from token
  const getRoles = () => {
    try {
      const t = localStorage.getItem('token');
      if (!t) return [];
      const p = JSON.parse(atob(t.split('.')[1]));
      const role = p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (!role) return [];
      if (Array.isArray(role)) return role;
      return [role];
    } catch (e) {
      return [];
    }
  };

  const roles = getRoles();
  const canEdit = roles.includes('admin') || roles.includes('muhasebe');

  const servisKayitlari = props.servisKayitlari ?? outlet.servisKayitlari ?? [];
  const reloadServisKayitlari = props.reloadServisKayitlari ?? outlet.reloadServisKayitlari ?? (async () => {});
  const openDetail = props.openDetail ?? outlet.openDetail ?? (async () => {});
  const selectedRecordId = props.selectedRecordId ?? localSelectedRecordId;
  const setSelectedRecordId = props.setSelectedRecordId ?? setLocalSelectedRecordId;
  const accountingOperations = props.accountingOperations ?? localAccountingOperations;
  const setAccountingOperations = props.setAccountingOperations ?? setLocalAccountingOperations;
  const setNotification = props.setNotification ?? outlet.setNotification ?? (() => {});

  // handlers for quote sending (placeholders that call outlet-provided callbacks if available)
  const handleSendQuote = async (id) => {
    if (!id) return;
    if (outlet.sendQuote) {
      try {
        await outlet.sendQuote(id);
        setNotification({ type: 'success', message: 'Teklif gönderildi.' });
      } catch (err) {
        console.error('sendQuote failed', err);
        setNotification({ type: 'error', message: 'Teklif gönderilemedi.' });
      }
    } else {
      setNotification({ type: 'info', message: 'Teklif gönderme özelliği yapılandırılmadı (placeholder).' });
    }
  };

  const handleBulkSendQuotes = async () => {
    // Open bulk-send modal to let user choose records and edit prices
    setBulkModalOpen(true);
  };

  // Bulk modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFilterFirma, setBulkFilterFirma] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkStep, setBulkStep] = useState(1); // 1: select, 2: edit prices
  // prices: { [id]: { partsPrice: number, servicesPrice: number, email?: string, note?: string } }
  const [bulkPrices, setBulkPrices] = useState({});
  const [bulkRecipientEmail, setBulkRecipientEmail] = useState('');
  const [bulkOperations, setBulkOperations] = useState({});

  const filteredForBulk = servisKayitlari.filter(s => !bulkFilterFirma || (s.firmaIsmi || '').toLowerCase().includes(bulkFilterFirma.toLowerCase()));

  const toggleBulkSelect = (id) => {
    setBulkSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  const selectAllFiltered = () => setBulkSelectedIds(filteredForBulk.map(s => s.id));
  const clearAllSelected = () => setBulkSelectedIds([]);

  const startBulkEdit = async () => {
    // fetch operations for each selected record so we can compute accurate totals and show details
    const opsMap = {};
    const priceInit = {};
    try {
      await Promise.all(bulkSelectedIds.map(async (id) => {
        try {
          const ops = await serviceApi.getServiceOperations(id);
          opsMap[id] = ops || [];
          // compute totals
          let partsTotal = 0;
          let servicesTotal = 0;
          (ops || []).forEach(op => {
            (op.changedParts || []).forEach(p => {
              const qty = Number(p.quantity || 0);
              const price = Number(p.price || 0);
              partsTotal += qty * price;
            });
            (op.serviceItems || []).forEach(s => {
              servicesTotal += Number(s.price || 0);
            });
          });
          priceInit[id] = { partsPrice: partsTotal, servicesPrice: servicesTotal, note: '' };
        } catch (err) {
          console.error('Could not load ops for', id, err);
          opsMap[id] = [];
          priceInit[id] = { partsPrice: 0, servicesPrice: 0, note: '' };
        }
      }));
    } catch (err) {
      console.error('Error while fetching operations for bulk edit', err);
    }
    setBulkOperations(opsMap);
    setBulkPrices(priceInit);
    setBulkStep(2);
  };

  const updatePriceFor = (id, key, value) => {
    setBulkPrices(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const cancelBulk = () => {
    setBulkModalOpen(false);
    setBulkFilterFirma('');
    setBulkSelectedIds([]);
    setBulkStep(1);
    setBulkPrices({});
    setBulkRecipientEmail('');
  };

  const sendBulk = async () => {
    const payload = bulkSelectedIds.map(id => ({
      id,
      partsPrice: bulkPrices[id]?.partsPrice || 0,
      servicesPrice: bulkPrices[id]?.servicesPrice || 0,
      email: bulkRecipientEmail || '',
      note: bulkPrices[id]?.note || ''
    }));
    if (outlet.sendBulkQuotes) {
      try {
        // backend expects an object with recipientEmail and items
        const requestBody = { recipientEmail: bulkRecipientEmail || '', items: payload };
        await outlet.sendBulkQuotes(requestBody);
        setNotification({ type: 'success', message: 'Toplu teklifler gönderildi.' });
        cancelBulk();
      } catch (err) {
        console.error('sendBulkQuotes failed', err);
        setNotification({ type: 'error', message: 'Toplu teklifler gönderilemedi.' });
      }
    } else {
      // placeholder: just show summary
      setNotification({ type: 'info', message: `Toplu teklif önizlemesi: ${payload.length} kayıt hazır.` });
      console.info('Bulk quote payload', payload);
      // keep modal open so user can inspect
    }
  };

  // onayla (Muhasebe tarafındaki buton): seçili kayıt için durumu 'Onaylandı' yap
  const handleApproveRecord = async () => {
    if (!selectedRecordId) return;
    const rec = servisKayitlari.find(s => String(s.id) === String(selectedRecordId));
    if (!rec) return;
    try {
      const payload = { ...rec, id: Number(rec.id), Id: Number(rec.id), durum: 'Onaylandı', Durum: 'Onaylandı' };
      await serviceApi.updateServiceRecord(rec.id, payload);
      setNotification({ type: 'success', message: 'Kayıt Onaylandı olarak güncellendi.' });
      try { await reloadServisKayitlari(); } catch (e) { console.error('reload failed', e); }
      try { const ops = await serviceApi.getServiceOperations(selectedRecordId); setAccountingOperations(ops || []); } catch (e) { console.error('ops reload failed', e); }
    } catch (err) {
      console.error('Could not approve record', err);
      setNotification({ type: 'error', message: 'Onaylama sırasında hata oluştu.' });
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Muhasebe</h2>
      {/* Bulk quote modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Toplu Teklif Gönder</h3>
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={cancelBulk}>İptal</button>
              </div>
            </div>

            {bulkStep === 1 ? (
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <input value={bulkFilterFirma} onChange={(e) => setBulkFilterFirma(e.target.value)} placeholder="Firma ara..." className="input input-bordered w-64" />
                  <button className="btn btn-sm" onClick={selectAllFiltered}>Tümünü Seç</button>
                  <button className="btn btn-sm" onClick={clearAllSelected}>Seçimi Temizle</button>
                </div>
                <div className="max-h-72 overflow-auto border rounded p-2">
                  {filteredForBulk.length === 0 && <div className="text-sm text-slate-500">Eşleşen kayıt bulunamadı.</div>}
                  {filteredForBulk.map(r => (
                    <label key={r.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                      <input type="checkbox" checked={bulkSelectedIds.includes(r.id)} onChange={() => toggleBulkSelect(r.id)} />
                      <div className="flex-1">
                        <div className="font-medium">{r.servisTakipNo || r.seriNo} — {r.firmaIsmi}</div>
                        <div className="text-xs text-slate-500">{r.urunModeli} • {r.gelisTarihi}</div>
                      </div>
                      <div className="text-sm text-slate-600">{r.durum}</div>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="btn" onClick={cancelBulk}>Kapat</button>
                  <button className="btn btn-primary" disabled={bulkSelectedIds.length === 0} onClick={startBulkEdit}>Devam Et</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <label className="label">E-posta (Varsayılan alıcı)</label>
                  <input className="input input-bordered w-full" value={bulkRecipientEmail} onChange={(e) => setBulkRecipientEmail(e.target.value)} placeholder="ornek@firma.com" />
                </div>
                <div className="max-h-64 overflow-auto space-y-3 mb-4">
                  {bulkSelectedIds.map(id => {
                    const rec = servisKayitlari.find(s => s.id === id) || {};
                    const p = bulkPrices[id] || { partsPrice: 0, servicesPrice: 0, email: '' };
                    return (
                      <div key={id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold">{rec.servisTakipNo || rec.seriNo} — {rec.firmaIsmi}</div>
                          <div className="text-xs text-slate-500">{rec.urunModeli}</div>
                        </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="label">Parça Toplamı</label>
                                <input type="number" step="0.01" className="input input-bordered w-full" value={p.partsPrice} onChange={(e) => updatePriceFor(id, 'partsPrice', parseFloat(e.target.value || 0))} />
                              </div>
                              <div>
                                <label className="label">Hizmet Toplamı</label>
                                <input type="number" step="0.01" className="input input-bordered w-full" value={p.servicesPrice} onChange={(e) => updatePriceFor(id, 'servicesPrice', parseFloat(e.target.value || 0))} />
                              </div>
                              <div>
                                <label className="label">Toplam</label>
                                <div className="text-lg font-semibold">{((Number(p.partsPrice)||0) + (Number(p.servicesPrice)||0)).toFixed(2)} ₺</div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="label">Not</label>
                              <input className="input input-bordered w-full" value={p.note || ''} onChange={(e) => updatePriceFor(id, 'note', e.target.value)} placeholder="İsteğe bağlı not" />
                            </div>
                            <div className="mt-3">
                              <label className="label">Detaylı İşlemler</label>
                              <div className="text-sm text-slate-600 space-y-2">
                                {(bulkOperations[id] || []).map(op => (
                                  <div key={op.id} className="border rounded p-2 bg-slate-50">
                                    <div className="font-medium">İşlem #{op.id} — Yapan: {op.yapanKisi || '-'}</div>
                                    <div className="text-xs text-slate-500 mb-1">Tarih: {op.islemBitisTarihi || '-'}</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div>
                                        <div className="text-xs font-semibold">Değişen Parçalar</div>
                                        {(op.changedParts || []).length === 0 && <div className="text-xs text-slate-500">Yok</div>}
                                        <ul className="text-xs">
                                          {(op.changedParts || []).map((cp, i) => (
                                            <li key={i} className="flex justify-between"><span>{cp.partName} x{cp.quantity}</span><span>{(Number(cp.price)||0).toFixed(2)} ₺</span></li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <div className="text-xs font-semibold">Hizmet Kalemleri</div>
                                        {(op.serviceItems || []).length === 0 && <div className="text-xs text-slate-500">Yok</div>}
                                        <ul className="text-xs">
                                          {(op.serviceItems || []).map((si, i) => (
                                            <li key={i} className="flex justify-between"><span>{si.name}</span><span>{(Number(si.price)||0).toFixed(2)} ₺</span></li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between">
                  <button className="btn" onClick={() => setBulkStep(1)}>Geri</button>
                  <div className="flex gap-2">
                    <button className="btn" onClick={cancelBulk}>İptal</button>
                    <button className="btn btn-success" onClick={sendBulk}>Gönder</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Active service records copied from ServisList */}
      {/* Teklif gönderme panel */}
      <div className="mb-6 p-4 border rounded-lg bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Teklif Gönderme</h3>
            <p className="text-sm text-slate-500">Seçili kayıtlara veya tüm aktif kayıtlara teklif gönderebilirsiniz.</p>
          </div>
          <div className="flex gap-2">
            <button disabled={!canEdit} onClick={handleBulkSendQuotes} className={`btn btn-sm ${canEdit ? 'btn-warning' : 'btn-disabled'}`}>Toplu Teklif Gönder</button>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-semibold">Aktif Servis Kayıtları</h3>
          <div className="relative">
            <input type="text" placeholder="Ara..." className="input input-bordered w-64 pl-9 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-slate-500 text-sm">
                <th>Servis Takip No</th>
                <th>Ürün Modeli</th>
                <th>Firma</th>
                <th>GelişTarihi</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {servisKayitlari.map((kayit) => {
                const statusClass = kayit.durum === 'Tamamlandı' ? 'bg-emerald-100 text-emerald-700'
                  : kayit.durum === 'İşlemde' ? 'bg-amber-100 text-amber-700'
                  : kayit.durum === 'Teklif Bekliyor' ? 'bg-yellow-100 text-yellow-700'
                  : kayit.durum === 'Onay Bekliyor' ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-sky-100 text-sky-700';
                return (
                  <tr key={kayit.id} className="hover:bg-slate-50 transition">
                    <td className="font-medium">{kayit.servisTakipNo || kayit.seriNo}</td>
                    <td>{kayit.urunModeli}</td>
                    <td>{kayit.firmaIsmi}</td>
                    <td>{kayit.gelisTarihi}</td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                        {kayit.durum}
                      </span>
                    </td>
                    <td className="flex items-center gap-2">
                      <button onClick={async()=>{ await openDetail(kayit, { showPrices: true }); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">Detay</button>
                      {canEdit && (
                        <>
                          <button onClick={async() => { await handleSendQuote(kayit.id); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition">Teklif Gönder</button>
                          <button
                            disabled={!(kayit.durum === 'Onay Bekliyor')}
                            onClick={async () => {
                              if (kayit.durum !== 'Onay Bekliyor') return; // guard
                              try {
                                const payload = { ...kayit, id: Number(kayit.id), Id: Number(kayit.id), durum: 'Onaylandı', Durum: 'Onaylandı' };
                                await serviceApi.updateServiceRecord(kayit.id, payload);
                                setNotification({ type: 'success', message: 'Kayıt Onaylandı olarak güncellendi.' });
                                try { await reloadServisKayitlari(); } catch (e) { console.error('reload failed', e); }
                                // if this row is currently selected, refresh operations view
                                try { if (String(selectedRecordId) === String(kayit.id)) { const ops = await serviceApi.getServiceOperations(kayit.id); setAccountingOperations(ops || []); } } catch (e) { console.error('ops reload failed', e); }
                              } catch (err) {
                                console.error('Could not approve record', err);
                                setNotification({ type: 'error', message: 'Onaylama sırasında hata oluştu.' });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${kayit.durum === 'Onay Bekliyor' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-100 text-emerald-400 cursor-not-allowed'}`}>
                            Onayla
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Kayıt seç bölümü kaldırıldı - seçim artık burada gösterilmiyor */}

      <div className="space-y-4">
        {accountingOperations.length === 0 && (<p className="text-sm text-slate-500">Seçili kayıt için işlem bulunamadı veya henüz yüklenmedi.</p>)}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-600">İşlemler: {accountingOperations.length}</div>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={async () => {
              if (!selectedRecordId) return; try { const ops = await serviceApi.getServiceOperations(selectedRecordId); setAccountingOperations(ops || []); } catch (err) { setNotification({ type: 'error', message: 'Yenileme hatası' }); }
            }}>Yenile</button>
          </div>
        </div>

        {accountingOperations.map((op, opIdx) => (
          <div key={op.id} className="border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div><div className="font-semibold">İşlem #{op.id}</div><div className="text-xs text-slate-500">Yapan: {op.yapanKisi || '-'} — Tarih: {op.islemBitisTarihi || '-'}</div></div>
              <div className="flex gap-2">
                {canEdit ? (
                  <>
                    <button onClick={async () => {
                      try {
                        // ensure ServiceRecordId and Id present
                        const payload = { ...op, serviceRecordId: Number(selectedRecordId), ServiceRecordId: Number(selectedRecordId), Id: op.id, id: op.id };
                        await serviceApi.updateServiceOperation(selectedRecordId, op.id, payload);
                        setNotification({ type: 'success', message: 'Fiyatlar kaydedildi.' });
                      } catch (err) {
                        console.error(err);
                        setNotification({ type: 'error', message: 'Kaydetme hatası.' });
                      }
                    }} className="btn btn-sm btn-primary">Kaydet</button>

                    <button onClick={async () => { await handleApproveRecord(); }} className="btn btn-sm btn-warning">Onayla</button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold mb-2">Değişen Parçalar</div>
              {(!op.changedParts || op.changedParts.length === 0) && <div className="text-xs text-slate-500">Parça yok.</div>}
              <ul className="divide-y">
                {(op.changedParts || []).map((p, pIdx) => (
                  <li key={p.id ?? pIdx} className="py-2 flex items-center justify-between">
                    <div><div className="font-medium">{p.partName}</div><div className="text-xs text-slate-500">Adet: {p.quantity}</div></div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input input-bordered w-32"
                        value={p.price !== undefined && p.price !== null ? p.price : ''}
                        onFocus={() => {
                          // If the value is zero, clear it so typing replaces it immediately
                          if (p.price === 0) {
                            setAccountingOperations((prev) => prev.map((oo) => oo.id === op.id ? ({ ...oo, changedParts: (oo.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, price: '' }) : pp) }) : oo));
                          }
                        }}
                        onBlur={() => {
                          // If left empty, normalize back to 0 for display/consistency
                          const current = (accountingOperations.find(a => a.id === op.id)?.changedParts || [])[pIdx];
                          if (current && (current.price === '' || current.price === null || current.price === undefined)) {
                            setAccountingOperations((prev) => prev.map((oo) => oo.id === op.id ? ({ ...oo, changedParts: (oo.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, price: 0 }) : pp) }) : oo));
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const v = raw === '' ? '' : (isNaN(Number(raw)) ? '' : parseFloat(raw));
                          setAccountingOperations((prev) => prev.map((oo) => oo.id === op.id ? ({ ...oo, changedParts: (oo.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, price: v }) : pp) }) : oo));
                        }}
                        disabled={!canEdit}
                      />
                      <span className="text-sm">₺</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold mb-2">Hizmetler</div>
              {(!op.serviceItems || op.serviceItems.length === 0) && <div className="text-xs text-slate-500">Hizmet yok.</div>}
              <ul className="divide-y">
                {(op.serviceItems || []).map((s, sIdx) => (
                  <li key={s.id ?? sIdx} className="py-2 flex items-center justify-between">
                    <div><div className="font-medium">{s.name}</div></div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input input-bordered w-32"
                        value={s.price !== undefined && s.price !== null ? s.price : ''}
                        onFocus={() => {
                          if (s.price === 0) {
                            setAccountingOperations((prev) => prev.map((oo) => oo.id === op.id ? ({ ...oo, serviceItems: (oo.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, price: '' }) : ss) }) : oo));
                          }
                        }}
                        onBlur={() => {
                          const current = (accountingOperations.find(a => a.id === op.id)?.serviceItems || [])[sIdx];
                          if (current && (current.price === '' || current.price === null || current.price === undefined)) {
                            setAccountingOperations((prev) => prev.map((oo) => oo.id === op.id ? ({ ...oo, serviceItems: (oo.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, price: 0 }) : ss) }) : oo));
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const v = raw === '' ? '' : (isNaN(Number(raw)) ? '' : parseFloat(raw));
                          setAccountingOperations((prev) => prev.map((oo) => oo.id === op.id ? ({ ...oo, serviceItems: (oo.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, price: v }) : ss) }) : oo));
                        }}
                        disabled={!canEdit}
                      />
                      <span className="text-sm">₺</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
