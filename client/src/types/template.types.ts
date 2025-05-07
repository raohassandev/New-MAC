export interface RegisterParameter {
  name: string;
  dataType: string;
  scalingFactor: number;
  decimalPoint: number;
  byteOrder: string;
  signed: boolean;
  registerRange: string;
  registerIndex: number;
  wordCount: number;
  unit?: string;
}

export interface RegisterRange {
  startAddress: number;
  count: number;
  fc: number;
}

export interface DataPoint {
  range: RegisterRange;
  parser: {
    parameters: RegisterParameter[];
  };
}

export interface ConnectionSettings {
  type: 'tcp' | 'rtu';
  tcp?: {
    ip: string;
    port: number;
    slaveId: number;
  };
  rtu?: {
    serialPort: string;
    baudRate: number;
    dataBits: number;
    stopBits: number;
    parity: string;
    slaveId: number;
  };
}

export interface DeviceType {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewDeviceType {
  name: string;
  description?: string;
  category?: string;
}

export interface Template {
  _id: string;
  name: string;
  description?: string;
  deviceType: string;
  isTemplate: boolean;
  enabled: boolean;
  make: string;
  model: string;
  tags: string[];
  connectionSetting: {
    connectionType: string;
    tcp?: {
      ip: string;
      port: number;
      slaveId: number;
    };
    rtu?: {
      serialPort: string;
      baudRate: number;
      dataBits: number;
      stopBits: number;
      parity: string;
      slaveId: number;
    };
  };
  dataPoints: DataPoint[];
  createdBy: {
    userId: string;
    username: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateFormData {
  name: string;
  description?: string;
  deviceType: string;
  make: string;
  model: string;
  tags?: string[];
  connectionSetting: {
    connectionType: string;
    tcp?: {
      ip: string;
      port: number;
      slaveId: number;
    };
    rtu?: {
      serialPort: string;
      baudRate: number;
      dataBits: number;
      stopBits: number;
      parity: string;
      slaveId: number;
    };
  };
  dataPoints?: DataPoint[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationState {
  isValid: boolean;
  basicInfo: ValidationError[];
  connection: ValidationError[];
  registers: ValidationError[];
  parameters: ValidationError[];
  general: ValidationError[];
}

export interface DeviceBasics {
  name: string;
  deviceType: string;
  make: string;
  model: string;
  description: string;
}

export interface TemplateFormState {
  deviceBasics: DeviceBasics;
  connectionSettings: ConnectionSettings;
  validationState: ValidationState;
  registers?: any[]; // Will be defined based on specific register implementation
  dataPoints?: DataPoint[];
}
