/**
 * Schools API – SUPER_ADMIN only.
 * Uses central api (Axios + JWT). baseURL from VITE_API_URL.
 */

import api from './api';

export const schoolService = {
  getAll(params = {}) {
    return api.get('/schools', { params });
  },

  getById(schoolId) {
    return api.get(`/schools/${schoolId}`);
  },

  create(data) {
    return api.post('/schools', data);
  },

  update(schoolId, data) {
    return api.put(`/schools/${schoolId}`, data);
  },

  uploadLogo(schoolId, file) {
    const formData = new FormData();
    formData.append('logo', file);

    return api.put(`/schools/${schoolId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deactivate(schoolId) {
    return api.patch(`/schools/${schoolId}/deactivate`);
  },
};
