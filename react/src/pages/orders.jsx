import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Trash2, X } from 'lucide-react';
import Header from '../components/Header';
import accountingApi from '../hooks/accountingApi';
import stockApi from '../hooks/stockApi';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [newOrder, setNewOrder] = useState({
        supplier: '',
        items: [{ productId: null, productName: '', quantity: 1, searchTerm: '' }]
    });

    useEffect(() => {
        fetchOrders();
        fetchProducts();
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

    const handleProductChange = (index, value) => {
        const items = [...newOrder.items];
        items[index].searchTerm = value;

        // Try to match product from list
        const match = products.find(p => `${p.sku} - ${p.title}` === value || p.title === value);
        if (match) {
            items[index].productId = match.id;
            items[index].productName = match.title;
        } else {
            items[index].productId = null;
            items[index].productName = value;
        }

        setNewOrder({ ...newOrder, items });
    };

    const handleQuantityChange = (index, value) => {
        const items = [...newOrder.items];
        items[index].quantity = parseInt(value) || 1;
        setNewOrder({ ...newOrder, items });
    };

    const addNewItem = () => {
        setNewOrder({
            ...newOrder,
            items: [...newOrder.items, { productId: null, productName: '', quantity: 1, searchTerm: '' }]
        });
    };

    const removeItem = (index) => {
        if (newOrder.items.length === 1) return; // Keep at least one item
        const items = newOrder.items.filter((_, i) => i !== index);
        setNewOrder({ ...newOrder, items });
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                supplier: newOrder.supplier,
                items: newOrder.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName || item.searchTerm,
                    quantity: item.quantity
                }))
            };

            await accountingApi.createOrder(payload);
            setShowModal(false);
            setNewOrder({ supplier: '', items: [{ productId: null, productName: '', quantity: 1, searchTerm: '' }] });
            fetchOrders();
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Sipariş oluşturulurken hata oluştu');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await accountingApi.updateOrderStatus(id, status);
            fetchOrders();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Sipariş Verildi': return 'badge-info';
            case 'Yolda': return 'badge-warning';
            case 'Gümrükte': return 'badge-error';
            case 'Geldi': return 'badge-success';
            default: return 'badge-ghost';
        }
    };

    const filteredOrders = orders.filter(order => {
        const hasItems = order.orderItems && order.orderItems.length > 0;
        const matchesSearch = hasItems
            ? order.orderItems.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            order.supplier.toLowerCase().includes(searchTerm.toLowerCase())
            : order.supplier.toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === 'active') {
            return !order.isArchived && matchesSearch;
        } else {
            return order.isArchived && matchesSearch;
        }
    });

    return (
        <div className="min-h-screen bg-slate-50">
            <Header title="Siparişler" subtitle="Verilen siparişlerin takibi" IconComponent={Package} showNew={false} showBack={true} />

            <main className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex gap-3">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm ${activeTab === 'active'
                                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                        >
                            Aktif Siparişler
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm ${activeTab === 'history'
                                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                        >
                            Sipariş Geçmişi
                        </button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Ürün veya tedarikçi ara..."
                                className="input input-bordered pl-10 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center gap-2"
                        >
                            <Plus size={20} /> Yeni Sipariş
                        </button>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>Ürünler</th>
                                    <th>Tedarikçi</th>
                                    <th>Tarih</th>
                                    <th>Durum</th>
                                    {activeTab === 'active' && <th>İşlemler</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover">
                                        <td>
                                            {order.orderItems && order.orderItems.length > 0 ? (
                                                <div className="space-y-1">
                                                    {order.orderItems.map((item, idx) => (
                                                        <div key={idx} className="text-sm">
                                                            <span className="font-bold">{item.productName}</span>
                                                            <span className="text-slate-500"> x{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="font-medium">{order.supplier}</td>
                                        <td>{new Date(order.orderDate).toLocaleDateString('tr-TR')}</td>
                                        <td>
                                            <div className={`badge ${getStatusBadge(order.status)} gap-2`}>
                                                {order.status}
                                            </div>
                                        </td>
                                        {activeTab === 'active' && (
                                            <td>
                                                <div className="dropdown dropdown-end">
                                                    <label tabIndex={0} className="btn btn-ghost btn-xs">Durum Değiştir</label>
                                                    <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-50">
                                                        <li><a onClick={() => handleStatusUpdate(order.id, 'Sipariş Verildi')}>Sipariş Verildi</a></li>
                                                        <li><a onClick={() => handleStatusUpdate(order.id, 'Yolda')}>Yolda</a></li>
                                                        <li><a onClick={() => handleStatusUpdate(order.id, 'Gümrükte')}>Gümrükte</a></li>
                                                        <li><a onClick={() => handleStatusUpdate(order.id, 'Geldi')}>Geldi</a></li>
                                                    </ul>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={activeTab === 'active' ? 5 : 4} className="text-center py-8 text-slate-500">
                                            {searchTerm ? 'Arama kriterlerine uygun sipariş bulunamadı.' : (activeTab === 'active' ? 'Aktif sipariş bulunmuyor.' : 'Geçmiş sipariş bulunmuyor.')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* New Order Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-2xl text-slate-800">Yeni Sipariş Oluştur</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm btn-circle">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrder}>
                            <div className="form-control w-full mb-6">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Tedarikçi</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                    value={newOrder.supplier}
                                    onChange={e => setNewOrder({ ...newOrder, supplier: e.target.value })}
                                />
                            </div>

                            <div className="mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold text-slate-700">Ürünler</span>
                                </label>
                                <div className="space-y-3">
                                    {newOrder.items.map((item, index) => (
                                        <div key={index} className="flex gap-3 items-end">
                                            {/* Ürün Dropdown */}
                                            <div className="flex-1">
                                                <input
                                                    list={`product-suggestions-${index}`}
                                                    type="text"
                                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    placeholder="Ürün ara veya yaz..."
                                                    value={item.searchTerm}
                                                    onChange={(e) => handleProductChange(index, e.target.value)}
                                                    required
                                                />
                                                <datalist id={`product-suggestions-${index}`}>
                                                    {products.map(p => (
                                                        <option key={p.id} value={`${p.sku} - ${p.title}`} />
                                                    ))}
                                                </datalist>
                                            </div>

                                            {/* Adet */}
                                            <div className="w-24">
                                                <input
                                                    type="number"
                                                    className="input input-bordered w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                    required
                                                />
                                            </div>

                                            {/* Sil Butonu */}
                                            {newOrder.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                                                    onClick={() => removeItem(index)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
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

                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
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
                                    Sipariş Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
