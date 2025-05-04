import {
  validateDeviceBasics,
  validateConnectionSettings,
  validateRegisterRanges,
  validateParameters,
  validateTemplateForm as validateDeviceForm,
  convertValidationErrorsToState,
} from '../components/templates/validation';

describe('Device Form Validation Functions', () => {
  // Device Basics Validation Tests
  describe('validateDeviceBasics', () => {
    test('validates required device basic info fields', () => {
      // Empty form
      expect(
        validateDeviceBasics({
          name: '',
          make: '',
          model: '',
          deviceType: '',
          description: '',
        })
      ).toEqual({
        name: 'Template name is required',
        make: 'Manufacturer/Make is required',
        model: 'Model is required',
        deviceType: 'Device type is required',
      });

      // Valid form
      expect(
        validateDeviceBasics({
          name: 'Test Device',
          make: 'Test Manufacturer',
          model: 'Test Model',
          deviceType: 'Power Meter',
          description: 'Description',
        })
      ).toEqual({});

      // Too short name
      expect(
        validateDeviceBasics({
          name: 'AB',
          make: 'Test Manufacturer',
          model: 'Test Model',
          deviceType: 'Power Meter',
          description: '',
        })
      ).toEqual({
        name: 'Template name must be at least 3 characters',
      });
    });
  });

  // Connection Settings Validation Tests
  describe('validateConnectionSettings', () => {
    test('validates TCP/IP connection settings', () => {
      // Empty TCP connection
      expect(
        validateConnectionSettings({
          type: 'tcp',
          tcp: {
            ip: '',
            port: '',
            slaveId: '',
          }
        })
      ).toMatchObject({
        ip: 'IP address is required',
        port: 'Port is required',
        slaveId: 'Slave ID is required',
      });

      // Invalid IP format
      expect(
        validateConnectionSettings({
          type: 'tcp',
          tcp: {
            ip: 'invalid-ip',
            port: '502',
            slaveId: '1',
          }
        })
      ).toMatchObject({
        ip: expect.stringContaining('valid IP address'),
      });

      // Invalid port
      expect(
        validateConnectionSettings({
          type: 'tcp',
          tcp: {
            ip: '192.168.1.100',
            port: '99999',
            slaveId: '1',
          }
        })
      ).toMatchObject({
        port: expect.stringContaining('between 1 and 65535'),
      });

      // Valid TCP connection
      expect(
        validateConnectionSettings({
          type: 'tcp',
          tcp: {
            ip: '192.168.1.100',
            port: '502',
            slaveId: '1',
          }
        })
      ).toEqual({});
    });

    test('validates RTU/Serial connection settings', () => {
      // Empty RTU connection
      expect(
        validateConnectionSettings({
          type: 'rtu',
          rtu: {
            serialPort: '',
            baudRate: '',
            dataBits: '',
            stopBits: '',
            parity: '',
            slaveId: '',
          }
        })
      ).toMatchObject({
        serialPort: 'Serial port is required',
        baudRate: 'Baud rate is required',
        dataBits: 'Data bits is required',
        stopBits: 'Stop bits is required',
        parity: 'Parity is required',
        slaveId: 'Slave ID is required',
      });

      // Invalid slave ID
      expect(
        validateConnectionSettings({
          type: 'rtu',
          rtu: {
            serialPort: 'COM1',
            baudRate: '9600',
            dataBits: '8',
            stopBits: '1',
            parity: 'none',
            slaveId: '300', // Should be between 1-255
          }
        })
      ).toMatchObject({
        slaveId: expect.stringContaining('between 1 and 255'),
      });

      // Valid RTU connection
      expect(
        validateConnectionSettings({
          type: 'rtu',
          rtu: {
            serialPort: 'COM1',
            baudRate: '9600',
            dataBits: '8',
            stopBits: '1',
            parity: 'none',
            slaveId: '1',
          }
        })
      ).toEqual({});
    });
  });

  // Register Ranges Validation Tests
  describe('validateRegisterRanges', () => {
    test('validates empty register ranges', () => {
      expect(validateRegisterRanges([])).toEqual({
        general: 'At least one register range is required',
      });
    });

    test('validates register range fields', () => {
      // Invalid ranges
      expect(
        validateRegisterRanges([
          {
            rangeName: '',
            startRegister: -1,
            length: 0,
            functionCode: null as any,
          },
        ])
      ).toMatchObject({
        range_0_name: 'Range name is required',
        range_0_startRegister: 'Start register must be a positive number',
        range_0_length: 'Length must be greater than 0',
        range_0_functionCode: 'Function code is required',
      });

      // Valid range
      expect(
        validateRegisterRanges([
          {
            rangeName: 'Test Range',
            startRegister: 0,
            length: 10,
            functionCode: 3,
          },
        ])
      ).toEqual({});
    });
  });

  // Parameters Validation Tests
  describe('validateParameters', () => {
    const testRegisterRanges = [
      {
        rangeName: 'Holding Registers',
        startRegister: 0,
        length: 10,
        functionCode: 3,
      },
    ];

    test('validates basic parameter fields', () => {
      // Empty parameter
      expect(
        validateParameters(
          [
            {
              name: '',
              dataType: '',
              registerRange: '',
              registerIndex: null as any,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: true,
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_name: 'Parameter name is required',
        param_0_dataType: 'Data type is required',
        param_0_registerRange: 'Register range is required',
        param_0_registerIndex: 'Register index is required',
      });

      // Valid parameter
      expect(
        validateParameters(
          [
            {
              name: 'Test Parameter',
              dataType: 'INT16',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: true,
            },
          ],
          testRegisterRanges
        )
      ).toEqual({});
    });

    test('validates byte order based on data type', () => {
      // 32-bit type with invalid byte order
      expect(
        validateParameters(
          [
            {
              name: 'Test Float',
              dataType: 'FLOAT32',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 2,
              byteOrder: 'AB', // Invalid for 32-bit types
              signed: true,
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_byteOrder: expect.stringContaining('ABCD, DCBA, BADC, or CDAB'),
      });

      // 16-bit type with invalid byte order
      expect(
        validateParameters(
          [
            {
              name: 'Test Int16',
              dataType: 'INT16',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'ABCD', // Invalid for 16-bit types
              signed: true,
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_byteOrder: expect.stringContaining('AB or BA'),
      });
    });

    test('validates bit position for boolean types', () => {
      // Boolean without bit position
      expect(
        validateParameters(
          [
            {
              name: 'Test Boolean',
              dataType: 'BOOLEAN',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: false,
              // Missing bitPosition
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_bitPosition: expect.stringContaining('required for boolean'),
      });

      // Boolean with invalid bit position
      expect(
        validateParameters(
          [
            {
              name: 'Test Boolean',
              dataType: 'BOOLEAN',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: false,
              bitPosition: 20, // Too large
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_bitPosition: expect.stringContaining('between 0 and 15'),
      });
    });

    test('detects register index out of bounds', () => {
      // Register index beyond range
      expect(
        validateParameters(
          [
            {
              name: 'Test Parameter',
              dataType: 'INT16',
              registerRange: 'Holding Registers',
              registerIndex: 15, // Range only has 10 registers
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: true,
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_registerIndex: expect.stringContaining('exceeds range bounds'),
      });
    });

    test('detects parameter register conflicts', () => {
      // Parameters with same register index
      expect(
        validateParameters(
          [
            {
              name: 'Parameter 1',
              dataType: 'INT16',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: true,
            },
            {
              name: 'Parameter 2',
              dataType: 'INT16',
              registerRange: 'Holding Registers',
              registerIndex: 0, // Same as Parameter 1
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: true,
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_duplicate_index: expect.stringContaining('same register index'),
      });

      // Boolean parameters sharing register but different bits should work
      expect(
        validateParameters(
          [
            {
              name: 'Boolean 1',
              dataType: 'BOOLEAN',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: false,
              bitPosition: 0,
            },
            {
              name: 'Boolean 2',
              dataType: 'BOOLEAN',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: false,
              bitPosition: 1, // Different bit
            },
          ],
          testRegisterRanges
        )
      ).toEqual({});

      // Boolean parameters with same register and same bit
      expect(
        validateParameters(
          [
            {
              name: 'Boolean 1',
              dataType: 'BOOLEAN',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: false,
              bitPosition: 0,
            },
            {
              name: 'Boolean 2',
              dataType: 'BOOLEAN',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: false,
              bitPosition: 0, // Same bit position
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_bit_overlap: expect.stringContaining('same register and bit position'),
      });

      // Multi-register parameter overlapping with another
      expect(
        validateParameters(
          [
            {
              name: 'Float 1',
              dataType: 'FLOAT32', // Uses 2 registers
              registerRange: 'Holding Registers',
              registerIndex: 0,
              scalingFactor: 1,
              decimalPoint: 2,
              byteOrder: 'ABCD',
              signed: true,
            },
            {
              name: 'Int 1',
              dataType: 'INT16',
              registerRange: 'Holding Registers',
              registerIndex: 1, // Overlaps with Float 1
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              signed: true,
            },
          ],
          testRegisterRanges
        )
      ).toMatchObject({
        param_0_overlap: expect.stringContaining('overlaps'),
      });
    });
  });

  // Complete Form Validation Test
  describe('validateDeviceForm', () => {
    test('validates complete form correctly', () => {
      // Empty form
      const emptyFormResult = validateDeviceForm({
        deviceBasics: {
          name: '',
          make: '',
          model: '',
          deviceType: '',
          description: '',
        },
        connectionSettings: {
          type: 'tcp',
          tcp: {
            ip: '',
            port: '',
            slaveId: '',
          }
        },
        registerRanges: [],
        parameters: [],
        validationState: {
          isValid: true,
          basicInfo: [],
          connection: [],
          registers: [],
          parameters: [],
          general: [],
        },
      });

      expect(emptyFormResult.isValid).toBe(false);
      expect(Object.keys(emptyFormResult.basicInfo).length).toBeGreaterThan(0);
      expect(Object.keys(emptyFormResult.connection).length).toBeGreaterThan(0);
      expect(emptyFormResult.general).toContain('At least one register range is required');

      // Valid form
      const validFormResult = validateDeviceForm({
        deviceBasics: {
          name: 'Test Device',
          make: 'Test Manufacturer',
          model: 'Test Model',
          deviceType: 'Power Meter',
          description: 'Description',
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
            rangeName: 'Holding Registers',
            startRegister: 0,
            length: 10,
            functionCode: 3,
          },
        ],
        parameters: [
          {
            name: 'Test Parameter',
            dataType: 'INT16',
            registerRange: 'Holding Registers',
            registerIndex: 0,
            scalingFactor: 1,
            decimalPoint: 0,
            byteOrder: 'AB',
            signed: true,
          },
        ],
        validationState: {
          isValid: true,
          basicInfo: [],
          connection: [],
          registers: [],
          parameters: [],
          general: [],
        },
      });

      expect(validFormResult.isValid).toBe(true);
    });
  });

  // Error Conversion Test
  describe('convertValidationErrorsToState', () => {
    test('converts validation errors to state format', () => {
      const validationErrors = {
        basicInfo: {
          name: 'Device name is required',
        },
        connection: {
          ip: 'IP address is required',
        },
        registers: {
          range_0_name: 'Range name is required',
        },
        parameters: {
          param_0_name: 'Parameter name is required',
        },
        general: ['General error message'],
        isValid: false,
      };

      const result = convertValidationErrorsToState(validationErrors);

      expect(result.isValid).toBe(false);
      expect(result.basicInfo).toContainEqual({
        field: 'name',
        message: 'Device name is required',
      });
      expect(result.connection).toContainEqual({ field: 'ip', message: 'IP address is required' });
      expect(result.registers).toContainEqual({
        field: 'range_0_name',
        message: 'Range name is required',
      });
      expect(result.parameters).toContainEqual({
        field: 'param_0_name',
        message: 'Parameter name is required',
      });
      expect(result.general).toContainEqual({ field: 'general', message: 'General error message' });
    });
  });
});