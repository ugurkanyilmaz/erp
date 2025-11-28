import React, { useState, useEffect } from 'react';
import { Percent, Calendar, Search, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import accountingApi from '../hooks/accountingApi';

export default function CommissionsPage() {
    const [commissions, setCommissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCommissions();
        fetchUsers();
    }, [selectedMonth, selectedYear]);

    const fetchCommissions = async () => {
        try {
            const data = await accountingApi.getCommissions(selectedMonth, selectedYear);
            setCommissions(data);
        } catch (error) {
            console.error('Error fetching commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        // Mock users for now, same as sales page
        const salesUsers = [
            { id: 'satis1', name: 'Satış 1' },
            { id: 'satis2', name: 'Satış 2' },
            { id: 'satis3', name: 'Satış 3' },
            { id: 'satis4', name: 'Satış 4' },
            { id: 'ugur', name: 'Uğur Yılmaz' }
        ];
        setUsers(salesUsers);
    };

    const getUserName = (id) => {
        return users.find(u => u.id === id)?.name || id;
    };

    // Group commissions by sales person
    const groupedCommissions = commissions.reduce((acc, curr) => {
        // Filter by search term
        const matchesSearch =
            (curr.sale?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (curr.sale?.saleNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            getUserName(curr.salesPersonId).toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return acc;

        if (!acc[curr.salesPersonId]) {
            acc[curr.salesPersonId] = {
                name: getUserName(curr.salesPersonId),
                totalAmount: 0,
                records: []
            };
        }
        acc[curr.salesPersonId].totalAmount += curr.amount;
        acc[curr.salesPersonId].records.push(curr);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-slate-50">
            <Header title="Prim Hesabı" subtitle="Satış primleri takibi" IconComponent={Percent} showNew={false} showBack={true} />

            <main className="p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-100 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100">
                            <Calendar className="text-blue-600" size={20} />
                            <select
                                className="select select-ghost select-sm w-full max-w-xs focus:bg-transparent font-medium text-slate-700"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('tr-TR', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select
                                className="select select-ghost select-sm w-full max-w-xs focus:bg-transparent font-medium text-slate-700"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            >
                                {Array.from({ length: 5 }, (_, i) => (
                                    <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Personel, müşteri veya satış no ara..."
                            className="input input-bordered pl-10 w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {Object.entries(groupedCommissions).map(([id, data]) => (
                        <div key={id} className="card bg-base-100 shadow-xl border border-slate-100">
                            <div className="card-body p-6">
                                <div className="flex justify-between items-center mb-6 border-b pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="avatar placeholder">
                                            <div className="bg-neutral-focus text-neutral-content rounded-full w-12">
                                                <span className="text-xl">{data.name.charAt(0)}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="card-title text-xl">{data.name}</h2>
                                            <p className="text-xs text-slate-500">Satış Temsilcisi</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500 mb-1">Toplam Hakediş</p>
                                        <div className="badge badge-primary badge-lg p-4 text-lg font-bold">
                                            ₺{data.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="table w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th>Tarih</th>
                                                <th>Satış Detayı</th>
                                                <th>Hesaplama</th>
                                                <th className="text-right">Prim Tutarı</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.records.map((record) => (
                                                <tr key={record.id} className="hover">
                                                    <td className="w-32">
                                                        <div className="font-medium">{new Date(record.date).toLocaleDateString('tr-TR')}</div>
                                                        <div className="text-xs text-slate-400">{new Date(record.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700">{record.sale?.customerName || 'Bilinmeyen Müşteri'}</span>
                                                            <span className="text-xs badge badge-ghost badge-sm mt-1 w-fit">Satış No: {record.sale?.saleNo || record.saleId}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                            <span>₺{(record.amount / 0.015).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                                                            <ArrowRight size={14} />
                                                            <span className="badge badge-sm badge-outline">%1.5</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-right font-mono font-bold text-emerald-600 text-lg">
                                                        +₺{record.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}

                    {Object.keys(groupedCommissions).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <Percent size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Bu dönem için kayıt bulunamadı.</p>
                            <p className="text-sm">Farklı bir ay seçmeyi veya arama kriterlerini değiştirmeyi deneyin.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
