// client/src/services/auth.ts
import { endpoints } from '../../../CONSTANTS';
import API from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  token?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await API.post(endpoints.frontend.auth.login, credentials);

    // Store user data and token
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data));

    return response.data;
  },

  async register(credentials: RegisterCredentials): Promise<User> {
    const response = await API.post(endpoints.frontend.auth.register, credentials);

    // Store user data and token
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data));

    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await API.get(endpoints.frontend.auth.me);
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  getStoredUser(): User | null {
    const userString = localStorage.getItem('user');
    if (userString) {
      return JSON.parse(userString);
    }
    return null;
  },
};
