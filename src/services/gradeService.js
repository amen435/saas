import api from './api';

function dispatchGradeComponentsChanged(detail = {}) {
  // Used to trigger UI re-fetches right after component CRUD.
  // Guard for non-browser environments.
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  try {
    window.dispatchEvent(new CustomEvent("gradeComponentsChanged", { detail }));
  } catch (e) {
    // No-op: UI refresh will just not happen via the event.
  }
}

export const gradeService = {
  async getClassReport(params) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/grades/class-report?${qs}` : '/grades/class-report';
    const res = await api.get(url);
    return res?.data || res;
  },

  async getStudentGrades(studentId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs
      ? `/grades/student/${studentId}?${qs}`
      : `/grades/student/${studentId}`;
    const res = await api.get(url);
    return res?.data || res;
  },

  /**
   * GET /api/grades/student-summary/:studentId?academicYear=...
   * Returns aggregated subject results for student dashboards.
   */
  async getStudentSummary(studentId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs
      ? `/grades/student-summary/${studentId}?${qs}`
      : `/grades/student-summary/${studentId}`;
    // eslint-disable-next-line no-console
    if (import.meta?.env?.DEV) console.debug("[gradeService] GET", url);
    const res = await api.get(url);
    // eslint-disable-next-line no-console
    if (import.meta?.env?.DEV) console.debug("[gradeService] response.data", res);
    return res?.data || res;
  },

  /**
   * GET /api/grades/components
   * Backend returns: { success, data: { components, totalWeight, ... } }
   * This helper returns the inner `data` object (not only the components array),
   * so callers can choose what they need.
   */
  async getComponents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/grades/components?${qs}` : '/grades/components';
    const res = await api.get(url);
    return res?.data ?? res;
  },

  async getRankings(params) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/grades/rankings?${qs}` : '/grades/rankings';
    const res = await api.get(url);
    return res?.data || res;
  },

  async getOverallRankings(params) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/grades/overall-rankings?${qs}` : '/grades/overall-rankings';
    const res = await api.get(url);
    return res?.data || res;
  },

  async getOverallSchoolRankings(params) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/grades/school-rankings?${qs}` : '/grades/school-rankings';
    const res = await api.get(url);
    return res?.data || res;
  },

  createComponent(data) {
    return (async () => {
      const res = await api.post('/grades/components', data);
      // eslint-disable-next-line no-console
      console.log("POST /api/grades/components response:", res?.data ?? res);

      const component = res?.data?.data ?? res?.data ?? null;
      dispatchGradeComponentsChanged({
        action: "create",
        component,
        classId: component?.classId,
        teacherId: component?.teacherId,
        subjectId: component?.subjectId,
        academicYear: component?.academicYear,
      });
      return res;
    })();
  },

  updateComponent(id, data) {
    return (async () => {
      const res = await api.put(`/grades/components/${id}`, data);
      // eslint-disable-next-line no-console
      console.log(`PUT /api/grades/components/${id} response:`, res?.data ?? res);

      const component = res?.data?.data ?? res?.data ?? null;
      dispatchGradeComponentsChanged({
        action: "update",
        component,
        classId: component?.classId,
        teacherId: component?.teacherId,
        subjectId: component?.subjectId,
        academicYear: component?.academicYear,
      });
      return res;
    })();
  },

  deleteComponent(id) {
    return (async () => {
      const res = await api.delete(`/grades/components/${id}`);
      // eslint-disable-next-line no-console
      console.log(`DELETE /api/grades/components/${id} response:`, res?.data ?? res);

      const component = res?.data?.data ?? res?.data ?? null;
      dispatchGradeComponentsChanged({
        action: "delete",
        component,
        classId: component?.classId,
        teacherId: component?.teacherId,
        subjectId: component?.subjectId,
        academicYear: component?.academicYear,
      });
      return res;
    })();
  },

  /**
   * DELETE /api/grades/components/:id/with-marks
   * Hard delete even if the component has existing marks.
   */
  deleteComponentWithMarks(id) {
    return (async () => {
      const res = await api.delete(`/grades/components/${id}/with-marks`);
      // eslint-disable-next-line no-console
      console.log(`DELETE /api/grades/components/${id}/with-marks response:`, res?.data ?? res);

      const component = res?.data?.data ?? res?.data ?? null;
      dispatchGradeComponentsChanged({
        action: "deleteWithMarks",
        component,
        classId: component?.classId,
        teacherId: component?.teacherId,
        subjectId: component?.subjectId,
        academicYear: component?.academicYear,
      });
      return res;
    })();
  },

  postMark(data) {
    return api.post('/grades/marks', data);
  },

  deleteMark(markId) {
    return api.delete(`/grades/marks/${markId}`);
  },
};
