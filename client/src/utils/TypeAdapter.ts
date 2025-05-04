// TypeAdapter.ts
import {
  RegisterRange as FormRegisterRange,
  ParameterConfig as FormParameterConfig,
} from '../types/form.types';
import {
  RegisterRange as DeviceRegisterRange,
  ParameterConfig as DeviceParameterConfig,
  DataType,
  DataPoint,
  ConnectionSetting,
  Device
} from '../types/device.types';

/**
 * Adapter to convert string dataType to enum DataType
 */
export function convertDataTypeToEnum(dataTypeStr: string): string {
  // Just return the string directly since we've changed the type to match
  return dataTypeStr;

  // Original implementation with enums:
  // const dataTypeMap: Record<string, DataType> = {
  //   'INT-16': DataType.INT16,
  //   'UINT-16': DataType.UINT16,
  //   'INT-32': DataType.INT32,
  //   'UINT-32': DataType.UINT32,
  //   'FLOAT': DataType.FLOAT,
  //   'DOUBLE': DataType.DOUBLE,
  // };
  // return dataTypeMap[dataTypeStr] || DataType.UINT16;
}

/**
 * Converts a form parameter config to a device parameter config
 */
export function convertToDeviceParameterConfig(
  formParam: FormParameterConfig
): DeviceParameterConfig {
  // Simply return the original parameter as the types now match
  return formParam;
}

/**
 * Converts a form register range to a device register range
 */
export function convertToDeviceRegisterRange(formRange: FormRegisterRange): DeviceRegisterRange {
  // Simply return the original range as the types now match
  return formRange;
}

/**
 * Creates a dataPoint object from a register range and its associated parameters
 */
function createDataPointFromRange(
  range: FormRegisterRange,
  parameters: FormParameterConfig[]
): DataPoint {
  // Find all parameters associated with this range
  const rangeParameters = parameters.filter(param => param.registerRange === range.rangeName);

  return {
    range: {
      startAddress: range.startRegister,
      count: range.length,
      fc: range.functionCode,
    },
    parser: {
      // Include all the Data Reading tab info
      parameters: rangeParameters,
    },
  };
}

/**
 * Converts the entire form data to device-compatible data for submission
 */
export function convertFormToDeviceData(
  deviceBasics: any,
  connectionSettings: any,
  registerRanges: FormRegisterRange[],
  parameters: FormParameterConfig[],
  userInfo?: any
): Partial<Device> {
  // Create dataPoints array from register ranges
  const dataPoints = registerRanges.map(range => createDataPointFromRange(range, parameters));

  // Create connection settings object with separate TCP and RTU objects
  const connectionSetting: ConnectionSetting = {
    connectionType: connectionSettings.type,
  };

  // Add the appropriate connection details based on type
  if (connectionSettings.type === 'tcp') {
    connectionSetting.tcp = {
      ip: connectionSettings.ip,
      port: parseInt(connectionSettings.port),
      slaveId: parseInt(connectionSettings.slaveId),
    };
  } else if (connectionSettings.type === 'rtu') {
    connectionSetting.rtu = {
      serialPort: connectionSettings.serialPort,
      baudRate: parseInt(connectionSettings.baudRate),
      dataBits: parseInt(connectionSettings.dataBits),
      stopBits: parseInt(connectionSettings.stopBits),
      parity: connectionSettings.parity,
      slaveId: parseInt(connectionSettings.slaveId),
    };
  }

  // Add user information if provided
  const createdBy = userInfo ? {
    userId: userInfo._id,
    username: userInfo.username || userInfo.name,
    email: userInfo.email
  } : undefined;

  return {
    ...deviceBasics,
    connectionSetting, // Connection settings as a separate object
    dataPoints, // Data points array with range and parser
    createdBy, // Add user information
    isTemplate: true, // Mark this as a template
  };
}

/**
 * Alias for convertFormToDeviceData - used by templates
 * Converts form data to template-compatible data for submission
 */
export function convertFormToTemplateData(
  deviceBasics: any,
  connectionSettings: any,
  registerRanges: FormRegisterRange[],
  parameters: FormParameterConfig[],
  userInfo?: any
): Partial<Device> {
  return convertFormToDeviceData(
    deviceBasics,
    connectionSettings,
    registerRanges,
    parameters,
    userInfo
  );
}
