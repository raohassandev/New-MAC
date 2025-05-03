// client/src/types/template.types.ts
import { Device, ConnectionSetting, DataPoint } from './device.types';

/**
 * DeviceType interface defines the structure for device type data
 */
export interface DeviceType {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  specifications?: Record<string, any>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: {
    userId: string;
    username: string;
    email: string;
  };
}

/**
 * Template interface extends Device with template-specific properties
 */
export interface Template extends Device {
  deviceType: string;    // Required in templates, references a DeviceType
  isTemplate: boolean;   // Always true for templates
  // Inherited from Device:
  // - name, make, model, description, etc.
  // - connectionSetting, dataPoints
}

/**
 * New device type structure for creation
 */
export interface NewDeviceType {
  name: string;
  description?: string;
  category?: string;
  specifications?: Record<string, any>;
}

/**
 * TemplateFormState extends DeviceFormState with template-specific properties
 */
export interface TemplateFormData {
  name: string;
  deviceType: string;
  make?: string;
  model?: string;
  description?: string;
  enabled?: boolean;
  tags?: string[];
  connectionSetting?: ConnectionSetting;
  dataPoints?: DataPoint[];
  newDeviceType?: NewDeviceType; // For creating a new device type during template creation
}