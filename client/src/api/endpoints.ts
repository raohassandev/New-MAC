import api from './client';

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

// User endpoints
export const userApi = {
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (userData: { username?: string; email?: string }) =>
    api.put('/users/me', userData),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/change-password', { currentPassword, newPassword }),
};

// System monitoring endpoints
export const systemApi = {
  getSystemStatus: () => api.get('/system/status'),
  getSystemMetrics: (timeframe: string = 'day') =>
    api.get(`/system/metrics?timeframe=${timeframe}`),
  getSystemAlerts: (page: number = 1, limit: number = 10) =>
    api.get(`/system/alerts?page=${page}&limit=${limit}`),
  acknowledgeAlert: (alertId: string) => api.put(`/system/alerts/${alertId}/acknowledge`),
  getSystemLogs: (page: number = 1, limit: number = 50, level?: string) => {
    let url = `/system/logs?page=${page}&limit=${limit}`;
    if (level) url += `&level=${level}`;
    return api.get(url);
  },
};

// Settings endpoints
export const settingsApi = {
  getSettings: () => api.get('/settings'),
  updateSettings: (settings: Record<string, any>) => api.put('/settings', settings),
  getNotificationSettings: () => api.get('/settings/notifications'),
  updateNotificationSettings: (notificationSettings: Record<string, any>) =>
    api.put('/settings/notifications', notificationSettings),
};

// Dashboard endpoints
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getRecentActivity: (limit: number = 5) => api.get(`/dashboard/activity?limit=${limit}`),
  getPerformanceMetrics: (days: number = 7) => api.get(`/dashboard/performance?days=${days}`),
};

// Device endpoints
export const deviceApi = {
  getDevices: (filters?: Record<string, any>) => {
    let url = '/client/api/devices';
    if (filters) {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    console.log('[endpoints.ts] Getting devices from URL:', url);
    return api.get(url);
  },
  getDeviceById: (id: string, includeDriver: boolean = false) => {
    const url = `/client/api/devices/${id}${includeDriver ? '?includeDriver=true' : ''}`;
    console.log('[endpoints.ts] Getting device by ID from URL:', url);
    return api.get(url);
  },
  createDevice: (deviceData: any) => {
    console.log('[endpoints.ts] Creating device with data:', deviceData);
    return api.post('/client/api/devices', deviceData);
  },
  updateDevice: (id: string, deviceData: any) => {
    console.log('[endpoints.ts] Updating device with ID:', id);
    return api.put(`/client/api/devices/${id}`, deviceData);
  },
  deleteDevice: (id: string) => {
    console.log('[endpoints.ts] Deleting device with ID:', id);
    return api.delete(`/client/api/devices/${id}`);
  },
  testConnection: (id: string) => {
    console.log('[endpoints.ts] Testing connection for device with ID:', id);
    return api.post(`/client/api/devices/${id}/test`);
  },
  readRegisters: (id: string) => {
    console.log('[endpoints.ts] Reading registers for device with ID:', id);
    return api.get(`/client/api/devices/${id}/read`);
  },
  getDevicesByDriver: (driverId: string, page: number = 1, limit: number = 50) => {
    const url = `/client/api/devices/by-driver/${driverId}?page=${page}&limit=${limit}`;
    console.log('[endpoints.ts] Getting devices by driver from URL:', url);
    return api.get(url);
  },
  getDevicesByUsage: (usage: string, page: number = 1, limit: number = 50) => {
    const url = `/client/api/devices/by-usage/${usage}?page=${page}&limit=${limit}`;
    console.log('[endpoints.ts] Getting devices by usage from URL:', url);
    return api.get(url);
  },
};
