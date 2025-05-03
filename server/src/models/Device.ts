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

// Connection settings structure
export interface IConnectionSetting {
  connectionType: 'tcp' | 'rtu';
  ip?: string;
  port?: number;
  slaveId: number;
  serialPort?: string;
  baudRate?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
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
}

// Schemas for the nested structures
const RangeSchema = new Schema<IRange>({
  startAddress: { type: Number, required: true },
  count: { type: Number, required: true },
  fc: { type: Number, required: true },
});

const ParameterSchema = new Schema<IParameter>({
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

const ParserSchema = new Schema<IParser>({
  parameters: [ParameterSchema],
});

const DataPointSchema = new Schema<IDataPoint>({
  range: { type: RangeSchema, required: true },
  parser: { type: ParserSchema, required: true },
});

const ConnectionSettingSchema = new Schema<IConnectionSetting>({
  connectionType: { type: String, enum: ['tcp', 'rtu'], required: true },
  ip: { type: String },
  port: { type: Number },
  slaveId: { type: Number, required: true },
  serialPort: { type: String },
  baudRate: { type: Number },
  dataBits: { type: Number },
  stopBits: { type: Number },
  parity: { type: String },
});

// Legacy schema
const RegisterSchema = new Schema<IRegister>({
  name: { type: String, required: true },
  address: { type: Number, required: true },
  length: { type: Number, default: 2 },
  scaleFactor: { type: Number, default: 1 },
  decimalPoint: { type: Number, default: 0 },
  byteOrder: { type: String, default: 'AB CD' },
  unit: { type: String },
});

const DeviceSchema = new Schema<IDevice>({
  name: { type: String, required: true },
  make: { type: String },
  model: { type: String },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  tags: [{ type: String }],
  
  // New structure
  connectionSetting: { type: ConnectionSettingSchema, required: false },
  dataPoints: [DataPointSchema],
  
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
});

// Update the updatedAt timestamp on save
DeviceSchema.pre('save', function (this: IDevice, next) {
  this.updatedAt = new Date();
  next(null);
});

const Device = mongoose.model<IDevice>('Device', DeviceSchema);
export default Device;
