/**
 * Polling service for the Communication Module
 */
import { EventEmitter } from 'events';
import { PollingEvent } from '../core/events';
import { Parameter, ParameterValue } from '../core/types';
import { Device } from '../core/device.interface';
import { DeviceManager } from './deviceManager';
import { CacheService } from './cacheService';
import { LogService } from './logService';
import { groupParameters } from '../protocols/modbus/common/utils';
import { ConfigurationError } from '../core/errors';

/**
 * Interface for polling configuration
 */
interface PollingConfig {
  interval: number;
  enabled: boolean;
  parameters?: string[]; // List of parameter names to poll (undefined means all)
}

/**
 * Service for polling device parameters at regular intervals
 */
export class PollingService extends EventEmitter {
  private static instance: PollingService;
  private _deviceManager: DeviceManager;
  private _cache: CacheService;
  private _logger: LogService;
  private _pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private _pollingConfigs: Map<string, PollingConfig> = new Map();
  private _debugMode = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
    this._deviceManager = DeviceManager.getInstance();
    this._cache = CacheService.getInstance();
    this._logger = LogService.getInstance();

    // Set max listeners to avoid Node.js warnings
    this.setMaxListeners(50);
  }

  /**
   * Get the singleton instance
   * @returns The PollingService instance
   */
  public static getInstance(): PollingService {
    if (!PollingService.instance) {
      PollingService.instance = new PollingService();
    }
    return PollingService.instance;
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
  }

  /**
   * Configure polling for a device
   * @param deviceId Device ID
   * @param interval Polling interval in milliseconds
   * @param parameters Optional list of parameter names to poll (undefined means all)
   * @returns True if polling was configured successfully
   */
  public configureDevice(deviceId: string, interval: number, parameters?: string[]): boolean {
    // Validate the device
    if (!this._deviceManager.hasDevice(deviceId)) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    // Validate the interval
    if (interval < 100) {
      throw new ConfigurationError(`Polling interval must be at least 100ms`);
    }

    // Store the configuration
    this._pollingConfigs.set(deviceId, {
      interval,
      enabled: true,
      parameters,
    });

    this._logger.info(
      'PollingService',
      `Configured polling for device ${deviceId} with interval ${interval}ms`,
    );

    // If there's an existing polling interval, restart it with the new configuration
    if (this._pollingIntervals.has(deviceId)) {
      return this.restart(deviceId);
    }

    return true;
  }

  /**
   * Start polling a device
   * @param deviceId Device ID
   * @returns True if polling was started successfully
   */
  public start(deviceId: string): boolean {
    // Validate the device
    if (!this._deviceManager.hasDevice(deviceId)) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    // Check if already polling
    if (this._pollingIntervals.has(deviceId)) {
      this._logger.warn('PollingService', `Device ${deviceId} is already being polled`);
      return false;
    }

    // Get the configuration for this device
    const config = this._pollingConfigs.get(deviceId) || {
      interval: 10000, // Default to 10 seconds
      enabled: true,
    };

    // Make sure polling is enabled
    if (!config.enabled) {
      this._logger.warn('PollingService', `Polling for device ${deviceId} is disabled`);
      return false;
    }

    this._logger.info(
      'PollingService',
      `Starting polling for device ${deviceId} with interval ${config.interval}ms`,
    );

    // Define the polling function
    const poll = async () => {
      try {
        // Poll the device
        await this._pollDevice(deviceId);
      } catch (error) {
        this._logger.error('PollingService', `Error polling device ${deviceId}:`, error);
        this.emit(PollingEvent.ERROR, deviceId, error);
      }
    };

    // Start with an immediate poll
    poll().catch(error => {
      this._logger.error('PollingService', `Error in initial poll for device ${deviceId}:`, error);
      this.emit(PollingEvent.ERROR, deviceId, error);
    });

    // Set up the interval
    const intervalId = setInterval(poll, config.interval);
    this._pollingIntervals.set(deviceId, intervalId);

    // Emit event
    this.emit(PollingEvent.STARTED, deviceId, config.interval);

    return true;
  }

  /**
   * Stop polling a device
   * @param deviceId Device ID
   * @returns True if polling was stopped successfully
   */
  public stop(deviceId: string): boolean {
    const intervalId = this._pollingIntervals.get(deviceId);

    if (!intervalId) {
      this._logger.warn('PollingService', `Device ${deviceId} is not being polled`);
      return false;
    }

    // Clear the interval
    clearInterval(intervalId);
    this._pollingIntervals.delete(deviceId);

    this._logger.info('PollingService', `Stopped polling for device ${deviceId}`);

    // Emit event
    this.emit(PollingEvent.STOPPED, deviceId);

    return true;
  }

  /**
   * Restart polling for a device
   * @param deviceId Device ID
   * @returns True if polling was restarted successfully
   */
  public restart(deviceId: string): boolean {
    // Stop polling if already started
    if (this._pollingIntervals.has(deviceId)) {
      this.stop(deviceId);
    }

    // Start polling again
    return this.start(deviceId);
  }

  /**
   * Start polling all configured devices
   * @returns Map of device IDs to start results
   */
  public startAll(): Map<string, boolean> {
    const results = new Map<string, boolean>();

    // Start polling for all devices with configurations
    for (const [deviceId, config] of this._pollingConfigs.entries()) {
      if (config.enabled) {
        try {
          const result = this.start(deviceId);
          results.set(deviceId, result);
        } catch (error) {
          this._logger.error(
            'PollingService',
            `Error starting polling for device ${deviceId}:`,
            error,
          );
          results.set(deviceId, false);
        }
      }
    }

    return results;
  }

  /**
   * Stop polling all devices
   * @returns Map of device IDs to stop results
   */
  public stopAll(): Map<string, boolean> {
    const results = new Map<string, boolean>();

    // Stop polling for all active devices
    for (const deviceId of this._pollingIntervals.keys()) {
      try {
        const result = this.stop(deviceId);
        results.set(deviceId, result);
      } catch (error) {
        this._logger.error(
          'PollingService',
          `Error stopping polling for device ${deviceId}:`,
          error,
        );
        results.set(deviceId, false);
      }
    }

    return results;
  }

  /**
   * Enable or disable polling for a device
   * @param deviceId Device ID
   * @param enabled Whether polling should be enabled
   * @returns True if the operation was successful
   */
  public setEnabled(deviceId: string, enabled: boolean): boolean {
    // Get the configuration for this device
    const config = this._pollingConfigs.get(deviceId);

    if (!config) {
      this._logger.warn('PollingService', `No polling configuration for device ${deviceId}`);
      return false;
    }

    // Update the configuration
    config.enabled = enabled;
    this._pollingConfigs.set(deviceId, config);

    // If polling is now enabled, start it if not already running
    if (enabled && !this._pollingIntervals.has(deviceId)) {
      return this.start(deviceId);
    }

    // If polling is now disabled, stop it if running
    if (!enabled && this._pollingIntervals.has(deviceId)) {
      return this.stop(deviceId);
    }

    return true;
  }

  /**
   * Get the current polling configuration for a device
   * @param deviceId Device ID
   * @returns Polling configuration or undefined if not configured
   */
  public getDeviceConfig(deviceId: string): PollingConfig | undefined {
    return this._pollingConfigs.get(deviceId);
  }

  /**
   * Get all polling configurations
   * @returns Map of device IDs to polling configurations
   */
  public getConfigurations(): Map<string, PollingConfig> {
    return new Map(this._pollingConfigs);
  }

  /**
   * Check if a device is currently being polled
   * @param deviceId Device ID
   * @returns True if the device is being polled
   */
  public isPolling(deviceId: string): boolean {
    return this._pollingIntervals.has(deviceId);
  }

  /**
   * Poll a device for all configured parameters
   * @param deviceId Device ID
   * @returns Promise resolving with the parameter values
   */
  private async _pollDevice(deviceId: string): Promise<ParameterValue[]> {
    const device = this._deviceManager.getDevice(deviceId);

    if (!device) {
      throw new ConfigurationError(`Device ${deviceId} not found`);
    }

    // Get the configuration for this device
    const config = this._pollingConfigs.get(deviceId);

    // Get the parameters to poll
    let parameters: Parameter[];

    if (config?.parameters) {
      // Filter parameters by name
      parameters = [];

      for (const paramName of config.parameters) {
        const param = device.getParameter(paramName);

        if (param) {
          parameters.push(param);
        } else {
          this._logger.warn(
            'PollingService',
            `Parameter ${paramName} not found for device ${deviceId}`,
          );
        }
      }
    } else {
      // Use all parameters
      parameters = device.parameters;
    }

    if (parameters.length === 0) {
      this._logger.warn('PollingService', `No parameters to poll for device ${deviceId}`);
      return [];
    }

    if (this._debugMode) {
      this._logger.debug(
        'PollingService',
        `Polling ${parameters.length} parameters for device ${deviceId}`,
      );
    }

    // Group parameters for efficient reading
    const groups = groupParameters(parameters);

    // Check if the device is connected, if not try to connect
    if (!device.isConnected()) {
      try {
        await device.connect();
      } catch (error) {
        this._logger.error('PollingService', `Error connecting to device ${deviceId}:`, error);
        throw error;
      }
    }

    // Read all parameters
    try {
      const result = await device.readParameters(parameters);

      if (!result.success || !result.data) {
        throw result.error || new Error('Unknown error reading parameters');
      }

      // Store values in cache
      this._cache.storeParameterValues(deviceId, result.data);

      // Emit data event
      this.emit(PollingEvent.DATA, deviceId, result.data);

      if (this._debugMode) {
        this._logger.debug(
          'PollingService',
          `Polled ${result.data.length} parameters for device ${deviceId}`,
        );
      }

      return result.data;
    } catch (error) {
      this._logger.error('PollingService', `Error polling device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Poll a device on demand (one-time poll)
   * @param deviceId Device ID
   * @returns Promise resolving with the parameter values
   */
  public async pollDevice(deviceId: string): Promise<ParameterValue[]> {
    return this._pollDevice(deviceId);
  }

  /**
   * Destroy the polling service
   */
  public destroy(): void {
    // Stop all polling
    this.stopAll();

    // Clear all configurations
    this._pollingConfigs.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}
