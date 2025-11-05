import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, ChevronLeft } from 'lucide-react';
import stockApi from '../hooks/stockApi';
import serviceApi from '../hooks/serviceApi';
import ServiceDetailModal from '../components/ServiceDetailModal';
import Notification from '../components/Notification';

export default function TeknikServis() {
  const location = useLocation();
  const base = '/teknik-servis';

  const getRoles = () => {
    try {
      const t = localStorage.getItem('token');
      if (!t) return [];
      const p = JSON.parse(atob(t.split('.')[1]));
      const role = p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (!role) return [];
      if (Array.isArray(role)) return role;
      return [role];
    } catch (e) {
      return [];
    }
  };

  const roles = getRoles();

  // Products for child pages (provide via Outlet context)
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    let mounted = true;
    setProductsLoading(true);
    stockApi.getProducts()
      .then((p) => { if (mounted) setProducts(p); })
      .catch((err) => { if (mounted) setProductsError(err?.message || 'Ürünler yüklenemedi'); })
      .finally(() => { if (mounted) setProductsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Spare parts (for products)
  const [spareParts, setSpareParts] = useState([]);
  const [sparePartsLoading, setSparePartsLoading] = useState(false);
  const [sparePartsError, setSparePartsError] = useState('');

  useEffect(() => {
    let mounted = true;
    setSparePartsLoading(true);
    stockApi.getSpareParts()
      .then((s) => { if (mounted) setSpareParts(s); })
      .catch((err) => { if (mounted) setSparePartsError(err?.message || 'Yedek parçalar yüklenemedi'); })
      .finally(() => { if (mounted) setSparePartsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Service records for child pages
  const [servisKayitlari, setServisKayitlari] = useState([]);
  const [servisLoading, setServisLoading] = useState(false);
  const [servisError, setServisError] = useState('');

  const reloadServisKayitlari = async () => {
    setServisLoading(true);
    try {
      const data = await serviceApi.getServiceRecords();
      setServisKayitlari(data || []);
      setServisError('');
    } catch (err) {
      console.error('Could not load service records', err);
      setServisError(err?.message || 'Servis kayıtları yüklenemedi');
    } finally {
      setServisLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) reloadServisKayitlari();
    return () => { mounted = false; };
  }, []);

  const tabs = [
    { to: `${base}`, label: 'Servis Listesi', key: 'liste' },
    { to: `${base}/new`, label: 'Yeni Kayıt', key: 'yeni' },
    ...(roles.includes('admin') || roles.includes('muhasebe') || roles.includes('servis') ? [{ to: `${base}/islem-ekle`, label: 'İşlem Ekle', key: 'islemEkle' }] : []),
    ...(roles.includes('admin') || roles.includes('muhasebe') ? [{ to: `${base}/muhasebe`, label: 'Muhasebe', key: 'muhasebe' }] : []),
  ];

  const isActive = (to) => {
    if (to === base) return location.pathname === base || location.pathname === `${base}`;
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  const navigate = useNavigate();

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [operations, setOperations] = useState([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [detailOptions, setDetailOptions] = useState({});

  const openDetail = async (record, options = {}) => {
    setSelectedRecord(record);
    setDetailOptions(options || {});
    setDetailOpen(true);
    setOpsLoading(true);
    try {
      const ops = await serviceApi.getServiceOperations(record.id);
      setOperations(ops || []);
    } catch (err) {
      console.error('Could not load operations for record', err);
      setOperations([]);
    } finally {
      setOpsLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedRecord(null);
    setDetailOptions({});
    setOperations([]);
  };

  const deleteOperation = async (operationId) => {
    if (!selectedRecord) return;
    try {
      await serviceApi.deleteServiceOperation(selectedRecord.id, operationId);
      // refresh
      const ops = await serviceApi.getServiceOperations(selectedRecord.id);
      setOperations(ops || []);
    } catch (err) {
      console.error('Could not delete operation', err);
      alert('Silme sırasında hata oluştu');
    }
  };

  const deleteRecord = async (recordId) => {
    try {
      await serviceApi.deleteServiceRecord(recordId);
      // refresh list and close modal
      await reloadServisKayitlari();
      closeDetail();
      alert('Kayıt silindi.');
    } catch (err) {
      console.error('Could not delete record', err);
      alert('Kayıt silinirken hata oluştu');
    }
  };

  const updateOperationLocal = async (operationId, newOp, opts = {}) => {
    // update local copy immediately
    setOperations((prev) => prev.map((o) => (o.id === operationId ? newOp : o)));
    if (opts.save) {
      try {
        await serviceApi.updateServiceOperation(selectedRecord.id, operationId, newOp);
        const ops = await serviceApi.getServiceOperations(selectedRecord.id);
        setOperations(ops || []);
      } catch (err) {
        console.error('Could not save operation', err);
        alert('Kaydetme sırasında hata oluştu');
      }
    }
  };

  const updateRecord = async (recordId, updatedRecord) => {
    try {
      await serviceApi.updateServiceRecord(recordId, updatedRecord);
      // Update local selected record
      setSelectedRecord(updatedRecord);
      // Refresh list
      await reloadServisKayitlari();
      setNotification({ type: 'success', message: 'Kayıt güncellendi.' });
    } catch (err) {
      console.error('Could not update record', err);
      setNotification({ type: 'error', message: 'Kayıt güncellenirken hata oluştu.' });
      throw err;
    }
  };

  // Notification for child pages
  const [notification, setNotification] = useState({ type: '', message: '' });

  const clearNotification = () => setNotification({ type: '', message: '' });

  // expose quote-sending hooks to children
  const sendBulkQuotes = async (payload) => {
    try {
      const res = await serviceApi.postBulkQuotes(payload);
      setNotification({ type: 'success', message: 'Toplu teklif PDF oluşturuldu.' });
      // Yenile: backend'de durumlar güncellendiği için kayıt listesini yeniden yükleyelim
      try { await reloadServisKayitlari(); } catch (err) { console.error('Could not reload service records after bulk quote', err); }
      return res;
    } catch (err) {
      console.error('sendBulkQuotes failed', err);
      setNotification({ type: 'error', message: 'Toplu teklif oluşturulamadı.' });
      throw err;
    }
  };

  const sendQuote = async (id) => {
    // single item wrapper
    return sendBulkQuotes({ recipientEmail: '', items: [{ id, partsPrice: 0, servicesPrice: 0, email: '', note: '' }] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50">
      {/* Header (visual only) */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition" onClick={() => navigate('/') }>
              <ChevronLeft size={22} className="text-slate-700" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md">
                <Wrench size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Servis Takip</h1>
                <p className="text-xs text-slate-500">Servis kayıtlarını kolayca yönetin</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-3 mb-8">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm ${
                isActive(tab.to)
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="space-y-6">
            <Outlet context={{ products, productsLoading, productsError, spareParts, sparePartsLoading, sparePartsError, servisKayitlari, servisLoading, servisError, reloadServisKayitlari, roles, openDetail, setNotification, sendBulkQuotes, sendQuote }} />
          </motion.div>
        </AnimatePresence>
        <Notification type={notification.type || 'info'} message={notification.message || ''} onClose={clearNotification} />

  <ServiceDetailModal open={detailOpen} onClose={closeDetail} record={selectedRecord} operations={operations} loading={opsLoading} onDeleteOperation={deleteOperation} onUpdateOperation={updateOperationLocal} canEdit={roles.includes('admin') || roles.includes('muhasebe')} onDeleteRecord={deleteRecord} canDelete={roles.includes('admin')} showPrices={!!detailOptions.showPrices} onUpdateRecord={updateRecord} />
      </main>
    </div>
  );
}

