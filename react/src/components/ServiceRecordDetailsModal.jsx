import React from 'react';
import { Calendar, User, Package, FileText, Image, CheckCircle, Clock, Wrench } from 'lucide-react';

export default function ServiceRecordDetailsModal({ visible, onClose, data }) {
  if (!visible) return null;

  let parsed = null;
  try {
    parsed = data && data.SerializedRecordJson ? JSON.parse(data.SerializedRecordJson) : null;
  } catch (e) {
    parsed = null;
  }

  const record = parsed && (parsed.Record || parsed.record) ? (parsed.Record || parsed.record) : null;
  const operations = parsed && (parsed.Operations || parsed.operations) ? (parsed.Operations || parsed.operations) : [];
  const photos = parsed && parsed.Photos ? parsed.Photos : (parsed && parsed.photos ? parsed.photos : []);
  const quotes = data?.Quotes || data?.quotes || [];

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch { return d; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-2xl max-w-6xl w-full overflow-hidden" style={{maxHeight: '95vh'}}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="w-7 h-7" />
                Arşiv Servis Kaydı Detayları
              </h3>
              <p className="text-indigo-100 mt-1">Tamamlanma: {formatDate(data?.completedAt || data?.CompletedAt)}</p>
            </div>
            <button 
              className="btn btn-ghost text-white hover:bg-white/20" 
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6" style={{maxHeight: 'calc(95vh - 120px)'}}>
          {/* Genel Bilgiler */}
          <section className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Genel Bilgiler
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-500 mb-1">BELGE NO</div>
                <div className="text-lg font-bold text-slate-800">{data?.belgeNo || data?.BelgeNo || record?.belgeNo || record?.BelgeNo || '-'}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-500 mb-1">SERVİS TAKİP NO</div>
                <div className="text-lg font-bold text-slate-800">{data?.servisTakipNo || data?.ServisTakipNo || record?.servisTakipNo || record?.ServisTakipNo || '-'}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-500 mb-1">FİRMA</div>
                <div className="text-lg font-bold text-slate-800">{data?.firmaIsmi || data?.FirmaIsmi || record?.firmaIsmi || record?.FirmaIsmi || '-'}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-500 mb-1">ÜRÜN MODELİ</div>
                <div className="text-lg font-bold text-slate-800">{data?.urunModeli || data?.UrunModeli || record?.urunModeli || record?.UrunModeli || '-'}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> GELİŞ TARİHİ
                </div>
                <div className="text-sm font-bold text-slate-800">{formatDate(record?.gelisTarihi || record?.GelisTarihi || data?.gelisTarihi || data?.GelisTarihi)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> ALAN KİŞİ
                </div>
                <div className="text-sm font-bold text-slate-800">{record?.alanKisi || record?.AlanKisi || '-'}</div>
              </div>
            </div>
            {(record?.notlar || record?.Notlar) && (
              <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
                <div className="text-xs font-semibold text-amber-800 mb-1">KAYIT NOTLARI</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{record.notlar || record.Notlar}</div>
              </div>
            )}
          </section>

          {/* Yapılan İşlemler */}
          <section className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              Yapılan İşlemler ({(operations || []).length})
            </h4>
            {(operations || []).length > 0 ? (
              <div className="space-y-4">
                {operations.map((op, idx) => (
                  <div key={op.id || op.Id || idx} className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-5 border-l-4 border-emerald-500">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-lg font-bold text-slate-800">İşlem #{idx + 1}</div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {op.yapanKisi || op.YapanKisi || '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(op.islemBitisTarihi || op.IslemBitisTarihi)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(op.ChangedParts || op.changedParts) && (op.ChangedParts || op.changedParts).length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          Değişen Parçalar:
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <table className="table w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left">Parça</th>
                                <th className="text-center">Adet</th>
                                <th className="text-right">Fiyat</th>
                                <th className="text-right">İndirim</th>
                                <th className="text-right">Liste Fiyat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(op.ChangedParts || op.changedParts).map((cp, cpIdx) => (
                                <tr key={cp.id || cp.Id || cpIdx} className="border-b">
                                  <td className="font-medium">{cp.partName || cp.PartName || '-'}</td>
                                  <td className="text-center">{cp.quantity || cp.Quantity || 0}</td>
                                  <td className="text-right">{(cp.price || cp.Price || 0).toFixed(2)} ₺</td>
                                  <td className="text-right">{(cp.discountPercent || cp.DiscountPercent || 0)}%</td>
                                  <td className="text-right font-bold">{(cp.listPrice || cp.ListPrice || 0).toFixed(2)} ₺</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {(op.ServiceItems || op.serviceItems) && (op.ServiceItems || op.serviceItems).length > 0 && (
                      <div>
                        <div className="text-sm font-bold text-slate-700 mb-2">Hizmetler:</div>
                        <div className="bg-white rounded-lg p-3">
                          <table className="table w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left">Hizmet</th>
                                <th className="text-right">Fiyat</th>
                                <th className="text-right">İndirim</th>
                                <th className="text-right">Liste Fiyat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(op.ServiceItems || op.serviceItems).map((si, siIdx) => (
                                <tr key={si.id || si.Id || siIdx} className="border-b">
                                  <td className="font-medium">{si.name || si.Name || '-'}</td>
                                  <td className="text-right">{(si.price || si.Price || 0).toFixed(2)} ₺</td>
                                  <td className="text-right">{(si.discountPercent || si.DiscountPercent || 0)}%</td>
                                  <td className="text-right font-bold">{(si.listPrice || si.ListPrice || 0).toFixed(2)} ₺</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 text-center">İşlem bilgisi mevcut değil.</div>
            )}
          </section>

          {/* Gönderilen Teklifler */}
          <section className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Gönderilen Teklifler ({quotes.length})
            </h4>
            {quotes.length > 0 ? (
              <div className="space-y-3">
                {quotes.map((q, idx) => (
                  <div key={q.id || q.Id || idx} className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{q.customerName || q.CustomerName || q.recipientEmail || q.RecipientEmail || '-'}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        <span className="font-medium">Belge:</span> {q.pdfFileName || q.PdfFileName || q.belgeNo || q.BelgeNo || '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Gönderilme</div>
                      <div className="text-sm font-medium text-slate-700">{formatDate(q.sentAt || q.SentAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 text-center">Bu kayıt için gönderilmiş teklif yok.</div>
            )}
          </section>

          {/* Fotoğraflar */}
          <section className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-pink-600" />
              Fotoğraflar ({(photos || []).length})
            </h4>
            {(photos || []).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((p, idx) => (
                  <div key={p.id || p.Id || idx} className="group relative bg-slate-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                    <div className="aspect-square bg-slate-200 flex items-center justify-center">
                      <Image className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="p-2 bg-white">
                      <div className="text-xs font-medium text-slate-700 truncate">{p.fileName || p.FileName || 'Foto'}</div>
                      <div className="text-xs text-slate-500">{formatDate(p.createdAt || p.CreatedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 text-center">Fotoğraf yok.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
