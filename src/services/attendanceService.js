import api from './api';

export const attendanceService = {
  record(data) {
    return api.post('/attendance', data);
  },

  recordBulk(data) {
    return api.post('/attendance/bulk', data);
  },

  recordHomeroomClassAttendance(classId, data) {
    if (!classId) {
      return Promise.reject(new Error('classId is required'));
    }
    return api.post(`/homeroom/classes/${classId}/attendance`, data);
  },

  async getHomeroomClassAttendance(classId, params = {}) {
    if (!classId) {
      throw new Error('classId is required');
    }
    const qs = new URLSearchParams(params).toString();
    const url = qs
      ? `/homeroom/classes/${classId}/attendance?${qs}`
      : `/homeroom/classes/${classId}/attendance`;
    const res = await api.get(url);
    return res?.data || res;
  },

  async getClassAttendance(classId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs
      ? `/attendance/class/${classId}?${qs}`
      : `/attendance/class/${classId}`;
    const res = await api.get(url);
    return res?.data || res;
  },

  async getStudentAttendance(studentId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs
      ? `/attendance/student/${studentId}?${qs}`
      : `/attendance/student/${studentId}`;
    const res = await api.get(url);
    return res?.data || res;
  },
};
