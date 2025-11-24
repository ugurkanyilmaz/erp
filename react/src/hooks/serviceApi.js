import api from './api';

function _normalizeDateValue(val) {
  if (typeof val !== 'string') return val;
  // If value already contains timezone info (Z or +hh:mm), leave it
  if (/[Zz]$/.test(val) || /[+\-]\d{2}:\d{2}$/.test(val)) return val;
  // Match YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return val;
  const y = +m[1], mo = +m[2] - 1, d = +m[3], hh = +m[4], mm = +m[5], ss = +(m[6] || 0);
  // Create a local Date from components then convert to ISO (UTC)
  const local = new Date(y, mo, d, hh, mm, ss);
  return local.toISOString();
}

function _normalizeDatesOnPayload(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    // common date-like property names used in the project
    if (/date|tarih|at|expires|created|completed|sent|bitis/i.test(k) && typeof v === 'string') {
      out[k] = _normalizeDateValue(v);
    } else if (v && typeof v === 'object') {
      out[k] = _normalizeDatesOnPayload(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function getServiceRecords() {
  const res = await api.get('/api/servicerecords');
  return res.data;
}

export async function createServiceRecord(payload) {
  // Normalize datetime-local strings (e.g. from <input type="datetime-local">)
  // to full ISO UTC strings so backend receives explicit instants.
  const toSend = _normalizeDatesOnPayload(payload);
  const res = await api.post('/api/servicerecords', toSend);
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

export async function getNextTakipNo() {
  const res = await api.get('/api/servicerecords/nexttakipno');
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

export async function getCompletedServiceRecords() {
  const res = await api.get('/api/servicerecords/completed');
  return res.data;
}

export async function getCompletedServiceRecordDetails(archiveId) {
  const res = await api.get(`/api/servicerecords/completed/${archiveId}/details`);
  return res.data;
}

// Customers
export async function getCustomers(params) {
  const res = await api.get('/api/customers', { params });
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

// Template management
export async function getServiceTemplates(productSku) {
  const res = await api.get('/api/servicetemplates', { params: { productSku } });
  return res.data;
}

export async function createServiceTemplate(payload) {
  const res = await api.post('/api/servicetemplates', payload);
  return res.data;
}

export async function deleteServiceTemplate(id) {
  const res = await api.delete(`/api/servicetemplates/${id}`);
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
  getCompletedServiceRecords,
  getCompletedServiceRecordDetails,
  postBulkQuotes,
  getNextBelgeNo,
  getNextTakipNo,
  signalWaitingForPhotos,
  getWaitingRecord,
  getServiceRecordPhotos,
  getCustomers,
  uploadServiceRecordPhotos,
  deleteServiceRecordPhoto,
  getServiceTemplates,
  createServiceTemplate,
  deleteServiceTemplate,
};

// Upload one or more photos (FormData) for a service record
export async function uploadServiceRecordPhotos(recordId, formData) {
  // Note: axios instance sets default content-type to application/json; override per-request
  const res = await api.post(`/api/servicerecords/${recordId}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

