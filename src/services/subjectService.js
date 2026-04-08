/**
 * Subject API service using shared axios client (auth + base URL from env).
 */

import api from './api';

// Normalize backend subject to UI shape { id, name, code, description, teachers }
function normalizeSubject(s) {
  if (!s) return s;
  const teachers = (s.teachers || []).map((st) => ({
    id: st.teacher?.teacherId ?? st.teacherId,
    name: st.teacher?.user?.fullName ?? st.name ?? '—',
  }));
  return {
    id: s.subjectId ?? s.id,
    name: s.subjectName ?? s.name,
    code: s.subjectCode ?? s.code,
    description: s.description ?? '',
    teachers,
  };
}

// Normalize backend teacher to UI shape { id, name }
function normalizeTeacher(t) {
  if (!t) return t;
  return {
    id: t.teacherId ?? t.id,
    name: t.user?.fullName ?? t.fullName ?? t.name ?? '—',
  };
}

export const subjectService = {
  /**
   * GET /subjects — list all subjects for the school.
   * Returns array of { id, name, code, description, teachers }.
   */
  async list() {
    const res = await api.get('/subjects');
    const data = res?.data ?? res;
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    return list.map(normalizeSubject);
  },

  /**
   * POST /subjects — create subject.
   * Body: { name, code, description } → sent as subjectName, subjectCode, description.
   */
  async create(payload) {
    const body = {
      subjectName: payload.name,
      subjectCode: payload.code,
      description: payload.description ?? '',
    };
    const res = await api.post('/subjects', body);
    const data = res?.data ?? res;
    return normalizeSubject(data);
  },

  /**
   * PUT /subjects/:id — update subject.
   */
  async update(id, payload) {
    const body = {
      subjectName: payload.name,
      subjectCode: payload.code,
      description: payload.description ?? '',
    };
    const res = await api.put(`/subjects/${id}`, body);
    const data = res?.data ?? res;
    return normalizeSubject(data);
  },

  /**
   * DELETE /subjects/:id — delete subject.
   */
  async remove(id) {
    await api.delete(`/subjects/${id}`);
  },

  /**
   * POST /subjects/:id/assign-teacher — assign one teacher (backend accepts single teacherId).
   */
  async assignTeacher(subjectId, teacherId) {
    const res = await api.post(`/subjects/${subjectId}/assign-teacher`, { teacherId });
    return res?.data ?? res;
  },

  /**
   * DELETE /subjects/:id/remove-teacher/:teacherId — remove teacher from subject.
   */
  async removeTeacher(subjectId, teacherId) {
    await api.delete(`/subjects/${subjectId}/remove-teacher/${teacherId}`);
  },

  /**
   * List school teachers for assignment dropdown (uses /admin/teachers for correct route).
   */
  async fetchTeachers() {
    const res = await api.get('/admin/teachers');
    const data = res?.data ?? res;
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    return list.map(normalizeTeacher);
  },
};
