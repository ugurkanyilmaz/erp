import api from './api';

// Orders
export async function getOrders() {
    const res = await api.get('/api/orders');
    return res.data;
}

export async function createOrder(payload) {
    const res = await api.post('/api/orders', payload);
    return res.data;
}

export async function updateOrderStatus(id, status) {
    const res = await api.put(`/api/orders/${id}/status`, JSON.stringify(status), {
        headers: { 'Content-Type': 'application/json' }
    });
    return res.data;
}

// Incoming Payments
export async function getIncomingPayments() {
    const res = await api.get('/api/incomingpayments');
    return res.data;
}

export async function createIncomingPayment(payload) {
    const res = await api.post('/api/incomingpayments', payload);
    return res.data;
}

// Sales
export async function getSales() {
    const res = await api.get('/api/sales');
    return res.data;
}

export async function createSale(payload) {
    const res = await api.post('/api/sales', payload);
    return res.data;
}

export async function addSalePayment(id, amount) {
    const res = await api.post(`/api/sales/${id}/payment`, amount, {
        headers: { 'Content-Type': 'application/json' }
    });
    return res.data;
}

export async function getNextSaleNumber(customerName) {
    const res = await api.get(`/api/sales/next-no?customerName=${encodeURIComponent(customerName)}`);
    return res.data;
}


// Commissions
export async function getCommissions() {
    const res = await api.get('/api/sales/commissions');
    return res.data;
}

export async function getCommissionDetails(salesPersonId) {
    const res = await api.get(`/api/sales/commissions/${encodeURIComponent(salesPersonId)}`);
    return res.data;
}

// Customers
export async function getCustomers() {
    const res = await api.get('/api/customers');
    return res.data;
}

export default {
    getOrders,
    createOrder,
    updateOrderStatus,
    getIncomingPayments,
    createIncomingPayment,
    getSales,
    createSale,
    addSalePayment,
    getNextSaleNumber,

    getCommissions,
    getCommissionDetails,
    getCustomers
};
