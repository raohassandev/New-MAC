import { Request, Response } from 'express';
import ModbusRTU from 'modbus-serial';

// Mock ModbusRTU
jest.mock('modbus-serial');

// Create proper mock functions for the controller tests
// which need mockResolvedValueOnce and mockRejectedValueOnce methods
const deviceModelMock = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteMany: jest.fn(),
};

// Add mockResolvedValueOnce and mockRejectedValueOnce methods
deviceModelMock.find.mockResolvedValueOnce = jest.fn().mockReturnValue(deviceModelMock.find);
deviceModelMock.find.mockRejectedValueOnce = jest.fn().mockReturnValue(deviceModelMock.find);

deviceModelMock.findById.mockResolvedValueOnce = jest
  .fn()
  .mockReturnValue(deviceModelMock.findById);
deviceModelMock.findById.mockRejectedValueOnce = jest
  .fn()
  .mockReturnValue(deviceModelMock.findById);

deviceModelMock.create.mockResolvedValueOnce = jest.fn().mockReturnValue(deviceModelMock.create);
deviceModelMock.create.mockRejectedValueOnce = jest.fn().mockReturnValue(deviceModelMock.create);

deviceModelMock.findByIdAndUpdate.mockResolvedValueOnce = jest
  .fn()
  .mockReturnValue(deviceModelMock.findByIdAndUpdate);
deviceModelMock.findByIdAndUpdate.mockRejectedValueOnce = jest
  .fn()
  .mockReturnValue(deviceModelMock.findByIdAndUpdate);

// Apply the mock before importing controller
jest.mock('../../models/Device', () => deviceModelMock);

// Import after mocking
import {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  testDeviceConnection,
  readDeviceRegisters,
} from '../../controllers/deviceController';
import Device from '../../client/models/Device';

describe('Device Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockDevices: any[];
  let mockDevice: any;

  beforeEach(() => {
    // Set up request and response mocks
    req = {
      body: {},
      params: {},
      user: { id: 'test-user-id' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Create a mock device
    mockDevice = {
      _id: 'device-1',
      name: 'Test Device',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.100',
          port: 502,
          slaveId: 1,
        },
      },
      enabled: true,
      registers: [{ name: 'Temperature', address: 100, length: 2, unit: '°C' }],
      dataPoints: [
        {
          range: {
            startAddress: 100,
            count: 2,
            fc: 3,
          },
          parser: {
            parameters: [
              {
                name: 'Temperature',
                dataType: 'FLOAT',
                scalingFactor: 10,
                decimalPoint: 1,
                byteOrder: 'ABCD',
                registerIndex: 100,
                unit: '°C',
              },
            ],
          },
        },
      ],
      lastSeen: new Date(),
      save: jest.fn().mockResolvedValue(true),
      deleteOne: jest.fn().mockResolvedValue(true),
    };

    // Reset our mock implementations to return the proper values
    deviceModelMock.find.mockResolvedValue([]);
    deviceModelMock.findById.mockResolvedValue(null);
    deviceModelMock.create.mockResolvedValue(null);
    deviceModelMock.findByIdAndUpdate.mockResolvedValue(null);

    mockDevices = [
      mockDevice,
      {
        _id: 'device-2',
        name: 'Test Device 2',
        connectionSetting: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.101',
            port: 502,
            slaveId: 2,
          },
        },
        enabled: false,
        registers: [],
        dataPoints: [],
      },
    ];

    jest.clearAllMocks();
  });

  describe('getDevices function', () => {
    test('should return all devices', async () => {
      // Setup the mock to return our devices
      deviceModelMock.find.mockResolvedValue(mockDevices);

      await getDevices(req as Request, res as Response);

      expect(Device.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDevices);
    });

    test('should handle errors', async () => {
      const error = new Error('Database error');
      // Setup the mock to reject with our error
      deviceModelMock.find.mockRejectedValue(error);

      await getDevices(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: 'Database error',
      });
    });
  });

  describe('getDeviceById function', () => {
    test('should return a single device by ID', async () => {
      req.params = { id: 'device-1' };
      deviceModelMock.findById.mockResolvedValue(mockDevice);

      await getDeviceById(req as Request, res as Response);

      expect(Device.findById).toHaveBeenCalledWith('device-1');
      expect(res.json).toHaveBeenCalledWith(mockDevice);
    });

    test('should return 404 if device not found', async () => {
      req.params = { id: 'nonexistent-device' };
      deviceModelMock.findById.mockResolvedValue(null);

      await getDeviceById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device not found' });
    });
  });

  describe('createDevice function', () => {
    test('should create a new device', async () => {
      req.body = {
        name: 'New Device',
        connectionSetting: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.102',
            port: 502,
            slaveId: 3,
          },
        },
      };

      const newDevice = { ...req.body, _id: 'new-device-id' };
      deviceModelMock.create.mockResolvedValue(newDevice);

      await createDevice(req as Request, res as Response);

      expect(Device.create).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newDevice);
    });

    test('should handle validation errors', async () => {
      req.body = {
        // Missing required fields
        connectionSetting: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.102',
            port: 502,
            // missing slaveId
          },
        },
      };

      const error: any = new Error('Validation failed');
      error.name = 'ValidationError';
      deviceModelMock.create.mockRejectedValue(error);

      await createDevice(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: 'Validation failed',
      });
    });
  });

  describe('updateDevice function', () => {
    test('should update an existing device', async () => {
      req.params = { id: 'device-1' };
      req.body = {
        name: 'Updated Device',
        enabled: false,
      };

      const updatedDevice = { ...mockDevice, ...req.body };
      deviceModelMock.findById.mockResolvedValue(mockDevice);
      deviceModelMock.findByIdAndUpdate.mockResolvedValue(updatedDevice);

      await updateDevice(req as Request, res as Response);

      expect(Device.findById).toHaveBeenCalledWith('device-1');
      expect(Device.findByIdAndUpdate).toHaveBeenCalledWith('device-1', req.body, {
        new: true,
        runValidators: true,
      });
      expect(res.json).toHaveBeenCalledWith(updatedDevice);
    });

    test('should return 404 if device not found', async () => {
      req.params = { id: 'nonexistent-device' };
      req.body = { name: 'Updated Device' };

      deviceModelMock.findById.mockResolvedValue(null);

      await updateDevice(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device not found' });
      expect(Device.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('deleteDevice function', () => {
    test('should delete an existing device', async () => {
      req.params = { id: 'device-1' };

      deviceModelMock.findById.mockResolvedValue(mockDevice);

      await deleteDevice(req as Request, res as Response);

      expect(Device.findById).toHaveBeenCalledWith('device-1');
      expect(mockDevice.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Device removed',
        id: 'device-1',
      });
    });

    test('should return 404 if device not found', async () => {
      req.params = { id: 'nonexistent-device' };

      deviceModelMock.findById.mockResolvedValue(null);

      await deleteDevice(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device not found' });
    });
  });

  describe('testDeviceConnection function', () => {
    test('should test TCP connection to device successfully', async () => {
      req.params = { id: 'device-1' };

      // Setup mocks
      deviceModelMock.findById.mockResolvedValue(mockDevice);

      const connectMock = jest.fn().mockResolvedValue(undefined);
      const setIDMock = jest.fn();
      const readMock = jest.fn().mockResolvedValue({ data: [123] });
      const closeMock = jest.fn();

      // @ts-ignore - We're mocking the constructor
      ModbusRTU.mockImplementation(() => ({
        connectTCP: connectMock,
        setID: setIDMock,
        readHoldingRegisters: readMock,
        close: closeMock,
      }));

      await testDeviceConnection(req as Request, res as Response);

      expect(Device.findById).toHaveBeenCalledWith('device-1');
      expect(connectMock).toHaveBeenCalledWith('192.168.1.100', { port: 502 });
      expect(setIDMock).toHaveBeenCalledWith(1);
      expect(readMock).toHaveBeenCalledWith(100, 1); // DataPoint from range.startAddress
      expect(mockDevice.save).toHaveBeenCalled(); // lastSeen should be updated
      expect(closeMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully connected to device',
      });
    });

    test('should test RTU connection to device successfully', async () => {
      req.params = { id: 'device-1' };

      // Create a mock RTU device with the new structure
      const mockRtuDevice = {
        _id: 'device-rtu',
        name: 'RTU Test Device',
        connectionSetting: {
          connectionType: 'rtu',
          rtu: {
            serialPort: 'COM1',
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            slaveId: 3,
          },
        },
        enabled: true,
        dataPoints: [
          {
            range: {
              startAddress: 100,
              count: 2,
              fc: 3,
            },
            parser: {
              parameters: [
                {
                  name: 'Pressure',
                  dataType: 'FLOAT',
                  scalingFactor: 10,
                  decimalPoint: 1,
                  byteOrder: 'ABCD',
                  registerIndex: 100,
                  unit: 'bar',
                },
              ],
            },
          },
        ],
        lastSeen: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      // Setup mocks
      deviceModelMock.findById.mockResolvedValue(mockRtuDevice);

      const connectMock = jest.fn().mockResolvedValue(undefined);
      const setIDMock = jest.fn();
      const readMock = jest.fn().mockResolvedValue({ data: [123] });
      const closeMock = jest.fn();

      // @ts-ignore - We're mocking the constructor
      ModbusRTU.mockImplementation(() => ({
        connectRTUBuffered: connectMock,
        setID: setIDMock,
        readHoldingRegisters: readMock,
        close: closeMock,
      }));

      await testDeviceConnection(req as Request, res as Response);

      expect(Device.findById).toHaveBeenCalledWith('device-1');
      expect(connectMock).toHaveBeenCalledWith('COM1', {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });
      expect(setIDMock).toHaveBeenCalledWith(3);
      expect(readMock).toHaveBeenCalledWith(100, 1); // DataPoint from range.startAddress
      expect(mockRtuDevice.save).toHaveBeenCalled(); // lastSeen should be updated
      expect(closeMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully connected to device',
      });
    });

    test('should return 400 if device is disabled', async () => {
      req.params = { id: 'device-1' };

      const disabledDevice = { ...mockDevice, enabled: false };
      deviceModelMock.findById.mockResolvedValue(disabledDevice);

      await testDeviceConnection(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Device is disabled',
      });
      expect(ModbusRTU).not.toHaveBeenCalled();
    });

    test('should handle Modbus connection errors', async () => {
      req.params = { id: 'device-1' };

      // Setup mocks
      deviceModelMock.findById.mockResolvedValue(mockDevice);

      const connectMock = jest.fn().mockRejectedValue(new Error('Connection refused'));
      const closeMock = jest.fn();

      // @ts-ignore - We're mocking the constructor
      ModbusRTU.mockImplementation(() => ({
        connectTCP: connectMock,
        close: closeMock,
      }));

      await testDeviceConnection(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Connection failed: Connection refused',
      });
      expect(closeMock).toHaveBeenCalled();
    });
  });

  describe('readDeviceRegisters function', () => {
    test('should read registers from device successfully', async () => {
      req.params = { id: 'device-1' };

      // Setup mocks
      deviceModelMock.findById.mockResolvedValue(mockDevice);

      const connectMock = jest.fn().mockResolvedValue(undefined);
      const setIDMock = jest.fn();
      const readMock = jest.fn().mockResolvedValue({ data: [250] }); // Simulated value of 25.0°C
      const closeMock = jest.fn();

      // @ts-ignore - We're mocking the constructor
      ModbusRTU.mockImplementation(() => ({
        connectTCP: connectMock,
        setID: setIDMock,
        readHoldingRegisters: readMock,
        close: closeMock,
      }));

      await readDeviceRegisters(req as Request, res as Response);

      expect(Device.findById).toHaveBeenCalledWith('device-1');
      expect(connectMock).toHaveBeenCalledWith('192.168.1.100', { port: 502 });
      expect(setIDMock).toHaveBeenCalledWith(1);
      expect(readMock).toHaveBeenCalledWith(100, 2);
      expect(mockDevice.save).toHaveBeenCalled(); // lastSeen should be updated
      expect(closeMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        deviceId: 'device-1',
        deviceName: 'Test Device',
        timestamp: expect.any(Date),
        readings: [
          {
            name: 'Temperature',
            address: 100,
            value: 25, // Scaled value (250/10)
            unit: '°C',
          },
        ],
      });
    });

    test('should return 400 if device is disabled', async () => {
      req.params = { id: 'device-1' };

      const disabledDevice = { ...mockDevice, enabled: false };
      deviceModelMock.findById.mockResolvedValue(disabledDevice);

      await readDeviceRegisters(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device is disabled' });
      expect(ModbusRTU).not.toHaveBeenCalled();
    });

    test('should return 400 if device has no registers configured', async () => {
      req.params = { id: 'device-1' };

      const deviceWithoutRegisters = { ...mockDevice, registers: [] };
      deviceModelMock.findById.mockResolvedValue(deviceWithoutRegisters);

      await readDeviceRegisters(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No registers configured for this device',
      });
      expect(ModbusRTU).not.toHaveBeenCalled();
    });

    test('should handle Modbus reading errors for specific registers', async () => {
      req.params = { id: 'device-1' };

      // Create a device with two registers
      const deviceWithTwoRegisters = {
        ...mockDevice,
        registers: [
          { name: 'Temperature', address: 100, length: 2, unit: '°C' },
          { name: 'Humidity', address: 200, length: 2, unit: '%' },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      deviceModelMock.findById.mockResolvedValue(deviceWithTwoRegisters);

      const connectMock = jest.fn().mockResolvedValue(undefined);
      const setIDMock = jest.fn();
      const readMock = jest
        .fn()
        // First register read succeeds
        .mockResolvedValueOnce({ data: [250] })
        // Second register read fails
        .mockRejectedValueOnce(new Error('Invalid address'));
      const closeMock = jest.fn();

      // @ts-ignore - We're mocking the constructor
      ModbusRTU.mockImplementation(() => ({
        connectTCP: connectMock,
        setID: setIDMock,
        readHoldingRegisters: readMock,
        close: closeMock,
      }));

      await readDeviceRegisters(req as Request, res as Response);

      expect(readMock).toHaveBeenCalledTimes(2);
      expect(closeMock).toHaveBeenCalled();
      expect(deviceWithTwoRegisters.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        deviceId: 'device-1',
        deviceName: 'Test Device',
        timestamp: expect.any(Date),
        readings: [
          {
            name: 'Temperature',
            address: 100,
            value: 25,
            unit: '°C',
          },
          {
            name: 'Humidity',
            address: 200,
            value: null,
            unit: '%',
            error: 'Invalid address',
          },
        ],
      });
    });
  });
});
