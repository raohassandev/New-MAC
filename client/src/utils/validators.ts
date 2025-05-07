// TypeAdapter.ts
import {
  RegisterRange as FormRegisterRange,
  ParameterConfig as FormParameterConfig,
} from '../types/form.types';
import {
  RegisterRange as DeviceRegisterRange,
  ParameterConfig as DeviceParameterConfig,
  DataType,
  ByteOrder,
} from '../types/device.types';

/**
 * Adapter to convert string dataType to enum DataType
 * Note: This assumes the DataType enum is defined in device.types.ts as follows:
 * enum DataType {
 *   INT16 = 'INT-16',
 *   UINT16 = 'UINT-16',
 *   INT32 = 'INT-32',
 *   UINT32 = 'UINT-32',
 *   FLOAT = 'FLOAT',
 *   DOUBLE = 'DOUBLE'
 * }
 */
export function convertDataTypeToEnum(dataTypeStr: string): DataType {
  // Use a type assertion since we know these strings map to enum values
  return dataTypeStr as DataType;
}

/**
 * Convert string byteOrder to ByteOrder enum
 * Note: This assumes the ByteOrder enum is defined in device.types.ts
 */
export function convertByteOrderToEnum(byteOrderStr: string): ByteOrder {
  // Use a type assertion since we know these strings map to enum values
  return byteOrderStr as ByteOrder;
}

/**
 * Converts a form parameter config to a device parameter config
 */
export function convertToDeviceParameterConfig(
  formParam: FormParameterConfig
): DeviceParameterConfig {
  return {
    ...formParam,
    dataType: convertDataTypeToEnum(formParam.dataType),
    byteOrder: convertByteOrderToEnum(formParam.byteOrder),
  };
}

/**
 * Converts a form register range to a device register range
 */
export function convertToDeviceRegisterRange(formRange: FormRegisterRange): DeviceRegisterRange {
  return {
    ...formRange,
    dataParser: formRange.dataParser
      ? formRange.dataParser.map(convertToDeviceParameterConfig)
      : undefined,
  };
}

/**
 * Converts the entire form data to device-compatible data for submission
 */
export function convertFormToDeviceData(
  deviceBasics: any,
  connectionSettings: any,
  registerRanges: FormRegisterRange[],
  parameters: FormParameterConfig[]
): any {
  return {
    ...deviceBasics,
    port: parseInt(connectionSettings.port),
    slaveId: parseInt(connectionSettings.slaveId),
    baudRate: parseInt(connectionSettings.baudRate),
    dataBits: parseInt(connectionSettings.dataBits),
    stopBits: parseInt(connectionSettings.stopBits),
    connectionType: connectionSettings.type,
    ip: connectionSettings.ip,
    serialPort: connectionSettings.serialPort,
    parity: connectionSettings.parity,
    registerRanges: registerRanges.map(convertToDeviceRegisterRange),
    parameterConfigs: parameters.map(convertToDeviceParameterConfig),
  };
}
