import React, { useState, useEffect } from 'react';
import { Package, Mail, Clock, User } from 'lucide-react';
import Header from '../components/Header';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

export default function ProductQuotesArchivePage() {
    const [sentQuotes, setSentQuotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');

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

    const filteredQuotes = sentQuotes
        .filter((q) => q.quoteType === 'Product') // Only product quotes
        .filter((q) => {
            if (!query) return true;
            const ql = query.toLowerCase();
            return (
                (q.belgeNo || '').toLowerCase().includes(ql) ||
                (q.customerName || '').toLowerCase().includes(ql) ||
                (q.recipientEmail || '').toLowerCase().includes(ql)
            );
        });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Header title="Ürün Teklifleri Arşivi" subtitle="Gönderilmiş ürün fiyat teklifleri" IconComponent={Package} showNew={false} showSearch={true} showBack={true} />

            <main className="w-full px-6 py-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">Ürün Teklifleri</h2>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Ara: belge no, müşteri, e-posta..."
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

                    {!loading && filteredQuotes.length === 0 && (
                        <div className="text-center py-12">
                            <Package size={48} className="mx-auto text-slate-300 mb-4" />
                            <div className="text-lg text-slate-600">Henüz gönderilen ürün teklifi yok</div>
                        </div>
                    )}

                    {!loading && filteredQuotes.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Teklif No</th>
                                        <th>Müşteri</th>
                                        <th>E-posta</th>
                                        <th>PDF Dosyası</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQuotes.map((quote) => (
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
                                                    <Package size={16} className="text-slate-400" />
                                                    <span className="text-sm font-mono text-slate-600">
                                                        {quote.pdfFileName || 'N/A'}
                                                    </span>
                                                    {quote.pdfFileName && (
                                                        <div className="ml-4">
                                                            <button
                                                                className="btn btn-xs btn-outline"
                                                                onClick={() => {
                                                                    // PDFs in uploads folder
                                                                    const url = buildApiUrl(`uploads/${encodeURIComponent(quote.pdfFileName)}`);
                                                                    window.open(url, '_blank');
                                                                }}
                                                            >
                                                                Görüntüle
                                                            </button>
                                                        </div>
                                                    )}
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
        </div>
    );
}
