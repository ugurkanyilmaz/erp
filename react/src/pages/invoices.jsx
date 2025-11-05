import React from 'react';
import { FileText } from 'lucide-react';
import Header from '../components/Header';

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header title="Faturalar" subtitle="Fatura kayıtları" IconComponent={FileText} showNew={false} showSearch={true} />

      <main className="w-full px-6 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Faturalar</h3>
          <p className="text-slate-500">Bu bölüm henüz hazır değil. Burada fatura listesi, filtreler ve detay sayfaları olacak.</p>
        </div>
      </main>
    </div>
  );
}
