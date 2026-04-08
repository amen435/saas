import api from './api';

export const classService = {
  /**
   * Teacher-only: classes assigned to teacher
   * GET /api/teacher/my-classes
   */
  async getMyClasses() {
    const res = await api.get('/teacher/my-classes');
    // backend shape: { success, count, data: [] }
    return res?.data ?? res;
  },

  /**
   * Teacher-only: students in a class the teacher teaches
   * GET /api/teacher/classes/:classId/students
   */
  async getMyClassStudents(classId) {
    const res = await api.get(`/teacher/classes/${classId}/students`);
    return res?.data ?? res;
  },

  getClasses(params = {}) {
    return api.get('/classes', { params });
  },

  createClass(data) {
    return api.post('/classes', data);
  },

  getClassById(id) {
    return api.get(`/classes/${id}`);
  },

  updateClass(id, data) {
    return api.put(`/classes/${id}`, data);
  },

  deleteClass(id) {
    return api.delete(`/classes/${id}`);
  },

  async getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/classes?${qs}` : '/classes';
    const res = await api.get(url);
    return res?.data || [];
  },

  async getById(classId) {
    const res = await api.get(`/classes/${classId}`);
    return res?.data;
  },
};
