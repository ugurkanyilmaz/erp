import React from 'react';
import { Archive, Mail, FileText, Wrench, Package } from 'lucide-react';
import Header from '../components/Header';
import { Link } from 'react-router-dom';

export default function ArchivePage() {
  const items = [
    { to: '/archive/service-quotes', label: 'Tamir Teklifleri', description: 'Gönderilen tamir fiyat teklifleri', icon: Wrench },
    { to: '/archive/product-quotes', label: 'Ürün Teklifleri', description: 'Gönderilen ürün fiyat teklifleri', icon: Package },
    { to: '/archive/invoices', label: 'Faturalar', description: 'Bu modüle gitmek için tıklayın', icon: FileText },
    { to: '/archive/completed-services', label: 'Tamamlanan Servisler', description: 'Bu modüle gitmek için tıklayın', icon: FileText },
    // add more modules here as needed
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header title="Arşiv" subtitle="Geçmiş Kayıtlar ve Belgeler" IconComponent={Archive} showNew={false} showSearch={false} showBack={true} />

      <main className="w-full px-6 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Arşiv Modülleri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to} className="block p-4 border rounded-lg hover:shadow-md transition flex items-center gap-4">
                  <Icon size={28} className="text-slate-600" />
                  <div>
                    <div className="font-semibold text-lg">{it.label}</div>
                    <div className="text-sm text-slate-500">{it.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
