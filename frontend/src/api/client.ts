import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  verifyEmail: (userId: string, confirmationCode: string) =>
    api.post('/auth/verify-email', { user_id: userId, confirmation_code: confirmationCode }),
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  changePassword: (userId: string, currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { user_id: userId, current_password: currentPassword, new_password: newPassword }),
  requestPasswordReset: (email: string) =>
    api.post('/auth/forgot-password/request', { email }),
  verifyPasswordResetCode: (email: string, code: string) =>
    api.post('/auth/forgot-password/verify-code', { email, code }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/auth/forgot-password/reset', { email, code, new_password: newPassword }),
  demoLogin: (role: string = 'admin') =>
    api.post('/auth/demo-login', { role }),
  getCurrentUser: () => api.get('/auth/me'),
  generateTwoFAQR: (userId: string) =>
    api.post('/security/2fa/register/generate', { user_id: userId }),
  verifyTwoFA: (userId: string, token: string) =>
    api.post('/security/2fa/register/verify', { user_id: userId, token }),
};

export const scheduleAPI = {
  getSchedules: (userId: string, month?: number, year?: number) =>
    api.get(`/schedules/${userId}`, { params: { month, year } }),
  getSchedulesByDate: (date: string) =>
    api.get('/schedules/by-date', { params: { date } }),
  getAllSchedulesForMonth: (month: number, year: number) =>
    api.get(`/schedules/month/${month}/${year}`),
  createSchedule: (data: any) => api.post('/schedules', data),
  updateSchedule: (scheduleId: string, data: any) =>
    api.put(`/schedules/${scheduleId}`, data),
};

export const changeRequestAPI = {
  getChangeRequests: () => api.get('/change-requests'),
  createChangeRequest: (data: any) => api.post('/change-requests', data),
};

export const approvalAPI = {
  getPendingApprovals: () => api.get('/approvals/pending'),
  approveChangeRequest: (changeRequestId: string, data: any) =>
    api.post(`/approvals/${changeRequestId}`, data),
};

export const userAPI = {
  getUsers: () => api.get('/users'),
  getAllUsers: () => api.get('/users/all'),
  getUserRoles: () => api.get('/users/roles'),
  updateUserRole: (userId: string, role: string) =>
    api.put(`/users/${userId}/role`, { role }),
  assignManager: (userId: string, managerId: string | null) =>
    api.put(`/users/${userId}/manager`, { managerId }),
};

export const shiftAPI = {
  getShifts: () => api.get('/shifts'),
  createShift: (data: any) => api.post('/shifts', data),
  updateShift: (shiftId: string, data: any) =>
    api.put(`/shifts/${shiftId}`, data),
  deleteShift: (shiftId: string) => api.delete(`/shifts/${shiftId}`),
};

export const securityAPI = {
  // Admin endpoints for managing 2FA
  get2FAUsers: () => api.get('/security/admin/2fa/users'),
  get2FAStats: () => api.get('/security/admin/2fa/stats'),
  enableUserTwoFA: (userId: string) =>
    api.post('/security/admin/2fa/enable', { user_id: userId }),
  disableUserTwoFA: (userId: string) =>
    api.post('/security/admin/2fa/disable', { user_id: userId }),
};

export const auditAPI = {
  getAuditLogs: (params: any) => api.get('/audit', { params }),
};

export const emailConfigAPI = {
  getConfig: () => api.get('/email-config'),
  updateConfig: (data: any) => api.put('/email-config', data),
  testConfig: (testEmail: string) => api.post('/email-config/test', { test_email: testEmail }),
};

export default api;
