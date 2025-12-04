import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Trash2, X, TrendingUp, Sparkles, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import accountingApi from '../hooks/accountingApi';
import stockApi from '../hooks/stockApi';
import serviceApi from '../hooks/serviceApi';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showNewOrderForm, setShowNewOrderForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newOrder, setNewOrder] = useState({
        customerName: '',
        notes: '',
        items: [{ productId: null, productName: '', quantity: 1, searchTerm: '' }]
    });

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        fetchCustomers();
    }, []);

    const fetchOrders = async () => {
        try {
            const data = await accountingApi.getOrders();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
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

    const handleProductChange = (index, value) => {
        const items = [...newOrder.items];
        items[index].searchTerm = value;

        // Try to match product
        const match = products.find(p =>
            `${p.sku} - ${p.title}` === value ||
            p.title === value ||
            p.sku === value
        );

        if (match) {
            items[index].productId = match.id;
            items[index].productName = match.title;
        } else {
            items[index].productId = null;
            items[index].productName = value;
        }

        setNewOrder({ ...newOrder, items });
    };

    const updateItem = (index, field, value) => {
        const items = [...newOrder.items];
        items[index][field] = value;
        setNewOrder({ ...newOrder, items });
    };

    const addNewItem = () => {
        setNewOrder({
            ...newOrder,
            items: [...newOrder.items, { productId: null, productName: '', quantity: 1, searchTerm: '' }]
        });
    };

    const removeItem = (index) => {
        if (newOrder.items.length === 1) return;
        const items = newOrder.items.filter((_, i) => i !== index);
        setNewOrder({ ...newOrder, items });
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                supplier: newOrder.customerName, // Backend expects 'supplier'
                notes: newOrder.notes,
                items: newOrder.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName || item.searchTerm,
                    quantity: parseInt(item.quantity)
                }))
            };

            await accountingApi.createOrder(payload);

            // Reset form
            setNewOrder({
                customerName: '',
                notes: '',
                items: [{ productId: null, productName: '', quantity: 1, searchTerm: '' }]
            });
            setShowNewOrderForm(false);

            fetchOrders();
            alert('Sipariş başarıyla oluşturuldu!');
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Sipariş oluşturulamadı');
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        if (!window.confirm(`Sipariş durumunu "${newStatus}" olarak güncellemek istiyor musunuz?`)) {
            return;
        }

        try {
            await accountingApi.updateOrderStatus(orderId, { status: newStatus });
            fetchOrders();
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
            alert('Sipariş durumu güncellendi!');
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Sipariş durumu güncellenemedi');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Sipariş Verildi': return 'bg-amber-100 text-amber-700 border-amber-300';
            case 'Hazırlanıyor': return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'Yolda': return 'bg-purple-100 text-purple-700 border-purple-300';
            case 'Gümrükte': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
            case 'Ulaştı': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
            case 'İptal': return 'bg-red-100 text-red-700 border-red-300';
            default: return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Sipariş Verildi': return <Clock size={16} />;
            case 'Hazırlanıyor': return <Package size={16} />;
            case 'Yolda': return <TrendingUp size={16} />;
            case 'Gümrükte': return <Package size={16} />;
            case 'Ulaştı': return <CheckCircle size={16} />;
            case 'İptal': return <AlertCircle size={16} />;
            default: return null;
        }
    };

    const filteredOrders = orders.filter(o =>
        (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.orderNo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statusOptions = ['Sipariş Verildi', 'Hazırlanıyor', 'Yolda', 'Gümrükte', 'Ulaştı', 'İptal'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
            <Header title="Tedarik" subtitle="Tedarik siparişleri oluştur ve takip et" IconComponent={Package} showNew={false} showBack={true} />

            <main className="p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100 text-sm font-medium">Sipariş Verildi</p>
                                <h3 className="text-4xl font-bold mt-2">{orders.filter(o => o.status === 'Sipariş Verildi').length}</h3>
                            </div>
                            <Clock size={48} className="opacity-20" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Hazırlanıyor</p>
                                <h3 className="text-4xl font-bold mt-2">{orders.filter(o => o.status === 'Hazırlanıyor').length}</h3>
                            </div>
                            <Package size={48} className="opacity-20" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Yolda</p>
                                <h3 className="text-4xl font-bold mt-2">{orders.filter(o => o.status === 'Yolda').length}</h3>
                            </div>
                            <TrendingUp size={48} className="opacity-20" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Ulaştı</p>
                                <h3 className="text-4xl font-bold mt-2">{orders.filter(o => o.status === 'Ulaştı').length}</h3>
                            </div>
                            <CheckCircle size={48} className="opacity-20" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Sol: Sipariş Listesi */}
                    <div className="w-1/3">
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                                    <Sparkles size={24} className="text-purple-500" />
                                    Tedarik Siparişleri
                                </h2>
                                <button
                                    onClick={() => setShowNewOrderForm(true)}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
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
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Order List */}
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredOrders.map(order => (
                                    <div
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${selectedOrder?.id === order.id
                                            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg scale-105'
                                            : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-800 text-lg">{order.orderNo}</div>
                                                <div className="text-sm text-slate-600 mt-1">{order.customerName}</div>
                                                <div className="text-xs text-slate-500 mt-2">
                                                    {new Date(order.orderDate).toLocaleDateString('tr-TR')}
                                                </div>
                                                <div className="text-xs text-slate-600 font-semibold mt-2">
                                                    {order.items?.length || 0} ürün
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 flex items-center gap-1 ${getStatusBadge(order.status)}`}>
                                                {getStatusIcon(order.status)}
                                                {order.status}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredOrders.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        <Package size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>Sipariş bulunamadı</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Detay / Yeni Sipariş */}
                    <div className="flex-1">
                        {showNewOrderForm ? (
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Yeni Tedarik Siparişi</h2>
                                    <button onClick={() => setShowNewOrderForm(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateOrder}>
                                    {/* Customer */}
                                    <div className="form-control mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Müşteri</span>
                                        </label>
                                        <input
                                            list="customers"
                                            type="text"
                                            className="input input-bordered rounded-xl border-2 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                                            required
                                            value={newOrder.customerName}
                                            onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                                        />
                                        <datalist id="customers">
                                            {customers.map(c => (
                                                <option key={c.id} value={c.name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    {/* Products */}
                                    <div className="mb-6">
                                        <label className="label">
                                            <span className="label-text font-bold text-slate-700">Ürünler</span>
                                        </label>
                                        <div className="space-y-4">
                                            {newOrder.items.map((item, index) => (
                                                <div key={index} className="bg-gradient-to-r from-slate-50 to-purple-50 border-2 border-slate-200 rounded-xl p-4">
                                                    <div className="grid grid-cols-12 gap-3 items-end">
                                                        {/* Product Name */}
                                                        <div className="col-span-9">
                                                            <label className="text-xs font-semibold text-slate-600">Ürün</label>
                                                            <input
                                                                list={`products-${index}`}
                                                                type="text"
                                                                className="input input-sm input-bordered w-full rounded-lg border-2 focus:border-purple-400 transition-all mt-1"
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
                                                                className="input input-sm input-bordered w-full rounded-lg border-2 focus:border-purple-400 transition-all mt-1"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                required
                                                            />
                                                        </div>

                                                        {/* Remove Button */}
                                                        {newOrder.items.length > 1 && (
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
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm mt-4 rounded-lg hover:bg-purple-50"
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
                                            className="textarea textarea-bordered rounded-xl border-2 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                                            rows="3"
                                            value={newOrder.notes}
                                            onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3">
                                        <button type="button" className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all font-semibold" onClick={() => setShowNewOrderForm(false)}>
                                            İptal
                                        </button>
                                        <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                                            Sipariş Oluştur
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : selectedOrder ? (
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-3xl font-bold text-slate-800">{selectedOrder.orderNo}</h2>
                                        <p className="text-lg text-slate-600 mt-2">{selectedOrder.customerName}</p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {new Date(selectedOrder.orderDate).toLocaleDateString('tr-TR')}
                                        </p>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-sm font-bold border-2 flex items-center gap-2 ${getStatusBadge(selectedOrder.status)}`}>
                                        {getStatusIcon(selectedOrder.status)}
                                        {selectedOrder.status}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="mb-8">
                                    <h3 className="font-bold text-xl mb-4 text-slate-700">Ürünler</h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items?.map((item, idx) => (
                                            <div key={idx} className="bg-gradient-to-r from-slate-50 to-purple-50 border-2 border-slate-200 rounded-xl p-4">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-slate-800">{item.productName}</div>
                                                        {item.product && (
                                                            <div className="text-xs text-slate-500 mt-1">SKU: {item.product.sku}</div>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-purple-600">{item.quantity} adet</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedOrder.notes && (
                                    <div className="mb-8">
                                        <h3 className="font-bold text-xl mb-3 text-slate-700">Notlar</h3>
                                        <p className="text-slate-600 bg-slate-50 p-4 rounded-xl border-2 border-slate-200">{selectedOrder.notes}</p>
                                    </div>
                                )}

                                {/* Status Update */}
                                <div className="mt-8">
                                    <h3 className="font-bold text-xl mb-4 text-slate-700">Durum Değiştir</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {statusOptions.map(status => (
                                            <button
                                                key={status}
                                                onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                                                disabled={selectedOrder.status === status}
                                                className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 border-2 flex items-center gap-2 ${selectedOrder.status === status
                                                    ? getStatusBadge(status) + ' opacity-50 cursor-not-allowed'
                                                    : 'bg-white hover:shadow-lg hover:scale-105 ' + getStatusBadge(status).replace('bg-', 'hover:bg-').replace('100', '50')
                                                    }`}
                                            >
                                                {getStatusIcon(status)}
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-16 text-center border border-white/20">
                                <Package size={80} className="mx-auto text-slate-300 mb-6" />
                                <p className="text-slate-500 text-xl font-semibold">Bir sipariş seçin veya yeni tedarik siparişi oluşturun</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #a855f7, #ec4899);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #9333ea, #db2777);
                }
            `}</style>
        </div>
    );
}
