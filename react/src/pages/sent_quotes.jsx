import React, { useState, useEffect } from 'react';
import { FileText, Mail, Clock, User } from 'lucide-react';
import Header from '../components/Header';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

export default function SentQuotesPage() {
  const [sentQuotes, setSentQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedPdf, setSelectedPdf] = useState(null);

  useEffect(() => {
    loadSentQuotes();
  }, []);

  const loadSentQuotes = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(buildApiUrl('sentquotes'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSentQuotes(res.data || []);
    } catch (err) {
      console.error('Could not load sent quotes', err);
      setError('Gönderilen teklifler yüklenemedi: ' + (err?.response?.data?.error || err?.message || 'Hata'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header title="Gönderilen Teklifler" subtitle="Gönderilmiş tekliflerin listesi" IconComponent={Mail} showNew={false} showSearch={true} />

      <main className="w-full px-6 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Gönderilen Teklifler</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Ara: belge no, müşteri, e-posta, pdf..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input input-sm input-bordered"
              />
              <button onClick={loadSentQuotes} className="btn btn-sm btn-outline">
                Yenile
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="text-lg text-slate-600">Yükleniyor...</div>
            </div>
          )}

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {!loading && sentQuotes.length === 0 && (
            <div className="text-center py-12">
              <Mail size={48} className="mx-auto text-slate-300 mb-4" />
              <div className="text-lg text-slate-600">Henüz gönderilen teklif yok</div>
            </div>
          )}

          {!loading && sentQuotes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Belge No</th>
                    <th>Müşteri</th>
                    <th>E-posta</th>
                    <th>PDF Dosyası</th>
                    <th>Kayıt ID'leri</th>
                  </tr>
                </thead>
                <tbody>
                  {sentQuotes
                    .filter((q) => {
                      if (!query) return true;
                      const ql = query.toLowerCase();
                      return (
                        (q.belgeNo || '').toLowerCase().includes(ql) ||
                        (q.customerName || '').toLowerCase().includes(ql) ||
                        (q.recipientEmail || '').toLowerCase().includes(ql) ||
                        (q.pdfFileName || '').toLowerCase().includes(ql)
                      );
                    })
                    .map((quote) => (
                    <tr key={quote.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-slate-400" />
                          <span className="text-sm">{formatDate(quote.sentAt)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="badge badge-primary badge-outline">
                          {quote.belgeNo || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          <span className="font-medium">{quote.customerName || '-'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-slate-400" />
                          <span className="text-sm">{quote.recipientEmail || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-slate-400" />
                          <span className="text-sm font-mono text-slate-600">
                            {quote.pdfFileName || 'N/A'}
                          </span>
                          {quote.pdfFileName && (
                            <div className="ml-4 flex items-center gap-2">
                              <button
                                className="btn btn-xs btn-outline"
                                onClick={() => {
                                  const url = buildApiUrl(`servicerecords/bulkquote/exports/${encodeURIComponent(quote.pdfFileName)}`);
                                  // Open in new tab/window; server will serve inline PDF
                                  window.open(url, '_blank');
                                }}
                              >
                                Görüntüle
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-slate-500">
                          {quote.serviceRecordIds || 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* PDF viewer modal */}
      {selectedPdf && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white w-[90%] h-[90%] rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="font-semibold">{selectedPdf.name}</div>
              <div className="flex items-center gap-2">
                <a
                  className="btn btn-sm btn-outline"
                  href={selectedPdf.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in new tab
                </a>
                <button className="btn btn-sm" onClick={() => setSelectedPdf(null)}>Kapat</button>
              </div>
            </div>
            <div className="w-full h-full">
              <iframe title={selectedPdf.name} src={selectedPdf.url} className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
