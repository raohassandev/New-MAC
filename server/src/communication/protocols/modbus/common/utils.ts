import { RegisterType, DataType } from '../../../../core/types';
import { countRegistersForDataType } from './data-types';

/**
 * Interface for a parameter specification
 */
interface ParameterSpec {
  address: number;
  registerType: RegisterType;
  dataType: DataType;
}

/**
 * Interface for read operation, used to optimize reads
 */
interface ReadOperation {
  startAddress: number;
  registerCount: number;
  parameters: ParameterSpec[];
}

/**
 * Group parameters by register type
 * @param parameters Parameters to group
 * @returns Object with register type as key and array of parameters as value
 */
export function groupParameters(
  parameters: ParameterSpec[],
): Record<RegisterType, ParameterSpec[]> {
  const result: Record<RegisterType, ParameterSpec[]> = {} as Record<RegisterType, ParameterSpec[]>;

  for (const param of parameters) {
    if (!result[param.registerType]) {
      result[param.registerType] = [];
    }

    result[param.registerType].push(param);
  }

  return result;
}

/**
 * Optimize register reads by grouping adjacent registers
 * @param parameters Parameters of the same register type
 * @returns Array of optimized read operations
 */
export function optimizeRegisterReads(parameters: ParameterSpec[]): ReadOperation[] {
  if (parameters.length === 0) {
    return [];
  }

  // Sort by address to find adjacent registers
  const sortedParams = [...parameters].sort((a, b) => a.address - b.address);

  const operations: ReadOperation[] = [];
  let currentOperation: ReadOperation | null = null;

  for (const param of sortedParams) {
    const regCount = countRegistersForDataType(param.dataType);
    const paramEndAddress = param.address + regCount - 1;

    if (!currentOperation) {
      // Start a new operation
      currentOperation = {
        startAddress: param.address,
        registerCount: regCount,
        parameters: [param],
      };
    } else {
      const opEndAddress = currentOperation.startAddress + currentOperation.registerCount - 1;

      // Check if the current parameter is adjacent to the current operation
      // or if including it would result in a reasonable gap (less than 5 registers)
      // 125 is the maximum number of registers that can be read at once in Modbus
      const maxGap = 5;
      const wouldExceedLimit = paramEndAddress - currentOperation.startAddress + 1 > 125;

      if (param.address <= opEndAddress + maxGap && !wouldExceedLimit) {
        // Extend the current operation
        const newRegCount = paramEndAddress - currentOperation.startAddress + 1;
        currentOperation.registerCount = Math.max(currentOperation.registerCount, newRegCount);
        currentOperation.parameters.push(param);
      } else {
        // Finish the current operation and start a new one
        operations.push(currentOperation);
        currentOperation = {
          startAddress: param.address,
          registerCount: regCount,
          parameters: [param],
        };
      }
    }
  }

  // Add the last operation
  if (currentOperation) {
    operations.push(currentOperation);
  }

  return operations;
}

/**
 * Checks if a value is within a valid range for a specific data type
 * @param value Value to check
 * @param dataType Data type
 * @returns True if value is valid, false otherwise
 */
export function isValidValue(value: any, dataType: DataType): boolean {
  switch (dataType) {
    case DataType.BOOLEAN:
      return typeof value === 'boolean';

    case DataType.INT16:
      return Number.isInteger(value) && value >= -32768 && value <= 32767;

    case DataType.UINT16:
      return Number.isInteger(value) && value >= 0 && value <= 65535;

    case DataType.INT32:
      return Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;

    case DataType.UINT32:
      return Number.isInteger(value) && value >= 0 && value <= 4294967295;

    case DataType.FLOAT32:
      return (
        typeof value === 'number' &&
        !Number.isNaN(value) &&
        value >= -3.4028234663852886e38 &&
        value <= 3.4028234663852886e38
      );

    case DataType.FLOAT64:
      return typeof value === 'number' && !Number.isNaN(value);

    case DataType.STRING:
      return typeof value === 'string';

    default:
      return false;
  }
}

/**
 * Rounds a number to a specified number of decimal places
 * Useful for comparing floating point values
 * @param value Value to round
 * @param decimals Number of decimal places
 * @returns Rounded value
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Formats a buffer as a hexadecimal string for debugging
 * @param buffer Buffer to format
 * @returns Formatted string
 */
export function formatBufferHex(buffer: Buffer): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

/**
 * Converts a register address to a standard Modbus address format (e.g., 40001 for holding register 0)
 * @param address Register address (0-65535)
 * @param registerType Register type
 * @returns Formatted address
 */
export function formatModbusAddress(address: number, registerType: RegisterType): string {
  let prefix: number;

  switch (registerType) {
    case RegisterType.COIL:
      prefix = 0;
      break;
    case RegisterType.DISCRETE_INPUT:
      prefix = 1;
      break;
    case RegisterType.INPUT_REGISTER:
      prefix = 3;
      break;
    case RegisterType.HOLDING_REGISTER:
      prefix = 4;
      break;
    default:
      return address.toString();
  }

  return `${prefix}${(address + 1).toString().padStart(4, '0')}`;
}
