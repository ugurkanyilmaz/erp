import api from './api';

export async function getProductQuotes() {
    const res = await api.get('/api/productquotes');
    return res.data || [];
}

export async function getProductQuote(id) {
    const res = await api.get(`/api/productquotes/${id}`);
    return res.data;
}

export async function createProductQuote(payload) {
    const res = await api.post('/api/productquotes', payload);
    return res.data;
}

export async function sendProductQuote(id, emailOptions) {
    const res = await api.post(`/api/productquotes/${id}/send`, emailOptions);
    return res.data;
}

export async function approveProductQuote(id) {
    const res = await api.post(`/api/productquotes/${id}/approve`);
    return res.data;
}

const productQuoteApi = {
    getProductQuotes,
    getProductQuote,
    createProductQuote,
    sendProductQuote,
    approveProductQuote
};

export default productQuoteApi;
