import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import TeknikServis from './pages/teknik_servis';
import TeknikServisList from './pages/teknik_servis_list';
import TeknikServisNew from './pages/teknik_servis_new';
import TeknikServisMuhasebe from './pages/teknik_servis_muhasebe';
import TeknikServisIslemEkle from './pages/teknik_servis_islem_ekle';
import TeknikServisFoto from './pages/teknik_servis_foto';
import StockProducts from './pages/stock_products';
import StockParts from './pages/stock_parts';
import ArchivePage from './pages/archive';
import SentQuotes from './pages/sent_quotes';
import Invoices from './pages/invoices';
import CompletedServices from './pages/completed_services';
import Login from './pages/login';
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <main className="p-0 min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/teknik-servis/*" element={<TeknikServis />}>
              <Route index element={<TeknikServisList />} />
              <Route path="new" element={<TeknikServisNew />} />
              <Route path="muhasebe" element={<TeknikServisMuhasebe />} />
              <Route path="islem-ekle" element={<TeknikServisIslemEkle />} />
              <Route path="foto" element={<TeknikServisFoto />} />
            </Route>
            <Route path="/stock" element={<StockProducts />} />
            <Route path="/stock/products" element={<StockProducts />} />
            <Route path="/stock/parts" element={<StockParts />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/archive/sent-quotes" element={<SentQuotes />} />
            <Route path="/archive/invoices" element={<Invoices />} />
            <Route path="/archive/completed-services" element={<CompletedServices />} />
          </Routes>
        </main>
    </BrowserRouter>
  )
}

export default App
