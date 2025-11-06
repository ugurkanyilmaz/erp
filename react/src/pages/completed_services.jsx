import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import ServiceRecordDetailsModal from '../components/ServiceRecordDetailsModal';
import { CheckCircle } from 'lucide-react';
import serviceApi from '../hooks/serviceApi';

export default function CompletedServices() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsData, setDetailsData] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Load archived/completed records from the new endpoint
      const all = await serviceApi.getCompletedServiceRecords();
      setRecords(all || []);
    } catch (err) {
      console.error('Could not load completed records', err);
    } finally { setLoading(false); }
  };

  const openDetails = async (archiveId) => {
    try {
      setLoading(true);
      const d = await serviceApi.getCompletedServiceRecordDetails(archiveId);
      setDetailsData(d || null);
      setDetailsVisible(true);
    } catch (err) {
      console.error('Could not load details', err);
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.filter(r => {
                      if (!query) return true;
                      const q = query.toLowerCase();
                      const belge = (r.belgeNo || r.BelgeNo || '').toString();
                      const takip = (r.servisTakipNo || r.ServisTakipNo || r.seriNo || r.SeriNo || '').toString();
                      const firma = (r.firmaIsmi || r.FirmaIsmi || '').toString();
                      return belge.toLowerCase().includes(q) || takip.toLowerCase().includes(q) || firma.toLowerCase().includes(q);
                  }).map(r => (
                    <tr key={r.id}>
                      <td>{(r.belgeNo || r.BelgeNo) || '-'}</td>
                      <td>{(r.servisTakipNo || r.ServisTakipNo || r.seriNo || r.SeriNo) || '-'}</td>
                      <td>{(r.firmaIsmi || r.FirmaIsmi) || '-'}</td>
                      <td>{formatDate(r.completedAt || r.CompletedAt || r.gelisTarihi)}</td>
                      <td>
                        <button className="btn btn-xs btn-outline" onClick={() => openDetails(r.id)}>Detay</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <ServiceRecordDetailsModal visible={detailsVisible} onClose={() => setDetailsVisible(false)} data={detailsData} />
    </div>
  );
}
