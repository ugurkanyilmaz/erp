import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import MusteriYonetimi from './pages/musteri_yonetimi';
import TeknikServis from './pages/teknik_servis';
import TeknikServisList from './pages/teknik_servis_list';
import TeknikServisNew from './pages/teknik_servis_new';
import TeknikServisMuhasebe from './pages/teknik_servis_muhasebe';
import TeknikServisIslemEkle from './pages/teknik_servis_islem_ekle';
import TeknikServisFoto from './pages/teknik_servis_foto';
import SettingsSuggestions from './pages/settings_suggestions';
import SettingsLanding from './pages/settings';
import SettingsEmail from './pages/settings_email';
import StockProducts from './pages/stock_products';
import StockParts from './pages/stock_parts';
import ArchivePage from './pages/archive';
import SentQuotes from './pages/sent_quotes';
import ServiceQuotesArchive from './pages/archive_service_quotes';
import ProductQuotesArchive from './pages/archive_product_quotes';
import Invoices from './pages/invoices';
import CompletedServices from './pages/completed_services';
import Login from './pages/login';
import SalesDemo from './pages/sales_demo';
import OrdersPage from './pages/orders';
import IncomingPaymentsPage from './pages/incoming_payments';
import SalesPage from './pages/sales';
import CommissionsPage from './pages/commissions';
import ProductQuotesPage from './pages/product_quotes';

import AdminUsersPage from './pages/admin/AdminUsersPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <main className="p-0 min-h-screen">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/teknik-servis/*" element={<ProtectedRoute roles={['admin', 'servis', 'muhasebe']}><TeknikServis /></ProtectedRoute>}>
            <Route index element={<TeknikServisList />} />
            <Route path="new" element={<TeknikServisNew />} />
            <Route path="muhasebe" element={<TeknikServisMuhasebe />} />
            <Route path="islem-ekle" element={<TeknikServisIslemEkle />} />
            <Route path="foto" element={<TeknikServisFoto />} />
          </Route>
          <Route path="/stock" element={<ProtectedRoute roles={['admin', 'muhasebe']}><StockProducts /></ProtectedRoute>} />
          <Route path="/stock/products" element={<ProtectedRoute roles={['admin', 'muhasebe']}><StockProducts /></ProtectedRoute>} />
          <Route path="/stock/parts" element={<ProtectedRoute roles={['admin', 'muhasebe']}><StockParts /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={['admin', 'muhasebe']}><SettingsLanding /></ProtectedRoute>} />
          <Route path="/settings/suggestions" element={<ProtectedRoute roles={['admin', 'muhasebe']}><SettingsSuggestions /></ProtectedRoute>} />
          <Route path="/settings/email" element={<ProtectedRoute roles={['admin', 'muhasebe']}><SettingsEmail /></ProtectedRoute>} />
          <Route path="/archive" element={<ProtectedRoute roles={['admin', 'muhasebe']}><ArchivePage /></ProtectedRoute>} />
          <Route path="/archive/sent-quotes" element={<ProtectedRoute roles={['admin', 'muhasebe']}><SentQuotes /></ProtectedRoute>} />
          <Route path="/archive/service-quotes" element={<ProtectedRoute roles={['admin', 'muhasebe']}><ServiceQuotesArchive /></ProtectedRoute>} />
          <Route path="/archive/product-quotes" element={<ProtectedRoute roles={['admin', 'muhasebe']}><ProductQuotesArchive /></ProtectedRoute>} />
          <Route path="/archive/invoices" element={<ProtectedRoute roles={['admin', 'muhasebe']}><Invoices /></ProtectedRoute>} />
          <Route path="/archive/completed-services" element={<ProtectedRoute roles={['admin', 'muhasebe']}><CompletedServices /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute roles={['admin', 'muhasebe']}><MusteriYonetimi /></ProtectedRoute>} />
          <Route path="/sales-demo" element={<ProtectedRoute roles={['admin', 'muhasebe', 'satis']}><SalesDemo /></ProtectedRoute>} />
          <Route path="/tedarik" element={<ProtectedRoute roles={['admin', 'muhasebe']}><OrdersPage /></ProtectedRoute>} />
          <Route path="/incoming-payments" element={<ProtectedRoute roles={['admin', 'muhasebe']}><IncomingPaymentsPage /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute roles={['admin', 'muhasebe']}><SalesPage /></ProtectedRoute>} />

          <Route path="/commissions" element={<ProtectedRoute roles={['admin', 'muhasebe']}><CommissionsPage /></ProtectedRoute>} />
          <Route path="/settings/users" element={<ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
