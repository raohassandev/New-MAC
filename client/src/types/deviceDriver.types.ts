// client/src/types/deviceDriver.types.ts
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
 * DeviceDriver interface extends Device with deviceDriver-specific properties
 */
export interface DeviceDriver extends Device {
  deviceType: string;    // Required in deviceDrivers, references a DeviceType
  isDeviceDriver: boolean;   // Always true for deviceDrivers
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
 * DeviceDriverFormData extends DeviceFormState with deviceDriver-specific properties
 */
export interface DeviceDriverFormData {
  name: string;
  deviceType: string;
  make?: string;
  model?: string;
  description?: string;
  enabled?: boolean;
  tags?: string[];
  connectionSetting?: ConnectionSetting;
  dataPoints?: DataPoint[];
  newDeviceType?: NewDeviceType; // For creating a new device type during deviceDriver creation
  isDeviceDriver?: boolean; // Flag to mark this as a device driver
}