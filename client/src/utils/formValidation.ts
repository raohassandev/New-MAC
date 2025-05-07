// client/src/utils/formValidation.ts
import { ParameterConfig, RegisterRange } from '../types/device.types';

// Define field-specific validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

// Define section-specific validation errors
export interface DeviceFormValidation {
  basicInfo: ValidationError[];
  connection: ValidationError[];
  registers: ValidationError[];
  parameters: ValidationError[];
  general: ValidationError[];
  isValid: boolean;
}

// Create a new validation result
export const createValidationResult = (): DeviceFormValidation => ({
  basicInfo: [],
  connection: [],
  registers: [],
  parameters: [],
  general: [],
  isValid: true,
});

// Helper to add validation errors
export const addError = (
  validation: DeviceFormValidation,
  section: keyof Omit<DeviceFormValidation, 'isValid'>,
  field: string,
  message: string
): DeviceFormValidation => {
  validation[section].push({ field, message });
  validation.isValid = false;
  return validation;
};

// Basic Device Information Validation
export const validateBasicInfo = (
  deviceData: any,
  validation: DeviceFormValidation
): DeviceFormValidation => {
  // Device name validation
  if (!deviceData.name) {
    addError(validation, 'basicInfo', 'name', 'Device name is required');
  } else if (deviceData.name.length < 2 || deviceData.name.length > 50) {
    addError(validation, 'basicInfo', 'name', 'Device name must be between 2 and 50 characters');
  } else if (!/^[a-zA-Z0-9_\-\s]+$/.test(deviceData.name)) {
    addError(
      validation,
      'basicInfo',
      'name',
      'Device name can only contain letters, numbers, spaces, hyphens, and underscores'
    );
  }

  // Make/manufacturer validation (optional but with constraints if provided)
  if (deviceData.make && (deviceData.make.length < 2 || deviceData.make.length > 50)) {
    addError(
      validation,
      'basicInfo',
      'make',
      'Manufacturer name must be between 2 and 50 characters'
    );
  }

  // Model validation (optional but with constraints if provided)
  if (deviceData.model && (deviceData.model.length < 1 || deviceData.model.length > 50)) {
    addError(validation, 'basicInfo', 'model', 'Model name must be between 1 and 50 characters');
  }

  // Description validation (optional but with character limit)
  if (deviceData.description && deviceData.description.length > 500) {
    addError(validation, 'basicInfo', 'description', 'Description cannot exceed 500 characters');
  }

  return validation;
};

// Connection Information Validation
export const validateConnection = (
  deviceData: any,
  connectionType: 'tcp' | 'rtu',
  validation: DeviceFormValidation
): DeviceFormValidation => {
  if (connectionType === 'tcp') {
    // TCP Connection validation
    if (!deviceData.ip) {
      addError(validation, 'connection', 'ip', 'IP address is required');
    } else {
      // IPv4 regex pattern
      const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      // IPv6 regex pattern (simplified)
      const ipv6Pattern =
        /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
      // Host name pattern
      const hostnamePattern =
        /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

      const isValidIpv4 = ipv4Pattern.test(deviceData.ip);
      if (isValidIpv4) {
        // Additional validation for IPv4 values
        const parts = deviceData.ip.split('.');
        const invalidPart: boolean = parts.some((part: string): boolean => {
          const num: number = parseInt(part, 10);
          return num < 0 || num > 255;
        });

        if (invalidPart) {
          addError(
            validation,
            'connection',
            'ip',
            'Invalid IPv4 address format. Each octet must be between 0 and 255'
          );
        }
      } else if (!ipv6Pattern.test(deviceData.ip) && !hostnamePattern.test(deviceData.ip)) {
        addError(validation, 'connection', 'ip', 'Invalid IP address or hostname format');
      }
    }

    // Port validation
    const port = parseInt(deviceData.port, 10);
    if (!deviceData.port) {
      addError(validation, 'connection', 'port', 'Port is required');
    } else if (isNaN(port) || port < 1 || port > 65535) {
      addError(validation, 'connection', 'port', 'Port must be a number between 1 and 65535');
    }
  } else {
    // RTU Connection validation
    if (!deviceData.serialPort) {
      addError(validation, 'connection', 'serialPort', 'Serial port is required');
    } else {
      // Windows COM port pattern
      const windowsComPattern = /^COM\d+$/i;
      // Unix/Linux device pattern
      const unixDevicePattern = /^\/dev\/[a-zA-Z0-9_\-+]+$/;

      if (
        !windowsComPattern.test(deviceData.serialPort) &&
        !unixDevicePattern.test(deviceData.serialPort)
      ) {
        addError(
          validation,
          'connection',
          'serialPort',
          'Invalid serial port format. Examples: COM1, /dev/ttyS0'
        );
      }
    }

    // Baudrate validation
    const validBaudRates = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
    const baudRate = parseInt(deviceData.baudRate, 10);

    if (isNaN(baudRate) || !validBaudRates.includes(baudRate)) {
      addError(
        validation,
        'connection',
        'baudRate',
        'Baudrate must be one of the standard values: ' + validBaudRates.join(', ')
      );
    }

    // Parity, dataBits, and stopBits cross-validation
    const dataBits = parseInt(deviceData.dataBits, 10);
    const stopBits = parseFloat(deviceData.stopBits);
    const parity = deviceData.parity;

    // Validate specific combinations
    if (dataBits === 7 && parity === 'none') {
      addError(
        validation,
        'connection',
        'dataBits',
        '7 data bits requires parity to be set (even or odd)'
      );
    }

    if (dataBits === 5 && stopBits === 2) {
      addError(validation, 'connection', 'stopBits', '5 data bits cannot be used with 2 stop bits');
    }
  }

  // Slave ID validation (common for both connection types)
  const slaveId = parseInt(deviceData.slaveId, 10);
  if (deviceData.slaveId === undefined || deviceData.slaveId === '') {
    addError(validation, 'connection', 'slaveId', 'Slave ID is required');
  } else if (isNaN(slaveId) || slaveId < 0 || slaveId > 247) {
    addError(validation, 'connection', 'slaveId', 'Slave ID must be a number between 0 and 247');
  }

  return validation;
};

// Register Range Validation
export const validateRegisterRange = (
  newRegisterRange: RegisterRange,
  existingRanges: RegisterRange[],
  validation: DeviceFormValidation,
  isEditMode: boolean = false,
  editingIndex: number | null = null
): DeviceFormValidation => {
  // Range name validation
  if (!newRegisterRange.rangeName) {
    addError(validation, 'registers', 'rangeName', 'Range name is required');
  } else if (newRegisterRange.rangeName.length < 2 || newRegisterRange.rangeName.length > 50) {
    addError(
      validation,
      'registers',
      'rangeName',
      'Range name must be between 2 and 50 characters'
    );
  }

  // Check for duplicate range names
  const duplicateNameFound = existingRanges.some(
    (range, index) =>
      range.rangeName === newRegisterRange.rangeName && (!isEditMode || index !== editingIndex)
  );

  if (duplicateNameFound) {
    addError(
      validation,
      'registers',
      'rangeName',
      'A register range with this name already exists'
    );
  }

  // Start register validation
  if (newRegisterRange.startRegister < 0) {
    addError(
      validation,
      'registers',
      'startRegister',
      'Starting register must be a non-negative value'
    );
  }

  // Length validation
  if (!newRegisterRange.length) {
    addError(validation, 'registers', 'length', 'Register length is required');
  } else if (newRegisterRange.length < 1) {
    addError(validation, 'registers', 'length', 'Register length must be at least 1');
  } else if (newRegisterRange.length > 125) {
    addError(
      validation,
      'registers',
      'length',
      'Register length cannot exceed 125 (Modbus protocol limit)'
    );
  }

  // Check for register range overlaps
  const rangeStart = newRegisterRange.startRegister;
  const rangeEnd = newRegisterRange.startRegister + newRegisterRange.length - 1;

  const overlappingRange = existingRanges.find((range, index) => {
    if (isEditMode && index === editingIndex) return false;

    const existingStart = range.startRegister;
    const existingEnd = range.startRegister + range.length - 1;

    return (
      (rangeStart >= existingStart && rangeStart <= existingEnd) ||
      (rangeEnd >= existingStart && rangeEnd <= existingEnd) ||
      (rangeStart <= existingStart && rangeEnd >= existingEnd)
    );
  });

  if (overlappingRange) {
    addError(
      validation,
      'registers',
      'startRegister',
      `Register range overlaps with existing range "${overlappingRange.rangeName}"`
    );
  }

  // Function code validation
  const validFunctionCodes = [1, 2, 3, 4, 5, 6, 15, 16, 22, 23];
  if (!validFunctionCodes.includes(newRegisterRange.functionCode)) {
    addError(validation, 'registers', 'functionCode', 'Invalid function code');
  }

  return validation;
};

// Parameter Configuration Validation
export const validateParameterConfig = (
  paramConfig: ParameterConfig,
  existingParams: ParameterConfig[],
  registerRanges: RegisterRange[],
  validation: DeviceFormValidation
): DeviceFormValidation => {
  // Parameter name validation
  if (!paramConfig.name) {
    addError(validation, 'parameters', 'name', 'Parameter name is required');
  } else if (paramConfig.name.length < 2 || paramConfig.name.length > 50) {
    addError(
      validation,
      'parameters',
      'name',
      'Parameter name must be between 2 and 50 characters'
    );
  }

  // Check for duplicate parameter names within the same register range
  const duplicateNameFound = existingParams.some(
    param => param.name === paramConfig.name && param.registerRange === paramConfig.registerRange
  );

  if (duplicateNameFound) {
    addError(
      validation,
      'parameters',
      'name',
      'A parameter with this name already exists in this register range'
    );
  }

  // Register range validation
  if (!paramConfig.registerRange) {
    addError(validation, 'parameters', 'registerRange', 'Register range is required');
  } else {
    // Find the corresponding register range
    const selectedRange = registerRanges.find(
      range => range.rangeName === paramConfig.registerRange
    );

    if (!selectedRange) {
      addError(validation, 'parameters', 'registerRange', 'Selected register range does not exist');
    } else {
      // Validate register index based on data type
      let requiredRegisters = 1;

      switch (paramConfig.dataType) {
        case 'INT-32':
        case 'UINT-32':
        case 'FLOAT':
          requiredRegisters = 2;
          break;
        case 'DOUBLE':
          requiredRegisters = 4;
          break;
      }

      if (paramConfig.registerIndex < 0) {
        addError(validation, 'parameters', 'registerIndex', 'Register index cannot be negative');
      } else if (paramConfig.registerIndex + requiredRegisters > selectedRange.length) {
        addError(
          validation,
          'parameters',
          'registerIndex',
          `This data type requires ${requiredRegisters} consecutive registers, ` +
            `but exceeds the range length`
        );
      }

      // Check for overlapping parameter definitions
      const paramEnd = paramConfig.registerIndex + requiredRegisters - 1;

      const overlappingParam = existingParams.find(param => {
        if (param.registerRange !== paramConfig.registerRange) return false;

        let paramRegs = 1;
        switch (param.dataType) {
          case 'INT-32':
          case 'UINT-32':
          case 'FLOAT':
            paramRegs = 2;
            break;
          case 'DOUBLE':
            paramRegs = 4;
            break;
        }

        const existingStart = param.registerIndex;
        const existingEnd = param.registerIndex + paramRegs - 1;

        return (
          (paramConfig.registerIndex >= existingStart &&
            paramConfig.registerIndex <= existingEnd) ||
          (paramEnd >= existingStart && paramEnd <= existingEnd)
        );
      });

      if (overlappingParam) {
        addError(
          validation,
          'parameters',
          'registerIndex',
          `Parameter overlaps with existing parameter "${overlappingParam.name}"`
        );
      }
    }
  }

  // Data type validation
  const validDataTypes = ['INT-16', 'UINT-16', 'INT-32', 'UINT-32', 'FLOAT', 'DOUBLE'];
  if (!validDataTypes.includes(paramConfig.dataType)) {
    addError(validation, 'parameters', 'dataType', 'Invalid data type');
  }

  // Byte order validation based on data type
  if (['INT-32', 'UINT-32', 'FLOAT', 'DOUBLE'].includes(paramConfig.dataType)) {
    const validMultiRegisterByteOrders = ['ABCD', 'DCBA', 'BADC', 'CDAB'];
    if (!validMultiRegisterByteOrders.includes(paramConfig.byteOrder)) {
      addError(
        validation,
        'parameters',
        'byteOrder',
        'This data type requires a multi-register byte order (ABCD, DCBA, BADC, CDAB)'
      );
    }
  } else {
    const validSingleRegisterByteOrders = ['AB', 'BA'];
    if (!validSingleRegisterByteOrders.includes(paramConfig.byteOrder)) {
      addError(
        validation,
        'parameters',
        'byteOrder',
        'This data type requires a single-register byte order (AB, BA)'
      );
    }
  }

  // Scaling factor validation
  if (paramConfig.scalingFactor === 0) {
    addError(validation, 'parameters', 'scalingFactor', 'Scaling factor cannot be zero');
  }

  // Decimal point validation
  if (
    paramConfig.decimalPoint !== undefined &&
    (paramConfig.decimalPoint < 0 || paramConfig.decimalPoint > 10)
  ) {
    addError(validation, 'parameters', 'decimalPoint', 'Decimal points must be between 0 and 10');
  }

  return validation;
};

// Comprehensive device form validation
export const validateDeviceForm = (
  deviceData: any,
  connectionType: 'tcp' | 'rtu',
  registerRanges: RegisterRange[],
  parameterConfigs: ParameterConfig[]
): DeviceFormValidation => {
  const validation = createValidationResult();

  // Validate basic device info
  validateBasicInfo(deviceData, validation);

  // Validate connection settings
  validateConnection(deviceData, connectionType, validation);

  // Validate that at least one register range is defined
  if (registerRanges.length === 0) {
    addError(
      validation,
      'general',
      'registerRanges',
      'At least one register range must be defined'
    );
  }

  // Analyze parameter coverage for each register range
  registerRanges.forEach(range => {
    const rangeParams = parameterConfigs.filter(param => param.registerRange === range.rangeName);

    if (rangeParams.length === 0) {
      addError(
        validation,
        'general',
        'parameters',
        `Register range "${range.rangeName}" has no parameter configurations`
      );
    }
  });

  return validation;
};

// Function to get field-specific error
export const getFieldError = (
  validation: DeviceFormValidation,
  field: string
): string | undefined => {
  // Check all sections for the specified field
  for (const section of Object.keys(validation) as Array<keyof DeviceFormValidation>) {
    if (section === 'isValid') continue;

    const error = validation[section].find(err => err.field === field);
    if (error) {
      return error.message;
    }
  }

  return undefined;
};

// Function to check if a field has an error
export const hasFieldError = (validation: DeviceFormValidation, field: string): boolean => {
  return getFieldError(validation, field) !== undefined;
};

// Get all validation errors as an array
export const getAllErrors = (validation: DeviceFormValidation): ValidationError[] => {
  return [
    ...validation.basicInfo,
    ...validation.connection,
    ...validation.registers,
    ...validation.parameters,
    ...validation.general,
  ];
};
