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
  // Legacy read method - using polling API is now preferred
  readRegisters: (id: string) => {
    console.log('[endpoints.ts] LEGACY: Reading registers for device with ID:', id);
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

// Device polling and data endpoints
export const deviceDataApi = {
  // Start polling a device
  startPolling: (id: string, intervalMs?: number) => {
    console.log(`[endpoints.ts] Starting polling for device ${id} with interval ${intervalMs || 'default'}`);
    // The server code uses 'interval' in polling.controller.ts and 'intervalMs' in device.controller.ts
    // Send both parameters to ensure compatibility with both controller implementations
    return api.post(`/client/api/devices/${id}/polling/start`, { 
      intervalMs, 
      interval: intervalMs 
    });
  },
  
  // Stop polling a device
  stopPolling: (id: string) => {
    console.log(`[endpoints.ts] Stopping polling for device ${id}`);
    // Use a single, consistent path
    return api.post(`/client/api/devices/${id}/polling/stop`);
  },
  
  // Get current data for a device from cache (or trigger a fresh read if forceRefresh=true)
  getCurrentData: (id: string, forceRefresh: boolean = false) => {
    console.log(`[endpoints.ts] Getting current data for device ${id}${forceRefresh ? ' (force refresh)' : ''}`);
    // Use a single, consistent path for data retrieval
    return api.get(`/client/api/devices/${id}/data/current${forceRefresh ? '?forceRefresh=true' : ''}`);
  },
  
  // Get historical data for a device
  getHistoricalData: (
    id: string, 
    options?: { 
      startTime?: Date, 
      endTime?: Date, 
      parameters?: string[], 
      format?: 'grouped' | 'timeseries' | 'raw',
      limit?: number 
    }
  ) => {
    const params = new URLSearchParams();
    
    if (options?.startTime) {
      params.append('startTime', options.startTime.toISOString());
    }
    
    if (options?.endTime) {
      params.append('endTime', options.endTime.toISOString());
    }
    
    if (options?.parameters && options.parameters.length > 0) {
      params.append('parameters', options.parameters.join(','));
    }
    
    if (options?.format) {
      params.append('format', options.format);
    }
    
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    
    const query = params.toString() ? `?${params.toString()}` : '';
    console.log(`[endpoints.ts] Getting historical data for device ${id}${query ? ' with filters' : ''}`);
    
    // Try both the device routes and devices routes paths
    return api.get(`/client/api/devices/${id}/data/history${query}`)
      .catch(error => {
        console.log(`[endpoints.ts] Falling back to alternate path for historical data`);
        return api.get(`/client/api/devices/${id}/data/history${query}`);
      });
  }
};
