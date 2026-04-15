import api from './api';

export const studentService = {
  // Homeroom - list students (for homeroom teacher) – backend has GET /homeroom/classes/:classId/students only; no GET /homeroom/students
  getStudents(params = {}) {
    return (async () => {
      const { isActive } = params || {};

      // 1) Fetch all classes where the logged-in user is homeroom teacher
      // eslint-disable-next-line no-console
      if (import.meta?.env?.DEV) console.debug("[studentService] GET /homeroom/my-homeroom-classes");
      const classesRes = await api.get('/homeroom/my-homeroom-classes');
      // eslint-disable-next-line no-console
      if (import.meta?.env?.DEV) console.debug("[studentService] response.data (classes)", classesRes);
      const classes = Array.isArray(classesRes) ? classesRes : (classesRes?.data ?? []);

      if (!Array.isArray(classes) || classes.length === 0) return [];

      // 2) For each class, fetch its students and merge
      const studentLists = await Promise.all(
        classes.map(async (cls) => {
          const classId = cls?.classId;
          if (!classId) return [];

          const isActiveQuery =
            typeof isActive === 'boolean' ? (isActive ? 'true' : 'false') : isActive;

          // eslint-disable-next-line no-console
          if (import.meta?.env?.DEV) console.debug(`[studentService] GET /homeroom/classes/${classId}/students`);
          const studentRes = await api.get(`/homeroom/classes/${classId}/students`, {
            params: isActiveQuery !== undefined ? { isActive: isActiveQuery } : undefined,
          });

          // api interceptor unwraps axios response.data, so this is typically:
          // { success, count, data: [...] }
          // eslint-disable-next-line no-console
          if (import.meta?.env?.DEV) console.debug("[studentService] response.data (students)", studentRes);
          const students = studentRes?.data ?? studentRes ?? [];
          return Array.isArray(students) ? students : (students?.data ?? []);
        })
      );

      const merged = studentLists.flat().filter(Boolean);

      // De-dupe by studentId
      const byId = new Map();
      for (const s of merged) {
        const id = s?.studentId ?? s?.id;
        if (id == null) continue;
        byId.set(String(id), s);
      }

      return Array.from(byId.values());
    })();
  },

  /**
   * Create student in a homeroom class.
   * Backend: POST /api/homeroom/classes/:classId/students (classId required)
   */
  createStudent(classId, data) {
    if (classId) {
      return api.post(`/homeroom/classes/${classId}/students`, data);
    }
    return api.post('/admin/students', data);
  },

  getStudentById(id) {
    return api.get(`/homeroom/students/${id}`);
  },

  updateStudent(id, data) {
    return api.put(`/homeroom/students/${id}`, data);
  },

  deactivateStudent(id, data = {}) {
    // Backend: PATCH /api/homeroom/students/:studentId/deactivate
    // Note: data unused server-side, kept for client flexibility.
    return api.patch(`/homeroom/students/${id}/deactivate`, data);
  },

  activateStudent(id, data = {}) {
    // Backend: PATCH /api/homeroom/students/:studentId/activate
    return api.patch(`/homeroom/students/${id}/activate`, data);
  },

  deleteStudent(id) {
    return api.delete(`/homeroom/students/${id}`);
  },

  updateAdminStudent(id, data) {
    return api.put(`/admin/students/${id}`, data);
  },

  deleteAdminStudent(id) {
    return api.delete(`/admin/students/${id}`);
  },

  updateAdminStudentStatus(id, data) {
    return api.patch(`/admin/students/${id}/status`, data);
  },

  // School Admin - all students in school
  async getAdminStudents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/admin/students?${qs}` : '/admin/students';
    const res = await api.get(url);
    return res?.data || [];
  },

  // Homeroom - students in a class
  async getHomeroomStudents(classId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs
      ? `/homeroom/classes/${classId}/students?${qs}`
      : `/homeroom/classes/${classId}/students`;
    const res = await api.get(url);
    return res?.data || [];
  },

  // Teacher - students in a class they teach
  async getClassStudents(classId) {
    const res = await api.get(`/teacher/classes/${classId}/students`);
    return res?.data || [];
  },
};

export default studentService;
