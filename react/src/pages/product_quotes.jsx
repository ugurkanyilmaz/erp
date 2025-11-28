import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Trash2, X, Send, CheckCircle, Package } from 'lucide-react';
import Header from '../components/Header';
import productQuoteApi from '../hooks/productQuoteApi';
import stockApi from '../hooks/stockApi';
import serviceApi from '../hooks/serviceApi';

export default function ProductQuotesPage() {
    const [quotes, setQuotes] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
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
            case 'Taslak': return 'badge-ghost';
            case 'Gönderildi': return 'badge-info';
            case 'Onaylandı': return 'badge-success';
            default: return 'badge-ghost';
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
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.quoteNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Header title="Ürün Satış Teklifleri" subtitle="Ürün fiyat teklifleri oluştur ve yönet" IconComponent={Package} showNew={false} showBack={true} />

            <main className="p-6">
                <div className="flex gap-6">
                    {/* Sol: Teklif Listesi */}
                    <div className="w-1/3">
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800">Teklifler</h2>
                                <button
                                    onClick={() => setShowNewQuoteForm(true)}
                                    className="btn btn-sm bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none hover:opacity-90"
                                >
                                    <Plus size={16} /> Yeni
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search size={16} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ara..."
                                    className="input input-bordered input-sm w-full pl-10 rounded-lg"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Quote List */}
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {filteredQuotes.map(quote => {
                                    const total = quote.items?.reduce((sum, item) => {
                                        const netPrice = item.unitPrice * (1 - (item.discountPercent / 100));
                                        return sum + (item.quantity * netPrice);
                                    }, 0) * 1.20;

                                    return (
                                        <div
                                            key={quote.id}
                                            onClick={() => setSelectedQuote(quote)}
                                            className={`p-3 border rounded-lg cursor-pointer transition hover:shadow-md ${selectedQuote?.id === quote.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="font-semibold text-slate-800">{quote.quoteNo}</div>
                                                    <div className="text-sm text-slate-600">{quote.customerName}</div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {new Date(quote.createdDate).toLocaleDateString('tr-TR')}
                                                    </div>
                                                    {quote.saleId && (
                                                        <div className="text-xs text-green-600 mt-1">
                                                            Satış: {quote.sale?.saleNo}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className={`badge ${getStatusBadge(quote.status)} badge-sm mb-1`}>
                                                        {quote.status}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-700">
                                                        {getCurrencySymbol(quote.currency)}{total?.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredQuotes.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        Teklif bulunamadı
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Detay / Yeni Teklif */}
                    <div className="flex-1">
                        {showNewQuoteForm ? (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Yeni Teklif</h2>
                                    <button onClick={() => setShowNewQuoteForm(false)} className="btn btn-ghost btn-sm">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateQuote}>
                                    {/* Customer */}
                                    <div className="form-control mb-4">
                                        <label className="label">
                                            <span className="label-text font-semibold">Müşteri</span>
                                        </label>
                                        <input
                                            list="customers"
                                            type="text"
                                            className="input input-bordered rounded-xl"
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
                                    <div className="form-control mb-4">
                                        <label className="label">
                                            <span className="label-text font-semibold">E-posta</span>
                                        </label>
                                        <input
                                            type="email"
                                            className="input input-bordered rounded-xl"
                                            value={newQuote.customerEmail}
                                            onChange={(e) => setNewQuote({ ...newQuote, customerEmail: e.target.value })}
                                        />
                                    </div>

                                    {/* Currency */}
                                    <div className="form-control mb-4">
                                        <label className="label">
                                            <span className="label-text font-semibold">Para Birimi</span>
                                        </label>
                                        <select
                                            className="select select-bordered rounded-xl"
                                            value={newQuote.currency}
                                            onChange={(e) => setNewQuote({ ...newQuote, currency: e.target.value })}
                                        >
                                            <option value="TRY">₺ TRY</option>
                                            <option value="USD">$ USD</option>
                                            <option value="EUR">€ EUR</option>
                                        </select>
                                    </div>

                                    {/* Products */}
                                    <div className="mb-4">
                                        <label className="label">
                                            <span className="label-text font-semibold">Ürünler</span>
                                        </label>
                                        <div className="space-y-3">
                                            {newQuote.items.map((item, index) => (
                                                <div key={index} className="border rounded-lg p-3 bg-slate-50">
                                                    <div className="grid grid-cols-12 gap-2 items-end">
                                                        {/* Product Name */}
                                                        <div className="col-span-5">
                                                            <label className="text-xs text-slate-600">Ürün</label>
                                                            <input
                                                                list={`products-${index}`}
                                                                type="text"
                                                                className="input input-sm input-bordered w-full roundedlg"
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
                                                            <label className="text-xs text-slate-600">Adet</label>
                                                            <input
                                                                type="number"
                                                                className="input input-sm input-bordered w-full rounded-lg"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                required
                                                            />
                                                        </div>

                                                        {/* Unit Price */}
                                                        <div className="col-span-2">
                                                            <label className="text-xs text-slate-600">Liste Fiy.</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="input input-sm input-bordered w-full rounded-lg"
                                                                value={item.unitPrice}
                                                                onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                                                required
                                                            />
                                                        </div>

                                                        {/* Discount % */}
                                                        <div className="col-span-2">
                                                            <label className="text-xs text-slate-600">İsk. %</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                max="100"
                                                                className="input input-sm input-bordered w-full rounded-lg"
                                                                value={item.discountPercent}
                                                                onChange={(e) => updateItem(index, 'discountPercent', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Remove Button */}
                                                        {newQuote.items.length > 1 && (
                                                            <div className="col-span-1 text-center">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost btn-sm btn-circle text-error"
                                                                    onClick={() => removeItem(index)}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Item Total */}
                                                    <div className="text-right text-sm text-slate-600 mt-2">
                                                        Net: {getCurrencySymbol(newQuote.currency)}{calculateItemTotal(item).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm mt-3 rounded-lg"
                                            onClick={addNewItem}
                                        >
                                            <Plus size={16} /> Ürün Ekle
                                        </button>
                                    </div>

                                    {/* Notes */}
                                    <div className="form-control mb-4">
                                        <label className="label">
                                            <span className="label-text font-semibold">Notlar</span>
                                        </label>
                                        <textarea
                                            className="textarea textarea-bordered rounded-xl"
                                            rows="3"
                                            value={newQuote.notes}
                                            onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                                        />
                                    </div>

                                    {/* Totals */}
                                    <div className="bg-slate-100 rounded-lg p-4 mb-6">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Ara Toplam:</span>
                                            <span className="font-semibold">{getCurrencySymbol(newQuote.currency)}{calculateSubtotal().toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span>KDV (%20):</span>
                                            <span className="font-semibold">{getCurrencySymbol(newQuote.currency)}{(calculateSubtotal() * 0.20).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                                            <span>TOPLAM:</span>
                                            <span className="text-blue-600">{getCurrencySymbol(newQuote.currency)}{calculateGrandTotal().toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3">
                                        <button type="button" className="btn rounded-xl" onClick={() => setShowNewQuoteForm(false)}>
                                            İptal
                                        </button>
                                        <button type="submit" className="btn bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none hover:opacity-90 rounded-xl">
                                            Teklif Oluştur
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : selectedQuote ? (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedQuote.quoteNo}</h2>
                                        <p className="text-slate-600">{selectedQuote.customerName}</p>
                                        {selectedQuote.customerEmail && (
                                            <p className="text-sm text-slate-500">{selectedQuote.customerEmail}</p>
                                        )}
                                    </div>
                                    <div className={`badge ${getStatusBadge(selectedQuote.status)}`}>
                                        {selectedQuote.status}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-3">Ürünler</h3>
                                    <div className="overflow-x-auto">
                                        <table className="table w-full">
                                            <thead>
                                                <tr>
                                                    <th>Ürün</th>
                                                    <th className="text-center">Adet</th>
                                                    <th className="text-right">Liste Fiy.</th>
                                                    <th className="text-center">İsk. %</th>
                                                    <th className="text-right">Net Fiy.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedQuote.items?.map((item, idx) => {
                                                    const netPrice = item.unitPrice * (1 - (item.discountPercent / 100));
                                                    const lineTotal = item.quantity * netPrice;
                                                    return (
                                                        <tr key={idx}>
                                                            <td>{item.productName}</td>
                                                            <td className="text-center">{item.quantity}</td>
                                                            <td className="text-right">{getCurrencySymbol(selectedQuote.currency)}{item.unitPrice.toFixed(2)}</td>
                                                            <td className="text-center">{item.discountPercent}%</td>
                                                            <td className="text-right font-semibold">{getCurrencySymbol(selectedQuote.currency)}{lineTotal.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="bg-slate-100 rounded-lg p-4 mb-6">
                                    {(() => {
                                        const subtotal = selectedQuote.items?.reduce((sum, item) => {
                                            const netPrice = item.unitPrice * (1 - (item.discountPercent / 100));
                                            return sum + (item.quantity * netPrice);
                                        }, 0) || 0;
                                        const vat = subtotal * 0.20;
                                        const total = subtotal + vat;

                                        return (
                                            <>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Ara Toplam:</span>
                                                    <span className="font-semibold">{getCurrencySymbol(selectedQuote.currency)}{subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span>KDV (%20):</span>
                                                    <span className="font-semibold">{getCurrencySymbol(selectedQuote.currency)}{vat.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                                    <span>TOPLAM:</span>
                                                    <span className="text-blue-600">{getCurrencySymbol(selectedQuote.currency)}{total.toFixed(2)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Notes */}
                                {selectedQuote.notes && (
                                    <div className="mb-6">
                                        <h3 className="font-semibold mb-2">Notlar</h3>
                                        <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{selectedQuote.notes}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    {selectedQuote.status === 'Taslak' && (
                                        <button
                                            onClick={() => handleSendQuote(selectedQuote)}
                                            className="btn bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none hover:opacity-90 rounded-xl"
                                        >
                                            <Send size={18} /> Gönder
                                        </button>
                                    )}
                                    {selectedQuote.status === 'Gönderildi' && (
                                        <button
                                            onClick={() => handleApproveQuote(selectedQuote)}
                                            className="btn bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none hover:opacity-90 rounded-xl"
                                        >
                                            <CheckCircle size={18} /> Onayla
                                        </button>
                                    )}
                                    {selectedQuote.saleId && selectedQuote.sale && (
                                        <div className="alert alert-success">
                                            <span>Bu teklif onaylandı. Satış No: <strong>{selectedQuote.sale.saleNo}</strong></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                                <FileText size={64} className="mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500 text-lg">Bir teklif seçin veya yeni teklif oluşturun</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Email Modal */}
            {showEmailModal && selectedQuote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">E-posta Gönder</h3>
                            <button onClick={() => setShowEmailModal(false)} className="btn btn-ghost btn-sm btn-circle">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="label font-semibold">Teklif</label>
                                <div className="text-sm text-slate-600">
                                    {selectedQuote.quoteNo} — {selectedQuote.customerName}
                                </div>
                            </div>

                            <div>
                                <label className="label font-semibold">Kime (To) <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    className="input input-bordered w-full rounded-xl"
                                    value={emailForm.recipientEmail}
                                    onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label font-semibold">Gönderen (İsteğe Bağlı)</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full rounded-xl"
                                    value={emailForm.senderName}
                                    onChange={(e) => setEmailForm({ ...emailForm, senderName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label font-semibold">CC (İsteğe Bağlı, ; ile ayırın)</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full rounded-xl"
                                    placeholder="email1@firma.com; email2@firma.com"
                                    value={emailForm.cc}
                                    onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="btn rounded-xl"
                                disabled={sendingEmail}
                            >
                                İptal
                            </button>
                            <button
                                onClick={confirmSendEmail}
                                className="btn bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none hover:opacity-90 rounded-xl"
                                disabled={sendingEmail}
                            >
                                {sendingEmail ? 'Gönderiliyor...' : 'Gönder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
