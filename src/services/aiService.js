/**
 * Central AI service - uses Gemini API via backend
 * All AI features (chat, homework, analytics) go through backend API
 */

import api from './api';

export const aiService = {
  /**
   * AI Chat - send message and get response
   * POST /api/ai/chat
   */
  async chat(question, { subject, language = 'English', sessionId } = {}) {
    const response = await api.post('/ai/chat', {
      question,
      subject: subject || null,
      language,
      sessionId: sessionId || null,
    });
    return response?.data;
  },

  /**
   * Get chat history
   * GET /api/ai/chat/history
   */
  async getChatHistory(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/ai/chat/history?${qs}` : '/ai/chat/history';
    const response = await api.get(url);
    return response?.data || [];
  },

  /**
   * Generate homework (Teacher only)
   * POST /api/ai/homework/generate
   */
  async generateHomework({
    subject,
    topic,
    gradeLevel,
    difficulty,
    numberOfQuestions = 5,
    classId,
    subjectId,
    instructions,
  }) {
    const response = await api.post('/ai/homework/generate', {
      subject,
      topic,
      gradeLevel,
      difficulty,
      numberOfQuestions,
      classId: classId || null,
      subjectId: subjectId || null,
      instructions: instructions || null,
    });
    const body = response?.data;
    return body?.data ?? body;
  },

  /**
   * Publish homework (Teacher)
   * PATCH /api/ai/homework/:id/publish
   */
  async publishHomework(homeworkId) {
    const response = await api.patch(`/ai/homework/${homeworkId}/publish`);
    const body = response?.data;
    return body?.data ?? body;
  },

  /**
   * Update homework draft (Teacher)
   * PUT /api/ai/homework/:id
   */
  async updateHomework(homeworkId, payload) {
    const response = await api.put(`/ai/homework/${homeworkId}`, payload);
    const body = response?.data;
    return body?.data ?? body;
  },

  async getHomeworkById(homeworkId) {
    const response = await api.get(`/ai/homework/${homeworkId}`);
    const body = response?.data;
    return body?.data ?? body;
  },

  async deleteHomework(homeworkId) {
    const response = await api.delete(`/ai/homework/${homeworkId}`);
    const body = response?.data;
    return body?.data ?? body;
  },

  /**
   * Student: save draft or final submission
   * POST /api/ai/homework/submissions
   */
  async saveHomeworkSubmission({ homeworkId, answers, status }) {
    const response = await api.post('/ai/homework/submissions', {
      homeworkId,
      answers,
      status,
    });
    const body = response?.data;
    return body?.data ?? body;
  },

  /**
   * Teacher: submissions for one homework
   * GET /api/ai/homework/:id/submissions
   */
  async getHomeworkSubmissions(homeworkId) {
    const response = await api.get(`/ai/homework/${homeworkId}/submissions`);
    const body = response?.data;
    const data = body?.data ?? body;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get teacher's homework list
   * GET /api/ai/homework
   */
  async getTeacherHomework(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/ai/homework?${qs}` : '/ai/homework';
    const response = await api.get(url);
    const body = response?.data;
    const data = body?.data ?? body;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get class homework (for students)
   * GET /api/ai/homework/class/:classId
   */
  async getClassHomework(classId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs
      ? `/ai/homework/class/${classId}?${qs}`
      : `/ai/homework/class/${classId}`;
    const response = await api.get(url);
    const body = response?.data;
    const data = body?.data ?? body;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Student performance analytics
   * GET /api/ai/analytics/student-performance/:studentId
   */
  async getStudentPerformance(studentId, academicYear) {
    const response = await api.get(
      `/ai/analytics/student-performance/${studentId}?academicYear=${encodeURIComponent(academicYear)}`
    );
    return response?.data;
  },

  /**
   * Performance trends (for student/parent)
   * GET /api/ai/analytics/performance-trends/:studentId
   */
  async getPerformanceTrends(studentId) {
    const response = await api.get(`/ai/analytics/performance-trends/${studentId}`);
    return response?.data;
  },

  /**
   * At-risk students
   * GET /api/ai/analytics/at-risk-students/:classId
   */
  async getAtRiskStudents(classId, academicYear) {
    const response = await api.get(
      `/ai/analytics/at-risk-students/${classId}?academicYear=${encodeURIComponent(academicYear)}`
    );
    return response?.data;
  },

  /**
   * School overview (School Admin)
   * GET /api/ai/analytics/school-overview
   */
  async getSchoolOverview(academicYear) {
    const response = await api.get(
      `/ai/analytics/school-overview?academicYear=${encodeURIComponent(academicYear)}`
    );
    return response?.data;
  },

  /**
   * Platform overview (Super Admin)
   * GET /api/ai/analytics/platform-overview
   */
  async getPlatformOverview() {
    const response = await api.get('/ai/analytics/platform-overview');
    return response?.data;
  },
};
