import React from 'react';

export default function ServiceDetailModal({ open, onClose, record, operations = [], loading, onDeleteOperation, onUpdateOperation, canEdit, onDeleteRecord, canDelete, showPrices = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Servis Kayıt Detayı</h3>
            <div className="text-sm text-slate-500">Seri No: {record?.seriNo} — Firma: {record?.firmaIsmi}</div>
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
              <div className="text-xs text-slate-500">Durum</div>
              <div className="font-medium">{record?.durum}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Notlar</div>
              <div className="font-medium">{record?.notlar || '-'}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">İşlemler ({operations.length})</div>
            {loading && <div className="text-sm text-slate-500">Yükleniyor...</div>}
            {(!loading && operations.length === 0) && <div className="text-sm text-slate-500">İşlem bulunamadı.</div>}

            <div className="space-y-3">
              {operations.map((op, opIdx) => (
                <div key={op.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">İşlem #{op.id}</div>
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
                              <input type="number" step="0.01" className="input input-bordered w-32" value={p.price ?? 0} onChange={(e) => {
                                const v = parseFloat(e.target.value) || 0;
                                if (typeof onUpdateOperation === 'function') {
                                  const newOp = { ...op, changedParts: (op.changedParts || []).map((pp, i) => i === pIdx ? ({ ...pp, price: v }) : pp) };
                                  onUpdateOperation(op.id, newOp);
                                }
                              }} disabled={!canEdit} />
                              <span className="text-sm">₺</span>
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
                              <input type="number" step="0.01" className="input input-bordered w-32" value={s.price ?? 0} onChange={(e) => {
                                const v = parseFloat(e.target.value) || 0;
                                if (typeof onUpdateOperation === 'function') {
                                  const newOp = { ...op, serviceItems: (op.serviceItems || []).map((ss, i) => i === sIdx ? ({ ...ss, price: v }) : ss) };
                                  onUpdateOperation(op.id, newOp);
                                }
                              }} disabled={!canEdit} />
                              <span className="text-sm">₺</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    {showPrices && canEdit && (
                      <div className="mt-3 flex justify-end">
                        <button className="btn btn-sm btn-primary" onClick={async () => {
                          if (typeof onUpdateOperation === 'function') {
                            await onUpdateOperation(op.id, op, { save: true });
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
