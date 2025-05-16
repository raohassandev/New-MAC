import Device, { createDeviceModel } from './device.model';
import User from './user.model';
import HistoricalData from './historicalData.model';
import RealtimeData from './realtimeData.model';
import { ScheduleTemplate, DeviceSchedule, createScheduleModels } from './schedule.model';
import mongoose from 'mongoose';

// Export models
export { User, Device, HistoricalData, RealtimeData, createDeviceModel, ScheduleTemplate, DeviceSchedule };

// Store the connection reference to ensure it's maintained
let clientDbConnection: mongoose.Connection | null = null;
let clientDeviceModel: mongoose.Model<any> | null = null;

/**
 * Initialize and return all client models using the provided database connection
 * This function creates models connected to the Client database
 *
 * @param connection Mongoose connection to the client database
 * @returns Object containing all client models
 */
export const clientModels = (connection: mongoose.Connection) => {
  if (!connection) {
    console.error('No client database connection provided to model factory');
    throw new Error('Invalid database connection');
  }

  // Check connection state
  if (connection.readyState !== 1) {
    console.error(`Invalid connection state: ${connection.readyState} (should be 1=connected)`);
    throw new Error('Database connection is not active');
  }

  // Save the connection reference for future use
  clientDbConnection = connection;

  try {
    console.log(`Creating models with connection to database: ${connection.name}`);
    console.log(`Connection state: ${connection.readyState}`);

    // Create models using the provided client connection
    clientDeviceModel = createDeviceModel(connection);
    const DeviceModel = clientDeviceModel;

    // Verify the model was created with the correct connection
    if (DeviceModel.db?.name !== connection.name) {
      console.error(
        `ERROR: Model connected to wrong database. Expected: ${connection.name}, Got: ${DeviceModel.db?.name}`,
      );
      throw new Error('Model connected to wrong database');
    }

    // Create HistoricalData model with the client connection
    const HistoricalDataSchema = HistoricalData.schema;
    const HistoricalDataModel = connection.model('HistoricalData', HistoricalDataSchema);

    // Create RealtimeData model with the client connection
    const RealtimeDataSchema = RealtimeData.schema;
    const RealtimeDataModel = connection.model('RealtimeData', RealtimeDataSchema);

    // Create Schedule models with the client connection
    const scheduleModels = createScheduleModels(connection);
    const ScheduleTemplateModel = scheduleModels.ScheduleTemplate;
    const DeviceScheduleModel = scheduleModels.DeviceSchedule;

    console.log('Client models initialized successfully with specific connection');
    console.log(`- Device model connected to: ${DeviceModel.db?.name}`);
    console.log(`- HistoricalData model connected to: ${HistoricalDataModel.db?.name}`);
    console.log(`- RealtimeData model connected to: ${RealtimeDataModel.db?.name}`);
    console.log(`- ScheduleTemplate model connected to: ${ScheduleTemplateModel.db?.name}`);
    console.log(`- DeviceSchedule model connected to: ${DeviceScheduleModel.db?.name}`);

    // Return an object containing all models
    return {
      Device: DeviceModel,
      HistoricalData: HistoricalDataModel,
      RealtimeData: RealtimeDataModel,
      ScheduleTemplate: ScheduleTemplateModel,
      DeviceSchedule: DeviceScheduleModel,
    };
  } catch (error) {
    console.error('Error initializing client models:', error);
    throw error;
  }
};

/**
 * Get the client database connection
 * @returns The client database connection
 */
export const getClientDbConnection = () => {
  return clientDbConnection;
};

/**
 * Get the client Device model
 * @returns The client Device model
 */
export function getClientDeviceModel() {
  return clientDeviceModel;
}

// Export interfaces
export type { IUser } from './user.model';
export type {
  IDevice,
  IRegister,
  IRange,
  IParameter,
  IParser,
  IDataPoint,
  ITcpSettings,
  IRtuSettings,
  IConnectionSetting,
} from './device.model';
export type { IHistoricalData } from './historicalData.model';
export type { IRealtimeData } from './realtimeData.model';
export type { IScheduleTemplate, IDeviceSchedule, IScheduleRule } from './schedule.model';
