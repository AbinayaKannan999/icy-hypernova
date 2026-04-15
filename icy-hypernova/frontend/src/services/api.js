import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('foodbridge_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('foodbridge_token');
      localStorage.removeItem('foodbridge_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Donations API
export const donationsAPI = {
  getAll: (params) => api.get('/donations', { params }),
  getById: (id) => api.get(`/donations/${id}`),
  create: (data) => api.post('/donations', data),
  update: (id, data) => api.put(`/donations/${id}`, data),
  delete: (id) => api.delete(`/donations/${id}`)
};

// Requests API
export const requestsAPI = {
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  updateStatus: (id, data) => api.patch(`/requests/${id}/status`, data),
  verifyQR: (id, data) => api.post(`/requests/${id}/verify-qr`, data)
};

// Deliveries API
export const deliveriesAPI = {
  getAll: () => api.get('/deliveries'),
  create: (data) => api.post('/deliveries', data),
  updateStatus: (id, data) => api.patch(`/deliveries/${id}/status`, data),
  getTracking: (id) => api.get(`/deliveries/${id}/tracking`)
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getDonationsOverTime: (params) => api.get('/analytics/donations-over-time', { params }),
  getRequestsByStatus: () => api.get('/analytics/requests-by-status'),
  getFoodByCategory: () => api.get('/analytics/food-by-category'),
  getLeaderboard: () => api.get('/analytics/leaderboard'),
  getMyStats: () => api.get('/analytics/my-stats')
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

// Feedback API
export const feedbackAPI = {
  create: (data) => api.post('/feedback', data),
  getUserFeedback: (userId) => api.get(`/feedback/${userId}`)
};

// Admin API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserStatus: (id) => api.patch(`/admin/users/${id}/toggle-status`),
  changeUserRole: (id, data) => api.patch(`/admin/users/${id}/role`, data),
  getActivityLogs: (params) => api.get('/admin/activity', { params }),
  broadcast: (data) => api.post('/admin/broadcast', data)
};

// Users API
export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}/profile`),
  updateProfile: (data) => api.put('/users/profile', data),
  getVolunteers: () => api.get('/users/volunteers')
};

export default api;
