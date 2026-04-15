import api from './api';

export const deviceService = {
  async getDevices(params = {}) {
    const res = await api.get('/devices', { params });
    return res?.data || res;
  },
};

export default deviceService;
