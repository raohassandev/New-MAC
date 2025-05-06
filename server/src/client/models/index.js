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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.clientModels =
  exports.createDeviceModel =
  exports.HistoricalData =
  exports.Alert =
  exports.Profile =
  exports.Device =
  exports.User =
    void 0;
var Alert_1 = __importDefault(require('./Alert'));
exports.Alert = Alert_1.default;
var Device_1 = __importStar(require('./Device'));
exports.Device = Device_1.default;
Object.defineProperty(exports, 'createDeviceModel', {
  enumerable: true,
  get: function () {
    return Device_1.createDeviceModel;
  },
});
var Profile_1 = __importDefault(require('./Profile'));
exports.Profile = Profile_1.default;
var User_1 = __importDefault(require('./User'));
exports.User = User_1.default;
var HistoricalData_1 = __importDefault(require('./HistoricalData'));
exports.HistoricalData = HistoricalData_1.default;
var mongoose_1 = __importDefault(require('mongoose'));
/**
 * Initialize and return all client models using the provided database connection
 * This function creates models connected to the Client database
 *
 * @param connection Mongoose connection to the client database
 * @returns Object containing all client models
 */
var clientModels = function (connection) {
  var _a, _b;
  if (!connection) {
    console.error('No client database connection provided to model factory');
    throw new Error('Invalid database connection');
  }
  // Validate connection is ready
  if (connection.readyState !== 1) {
    console.warn(
      'Database connection not ready (state: '.concat(
        connection.readyState,
        '). Waiting for connection...',
      ),
    );
  }
  try {
    // Log connection information
    console.log('Creating models with connection to database: '.concat(connection.name));
    console.log('Connection state: '.concat(connection.readyState));
    // Create models using the provided client connection
    var DeviceModel = (0, Device_1.createDeviceModel)(connection);
    // Create HistoricalData model
    var HistoricalDataSchema = HistoricalData_1.default.schema;
    var HistoricalDataModel = void 0;
    try {
      // Try to get existing model first
      HistoricalDataModel = connection.model('HistoricalData');
    } catch (modelError) {
      // Model doesn't exist yet, create it
      HistoricalDataModel = connection.model('HistoricalData', HistoricalDataSchema);
    }
    console.log('Client models initialized successfully with specific connection');
    console.log(
      '- Device model connected to: '.concat(
        ((_a = DeviceModel.db) === null || _a === void 0 ? void 0 : _a.name) || 'unknown',
      ),
    );
    console.log(
      '- HistoricalData model connected to: '.concat(
        ((_b = HistoricalDataModel.db) === null || _b === void 0 ? void 0 : _b.name) || 'unknown',
      ),
    );
    // Return an object containing all models
    return {
      Device: DeviceModel,
      HistoricalData: HistoricalDataModel,
    };
  } catch (error) {
    console.error('Error initializing client models:', error);
    // Log more debugging information
    console.error(
      'Connection name: '.concat(connection.name, ', state: ').concat(connection.readyState),
    );
    console.error('Available models: '.concat(mongoose_1.default.modelNames().join(', ')));
    throw error;
  }
};
exports.clientModels = clientModels;
