import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { Users } from 'lucide-react';

export default function MusteriYonetimi() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <Header title="Müşteri Yönetimi" subtitle="Müşteri ekle, listele ve sil" IconComponent={Users} showBack={true} />

      <main className="w-full px-6 py-8">
        <div className="p-0">
          <h2 className="sr-only">Müşteri Yönetimi</h2>

          <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="input input-bordered" placeholder="Müşteri adı" value={name} onChange={e => setName(e.target.value)} />
        <input className="input input-bordered" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} />
        <div>
          <button className="btn btn-primary" type="submit">Ekle</button>
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
    </div>
  );
}
