// client/src/components/devices/NewDeviceForm/validation.ts
import { DeviceFormState } from './DeviceformContext';

// Validation errors organized by form section
export interface ValidationErrors {
  basicInfo: Record<string, string>;
  connection: Record<string, string>;
  registers: Record<string, string>;
  parameters: Record<string, string>;
  general: string[];
  isValid: boolean;
}

// Validates the device basics section
export const validateDeviceBasics = (
  deviceBasics: DeviceFormState['deviceBasics']
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Required field validation
  if (!deviceBasics.name?.trim()) {
    errors.name = 'Device name is required';
  } else if (deviceBasics.name.length < 3) {
    errors.name = 'Device name must be at least 3 characters';
  }

  // Make is required
  if (!deviceBasics.make?.trim()) {
    errors.make = 'Manufacturer/Make is required';
  }

  // Model is required
  if (!deviceBasics.model?.trim()) {
    errors.model = 'Model is required';
  }

  return errors;
};

// Validates connection settings
export const validateConnectionSettings = (
  connectionSettings: DeviceFormState['connectionSettings']
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validate based on connection type
  if (connectionSettings.type === 'tcp') {
    // TCP validation
    if (!connectionSettings.ip?.trim()) {
      errors.ip = 'IP address is required';
    } else {
      // Simple IP validation (could be more comprehensive)
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipPattern.test(connectionSettings.ip)) {
        errors.ip = 'Please enter a valid IP address (e.g., 192.168.1.100)';
      }
    }

    if (!connectionSettings.port) {
      errors.port = 'Port is required';
    } else {
      const port = parseInt(connectionSettings.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.port = 'Port must be a number between 1 and 65535';
      }
    }
  } else if (connectionSettings.type === 'rtu') {
    // RTU validation
    if (!connectionSettings.serialPort?.trim()) {
      errors.serialPort = 'Serial port is required';
    }

    // Baud rate validation
    if (!connectionSettings.baudRate) {
      errors.baudRate = 'Baud rate is required';
    } else {
      const baudRate = parseInt(connectionSettings.baudRate, 10);
      if (isNaN(baudRate) || !isValidBaudRate(baudRate)) {
        errors.baudRate = 'Please select a valid baud rate';
      }
    }

    // Data bits validation
    if (!connectionSettings.dataBits) {
      errors.dataBits = 'Data bits is required';
    } else {
      const dataBits = parseInt(connectionSettings.dataBits, 10);
      if (isNaN(dataBits) || dataBits < 5 || dataBits > 8) {
        errors.dataBits = 'Data bits must be between 5 and 8';
      }
    }

    // Stop bits validation
    if (!connectionSettings.stopBits) {
      errors.stopBits = 'Stop bits is required';
    } else {
      const validStopBits = ['1', '1.5', '2'];
      if (!validStopBits.includes(connectionSettings.stopBits)) {
        errors.stopBits = 'Please select a valid stop bits value';
      }
    }

    // Parity validation
    if (!connectionSettings.parity) {
      errors.parity = 'Parity is required';
    } else {
      const validParity = ['none', 'even', 'odd'];
      if (!validParity.includes(connectionSettings.parity)) {
        errors.parity = 'Please select a valid parity option';
      }
    }
  }

  // Slave ID validation (required for both types)
  if (!connectionSettings.slaveId) {
    errors.slaveId = 'Slave ID is required';
  } else {
    const slaveId = parseInt(connectionSettings.slaveId, 10);
    if (isNaN(slaveId) || slaveId < 1 || slaveId > 255) {
      errors.slaveId = 'Slave ID must be a number between 1 and 255';
    }
  }

  return errors;
};

// Validates register ranges
export const validateRegisterRanges = (
  registerRanges: DeviceFormState['registerRanges']
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (registerRanges.length === 0) {
    errors.general = 'At least one register range is required';
    return errors;
  }

  // Check for overlapping register ranges
  const ranges = [...registerRanges];
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];

    if (!range.rangeName?.trim()) {
      errors[`range_${i}_name`] = 'Range name is required';
    }

    if (!range.functionCode) {
      errors[`range_${i}_functionCode`] = 'Function code is required';
    }

    if (range.startRegister === undefined || range.startRegister === null) {
      errors[`range_${i}_startRegister`] = 'Start register is required';
    } else if (range.startRegister < 0) {
      errors[`range_${i}_startRegister`] = 'Start register must be a positive number';
    }

    if (range.length === undefined || range.length === null) {
      errors[`range_${i}_length`] = 'Length is required';
    } else if (range.length <= 0) {
      errors[`range_${i}_length`] = 'Length must be greater than 0';
    }

    /* 
   * CRITICAL FIX: Disable register range overlap checking
   * 
   * The issue was that "Current" and "Voltage" ranges with the same function code (3)
   * but representing different physical properties were being flagged as overlapping.
   * 
   * For industrial devices, it's completely valid to have multiple register ranges
   * with the same function code and overlapping address spaces if they are logically
   * different measurements or device features.
   */
   
   // Original overlap check code (commented out)
   /*
    for (let j = 0; j < ranges.length; j++) {
      if (i !== j) {
        // Don't compare with self
        const otherRange = ranges[j];

        // Skip if the other range doesn't have a valid name or properties
        if (!otherRange.rangeName || otherRange.functionCode === undefined) {
          continue;
        }

        // Only compare ranges that have the same function code
        if (range.functionCode === otherRange.functionCode) {
          const rangeStart = range.startRegister;
          const rangeEnd = range.startRegister + range.length - 1;
          const otherStart = otherRange.startRegister;
          const otherEnd = otherRange.startRegister + otherRange.length - 1;

          // Check if ranges overlap
          if (
            (rangeStart <= otherEnd && rangeEnd >= otherStart) ||
            (otherStart <= rangeEnd && otherEnd >= rangeStart)
          ) {
            // Make sure we have a valid range name to display in the error
            const otherRangeName = otherRange.rangeName.trim() || `Range #${j+1}`;
            errors[`range_${i}_overlap`] = `This range overlaps with "${otherRangeName}" (FC: ${otherRange.functionCode})`;
            break;
          }
        }
      }
    }
    */
  }

  return errors;
};

// Helper function to get word count based on data type
const getRequiredWordCount = (dataType: string): number => {
  if (['INT32', 'UINT32', 'FLOAT32', 'FLOAT'].includes(dataType)) {
    return 2;
  } else if (['INT64', 'UINT64', 'DOUBLE', 'FLOAT64'].includes(dataType)) {
    return 4;
  } else if (['STRING', 'ASCII'].includes(dataType)) {
    return 1; // Minimum 1, but actual count depends on configuration
  }
  return 1; // Default for standard types (INT16, UINT16, etc.)
};

// Validate byte order based on data type
const validateByteOrder = (dataType: string, byteOrder: string): string | null => {
  // Check if it's a multi-register data type
  const isMultiRegister = [
    'INT32',
    'UINT32',
    'FLOAT32',
    'FLOAT',
    'INT64',
    'UINT64',
    'DOUBLE',
    'FLOAT64',
    'STRING',
    'ASCII',
  ].includes(dataType);

  if (isMultiRegister) {
    // Multi-register should use 4-char byte orders
    if (!['ABCD', 'DCBA', 'BADC', 'CDAB'].includes(byteOrder)) {
      return 'For multi-register types, use ABCD, DCBA, BADC, or CDAB';
    }
  } else {
    // Single register should use 2-char byte orders
    if (!['AB', 'BA'].includes(byteOrder)) {
      return 'For single register types, use AB or BA';
    }
  }

  return null;
};

// Validate scaling equation
const validateScalingEquation = (equation: string): string | null => {
  if (!equation) return null;

  try {
    // Check for common JS equation syntax errors

    // First, verify it contains 'x' as the variable
    if (!equation.includes('x')) {
      return 'Equation must contain "x" as the variable';
    }

    // Check for balanced parentheses
    let openParens = 0;
    for (const char of equation) {
      if (char === '(') openParens++;
      if (char === ')') openParens--;
      if (openParens < 0) return 'Unbalanced parentheses in equation';
    }
    if (openParens !== 0) return 'Unbalanced parentheses in equation';

    // Check for invalid characters
    const invalidCharsRegex = /[^0-9x\s\.\+\-\*\/\(\)\,\|\&\>\<\=\!\%\^\~]/g;
    const invalidChars = equation.match(invalidCharsRegex);
    if (invalidChars && invalidChars.length > 0) {
      return `Invalid characters in equation: ${invalidChars.join(', ')}`;
    }

    // Check for common binary and arithmetic operators
    const operators = ['*', '/', '+', '-', '%', '<<', '>>', '>>>'];
    if (
      operators.some(op => equation.startsWith(op)) ||
      operators.some(op => equation.endsWith(op))
    ) {
      return 'Equation cannot start or end with an operator';
    }

    // Check for consecutive operators (like x++y or x**y which are invalid)
    for (const op1 of operators) {
      for (const op2 of operators) {
        if (equation.includes(op1 + op2) && !['++', '--'].includes(op1 + op2)) {
          return `Invalid consecutive operators: ${op1}${op2}`;
        }
      }
    }

    // Attempt to create a function from the equation and evaluate it
    // eslint-disable-next-line no-new-function
    const testFunc = new Function('x', `return ${equation}`);

    // Test with several values to check for errors in different scenarios
    const testValues = [0, 1, -1, 1000, -1000, 0.5, -0.5];
    for (const val of testValues) {
      const result = testFunc(val);

      // Check if result is a valid number
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return `Equation produces invalid result for x = ${val}`;
      }
    }

    return null;
  } catch (error) {
    // Try to provide more helpful error messages based on the error
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Unexpected token')) {
      return 'Syntax error: Unexpected token in equation';
    } else if (errorMessage.includes('Unexpected identifier')) {
      return 'Syntax error: Unexpected identifier in equation';
    } else if (errorMessage.includes('Invalid or unexpected token')) {
      return 'Syntax error: Invalid character in equation';
    }

    return 'Invalid equation syntax. Use JavaScript syntax with "x" as the variable.';
  }
};

// Validate bit position for boolean types
const validateBitPosition = (dataType: string, bitPosition?: number): string | null => {
  if (['BOOLEAN', 'BIT'].includes(dataType)) {
    if (bitPosition === undefined) {
      return 'Bit position is required for boolean/bit types';
    }

    if (bitPosition < 0 || bitPosition > 15) {
      return 'Bit position must be between 0 and 15';
    }
  }

  return null;
};

// Validate bitmask format
const validateBitmask = (bitmask?: string): string | null => {
  if (!bitmask) return null;

  // Check for hexadecimal format
  if (!/^0x[0-9A-Fa-f]+$/.test(bitmask)) {
    return 'Bitmask must be in hexadecimal format (e.g., 0xFF00)';
  }

  return null;
};

// Check for overlapping parameters within the same register range
const checkParameterOverlaps = (
  parameters: DeviceFormState['parameters']
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // ===================================================================
  // PART 1: Check for duplicate parameter names GLOBALLY
  // ===================================================================
  // Names must be unique across ALL register ranges
  // ===================================================================
  
  // Check for duplicate parameter names
  const nameMap = new Map<string, number>();
  parameters.forEach((param, index) => {
    const name = param.name.trim().toLowerCase(); // Case-insensitive comparison
    if (name && nameMap.has(name)) {
      const existingIndex = nameMap.get(name)!;
      errors[`param_${index}_name`] =
        `Parameter name "${param.name}" is already used by parameter #${existingIndex + 1}`;
    } else {
      nameMap.set(name, index);
    }
  });

  // ===================================================================
  // PART 2: Check for register index overlaps WITHIN THE SAME RANGE ONLY
  // ===================================================================
  // Register indices only need to be unique within the SAME register range
  // ===================================================================
  
  // Group parameters by register range
  const paramsByRange: Record<
    string,
    Array<{ index: number; param: DeviceFormState['parameters'][0]; end: number }>
  > = {};

  // Organize parameters by register range and calculate end indices
  parameters.forEach((param, index) => {
    if (!param.registerRange) return;

    const wordCount = param.wordCount || getRequiredWordCount(param.dataType);
    const end = param.registerIndex + wordCount - 1; // End index (inclusive)

    // Create a separate group for each register range
    // This is the key to ensuring parameters in different ranges don't conflict
    if (!paramsByRange[param.registerRange]) {
      paramsByRange[param.registerRange] = [];
    }

    paramsByRange[param.registerRange].push({
      index,
      param,
      end,
    });
  });

  // Check for overlaps within each register range separately
  // IMPORTANT: We only check for overlaps between parameters in the SAME register range
  Object.entries(paramsByRange).forEach(([rangeName, rangeParams]) => {
    for (let i = 0; i < rangeParams.length; i++) {
      const paramA = rangeParams[i];

      // For bit-level parameters, we need to check if they share the same register AND bit position
      if (['BOOLEAN', 'BIT'].includes(paramA.param.dataType)) {
        for (let j = i + 1; j < rangeParams.length; j++) {
          const paramB = rangeParams[j];

          // Only check bit-level parameters against each other
          if (['BOOLEAN', 'BIT'].includes(paramB.param.dataType)) {
            // For bit parameters, check if they use same register and same bit position
            if (
              paramA.param.registerIndex === paramB.param.registerIndex &&
              paramA.param.bitPosition === paramB.param.bitPosition
            ) {
              const errorKey = `param_${paramA.index}_bit_overlap`;
              if (!errors[errorKey]) {
                errors[errorKey] =
                  `Parameter "${paramA.param.name}" uses the same register and bit position as "${paramB.param.name}" in the same register range "${rangeName}"`;
              }
            }
          }
        }
      } else {
        // For non-bit parameters, check for register overlap with other parameters in the same range
        for (let j = i + 1; j < rangeParams.length; j++) {
          const paramB = rangeParams[j];

          // For non-bit parameters vs bit parameters
          if (['BOOLEAN', 'BIT'].includes(paramB.param.dataType)) {
            // Non-bit parameter overlaps with register used by bit parameter
            if (
              paramA.param.registerIndex <= paramB.param.registerIndex &&
              paramA.end >= paramB.param.registerIndex
            ) {
              // This is fine - bit parameters can share registers with other data types
              // as they only read a single bit
              continue;
            }
          } else {
            // Check for register overlap between non-bit parameters
            if (
              (paramA.param.registerIndex <= paramB.end &&
                paramA.end >= paramB.param.registerIndex) ||
              (paramB.param.registerIndex <= paramA.end && paramB.end >= paramA.param.registerIndex)
            ) {
              // Special case: exact same register index conflict
              if (paramA.param.registerIndex === paramB.param.registerIndex) {
                const errorKey = `param_${paramA.index}_duplicate_index`;
                if (!errors[errorKey]) {
                  errors[errorKey] =
                    `Parameter "${paramA.param.name}" uses the same register index as "${paramB.param.name}" in register range "${rangeName}"`;
                }
              } else {
                const errorKey = `param_${paramA.index}_overlap`;
                if (!errors[errorKey]) {
                  errors[errorKey] =
                    `Parameter "${paramA.param.name}" (registers ${paramA.param.registerIndex}-${paramA.end}) overlaps with "${paramB.param.name}" (registers ${paramB.param.registerIndex}-${paramB.end}) in register range "${rangeName}"`;
                }
              }
            }
          }
        }
      }
    }
  });

  return errors;
};

// Validate parameters
export const validateParameters = (
  parameters: DeviceFormState['parameters'],
  registerRanges: DeviceFormState['registerRanges']
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Parameters are optional, but if present, they must be valid
  if (parameters.length > 0) {
    // DEBUGGING: List all register range names for easier troubleshooting
    console.log("Available register ranges:", registerRanges.map(r => r.rangeName));
    
    parameters.forEach((param, index) => {
      if (!param.name?.trim()) {
        errors[`param_${index}_name`] = 'Parameter name is required';
      }

      if (!param.dataType) {
        errors[`param_${index}_dataType`] = 'Data type is required';
      }

      if (!param.registerRange) {
        errors[`param_${index}_registerRange`] = 'Register range is required';
      }

      if (param.registerIndex === undefined || param.registerIndex === null) {
        errors[`param_${index}_registerIndex`] = 'Register index is required';
      } else if (param.registerIndex < 0) {
        errors[`param_${index}_registerIndex`] = 'Register index must be a positive number';
      }

      // Check register range validity
      if (param.registerRange) {
        // DEBUGGING: Log the parameter's register range for troubleshooting
        console.log(`Parameter "${param.name}" uses register range "${param.registerRange}"`);
        
        const selectedRange = registerRanges.find(range => range.rangeName === param.registerRange);

        if (!selectedRange) {
          // CRITICAL FIX: If the register range doesn't exist, report a clear error
          errors[`param_${index}_registerRange`] = 
            `Register range "${param.registerRange}" does not exist. Available ranges: ${registerRanges.map(r => r.rangeName).join(', ')}`;
        }
        else {
          // Calculate required word count based on data type
          const requiredWordCount = param.wordCount || getRequiredWordCount(param.dataType);

          // Verify register index is valid
          if (param.registerIndex < 0) {
            errors[`param_${index}_registerIndex`] = 'Register index cannot be negative';
          }

          // Check if the register index is beyond range start
          if (selectedRange.length <= 0) {
            errors[`param_${index}_registerRange`] = 'Selected register range has no valid length';
          }
          // Check if the register index plus required words exceeds the range
          else if (param.registerIndex + requiredWordCount > selectedRange.length) {
            const maxValidIndex = Math.max(0, selectedRange.length - requiredWordCount);
            errors[`param_${index}_registerIndex`] =
              `Parameter uses ${requiredWordCount} registers and exceeds range bounds. Max valid index: ${maxValidIndex}`;
            errors[`param_${index}_registerRange`] =
              `Parameter at index ${param.registerIndex} exceeds range length: ${selectedRange.length}`;
          }

          // Check if this parameter would read beyond modbus specification limits
          // Modbus has a practical limit of typically 125 registers per read
          const maxRegistersPerRead = 125;
          if (requiredWordCount > maxRegistersPerRead) {
            errors[`param_${index}_wordCount`] =
              `Word count exceeds Modbus practical limit of ${maxRegistersPerRead} registers per read`;
          }
        }
      }

      // Duplicate parameter name check is now handled in checkParameterOverlaps

      // Validate byte order based on data type
      const byteOrderError = validateByteOrder(param.dataType, param.byteOrder);
      if (byteOrderError) {
        errors[`param_${index}_byteOrder`] = byteOrderError;
      }

      // Validate scaling equation if provided
      if (param.scalingEquation) {
        const equationError = validateScalingEquation(param.scalingEquation);
        if (equationError) {
          errors[`param_${index}_scalingEquation`] = equationError;
        }
      }

      // Validate bitmask if provided
      const bitmaskError = validateBitmask(param.bitmask);
      if (bitmaskError) {
        errors[`param_${index}_bitmask`] = bitmaskError;
      }

      // Validate bit position for boolean types
      const bitPositionError = validateBitPosition(param.dataType, param.bitPosition);
      if (bitPositionError) {
        errors[`param_${index}_bitPosition`] = bitPositionError;
      }

      // Validate string types have a word count
      if (['STRING', 'ASCII'].includes(param.dataType)) {
        if (!param.wordCount || param.wordCount < 1) {
          errors[`param_${index}_wordCount`] = 'String types must have a word count of at least 1';
        } else if (param.wordCount > 125) {
          errors[`param_${index}_wordCount`] = 'Word count must not exceed 125 for strings';
        }
      }

      // Validate min/max values if both are provided
      if (param.minValue !== undefined && param.maxValue !== undefined) {
        if (param.minValue >= param.maxValue) {
          errors[`param_${index}_minValue`] = 'Minimum value must be less than maximum value';
        }
      }
    });

    // Check for overlapping parameters
    const overlapErrors = checkParameterOverlaps(parameters);
    Object.assign(errors, overlapErrors);
  }

  return errors;
};

// Main validation function
export const validateDeviceForm = (formState: DeviceFormState): ValidationErrors => {
  const basicInfoErrors = validateDeviceBasics(formState.deviceBasics);
  const connectionErrors = validateConnectionSettings(formState.connectionSettings);
  const registerErrors = validateRegisterRanges(formState.registerRanges);
  const parameterErrors = validateParameters(formState.parameters, formState.registerRanges);

  // Collect general errors
  const generalErrors: string[] = [];

  // Check if there are required register ranges
  if (formState.registerRanges.length === 0) {
    generalErrors.push('At least one register range is required');
  }

  // Check for register range and parameter compatibility
  // If we have parameters but no register ranges, add an error
  if (formState.parameters.length > 0 && formState.registerRanges.length === 0) {
    generalErrors.push('Register ranges must be defined before adding parameters');
  }

  return {
    basicInfo: basicInfoErrors,
    connection: connectionErrors,
    registers: registerErrors,
    parameters: parameterErrors,
    general: generalErrors,
    isValid:
      Object.keys(basicInfoErrors).length === 0 &&
      Object.keys(connectionErrors).length === 0 &&
      Object.keys(registerErrors).length === 0 &&
      Object.keys(parameterErrors).length === 0 &&
      generalErrors.length === 0,
  };
};

// Helper function to validate baud rate
function isValidBaudRate(baudRate: number): boolean {
  const validBaudRates = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
  return validBaudRates.includes(baudRate);
}

// Function to convert validation errors to the format expected by the form state
export const convertValidationErrorsToState = (
  errors: ValidationErrors
): DeviceFormState['validationState'] => {
  const validationState: DeviceFormState['validationState'] = {
    isValid: errors.isValid,
    basicInfo: [],
    connection: [],
    registers: [],
    parameters: [],
    general: [],
  };

  // Convert basic info errors
  Object.entries(errors.basicInfo).forEach(([field, message]) => {
    validationState.basicInfo.push({ field, message });
  });

  // Convert connection errors
  Object.entries(errors.connection).forEach(([field, message]) => {
    validationState.connection.push({ field, message });
  });

  // Convert register errors
  Object.entries(errors.registers).forEach(([field, message]) => {
    validationState.registers.push({ field, message });
  });

  // Convert parameter errors
  Object.entries(errors.parameters).forEach(([field, message]) => {
    validationState.parameters.push({ field, message });
  });

  // Add general errors
  errors.general.forEach(message => {
    validationState.general.push({ field: 'general', message });
  });

  return validationState;
};
