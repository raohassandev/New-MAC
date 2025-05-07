/**
 * Device Manager service for the Communication Module
 */
import { EventEmitter } from 'events';
import {
  DeviceConfig,
  ModbusTCPOptions,
  ModbusRTUOptions,
  Parameter,
  ConnectionState,
} from '../core/types';
import { DeviceManagerEvent, DeviceEvent } from '../core/events';
import { Device } from '../core/device.interface';
import { DeviceBase } from '../core/device.concrete';
import { ModbusTCPClient } from '../protocols/modbus/tcp/client';
import { ModbusRTUClient } from '../protocols/modbus/rtu/client';
import { LogService } from './logService';
import { CacheService } from './cacheService';
import { ConfigurationError } from '../core/errors';

/**
 * Central registry for device management
 */
export class DeviceManager extends EventEmitter {
  private static instance: DeviceManager;
  private _devices: Map<string, Device> = new Map();
  private _logger: LogService;
  private _cache: CacheService;
  private _debugMode = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
    this._logger = LogService.getInstance();
    this._cache = CacheService.getInstance();

    // Set max listeners to avoid Node.js warnings
    this.setMaxListeners(50);
  }

  /**
   * Get the singleton instance
   * @returns The DeviceManager instance
   */
  public static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;

    // Set debug mode on all existing devices
    for (const device of this._devices.values()) {
      if ('setDebugMode' in device && typeof (device as any).setDebugMode === 'function') {
        (device as any).setDebugMode(enabled);
      }

      // Also set debug mode on the device's protocol if available
      if (
        device.protocol &&
        'setDebugMode' in device.protocol &&
        typeof device.protocol.setDebugMode === 'function'
      ) {
        device.protocol.setDebugMode(enabled);
      }
    }
  }

  /**
   * Get all registered devices
   * @returns Map of device IDs to devices
   */
  public getDevices(): Map<string, Device> {
    return new Map(this._devices);
  }

  /**
   * Get a device by ID
   * @param deviceId Device ID
   * @returns Device or undefined if not found
   */
  public getDevice(deviceId: string): Device | undefined {
    return this._devices.get(deviceId);
  }

  /**
   * Check if a device with the given ID exists
   * @param deviceId Device ID
   * @returns True if the device exists
   */
  public hasDevice(deviceId: string): boolean {
    return this._devices.has(deviceId);
  }

  /**
   * Create a new device from configuration
   * @param config Device configuration
   * @returns The created device
   */
  public createDevice(config: DeviceConfig): Device {
    // Validate the configuration
    this._validateDeviceConfig(config);

    // Create the appropriate protocol client
    let protocol;

    if (config.protocol === 'MODBUS_TCP') {
      protocol = new ModbusTCPClient(config.connectionOptions as ModbusTCPOptions);

      if (this._debugMode) {
        protocol.setDebugMode(true);
      }
    } else if (config.protocol === 'MODBUS_RTU') {
      protocol = new ModbusRTUClient(config.connectionOptions as ModbusRTUOptions);

      if (this._debugMode) {
        protocol.setDebugMode(true);
      }
    } else {
      throw new ConfigurationError(`Unsupported protocol: ${config.protocol}`);
    }

    // Create the device
    const device = new DeviceBase(
      config.id,
      config.name,
      protocol,
      config.parameters,
      config.description,
    );

    if (this._debugMode) {
      if ('setDebugMode' in device && typeof (device as any).setDebugMode === 'function') {
        (device as any).setDebugMode(true);
      }
    }

    // Set up event handlers
    this._setupDeviceEventHandlers(device);

    // Add the device to the registry
    this._devices.set(config.id, device);

    this._logger.info('DeviceManager', `Created device ${config.name} (${config.id})`);
    this.emit(DeviceManagerEvent.DEVICE_ADDED, config.id, device);

    return device;
  }

  /**
   * Remove a device from the registry
   * @param deviceId Device ID
   * @returns True if the device was removed
   */
  public removeDevice(deviceId: string): boolean {
    const device = this._devices.get(deviceId);
    if (!device) {
      return false;
    }

    // Disconnect the device if connected
    if (device.isConnected()) {
      device.disconnect().catch(error => {
        this._logger.warn('DeviceManager', `Error disconnecting device ${deviceId}:`, error);
      });
    }

    // Remove event listeners
    device.removeAllListeners();

    // Remove from registry
    this._devices.delete(deviceId);

    this._logger.info('DeviceManager', `Removed device ${device.name} (${deviceId})`);
    this.emit(DeviceManagerEvent.DEVICE_REMOVED, deviceId);

    return true;
  }

  /**
   * Update a device's configuration
   * @param deviceId Device ID
   * @param config Device configuration
   * @returns The updated device
   */
  public updateDevice(deviceId: string, config: Partial<DeviceConfig>): Device {
    const device = this._devices.get(deviceId);
    if (!device) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    // If we need to update the protocol, we need to create a new device
    if (config.protocol) {
      // Get the existing parameters if not provided
      const parameters = config.parameters || device.parameters;

      // Remove the old device
      this.removeDevice(deviceId);

      // Create a new device with the updated configuration
      return this.createDevice({
        id: deviceId,
        name: config.name || device.name,
        description: config.description || device.description,
        protocol: config.protocol,
        connectionOptions:
          config.connectionOptions || this._getDefaultConnectionOptions(config.protocol),
        parameters,
      });
    }

    // Otherwise just update the device properties
    // Update parameters if provided
    if (config.parameters) {
      // First remove all existing parameters
      device.parameters.forEach(param => {
        device.removeParameter(param.name);
      });

      // Then add the new parameters
      config.parameters.forEach(param => {
        device.addParameter(param);
      });
    }

    this._logger.info('DeviceManager', `Updated device ${device.name} (${deviceId})`);
    this.emit(DeviceManagerEvent.CONFIG_UPDATED, deviceId, device);

    return device;
  }

  /**
   * Load device configurations from a file or object
   * @param configs Device configurations
   * @returns Map of device IDs to created devices
   */
  public loadDevices(configs: DeviceConfig[]): Map<string, Device> {
    const devices = new Map<string, Device>();

    for (const config of configs) {
      try {
        const device = this.createDevice(config);
        devices.set(config.id, device);
      } catch (error) {
        this._logger.error(
          'DeviceManager',
          `Error creating device ${config.name} (${config.id}):`,
          error,
        );

        this.emit(DeviceManagerEvent.ERROR, error);
      }
    }

    return devices;
  }

  /**
   * Connect to a device
   * @param deviceId Device ID
   * @returns Promise resolving to true if connected successfully
   */
  public async connectDevice(deviceId: string): Promise<boolean> {
    const device = this._devices.get(deviceId);
    if (!device) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    return device.connect();
  }

  /**
   * Disconnect from a device
   * @param deviceId Device ID
   * @returns Promise resolving to true if disconnected successfully
   */
  public async disconnectDevice(deviceId: string): Promise<boolean> {
    const device = this._devices.get(deviceId);
    if (!device) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    return device.disconnect();
  }

  /**
   * Connect to all devices
   * @returns Promise resolving when all devices are connected
   */
  public async connectAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [deviceId, device] of this._devices.entries()) {
      try {
        const result = await device.connect();
        results.set(deviceId, result);
      } catch (error) {
        this._logger.error('DeviceManager', `Error connecting to device ${deviceId}:`, error);
        results.set(deviceId, false);
      }
    }

    return results;
  }

  /**
   * Disconnect from all devices
   * @returns Promise resolving when all devices are disconnected
   */
  public async disconnectAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [deviceId, device] of this._devices.entries()) {
      try {
        const result = await device.disconnect();
        results.set(deviceId, result);
      } catch (error) {
        this._logger.error('DeviceManager', `Error disconnecting from device ${deviceId}:`, error);
        results.set(deviceId, false);
      }
    }

    return results;
  }

  /**
   * Read a parameter from a device
   * @param deviceId Device ID
   * @param parameterName Parameter name
   * @returns Promise resolving with the parameter value
   */
  public async readParameter(deviceId: string, parameterName: string): Promise<any> {
    const device = this._devices.get(deviceId);
    if (!device) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    const result = await device.readParameter(parameterName);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Write a value to a device parameter
   * @param deviceId Device ID
   * @param parameterName Parameter name
   * @param value Value to write
   * @returns Promise resolving with the result
   */
  public async writeParameter(deviceId: string, parameterName: string, value: any): Promise<any> {
    const device = this._devices.get(deviceId);
    if (!device) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    const result = await device.writeParameter(parameterName, value);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Get the connection state for a device
   * @param deviceId Device ID
   * @returns Connection state
   */
  public getDeviceConnectionState(deviceId: string): ConnectionState {
    const device = this._devices.get(deviceId);
    if (!device) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    return device.connectionState;
  }

  /**
   * Set up event handlers for a device
   * @param device Device to set up handlers for
   */
  private _setupDeviceEventHandlers(device: Device): void {
    // Forward state change events
    device.on(DeviceEvent.STATE_CHANGED, (state: ConnectionState) => {
      this.emit(DeviceManagerEvent.DEVICE_STATE_CHANGED, device.id, state);

      this._logger.info(
        'DeviceManager',
        `Device ${device.name} (${device.id}) state changed to ${state}`,
      );
    });

    // Forward error events
    device.on(DeviceEvent.ERROR, (error: Error) => {
      this.emit(DeviceManagerEvent.ERROR, device.id, error);

      this._logger.error(
        'DeviceManager',
        `Error from device ${device.name} (${device.id}):`,
        error,
      );
    });

    // Handle data updates
    device.on(DeviceEvent.DATA_UPDATED, (parameterName: string, value: any) => {
      if (this._debugMode) {
        this._logger.debug(
          'DeviceManager',
          `Data updated for device ${device.name} (${device.id}): ${parameterName} = ${value}`,
        );
      }
    });
  }

  /**
   * Validate a device configuration
   * @param config Device configuration to validate
   */
  private _validateDeviceConfig(config: DeviceConfig): void {
    if (!config.id) {
      throw new ConfigurationError('Device ID is required');
    }

    if (!config.name) {
      throw new ConfigurationError('Device name is required');
    }

    if (!config.protocol) {
      throw new ConfigurationError('Device protocol is required');
    }

    if (!config.connectionOptions) {
      throw new ConfigurationError('Device connection options are required');
    }

    // Validate protocol-specific options
    if (config.protocol === 'MODBUS_TCP') {
      const options = config.connectionOptions as ModbusTCPOptions;

      if (!options.host) {
        throw new ConfigurationError('TCP host is required');
      }
    } else if (config.protocol === 'MODBUS_RTU') {
      const options = config.connectionOptions as ModbusRTUOptions;

      if (!options.path) {
        throw new ConfigurationError('RTU port path is required');
      }
    } else {
      throw new ConfigurationError(`Unsupported protocol: ${config.protocol}`);
    }

    // Validate parameters
    if (config.parameters) {
      const parameterNames = new Set<string>();

      for (const param of config.parameters) {
        if (!param.name) {
          throw new ConfigurationError('Parameter name is required');
        }

        if (parameterNames.has(param.name)) {
          throw new ConfigurationError(`Duplicate parameter name: ${param.name}`);
        }

        parameterNames.add(param.name);

        if (param.registerType === undefined) {
          throw new ConfigurationError(`Register type is required for parameter ${param.name}`);
        }

        if (param.address === undefined) {
          throw new ConfigurationError(`Address is required for parameter ${param.name}`);
        }

        if (param.dataType === undefined) {
          throw new ConfigurationError(`Data type is required for parameter ${param.name}`);
        }
      }
    }

    // Check for duplicate device ID
    if (this._devices.has(config.id)) {
      throw new ConfigurationError(`Device with ID ${config.id} already exists`);
    }
  }

  /**
   * Get default connection options for a protocol
   * @param protocol Protocol type
   * @returns Default connection options
   */
  private _getDefaultConnectionOptions(protocol: string): ModbusTCPOptions | ModbusRTUOptions {
    if (protocol === 'MODBUS_TCP') {
      return {
        host: 'localhost',
        port: 502,
        timeout: 5000,
        retries: 3,
        unitId: 1,
      };
    } else if (protocol === 'MODBUS_RTU') {
      return {
        path: '/dev/ttyUSB0',
        baudRate: 9600,
        parity: 'none',
        dataBits: 8,
        stopBits: 1,
        timeout: 5000,
        retries: 3,
        unitId: 1,
      };
    } else {
      throw new ConfigurationError(`Unsupported protocol: ${protocol}`);
    }
  }

  /**
   * Destroy the device manager
   */
  public destroy(): void {
    // Disconnect all devices
    for (const device of this._devices.values()) {
      device.disconnect().catch(error => {
        this._logger.warn('DeviceManager', `Error disconnecting device ${device.id}:`, error);
      });
      device.removeAllListeners();
    }

    this._devices.clear();
    this.removeAllListeners();
  }
}
