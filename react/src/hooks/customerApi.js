import api from './api';

export const getCustomers = async () => {
    const res = await api.get('/api/Customers');
    return res.data;
};

export default { getCustomers };
