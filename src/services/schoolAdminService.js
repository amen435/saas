/**
 * School admins (users) API – SUPER_ADMIN only.
 * GET/POST /users/school-admins, GET /users/school-admins/:id, PATCH for activate/deactivate.
 * Uses central api (Axios + JWT).
 */

import api from './api';

export const schoolAdminService = {
  getAll(params = {}) {
    return api.get('/users/school-admins', { params });
  },

  getById(userId) {
    return api.get(`/users/school-admins/${userId}`);
  },

  create(data) {
    return api.post('/users/school-admins', data);
  },

  activate(userId) {
    return api.patch(`/users/school-admins/${userId}/activate`);
  },

  deactivate(userId) {
    return api.patch(`/users/school-admins/${userId}/deactivate`);
  },
};
