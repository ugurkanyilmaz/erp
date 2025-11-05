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

export async function getNextBelgeNo() {
  const res = await api.get('/api/servicerecords/nextbelgeno');
  return res.data;
}

// Signal that a record is waiting for photos (mobile upload flow)
export async function signalWaitingForPhotos(recordId) {
  const res = await api.post(`/api/servicerecords/${recordId}/signal`);
  return res.data;
}

// Get the record currently waiting for photos
export async function getWaitingRecord() {
  const res = await api.get('/api/servicerecords/waiting');
  return res.data;
}

// Get photos for a service record
export async function getServiceRecordPhotos(recordId) {
  const res = await api.get(`/api/servicerecords/${recordId}/photos`);
  return res.data;
}

// Delete a single photo by id for a given record
export async function deleteServiceRecordPhoto(recordId, photoId) {
  const res = await api.delete(`/api/servicerecords/${recordId}/photos/${photoId}`);
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
  getNextBelgeNo,
  signalWaitingForPhotos,
  getWaitingRecord,
  getServiceRecordPhotos,
  uploadServiceRecordPhotos,
  deleteServiceRecordPhoto,
};

// Upload one or more photos (FormData) for a service record
export async function uploadServiceRecordPhotos(recordId, formData) {
  // Note: axios instance sets default content-type to application/json; override per-request
  const res = await api.post(`/api/servicerecords/${recordId}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

