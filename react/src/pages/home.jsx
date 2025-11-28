import React from 'react';
import { Package, Wrench, FileText, Users, ShoppingCart, Archive, Settings, BarChart3, TrendingUp, Truck, Wallet, Percent } from 'lucide-react';
import Header from '../components/Header'
import { Link } from 'react-router-dom'

export default function ERPDashboard() {
  const modules = [
    { id: 1, title: 'Stok Durumu', icon: Package, color: 'bg-blue-500', count: '1,250' },
    { id: 2, title: 'Servis Takip', icon: Wrench, color: 'bg-violet-500', count: '42' },
    { id: 3, title: 'Satışlar', icon: ShoppingCart, color: 'bg-emerald-500', count: '156' },
    { id: 4, title: 'Müşteri Yönetimi', icon: Users, color: 'bg-orange-500', count: '342' },
    { id: 5, title: 'Satış Demo', icon: ShoppingCart, color: 'bg-pink-500', count: '89' },
    { id: 6, title: 'Siparişler', icon: Truck, color: 'bg-indigo-500', count: '24' },
    { id: 9, title: 'Gelen Ödemeler', icon: Wallet, color: 'bg-teal-500', count: '-' },
    { id: 10, title: 'Prim Hesabı', icon: Percent, color: 'bg-rose-500', count: '-' },
    { id: 7, title: 'Arşiv', icon: Archive, color: 'bg-cyan-500', count: '-' },
    { id: 8, title: 'Ayarlar', icon: Settings, color: 'bg-slate-500', count: '-' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header title="Keten Pnömatik" subtitle="Yönetim Paneli" IconComponent={Wrench} showNew={true} showSearch={true} />

      {/* Main Content */}
      <main className="w-full px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Hoş Geldiniz</h2>
          <p className="text-slate-600">İşlemlerinize devam etmek için bir modül seçin</p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            const card = (
              <div className="card bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-blue-300 cursor-pointer group">
                <div className="card-body p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${module.color} w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                      <Icon size={28} className="text-white" strokeWidth={2} />
                    </div>
                    {module.count !== '-' && (
                      <div className="badge badge-ghost badge-lg font-semibold">{module.count}</div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {module.title}
                  </h3>

                  <button className="btn btn-sm btn-outline btn-primary mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    Modülü Aç →
                  </button>
                </div>
              </div>
            );

            // Make the Servis Takip card link to the Teknik Servis page
            if (module.title === 'Servis Takip') {
              return (
                <Link key={module.id} to="/teknik-servis" className="block">
                  {card}
                </Link>
              )
            }

            // Make the Ayarlar card link to the Settings page
            if (module.title === 'Ayarlar') {
              return (
                <Link key={module.id} to="/settings" className="block">
                  {card}
                </Link>
              )
            }

            // Make the Müşteri Yönetimi card link to the customers page
            if (module.title === 'Müşteri Yönetimi') {
              return (
                <Link key={module.id} to="/customers" className="block">
                  {card}
                </Link>
              )
            }

            // Make the Stok Durumu card link to the Stock page
            if (module.title === 'Stok Durumu') {
              return (
                <Link key={module.id} to="/stock" className="block">
                  {card}
                </Link>
              )
            }

            // Make the Arşiv card link to the Archive page
            if (module.title === 'Arşiv') {
              return (
                <Link key={module.id} to="/archive" className="block">
                  {card}
                </Link>
              )
            }

            // Make the Sales Demo card link to the Sales Demo page
            if (module.title === 'Satış Demo') {
              return (
                <Link key={module.id} to="/sales-demo" className="block">
                  {card}
                </Link>
              )
            }

            if (module.title === 'Siparişler') {
              return (
                <Link key={module.id} to="/orders" className="block">
                  {card}
                </Link>
              )
            }

            if (module.title === 'Gelen Ödemeler') {
              return (
                <Link key={module.id} to="/incoming-payments" className="block">
                  {card}
                </Link>
              )
            }

            if (module.title === 'Satışlar') {
              return (
                <Link key={module.id} to="/sales" className="block">
                  {card}
                </Link>
              )
            }

            if (module.title === 'Prim Hesabı') {
              return (
                <Link key={module.id} to="/commissions" className="block">
                  {card}
                </Link>
              )
            }

            return (
              <div key={module.id}>
                {card}
              </div>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Bugünkü Satış</p>
                  <p className="text-3xl font-bold mt-1">₺24,500</p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
              </div>
              <div className="text-blue-100 text-sm mt-2">↗ %12 artış</div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Bekleyen İşlem</p>
                  <p className="text-3xl font-bold mt-1">18</p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <FileText size={24} />
                </div>
              </div>
              <div className="text-emerald-100 text-sm mt-2">5 acil işlem</div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm font-medium">Aktif Servis</p>
                  <p className="text-3xl font-bold mt-1">7</p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <Wrench size={24} />
                </div>
              </div>
              <div className="text-violet-100 text-sm mt-2">2 tamamlanmak üzere</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}