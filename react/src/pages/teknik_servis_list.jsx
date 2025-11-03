import React from 'react';
import { useOutletContext } from 'react-router-dom';

export default function ServisList(props) {
  const outlet = useOutletContext?.() ?? {};
  const servisKayitlari = props.servisKayitlari ?? outlet.servisKayitlari ?? [];
  const roles = props.roles ?? outlet.roles ?? [];
  const openDetail = props.openDetail ?? outlet.openDetail ?? (async () => {});
  return (
    <div className="bg-white shadow-xl rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Aktif Servis Kayıtları</h2>
        <div className="relative">
          <input type="text" placeholder="Ara..." className="input input-bordered w-64 pl-9 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr className="text-slate-500 text-sm">
              <th>Seri No</th>
              <th>Ürün Modeli</th>
              <th>Firma</th>
              <th>GelişTarihi</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {servisKayitlari.map((kayit) => {
              const statusClass = kayit.durum === 'Tamamlandı' ? 'bg-emerald-100 text-emerald-700'
                : kayit.durum === 'İşlemde' ? 'bg-amber-100 text-amber-700'
                : kayit.durum === 'Teklif Bekliyor' ? 'bg-yellow-100 text-yellow-700'
                : kayit.durum === 'Teklif Gönderildi' ? 'bg-indigo-100 text-indigo-700'
                : 'bg-sky-100 text-sky-700';
              return (
                <tr key={kayit.id} className="hover:bg-slate-50 transition">
                  <td className="font-medium">{kayit.seriNo}</td>
                  <td>{kayit.urunModeli}</td>
                  <td>{kayit.firmaIsmi}</td>
                  <td>{kayit.gelisTarihi}</td>
                  <td>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                      {kayit.durum}
                    </span>
                  </td>
                  <td>
                    <button onClick={async()=>{ await openDetail(kayit); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">Detay</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
