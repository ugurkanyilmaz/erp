import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Trash2, X, Send, CheckCircle, Package, Sparkles, TrendingUp, Edit } from 'lucide-react';
import Header from '../components/Header';
import productQuoteApi from '../hooks/productQuoteApi';
import stockApi from '../hooks/stockApi';
import serviceApi from '../hooks/serviceApi';

export default function ProductQuotesPage() {
    const [quotes, setQuotes] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [showNewQuoteForm, setShowNewQuoteForm] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // New quote form state
    const [newQuote, setNewQuote] = useState({
        customerName: '',
        customerEmail: '',
        currency: 'TRY',
        paymentTerm: 'Peşin',
        salesPersonId: '',
        notes: '',
        items: [{ productId: null, productName: '', quantity: 1, unitPrice: 0, discountPercent: 0, searchTerm: '' }]
    });

    // Email modal state
    const [emailForm, setEmailForm] = useState({
        recipientEmail: '',
        cc: '',
        senderName: ''
    });
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        fetchQuotes();
        fetchProducts();
        fetchCustomers();
        fetchUsers();
    }, []);

    const fetchQuotes = async () => {
        try {
            const data = await productQuoteApi.getProductQuotes();
            setQuotes(data);
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const data = await stockApi.getProducts();
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const data = await serviceApi.getCustomers();
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchUsers = async () => {
        // Mock users for now, similar to sales.jsx
        const salesUsers = [
            { id: 'satis1', name: 'Satış 1' },
            { id: 'satis2', name: 'Satış 2' },
            { id: 'satis3', name: 'Satış 3' },
            { id: 'satis4', name: 'Satış 4' },
            { id: 'ugur', name: 'Uğur Yılmaz' }
        ];
        setUsers(salesUsers);
    };

    const handleCustomerChange = (value) => {
        setNewQuote({ ...newQuote, customerName: value });

        // Try to find email
        const customer = customers.find(c => c.name === value);
        if (customer && customer.email) {
            setNewQuote(prev => ({ ...prev, customerEmail: customer.email }));
        }
    };

    const handleProductChange = (index, value) => {
        const items = [...newQuote.items];
        items[index].searchTerm = value;

        // Try to match product
        const match = products.find(p => `${p.sku} - ${p.title}` === value || p.title === value);
        if (match) {
            items[index].productId = match.id;
            items[index].productName = match.title;
            items[index].unitPrice = match.price || 0;
        } else {
            items[index].productId = null;
            items[index].productName = value;
        }

        setNewQuote({ ...newQuote, items });
    };

    const updateItem = (index, field, value) => {
        const items = [...newQuote.items];
        items[index][field] = value;
        setNewQuote({ ...newQuote, items });
    };

    const addNewItem = () => {
        setNewQuote({
            ...newQuote,
            items: [...newQuote.items, { productId: null, productName: '', quantity: 1, unitPrice: 0, discountPercent: 0, searchTerm: '' }]
        });
    };

    const removeItem = (index) => {
        if (newQuote.items.length === 1) return;
        const items = newQuote.items.filter((_, i) => i !== index);
        setNewQuote({ ...newQuote, items });
    };

    const calculateItemTotal = (item) => {
        const netPrice = item.unitPrice * (1 - (item.discountPercent / 100));
        return item.quantity * netPrice;
    };

    const calculateSubtotal = () => {
        return newQuote.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    };

    const calculateGrandTotal = () => {
        const subtotal = calculateSubtotal();
        return subtotal * 1.20; // Add 20% VAT
    };

    const handleCreateQuote = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                customerName: newQuote.customerName,
                customerEmail: newQuote.customerEmail,
                currency: newQuote.currency,
                paymentTerm: newQuote.paymentTerm,
                salesPersonId: newQuote.salesPersonId,
                notes: newQuote.notes,
                items: newQuote.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName || item.searchTerm,
                    quantity: parseInt(item.quantity),
                    unitPrice: parseFloat(item.unitPrice),
                    discountPercent: parseFloat(item.discountPercent)
                }))
            };

            await productQuoteApi.createProductQuote(payload);

            // Reset form
            setNewQuote({
                customerName: '',
                customerEmail: '',
                currency: 'TRY',
                paymentTerm: 'Peşin',
                salesPersonId: '',
                notes: '',
                items: [{ productId: null, productName: '', quantity: 1, unitPrice: 0, discountPercent: 0, searchTerm: '' }]
            });
            setShowNewQuoteForm(false);

            fetchQuotes();
            alert('Teklif başarıyla oluşturuldu!');
        } catch (error) {
            console.error('Error creating quote:', error);
            alert('Teklif oluşturulamadı');
        }
    };

    const handleEditQuote = (quote) => {
        setNewQuote({
            customerName: quote.customerName,
            customerEmail: quote.customerEmail || '',
            currency: quote.currency,
            paymentTerm: quote.paymentTerm || 'Peşin',
            salesPersonId: quote.salesPersonId || '',
            notes: quote.notes || '',
            items: quote.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent,
                searchTerm: item.productName
            }))
        });
        setShowNewQuoteForm(true);
    };

    const handleSendQuote = (quote) => {
        setSelectedQuote(quote);
        setEmailForm({
            recipientEmail: quote.customerEmail || '',
            cc: '',
            senderName: 'Keten Pnömatik Satış Ekibi'
        });
        setShowEmailModal(true);
    };

    const confirmSendEmail = async () => {
        if (!selectedQuote) return;

        try {
            setSendingEmail(true);

            const payload = {
                recipientEmail: emailForm.recipientEmail,
                cc: emailForm.cc ? emailForm.cc.split(';').map(e => e.trim()).filter(e => e) : undefined,
                senderName: emailForm.senderName
            };

            const result = await productQuoteApi.sendProductQuote(selectedQuote.id, payload);

            setShowEmailModal(false);
            fetchQuotes();

            if (result.emailSent) {
                alert('Teklif başarıyla gönderildi!');
            } else {
                alert('PDF oluşturuldu ancak e-posta gönderilemedi: ' + (result.emailError || 'Bilinmeyen hata'));
            }
        } catch (error) {
            console.error('Error sending quote:', error);
            alert('Teklif gönderilemedi');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleApproveQuote = async (quote) => {
        if (!window.confirm(`${quote.quoteNo} numaralı teklifi onaylıyor musunuz? Bu işlem satış kaydı oluşturacak.`)) {
            return;
        }

        try {
            await productQuoteApi.approveProductQuote(quote.id);
            fetchQuotes();
            alert('Teklif onaylandı ve satış kaydı oluşturuldu!');
        } catch (error) {
            console.error('Error approving quote:', error);
            alert('Teklif onaylanamadı');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Taslak': return 'bg-slate-100 text-slate-700 border-slate-300';
            case 'Gönderildi': return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'Onaylandı': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getCurrencySymbol = (currency) => {
        switch (currency) {
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'TRY': return '₺';
            default: return currency;
        }
    };

    const filteredQuotes = quotes.filter(q =>
        (q.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.quoteNo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Header title="Ürün Satış Teklifleri" subtitle="Ürün fiyat teklifleri oluştur ve yönet" IconComponent={Package} showNew={false} showBack={true} />

            <main className="p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Toplam Teklif</p>
                                <h3 className="text-4xl font-bold mt-2">{quotes.length}</h3>
                            </div>
                            <FileText size={48} className="opacity-20" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Onaylanan</p>
                                <h3 className="text-4xl font-bold mt-2">{quotes.filter(q => q.status === 'Onaylandı').length}</h3>
                            </div>
                            <CheckCircle size={48} className="opacity-20" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Gönderilen</p>
                                <h3 className="text-4xl font-bold mt-2">{quotes.filter(q => q.status === 'Gönderildi').length}</h3>
                            </div>
                            <Send size={48} className="opacity-20" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Sol: Teklif Listesi */}
                    <div className="w-1/3">
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                                    <Sparkles size={24} className="text-blue-500" />
                                    Teklifler
                                </h2>
                                <button
                                    onClick={() => setShowNewQuoteForm(true)}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                                >
                                    <Plus size={18} /> Yeni
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-6">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search size={20} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ara..."
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Quote List */}
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredQuotes.map(quote => {
                                    const total = quote.items?.reduce((sum, item) => {
                                        const netPrice = item.unitPrice * (1 - (item.discountPercent / 100));
                                        return sum + (item.quantity * netPrice);
                                    }, 0) * 1.20;

                                    return (
                                        <div
                                            key={quote.id}
                                            onClick={() => setSelectedQuote(quote)}
                                            className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${selectedQuote?.id === quote.id
                                                ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg scale-105'
                                                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-800 text-lg">{quote.quoteNo}</div>
                                                    <div className="text-sm text-slate-600 mt-1">{quote.customerName}</div>
                                                    <div className="text-xs text-slate-500 mt-2">
                                                        {new Date(quote.createdDate).toLocaleDateString('tr-TR')}
                                                    </div>
                                                    {quote.saleId && (
                                                        <div className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                                                            <CheckCircle size={12} />
                                                            Satış: {quote.sale?.saleNo}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 ${getStatusBadge(quote.status)} mb-2`}>
                                                        {quote.status}
                                                    </div>
                                                    <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                                        {getCurrencySymbol(quote.currency)}{total?.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredQuotes.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>Teklif bulunamadı</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Detay / Yeni Teklif */}
                    <div className="flex-1">
                        {showNewQuoteForm ? (
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Yeni Teklif</h2>
                                    <button onClick={() => setShowNewQuoteForm(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateQuote}>
                                    {/* Customer */}
                                    <div className="form-control mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Müşteri</span>
                                        </label>
                                        <input
                                            list="customers"
                                            type="text"
                                            className="input input-bordered rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                            required
                                            value={newQuote.customerName}
                                            onChange={(e) => handleCustomerChange(e.target.value)}
                                        />
                                        <datalist id="customers">
                                            {customers.map(c => (
                                                <option key={c.id} value={c.name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    {/* Email */}
                                    <div className="form-control mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">E-posta</span>
                                        </label>
                                        <input
                                            type="email"
                                            className="input input-bordered rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                            value={newQuote.customerEmail}
                                            onChange={(e) => setNewQuote({ ...newQuote, customerEmail: e.target.value })}
                                        />
                                    </div>

                                    {/* Currency */}
                                    <div className="form-control mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Para Birimi</span>
                                        </label>
                                        <select
                                            className="select select-bordered rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                            value={newQuote.currency}
                                            onChange={(e) => setNewQuote({ ...newQuote, currency: e.target.value })}
                                        >
                                            <option value="TRY">₺ TRY</option>
                                            <option value="USD">$ USD</option>
                                            <option value="EUR">€ EUR</option>
                                        </select>
                                    </div>

                                    {/* Payment Term */}
                                    <div className="form-control mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Vade</span>
                                        </label>
                                        <select
                                            className="select select-bordered rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                            value={newQuote.paymentTerm}
                                            onChange={(e) => setNewQuote({ ...newQuote, paymentTerm: e.target.value })}
                                        >
                                            <option value="Peşin">Peşin</option>
                                            <option value="15 gün">15 gün</option>
                                            <option value="30 gün">30 gün</option>
                                            <option value="45 gün">45 gün</option>
                                            <option value="60 gün">60 gün</option>
                                            <option value="90 gün">90 gün</option>
                                        </select>
                                    </div>

                                    {/* Sales Person */}
                                    <div className="form-control mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Satış Personeli</span>
                                        </label>
                                        <select
                                            className="select select-bordered rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                            value={newQuote.salesPersonId}
                                            onChange={(e) => setNewQuote({ ...newQuote, salesPersonId: e.target.value })}
                                            required
                                        >
                                            <option value="">Seçin...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Products */}
                                    <div className="mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Ürünler</span>
                                        </label>
                                        <div className="space-y-4">
                                            {newQuote.items.map((item, index) => (
                                                <div key={index} className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-200 rounded-xl p-4">
                                                    <div className="grid grid-cols-12 gap-3 items-end">
                                                        {/* Product Name */}
                                                        <div className="col-span-5">
                                                            <label className="text-xs font-semibold text-slate-600">Ürün</label>
                                                            <input
                                                                list={`products-${index}`}
                                                                type="text"
                                                                className="input input-sm input-bordered w-full rounded-lg border-2 focus:border-blue-400 transition-all mt-1"
                                                                placeholder="Ara veya yaz..."
                                                                value={item.searchTerm}
                                                                onChange={(e) => handleProductChange(index, e.target.value)}
                                                                required
                                                            />
                                                            <datalist id={`products-${index}`}>
                                                                {products.map(p => (
                                                                    <option key={p.id} value={`${p.sku} - ${p.title}`} />
                                                                ))}
                                                            </datalist>
                                                        </div>

                                                        {/* Quantity */}
                                                        <div className="col-span-2">
                                                            <label className="text-xs font-semibold text-slate-600">Adet</label>
                                                            <input
                                                                type="number"
                                                                className="input input-sm input-bordered w-full rounded-lg border-2 focus:border-blue-400 transition-all mt-1"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                required
                                                            />
                                                        </div>

                                                        {/* Unit Price */}
                                                        <div className="col-span-2">
                                                            <label className="text-xs font-semibold text-slate-600">Liste Fiy.</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="input input-sm input-bordered w-full rounded-lg border-2 focus:border-blue-400 transition-all mt-1"
                                                                value={item.unitPrice}
                                                                onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                                                required
                                                            />
                                                        </div>

                                                        {/* Discount % */}
                                                        <div className="col-span-2">
                                                            <label className="text-xs font-semibold text-slate-600">İsk. %</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                max="100"
                                                                className="input input-sm input-bordered w-full rounded-lg border-2 focus:border-blue-400 transition-all mt-1"
                                                                value={item.discountPercent}
                                                                onChange={(e) => updateItem(index, 'discountPercent', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Remove Button */}
                                                        {newQuote.items.length > 1 && (
                                                            <div className="col-span-1 text-center">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                                                                    onClick={() => removeItem(index)}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Item Total */}
                                                    <div className="text-right text-sm font-semibold text-slate-600 mt-3">
                                                        Net: {getCurrencySymbol(newQuote.currency)}{calculateItemTotal(item).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm mt-4 rounded-lg hover:bg-blue-50"
                                            onClick={addNewItem}
                                        >
                                            <Plus size={16} /> Ürün Ekle
                                        </button>
                                    </div>

                                    {/* Notes */}
                                    <div className="form-control mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Notlar</span>
                                        </label>
                                        <textarea
                                            className="textarea textarea-bordered rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                            rows="3"
                                            value={newQuote.notes}
                                            onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                                        />
                                    </div>

                                    {/* Totals */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-semibold">Ara Toplam:</span>
                                            <span className="font-bold">{getCurrencySymbol(newQuote.currency)}{calculateSubtotal().toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="font-semibold">KDV (%20):</span>
                                            <span className="font-bold">{getCurrencySymbol(newQuote.currency)}{(calculateSubtotal() * 0.20).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xl font-bold border-t-2 border-blue-300 pt-3">
                                            <span>TOPLAM:</span>
                                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{getCurrencySymbol(newQuote.currency)}{calculateGrandTotal().toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3">
                                        <button type="button" className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all font-semibold" onClick={() => setShowNewQuoteForm(false)}>
                                            İptal
                                        </button>
                                        <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                                            Teklif Oluştur
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : selectedQuote ? (
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-3xl font-bold text-slate-800">{selectedQuote.quoteNo}</h2>
                                        <p className="text-lg text-slate-600 mt-2">{selectedQuote.customerName}</p>
                                        {selectedQuote.customerEmail && (
                                            <p className="text-sm text-slate-500 mt-1">{selectedQuote.customerEmail}</p>
                                        )}
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${getStatusBadge(selectedQuote.status)}`}>
                                        {selectedQuote.status}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="mb-8">
                                    <h3 className="font-bold text-xl mb-4 text-slate-700">Ürünler</h3>
                                    <div className="overflow-x-auto rounded-xl border-2 border-slate-200">
                                        <table className="table w-full">
                                            <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                                                <tr>
                                                    <th className="text-slate-700">Ürün</th>
                                                    <th className="text-center text-slate-700">Adet</th>
                                                    <th className="text-right text-slate-700">Liste Fiy.</th>
                                                    <th className="text-center text-slate-700">İsk. %</th>
                                                    <th className="text-right text-slate-700">Net Fiy.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedQuote.items?.map((item, idx) => {
                                                    const netPrice = item.unitPrice * (1 - (item.discountPercent / 100));
                                                    const lineTotal = item.quantity * netPrice;
                                                    return (
                                                        <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                                            <td className="font-semibold">{item.productName}</td>
                                                            <td className="text-center">{item.quantity}</td>
                                                            <td className="text-right">{getCurrencySymbol(selectedQuote.currency)}{item.unitPrice.toFixed(2)}</td>
                                                            <td className="text-center">{item.discountPercent}%</td>
                                                            <td className="text-right font-bold">{getCurrencySymbol(selectedQuote.currency)}{lineTotal.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border-2 border-blue-200">
                                    {(() => {
                                        const subtotal = selectedQuote.items?.reduce((sum, item) => {
                                            const netPrice = item.unitPrice * (1 - (item.discountPercent / 100));
                                            return sum + (item.quantity * netPrice);
                                        }, 0) || 0;
                                        const vat = subtotal * 0.20;
                                        const total = subtotal + vat;

                                        return (
                                            <>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="font-semibold">Ara Toplam:</span>
                                                    <span className="font-bold">{getCurrencySymbol(selectedQuote.currency)}{subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm mb-3">
                                                    <span className="font-semibold">KDV (%20):</span>
                                                    <span className="font-bold">{getCurrencySymbol(selectedQuote.currency)}{vat.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-2xl font-bold border-t-2 border-blue-300 pt-3">
                                                    <span>TOPLAM:</span>
                                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{getCurrencySymbol(selectedQuote.currency)}{total.toFixed(2)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Notes */}
                                {selectedQuote.notes && (
                                    <div className="mb-8">
                                        <h3 className="font-bold text-xl mb-3 text-slate-700">Notlar</h3>
                                        <p className="text-slate-600 bg-slate-50 p-4 rounded-xl border-2 border-slate-200">{selectedQuote.notes}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    {selectedQuote.status === 'Taslak' && (
                                        <button
                                            onClick={() => handleSendQuote(selectedQuote)}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                                        >
                                            <Send size={20} /> Gönder
                                        </button>
                                    )}
                                    {(selectedQuote.status === 'Taslak' || selectedQuote.status === 'Gönderildi') && (
                                        <button
                                            onClick={() => handleEditQuote(selectedQuote)}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                                        >
                                            <Edit size={20} /> Düzenle
                                        </button>
                                    )}
                                    {selectedQuote.status === 'Gönderildi' && (
                                        <button
                                            onClick={() => handleApproveQuote(selectedQuote)}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                                        >
                                            <CheckCircle size={20} /> Onayla
                                        </button>
                                    )}
                                    {selectedQuote.saleId && selectedQuote.sale && (
                                        <div className="alert bg-emerald-50 border-2 border-emerald-300 text-emerald-700 rounded-xl flex items-center gap-2">
                                            <CheckCircle size={20} />
                                            <span className="font-semibold">Bu teklif onaylandı. Satış No: <strong>{selectedQuote.sale.saleNo}</strong></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-16 text-center border border-white/20">
                                <FileText size={80} className="mx-auto text-slate-300 mb-6" />
                                <p className="text-slate-500 text-xl font-semibold">Bir teklif seçin veya yeni teklif oluşturun</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Email Modal */}
            {showEmailModal && selectedQuote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 mx-4 border-2 border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">E-posta Gönder</h3>
                            <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-2">Teklif</label>
                                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                    {selectedQuote.quoteNo} — {selectedQuote.customerName}
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-2">Kime (To) <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    className="input input-bordered w-full rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                    value={emailForm.recipientEmail}
                                    onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-2">Gönderen (İsteğe Bağlı)</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                    value={emailForm.senderName}
                                    onChange={(e) => setEmailForm({ ...emailForm, senderName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-2">CC (İsteğe Bağlı, ; ile ayırın)</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full rounded-xl border-2 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                    placeholder="email1@firma.com; email2@firma.com"
                                    value={emailForm.cc}
                                    onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all font-semibold"
                                disabled={sendingEmail}
                            >
                                İptal
                            </button>
                            <button
                                onClick={confirmSendEmail}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                                disabled={sendingEmail}
                            >
                                {sendingEmail ? 'Gönderiliyor...' : 'Gönder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #3b82f6, #6366f1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #2563eb, #4f46e5);
                }
            `}</style>
        </div>
    );
}
