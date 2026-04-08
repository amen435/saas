import api from './api';

const adminService = {
  // Get all teachers in school
  getTeachers: () => api.get('/admin/teachers'),

  // Get all homeroom teachers
  getHomeroomTeachers: () => api.get('/admin/homeroom-teachers'),

  // Get attendance for specific date
  getTeacherAttendance: (date) =>
    api.get('/teacher-attendance/school', { params: { date } }),

  // Record single attendance
  recordAttendance: (data) => api.post('/teacher-attendance', data),

  // Record bulk attendance
  recordBulkAttendance: (data) => api.post('/teacher-attendance/bulk', data),

  // Update attendance
  updateAttendance: (id, data) => api.put(`/teacher-attendance/${id}`, data),

  // Delete attendance
  deleteAttendance: (id) => api.delete(`/teacher-attendance/${id}`),
};

export default adminService;
