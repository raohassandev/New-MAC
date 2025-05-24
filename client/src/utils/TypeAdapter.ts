// TypeAdapter.ts
import {
  RegisterRange as FormRegisterRange,
  ParameterConfig as FormParameterConfig,
} from '../types/form.types';
import {
  RegisterRange as DeviceRegisterRange,
  ParameterConfig as DeviceParameterConfig,
  DataPoint,
  Device,
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
  // Find all parameters associated with this range (case-insensitive match)
  const rangeParameters = parameters.filter(param => 
    param.registerRange?.toLowerCase() === range.rangeName.toLowerCase()
  );

  return {
    range: {
      startAddress: range.startRegister,
      count: range.length,
      fc: range.functionCode,
      name: range.rangeName, // Include the range name
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
  registerRanges: FormRegisterRange[],
  parameters: FormParameterConfig[],
  userInfo?: any
): Partial<Device> {
  // Create dataPoints array from register ranges
  const dataPoints = registerRanges.map(range => createDataPointFromRange(range, parameters));

  // Add user information if provided
  const createdBy = userInfo
    ? {
        userId: userInfo._id,
        username: userInfo.username || userInfo.name,
        email: userInfo.email,
      }
    : undefined;

  return {
    ...deviceBasics,
    dataPoints, // Data points array with range and parser
    createdBy, // Add user information
    isTemplate: true, // Mark this as a template
    isDeviceDriver: true, // Mark this as a device driver
  };
}

/**
 * Alias for convertFormToDeviceData - used by templates
 * Converts form data to template-compatible data for submission
 */
export function convertFormToTemplateData(
  deviceBasics: any,
  registerRanges: FormRegisterRange[],
  parameters: FormParameterConfig[],
  userInfo?: any
): Partial<Device> {
  return convertFormToDeviceData(
    deviceBasics,
    registerRanges,
    parameters,
    userInfo
  );
}
