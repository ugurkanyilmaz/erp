import api from './api';

export async function getServiceRecords() {
  const res = await api.get('/api/servicerecords');
  return res.data;
}

export async function createServiceRecord(payload) {
  const res = await api.post('/api/servicerecords', payload);
  return res.data;
}

export async function createServiceOperation(recordId, payload) {
  const res = await api.post(`/api/records/${recordId}/serviceoperations`, payload);
  return res.data;
}

export async function updateServiceOperation(recordId, operationId, payload) {
  const res = await api.put(`/api/records/${recordId}/serviceoperations/${operationId}`, payload);
  return res.data;
}

export async function getServiceOperations(recordId) {
  const res = await api.get(`/api/records/${recordId}/serviceoperations`);
  return res.data;
}

export async function deleteServiceOperation(recordId, operationId) {
  const res = await api.delete(`/api/records/${recordId}/serviceoperations/${operationId}`);
  return res.data;
}

export async function deleteServiceRecord(recordId) {
  const res = await api.delete(`/api/servicerecords/${recordId}`);
  return res.data;
}

export async function updateServiceRecord(recordId, payload) {
  const res = await api.put(`/api/servicerecords/${recordId}`, payload);
  return res.data;
}

export async function postBulkQuotes(payload) {
  const res = await api.post('/api/servicerecords/bulkquote', payload);
  return res.data;
}

export default {
  getServiceRecords,
  createServiceRecord,
  createServiceOperation,
  getServiceOperations,
  updateServiceOperation,
  deleteServiceOperation,
  deleteServiceRecord,
  updateServiceRecord,
  postBulkQuotes,
};
