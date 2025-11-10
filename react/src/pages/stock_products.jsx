import React, { useState, useEffect } from 'react';
import stockApi from '../hooks/stockApi';
import { NavLink, useNavigate } from 'react-router-dom';
import { Package, Plus, Search, Edit2, Trash2, FileText, AlertCircle, ChevronLeft, TrendingUp, TrendingDown, Upload } from 'lucide-react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

export default function StockProducts() {
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [urunler, setUrunler] = useState([]);
  const [yedekParcalar, setYedekParcalar] = useState([]);
  const [productForm, setProductForm] = useState({ id: null, sku: '', model: '', title: '', stok: '', minStok: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const navigate = useNavigate();

  const q = (searchTerm || '').toLowerCase();
  const filteredUrunler = urunler.filter(u => 
    (u.sku || '').toLowerCase().includes(q) ||
    (u.model || '').toLowerCase().includes(q) ||
    (u.title || '').toLowerCase().includes(q)
  );

  const getStokDurumu = (stok, minStok) => {
    if (stok <= minStok) return { label: 'Kritik', class: 'badge-error', icon: AlertCircle };
    if (stok <= minStok * 1.5) return { label: 'Düşük', class: 'badge-warning', icon: TrendingDown };
    return { label: 'Normal', class: 'badge-success', icon: TrendingUp };
  };

  const toplamUrun = urunler.length;
  const kritikUrun = urunler.filter(u => (u.stok ?? u.stock) <= (u.minStok ?? u.minStock)).length;

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Excel dosyası seçildi:', file.name);

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadMessage(null);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = buildApiUrl('stockimport/products');
      console.log('İstek gönderiliyor:', apiUrl);
      
      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Başarılı yanıt:', response.data);

      setUploadMessage({
        type: 'success',
        text: `İçe aktarma tamamlandı! ${response.data.imported} yeni ürün, ${response.data.updated} ürün güncellendi.`
      });

      // Refresh products list
      const prods = await stockApi.getProducts();
      setUrunler(prods);

      // Clear file input
      e.target.value = '';
    } catch (error) {
      console.error('Upload error detaylı:', error);
      console.error('Error response:', error.response);
      setUploadMessage({
        type: 'error',
        text: error.response?.data?.message || error.message || 'Excel yüklenirken hata oluştu.'
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMessage(null), 5000);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // load products and spare parts so we can show overall stock summary
        const [prods, parts] = await Promise.all([stockApi.getProducts(), stockApi.getSpareParts()]);
        if (!mounted) return;
        setUrunler(prods);
        setYedekParcalar(parts);
      } catch (err) {
        console.error('Failed loading stock data', err);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition" onClick={() => navigate('/') }>
              <ChevronLeft size={22} className="text-slate-700" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <Package size={22} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Stok - Ürünler</h1>
                <p className="text-xs text-slate-500">Ürün Takibi</p>
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
            <Package size={18} />
            Ürünler
          </NavLink>
          <NavLink
            to="/stock/parts"
            className={({ isActive }) => `px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm flex items-center gap-2 ${isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            <Package size={18} />
            Yedek Parçalar
          </NavLink>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Toplam Ürün</div>
                <div className="text-2xl font-bold text-slate-800">{toplamUrun}</div>
              </div>
              <div className="text-blue-500 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Package size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Kritik Ürünler</div>
                <div className="text-2xl font-bold text-rose-600">{kritikUrun}</div>
              </div>
              <div className="text-rose-500 w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center">
                <AlertCircle size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Yedek Parça</div>
                <div className="text-2xl font-bold text-slate-800">{yedekParcalar.length}</div>
                <div className="text-xs text-slate-500">Kritik: {yedekParcalar.filter(p => (p.stok ?? p.stock) <= (p.minStok ?? p.minStock)).length}</div>
              </div>
              <div className="text-slate-700 w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center">
                <Package size={22} />
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="SKU, Model veya Başlık ara..." 
                className="input input-bordered w-80 pl-10 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <label className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center gap-2 cursor-pointer">
                <Upload size={18} />
                {uploading ? 'Yükleniyor...' : 'Excel Aktar'}
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  className="hidden" 
                  onChange={handleExcelUpload}
                  disabled={uploading}
                />
              </label>
              <button 
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center gap-2"
                onClick={() => setShowProductModal(true)}
              >
                <Plus size={18} />
                Yeni Ürün Ekle
              </button>
            </div>
          </div>

          {uploadMessage && (
            <div className={`p-4 rounded-xl ${uploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {uploadMessage.text}
            </div>
          )}

          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm">
                    <th className="font-semibold">SKU</th>
                    <th className="font-semibold">Model</th>
                    <th className="font-semibold">Başlık</th>
                    <th className="font-semibold">Stok</th>
                    <th className="font-semibold">Min. Stok</th>
                    <th className="font-semibold">Durum</th>
                    <th className="font-semibold text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUrunler.map((urun) => {
                    const durum = getStokDurumu(urun.stok, urun.minStok);
                    const DurumIcon = durum.icon;
                    return (
                      <tr key={urun.id} className="hover:bg-slate-50 transition-colors">
                        <td className="font-semibold text-blue-600">{urun.sku}</td>
                        <td className="font-medium">{urun.model}</td>
                        <td>{urun.title}</td>
                        <td>
                          <span className="font-bold text-lg">{urun.stok}</span>
                        </td>
                        <td className="text-slate-600">{urun.minStok}</td>
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
                                setProductForm({
                                  id: urun.id,
                                  sku: urun.sku || '',
                                  model: urun.model || '',
                                  title: urun.title || '',
                                  stok: urun.stok ?? urun.stock ?? 0,
                                  minStok: urun.minStok ?? urun.minStock ?? 0,
                                });
                                setShowProductModal(true);
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn btn-sm btn-ghost btn-square hover:bg-red-50 hover:text-red-600 transition"
                              onClick={async () => {
                                if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
                                try {
                                  await stockApi.deleteProduct(urun.id);
                                  const prods = await stockApi.getProducts();
                                  setUrunler(prods);
                                } catch (err) {
                                  console.error('Failed to delete product', err);
                                  alert('Ürün silinemedi. Konsolu kontrol edin.');
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

        {showProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="font-bold text-2xl mb-6 text-slate-800">Yeni Ürün Ekle</h3>
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700">SKU</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="PN-2024-004" 
                    className="input input-bordered rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700">Başlık</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ürün başlığı" 
                    className="input input-bordered rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={productForm.title}
                    onChange={(e) => setProductForm({...productForm, title: e.target.value})}
                  />
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
                      value={productForm.stok}
                      onChange={(e) => setProductForm({...productForm, stok: e.target.value})}
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
                      value={productForm.minStok}
                      onChange={(e) => setProductForm({...productForm, minStok: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition" onClick={() => setShowProductModal(false)}>İptal</button>
                <button
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md hover:opacity-90 transition"
                  onClick={async () => {
                    try {
                      const payload = {
                        sku: productForm.sku || null,
                        title: productForm.title || null,
                        stock: Number(productForm.stok || 0),
                        minStock: Number(productForm.minStok || 0),
                      };
                      if (productForm.id) {
                        await stockApi.updateProduct(productForm.id, payload);
                      } else {
                        await stockApi.createProduct(payload);
                      }
                      const prods = await stockApi.getProducts();
                      setUrunler(prods);
                      setShowProductModal(false);
                      setProductForm({ id: null, sku: '', model: '', title: '', stok: '', minStok: '' });
                    } catch (err) {
                      console.error('Failed to save product', err);
                      alert('Ürün kaydedilemedi. Konsolu kontrol edin.');
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
