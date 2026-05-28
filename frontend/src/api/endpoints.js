import client from './client';

export const auth = {
  login: (username, password) =>
    client.post('/api/auth/token/', { username, password }),
  me: () => client.get('/api/auth/me/'),
  register: (data) => client.post('/api/auth/register/', data),
};

export const ingestion = {
  uploadSAP: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/api/upload/sap/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadUtility: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/api/upload/utility/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadTravel: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/api/upload/travel/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  listSources: () => client.get('/api/sources/'),
};

export const records = {
  list: (params) => client.get('/api/records/', { params }),
  detail: (id) => client.get(`/api/records/${id}/`),
  approve: (id, comment = '') => client.post(`/api/records/${id}/approve/`, { comment }),
  reject: (id, comment = '') => client.post(`/api/records/${id}/reject/`, { comment }),
  flag: (id, comment = '') => client.post(`/api/records/${id}/flag/`, { comment }),
  lock: (id, comment = '') => client.post(`/api/records/${id}/lock/`, { comment }),
  bulkAction: (record_ids, action, comment = '') =>
    client.post('/api/records/bulk/', { record_ids, action, comment }),
};

export const dashboard = {
  stats: () => client.get('/api/dashboard/'),
};

export const audit = {
  log: (recordId) => client.get(`/api/audit/${recordId}/`),
};
