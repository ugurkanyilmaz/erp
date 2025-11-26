import React, { useEffect, useState } from 'react';
import { ShoppingCart, Search, Plus, RotateCcw, History, User, Building, Package as PackageIcon, Calendar } from 'lucide-react';
import Header from '../components/Header';
import salesDemoApi from '../hooks/salesDemoApi';
import stockApi from '../hooks/stockApi';
import customerApi from '../hooks/customerApi';
import Notification from '../components/Notification';

export default function SalesDemo() {
    const [activeTab, setActiveTab] = useState('active'); // active, history, new
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [activeRecords, setActiveRecords] = useState([]);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ type: '', message: '' });

    // Form state
    const [selectedProduct, setSelectedProduct] = useState('');
    const [targetCompany, setTargetCompany] = useState('');
    const [notes, setNotes] = useState('');
    const [salesPersonId, setSalesPersonId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    // User role check
    const [userRole, setUserRole] = useState('');
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
                const name = payload['unique_name'] || payload['sub'] || payload['name'];
                setUserRole(Array.isArray(role) ? role[0] : role); // simple check
                setUserName(name);
            } catch (e) {
                console.error(e);
            }
        }
        loadProducts();
        loadCustomers();
        loadActiveRecords();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistoryRecords();
        }
    }, [activeTab]);

    const loadProducts = async () => {
        try {
            const data = await stockApi.getProducts();
            setProducts(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadCustomers = async () => {
        try {
            const data = await customerApi.getCustomers();
            setCustomers(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadActiveRecords = async () => {
        setLoading(true);
        try {
            const data = await salesDemoApi.getActiveRecords();
            setActiveRecords(data || []);
        } catch (err) {
            setNotification({ type: 'error', message: 'Aktif kayıtlar yüklenemedi' });
        } finally {
            setLoading(false);
        }
    };

    const loadHistoryRecords = async () => {
        setLoading(true);
        try {
            const data = await salesDemoApi.getHistoryRecords();
            setHistoryRecords(data || []);
        } catch (err) {
            setNotification({ type: 'error', message: 'Geçmiş kayıtlar yüklenemedi' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !targetCompany) {
            setNotification({ type: 'error', message: 'Lütfen ürün ve firma seçin' });
            return;
        }

        try {
            await salesDemoApi.takeProduct({
                productId: parseInt(selectedProduct),
                targetCompany,
                notes,
                salesPersonId: salesPersonId || undefined // Backend handles default if empty for sales users
            });
            setNotification({ type: 'success', message: 'Ürün çıkışı yapıldı' });
            // Reset form
            setSelectedProduct('');
            setTargetCompany('');
            setCustomerSearchTerm('');
            setNotes('');
            setActiveTab('active');
            loadActiveRecords();
        } catch (err) {
            setNotification({ type: 'error', message: 'İşlem başarısız oldu' });
        }
    };

    const handleReturn = async (id) => {
        if (!window.confirm('Bu ürünü iade almak istediğinize emin misiniz?')) return;
        try {
            await salesDemoApi.returnProduct(id);
            setNotification({ type: 'success', message: 'Ürün iade alındı' });
            loadActiveRecords();
        } catch (err) {
            setNotification({ type: 'error', message: 'İade işlemi başarısız' });
        }
    };

    const handleSell = async (id) => {
        if (!window.confirm('Bu ürünün satıldığını onaylıyor musunuz?')) return;
        try {
            await salesDemoApi.sellProduct(id);
            setNotification({ type: 'success', message: 'Ürün satıldı olarak işaretlendi' });
            loadActiveRecords();
        } catch (err) {
            setNotification({ type: 'error', message: 'Satış işlemi başarısız' });
        }
    };

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <Header title="Satış Demo Takip" subtitle="Demo ürün takibi ve yönetimi" IconComponent={ShoppingCart} showBack={true} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Tabs */}
                <div className="flex space-x-4 mb-8">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'active'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        <PackageIcon size={18} className="mr-2" />
                        Aktif Demolar
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'new'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        <Plus size={18} className="mr-2" />
                        Yeni Çıkış
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'history'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        <History size={18} className="mr-2" />
                        Geçmiş Kayıtlar
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px]">

                    {/* Active Records Tab */}
                    {activeTab === 'active' && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Sahada Olan Ürünler</h2>
                            {loading ? (
                                <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
                            ) : activeRecords.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                    Aktif demo kaydı bulunamadı.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                                <th className="pb-3 font-medium">Ürün</th>
                                                <th className="pb-3 font-medium">Firma</th>
                                                <th className="pb-3 font-medium">Satışçı</th>
                                                <th className="pb-3 font-medium">Çıkış Tarihi</th>
                                                <th className="pb-3 font-medium">Notlar</th>
                                                <th className="pb-3 font-medium text-right">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {activeRecords.map((record) => (
                                                <tr key={record.id} className="hover:bg-slate-50 group">
                                                    <td className="py-4">
                                                        <div className="font-medium text-slate-800">{record.product?.name}</div>
                                                        <div className="text-xs text-slate-500">{record.product?.sku}</div>
                                                    </td>
                                                    <td className="py-4 text-slate-700">{record.targetCompany}</td>
                                                    <td className="py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {record.salesPersonId}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-slate-600 text-sm">
                                                        {new Date(record.takenDate).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td className="py-4 text-slate-600 text-sm max-w-xs truncate">{record.notes}</td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleReturn(record.id)}
                                                                className="btn btn-sm btn-outline btn-success gap-2"
                                                            >
                                                                <RotateCcw size={14} />
                                                                İade Al
                                                            </button>
                                                            <button
                                                                onClick={() => handleSell(record.id)}
                                                                className="btn btn-sm btn-outline btn-info gap-2"
                                                            >
                                                                <ShoppingCart size={14} />
                                                                Satıldı
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* New Record Tab */}
                    {activeTab === 'new' && (
                        <div className="p-6 max-w-2xl mx-auto">
                            <h2 className="text-lg font-semibold text-slate-800 mb-6">Yeni Demo Çıkışı</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Product Selection (Combobox) */}
                                <div className="form-control">
                                    <label className="label font-medium text-slate-700">Ürün Seçimi</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            list="product-suggestions"
                                            type="text"
                                            placeholder="Ürün ara (SKU veya İsim)..."
                                            className="input input-bordered w-full pl-10"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                // Try to find matching product to set ID
                                                const val = e.target.value;
                                                const match = products.find(p => `${p.sku} - ${p.name}` === val || p.name === val);
                                                if (match) {
                                                    setSelectedProduct(match.id);
                                                } else {
                                                    setSelectedProduct('');
                                                }
                                            }}
                                            required
                                        />
                                        <datalist id="product-suggestions">
                                            {products.map(p => (
                                                <option key={p.id} value={`${p.sku} - ${p.name}`} />
                                            ))}
                                        </datalist>
                                    </div>
                                    {selectedProduct && (
                                        <label className="label">
                                            <span className="label-text-alt text-green-600">
                                                Seçilen: {products.find(p => p.id === selectedProduct)?.name} (Stok: {products.find(p => p.id === selectedProduct)?.stock})
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {/* Target Company (Combobox) */}
                                <div className="form-control">
                                    <label className="label font-medium text-slate-700">Hedef Firma</label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            list="customer-suggestions"
                                            type="text"
                                            className="input input-bordered w-full pl-10"
                                            placeholder="Firma ara veya yeni yaz..."
                                            value={targetCompany}
                                            onChange={(e) => setTargetCompany(e.target.value)}
                                            required
                                        />
                                        <datalist id="customer-suggestions">
                                            {customers.map(c => (
                                                <option key={c.id} value={c.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                {/* Sales Person (Read-Only) */}
                                <div className="form-control">
                                    <label className="label font-medium text-slate-700">Satış Personeli</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            className="input input-bordered w-full pl-10 bg-slate-100 text-slate-500"
                                            value={userName || 'Bilinmiyor'}
                                            readOnly
                                        />
                                    </div>
                                    <label className="label">
                                        <span className="label-text-alt text-slate-500">İşlem yapan kullanıcı otomatik atanır.</span>
                                    </label>
                                </div>

                                {/* Notes */}
                                <div className="form-control">
                                    <label className="label font-medium text-slate-700">Notlar</label>
                                    <textarea
                                        className="textarea textarea-bordered h-24"
                                        placeholder="Varsa ek notlar..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>

                                <div className="pt-4">
                                    <button type="submit" className="btn btn-primary w-full">Kaydet ve Çıkış Yap</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Geçmiş Kayıtlar</h2>
                            {loading ? (
                                <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
                            ) : historyRecords.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                    Geçmiş kayıt bulunamadı.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                                <th className="pb-3 font-medium">Ürün</th>
                                                <th className="pb-3 font-medium">Firma</th>
                                                <th className="pb-3 font-medium">Satışçı</th>
                                                <th className="pb-3 font-medium">Çıkış</th>
                                                <th className="pb-3 font-medium">İşlem Tarihi</th>
                                                <th className="pb-3 font-medium">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historyRecords.map((record) => (
                                                <tr key={record.id} className="hover:bg-slate-50">
                                                    <td className="py-4">
                                                        <div className="font-medium text-slate-800">{record.product?.name}</div>
                                                        <div className="text-xs text-slate-500">{record.product?.sku}</div>
                                                    </td>
                                                    <td className="py-4 text-slate-700">{record.targetCompany}</td>
                                                    <td className="py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                            {record.salesPersonId}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-slate-600 text-sm">
                                                        {new Date(record.takenDate).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td className="py-4 text-slate-600 text-sm">
                                                        {record.returnDate ? new Date(record.returnDate).toLocaleDateString('tr-TR') : '-'}
                                                    </td>
                                                    <td className="py-4">
                                                        {record.status === 'Sold' ? (
                                                            <span className="badge badge-info badge-outline">Satıldı</span>
                                                        ) : (
                                                            <span className="badge badge-success badge-outline">İade Alındı</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </main>

            <Notification
                type={notification.type}
                message={notification.message}
                onClose={() => setNotification({ type: '', message: '' })}
            />
        </div>
    );
}
