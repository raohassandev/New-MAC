/**
 * Common utility functions for Modbus
 */
import { RegisterType, Parameter, ParameterGroup, DataTypeWordCount } from '../../../core/types';
import { ModbusFunctionCode } from './function-codes';

/**
 * Group parameters by register type and address for efficient reading
 * @param parameters Parameters to group
 * @returns Array of parameter groups
 */
export function groupParameters(parameters: Parameter[]): ParameterGroup[] {
  if (!parameters || parameters.length === 0) {
    return [];
  }

  // Group parameters by register type first
  const groupsByType = new Map<RegisterType, Parameter[]>();

  for (const param of parameters) {
    const type = param.registerType;

    if (!groupsByType.has(type)) {
      groupsByType.set(type, []);
    }

    groupsByType.get(type)!.push(param);
  }

  // For each register type, group parameters by contiguous address ranges
  const result: ParameterGroup[] = [];

  for (const [registerType, typeParameters] of groupsByType.entries()) {
    // Sort by address
    const sortedParams = [...typeParameters].sort((a, b) => a.address - b.address);

    let currentGroup: ParameterGroup | null = null;

    for (const param of sortedParams) {
      // Calculate the number of registers this parameter occupies
      const wordCount = param.wordCount || DataTypeWordCount[param.dataType] || 1;

      // Calculate the end address of this parameter
      const endAddress = param.address + wordCount - 1;

      // If we don't have a current group or this parameter doesn't fit in it,
      // create a new group
      if (
        !currentGroup ||
        endAddress > currentGroup.endAddress + 5 // Allow for a gap of up to 5 registers
      ) {
        currentGroup = {
          registerType,
          startAddress: param.address,
          endAddress,
          parameters: [param],
        };

        result.push(currentGroup);
      } else {
        // Parameter fits in current group, add it and update end address if needed
        currentGroup.parameters.push(param);
        currentGroup.endAddress = Math.max(currentGroup.endAddress, endAddress);
      }
    }
  }

  return result;
}

/**
 * Check if the quantity of registers/coils is valid for a Modbus request
 * @param functionCode Modbus function code
 * @param quantity Quantity of registers/coils
 * @returns True if the quantity is valid
 */
export function isValidQuantity(functionCode: number, quantity: number): boolean {
  switch (functionCode) {
    case ModbusFunctionCode.READ_COILS:
    case ModbusFunctionCode.READ_DISCRETE_INPUTS:
      // Max 2000 coils/inputs per request
      return quantity > 0 && quantity <= 2000;

    case ModbusFunctionCode.READ_HOLDING_REGISTERS:
    case ModbusFunctionCode.READ_INPUT_REGISTERS:
      // Max 125 registers per request
      return quantity > 0 && quantity <= 125;

    case ModbusFunctionCode.WRITE_MULTIPLE_COILS:
      // Max 1968 coils per request
      return quantity > 0 && quantity <= 1968;

    case ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS:
      // Max 123 registers per request
      return quantity > 0 && quantity <= 123;

    default:
      return false;
  }
}

/**
 * Convert a register type to the appropriate Modbus function code for reading
 * @param registerType Register type
 * @returns Modbus function code
 */
export function getReadFunctionCode(registerType: RegisterType): ModbusFunctionCode {
  switch (registerType) {
    case RegisterType.COIL:
      return ModbusFunctionCode.READ_COILS;
    case RegisterType.DISCRETE_INPUT:
      return ModbusFunctionCode.READ_DISCRETE_INPUTS;
    case RegisterType.HOLDING_REGISTER:
      return ModbusFunctionCode.READ_HOLDING_REGISTERS;
    case RegisterType.INPUT_REGISTER:
      return ModbusFunctionCode.READ_INPUT_REGISTERS;
    default:
      throw new Error(`Unknown register type: ${registerType}`);
  }
}

/**
 * Convert a register type to the appropriate Modbus function code for writing
 * @param registerType Register type
 * @param isSingle Whether to use a single write function
 * @returns Modbus function code
 */
export function getWriteFunctionCode(
  registerType: RegisterType,
  isSingle: boolean = true,
): ModbusFunctionCode {
  switch (registerType) {
    case RegisterType.COIL:
      return isSingle
        ? ModbusFunctionCode.WRITE_SINGLE_COIL
        : ModbusFunctionCode.WRITE_MULTIPLE_COILS;
    case RegisterType.HOLDING_REGISTER:
      return isSingle
        ? ModbusFunctionCode.WRITE_SINGLE_REGISTER
        : ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS;
    case RegisterType.DISCRETE_INPUT:
    case RegisterType.INPUT_REGISTER:
      throw new Error(`Register type ${registerType} is read-only`);
    default:
      throw new Error(`Unknown register type: ${registerType}`);
  }
}

/**
 * Check if a register type is writable
 * @param registerType Register type
 * @returns True if the register type is writable
 */
export function isWritableRegisterType(registerType: RegisterType): boolean {
  return registerType === RegisterType.COIL || registerType === RegisterType.HOLDING_REGISTER;
}

/**
 * Convert a Modbus function code to a human-readable operation description
 * @param functionCode Modbus function code
 * @param address Starting address
 * @param quantity Quantity of registers/coils
 * @returns Human-readable operation description
 */
export function getOperationDescription(
  functionCode: number,
  address: number,
  quantity: number = 1,
): string {
  const addressRange = quantity > 1 ? `${address}-${address + quantity - 1}` : `${address}`;

  switch (functionCode) {
    case ModbusFunctionCode.READ_COILS:
      return `Reading ${quantity} coil${quantity > 1 ? 's' : ''} from address ${addressRange}`;

    case ModbusFunctionCode.READ_DISCRETE_INPUTS:
      return `Reading ${quantity} discrete input${quantity > 1 ? 's' : ''} from address ${addressRange}`;

    case ModbusFunctionCode.READ_HOLDING_REGISTERS:
      return `Reading ${quantity} holding register${quantity > 1 ? 's' : ''} from address ${addressRange}`;

    case ModbusFunctionCode.READ_INPUT_REGISTERS:
      return `Reading ${quantity} input register${quantity > 1 ? 's' : ''} from address ${addressRange}`;

    case ModbusFunctionCode.WRITE_SINGLE_COIL:
      return `Writing to coil at address ${address}`;

    case ModbusFunctionCode.WRITE_SINGLE_REGISTER:
      return `Writing to register at address ${address}`;

    case ModbusFunctionCode.WRITE_MULTIPLE_COILS:
      return `Writing to ${quantity} coils starting at address ${address}`;

    case ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS:
      return `Writing to ${quantity} registers starting at address ${address}`;

    default:
      return `Executing function code ${functionCode} at address ${addressRange}`;
  }
}
