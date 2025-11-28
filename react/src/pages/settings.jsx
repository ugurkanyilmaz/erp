import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { Settings, Wrench, Users } from 'lucide-react';

export default function SettingsLanding() {
  const modules = [
    { id: 'suggestions', title: 'Hazır Öneriler', desc: 'Teknik servis için alan kişi & yapan kişi önerileri', to: '/settings/suggestions', icon: Wrench, color: 'bg-violet-500' },
    { id: 'email', title: 'E-Posta Hesapları', desc: 'Teklif gönderiminde kullanılacak e-posta hesapları', to: '/settings/email', icon: Users, color: 'bg-emerald-500' },
    { id: 'users', title: 'Kullanıcı Ayarları', desc: 'Kullanıcı profilleri ve yetkiler', to: '/settings/users', icon: Users, color: 'bg-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Header title="Ayarlar" subtitle="Sistem genel ayarları" IconComponent={Settings} showBack={true} />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Ayarlar</h2>
          <p className="text-sm text-slate-500">Sistemin farklı bölümlerine ait ayarları buradan yönetebilirsiniz.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map(m => {
            const Icon = m.icon;
            return (
              <Link key={m.id} to={m.to} className="block">
                <div className="card bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-300 cursor-pointer">
                  <div className="card-body p-6 flex items-start gap-4">
                    <div className={`${m.color} w-14 h-14 rounded-2xl flex items-center justify-center shadow-md`}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800">{m.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{m.desc}</p>
                    </div>
                    <div className="flex items-center">
                      <button className="btn btn-ghost btn-sm">Aç</button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
