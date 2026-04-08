import api from './api';

export const teacherService = {
  getProfile() {
    return api.get('/teacher/profile');
  },

  getMyAttendance(teacherId, params = {}) {
    return api.get(`/teacher-attendance/teacher/${teacherId}`, { params });
  },

  getTeachers(params = {}) {
    return api.get('/admin/teachers', { params });
  },
  
  createTeacher(data) {
    return api.post('/admin/teachers', data);
  },

  getTeacherById(id) {
    return api.get(`/admin/teachers/${id}`);
  },

  updateTeacher(id, data) {
    return api.put(`/admin/teachers/${id}`, data);
  },

  deleteTeacher(id) {
    return api.delete(`/admin/teachers/${id}`);
  },

  async getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/admin/teachers?${qs}` : '/admin/teachers';
    const res = await api.get(url);
    return res?.data || [];
  },

  async getById(teacherId) {
    const res = await api.get(`/admin/teachers/${teacherId}`);
    return res?.data;
  },
};

export default teacherService;
