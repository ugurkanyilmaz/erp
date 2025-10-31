import React, { useState, useEffect } from "react";
import {
  Plus,
  X,
  Search,
  Calendar,
  User,
  FileText,
  Wrench,
  Package,
  DollarSign,
  ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import api from '../hooks/api';
import serviceApi from '../hooks/serviceApi';
import Notification from '../components/Notification';

export default function ServisTakip() {
  const [activeTab, setActiveTab] = useState("liste");
  const [yeniKayit, setYeniKayit] = useState({
    seriNo: "",
    urunModeli: "",
    firmaIsmi: "",
    gelisTarihi: "",
    belgeNo: "",
    alanKisi: "",
  });

  const [islemEkleme, setIslemEkleme] = useState({
    islemBitisTarihi: "",
    yapanKisi: "",
    changedParts: [],
    serviceItems: [],
  });

  const [yeniParca, setYeniParca] = useState({ partName: "", quantity: 1 });
  // hizmet now only stores name when creating; price is managed in Muhasebe
  const [yeniHizmet, setYeniHizmet] = useState({ name: "" });

  const [servisKayitlari, setServisKayitlari] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [notification, setNotification] = useState({ type: '', message: '' });
  // operations loaded for muhasebe editing
  const [accountingOperations, setAccountingOperations] = useState([]);

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    try {
      const data = await serviceApi.getServiceRecords();
      setServisKayitlari(data || []);
      setNotification({ type: 'success', message: 'Kayıtlar yüklendi.' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Kayıtlar yüklenirken hata oluştu.' });
    }
  }

  const parcaEkle = () => {
    if (yeniParca.partName && yeniParca.quantity > 0) {
      setIslemEkleme({
        ...islemEkleme,
        changedParts: [...islemEkleme.changedParts, { ...yeniParca }],
      });
      setYeniParca({ partName: "", quantity: 1 });
    }
  };

  const hizmetEkle = () => {
    if (yeniHizmet.name) {
      setIslemEkleme({
        ...islemEkleme,
        serviceItems: [...islemEkleme.serviceItems, { name: yeniHizmet.name }],
      });
      setYeniHizmet({ name: "" });
    }
  };

  const parcaSil = (index) => {
    setIslemEkleme({
      ...islemEkleme,
      changedParts: islemEkleme.changedParts.filter((_, i) => i !== index),
    });
  };

  const hizmetSil = (index) => {
    setIslemEkleme({
      ...islemEkleme,
      serviceItems: islemEkleme.serviceItems.filter((_, i) => i !== index),
    });
  };

  // Handlers to create records and operations
  const createRecord = async () => {
    try {
      const payload = {
        seriNo: yeniKayit.seriNo,
        urunModeli: yeniKayit.urunModeli,
        firmaIsmi: yeniKayit.firmaIsmi,
        gelisTarihi: yeniKayit.gelisTarihi,
        belgeNo: yeniKayit.belgeNo,
        alanKisi: yeniKayit.alanKisi,
        durum: 'Kayıt Alındı',
      };
      const created = await serviceApi.createServiceRecord(payload);
      setYeniKayit({ seriNo: '', urunModeli: '', firmaIsmi: '', gelisTarihi: '', belgeNo: '', alanKisi: '' });
      // append to list
      setServisKayitlari(prev => [created, ...prev]);
      setActiveTab('liste');
      setNotification({ type: 'success', message: 'Kayıt oluşturuldu.' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Kayıt oluşturulamadı.' });
    }
  };

  const createOperation = async (recordId) => {
    try {
      const payload = {
        islemBitisTarihi: islemEkleme.islemBitisTarihi,
        yapanKisi: islemEkleme.yapanKisi,
        changedParts: islemEkleme.changedParts,
        serviceItems: islemEkleme.serviceItems
      };
      const created = await serviceApi.createServiceOperation(recordId, payload);
      // clear form
      setIslemEkleme({ islemBitisTarihi: '', yapanKisi: '', changedParts: [], serviceItems: [] });
      setNotification({ type: 'success', message: 'İşlem kaydı oluşturuldu.' });
      return created;
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'İşlem oluşturulamadı.' });
    }
  }

  // detect roles from token to show Muhasebe tab only to admin/muhasebe
  const getRoles = () => {
    try {
      const t = localStorage.getItem('token');
      if (!t) return [];
      const p = JSON.parse(atob(t.split('.')[1]));
      const role = p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (!role) return [];
      if (Array.isArray(role)) return role;
      return [role];
    } catch (e) { return []; }
  };
  const roles = getRoles();

  // tabs: Liste, Yeni, İşlem Ekle (servis/muhasebe/admin), Muhasebe (muhasebe/admin empty)
  const tabs = [
    { key: "liste", label: "Servis Listesi" },
    { key: "yeni", label: "Yeni Kayıt" },
    ...(roles.includes('admin') || roles.includes('muhasebe') || roles.includes('servis') ? [{ key: "islemEkle", label: "İşlem Ekle" }] : []),
    ...(roles.includes('admin') || roles.includes('muhasebe') ? [{ key: "muhasebe", label: "Muhasebe" }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50">
      <Notification type={notification.type} message={notification.message} onClose={() => setNotification({ type: '', message: '' })} />
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ChevronLeft size={22} className="text-slate-700" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md">
                <Wrench size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">
                  Servis Takip
                </h1>
                <p className="text-xs text-slate-500">
                  Servis kayıtlarını kolayca yönetin
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* SERVIS LISTESI */}
          {activeTab === "liste" && (
            <motion.div
              key="liste"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white shadow-xl rounded-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-800">
                  Aktif Servis Kayıtları
                </h2>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-3 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Ara..."
                    className="input input-bordered w-64 pl-9 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr className="text-slate-500 text-sm">
                      <th>Seri No</th>
                      <th>Ürün Modeli</th>
                      <th>Firma</th>
                      <th>GelişTarihi</th>
                <th>Parça</th>
                <th>Hizmet</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servisKayitlari.map((kayit) => (
                      <tr
                        key={kayit.id}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="font-medium">{kayit.seriNo}</td>
                        <td>{kayit.urunModeli}</td>
                        <td>{kayit.firmaIsmi}</td>
                        <td>{kayit.gelisTarihi}</td>
                        <td>{(kayit.operations || kayit.operations?.length || 0) ? (kayit.operations||[]).reduce((s,o)=>s+(o.changedParts?.length||0),0) : 0}</td>
                        <td>{(kayit.operations || kayit.operations?.length || 0) ? (kayit.operations||[]).reduce((s,o)=>s+(o.serviceItems?.length||0),0) : 0}</td>
                        {/* Ücret gösterimi kaldırıldı */}
                        <td>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              kayit.durum === "Tamamlandı"
                                ? "bg-emerald-100 text-emerald-700"
                                : kayit.durum === "İşlemde"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {kayit.durum}
                          </span>
                        </td>
                        <td>
                          <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                            Detay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* YENI KAYIT */}
          {activeTab === "yeni" && (
            <motion.div
              key="yeni"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white shadow-xl rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-6">
                Yeni Servis Kaydı Oluştur
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  ["Seri No", "seriNo", "SN12345"],
                  ["Ürün Modeli", "urunModeli", "Model X"],
                  ["Firma İsmi", "firmaIsmi", "ACME Ltd."],
                  ["Belge No", "belgeNo", "AUTO-0001"],
                  ["Alan Kişi", "alanKisi", "Ahmet"],
                ].map(([label, key, placeholder]) => (
                  <div className="form-control mb-6" key={key}>
                    <label className="label text-sm font-semibold text-slate-700 mb-3">
                      {label}:
                    </label>
                    <input
                      type="text"
                      className="input input-bordered rounded-xl py-3 mt-2"
                      placeholder={placeholder}
                      value={yeniKayit[key]}
                      onChange={(e) =>
                        setYeniKayit({ ...yeniKayit, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}

                <div className="form-control mb-6">
                  <label className="label text-sm font-semibold text-slate-700 mb-3">
                    Geliş Tarihi:
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered rounded-xl mt-2"
                    value={yeniKayit.gelisTarihi}
                    onChange={(e) =>
                      setYeniKayit({
                        ...yeniKayit,
                        gelisTarihi: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

                <div className="flex justify-end gap-3 mt-8">
                <button className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                  İptal
                </button>
                <button onClick={createRecord} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-md hover:opacity-90 transition">
                  Kayıt Oluştur
                </button>
              </div>
            </motion.div>
          )}

          {/* ISLEM EKLE */}
          {activeTab === "islemEkle" && (
            <motion.div
              key="islemEkle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="bg-white shadow-xl rounded-2xl p-6">
                <h4 className="text-md font-semibold text-slate-800 mb-3">Kayıt Seç</h4>
                <select
                  className="select select-bordered w-full"
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                >
                  <option value="">-- Bir kayıt seçin --</option>
                  {servisKayitlari.map((r) => (
                    <option key={r.id} value={r.id}>{r.seriNo} — {r.firmaIsmi} — {r.urunModeli}</option>
                  ))}
                </select>
                {!selectedRecordId && (
                  <p className="text-sm text-slate-500 mt-2">İşlem eklemek için önce bir kayıt seçin.</p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Değişen Parçalar */}
                <div className="bg-white shadow-xl rounded-2xl p-6">
                  <h4 className="text-md font-semibold text-slate-800 mb-4">Değişen Parçalar</h4>

                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Parça adı"
                      className="input input-bordered flex-1 rounded-xl"
                      value={yeniParca.partName}
                      onChange={(e) => setYeniParca({ ...yeniParca, partName: e.target.value })}
                    />
                    <input
                      type="number"
                      min={1}
                      className="input input-bordered w-28 rounded-xl"
                      value={yeniParca.quantity}
                      onChange={(e) => setYeniParca({ ...yeniParca, quantity: Number(e.target.value) })}
                    />
                    <button onClick={parcaEkle} className="btn btn-primary" disabled={!selectedRecordId}>Ekle</button>
                  </div>

                  <ul className="divide-y">
                    {islemEkleme.changedParts.length === 0 && (
                      <li className="text-sm text-slate-500 py-2">Henüz parça eklenmedi.</li>
                    )}
                    {islemEkleme.changedParts.map((p, idx) => (
                      <li key={idx} className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium">{p.partName}</div>
                          <div className="text-xs text-slate-500">Adet: {p.quantity}</div>
                        </div>
                        <div>
                          <button onClick={() => parcaSil(idx)} className="btn btn-ghost btn-sm">
                            <X size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hizmetler (fiyat kaldırıldı) */}
                <div className="bg-white shadow-xl rounded-2xl p-6">
                  <h4 className="text-md font-semibold text-slate-800 mb-4">Hizmetler</h4>

                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Hizmet adı"
                      className="input input-bordered flex-1 rounded-xl"
                      value={yeniHizmet.name}
                      onChange={(e) => setYeniHizmet({ ...yeniHizmet, name: e.target.value })}
                    />
                    <button onClick={hizmetEkle} className="btn btn-primary" disabled={!selectedRecordId}>Ekle</button>
                  </div>

                  <ul className="divide-y">
                    {islemEkleme.serviceItems.length === 0 && (
                      <li className="text-sm text-slate-500 py-2">Henüz hizmet eklenmedi.</li>
                    )}
                    {islemEkleme.serviceItems.map((s, idx) => (
                      <li key={idx} className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium">{s.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => hizmetSil(idx)} className="btn btn-ghost btn-sm">
                            <X size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Save operation button */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={async () => { if (selectedRecordId) await createOperation(selectedRecordId); }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-md hover:opacity-90 transition"
                  disabled={!selectedRecordId}
                >
                  Kaydet (İşlem Ekle)
                </button>
              </div>
            </motion.div>
          )}

          {/* MUHASEBE */}
          {activeTab === "muhasebe" && (
            <motion.div
              key="muhasebe"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white shadow-xl rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Muhasebe</h2>

              {/* Select record to show operations/prices */}
              <div className="mb-6">
                <label className="label text-sm font-semibold text-slate-700 mb-2">Kayıt seç:</label>
                <select
                  className="select select-bordered w-full"
                  value={selectedRecordId}
                  onChange={async (e) => {
                    const id = e.target.value;
                    setSelectedRecordId(id);
                    if (id) {
                      try {
                        const ops = await serviceApi.getServiceOperations(id);
                        // attach local editable copies
                        setAccountingOperations(ops || []);
                        setNotification({ type: 'success', message: 'İşlemler yüklendi.' });
                      } catch (err) {
                        console.error(err);
                        setNotification({ type: 'error', message: 'İşlemler yüklenirken hata.' });
                      }
                    } else {
                      setAccountingOperations([]);
                    }
                  }}
                >
                  <option value="">-- Bir kayıt seçin --</option>
                  {servisKayitlari.map((r) => (
                    <option key={r.id} value={r.id}>{r.seriNo} — {r.firmaIsmi} — {r.urunModeli}</option>
                  ))}
                </select>
              </div>

              {/* Operations list with editable prices */}
              <div className="space-y-4">
                {accountingOperations.length === 0 && (
                  <p className="text-sm text-slate-500">Seçili kayıt için işlem bulunamadı veya henüz yüklenmedi.</p>
                )}

                {accountingOperations.map((op, opIdx) => (
                  <div key={op.id} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">İşlem #{op.id}</div>
                        <div className="text-xs text-slate-500">Yapan: {op.yapanKisi || '-'} — Tarih: {op.islemBitisTarihi || '-'}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await serviceApi.updateServiceOperation(selectedRecordId, op.id, op);
                              setNotification({ type: 'success', message: 'Fiyatlar kaydedildi.' });
                            } catch (err) {
                              console.error(err);
                              setNotification({ type: 'error', message: 'Kaydetme hatası.' });
                            }
                          }}
                          className="btn btn-sm btn-primary"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>

                    {/* Changed parts */}
                    <div className="mt-3">
                      <div className="text-sm font-semibold mb-2">Değişen Parçalar</div>
                      {(!op.changedParts || op.changedParts.length === 0) && <div className="text-xs text-slate-500">Parça yok.</div>}
                      <ul className="divide-y">
                        {(op.changedParts || []).map((p, pIdx) => (
                          <li key={p.id ?? pIdx} className="py-2 flex items-center justify-between">
                            <div>
                              <div className="font-medium">{p.partName}</div>
                              <div className="text-xs text-slate-500">Adet: {p.quantity}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                className="input input-bordered w-32"
                                value={p.price ?? 0}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value || 0) || 0;
                                  setAccountingOperations((prev) => {
                                    const copy = [...prev];
                                    copy[opIdx] = { ...copy[opIdx] };
                                    copy[opIdx].changedParts = (copy[opIdx].changedParts || []).map((cp, i) => i === pIdx ? { ...cp, price: v } : cp);
                                    return copy;
                                  });
                                }}
                              />
                              <span className="text-sm">₺</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Service items */}
                    <div className="mt-3">
                      <div className="text-sm font-semibold mb-2">Hizmetler</div>
                      {(!op.serviceItems || op.serviceItems.length === 0) && <div className="text-xs text-slate-500">Hizmet yok.</div>}
                      <ul className="divide-y">
                        {(op.serviceItems || []).map((s, sIdx) => (
                          <li key={s.id ?? sIdx} className="py-2 flex items-center justify-between">
                            <div>
                              <div className="font-medium">{s.name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                className="input input-bordered w-32"
                                value={s.price ?? 0}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value || 0) || 0;
                                  setAccountingOperations((prev) => {
                                    const copy = [...prev];
                                    copy[opIdx] = { ...copy[opIdx] };
                                    copy[opIdx].serviceItems = (copy[opIdx].serviceItems || []).map((si, i) => i === sIdx ? { ...si, price: v } : si);
                                    return copy;
                                  });
                                }}
                              />
                              <span className="text-sm">₺</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Small component to list operations and edit prices (used in Muhasebe tab)
// Service operations list removed per request (pricing and operation UI moved to İşlem Ekle)
