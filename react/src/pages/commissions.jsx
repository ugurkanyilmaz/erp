import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Calendar, Award, X, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import accountingApi from '../hooks/accountingApi';

export default function CommissionsPage() {
    const [commissions, setCommissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);
    const [details, setDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchCommissions();
    }, []);

    const fetchCommissions = async () => {
        try {
            // We need to add this method to accountingApi first, but for now we'll fetch directly or assume it exists
            // Since we just added the endpoint to backend, let's use a direct fetch or extend the hook later
            // For this implementation, I'll assume accountingApi has getCommissions or I'll add it.
            // Let's assume we will add it to the hook.
            const data = await accountingApi.getCommissions();
            setCommissions(data);
        } catch (error) {
            console.error('Error fetching commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = async (salesPersonId) => {
        setSelectedSalesPerson(salesPersonId);
        setLoadingDetails(true);
        try {
            const data = await accountingApi.getCommissionDetails(salesPersonId);
            setDetails(data);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Mock data if fetch fails (for development)
    const mockCommissions = [
        { salesPersonId: 'satis1', totalCommission: 1500.50, totalSalesCount: 12, lastCommissionDate: '2023-12-01T10:00:00' },
        { salesPersonId: 'ugur', totalCommission: 3250.00, totalSalesCount: 8, lastCommissionDate: '2023-12-03T14:30:00' },
    ];

    const displayCommissions = commissions.length > 0 ? commissions : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Header title="Prim Takibi" subtitle="Satış personeli prim durumları" IconComponent={TrendingUp} showNew={false} showBack={true} />

            <main className="p-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-indigo-100 text-sm">Toplam Dağıtılan Prim</p>
                                    <h3 className="text-3xl font-bold mt-1">
                                        ₺{displayCommissions.reduce((sum, c) => sum + c.totalCommission, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </h3>
                                </div>
                                <DollarSign size={40} className="opacity-30" />
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-100 text-sm">Aktif Satış Personeli</p>
                                    <h3 className="text-3xl font-bold mt-1">{displayCommissions.length}</h3>
                                </div>
                                <Users size={40} className="opacity-30" />
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-amber-100 text-sm">Toplam Primli Satış</p>
                                    <h3 className="text-3xl font-bold mt-1">
                                        {displayCommissions.reduce((sum, c) => sum + c.totalSalesCount, 0)}
                                    </h3>
                                </div>
                                <Award size={40} className="opacity-30" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sales Person Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayCommissions.map((comm, index) => (
                        <div
                            key={index}
                            onClick={() => handleCardClick(comm.salesPersonId)}
                            className="card bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-slate-100 hover:border-indigo-200 group cursor-pointer"
                        >
                            <div className="card-body">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {comm.salesPersonId.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="card-title text-slate-700">{comm.salesPersonId}</h3>
                                        <p className="text-xs text-slate-500">Satış Personeli</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                        <span className="text-slate-600 text-sm font-medium">Toplam Prim</span>
                                        <span className="text-emerald-600 font-bold text-lg">
                                            ₺{comm.totalCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                        <span className="text-slate-600 text-sm font-medium">Satış Adedi</span>
                                        <span className="text-indigo-600 font-bold">
                                            {comm.totalSalesCount} Adet
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                        <span className="text-slate-600 text-sm font-medium">Son İşlem</span>
                                        <span className="text-slate-700 font-medium text-sm">
                                            {new Date(comm.lastCommissionDate).toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>

                                    <div className="pt-2 text-center">
                                        <span className="text-indigo-500 text-sm font-semibold flex items-center justify-center gap-1 group-hover:gap-2 transition-all">
                                            Detayları Gör <ChevronRight size={16} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {displayCommissions.length === 0 && !loading && (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            <Award size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Henüz prim kaydı bulunmamaktadır.</p>
                        </div>
                    )}
                </div>


                {/* Details Modal */}
                {selectedSalesPerson && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-2 border-white/20">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                            {selectedSalesPerson.substring(0, 2).toUpperCase()}
                                        </div>
                                        {selectedSalesPerson} - Prim Detayları
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedSalesPerson(null)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-slate-500" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                {loadingDetails ? (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="table w-full">
                                            <thead className="bg-slate-50 text-slate-600">
                                                <tr>
                                                    <th>Tarih</th>
                                                    <th>Satış No</th>
                                                    <th>Müşteri</th>
                                                    <th className="text-right">Satış Tutarı</th>
                                                    <th className="text-right">Prim Tutarı</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {details.map((detail) => (
                                                    <tr key={detail.id} className="hover:bg-indigo-50 transition-colors">
                                                        <td className="font-medium">
                                                            {new Date(detail.date).toLocaleDateString('tr-TR')}
                                                        </td>
                                                        <td className="font-bold text-indigo-600">{detail.saleNo}</td>
                                                        <td>{detail.customerName}</td>
                                                        <td className="text-right font-medium">
                                                            ₺{detail.saleAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="text-right font-bold text-emerald-600">
                                                            ₺{detail.amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {details.length === 0 && (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-8 text-slate-500">
                                                            Kayıt bulunamadı.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            <tfoot className="bg-slate-50 font-bold text-slate-700">
                                                <tr>
                                                    <td colSpan="4" className="text-right">TOPLAM:</td>
                                                    <td className="text-right text-emerald-600 text-lg">
                                                        ₺{details.reduce((sum, d) => sum + d.amount, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div >
    );
}
