import api from './api';

export const profileService = {
  getMyProfile() {
    return api.get('/profile');
  },

  uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);

    return api.put('/profile/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
