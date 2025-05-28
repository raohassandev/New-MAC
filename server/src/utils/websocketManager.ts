/**
 * WebSocket Manager Service
 * Provides safe access to WebSocket functionality with proper error handling
 */

import { Server as SocketIOServer } from 'socket.io';

interface WebSocketEventData {
  [key: string]: any;
}

interface EmitOptions {
  validateConnection?: boolean;
  errorHandler?: (error: Error) => void;
  timeout?: number;
}

class WebSocketManager {
  private io: SocketIOServer | null = null;
  private isInitialized = false;
  private connectedClients = new Set<string>();
  private deviceSubscriptions = new Map<string, Set<string>>(); // deviceId -> Set of socketIds

  /**
   * Initialize the WebSocket manager with a Socket.IO server instance
   */
  initialize(io: SocketIOServer): void {
    if (this.isInitialized) {
      console.warn('[WebSocketManager] Already initialized');
      return;
    }

    this.io = io;
    this.isInitialized = true;
    this.setupEventHandlers();
    
    console.log('[WebSocketManager] Initialized successfully');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`[WebSocketManager] Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);
      
      // Handle device subscription
      socket.on('subscribe-device', (deviceId: string) => {
        if (typeof deviceId === 'string' && deviceId.trim()) {
          this.subscribeToDevice(socket.id, deviceId);
          socket.join(`device-${deviceId}`);
          console.log(`[WebSocketManager] Client ${socket.id} subscribed to device ${deviceId}`);
        } else {
          console.warn(`[WebSocketManager] Invalid device ID for subscription: ${deviceId}`);
        }
      });
      
      // Handle device unsubscription
      socket.on('unsubscribe-device', (deviceId: string) => {
        if (typeof deviceId === 'string' && deviceId.trim()) {
          this.unsubscribeFromDevice(socket.id, deviceId);
          socket.leave(`device-${deviceId}`);
          console.log(`[WebSocketManager] Client ${socket.id} unsubscribed from device ${deviceId}`);
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[WebSocketManager] Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
        this.cleanupClientSubscriptions(socket.id);
      });
      
      // Handle errors
      socket.on('error', (error) => {
        console.error(`[WebSocketManager] Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Subscribe a client to device updates
   */
  private subscribeToDevice(socketId: string, deviceId: string): void {
    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Set());
    }
    this.deviceSubscriptions.get(deviceId)!.add(socketId);
  }

  /**
   * Unsubscribe a client from device updates
   */
  private unsubscribeFromDevice(socketId: string, deviceId: string): void {
    const subscribers = this.deviceSubscriptions.get(deviceId);
    if (subscribers) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.deviceSubscriptions.delete(deviceId);
      }
    }
  }

  /**
   * Clean up all subscriptions for a disconnected client
   */
  private cleanupClientSubscriptions(socketId: string): void {
    for (const [deviceId, subscribers] of this.deviceSubscriptions.entries()) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.deviceSubscriptions.delete(deviceId);
      }
    }
  }

  /**
   * Check if WebSocket is available and connected
   */
  isAvailable(): boolean {
    return this.isInitialized && this.io !== null;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      connectedClients: this.connectedClients.size,
      deviceSubscriptions: this.deviceSubscriptions.size,
      totalSubscriptions: Array.from(this.deviceSubscriptions.values())
        .reduce((total, subscribers) => total + subscribers.size, 0)
    };
  }

  /**
   * Safely emit an event to all connected clients
   */
  emit(eventName: string, data: WebSocketEventData, options: EmitOptions = {}): boolean {
    if (!this.isAvailable()) {
      if (options.errorHandler) {
        options.errorHandler(new Error('WebSocket not available'));
      } else {
        console.warn(`[WebSocketManager] Cannot emit ${eventName}: WebSocket not available`);
      }
      return false;
    }

    try {
      // Validate data before emitting
      if (this.validateEventData(eventName, data)) {
        this.io!.emit(eventName, data);
        console.log(`[WebSocketManager] Emitted ${eventName} to all clients`);
        return true;
      } else {
        throw new Error(`Invalid data for event ${eventName}`);
      }
    } catch (error) {
      const err = error as Error;
      console.error(`[WebSocketManager] Error emitting ${eventName}:`, err.message);
      
      if (options.errorHandler) {
        options.errorHandler(err);
      }
      
      return false;
    }
  }

  /**
   * Safely emit an event to a specific device room
   */
  emitToDevice(deviceId: string, eventName: string, data: WebSocketEventData, options: EmitOptions = {}): boolean {
    if (!this.isAvailable()) {
      if (options.errorHandler) {
        options.errorHandler(new Error('WebSocket not available'));
      } else {
        console.warn(`[WebSocketManager] Cannot emit ${eventName} to device ${deviceId}: WebSocket not available`);
      }
      return false;
    }

    if (!deviceId || typeof deviceId !== 'string') {
      const error = new Error(`Invalid device ID: ${deviceId}`);
      if (options.errorHandler) {
        options.errorHandler(error);
      } else {
        console.error(`[WebSocketManager] ${error.message}`);
      }
      return false;
    }

    try {
      // Validate data before emitting
      if (this.validateEventData(eventName, data)) {
        const room = `device-${deviceId}`;
        this.io!.to(room).emit(eventName, data);
        console.log(`[WebSocketManager] Emitted ${eventName} to device room ${deviceId}`);
        return true;
      } else {
        throw new Error(`Invalid data for event ${eventName}`);
      }
    } catch (error) {
      const err = error as Error;
      console.error(`[WebSocketManager] Error emitting ${eventName} to device ${deviceId}:`, err.message);
      
      if (options.errorHandler) {
        options.errorHandler(err);
      }
      
      return false;
    }
  }

  /**
   * Emit both global and device-specific events safely
   */
  emitRealtimeDataUpdate(data: {
    deviceId: string;
    deviceName: string;
    timestamp: Date | string;
    readings: any[];
  }): boolean {
    const eventData = {
      ...data,
      timestamp: typeof data.timestamp === 'string' ? data.timestamp : data.timestamp.toISOString()
    };

    const globalSuccess = this.emit('realtimeDataUpdate', eventData);
    const deviceSuccess = this.emitToDevice(data.deviceId, 'deviceDataUpdate', eventData);

    return globalSuccess && deviceSuccess;
  }

  /**
   * Emit coil update events
   */
  emitCoilUpdate(data: {
    deviceId: string;
    deviceName: string;
    coilAddress: number;
    coilType: string;
    value: boolean;
    timestamp: Date | string;
  }): boolean {
    const eventData = {
      ...data,
      timestamp: typeof data.timestamp === 'string' ? data.timestamp : data.timestamp.toISOString()
    };

    const globalSuccess = this.emit('coilUpdate', eventData);
    const deviceSuccess = this.emitToDevice(data.deviceId, 'deviceCoilUpdate', eventData);

    return globalSuccess && deviceSuccess;
  }

  /**
   * Emit critical value change events
   */
  emitCriticalValueChanged(data: {
    deviceId: string;
    registerAddress: number;
    registerName: string;
    registerType: string;
    oldValue: any;
    newValue: any;
    timestamp: Date | string;
    changeDetected: boolean;
  }): boolean {
    const eventData = {
      ...data,
      timestamp: typeof data.timestamp === 'string' ? data.timestamp : data.timestamp.toISOString()
    };

    const globalSuccess = this.emit('criticalValueChanged', eventData);
    const deviceSuccess = this.emitToDevice(data.deviceId, 'deviceCriticalChange', eventData);

    return globalSuccess && deviceSuccess;
  }

  /**
   * Validate event data to prevent runtime errors
   */
  private validateEventData(eventName: string, data: any): boolean {
    if (!data || typeof data !== 'object') {
      console.warn(`[WebSocketManager] Invalid data for ${eventName}: not an object`);
      return false;
    }

    // Common required fields validation
    const commonRequiredFields = ['deviceId', 'timestamp'];
    for (const field of commonRequiredFields) {
      if (!(field in data) || !data[field]) {
        console.warn(`[WebSocketManager] Invalid data for ${eventName}: missing or empty field ${field}`);
        return false;
      }
    }

    // Event-specific validation
    switch (eventName) {
      case 'realtimeDataUpdate':
      case 'deviceDataUpdate':
        if (!('deviceName' in data) || !('readings' in data) || !Array.isArray(data.readings)) {
          console.warn(`[WebSocketManager] Invalid data for ${eventName}: missing deviceName or readings array`);
          return false;
        }
        break;
        
      case 'coilUpdate':
      case 'deviceCoilUpdate':
        const coilFields = ['deviceName', 'coilAddress', 'coilType', 'value'];
        for (const field of coilFields) {
          if (!(field in data)) {
            console.warn(`[WebSocketManager] Invalid data for ${eventName}: missing field ${field}`);
            return false;
          }
        }
        break;
        
      case 'criticalValueChanged':
      case 'deviceCriticalChange':
        const criticalFields = ['registerAddress', 'registerName', 'registerType', 'oldValue', 'newValue', 'changeDetected'];
        for (const field of criticalFields) {
          if (!(field in data)) {
            console.warn(`[WebSocketManager] Invalid data for ${eventName}: missing field ${field}`);
            return false;
          }
        }
        break;
    }

    return true;
  }

  /**
   * Get list of devices with active subscriptions
   */
  getActiveDeviceSubscriptions(): string[] {
    return Array.from(this.deviceSubscriptions.keys());
  }

  /**
   * Check if a device has active subscribers
   */
  hasDeviceSubscribers(deviceId: string): boolean {
    const subscribers = this.deviceSubscriptions.get(deviceId);
    return subscribers ? subscribers.size > 0 : false;
  }

  /**
   * Destroy the WebSocket manager and clean up resources
   */
  destroy(): void {
    if (this.io) {
      this.io.removeAllListeners();
    }
    
    this.io = null;
    this.isInitialized = false;
    this.connectedClients.clear();
    this.deviceSubscriptions.clear();
    
    console.log('[WebSocketManager] Destroyed');
  }
}

// Create and export singleton instance
export const websocketManager = new WebSocketManager();
export default websocketManager;