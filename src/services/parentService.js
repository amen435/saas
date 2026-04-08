/**
 * Homeroom parents API. Uses central api (Axios + JWT).
 * Backend: GET/POST /homeroom/classes/:classId/parents, GET/PUT /homeroom/parents/:parentId,
 * POST /homeroom/classes/:classId/parents/:parentId/add-child, DELETE /homeroom/parents/:parentId/children/:studentId
 */

import api from './api';

export const parentService = {
  getByClass(classId) {
    return api.get(`/homeroom/classes/${classId}/parents`);
  },

  create(classId, data) {
    return api.post(`/homeroom/classes/${classId}/parents`, data);
  },

  getById(parentId) {
    return api.get(`/homeroom/parents/${parentId}`);
  },

  update(parentId, data) {
    return api.put(`/homeroom/parents/${parentId}`, data);
  },

  linkChild(classId, parentId, studentId) {
    return api.post(`/homeroom/classes/${classId}/parents/${parentId}/add-child`, { studentId });
  },

  unlinkChild(parentId, studentId) {
    return api.delete(`/homeroom/parents/${parentId}/children/${studentId}`);
  },
};
