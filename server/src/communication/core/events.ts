/**
 * Event system for the communication module
 */
import { ConnectionState, ParameterValue, LogEntry } from './types';
import { CommunicationError } from './errors';

/**
 * EventType enum - Standard event types
 */
export enum EventType {
  // Connection events
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTION_ERROR = 'connectionError',
  
  // Data events
  DATA_RECEIVED = 'dataReceived',
  DATA_CHANGED = 'dataChanged',
  DATA_ERROR = 'dataError',
  
  // Command events
  COMMAND_SENT = 'commandSent', 
  COMMAND_SUCCESS = 'commandSuccess',
  COMMAND_ERROR = 'commandError',
  
  // Device events
  DEVICE_ADDED = 'deviceAdded',
  DEVICE_REMOVED = 'deviceRemoved',
  DEVICE_STATE_CHANGED = 'deviceStateChanged',
  
  // Log events
  LOG = 'log',
  
  // General events
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Event interface - Base event structure
 */
export interface Event {
  type: EventType | string;
  timestamp: Date;
  source: string;
  data?: any;
}

/**
 * Connection state event
 */
export interface ConnectionStateEvent extends Event {
  type: EventType.CONNECTING | EventType.CONNECTED | EventType.DISCONNECTED | EventType.CONNECTION_ERROR;
  data: {
    state: ConnectionState;
    error?: Error;
  };
}

/**
 * Data event
 */
export interface DataEvent extends Event {
  type: EventType.DATA_RECEIVED | EventType.DATA_CHANGED | EventType.DATA_ERROR;
  data: {
    values: ParameterValue[] | ParameterValue;
    error?: Error;
  };
}

/**
 * Command event
 */
export interface CommandEvent extends Event {
  type: EventType.COMMAND_SENT | EventType.COMMAND_SUCCESS | EventType.COMMAND_ERROR;
  data: {
    command: string;
    args?: any[];
    result?: any;
    error?: Error;
  };
}

/**
 * Log event
 */
export interface LogEvent extends Event {
  type: EventType.LOG;
  data: LogEntry;
}

/**
 * Event listener type
 */
export type EventListener = (event: Event) => void;

/**
 * EventEmitter class - Simple event emitter implementation
 */
export class EventEmitter {
  private listeners: Map<EventType | string, EventListener[]> = new Map();
  
  /**
   * Add an event listener
   * @param type Event type
   * @param listener Listener function
   */
  on(type: EventType | string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }
  
  /**
   * Remove an event listener
   * @param type Event type
   * @param listener Listener function to remove
   */
  off(type: EventType | string, listener: EventListener): void {
    if (!this.listeners.has(type)) return;
    
    const listeners = this.listeners.get(type)!;
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this.listeners.delete(type);
    }
  }
  
  /**
   * Emit an event
   * @param event Event to emit
   */
  emit(event: Event): void {
    if (this.listeners.has(event.type)) {
      for (const listener of this.listeners.get(event.type)!) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      }
    }
    
    // Also emit to wildcard listeners
    if (this.listeners.has('*')) {
      for (const listener of this.listeners.get('*')!) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in wildcard event listener:`, error);
        }
      }
    }
  }
  
  /**
   * Add a one-time event listener
   * @param type Event type
   * @param listener Listener function
   */
  once(type: EventType | string, listener: EventListener): void {
    const onceListener: EventListener = (event: Event) => {
      this.off(type, onceListener);
      listener(event);
    };
    
    this.on(type, onceListener);
  }
  
  /**
   * Remove all listeners for a specific event type or all listeners if no type is provided
   * @param type Optional event type
   */
  removeAllListeners(type?: EventType | string): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * EventSource interface - Interface for objects that emit events
 */
export interface EventSource {
  on(type: EventType | string, listener: EventListener): void;
  off(type: EventType | string, listener: EventListener): void;
  once(type: EventType | string, listener: EventListener): void;
  removeAllListeners(type?: EventType | string): void;
}

/**
 * Create a standard event object
 * @param type Event type
 * @param source Event source
 * @param data Event data
 */
export function createEvent(type: EventType | string, source: string, data?: any): Event {
  return {
    type,
    timestamp: new Date(),
    source,
    data
  };
}

/**
 * Create a connection state event
 * @param source Event source
 * @param state Connection state
 * @param error Optional error
 */
export function createConnectionStateEvent(
  source: string, 
  state: ConnectionState, 
  error?: Error
): ConnectionStateEvent {
  let type: EventType;
  switch (state) {
    case ConnectionState.CONNECTING:
      type = EventType.CONNECTING;
      break;
    case ConnectionState.CONNECTED:
      type = EventType.CONNECTED;
      break;
    case ConnectionState.DISCONNECTED:
      type = EventType.DISCONNECTED;
      break;
    case ConnectionState.ERROR:
      type = EventType.CONNECTION_ERROR;
      break;
    default:
      type = EventType.DEVICE_STATE_CHANGED;
  }
  
  return {
    type,
    timestamp: new Date(),
    source,
    data: {
      state,
      error
    }
  };
}

/**
 * Create a data event
 * @param type Data event type
 * @param source Event source
 * @param values Parameter values
 * @param error Optional error
 */
export function createDataEvent(
  type: EventType.DATA_RECEIVED | EventType.DATA_CHANGED | EventType.DATA_ERROR,
  source: string,
  values: ParameterValue[] | ParameterValue,
  error?: Error
): DataEvent {
  return {
    type,
    timestamp: new Date(),
    source,
    data: {
      values,
      error
    }
  };
}

/**
 * Create a command event
 * @param type Command event type
 * @param source Event source
 * @param command Command name
 * @param args Command arguments
 * @param result Command result
 * @param error Optional error
 */
export function createCommandEvent(
  type: EventType.COMMAND_SENT | EventType.COMMAND_SUCCESS | EventType.COMMAND_ERROR,
  source: string,
  command: string,
  args?: any[],
  result?: any,
  error?: Error
): CommandEvent {
  return {
    type,
    timestamp: new Date(),
    source,
    data: {
      command,
      args,
      result,
      error
    }
  };
}

/**
 * Create a log event
 * @param source Event source
 * @param entry Log entry
 */
export function createLogEvent(source: string, entry: LogEntry): LogEvent {
  return {
    type: EventType.LOG,
    timestamp: new Date(),
    source,
    data: entry
  };
}