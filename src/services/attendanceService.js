import api from './api';
import { deviceService } from './deviceService';

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

  async getSchoolWideAttendanceSummary(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/attendance/summary?${qs}` : `/attendance/summary`;
    const res = await api.get(url);
    return res?.data || res;
  },

  async getAllAttendance(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/attendance?${qs}` : `/attendance`;
    const res = await api.get(url);
    return res?.data || res;
  },

  async simulateFacialRecognition(payload) {
    const res = await api.post('/attendance/recognize', payload);
    return res?.data || res;
  },

  async getAttendanceAlerts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/attendance/alerts?${qs}` : `/attendance/alerts`;
    const res = await api.get(url);
    return res?.data || res;
  },

  /**
   * Parent Timeline: GET /api/parent/attendance?studentId=&date=
   * Returns child summary, timetable slots, and attendance status per period.
   */
  async getParentTimeline(params = {}) {
    const res = await api.get('/parents/attendance', { params });
    return res?.data || res;
  },

  async getDevices(params = {}) {
    return deviceService.getDevices(params);
  },
};
