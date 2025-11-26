import api from './api';

export const getActiveRecords = async () => {
    const res = await api.get('/api/SalesDemo/active');
    return res.data;
};

export const getHistoryRecords = async () => {
    const res = await api.get('/api/SalesDemo/history');
    return res.data;
};

export const takeProduct = async (payload) => {
    const res = await api.post('/api/SalesDemo/take', payload);
    return res.data;
};

export const returnProduct = async (id) => {
    const res = await api.post(`/api/SalesDemo/return/${id}`);
    return res.data;
};

export const sellProduct = async (id) => {
    const res = await api.post(`/api/SalesDemo/sell/${id}`);
    return res.data;
};

export default { getActiveRecords, getHistoryRecords, takeProduct, returnProduct, sellProduct };
