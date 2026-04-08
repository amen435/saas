import api from './api';

export const announcementService = {
  async getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/announcements?${qs}` : '/announcements';
    const res = await api.get(url);
    return res?.data?.data || res?.data || [];
  },

  async getById(id) {
    const res = await api.get(`/announcements/${id}`);
    return res?.data;
  },

  create(data) {
    return api.post('/announcements', data);
  },

  update(id, data) {
    return api.put(`/announcements/${id}`, data);
  },

  delete(id) {
    return api.delete(`/announcements/${id}`);
  },
};
