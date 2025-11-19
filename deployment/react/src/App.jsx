import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import MusteriYonetimi from './pages/musteri_yonetimi';
import TeknikServis from './pages/teknik_servis';
import TeknikServisList from './pages/teknik_servis_list';
import TeknikServisCreate from './pages/teknik_servis_create';
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
import Invoices from './pages/invoices';
import CompletedServices from './pages/completed_services';
import Login from './pages/login';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <main className="p-0 min-h-screen">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/teknik-servis/*"
                element={<ProtectedRoute><TeknikServis /></ProtectedRoute>}
              >
                <Route index element={<TeknikServisList />} />
                <Route path="new" element={<TeknikServisCreate />} />
                <Route path="muhasebe" element={<TeknikServisMuhasebe />} />
                <Route path="islem-ekle" element={<TeknikServisIslemEkle />} />
                <Route path="foto" element={<TeknikServisFoto />} />
              </Route>
              <Route path="/stock" element={<ProtectedRoute><StockProducts /></ProtectedRoute>} />
              <Route path="/stock/products" element={<ProtectedRoute><StockProducts /></ProtectedRoute>} />
              <Route path="/stock/parts" element={<ProtectedRoute><StockParts /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsLanding /></ProtectedRoute>} />
              <Route path="/settings/suggestions" element={<ProtectedRoute><SettingsSuggestions /></ProtectedRoute>} />
              <Route path="/settings/email" element={<ProtectedRoute><SettingsEmail /></ProtectedRoute>} />
              <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
              <Route path="/archive/sent-quotes" element={<ProtectedRoute><SentQuotes /></ProtectedRoute>} />
              <Route path="/archive/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/archive/completed-services" element={<ProtectedRoute><CompletedServices /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><MusteriYonetimi /></ProtectedRoute>} />
            </Routes>
          </main>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
