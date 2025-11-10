import React, { useEffect, useState, useRef } from 'react';
import Header from '../components/Header';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config/api';

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

export default function SettingsEmail() {
  // Use Vite env var to allow different backend ports in dev/prod
  const API_BASE = API_BASE_URL;
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const nameRef = useRef();
  const hostRef = useRef();
  const portRef = useRef();
  const userRef = useRef();
  const passRef = useRef();
  const fromRef = useRef();
  const tlsRef = useRef();

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError('');
  const res = await fetch(`${API_BASE}/api/settings/emailaccounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data || []);
      } else {
        setError(`Hesaplar yüklenemedi: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      setError(`Bağlantı hatası: ${e.message}`);
      console.error('Load accounts failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const addAccount = () => {
    const name = (nameRef.current?.value || '').trim();
    const host = (hostRef.current?.value || '').trim();
    const port = parseInt(portRef.current?.value || '587', 10) || 587;
    const user = (userRef.current?.value || '').trim();
    const pass = (passRef.current?.value || '').trim();
    const from = (fromRef.current?.value || '').trim();
    const tls = !!tlsRef.current?.checked;
    if (!name || !host || !from) {
      alert('Lütfen en azından bir isim, SMTP host ve From adresi girin.');
      return;
    }
    
    // Encode password as base64 for backend compatibility
    const encodedPass = pass ? btoa(pass) : '';
    
    const a = { name, host, port, userName: user, encryptedPassword: encodedPass, fromAddress: from, useTls: tls, isActive: false };
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/emailaccounts`, { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }, 
          body: JSON.stringify(a) 
        });
        
        if (res.ok) {
          const created = await res.json();
          alert('E-posta hesabı başarıyla veritabanına kaydedildi!');
          await loadAccounts(); // Reload from DB
        } else {
          const errText = await res.text();
          alert(`Hata: ${res.status} - ${errText}`);
        }
      } catch (e) { 
        console.error('Could not save email account', e);
        alert(`Kaydetme hatası: ${e.message}`);
      }
    })();
    
    // clear form
    nameRef.current.value = '';
    hostRef.current.value = '';
    portRef.current.value = '587';
    userRef.current.value = '';
    passRef.current.value = '';
    fromRef.current.value = '';
    tlsRef.current.checked = true;
  };

  const removeAccount = (id) => {
    if (!confirm('Bu e-posta hesabını silmek istediğinize emin misiniz?')) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/emailaccounts/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (res.ok || res.status === 204) {
          await loadAccounts();
          alert('Hesap silindi.');
        } else {
          alert(`Silme hatası: ${res.status}`);
        }
      } catch (e) { 
        alert(`Hata: ${e.message}`);
      }
    })();
  };

  const setActive = (id) => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/emailaccounts/${id}/activate`, { 
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (res.ok) {
          await loadAccounts();
          alert('Hesap aktif edildi.');
        } else {
          alert(`Aktivasyon hatası: ${res.status}`);
        }
      } catch (e) { 
        alert(`Hata: ${e.message}`);
      }
    })();
  };

  const editAccount = async (id) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    const name = prompt('İsim', acc.name);
    if (name === null) return;
    const host = prompt('SMTP Host', acc.host);
    if (host === null) return;
    const port = prompt('Port', String(acc.port || 587));
    if (port === null) return;
    const from = prompt('From adresi', acc.fromAddress);
    if (from === null) return;
    
    const payload = { ...acc, name: name.trim() || acc.name, host: host.trim() || acc.host, port: Number(port) || acc.port, fromAddress: from.trim() || acc.fromAddress };
    try {
      const res = await fetch(`${API_BASE}/api/settings/emailaccounts/${id}`, { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }, 
        body: JSON.stringify(payload) 
      });
      if (res.ok) {
        await loadAccounts();
        alert('Hesap güncellendi.');
      } else {
        alert(`Güncelleme hatası: ${res.status}`);
      }
    } catch (e) { 
      alert(`Hata: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Header title="Ayarlar" subtitle="E-Posta Hesapları" IconComponent={Settings} showBack={true} />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">E-Posta Hesapları</h2>
            <p className="text-sm text-slate-500">Teklif gönderirken kullanılacak e-posta hesaplarını buradan ekleyin. Bir hesabı aktif yaparsanız o an kullanılacak olan o olacaktır.</p>
            {/* backend warning removed per request */}
          </div>
          <div>
            <Link to="/settings" className="text-sm text-slate-500">← Ayarlar</Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
            <div><strong>Hata:</strong> {error}</div>
            <div className="mt-2">
              <button onClick={loadAccounts} className="underline text-sm">Yeniden Dene</button>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-4">
            Hesaplar yükleniyor...
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="font-semibold mb-3">Yeni E-Posta Hesabı Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input ref={nameRef} className="input input-bordered" placeholder="Görünen İsim (Örn: Firma - Teklif)" />
            <input ref={fromRef} className="input input-bordered" placeholder="From adresi (örn: teklif@firma.com)" />
            <input ref={hostRef} className="input input-bordered" placeholder="SMTP Host (örn: smtp.mail.com)" />
            <input ref={portRef} className="input input-bordered" placeholder="Port" defaultValue="587" />
            <input ref={userRef} className="input input-bordered" placeholder="SMTP Kullanıcı Adı" />
            <input ref={passRef} type="password" className="input input-bordered" placeholder="SMTP Parolası" />
            <label className="flex items-center gap-2"><input ref={tlsRef} type="checkbox" defaultChecked /> TLS/STARTTLS kullan</label>
            <div className="flex items-center justify-end">
              <button className="btn btn-primary" onClick={addAccount}>Hesap Ekle</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Tanımlı Hesaplar ({accounts.length})</h3>
            <button onClick={loadAccounts} className="btn btn-ghost btn-sm">🔄 Yenile</button>
          </div>
          {loading ? <div className="text-sm text-slate-500">Yükleniyor...</div> : (
            <ul className="divide-y">
              {accounts.length === 0 && <li className="py-4 text-sm text-slate-500">Henüz hesap eklenmemiş. Yukarıdaki formu kullanarak bir e-posta hesabı ekleyin.</li>}
              {accounts.map(acc => (
                <li key={acc.id} className="py-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={!!acc.isActive} onChange={() => setActive(acc.id)} />
                      <div>
                        <div className="font-medium">{acc.name} {acc.isActive ? <span className="text-xs text-green-600 ml-2">(Aktif)</span> : null}</div>
                        <div className="text-xs text-slate-500">{acc.fromAddress} — {acc.host}:{acc.port} {acc.useTls ? 'TLS' : ''}</div>
                        {acc.userName && <div className="text-xs text-slate-400">Kullanıcı: {acc.userName}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-ghost btn-sm text-blue-600" 
                      onClick={async () => {
                        try {
                          // Call diagnose endpoint for detailed step-by-step diagnostics
                          const res = await fetch(`${API_BASE}/api/settings/emailaccounts/${acc.id}/diagnose`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
                          });
                          const data = await res.json();
                          
                          // Build a detailed message from diagnostic results
                          let message = '';
                          if (data.overallSuccess) {
                            message = '✅ Bağlantı Başarılı!\n\n' + data.summary;
                          } else {
                            message = '❌ Bağlantı Tanılama Sonuçları:\n\n';
                            
                            if (data.tcpSuccess) {
                              message += '✓ TCP bağlantısı başarılı\n';
                            } else {
                              message += '✗ TCP bağlantısı: ' + (data.tcpError || 'Bilinmeyen hata') + '\n';
                            }
                            
                            if (data.sslSuccess) {
                              message += '✓ SSL/TLS handshake başarılı\n';
                            } else if (data.tcpSuccess) {
                              message += '✗ SSL/TLS handshake: ' + (data.sslError || 'Bilinmeyen hata') + '\n';
                            }
                            
                            if (data.authSuccess) {
                              message += '✓ SMTP kimlik doğrulama başarılı\n';
                            } else if (data.sslSuccess) {
                              message += '✗ SMTP kimlik doğrulama: ' + (data.authError || 'Bilinmeyen hata') + '\n';
                            }
                            
                            message += '\nÖzet: ' + (data.summary || 'Bağlantı başarısız');
                          }
                          
                          alert(message);
                        } catch (e) {
                          alert('❌ Test hatası: ' + e.message);
                        }
                      }}
                    >
                      Test Bağlantı
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => editAccount(acc.id)}>Düzenle</button>
                    <button className="btn btn-ghost btn-sm text-rose-600" onClick={() => removeAccount(acc.id)}>Sil</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
