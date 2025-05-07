import { renderHook, act } from '@testing-library/react';
import { useDevices } from '../../hooks/useDevices';
import * as deviceService from '../../services/devices';
import * as apiService from '../../services/api';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock the device service
vi.mock('../../services/devices', () => ({
  getDevices: vi.fn(),
  getDevice: vi.fn(),
  addDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn(),
  testConnection: vi.fn(),
}));

// Mock the API service to handle readDeviceRegisters
vi.mock('../../services/api', () => ({
  readDeviceRegisters: vi.fn(),
}));

describe('useDevices Hook', () => {
  const mockDevices = [
    {
      _id: 'device1',
      name: 'Device 1',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.1',
          port: 502,
          slaveId: 1
        }
      },
      enabled: true,
      tags: ['test'],
      dataPoints: [],
      lastSeen: undefined,
      registers: [],
    },
    {
      _id: 'device2',
      name: 'Device 2',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.2',
          port: 502,
          slaveId: 2
        }
      },
      enabled: false,
      tags: ['prod'],
      dataPoints: [],
      lastSeen: undefined,
      registers: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock API responses
    vi.mocked(deviceService.getDevices).mockResolvedValue(mockDevices);
    vi.mocked(deviceService.getDevice).mockImplementation(id =>
      Promise.resolve(mockDevices.find(d => d._id === id))
    );
    vi.mocked(deviceService.addDevice).mockImplementation(device =>
      Promise.resolve({ ...device, _id: 'new-device-id' })
    );
    vi.mocked(deviceService.updateDevice).mockImplementation((id, device) =>
      Promise.resolve({ ...device, _id: id })
    );
    vi.mocked(deviceService.deleteDevice).mockResolvedValue(true);
    vi.mocked(deviceService.testConnection).mockResolvedValue({
      success: true,
      message: 'Connected',
    });

    // Mock the api service readDeviceRegisters function
    vi.mocked(apiService.readDeviceRegisters).mockResolvedValue({
      deviceId: 'device1',
      readings: [{ name: 'Temperature', value: 25 }],
    });
  });

  test('initializes with loading state and empty devices', async () => {
    const { result } = renderHook(() => useDevices());

    // Initial state should be loading=true and empty devices
    expect(result.current.loading).toBe(true);
    expect(result.current.devices).toEqual([]);
    expect(result.current.error).toBeNull();

    // Wait for the hook to finish initializing
    await act(async () => {
      // This allows the internal promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // After initialization, we expect loading=false and populated devices
    expect(result.current.loading).toBe(false);
    expect(result.current.devices).toEqual(mockDevices);
  });

  test('fetches devices on init', async () => {
    const { result } = renderHook(() => useDevices());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.devices).toEqual(mockDevices);
    expect(deviceService.getDevices).toHaveBeenCalledTimes(1);
  });

  test('handles fetch error correctly', async () => {
    const errorMessage = 'Network error';
    vi.mocked(deviceService.getDevices).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useDevices());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);
  });

  test('refreshes devices', async () => {
    const { result } = renderHook(() => useDevices());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Clear the mock to test refreshDevices specifically
    vi.mocked(deviceService.getDevices).mockClear();

    // Call refreshDevices through act()
    await act(async () => {
      await result.current.refreshDevices();
    });

    expect(deviceService.getDevices).toHaveBeenCalledTimes(1);
  });

  test('gets device by ID', async () => {
    const { result } = renderHook(() => useDevices());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Get a device by ID that should be in cache
    let device;
    await act(async () => {
      device = await result.current.getDevice('device1');
    });

    expect(device).toEqual(mockDevices[0]);

    // Should use cached device
    expect(deviceService.getDevice).not.toHaveBeenCalled();

    // For a non-cached device, should make an API call
    let nonCachedDevice;
    await act(async () => {
      nonCachedDevice = await result.current.getDevice('device3');
    });

    expect(deviceService.getDevice).toHaveBeenCalledWith('device3');
  });

  test('adds a new device', async () => {
    const { result } = renderHook(() => useDevices());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const newDevice = {
      name: 'New Device',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.3',
          port: 502,
          slaveId: 3
        }
      },
      enabled: true,
    };

    let createdDevice;
    await act(async () => {
      createdDevice = await result.current.addDevice(newDevice);
    });

    expect(deviceService.addDevice).toHaveBeenCalledWith({
      ...newDevice,
      tags: [],
      registers: [],
    });

    expect(createdDevice._id).toBe('new-device-id');
    expect(result.current.devices.length).toBe(3);
  });

  test('updates an existing device', async () => {
    const { result } = renderHook(() => useDevices());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const updatedDevice = {
      ...mockDevices[0],
      name: 'Updated Device 1',
    };

    await act(async () => {
      await result.current.updateDevice(updatedDevice);
    });

    expect(deviceService.updateDevice).toHaveBeenCalledWith(
      'device1',
      expect.objectContaining({ name: 'Updated Device 1' })
    );

    // Check if the device was updated in state
    expect(result.current.devices[0].name).toBe('Updated Device 1');
  });

  test('deletes a device', async () => {
    const { result } = renderHook(() => useDevices());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.deleteDevice('device1');
    });

    expect(deviceService.deleteDevice).toHaveBeenCalledWith('device1');

    // Check if the device was removed from state
    expect(result.current.devices.length).toBe(1);
    expect(result.current.devices[0]._id).toBe('device2');
  });

  test('tests device connection and updates lastSeen if successful', async () => {
    const { result } = renderHook(() => useDevices());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.testConnection('device1');
    });

    expect(deviceService.testConnection).toHaveBeenCalledWith('device1');

    // Check if lastSeen was updated for the device
    expect(result.current.devices[0].lastSeen).toBeDefined();
  });

  test('handles connection test failure', async () => {
    vi.mocked(deviceService.testConnection).mockResolvedValueOnce({
      success: false,
      message: 'Connection failed',
    });

    const { result } = renderHook(() => useDevices());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const originalLastSeen = result.current.devices[0].lastSeen;

    await act(async () => {
      await result.current.testConnection('device1');
    });

    // lastSeen should not be updated on failure
    expect(result.current.devices[0].lastSeen).toBe(originalLastSeen);
  });

  test('reads device registers', async () => {
    const { result } = renderHook(() => useDevices());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Create a mock implementation for readDeviceRegisters that will be used in this test
    const mockReadingResult = {
      deviceId: 'device1',
      readings: [{ name: 'Temperature', value: 25 }],
    };

    // Reset the mock to ensure it's clean for this test
    vi.mocked(apiService.readDeviceRegisters).mockReset();
    vi.mocked(apiService.readDeviceRegisters).mockResolvedValueOnce(mockReadingResult);

    let readings;
    await act(async () => {
      readings = await result.current.readRegisters('device1');
    });

    expect(apiService.readDeviceRegisters).toHaveBeenCalledWith('device1');
    expect(readings).toEqual(mockReadingResult);

    // Should update lastSeen
    expect(result.current.devices[0].lastSeen).toBeDefined();
  });
});