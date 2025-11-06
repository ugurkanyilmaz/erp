import React, { useState, useEffect, useRef } from 'react';
import useOutsideClick from '../hooks/useOutsideClick';
import stockApi from '../hooks/stockApi';
import { NavLink, useNavigate } from 'react-router-dom';
import { Link2, Plus, Search, Edit2, Trash2, AlertCircle, FileText, ChevronLeft, TrendingDown, TrendingUp } from 'lucide-react';

export default function StockParts() {
  const [showPartModal, setShowPartModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [yedekParcalar, setYedekParcalar] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [partForm, setPartForm] = useState({ id: null, sku: '', parcaNo: '', title: '', bagliUrun: '', productId: null, stok: '', minStok: '' });
  const [urunDropdownOpen, setUrunDropdownOpen] = useState(false);
  const urunDropdownRef = useRef(null);

  const q = (searchTerm || '').toLowerCase();
  const filteredYedekParcalar = yedekParcalar.filter(p => 
    (p.sku || '').toLowerCase().includes(q) ||
    (p.parcaNo || '').toLowerCase().includes(q) ||
    (p.title || '').toLowerCase().includes(q)
  );

  const getStokDurumu = (stok, minStok) => {
    if (stok <= minStok) return { label: 'Kritik', class: 'badge-error', icon: AlertCircle };
    if (stok <= minStok * 1.5) return { label: 'Düşük', class: 'badge-warning', icon: TrendingDown };
    return { label: 'Normal', class: 'badge-success', icon: TrendingUp };
  };

  const toplamParca = yedekParcalar.length;
  const kritikParca = yedekParcalar.filter(p => (p.stok ?? p.stock) <= (p.minStok ?? p.minStock)).length;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [parts, prods] = await Promise.all([stockApi.getSpareParts(), stockApi.getProducts()]);
        if (!mounted) return;
        setYedekParcalar(parts);
        setUrunler(prods);
      } catch (err) {
        console.error('Failed loading parts or products', err);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // close product dropdown when clicking outside
  useOutsideClick(urunDropdownRef, () => setUrunDropdownOpen(false));

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition" onClick={() => navigate('/') }>
              <ChevronLeft size={22} className="text-slate-700" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <Link2 size={22} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Stok - Yedek Parçalar</h1>
                <p className="text-xs text-slate-500">Yedek Parça Takibi</p>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium shadow-md hover:opacity-90 transition flex items-center gap-2">
            <FileText size={18} />
            Rapor Al
          </button>
        </div>
      </header>
      {/* Top nav: Products / Parts (keeps original UI buttons) */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-3">
          <NavLink
            to="/stock/products"
            className={({ isActive }) => `px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm flex items-center gap-2 ${isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            <Link2 size={18} />
            Ürünler
          </NavLink>
          <NavLink
            to="/stock/parts"
            className={({ isActive }) => `px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm flex items-center gap-2 ${isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            <Link2 size={18} />
            Yedek Parçalar
          </NavLink>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
                <div className="relative" ref={urunDropdownRef}>
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="SKU, Parça No veya Başlık ara..." 
                className="input input-bordered w-80 pl-10 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center gap-2"
              onClick={() => setShowPartModal(true)}
            >
              <Plus size={18} />
              Yeni Yedek Parça Ekle
            </button>
          </div>

          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm">
                    <th className="font-semibold">SKU</th>
                    <th className="font-semibold">Parça No</th>
                    <th className="font-semibold">Başlık</th>
                    <th className="font-semibold">Bağlı Ürün</th>
                    <th className="font-semibold">Stok</th>
                    <th className="font-semibold">Min. Stok</th>
                    <th className="font-semibold">Durum</th>
                    <th className="font-semibold text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredYedekParcalar.map((parca) => {
                    const durum = getStokDurumu(parca.stok, parca.minStok);
                    const DurumIcon = durum.icon;
                    return (
                      <tr key={parca.id} className="hover:bg-slate-50 transition-colors">
                        <td className="font-semibold text-violet-600">{parca.sku}</td>
                        <td className="font-medium">{parca.parcaNo}</td>
                        <td>{parca.title}</td>
                        <td>
                          {parca.bagliUrun ? (
                            <div className="badge badge-outline badge-info gap-1">
                              <Link2 size={12} />
                              {parca.bagliUrun}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">Bağımsız</span>
                          )}
                        </td>
                        <td>
                          <span className="font-bold text-lg">{parca.stok}</span>
                        </td>
                        <td className="text-slate-600">{parca.minStok}</td>
                        <td>
                          <div className={`badge ${durum.class} gap-1`}>
                            <DurumIcon size={14} />
                            {durum.label}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              className="btn btn-sm btn-ghost btn-square hover:bg-blue-50 hover:text-blue-600 transition"
                              onClick={() => {
                                // populate form for edit
                                setPartForm({
                                  id: parca.id,
                                  sku: parca.sku || '',
                                  parcaNo: parca.parcaNo || '',
                                  title: parca.title || '',
                                  bagliUrun: parca.bagliUrun || (parca.product?.sku ?? ''),
                                  productId: parca.productId ?? parca.product?.id ?? null,
                                  stok: parca.stok ?? parca.stock ?? 0,
                                  minStok: parca.minStok ?? parca.minStock ?? 0,
                                });
                                setShowPartModal(true);
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn btn-sm btn-ghost btn-square hover:bg-red-50 hover:text-red-600 transition"
                              onClick={async () => {
                                if (!confirm('Bu yedek parçayı silmek istediğinize emin misiniz?')) return;
                                try {
                                  await stockApi.deleteSparePart(parca.id);
                                  const parts = await stockApi.getSpareParts();
                                  setYedekParcalar(parts);
                                } catch (err) {
                                  console.error('Failed to delete spare part', err);
                                  alert('Yedek parça silinemedi. Konsolu kontrol edin.');
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showPartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="font-bold text-2xl mb-6 text-slate-800">Yeni Yedek Parça Ekle</h3>
              <div className="space-y-4">
                {partForm.bagliUrun ? (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700">Bağlı Ürün SKU</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered rounded-xl bg-slate-50 cursor-not-allowed"
                      value={partForm.bagliUrun}
                      disabled
                    />
                    <label className="label">
                      <span className="label-text-alt text-slate-500">Bu parça seçili ürüne ait SKU'yu kullanır.</span>
                    </label>
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700">SKU (Opsiyonel)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="YP-2024-005" 
                      className="input input-bordered rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={partForm.sku}
                      onChange={(e) => setPartForm({...partForm, sku: e.target.value})}
                    />
                    <label className="label">
                      <span className="label-text-alt text-slate-500">Bir ürüne bağlı değilse parça SKU'su girin.</span>
                    </label>
                  </div>
                )}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700">Parça No</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="SEAL-25" 
                    className="input input-bordered rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={partForm.parcaNo}
                    onChange={(e) => setPartForm({...partForm, parcaNo: e.target.value})}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700">Başlık</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Yedek parça başlığı" 
                    className="input input-bordered rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={partForm.title}
                    onChange={(e) => setPartForm({...partForm, title: e.target.value})}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700">Bağlı Ürün SKU (Opsiyonel)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input input-bordered rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Ürün adını ya da SKU'sunu yazın veya seçin"
                      value={partForm.bagliUrun}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = urunler.find(u => (u.sku || '').toLowerCase() === (val || '').toLowerCase() || (u.title || '').toLowerCase() === (val || '').toLowerCase());
                        if (match) setPartForm({...partForm, bagliUrun: val, sku: match.sku, productId: match.id});
                        else setPartForm({...partForm, bagliUrun: val, sku: '' , productId: null});
                        setUrunDropdownOpen(true);
                      }}
                      onFocus={() => setUrunDropdownOpen(true)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setUrunDropdownOpen(false); }}
                    />

                    {urunDropdownOpen && (
                      (() => {
                        const q = (partForm.bagliUrun || '').toLowerCase();
                        const matches = urunler.filter(u => (
                          (u.sku || '').toLowerCase().includes(q) || (u.title || '').toLowerCase().includes(q)
                        )).slice(0, 50);
                        return (
                          <ul className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-auto z-50">
                            {matches.length ? matches.map(u => (
                              <li
                                key={u.id}
                                className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                                onMouseDown={(ev) => {
                                    ev.preventDefault();
                                    setPartForm({...partForm, bagliUrun: u.sku || u.title, sku: u.sku, productId: u.id});
                                    setUrunDropdownOpen(false);
                                  }}
                              >
                                <div className="font-medium">{u.sku}</div>
                                <div className="text-xs text-slate-500">{u.title}</div>
                              </li>
                            )) : (
                              <li className="px-4 py-2 text-slate-500 text-sm">Eşleşen ürün yok</li>
                            )}
                          </ul>
                        );
                      })()
                    )}
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-slate-500">Ürün seçerseniz parça SKU otomatik atanır. Bağımsız ise manuel SKU girin.</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700">Stok Miktarı</span>
                    </label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="input input-bordered rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={partForm.stok}
                      onChange={(e) => setPartForm({...partForm, stok: e.target.value})}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700">Minimum Stok</span>
                    </label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="input input-bordered rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={partForm.minStok}
                      onChange={(e) => setPartForm({...partForm, minStok: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition" onClick={() => setShowPartModal(false)}>İptal</button>
                <button
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md hover:opacity-90 transition"
                  onClick={async () => {
                    try {
                      const payload = {
                        id: partForm.id ?? undefined,
                        sku: partForm.sku || null,
                        partNumber: partForm.parcaNo || null,
                        title: partForm.title || null,
                        productId: partForm.productId ?? null,
                        stock: Number(partForm.stok || 0),
                        minStock: Number(partForm.minStok || 0),
                      };
                      if (partForm.id) {
                        await stockApi.updateSparePart(partForm.id, payload);
                      } else {
                        await stockApi.createSparePart(payload);
                      }
                      const parts = await stockApi.getSpareParts();
                      setYedekParcalar(parts);
                      setShowPartModal(false);
                      setPartForm({ id: null, sku: '', parcaNo: '', title: '', bagliUrun: '', productId: null, stok: '', minStok: '' });
                    } catch (err) {
                      console.error('Failed to save spare part', err);
                      alert('Yedek parça kaydedilemedi. Konsolu kontrol edin.');
                    }
                  }}
                >Kaydet</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
