import mongoose, { Document, Schema } from 'mongoose';

// Range type for dataPoints
export interface IRange {
  startAddress: number;
  count: number;
  fc: number;
}

// Parameter for parser configuration
export interface IParameter {
  name: string;
  dataType: string;
  scalingFactor: number;
  scalingEquation?: string;
  decimalPoint: number;
  byteOrder: string;
  bitmask?: string;
  bitPosition?: number;
  signed?: boolean;
  registerRange?: string;
  registerIndex: number;
  unit?: string;
  description?: string;
  wordCount?: number;
  maxValue?: number;
  minValue?: number;
  formatString?: string;
}

// Parser type for dataPoints
export interface IParser {
  parameters: IParameter[];
}

// DataPoint structure
export interface IDataPoint {
  range: IRange;
  parser: IParser;
}

// TCP Connection settings
export interface ITcpSettings {
  ip: string;
  port: number;
  slaveId: number;
}

// RTU Connection settings
export interface IRtuSettings {
  serialPort: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
  slaveId: number;
}

// Connection settings structure
export interface IConnectionSetting {
  connectionType: 'tcp' | 'rtu';
  tcp?: ITcpSettings;
  rtu?: IRtuSettings;
}

// For backward compatibility
export interface IRegister {
  name: string;
  address: number;
  length: number;
  scaleFactor?: number;
  decimalPoint?: number;
  byteOrder?: string;
  unit?: string;
}

// Control parameter for write operations
export interface IControlParameter {
  name: string;
  description?: string;
  registerIndex: number; // The register address to write to
  dataType: string;      // UINT16, INT16, FLOAT32, etc.
  byteOrder?: string;    // Byte order for multi-register values
  functionCode?: number; // Function code override
  unit?: string;         // Unit of measurement
  minValue?: number;     // Minimum allowed value
  maxValue?: number;     // Maximum allowed value
  defaultValue?: any;    // Default value
  options?: { label: string; value: any }[]; // Preset options (e.g., for mode selection)
  requireConfirmation?: boolean; // Whether this parameter requires additional confirmation
  permissionLevel?: string; // Required permission level to modify this parameter
}

// Writable register range definition
export interface IWritableRange {
  startAddress: number;
  count: number;
  description?: string;
  writePermission?: string; // Required permission level to write to this range
}

export interface IDevice extends Omit<Document, 'model'> {
  name: string;
  make?: string;
  model?: string;
  description?: string;
  enabled: boolean;
  tags?: string[];

  // New structure
  connectionSetting?: IConnectionSetting;
  dataPoints?: IDataPoint[];
  
  // Device control capabilities
  writableRegisters?: IWritableRange[];
  controlParameters?: IControlParameter[];
  lastControlledAt?: Date; // Timestamp of last control operation

  // Device driver linkage
  deviceDriverId?: string | any; // Can be a string ID or populated object
  // Runtime-populated device driver data (not stored in DB)
  driverData?: any;

  // Metadata fields
  usage?: string;
  usageNotes?: string;
  location?: string;
  pollingInterval?: number;

  // Advanced communication settings
  advancedSettings?: IAdvancedSettings;

  // Legacy fields for backward compatibility
  ip?: string;
  port?: number;
  slaveId?: number;
  serialPort?: string;
  baudRate?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
  connectionType?: 'tcp' | 'rtu';
  registers?: IRegister[];
  registerRanges?: any[];
  parameterConfigs?: any[];

  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    userId: string;
    username: string;
    email: string;
  };
}

// Schemas for the nested structures
export const RangeSchema = new Schema<IRange>({
  startAddress: { type: Number, required: true },
  count: { type: Number, required: true },
  fc: { type: Number, required: true },
});

export const ParameterSchema = new Schema<IParameter>({
  name: { type: String, required: true },
  dataType: { type: String, required: true },
  scalingFactor: { type: Number, default: 1 },
  scalingEquation: { type: String },
  decimalPoint: { type: Number, default: 0 },
  byteOrder: { type: String, required: true },
  bitmask: { type: String },
  bitPosition: { type: Number },
  signed: { type: Boolean },
  registerRange: { type: String },
  registerIndex: { type: Number, required: true },
  unit: { type: String },
  description: { type: String },
  wordCount: { type: Number },
  maxValue: { type: Number },
  minValue: { type: Number },
  formatString: { type: String },
});

export const ParserSchema = new Schema<IParser>({
  parameters: [ParameterSchema],
});

export const DataPointSchema = new Schema<IDataPoint>({
  range: { type: RangeSchema, required: true },
  parser: { type: ParserSchema, required: true },
});

// Connection options interface for advanced settings
export interface IConnectionOptions {
  timeout?: number;
  retries?: number;
  retryInterval?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

// Cache options interface
export interface ICacheOptions {
  enabled?: boolean;
  defaultTtl?: number;
  maxSize?: number;
  checkInterval?: number;
}

// Log options interface
export interface ILogOptions {
  level?: string;
  console?: boolean;
  file?: {
    enabled?: boolean;
    path?: string;
    maxSize?: number;
    maxFiles?: number;
  };
}

// Advanced settings interface
export interface IAdvancedSettings {
  defaultPollInterval?: number;
  defaultRequestTimeout?: number;
  connectionOptions?: IConnectionOptions;
  cacheOptions?: ICacheOptions;
  logOptions?: ILogOptions;
}

// TCP Settings Schema
export const TcpSettingsSchema = new Schema<ITcpSettings>({
  ip: { type: String, required: true },
  port: { type: Number, required: true },
  slaveId: { type: Number, required: true },
});

// RTU Settings Schema
export const RtuSettingsSchema = new Schema<IRtuSettings>({
  serialPort: { type: String, required: false }, // Changed from required: true
  baudRate: { type: Number, required: false }, // Changed from required: true
  dataBits: { type: Number, required: false }, // Changed from required: true
  stopBits: { type: Number, required: false }, // Changed from required: true
  parity: { type: String, required: false }, // Changed from required: true
  slaveId: { type: Number, required: false }, // Changed from required: true
});

// Advanced settings schema components
export const ConnectionOptionsSchema = new Schema<IConnectionOptions>(
  {
    timeout: { type: Number },
    retries: { type: Number },
    retryInterval: { type: Number },
    autoReconnect: { type: Boolean },
    reconnectInterval: { type: Number },
  },
  { _id: false },
);

export const CacheOptionsSchema = new Schema<ICacheOptions>(
  {
    enabled: { type: Boolean, default: true },
    defaultTtl: { type: Number, default: 60000 }, // Default 1 minute
    maxSize: { type: Number, default: 10000 },
    checkInterval: { type: Number, default: 60000 }, // Default 1 minute
  },
  { _id: false },
);

export const LogFileOptionsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    path: { type: String },
    maxSize: { type: Number },
    maxFiles: { type: Number },
  },
  { _id: false },
);

export const LogOptionsSchema = new Schema<ILogOptions>(
  {
    level: { type: String, enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
    console: { type: Boolean, default: true },
    file: { type: LogFileOptionsSchema },
  },
  { _id: false },
);

export const AdvancedSettingsSchema = new Schema<IAdvancedSettings>(
  {
    defaultPollInterval: { type: Number, default: 30000 }, // Default 30 seconds
    defaultRequestTimeout: { type: Number, default: 5000 }, // Default 5 seconds
    connectionOptions: { type: ConnectionOptionsSchema },
    cacheOptions: { type: CacheOptionsSchema },
    logOptions: { type: LogOptionsSchema },
  },
  { _id: false },
);

// Combined Connection Setting Schema
export const ConnectionSettingSchema = new Schema<IConnectionSetting>({
  connectionType: { type: String, enum: ['tcp', 'rtu'], required: true },
  tcp: { type: TcpSettingsSchema },
  rtu: { type: RtuSettingsSchema },
});

// Schemas for control parameters and writable registers
export const WritableRangeSchema = new Schema<IWritableRange>({
  startAddress: { type: Number, required: true },
  count: { type: Number, required: true },
  description: { type: String },
  writePermission: { type: String, enum: ['admin', 'engineer', 'operator', 'user'] },
});

export const ParameterOptionSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

export const ControlParameterSchema = new Schema<IControlParameter>({
  name: { type: String, required: true },
  description: { type: String },
  registerIndex: { type: Number, required: true },
  dataType: { type: String, required: true },
  byteOrder: { type: String },
  functionCode: { type: Number },
  unit: { type: String },
  minValue: { type: Number },
  maxValue: { type: Number },
  defaultValue: { type: Schema.Types.Mixed },
  options: [ParameterOptionSchema],
  requireConfirmation: { type: Boolean, default: false },
  permissionLevel: { type: String, enum: ['admin', 'engineer', 'operator', 'user'] },
});

// Legacy schema
export const RegisterSchema = new Schema<IRegister>({
  name: { type: String, required: true },
  address: { type: Number, required: true },
  length: { type: Number, default: 2 },
  scaleFactor: { type: Number, default: 1 },
  decimalPoint: { type: Number, default: 0 },
  byteOrder: { type: String, default: 'AB CD' },
  unit: { type: String },
});

export const DeviceSchema = new Schema<IDevice>({
  name: { type: String, required: true },
  make: { type: String },
  model: { type: String },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  tags: [{ type: String }],

  // New structure
  connectionSetting: { type: ConnectionSettingSchema, required: false },
  dataPoints: [DataPointSchema],
  
  // Device control capabilities
  writableRegisters: [WritableRangeSchema],
  controlParameters: [ControlParameterSchema],
  lastControlledAt: { type: Date },

  // Device driver linkage
  deviceDriverId: { type: String, ref: 'DeviceDriver' },

  // Metadata fields
  usage: { type: String },
  usageNotes: { type: String },
  location: { type: String },
  pollingInterval: { type: Number, default: 30000 }, // Default to 30 seconds

  // Advanced communication settings
  advancedSettings: { type: AdvancedSettingsSchema },

  // Legacy fields for backward compatibility
  ip: { type: String },
  port: { type: Number },
  slaveId: { type: Number },
  serialPort: { type: String },
  baudRate: { type: Number },
  dataBits: { type: Number },
  stopBits: { type: Number },
  parity: { type: String },
  connectionType: { type: String, enum: ['tcp', 'rtu'] },
  registers: [RegisterSchema],
  registerRanges: [{ type: Schema.Types.Mixed }],
  parameterConfigs: [{ type: Schema.Types.Mixed }],

  lastSeen: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    userId: { type: String },
    username: { type: String },
    email: { type: String },
  },
});

// Update the updatedAt timestamp on save
DeviceSchema.pre('save', function (this: IDevice, next) {
  this.updatedAt = new Date();
  next(null);
});

// Create a function to create the Device model with a specific connection
export const createDeviceModel = (connection: mongoose.Connection) => {
  // Check if model already exists in this connection to prevent duplicate model error
  try {
    return connection.model<IDevice>('Device');
  } catch (error) {
    // Model doesn't exist yet for this connection, create it
    return connection.model<IDevice>('Device', DeviceSchema);
  }
};

// For backward compatibility, also create with default connection
const Device = mongoose.model<IDevice>('Device', DeviceSchema);
export default Device;
