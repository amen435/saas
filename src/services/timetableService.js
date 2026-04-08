import api from './api';

export const timetableService = {
  create(data) {
    return api.post('/timetable', data);
  },

  update(id, data) {
    return api.put(`/timetable/${id}`, data);
  },

  remove(id) {
    return api.delete(`/timetable/${id}`);
  },

  getPeriods(params = {}) {
    return api.get('/timetable/periods', { params });
  },

  getClassTimetable(classId, params = {}) {
    // Use "view" endpoint: returns schedule as day->slots[] (type: class/free/break)
    return api.get(`/timetable/view/class/${classId}`, { params });
  },

  getTeacherTimetable(teacherId, params = {}) {
    // Use "view" endpoint: returns schedule as day->slots[] (type: class/free/break)
    return api.get(`/timetable/view/teacher/${teacherId}`, { params });
  },

  getMyTimetable(params = {}) {
    return api.get('/timetable/view/student/my-timetable', { params });
  },

  // StudentDashboard: GET /api/timetable/student/:studentId?academicYear=...
  getStudentTimetable(studentId, params = {}) {
    const qs = params?.academicYear ? { academicYear: params.academicYear } : params;
    return api.get(`/timetable/student/${studentId}`, { params: qs });
  },

  getChildTimetable(studentId, params = {}) {
    return api.get(`/timetable/view/parent/child/${studentId}`, { params });
  },

  getAllChildrenTimetables(params = {}) {
    return api.get('/timetable/view/parent/all-children', { params });
  },
};
