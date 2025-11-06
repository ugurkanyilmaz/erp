import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import serviceApi from '../hooks/serviceApi';

export default function ServiceDetailModal({ open, onClose, record, operations = [], loading, onDeleteOperation, onUpdateOperation, canEdit, onDeleteRecord, canDelete, showPrices = false, onUpdateRecord, setNotification: propSetNotification }) {
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!open || !record?.id) {
      setPhotos([]);
      setPhotosError('');
      setEditingNotes(false);
      setNotesValue('');
      return;
    }
    // Initialize notes value
    setNotesValue(record?.notlar || '');
    setEditingNotes(false);
    
    setPhotosLoading(true);
    setPhotosError('');
    serviceApi.getServiceRecordPhotos(record.id)
      .then((res) => { if (!mounted) return; setPhotos(res || []); })
      .catch((err) => { if (!mounted) return; console.error('Could not load record photos', err); setPhotosError(err?.message || 'Fotoğraflar yüklenemedi'); setPhotos([]); })
      .finally(() => { if (!mounted) setPhotosLoading(false); else setPhotosLoading(false); });
    return () => { mounted = false; };
  }, [open, record?.id, record?.notlar]);

  // allow using outlet-provided notification setter as fallback
  const outlet = useOutletContext?.() ?? {};
  const setNotification = propSetNotification ?? outlet.setNotification ?? (() => {});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Servis Kayıt Detayı</h3>
            <div className="text-sm text-slate-500">Servis Takip No: {record?.servisTakipNo || record?.seriNo} — Firma: {record?.firmaIsmi}</div>
          </div>
          <div className="flex gap-2">
            {canDelete && (
              <button className="btn btn-sm btn-error" onClick={async () => {
                if (!record) return;
                if (!window.confirm('Bu servis kaydını tamamen silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
                if (typeof onDeleteRecord === 'function') {
                  await onDeleteRecord(record.id);
                }
              }}>Kayıtı Sil</button>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Kapat</button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">Ürün Modeli</div>
              <div className="font-medium">{record?.urunModeli}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Geliş Tarihi</div>
              <div className="font-medium">{record?.gelisTarihi}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Alan Kişi</div>
              <div className="font-medium">{record?.alanKisi || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Durum</div>
              <div className="font-medium">{record?.durum}</div>
            </div>
          </div>
          
          {/* Notlar section with edit capability */}
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-700">Notlar</div>
              {canEdit && !editingNotes && (
                <button 
                  className="btn btn-xs btn-ghost"
                  onClick={() => setEditingNotes(true)}
                >Düzenle</button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea 
                  className="textarea textarea-bordered w-full min-h-[100px]"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Notlar..."
                />
                <div className="flex gap-2 mt-2">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={async () => {
                      if (typeof onUpdateRecord === 'function') {
                        try {
                          await onUpdateRecord(record.id, { ...record, notlar: notesValue });
                          setEditingNotes(false);
                        } catch (e) {
                          console.error('Could not update notes', e);
                        }
                      }
                    }}
                  >Kaydet</button>
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setNotesValue(record?.notlar || '');
                      setEditingNotes(false);
                    }}
                  >İptal</button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{record?.notlar || 'Not eklenmemiş.'}</div>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">İşlemler ({operations.length})</div>
            {loading && <div className="text-sm text-slate-500">Yükleniyor...</div>}
            {(!loading && operations.length === 0) && <div className="text-sm text-slate-500">İşlem bulunamadı.</div>}

            {/* Record photos preview */}
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Kayıt Fotoğrafları</div>
              {photosLoading && <div className="text-xs text-slate-500">Fotoğraflar yükleniyor...</div>}
              {photosError && <div className="text-xs text-rose-600">{photosError}</div>}
              {!photosLoading && photos.length === 0 && (
                <div className="text-xs text-slate-500">Bu kayıt için fotoğraf bulunmuyor.</div>
              )}
              {!photosLoading && photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative group">
                      <a href={p.url || p.Url} target="_blank" rel="noreferrer" className="block">
                        <img src={p.url || p.Url} alt={`foto-${p.id}`} className="object-cover w-28 h-28 rounded-md border" />
                      </a>
                      {canEdit && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            if (!window.confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?')) return;
                            try {
                              await serviceApi.deleteServiceRecordPhoto(record.id, p.id);
                              setPhotos(prev => prev.filter(ph => ph.id !== p.id));
                              setNotification({ type: 'success', message: 'Fotoğraf silindi.' });
                            } catch (err) {
                              console.error('Could not delete photo', err);
                              setNotification({ type: 'error', message: 'Fotoğraf silinemedi.' });
                            }
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Fotoğrafı sil"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {operations.map((op, opIdx) => (
                <div key={op.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">İşlem #{opIdx + 1}</div>
                      <div className="text-xs text-slate-500">Yapan: {op.yapanKisi || '-'} — Tarih: {op.islemBitisTarihi || '-'}</div>
                    </div>
                    <div className="flex gap-2">
                      {canEdit && (
                        <button className="btn btn-sm btn-error" onClick={async () => {
                          if (!window.confirm('Bu işlemi silmek istediğinizden emin misiniz?')) return;
                          await onDeleteOperation(op.id);
                        }}>İşlemi Sil</button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-semibold">Değişen Parçalar</div>
                    {(!op.changedParts || op.changedParts.length === 0) && <div className="text-xs text-slate-500">Parça yok.</div>}
                    <ul className="divide-y mt-2">
                      {(op.changedParts || []).map((p, pIdx) => (
                        <li key={p.id ?? pIdx} className="py-2 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{p.partName}</div>
                            <div className="text-xs text-slate-500">Adet: {p.quantity}</div>
                          </div>
                          {showPrices && (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                                step="0.01" 
                                className="input input-bordered w-32 placeholder:text-slate-400" 
                                placeholder="0.00"
                                value={(p.listPrice ?? p.price) === 0 ? '' : (p.listPrice ?? p.price ?? '')}
                                onFocus={(e) => {
                                  if ((p.listPrice ?? p.price ?? 0) === 0) {
                                    const newOp = { ...op, changedParts: (op.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, listPrice: '' }) : pp) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }}
                                onBlur={(e) => {
                                  const currentVal = op.changedParts?.[pIdx]?.listPrice ?? op.changedParts?.[pIdx]?.price;
                                  if (currentVal === '' || currentVal === null || currentVal === undefined) {
                                    const newOp = { ...op, changedParts: (op.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, listPrice: 0 }) : pp) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(',', '.');
                                  const v = raw === '' ? '' : (isNaN(Number(raw)) ? '' : parseFloat(raw));
                                  if (typeof onUpdateOperation === 'function') {
                                    const newOp = { ...op, changedParts: (op.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, listPrice: v }) : pp) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }} 
                                disabled={!canEdit} 
                              />
                              <input 
                                type="text" 
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                                step="0.01" 
                                className="input input-bordered w-20 placeholder:text-slate-400" 
                                placeholder="0"
                                value={p.discountPercent === 0 ? '' : (p.discountPercent ?? '')}
                                onFocus={(e) => {
                                  if ((p.discountPercent ?? 0) === 0) {
                                    const newOp = { ...op, changedParts: (op.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, discountPercent: '' }) : pp) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }}
                                onBlur={(e) => {
                                  const currentVal = op.changedParts?.[pIdx]?.discountPercent;
                                  if (currentVal === '' || currentVal === null || currentVal === undefined) {
                                    const newOp = { ...op, changedParts: (op.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, discountPercent: 0 }) : pp) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(',', '.');
                                  const d = raw === '' ? '' : (isNaN(Number(raw)) ? '' : parseFloat(raw));
                                  if (typeof onUpdateOperation === 'function') {
                                    const newOp = { ...op, changedParts: (op.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, discountPercent: d }) : pp) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }} 
                                disabled={!canEdit} 
                              />
                              <div className="text-sm font-semibold">
                                {( (Number(p.listPrice ?? p.price ?? 0) * (1 - (Number(p.discountPercent ?? 0) / 100))) ).toFixed(2)} ₺
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-semibold">Hizmetler</div>
                    {(!op.serviceItems || op.serviceItems.length === 0) && <div className="text-xs text-slate-500">Hizmet yok.</div>}
                    <ul className="divide-y mt-2">
                      {(op.serviceItems || []).map((s, sIdx) => (
                        <li key={s.id ?? sIdx} className="py-2 flex items-center justify-between">
                          <div className="font-medium">{s.name}</div>
                          {showPrices && (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                                step="0.01" 
                                className="input input-bordered w-32 placeholder:text-slate-400" 
                                placeholder="0.00"
                                value={(s.listPrice ?? s.price) === 0 ? '' : (s.listPrice ?? s.price ?? '')}
                                onFocus={(e) => {
                                  if ((s.listPrice ?? s.price ?? 0) === 0) {
                                    const newOp = { ...op, serviceItems: (op.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, listPrice: '' }) : ss) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }}
                                onBlur={(e) => {
                                  const currentVal = op.serviceItems?.[sIdx]?.listPrice ?? op.serviceItems?.[sIdx]?.price;
                                  if (currentVal === '' || currentVal === null || currentVal === undefined) {
                                    const newOp = { ...op, serviceItems: (op.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, listPrice: 0 }) : ss) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(',', '.');
                                  const v = raw === '' ? '' : (isNaN(Number(raw)) ? '' : parseFloat(raw));
                                  if (typeof onUpdateOperation === 'function') {
                                    const newOp = { ...op, serviceItems: (op.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, listPrice: v }) : ss) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }} 
                                disabled={!canEdit} 
                              />
                              <input 
                                type="text" 
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                                step="0.01" 
                                className="input input-bordered w-20 placeholder:text-slate-400" 
                                placeholder="0"
                                value={s.discountPercent === 0 ? '' : (s.discountPercent ?? '')}
                                onFocus={(e) => {
                                  if ((s.discountPercent ?? 0) === 0) {
                                    const newOp = { ...op, serviceItems: (op.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, discountPercent: '' }) : ss) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }}
                                onBlur={(e) => {
                                  const currentVal = op.serviceItems?.[sIdx]?.discountPercent;
                                  if (currentVal === '' || currentVal === null || currentVal === undefined) {
                                    const newOp = { ...op, serviceItems: (op.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, discountPercent: 0 }) : ss) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(',', '.');
                                  const d = raw === '' ? '' : (isNaN(Number(raw)) ? '' : parseFloat(raw));
                                  if (typeof onUpdateOperation === 'function') {
                                    const newOp = { ...op, serviceItems: (op.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, discountPercent: d }) : ss) };
                                    onUpdateOperation(op.id, newOp);
                                  }
                                }} 
                                disabled={!canEdit} 
                              />
                              <div className="text-sm font-semibold">
                                {( (Number(s.listPrice ?? s.price ?? 0) * (1 - (Number(s.discountPercent ?? 0) / 100))) ).toFixed(2)} ₺
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    {showPrices && canEdit && (
                      <div className="mt-3 flex justify-end">
                        <button className="btn btn-sm btn-primary" onClick={async () => {
                          if (typeof onUpdateOperation === 'function') {
                            try {
                              await onUpdateOperation(op.id, op, { save: true });
                              try { setNotification({ type: 'success', message: 'İşlem kaydedildi.' }); } catch (e) { /* ignore */ }
                            } catch (err) {
                              console.error('Save operation failed in modal', err);
                              try { setNotification({ type: 'error', message: 'Kaydetme sırasında hata oluştu.' }); } catch (e) { /* ignore */ }
                            }
                          }
                        }}>Kaydet</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
