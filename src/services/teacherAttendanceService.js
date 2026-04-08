/**
 * Teacher attendance API. Uses central api (Axios + JWT).
 * POST /teacher-attendance, POST /teacher-attendance/bulk, GET /teacher-attendance/school
 */

import api from './api';

export const teacherAttendanceService = {
  record(data) {
    return api.post('/teacher-attendance', data);
  },

  recordBulk(data) {
    return api.post('/teacher-attendance/bulk', data);
  },

  getSchool(params = {}) {
    return api.get('/teacher-attendance/school', { params });
  },

  getReport(params = {}) {
    return api.get('/teacher-attendance/report', { params });
  },
};
