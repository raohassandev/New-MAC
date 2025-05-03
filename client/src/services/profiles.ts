// client/src/services/profiles.ts
import API from './api';
import { Device } from './devices';

export type ProfileMode = 'cooling' | 'heating' | 'auto' | 'dehumidify';

export interface ScheduleTime {
  id: string;
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  startTime: string;
  endTime: string;
}

export interface Schedule {
  active: boolean;
  times: ScheduleTime[];
}

export interface Profile {
  _id: string;
  name: string;
  description: string;
  targetTemperature: number;
  temperatureRange: [number, number];
  fanSpeed: number;
  mode: ProfileMode;
  schedule: Schedule;
  assignedDevices: string[] | Device[];
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileApplyResult {
  deviceId: string;
  deviceName: string;
  success: boolean;
  message: string;
}

export interface ProfileApplyResponse {
  profileId: string;
  profileName: string;
  timestamp: Date;
  results: ProfileApplyResult[];
}

export const profileService = {
  async getProfiles(): Promise<Profile[]> {
    const response = await API.get('/profiles');
    return response.data;
  },

  async getProfile(id: string): Promise<Profile> {
    const response = await API.get(`/profiles/${id}`);
    return response.data;
  },

  async createProfile(profile: Omit<Profile, '_id' | 'createdAt' | 'updatedAt'>): Promise<Profile> {
    const response = await API.post('/profiles', profile);
    return response.data;
  },

  async updateProfile(profile: Profile): Promise<Profile> {
    const response = await API.put(`/profiles/${profile._id}`, profile);
    return response.data;
  },

  async deleteProfile(id: string): Promise<{ message: string; id: string }> {
    const response = await API.delete(`/profiles/${id}`);
    return response.data;
  },

  async duplicateProfile(id: string): Promise<Profile> {
    const response = await API.post(`/profiles/${id}/duplicate`);
    return response.data;
  },

  async applyProfile(id: string): Promise<ProfileApplyResponse> {
    const response = await API.post(`/profiles/${id}/apply`);
    return response.data;
  },

  async getTemplateProfiles(): Promise<Profile[]> {
    const response = await API.get('/profiles/templates');
    return response.data;
  },

  async createFromTemplate(
    templateId: string,
    data: { name?: string; description?: string; assignedDevices?: string[] }
  ): Promise<Profile> {
    const response = await API.post(`/profiles/from-template/${templateId}`, data);
    return response.data;
  },
};
