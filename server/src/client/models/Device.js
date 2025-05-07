'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.createDeviceModel =
  exports.DeviceSchema =
  exports.RegisterSchema =
  exports.ConnectionSettingSchema =
  exports.RtuSettingsSchema =
  exports.TcpSettingsSchema =
  exports.DataPointSchema =
  exports.ParserSchema =
  exports.ParameterSchema =
  exports.RangeSchema =
    void 0;
var mongoose_1 = __importStar(require('mongoose'));
// Schemas for the nested structures
exports.RangeSchema = new mongoose_1.Schema({
  startAddress: { type: Number, required: true },
  count: { type: Number, required: true },
  fc: { type: Number, required: true },
});
exports.ParameterSchema = new mongoose_1.Schema({
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
exports.ParserSchema = new mongoose_1.Schema({
  parameters: [exports.ParameterSchema],
});
exports.DataPointSchema = new mongoose_1.Schema({
  range: { type: exports.RangeSchema, required: true },
  parser: { type: exports.ParserSchema, required: true },
});
// TCP Settings Schema
exports.TcpSettingsSchema = new mongoose_1.Schema({
  ip: { type: String, required: true },
  port: { type: Number, required: true },
  slaveId: { type: Number, required: true },
});
// RTU Settings Schema
exports.RtuSettingsSchema = new mongoose_1.Schema({
  serialPort: { type: String, required: false }, // Changed from required: true
  baudRate: { type: Number, required: false }, // Changed from required: true
  dataBits: { type: Number, required: false }, // Changed from required: true
  stopBits: { type: Number, required: false }, // Changed from required: true
  parity: { type: String, required: false }, // Changed from required: true
  slaveId: { type: Number, required: false }, // Changed from required: true
});
// Combined Connection Setting Schema
exports.ConnectionSettingSchema = new mongoose_1.Schema({
  connectionType: { type: String, enum: ['tcp', 'rtu'], required: true },
  tcp: { type: exports.TcpSettingsSchema },
  rtu: { type: exports.RtuSettingsSchema },
});
// Legacy schema
exports.RegisterSchema = new mongoose_1.Schema({
  name: { type: String, required: true },
  address: { type: Number, required: true },
  length: { type: Number, default: 2 },
  scaleFactor: { type: Number, default: 1 },
  decimalPoint: { type: Number, default: 0 },
  byteOrder: { type: String, default: 'AB CD' },
  unit: { type: String },
});
exports.DeviceSchema = new mongoose_1.Schema({
  name: { type: String, required: true },
  make: { type: String },
  model: { type: String },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  tags: [{ type: String }],
  // New structure
  connectionSetting: { type: exports.ConnectionSettingSchema, required: false },
  dataPoints: [exports.DataPointSchema],
  // Device driver linkage
  deviceDriverId: { type: String, ref: 'DeviceDriver' },
  // Metadata fields
  usage: { type: String },
  usageNotes: { type: String },
  location: { type: String },
  pollingInterval: { type: Number, default: 30000 }, // Default to 30 seconds
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
  registers: [exports.RegisterSchema],
  registerRanges: [{ type: mongoose_1.Schema.Types.Mixed }],
  parameterConfigs: [{ type: mongoose_1.Schema.Types.Mixed }],
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
exports.DeviceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next(null);
});
// Create a function to create the Device model with a specific connection
var createDeviceModel = function (connection) {
  // Check if model already exists in this connection to prevent duplicate model error
  try {
    return connection.model('Device');
  } catch (error) {
    // Model doesn't exist yet for this connection, create it
    return connection.model('Device', exports.DeviceSchema);
  }
};
exports.createDeviceModel = createDeviceModel;
// For backward compatibility, also create with default connection
var Device = mongoose_1.default.model('Device', exports.DeviceSchema);
exports.default = Device;
