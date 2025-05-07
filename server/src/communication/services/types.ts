/**
 * Communication Module Type Definitions
 */

// Device types
export interface Device {
  id: string;
  name: string;
  readAllParameters(): Promise<Record<string, any>>;
  getParameter(paramId: string): DeviceParameter | null;
  getAllParameters(): DeviceParameter[];
  readMultipleRegisters(registerType: any, address: number, length: number): Promise<number[]>;
}

export interface DeviceParameter {
  id: string;
  name: string;
  address: number;
  dataType: string;
  unit?: string;
  scale?: number;
  offset?: number;
}

// Event types for polling service
export interface PollingServiceEvents {
  data: (deviceId: string, paramId: string, value: any) => void;
  error: (deviceId: string, error: any) => void;
  start: (deviceId: string, interval: number) => void;
  stop: (deviceId: string) => void;
}