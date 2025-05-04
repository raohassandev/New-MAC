// client/src/components/devices/NewDeviceForm/__tests__/validation.test.ts
import { validateDeviceForm, validateParameters } from '../validation';
import { DeviceFormState } from '../DeviceformContext';

describe('Parameter validation tests', () => {
  // Mock the needed parts of DeviceFormState
  const createMockFormState = (): DeviceFormState => ({
    deviceBasics: {
      name: 'Test Device',
      make: 'Test Make',
      model: 'Test Model',
      deviceType: 'Power Meter',
      description: '',
      tags: [],
    },
    connectionSettings: {
      type: 'tcp',
      tcp: {
        ip: '192.168.1.100',
        port: '502',
        slaveId: '1',
      }
    },
    registerRanges: [
      {
        rangeName: 'Electrical',
        functionCode: 3,
        startRegister: 0,
        length: 100,
      },
      {
        rangeName: 'Temperature',
        functionCode: 3,
        startRegister: 100,
        length: 50,
      },
    ],
    parameters: [],
    validationState: {
      isValid: true,
      basicInfo: [],
      connection: [],
      registers: [],
      parameters: [],
      general: [],
    },
    uiState: {
      currentTab: 'basics',
      formSubmitted: false,
      loading: false,
    },
  });

  describe('Parameter overlap validation', () => {
    it('should allow parameters with the same index in different register ranges', () => {
      // Create parameters with the same register index but in different ranges
      const parameters = [
        {
          name: 'Voltage',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Electrical',
          registerIndex: 0,
          wordCount: 2,
        },
        {
          name: 'Temperature',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Temperature',
          registerIndex: 0, // Same index as Voltage but different range
          wordCount: 2,
        },
      ];

      // Call validateParameters which internally uses checkParameterOverlaps
      const formState = createMockFormState();
      formState.parameters = parameters;
      const errorsMap = validateParameters(parameters, formState.registerRanges);
      
      // There should be no errors
      expect(Object.keys(errorsMap).length).toBe(0);
    });

    it('should detect overlap within the same register range', () => {
      // Create parameters with the same register index in the same range
      const parameters = [
        {
          name: 'Voltage',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Electrical',
          registerIndex: 0,
          wordCount: 2,
        },
        {
          name: 'Current',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Electrical', // Same range as Voltage
          registerIndex: 0, // Same index as Voltage
          wordCount: 2,
        },
      ];

      // Call validateParameters which internally uses checkParameterOverlaps
      const formState = createMockFormState();
      formState.parameters = parameters;
      const errorsMap = validateParameters(parameters, formState.registerRanges);
      
      // There should be an error
      expect(Object.keys(errorsMap).length).toBeGreaterThan(0);
      // Check for error message about the same register range
      const errorValues = Object.values(errorsMap);
      expect(errorValues.some(error => 
        error.includes('uses the same register index') && 
        error.includes('in register range "Electrical"')
      )).toBeTruthy();
    });

    it('should detect duplicate parameter names even across different register ranges', () => {
      // Create parameters with the same name but different register ranges
      const parameters = [
        {
          name: 'Temperature',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Electrical',
          registerIndex: 0,
          wordCount: 2,
        },
        {
          name: 'Temperature', // Same name as the other parameter
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Temperature', // Different range
          registerIndex: 0,
          wordCount: 2,
        },
      ];

      // Call validateParameters which internally uses checkParameterOverlaps
      const formState = createMockFormState();
      formState.parameters = parameters;
      const errorsMap = validateParameters(parameters, formState.registerRanges);
      
      // There should be an error
      expect(Object.keys(errorsMap).length).toBeGreaterThan(0);
      // Check for error message about duplicate name
      const errorValues = Object.values(errorsMap);
      expect(errorValues.some(error => 
        error.includes('Parameter name "Temperature" is already used')
      )).toBeTruthy();
    });

    it('should detect overlapping registers within the same range', () => {
      // Create parameters with overlapping registers in the same range
      const parameters = [
        {
          name: 'Voltage',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Electrical',
          registerIndex: 0,
          wordCount: 2,
        },
        {
          name: 'Power',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Electrical', // Same range as Voltage
          registerIndex: 1, // Overlaps with Voltage (which uses registers 0-1)
          wordCount: 2,
        },
      ];

      // Call validateParameters which internally uses checkParameterOverlaps
      const formState = createMockFormState();
      formState.parameters = parameters;
      const errorsMap = validateParameters(parameters, formState.registerRanges);
      
      // There should be an error
      expect(Object.keys(errorsMap).length).toBeGreaterThan(0);
      // Check for error message about overlap
      const errorValues = Object.values(errorsMap);
      expect(errorValues.some(error => 
        error.includes('overlaps with') && 
        error.includes('in register range "Electrical"')
      )).toBeTruthy();
    });

    it('should allow bit parameters to share registers but not bit positions', () => {
      // Create bit parameters with the same register but different bit positions
      const parameters = [
        {
          name: 'Status1',
          dataType: 'BIT',
          scalingFactor: 1,
          decimalPoint: 0,
          byteOrder: 'AB',
          signed: false,
          registerRange: 'Electrical',
          registerIndex: 10,
          bitPosition: 0,
        },
        {
          name: 'Status2',
          dataType: 'BIT',
          scalingFactor: 1,
          decimalPoint: 0,
          byteOrder: 'AB',
          signed: false,
          registerRange: 'Electrical',
          registerIndex: 10, // Same register
          bitPosition: 1, // Different bit position
        },
        {
          name: 'Status3',
          dataType: 'BIT',
          scalingFactor: 1,
          decimalPoint: 0,
          byteOrder: 'AB',
          signed: false,
          registerRange: 'Temperature',
          registerIndex: 10, // Same register index but different range
          bitPosition: 0, // Same bit position as Status1 but different range
        },
      ];

      // Call validateParameters which internally uses checkParameterOverlaps
      const formState = createMockFormState();
      formState.parameters = parameters;
      const errorsMap = validateParameters(parameters, formState.registerRanges);
      
      // There should be no errors
      expect(Object.keys(errorsMap).length).toBe(0);
    });

    it('should detect bit parameters with the same register and bit position', () => {
      // Create bit parameters with the same register and bit position
      const parameters = [
        {
          name: 'Status1',
          dataType: 'BIT',
          scalingFactor: 1,
          decimalPoint: 0,
          byteOrder: 'AB',
          signed: false,
          registerRange: 'Electrical',
          registerIndex: 10,
          bitPosition: 0,
        },
        {
          name: 'Status2',
          dataType: 'BIT',
          scalingFactor: 1,
          decimalPoint: 0,
          byteOrder: 'AB',
          signed: false,
          registerRange: 'Electrical',
          registerIndex: 10, // Same register
          bitPosition: 0, // Same bit position
        },
      ];

      // Call validateParameters which internally uses checkParameterOverlaps
      const formState = createMockFormState();
      formState.parameters = parameters;
      const errorsMap = validateParameters(parameters, formState.registerRanges);
      
      // There should be an error
      expect(Object.keys(errorsMap).length).toBeGreaterThan(0);
      // Check for error message about the same bit position
      const errorValues = Object.values(errorsMap);
      expect(errorValues.some(error => 
        error.includes('uses the same register and bit position') && 
        error.includes('in the same register range')
      )).toBeTruthy();
    });
  });

  describe('Full form validation', () => {
    it('should validate a form with parameters in different register ranges', () => {
      const formState = createMockFormState();
      
      // Add parameters with the same register index but in different ranges
      formState.parameters = [
        {
          name: 'Voltage',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Electrical',
          registerIndex: 0,
          wordCount: 2,
        },
        {
          name: 'Temperature',
          dataType: 'FLOAT32',
          scalingFactor: 1,
          decimalPoint: 1,
          byteOrder: 'ABCD',
          signed: true,
          registerRange: 'Temperature',
          registerIndex: 0, // Same index as Voltage but different range
          wordCount: 2,
        },
      ];

      // Validate the form
      const validationResult = validateDeviceForm(formState);
      
      // The form should be valid
      expect(validationResult.isValid).toBe(true);
      expect(Object.keys(validationResult.parameters).length).toBe(0);
    });
  });
});