import React, { useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { ShoppingCart, Search, Plus, RotateCcw, History, User, Building, Package as PackageIcon, Calendar, Camera } from 'lucide-react';
import Header from '../components/Header';
import Notification from '../components/Notification';
import stockApi from '../hooks/stockApi';
import customerApi from '../hooks/customerApi';
import salesDemoApi from '../hooks/salesDemoApi';

export default function SalesDemo() {
    const [activeTab, setActiveTab] = useState('active'); // active, history, new
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [activeRecords, setActiveRecords] = useState([]);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ type: '', message: '' });
    const [showScanner, setShowScanner] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [stream, setStream] = useState(null);

    // Form state
    const [selectedProduct, setSelectedProduct] = useState('');
    const [targetCompany, setTargetCompany] = useState('');
    const [serialNo, setSerialNo] = useState('');
    const [takenDate, setTakenDate] = useState(new Date().toISOString().split('T')[0]);
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

    useEffect(() => {
        if (showScanner) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [showScanner]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(mediaStream);
            const video = document.getElementById('camera-feed');
            if (video) {
                video.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setNotification({ type: 'error', message: 'Kamera başlatılamadı' });
            setShowScanner(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const stopScanner = () => {
        stopCamera();
        setShowScanner(false);
        setIsScanning(false);
    };

    const captureAndRead = async () => {
        const video = document.getElementById('camera-feed');
        if (!video) return;

        setIsScanning(true);
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw full video frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Calculate crop area (center of the image, matching the visual overlay)
            // Overlay is w-64 (256px) h-16 (64px) centered
            // We need to calculate this relative to the video element's displayed size vs actual size
            // For simplicity, let's assume we crop the center 50% width and 20% height

            const cropWidth = Math.min(canvas.width * 0.8, 600); // Max 600px width
            const cropHeight = cropWidth * 0.25; // 4:1 aspect ratio like the box
            const startX = (canvas.width - cropWidth) / 2;
            const startY = (canvas.height - cropHeight) / 2;

            // Create a new canvas for the cropped image
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            const croppedCtx = croppedCanvas.getContext('2d');

            // Draw the cropped area
            croppedCtx.drawImage(
                canvas,
                startX, startY, cropWidth, cropHeight,
                0, 0, cropWidth, cropHeight
            );

            // Convert to image data URL
            const imageUrl = croppedCanvas.toDataURL('image/png');

            // Perform OCR
            const worker = await createWorker('eng'); // 'eng' is usually enough for alphanumeric
            const ret = await worker.recognize(imageUrl);
            await worker.terminate();

            const text = ret.data.text.trim().replace(/\s+/g, ''); // Remove whitespace
            if (text) {
                setSerialNo(text);
                setNotification({ type: 'success', message: `Okundu: ${text}` });
                stopScanner();
            } else {
                setNotification({ type: 'warning', message: 'Metin okunamadı, tekrar deneyin' });
            }

        } catch (err) {
            console.error("OCR Error:", err);
            setNotification({ type: 'error', message: 'Okuma hatası' });
        } finally {
            setIsScanning(false);
        }
    };

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
                serialNo,
                takenDate: takenDate ? new Date(takenDate) : undefined,
                salesPersonId: salesPersonId || undefined // Backend handles default if empty for sales users
            });
            setNotification({ type: 'success', message: 'Ürün çıkışı yapıldı' });
            // Reset form
            setSelectedProduct('');
            setTargetCompany('');
            setCustomerSearchTerm('');
            setSerialNo('');
            setTakenDate(new Date().toISOString().split('T')[0]);
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

                                {/* Serial No & Date Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Serial No */}
                                    <div className="form-control">
                                        <label className="label font-medium text-slate-700">Seri No</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="input input-bordered w-full"
                                                placeholder="Cihaz seri numarası..."
                                                value={serialNo}
                                                onChange={(e) => setSerialNo(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-square btn-outline"
                                                onClick={() => setShowScanner(true)}
                                            >
                                                📷
                                            </button>
                                        </div>
                                    </div>

                                    {/* Date Picker */}
                                    <div className="form-control">
                                        <label className="label font-medium text-slate-700">Tarih</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="date"
                                                className="input input-bordered w-full pl-10"
                                                value={takenDate}
                                                onChange={(e) => setTakenDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
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

            {/* OCR Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                    <div className="w-full max-w-lg mx-4 bg-black rounded-2xl shadow-2xl overflow-hidden relative flex flex-col">
                        <div className="p-4 flex justify-between items-center bg-slate-900 text-white z-10">
                            <h3 className="font-bold text-lg">Seri No Tara</h3>
                            <button
                                onClick={() => stopScanner()}
                                className="btn btn-circle btn-sm btn-ghost text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="relative w-full bg-black aspect-[4/3] overflow-hidden">
                            <video
                                id="camera-feed"
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            ></video>

                            {/* Scan Region Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-64 h-16 border-2 border-emerald-500 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] relative">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1"></div>
                                </div>
                            </div>

                            {/* Scanning Indicator */}
                            {isScanning && (
                                <div className="absolute bottom-4 left-0 right-0 text-center">
                                    <span className="inline-block px-3 py-1 bg-black/60 text-white text-sm rounded-full animate-pulse">
                                        Taranıyor...
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-900 flex justify-center gap-4">
                            <button
                                onClick={captureAndRead}
                                disabled={isScanning}
                                className="btn btn-emerald w-full max-w-xs gap-2"
                            >
                                {isScanning ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Okunuyor
                                    </>
                                ) : (
                                    <>
                                        <Camera size={20} />
                                        Tara
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
