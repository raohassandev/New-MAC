// NewTemplateForm/utils/TypeAdapter.ts
import {
  RegisterRange as FormRegisterRange,
  ParameterConfig as FormParameterConfig,
} from '../../../../types/form.types';
import {
  RegisterRange as DeviceRegisterRange,
  ParameterConfig as DeviceParameterConfig,
  DataType,
  DataPoint,
  ConnectionSetting,
  Template
} from '../../../../types/template.types';

/**
 * Adapter to convert string dataType to enum DataType
 */
export function convertDataTypeToEnum(dataTypeStr: string): string {
  // Just return the string directly since we've changed the type to match
  return dataTypeStr;
}

/**
 * Converts a form parameter config to a template parameter config
 */
export function convertToTemplateParameterConfig(
  formParam: FormParameterConfig
): DeviceParameterConfig {
  // Simply return the original parameter as the types now match
  return formParam;
}

/**
 * Converts a form register range to a template register range
 */
export function convertToTemplateRegisterRange(formRange: FormRegisterRange): DeviceRegisterRange {
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
 * Converts the entire form data to template-compatible data for submission
 */
export function convertFormToTemplateData(
  deviceBasics: any,
  connectionSettings: any,
  registerRanges: FormRegisterRange[],
  parameters: FormParameterConfig[],
  userInfo?: any
): Partial<Template> {
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
    isTemplate: true, // ALWAYS mark this as a template
  };
}