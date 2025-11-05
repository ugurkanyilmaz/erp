import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { CheckCircle } from 'lucide-react';
import serviceApi from '../hooks/serviceApi';

export default function CompletedServices() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const all = await serviceApi.getServiceRecords();
      // filter completed
      const done = (all || []).filter(r => (r.durum || '').toLowerCase().includes('tamam'));
      setRecords(done);
    } catch (err) {
      console.error('Could not load completed records', err);
    } finally { setLoading(false); }
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleString('tr-TR'); } catch { return d; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header title="Tamamlanan Servisler" subtitle="Arşivlenen tamamlanan servis kayıtları" IconComponent={CheckCircle} showBack={true} />
      <main className="w-full px-6 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Tamamlanan Servisler</h2>
            <div className="flex items-center gap-3">
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Ara: seri, firma, belge..." className="input input-sm input-bordered" />
              <button onClick={load} className="btn btn-sm btn-outline">Yenile</button>
            </div>
          </div>

          {loading && <div className="py-8 text-center">Yükleniyor...</div>}

          {!loading && records.length === 0 && <div className="py-8 text-center text-slate-600">Henüz tamamlanan servis kaydı yok.</div>}

          {!loading && records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Belge No</th>
                    <th>Servis Takip No</th>
                    <th>Firma</th>
                    <th>Tamamlanma</th>
                  </tr>
                </thead>
                <tbody>
                  {records.filter(r => {
                      if (!query) return true;
                      const q = query.toLowerCase();
                      return (r.belgeNo || '').toLowerCase().includes(q) || ((r.servisTakipNo || r.seriNo) || '').toLowerCase().includes(q) || (r.firmaIsmi || '').toLowerCase().includes(q);
                  }).map(r => (
                    <tr key={r.id}>
                      <td>{r.belgeNo || '-'}</td>
                      <td>{r.servisTakipNo || r.seriNo || '-'}</td>
                      <td>{r.firmaIsmi || '-'}</td>
                      <td>{formatDate(r.gelisTarihi || r.updatedAt || r.tarih)}</td>
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
