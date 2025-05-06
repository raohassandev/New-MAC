import { EventEmitter, EventType, EventListener, createEvent, Event } from '../core/events';
import { Protocol } from '../core/protocol.interface';
import { Device } from '../core/device.interface';
import { ConnectionState } from '../core/types';
import { createErrorFromException } from '../core/errors';

/**
 * DeviceManager singleton
 * Maintains a registry of all communication devices
 */
export class DeviceManager extends EventEmitter {
  private static instance: DeviceManager;
  private devices: Map<string, Device> = new Map();
  private protocols: Map<string, Protocol> = new Map();

  private constructor() {
    super();
  }

  /**
   * Get the DeviceManager instance
   */
  public static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  /**
   * Register a device with the manager
   * @param device Device to register
   */
  public registerDevice(device: Device): void {
    if (this.devices.has(device.id)) {
      throw new Error(`Device with ID ${device.id} is already registered`);
    }

    this.devices.set(device.id, device);

    // Forward device events
    device.on('stateChanged', ((event: Event) => {
      const state = event.data?.state as ConnectionState;
      this.emit(
        createEvent('deviceStateChanged', 'DeviceManager', {
          deviceId: device.id,
          state,
        }),
      );
    }) as EventListener);

    device.on('error', ((event: Event) => {
      const error = event.data?.error as Error;
      this.emit(
        createEvent('deviceError', 'DeviceManager', {
          deviceId: device.id,
          error,
        }),
      );
    }) as EventListener);

    this.emit(
      createEvent('deviceRegistered', 'DeviceManager', {
        deviceId: device.id,
      }),
    );
  }

  /**
   * Unregister a device from the manager
   * @param deviceId ID of the device to unregister
   */
  public unregisterDevice(deviceId: string): void {
    if (!this.devices.has(deviceId)) {
      throw new Error(`Device with ID ${deviceId} is not registered`);
    }

    this.devices.delete(deviceId);
    this.emit(
      createEvent('deviceUnregistered', 'DeviceManager', {
        deviceId,
      }),
    );
  }

  /**
   * Get a device by ID
   * @param deviceId ID of the device to get
   */
  public getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Get all registered devices
   */
  public getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  /**
   * Register a protocol with the manager
   * @param protocolId Unique ID for the protocol
   * @param protocol Protocol instance
   */
  public registerProtocol(protocolId: string, protocol: Protocol): void {
    if (this.protocols.has(protocolId)) {
      throw new Error(`Protocol with ID ${protocolId} is already registered`);
    }

    this.protocols.set(protocolId, protocol);

    // Forward protocol events
    protocol.on('stateChanged', ((event: Event) => {
      const state = event.data?.state as ConnectionState;
      this.emit(
        createEvent('protocolStateChanged', 'DeviceManager', {
          protocolId,
          state,
        }),
      );
    }) as EventListener);

    protocol.on('error', ((event: Event) => {
      const error = event.data?.error as Error;
      this.emit(
        createEvent('protocolError', 'DeviceManager', {
          protocolId,
          error,
        }),
      );
    }) as EventListener);

    this.emit(
      createEvent('protocolRegistered', 'DeviceManager', {
        protocolId,
      }),
    );
  }

  /**
   * Unregister a protocol from the manager
   * @param protocolId ID of the protocol to unregister
   */
  public unregisterProtocol(protocolId: string): void {
    if (!this.protocols.has(protocolId)) {
      throw new Error(`Protocol with ID ${protocolId} is not registered`);
    }

    this.protocols.delete(protocolId);
    this.emit(
      createEvent('protocolUnregistered', 'DeviceManager', {
        protocolId,
      }),
    );
  }

  /**
   * Get a protocol by ID
   * @param protocolId ID of the protocol to get
   */
  public getProtocol(protocolId: string): Protocol | undefined {
    return this.protocols.get(protocolId);
  }

  /**
   * Get all registered protocols
   */
  public getAllProtocols(): Protocol[] {
    return Array.from(this.protocols.values());
  }

  /**
   * Connect all registered devices
   */
  public async connectAllDevices(): Promise<void> {
    const connectPromises = Array.from(this.devices.values()).map(async device => {
      try {
        await device.connect();
        return {
          deviceId: device.id,
          success: true,
        };
      } catch (error) {
        return {
          deviceId: device.id,
          success: false,
          error: createErrorFromException(error),
        };
      }
    });

    const results = await Promise.all(connectPromises);
    this.emit(createEvent('connectAllDevicesCompleted', 'DeviceManager', results));
  }

  /**
   * Disconnect all registered devices
   */
  public async disconnectAllDevices(): Promise<void> {
    const disconnectPromises = Array.from(this.devices.values()).map(async device => {
      try {
        await device.disconnect();
        return {
          deviceId: device.id,
          success: true,
        };
      } catch (error) {
        return {
          deviceId: device.id,
          success: false,
          error: createErrorFromException(error),
        };
      }
    });

    const results = await Promise.all(disconnectPromises);
    this.emit(createEvent('disconnectAllDevicesCompleted', 'DeviceManager', results));
  }
}
