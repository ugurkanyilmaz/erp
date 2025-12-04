import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, CreditCard, User, Calendar, Search, Check } from 'lucide-react';
import Header from '../components/Header';
import accountingApi from '../hooks/accountingApi';

export default function SalesPage() {
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

    const handleAddPayment = async (e) => {
        e.preventDefault();
        try {
            await accountingApi.addSalePayment(selectedSaleId, parseFloat(paymentAmount));
            setShowPaymentModal(false);
            setPaymentAmount('');
            setSelectedSaleId(null);
            fetchSales();
        } catch (error) {
            console.error('Error adding payment:', error);
        }
    };

    const openPaymentModal = (sale) => {
        setSelectedSaleId(sale.id);
        setShowPaymentModal(true);
    };

    const setDueDate = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        setNewSale(prev => ({ ...prev, dueDate: date.toISOString().split('T')[0] }));
    };

    const filteredSales = sales.filter(sale =>
        sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.saleNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Header title="Satışlar" subtitle="Satış ve tahsilat takibi" IconComponent={ShoppingCart} showNew={false} showBack={true} />

            <main className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Müşteri veya satış no ara..."
                            className="input input-bordered pl-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center gap-2"
                    >
                        <Plus size={20} /> Yeni Satış
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>Satış No</th>
                                    <th>Müşteri</th>
                                    <th>Tarih</th>
                                    <th>Vade</th>
                                    <th>Tutar</th>
                                    <th>Tahsil Edilen</th>
                                    <th>Kalan</th>
                                    <th>Satış Temsilcisi</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map((sale) => {
                                    const remaining = sale.amount - sale.totalPaidAmount;
                                    return (
                                        <tr key={sale.id} className="hover">
                                            <td className="font-mono text-xs font-bold">{sale.saleNo}</td>
                                            <td className="font-bold">{sale.customerName}</td>
                                            <td>{new Date(sale.date).toLocaleDateString('tr-TR')}</td>
                                            <td>
                                                {sale.dueDate ? (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <Calendar size={12} />
                                                        {new Date(sale.dueDate).toLocaleDateString('tr-TR')}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td>₺{sale.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                            <td className="text-success">₺{sale.totalPaidAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                            <td className="text-error font-bold">₺{remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                            <td>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User size={14} className="text-slate-400" />
                                                    {users.find(u => u.id === sale.salesPersonId)?.name || sale.salesPersonId}
                                                </div>
                                            </td>
                                            <td>
                                                {sale.isCompleted ? (
                                                    <div className="badge badge-success gap-1"><Check size={12} /> Tamamlandı</div>
                                                ) : (
                                                    <div className="badge badge-warning">Ödeme Bekliyor</div>
                                                )}
                                            </td>
                                            <td>
                                                {!sale.isCompleted && (
                                                    <button
                                                        className="btn btn-xs btn-outline btn-success"
                                                        onClick={() => openPaymentModal(sale)}
                                                    >
                                                        Ödeme Ekle
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredSales.length === 0 && (
                                    <tr>
                                        <td colSpan="10" className="text-center py-8 text-slate-500">
                                            {searchTerm ? 'Arama kriterlerine uygun satış bulunamadı.' : 'Kayıtlı satış bulunamadı.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* New Sale Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-2xl mb-6 text-slate-800">Yeni Satış Oluştur</h3>
                        <form onSubmit={handleCreateSale}>
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Müşteri Seçimi</span>
                                </label>
                                <select
                                    className="select select-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                    value={newSale.customerName}
                                    onChange={handleCustomerChange}
                                >
                                    <option value="">Müşteri Seçiniz</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Satış No (Otomatik)</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Örn: 1"
                                    required
                                    value={newSale.saleNo}
                                    onChange={e => setNewSale({ ...newSale, saleNo: e.target.value })}
                                />
                                <label className="label">
                                    <span className="label-text-alt text-slate-500">Seçilen müşteri için sıradaki numara otomatik önerilir.</span>
                                </label>
                            </div>

                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Satış Tutar (TL)</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                    value={newSale.amount}
                                    onChange={e => setNewSale({ ...newSale, amount: e.target.value })}
                                />
                            </div>

                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Satış Temsilcisi</span>
                                </label>
                                <select
                                    className="select select-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                    value={newSale.salesPersonId}
                                    onChange={e => setNewSale({ ...newSale, salesPersonId: e.target.value })}
                                >
                                    <option value="">Seçiniz</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Vade Tarihi</span>
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <button type="button" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium transition" onClick={() => setDueDate(15)}>+15 Gün</button>
                                    <button type="button" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium transition" onClick={() => setDueDate(30)}>+30 Gün</button>
                                    <button type="button" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium transition" onClick={() => setDueDate(45)}>+45 Gün</button>
                                    <button type="button" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium transition" onClick={() => setDueDate(60)}>+60 Gün</button>
                                </div>
                                <input
                                    type="date"
                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={newSale.dueDate}
                                    onChange={e => setNewSale({ ...newSale, dueDate: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
                                    onClick={() => setShowModal(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md hover:opacity-90 transition"
                                >
                                    Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-6">
                        <h3 className="font-bold text-2xl mb-6 text-slate-800">Ödeme Ekle</h3>
                        <form onSubmit={handleAddPayment}>
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Gelen Tutar (TL)</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
                                    onClick={() => setShowPaymentModal(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-md hover:opacity-90 transition"
                                >
                                    Ödeme Ekle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}