import { renderHook, act, waitFor } from '@testing-library/react';
import { useDevices } from '../../hooks/useDevices';
import * as deviceService from '../../services/devices';
import * as apiService from '../../services/api';
import { vi } from 'vitest';

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
      ip: '192.168.1.1',
      port: 502,
      slaveId: 1,
      connectionType: 'tcp',
      enabled: true,
      tags: ['test'],
      registers: [],
    },
    {
      _id: 'device2',
      name: 'Device 2',
      ip: '192.168.1.2',
      port: 502,
      slaveId: 2,
      connectionType: 'tcp',
      enabled: false,
      tags: ['prod'],
      registers: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (deviceService.getDevices as any).mockResolvedValue(mockDevices);
    (deviceService.getDevice as any).mockImplementation(id =>
      Promise.resolve(mockDevices.find(d => d._id === id))
    );
    (deviceService.addDevice as any).mockImplementation(device =>
      Promise.resolve({ ...device, _id: 'new-device-id' })
    );
    (deviceService.updateDevice as any).mockImplementation((id, device) =>
      Promise.resolve({ ...device, _id: id })
    );
    (deviceService.deleteDevice as any).mockResolvedValue(true);
    (deviceService.testConnection as any).mockResolvedValue({
      success: true,
      message: 'Connected',
    });

    // Mock the api service readDeviceRegisters function
    (apiService.readDeviceRegisters as any).mockResolvedValue({
      deviceId: 'device1',
      readings: [{ name: 'Temperature', value: 25 }],
    });
  });

  test('initializes with loading state and empty devices', () => {
    const { result } = renderHook(() => useDevices());

    expect(result.current.loading).toBe(true);
    expect(result.current.devices).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  test('fetches devices on init', async () => {
    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.devices).toEqual(mockDevices);
    expect(deviceService.getDevices).toHaveBeenCalledTimes(1);
  });

  test('handles fetch error correctly', async () => {
    const errorMessage = 'Network error';
    (deviceService.getDevices as any).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);
  });

  test('refreshes devices', async () => {
    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    (deviceService.getDevices as any).mockClear();

    await act(async () => {
      await result.current.refreshDevices();
    });

    expect(deviceService.getDevices).toHaveBeenCalledTimes(1);
  });

  test('gets device by ID', async () => {
    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let device;
    await act(async () => {
      device = await result.current.getDevice('device1');
    });

    expect(device).toEqual(mockDevices[0]);

    // Should use cached device
    expect(deviceService.getDevice).not.toHaveBeenCalled();

    // For a non-cached device, should make an API call
    await act(async () => {
      device = await result.current.getDevice('device3');
    });

    expect(deviceService.getDevice).toHaveBeenCalledWith('device3');
  });

  test('adds a new device', async () => {
    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const newDevice = {
      name: 'New Device',
      ip: '192.168.1.3',
      port: 502,
      slaveId: 3,
      connectionType: 'tcp',
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

    await waitFor(() => expect(result.current.loading).toBe(false));

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

    await waitFor(() => expect(result.current.loading).toBe(false));

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

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.testConnection('device1');
    });

    expect(deviceService.testConnection).toHaveBeenCalledWith('device1');

    // Check if lastSeen was updated for the device
    expect(result.current.devices[0].lastSeen).toBeDefined();
  });

  test('handles connection test failure', async () => {
    (deviceService.testConnection as any).mockResolvedValueOnce({
      success: false,
      message: 'Connection failed',
    });

    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const originalLastSeen = result.current.devices[0].lastSeen;

    await act(async () => {
      await result.current.testConnection('device1');
    });

    // lastSeen should not be updated on failure
    expect(result.current.devices[0].lastSeen).toBe(originalLastSeen);
  });

  test('reads device registers', async () => {
    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.loading).toBe(false));

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
