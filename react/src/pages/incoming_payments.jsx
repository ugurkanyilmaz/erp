import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Search, ArrowDownLeft, Calendar, Package, AlertCircle, CreditCard } from 'lucide-react';
import Header from '../components/Header';
import accountingApi from '../hooks/accountingApi';
import productQuoteApi from '../hooks/productQuoteApi';

export default function IncomingPaymentsPage() {
    const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' or 'expected'
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newPayment, setNewPayment] = useState({ targetAccount: '', sender: '', amount: '', saleId: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [expectedPayments, setExpectedPayments] = useState([]);

    useEffect(() => {
        fetchPayments();
        fetchExpectedPayments();
        fetchCustomersAndSales();
    }, []);

    const fetchCustomersAndSales = async () => {
        try {
            const [custData, salesData] = await Promise.all([
                accountingApi.getCustomers(),
                accountingApi.getSales()
            ]);
            setCustomers(custData || []);
            setSales(salesData || []);
        } catch (error) {
            console.error('Error fetching customers/sales:', error);
        }
    };

    const fetchPayments = async () => {
        try {
            const data = await accountingApi.getIncomingPayments();
            setPayments(data);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchExpectedPayments = async () => {
        try {
            const [quotesData, salesData] = await Promise.all([
                productQuoteApi.getProductQuotes(),
                accountingApi.getSales()
            ]);

            const quotes = quotesData || [];
            const allSales = salesData || [];

            // Filter sales that are not completed (fully paid)
            const unpaidSales = allSales.filter(s => !s.isCompleted);

            // Map sales to expected payment items
            // If a sale is linked to a quote, we can enrich it with quote info
            const expectedItems = unpaidSales.map(sale => {
                // Find quote linked to this sale
                const linkedQuote = quotes.find(q => q.sale && q.sale.id === sale.id);

                return {
                    id: `sale-${sale.id}`, // Unique ID for the list
                    quoteNo: linkedQuote ? linkedQuote.quoteNo : '-',
                    customerName: sale.customerName,
                    sale: sale, // The sale object itself
                    // We can add other fields if needed
                };
            });

            setExpectedPayments(expectedItems);
        } catch (error) {
            console.error('Error fetching expected payments:', error);
        }
    };

    const openPaymentModalForSale = (sale, customerName) => {
        const remaining = sale.amount - sale.totalPaidAmount;
        setNewPayment({
            targetAccount: '',
            sender: customerName,
            saleId: sale.id,
            amount: remaining
        });
        setShowModal(true);
    };

    const handleCreatePayment = async (e) => {
        e.preventDefault();
        try {
            await accountingApi.createIncomingPayment({
                ...newPayment,
                amount: parseFloat(newPayment.amount)
            });
            setShowModal(false);
            setNewPayment({ targetAccount: '', sender: '', amount: '', saleId: null });
            fetchPayments();
            // Refresh expected payments as well since a sale might have been paid
            fetchExpectedPayments();
            fetchCustomersAndSales();
        } catch (error) {
            console.error('Error creating payment:', error);
        }
    };

    const filteredPayments = payments.filter(payment =>
        (payment.sender || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.targetAccount || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredExpected = expectedPayments.filter(item =>
        (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.quoteNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sale?.saleNo && item.sale.saleNo.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalIncoming = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpected = expectedPayments.reduce((acc, curr) => {
        const remaining = curr.sale ? (curr.sale.amount - curr.sale.totalPaidAmount) : 0;
        return acc + remaining;
    }, 0);

    // Filter sales based on selected sender (customer)
    const availableSales = sales.filter(s =>
        s.customerName?.toLowerCase().trim() === newPayment.sender?.toLowerCase().trim() && !s.isCompleted
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Header title="Gelen Ödemeler" subtitle="Hesap hareketleri ve ödeme takibi" IconComponent={Wallet} showNew={false} showBack={true} />

            <main className="p-6">
                {/* Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="tabs tabs-boxed bg-white shadow-sm p-1 rounded-xl">
                        <button
                            className={`tab tab-lg rounded-lg transition-all duration-200 ${activeTab === 'incoming' ? 'tab-active bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                            onClick={() => setActiveTab('incoming')}
                        >
                            <ArrowDownLeft size={18} className="mr-2" />
                            Gelen Ödemeler
                        </button>
                        <button
                            className={`tab tab-lg rounded-lg transition-all duration-200 ${activeTab === 'expected' ? 'tab-active bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                            onClick={() => setActiveTab('expected')}
                        >
                            <Package size={18} className="mr-2" />
                            Beklenen Ödemeler
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className={`stats shadow text-white w-full md:w-auto transition-colors duration-300 ${activeTab === 'incoming' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                        <div className="stat">
                            <div className={`stat-title ${activeTab === 'incoming' ? 'text-emerald-100' : 'text-blue-100'}`}>
                                {activeTab === 'incoming' ? 'Toplam Gelen' : 'Toplam Beklenen'}
                            </div>
                            <div className="stat-value text-3xl">
                                ₺{(activeTab === 'incoming' ? totalIncoming : totalExpected).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className={`stat-desc ${activeTab === 'incoming' ? 'text-emerald-100' : 'text-blue-100'}`}>
                                {activeTab === 'incoming' ? 'Tüm zamanlar' : 'Onaylı ürün satışlarından'}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder={activeTab === 'incoming' ? "Gönderen veya hesap ara..." : "Müşteri, Teklif No veya Satış No ara..."}
                                className="input input-bordered pl-10 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {activeTab === 'incoming' && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center gap-2"
                            >
                                <Plus size={20} /> Ödeme Ekle
                            </button>
                        )}
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="overflow-x-auto">
                        {activeTab === 'incoming' ? (
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Gönderen</th>
                                        <th>İlgili Satış</th>
                                        <th>Hesap</th>
                                        <th className="text-right">Tutar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="hover">
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={16} className="text-slate-400" />
                                                    {new Date(payment.date).toLocaleDateString('tr-TR')}
                                                </div>
                                            </td>
                                            <td className="font-medium">{payment.sender}</td>
                                            <td className="text-xs font-mono text-slate-500">
                                                {payment.saleId ? (sales.find(s => s.id === payment.saleId)?.saleNo || `Satış #${payment.saleId}`) : '-'}
                                            </td>
                                            <td>
                                                <div className="badge badge-ghost gap-1">
                                                    <Wallet size={12} />
                                                    {payment.targetAccount}
                                                </div>
                                            </td>
                                            <td className="text-right font-bold text-emerald-600">
                                                +₺{payment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPayments.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-8 text-slate-500">
                                                {searchTerm ? 'Arama kriterlerine uygun ödeme bulunamadı.' : 'Henüz ödeme kaydı yok.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Teklif No</th>
                                        <th>Müşteri</th>
                                        <th>Satış No</th>
                                        <th>Vade Tarihi</th>
                                        <th className="text-right">Toplam Tutar</th>
                                        <th className="text-right">Kalan Tutar</th>
                                        <th>Durum</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpected.map((item) => {
                                        const remaining = item.sale ? (item.sale.amount - item.sale.totalPaidAmount) : 0;
                                        const dueDate = item.sale?.dueDate ? new Date(item.sale.dueDate) : null;
                                        const isOverdue = dueDate && dueDate < new Date();

                                        return (
                                            <tr key={item.id} className="hover">
                                                <td className="font-mono text-xs font-bold">{item.quoteNo}</td>
                                                <td className="font-bold">{item.customerName}</td>
                                                <td className="font-mono text-xs">{item.sale?.saleNo || '-'}</td>
                                                <td>
                                                    {dueDate ? (
                                                        <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-error font-bold' : 'text-slate-600'}`}>
                                                            <Calendar size={12} />
                                                            {dueDate.toLocaleDateString('tr-TR')}
                                                            {isOverdue && <AlertCircle size={12} />}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="text-right text-slate-500">
                                                    ₺{item.sale?.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="text-right font-bold text-blue-600">
                                                    ₺{remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td>
                                                    <div className="badge badge-warning badge-sm">Ödeme Bekliyor</div>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => openPaymentModalForSale(item.sale, item.customerName)}
                                                        className="btn btn-ghost btn-xs gap-1 text-emerald-600 hover:bg-emerald-50"
                                                    >
                                                        <CreditCard size={14} />
                                                        Ödeme Ekle
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredExpected.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                {searchTerm ? 'Arama kriterlerine uygun beklenen ödeme bulunamadı.' : 'Beklenen ödeme bulunamadı.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </main>

            {/* New Payment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-6">
                        <h3 className="font-bold text-2xl mb-6 text-slate-800">Yeni Ödeme Ekle</h3>
                        <form onSubmit={handleCreatePayment}>
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Hesap Seçimi</span>
                                </label>
                                <select
                                    className="select select-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                    value={newPayment.targetAccount}
                                    onChange={e => setNewPayment({ ...newPayment, targetAccount: e.target.value })}
                                >
                                    <option value="">Seçiniz</option>
                                    <option value="Kasa">Kasa</option>
                                    <option value="Banka">Banka</option>
                                </select>
                            </div>

                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Gönderen (Müşteri)</span>
                                </label>
                                <input
                                    list="customer-list"
                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                    placeholder="Müşteri ara..."
                                    value={newPayment.sender}
                                    onChange={e => {
                                        setNewPayment({ ...newPayment, sender: e.target.value, saleId: null }); // Reset sale when customer changes
                                    }}
                                />
                                <datalist id="customer-list">
                                    {customers.map(c => (
                                        <option key={c.id} value={c.name} />
                                    ))}
                                </datalist>
                            </div>


                            {newPayment.sender && (
                                <div className="form-control w-full mb-4">
                                    <label className="label">
                                        <span className="label-text font-semibold text-slate-700">İlgili Satış (Opsiyonel)</span>
                                    </label>
                                    <select
                                        className="select select-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        value={newPayment.saleId || ''}
                                        onChange={e => setNewPayment({ ...newPayment, saleId: e.target.value ? parseInt(e.target.value) : null })}
                                    >
                                        <option value="">Seçiniz (Genel Ödeme)</option>
                                        {availableSales.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.saleNo} - ₺{(s.amount || 0).toLocaleString('tr-TR')} (Kalan: ₺{((s.amount || 0) - (s.totalPaidAmount || 0)).toLocaleString('tr-TR')})
                                            </option>
                                        ))}
                                    </select>
                                    {availableSales.length === 0 && (
                                        <label className="label">
                                            <span className="label-text-alt text-amber-600">Bu müşteriye ait ödenmemiş satış bulunamadı</span>
                                        </label>
                                    )}
                                    {availableSales.length > 0 && (
                                        <label className="label">
                                            <span className="label-text-alt text-slate-500">Bir satış seçerek komisyon hesaplamasını etkinleştirin</span>
                                        </label>
                                    )}
                                </div>
                            )}


                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Tutar (TL)</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                    value={newPayment.amount}
                                    onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
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
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
