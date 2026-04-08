/**
 * Direct messaging API (1:1). Uses central api (Axios + JWT).
 * Backend: /api/messages/*
 */

import api from './api';

/** Axios interceptor already returns response.data */
export function unwrapList(res) {
  if (!res) return [];
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

export function unwrapPayload(res) {
  if (res == null) return null;
  if (res.data !== undefined && typeof res === 'object' && !Array.isArray(res.data)) {
    return res.data;
  }
  return res;
}

export function formatMessageTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const messageService = {
  getContacts() {
    return api.get('/messages/contacts');
  },

  send(data) {
    return api.post('/messages', data);
  },

  getConversations(params = {}) {
    return api.get('/messages/conversations', { params });
  },

  getConversation(userId, params = {}) {
    return api.get(`/messages/conversation/${encodeURIComponent(userId)}`, { params });
  },

  markAsRead(senderId, data = {}) {
    return api.put(`/messages/read/${encodeURIComponent(senderId)}`, data);
  },

  markMessageRead(messageId) {
    return api.put(`/messages/${messageId}/read`);
  },

  getUnreadCount() {
    return api.get('/messages/unread-count');
  },

  search(q) {
    return api.get('/messages/search', { params: { q } });
  },

  deleteMessage(messageId) {
    return api.delete(`/messages/${messageId}`);
  },
};
