import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, CreditCard, User, Calendar, Search, Check, FileText, X } from 'lucide-react';
import Header from '../components/Header';
import accountingApi from '../hooks/accountingApi';
import ProductQuotesPage from './product_quotes';

export default function SalesPage() {
    const [activeTab, setActiveTab] = useState('sales'); // 'sales' or 'quotes'
    const [sales, setSales] = useState([]);
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedSaleId, setSelectedSaleId] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [newSale, setNewSale] = useState({
        customerName: '',
        saleNo: '',
        amount: '',
        salesPersonId: '',
        dueDate: ''
    });

    useEffect(() => {
        fetchSales();
        fetchUsers();
        fetchCustomers();
    }, []);

    const fetchSales = async () => {
        try {
            const data = await accountingApi.getSales();
            setSales(data);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        // Mock users for now
        const salesUsers = [
            { id: 'satis1', name: 'Satış 1' },
            { id: 'satis2', name: 'Satış 2' },
            { id: 'satis3', name: 'Satış 3' },
            { id: 'satis4', name: 'Satış 4' },
            { id: 'ugur', name: 'Uğur Yılmaz' }
        ];
        setUsers(salesUsers);
    };

    const fetchCustomers = async () => {
        try {
            const data = await accountingApi.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleCustomerChange = async (e) => {
        const customerName = e.target.value;
        setNewSale(prev => ({ ...prev, customerName }));

        if (customerName) {
            try {
                const res = await accountingApi.getNextSaleNumber(customerName);
                // Ensure the sale number is always stored as a string
                setNewSale(prev => ({ ...prev, saleNo: String(res.nextNumber) }));
            } catch (error) {
                console.error('Error fetching next sale number:', error);
            }
        }
    };

    const handleCreateSale = async (e) => {
        e.preventDefault();
        try {
            await accountingApi.createSale({
                ...newSale,
                saleNo: String(newSale.saleNo), // Ensure saleNo is a string
                amount: parseFloat(newSale.amount) || 0,
                dueDate: newSale.dueDate ? newSale.dueDate : null
            });
            setShowModal(false);
            setNewSale({ customerName: '', saleNo: '', amount: '', salesPersonId: '', dueDate: '' });
            fetchSales();
        } catch (error) {
            console.error('Error creating sale:', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.errors || 'Satış oluşturulurken bir hata oluştu';
            alert(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
        }
    };

    const filteredSales = sales.filter(s =>
        s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.saleNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Tab buttons component
    const TabButtons = () => (
        <div className="flex gap-2 mb-6">
            <button
                onClick={() => setActiveTab('sales')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'sales'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg scale-105'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200'
                    }`}
            >
                <ShoppingCart size={20} />
                Satışlar
            </button>
            <button
                onClick={() => setActiveTab('quotes')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'quotes'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200'
                    }`}
            >
                <FileText size={20} />
                Ürün Teklifleri
            </button>
        </div>
    );

    // If quotes tab is active, render ProductQuotesPage component
    if (activeTab === 'quotes') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <Header title="Satışlar" subtitle="Satış yönetimi ve ürün teklifleri" IconComponent={ShoppingCart} showNew={false} showBack={true} />
                <main className="p-6">
                    <TabButtons />
                    <ProductQuotesPage />
                </main>
            </div>
        );
    }

    // Sales tab content
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Header title="Satışlar" subtitle="Satış yönetimi ve ürün teklifleri" IconComponent={ShoppingCart} showNew={false} showBack={true} />

            <main className="p-6">
                <TabButtons />

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-100 text-sm">Toplam Satış</p>
                                    <p className="text-3xl font-bold mt-1">{sales.length}</p>
                                </div>
                                <ShoppingCart size={40} className="opacity-30" />
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm">Tamamlanan</p>
                                    <p className="text-3xl font-bold mt-1">{sales.filter(s => s.isCompleted).length}</p>
                                </div>
                                <Check size={40} className="opacity-30" />
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-amber-100 text-sm">Bekleyen</p>
                                    <p className="text-3xl font-bold mt-1">{sales.filter(s => !s.isCompleted).length}</p>
                                </div>
                                <Calendar size={40} className="opacity-30" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Ara..."
                            className="input input-bordered w-full pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn btn-primary gap-2"
                    >
                        <Plus size={20} />
                        Yeni Satış
                    </button>
                </div>

                {/* Sales Table */}
                <div className="card bg-white shadow-xl">
                    <div className="card-body">
                        <div className="overflow-x-auto">
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Satış No</th>
                                        <th>Müşteri</th>
                                        <th>Tutar</th>
                                        <th>Satış Personeli</th>
                                        <th>Vade Tarihi</th>
                                        <th>Durum</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.map(sale => (
                                        <tr key={sale.id}>
                                            <td className="font-semibold">{sale.saleNo}</td>
                                            <td>{sale.customerName}</td>
                                            <td>₺{sale.amount?.toLocaleString('tr-TR')}</td>
                                            <td>{sale.salesPersonId}</td>
                                            <td>{sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('tr-TR') : '-'}</td>
                                            <td>
                                                {sale.isCompleted ? (
                                                    <span className="badge badge-success gap-2">
                                                        <Check size={14} />
                                                        Tamamlandı
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-warning">Bekliyor</span>
                                                )}
                                            </td>
                                            <td>
                                                {/* Actions removed as per request */}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* New Sale Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 mx-4 border-2 border-white/20">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Yeni Satış</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSale}>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="form-control col-span-2">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Müşteri</span>
                                        </label>
                                        <input
                                            list="customers"
                                            className="input input-bordered rounded-xl border-2 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
                                            required
                                            value={newSale.customerName}
                                            onChange={handleCustomerChange}
                                            placeholder="Müşteri ara veya yaz..."
                                        />
                                        <datalist id="customers">
                                            {customers.map(c => (
                                                <option key={c.id} value={c.name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Satış No</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered rounded-xl border-2 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
                                            required
                                            value={newSale.saleNo}
                                            onChange={(e) => setNewSale({ ...newSale, saleNo: e.target.value })}
                                            placeholder="Otomatik oluşturulur"
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Tutar</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold">₺</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="input input-bordered w-full pl-8 rounded-xl border-2 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
                                                required
                                                value={newSale.amount}
                                                onChange={(e) => setNewSale({ ...newSale, amount: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Satış Personeli</span>
                                        </label>
                                        <select
                                            className="select select-bordered rounded-xl border-2 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
                                            required
                                            value={newSale.salesPersonId}
                                            onChange={(e) => setNewSale({ ...newSale, salesPersonId: e.target.value })}
                                        >
                                            <option value="">Seçin...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Vade Tarihi</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="input input-bordered rounded-xl border-2 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
                                            value={newSale.dueDate}
                                            onChange={(e) => setNewSale({ ...newSale, dueDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8">
                                    <button type="button" className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all font-semibold" onClick={() => setShowModal(false)}>
                                        İptal
                                    </button>
                                    <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                                        Oluştur
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}