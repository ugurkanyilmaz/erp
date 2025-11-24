import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { Users, Upload } from 'lucide-react';

export default function MusteriYonetimi() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
      setCustomers([]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchCustomers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      if (res.ok) {
        setName(''); setEmail('');
        fetchCustomers();
      } else {
        const txt = await res.text();
        alert('Hata: ' + txt);
      }
    } catch (err) {
      console.error(err);
      alert('İstek gönderilemedi');
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch('/api/customers/' + id, { method: 'DELETE' });
      if (res.status === 204) fetchCustomers();
      else alert('Silme başarısız');
    } catch (err) {
      console.error(err);
      alert('İstek gönderilemedi');
    }
  }

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert('Lütfen bir dosya seçin');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch('/api/customers/bulk-upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        setUploadResult(result);
        setUploadFile(null);
        await fetchCustomers();
      } else {
        const error = await res.text();
        alert('Yükleme hatası: ' + error);
      }
    } catch (err) {
      console.error(err);
      alert('Dosya yüklenemedi');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header title="Müşteri Yönetimi" subtitle="Müşteri ekle, listele ve sil" IconComponent={Users} showBack={true} />

      <main className="w-full px-6 py-8">
        <div className="p-0">
          <h2 className="sr-only">Müşteri Yönetimi</h2>

          <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="input input-bordered" placeholder="Müşteri adı" value={name} onChange={e => setName(e.target.value)} />
            <input className="input input-bordered" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} />
            <div>
              <button className="btn btn-primary" type="submit">Ekle</button>
            </div>
            <div>
              <button type="button" className="btn btn-success gap-2" onClick={() => setBulkModalOpen(true)}>
                <Upload size={18} />
                Toplu Yükle
              </button>
            </div>
          </form>

          {loading ? (
            <div>Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ad</th>
                    <th>E-posta</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td>
                        <button className="btn btn-sm btn-error" onClick={() => handleDelete(c.id)}>Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Bulk Upload Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Toplu Müşteri Yükleme</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => { setBulkModalOpen(false); setUploadResult(null); }}>✕</button>
            </div>

            <div className="space-y-4">
              <div className="alert alert-info">
                <div>
                  <p className="font-semibold">Excel Formatı:</p>
                  <p className="text-sm">İlk sütun: <strong>Müşteri Adı</strong></p>
                  <p className="text-sm">İkinci sütun: <strong>E-posta</strong> (isteğe bağlı)</p>
                  <p className="text-sm mt-1">Excel'de ilk satır başlık olarak algılanır ve atlanır.</p>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Excel Dosyası Seçin (.xlsx, .xls)</span>
                </label>
                <input
                  type="file"
                  className="file-input file-input-bordered w-full"
                  accept=".xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
              </div>

              {uploadResult && (
                <div className={`alert ${uploadResult.errors?.length > 0 ? 'alert-warning' : 'alert-success'}`}>
                  <div>
                    <p className="font-semibold">Yükleme Tamamlandı!</p>
                    <p className="text-sm">✅ Eklenen: {uploadResult.added}</p>
                    <p className="text-sm">⚠️ Atlanan (zaten mevcut): {uploadResult.skipped}</p>
                    {uploadResult.errors?.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">Hatalar ({uploadResult.errors.length})</summary>
                        <ul className="text-xs mt-1 ml-4 list-disc">
                          {uploadResult.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button className="btn" onClick={() => { setBulkModalOpen(false); setUploadResult(null); }} disabled={uploading}>
                  Kapat
                </button>
                <button className="btn btn-primary" onClick={handleBulkUpload} disabled={!uploadFile || uploading}>
                  {uploading ? 'Yükleniyor...' : 'Yükle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
