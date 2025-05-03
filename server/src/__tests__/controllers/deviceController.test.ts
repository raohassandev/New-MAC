import { Request, Response } from 'express';
import { getDevices, getDeviceById, createDevice, updateDevice, deleteDevice, testDeviceConnection, readDeviceRegisters } from '../../controllers/deviceController';
import Device from '../../models/Device';
import ModbusRTU from 'modbus-serial';

// Mock dependencies
jest.mock('../../models/Device');
jest.mock('modbus-serial');

describe('Device Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockDevices: any[];
  let mockDevice: any;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { id: 'test-user-id' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    mockDevice = {
      _id: 'device-1',
      name: 'Test Device',
      ip: '192.168.1.100',
      port: 502,
      slaveId: 1,
      enabled: true,
      registers: [
        { name: 'Temperature', address: 100, length: 2, unit: '°C' },
      ],
      lastSeen: new Date(),
      save: jest.fn().mockResolvedValue(true),
      deleteOne: jest.fn().mockResolvedValue(true),
    };
    
    mockDevices = [
      mockDevice,
      {
        _id: 'device-2',
        name: 'Test Device 2',
        ip: '192.168.1.101',
        port: 502,
        slaveId: 2,
        enabled: false,
        registers: [],
      },
    ];
    
    jest.clearAllMocks();
  });

  describe('getDevices function', () => {
    test('should return all devices', async () => {
      (Device.find as jest.Mock).mockResolvedValueOnce(mockDevices);
      
      await getDevices(req as Request, res as Response);
      
      expect(Device.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDevices);
    });

    test('should handle errors', async () => {
      const error = new Error('Database error');
      (Device.find as jest.Mock).mockRejectedValueOnce(error);
      
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
      (Device.findById as jest.Mock).mockResolvedValueOnce(mockDevice);
      
      await getDeviceById(req as Request, res as Response);
      
      expect(Device.findById).toHaveBeenCalledWith('device-1');
      expect(res.json).toHaveBeenCalledWith(mockDevice);
    });

    test('should return 404 if device not found', async () => {
      req.params = { id: 'nonexistent-device' };
      (Device.findById as jest.Mock).mockResolvedValueOnce(null);
      
      await getDeviceById(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device not found' });
    });
  });

  describe('createDevice function', () => {
    test('should create a new device', async () => {
      req.body = {
        name: 'New Device',
        ip: '192.168.1.102',
        port: 502,
        slaveId: 3,
      };
      
      const newDevice = { ...req.body, _id: 'new-device-id' };
      (Device.create as jest.Mock).mockResolvedValueOnce(newDevice);
      
      await createDevice(req as Request, res as Response);
      
      expect(Device.create).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newDevice);
    });

    test('should handle validation errors', async () => {
      req.body = {
        // Missing required fields
        ip: '192.168.1.102',
      };
      
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      (Device.create as jest.Mock).mockRejectedValueOnce(error);
      
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
      (Device.findById as jest.Mock).mockResolvedValueOnce(mockDevice);
      (Device.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(updatedDevice);
      
      await updateDevice(req as Request, res as Response);
      
      expect(Device.findById).toHaveBeenCalledWith('device-1');
      expect(Device.findByIdAndUpdate).toHaveBeenCalledWith(
        'device-1',
        req.body,
        { new: true, runValidators: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedDevice);
    });

    test('should return 404 if device not found', async () => {
      req.params = { id: 'nonexistent-device' };
      req.body = { name: 'Updated Device' };
      
      (Device.findById as jest.Mock).mockResolvedValueOnce(null);
      
      await updateDevice(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device not found' });
      expect(Device.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('deleteDevice function', () => {
    test('should delete an existing device', async () => {
      req.params = { id: 'device-1' };
      
      (Device.findById as jest.Mock).mockResolvedValueOnce(mockDevice);
      
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
      
      (Device.findById as jest.Mock).mockResolvedValueOnce(null);
      
      await deleteDevice(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device not found' });
    });
  });

  describe('testDeviceConnection function', () => {
    test('should test connection to device successfully', async () => {
      req.params = { id: 'device-1' };
      
      // Setup mocks
      (Device.findById as jest.Mock).mockResolvedValueOnce(mockDevice);
      
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
      expect(readMock).toHaveBeenCalledWith(100, 1); // First register address
      expect(mockDevice.save).toHaveBeenCalled(); // lastSeen should be updated
      expect(closeMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully connected to device',
      });
    });

    test('should return 400 if device is disabled', async () => {
      req.params = { id: 'device-1' };
      
      const disabledDevice = { ...mockDevice, enabled: false };
      (Device.findById as jest.Mock).mockResolvedValueOnce(disabledDevice);
      
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
      (Device.findById as jest.Mock).mockResolvedValueOnce(mockDevice);
      
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
      (Device.findById as jest.Mock).mockResolvedValueOnce(mockDevice);
      
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
      (Device.findById as jest.Mock).mockResolvedValueOnce(disabledDevice);
      
      await readDeviceRegisters(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device is disabled' });
      expect(ModbusRTU).not.toHaveBeenCalled();
    });

    test('should return 400 if device has no registers configured', async () => {
      req.params = { id: 'device-1' };
      
      const deviceWithoutRegisters = { ...mockDevice, registers: [] };
      (Device.findById as jest.Mock).mockResolvedValueOnce(deviceWithoutRegisters);
      
      await readDeviceRegisters(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No registers configured for this device'
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
      
      (Device.findById as jest.Mock).mockResolvedValueOnce(deviceWithTwoRegisters);
      
      const connectMock = jest.fn().mockResolvedValue(undefined);
      const setIDMock = jest.fn();
      const readMock = jest.fn()
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