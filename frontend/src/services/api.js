import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (email, password, name) => api.post('/auth/register', { email, password, name });
export const getMe = () => api.get('/auth/me');
export const refreshToken = (token) => api.post('/auth/refresh-token', { refreshToken: token });
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword });
export const verifyEmail = (token) => api.post('/auth/verify-email', { token });
export const resendVerification = () => api.post('/auth/resend-verification');
export const changePassword = (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword });

// Profile
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const completeOnboarding = () => api.post('/profile/complete-onboarding');

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// Bookmarks
export const getBookmarks = (params) => api.get('/bookmarks', { params });
export const getBookmark = (id) => api.get(`/bookmarks/${id}`);
export const createBookmark = (data) => api.post('/bookmarks', data);
export const updateBookmark = (id, data) => api.put(`/bookmarks/${id}`, data);
export const deleteBookmark = (id) => api.delete(`/bookmarks/${id}`);
export const categorizeBookmark = (id) => api.post(`/bookmarks/${id}/categorize`);
export const categorizeAllBookmarks = () => api.post('/bookmarks/categorize-all');

// File Organizer
export const getFiles = (params) => api.get('/file-organizer', { params });
export const getFile = (id) => api.get(`/file-organizer/${id}`);
export const createFile = (data) => api.post('/file-organizer', data);
export const updateFile = (id, data) => api.put(`/file-organizer/${id}`, data);
export const deleteFile = (id) => api.delete(`/file-organizer/${id}`);
export const suggestFileOrganization = (id) => api.post(`/file-organizer/${id}/suggest`);
export const suggestAllFiles = () => api.post('/file-organizer/suggest-all');
export const applyFileSuggestion = (id) => api.post(`/file-organizer/${id}/apply`);

// Password Auditor
export const getPasswords = (params) => api.get('/password-auditor', { params });
export const getPassword = (id) => api.get(`/password-auditor/${id}`);
export const createPassword = (data) => api.post('/password-auditor', data);
export const updatePassword = (id, data) => api.put(`/password-auditor/${id}`, data);
export const deletePassword = (id) => api.delete(`/password-auditor/${id}`);
export const auditPassword = (id, data) => api.post(`/password-auditor/${id}/audit`, data);
export const auditAllPasswords = () => api.post('/password-auditor/audit-all');
export const getPasswordSummary = () => api.get('/password-auditor/summary/overview');

// Digital Detox
export const getScreenTime = (params) => api.get('/digital-detox', { params });
export const getScreenTimeEntry = (id) => api.get(`/digital-detox/${id}`);
export const createScreenTimeEntry = (data) => api.post('/digital-detox', data);
export const updateScreenTimeEntry = (id, data) => api.put(`/digital-detox/${id}`, data);
export const deleteScreenTimeEntry = (id) => api.delete(`/digital-detox/${id}`);
export const toggleAppBlock = (id) => api.post(`/digital-detox/${id}/toggle-block`);
export const analyzeScreenTime = () => api.post('/digital-detox/analyze');
export const getTodaySummary = () => api.get('/digital-detox/summary/today');
export const getWeeklyStats = () => api.get('/digital-detox/stats/weekly');

// Focus Timer
export const getFocusSessions = (params) => api.get('/focus-timer', { params });
export const getFocusSession = (id) => api.get(`/focus-timer/${id}`);
export const createFocusSession = (data) => api.post('/focus-timer', data);
export const updateFocusSession = (id, data) => api.put(`/focus-timer/${id}`, data);
export const deleteFocusSession = (id) => api.delete(`/focus-timer/${id}`);
export const startFocusSession = (id) => api.post(`/focus-timer/${id}/start`);
export const completePomodoroSession = (id) => api.post(`/focus-timer/${id}/complete-pomodoro`);
export const endFocusSession = (id, data) => api.post(`/focus-timer/${id}/end`, data);
export const getFocusTip = (id) => api.post(`/focus-timer/${id}/focus-tip`);
export const getFocusStats = () => api.get('/focus-timer/stats/summary');

// AI
export const aiQuery = (prompt, systemPrompt) => api.post('/ai/query', { prompt, systemPrompt });
export const getAiHistory = (featureType, limit) => api.get('/ai/history', { params: { feature_type: featureType, limit } });
export const getDashboardInsights = () => api.get('/ai/dashboard-insights');

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// Search
export const globalSearch = (q, type) => api.get('/search', { params: { q, type } });

// Export
export const exportBookmarks = (format) => api.get(`/export/bookmarks`, { params: { format }, responseType: format === 'csv' ? 'blob' : 'json' });
export const exportPasswords = (format) => api.get(`/export/passwords`, { params: { format }, responseType: format === 'csv' ? 'blob' : 'json' });
export const exportFiles = () => api.get('/export/files');
export const exportScreenTime = () => api.get('/export/screen-time');
export const exportAllData = () => api.get('/export/all');

// Upload
export const uploadFile = (formData) => api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const uploadMultipleFiles = (formData) => api.post('/upload/multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Feedback
export const submitFeedback = (data) => api.post('/feedback', data);
export const getFeedback = () => api.get('/feedback');
export const submitContact = (data) => api.post('/feedback/contact', data);

// Browser Extension
export const extensionImportBookmarks = (bookmarks) => api.post('/extension/bookmarks/import', { bookmarks });
export const extensionQuickSave = (data) => api.post('/extension/bookmarks/quick-save', data);
export const extensionStatus = () => api.get('/extension/status');
export const extensionReportScreenTime = (data) => api.post('/extension/screen-time', data);

// Admin
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const getAuditLogs = (params) => api.get('/admin/audit-logs', { params });
export const getAdminFeedback = () => api.get('/admin/feedback');
export const updateFeedbackStatus = (id, data) => api.put(`/admin/feedback/${id}`, data);

export default api;
