/**
 * Modbus TCP connection management
 */
import { Socket } from 'net';
import { EventEmitter } from 'events';
import { ConnectionState } from '../../../../core/types';
import { ConnectionError, NotConnectedError, TimeoutError } from '../../../../core/errors';
import {
  ModbusFunctionCode,
  isExceptionResponse,
  createModbusError,
} from '../common/function-codes';

/**
 * Default Modbus TCP port
 */
export const DEFAULT_PORT = 502;

/**
 * Default connection timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 5000;

/**
 * Default number of retries
 */
export const DEFAULT_RETRIES = 3;

/**
 * Default retry interval in milliseconds
 */
export const DEFAULT_RETRY_INTERVAL = 1000;

/**
 * TCP connection options
 */
export interface ModbusTcpConnectionOptions {
  host: string;
  port?: number;
  timeout?: number;
  retries?: number;
  retryInterval?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Modbus TCP MBAP (Modbus Application Protocol) header
 */
export interface MbapHeader {
  transactionId: number;
  protocolId: number;
  length: number;
  unitId: number;
}

/**
 * Modbus TCP connection class
 * Manages the TCP socket connection and message framing
 */
export class ModbusTcpConnection extends EventEmitter {
  private socket: Socket | null = null;
  private host: string;
  private port: number;
  private timeout: number;
  private retries: number;
  private retryInterval: number;
  private autoReconnect: boolean;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private transactionId: number = 0;
  private responseBuffer: Buffer = Buffer.alloc(0);
  private pendingRequests: Map<
    number,
    {
      resolve: (data: Buffer) => void;
      reject: (err: Error) => void;
      timer: NodeJS.Timeout;
    }
  > = new Map();
  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;

  /**
   * Create a new Modbus TCP connection
   * @param options Connection options
   */
  constructor(options: ModbusTcpConnectionOptions) {
    super();
    this.host = options.host;
    this.port = options.port || DEFAULT_PORT;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.retries = options.retries || DEFAULT_RETRIES;
    this.retryInterval = options.retryInterval || DEFAULT_RETRY_INTERVAL;
    this.autoReconnect = options.autoReconnect || false;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
  }

  /**
   * Get the current connection state
   */
  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  /**
   * Get whether the connection is established
   */
  get isConnected(): boolean {
    return this._connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Connect to the Modbus TCP server
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    // Clean up any existing socket
    this.cleanup();

    this._connectionState = ConnectionState.CONNECTING;
    this.emit('connecting');

    return new Promise<void>((resolve, reject) => {
      this.socket = new Socket();

      // Set up event handlers
      this.socket.on('connect', () => {
        this._connectionState = ConnectionState.CONNECTED;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.socket.on('close', hadError => {
        if (this._connectionState === ConnectionState.CONNECTED) {
          this._connectionState = ConnectionState.DISCONNECTED;
          this.emit('disconnected', hadError);

          // Reject all pending requests
          for (const { reject, timer } of this.pendingRequests.values()) {
            clearTimeout(timer);
            reject(new ConnectionError('Connection closed'));
          }
          this.pendingRequests.clear();

          // Attempt to reconnect if auto-reconnect is enabled
          if (this.autoReconnect && !this.reconnectTimer) {
            this.scheduleReconnect();
          }
        }
      });

      this.socket.on('error', err => {
        if (this._connectionState === ConnectionState.CONNECTING) {
          this._connectionState = ConnectionState.ERROR;
          this.emit('error', err);
          reject(err);
        } else {
          this.emit('error', err);
        }
      });

      this.socket.on('data', data => {
        this.handleData(data);
      });

      // Connect to the server
      try {
        this.socket.connect({
          host: this.host,
          port: this.port,
        });
      } catch (err) {
        this._connectionState = ConnectionState.ERROR;
        this.emit('error', err);
        reject(err);
      }

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this._connectionState === ConnectionState.CONNECTING) {
          this._connectionState = ConnectionState.ERROR;
          const err = new TimeoutError(`Connection to ${this.host}:${this.port} timed out`);
          this.emit('error', err);

          this.socket?.destroy();
          this.socket = null;

          reject(err);
        }
      }, this.timeout);

      // Clear the timeout when connected
      this.once('connected', () => {
        clearTimeout(connectionTimeout);
      });
    });
  }

  /**
   * Disconnect from the Modbus TCP server
   */
  async disconnect(): Promise<void> {
    // Clear any reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (!this.isConnected) {
      return;
    }

    return new Promise<void>(resolve => {
      const onDisconnect = () => {
        this.removeListener('disconnected', onDisconnect);
        resolve();
      };

      this.once('disconnected', onDisconnect);
      this.socket?.end();
    });
  }

  /**
   * Send a Modbus TCP request with automatic reconnection and retries
   * @param pdu Protocol Data Unit (excluding MBAP header)
   * @param unitId Unit/slave ID
   */
  async sendRequest(pdu: Buffer, unitId: number = 1): Promise<Buffer> {
    // Check if connected
    if (!this.isConnected) {
      if (this.autoReconnect) {
        try {
          await this.connect();
        } catch (err) {
          throw new ConnectionError(`Failed to connect: ${err.message}`);
        }
      } else {
        throw new NotConnectedError();
      }
    }

    // Try to send the request with retries
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryInterval));

        // Check if still connected
        if (!this.isConnected) {
          if (this.autoReconnect) {
            try {
              await this.connect();
            } catch (err) {
              throw new ConnectionError(`Failed to reconnect: ${err.message}`);
            }
          } else {
            throw new NotConnectedError();
          }
        }
      }

      try {
        return await this.sendRequestInternal(pdu, unitId);
      } catch (err) {
        lastError = err;

        // Don't retry on certain errors
        if (err.name === 'ModbusError') {
          throw err;
        }

        // Log retry attempt
        if (attempt < this.retries) {
          console.warn(
            `Modbus TCP request failed, retrying (${attempt + 1}/${this.retries}): ${err.message}`,
          );
        }
      }
    }

    // All retries have failed
    throw lastError || new ConnectionError('Request failed after maximum retries');
  }

  /**
   * Internal method to send a Modbus TCP request
   * @param pdu Protocol Data Unit (excluding MBAP header)
   * @param unitId Unit/slave ID
   */
  private sendRequestInternal(pdu: Buffer, unitId: number): Promise<Buffer> {
    if (!this.socket || !this.isConnected) {
      throw new NotConnectedError();
    }

    // Generate a transaction ID
    const transactionId = this.getNextTransactionId();

    // Create the MBAP header
    const mbapHeader = Buffer.alloc(7);
    mbapHeader.writeUInt16BE(transactionId, 0); // Transaction ID
    mbapHeader.writeUInt16BE(0, 2); // Protocol ID (always 0 for Modbus TCP)
    mbapHeader.writeUInt16BE(pdu.length + 1, 4); // PDU length + unit ID
    mbapHeader.writeUInt8(unitId, 6); // Unit ID

    // Create the complete message
    const message = Buffer.concat([mbapHeader, pdu]);

    return new Promise<Buffer>((resolve, reject) => {
      // Set up a timeout for the request
      const timer = setTimeout(() => {
        this.pendingRequests.delete(transactionId);
        reject(new TimeoutError(`Request timed out after ${this.timeout}ms`));
      }, this.timeout);

      // Store the request
      this.pendingRequests.set(transactionId, { resolve, reject, timer });

      // Send the message
      this.socket.write(message, err => {
        if (err) {
          this.pendingRequests.delete(transactionId);
          clearTimeout(timer);
          reject(new ConnectionError(`Failed to send request: ${err.message}`));
        }
      });
    });
  }

  /**
   * Handle incoming data from the socket
   * @param data Received data
   */
  private handleData(data: Buffer): void {
    // Append the new data to the buffer
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    // Process all complete messages in the buffer
    while (this.responseBuffer.length >= 7) {
      // At least MBAP header
      // Extract the header fields
      const transactionId = this.responseBuffer.readUInt16BE(0);
      const protocolId = this.responseBuffer.readUInt16BE(2);
      const length = this.responseBuffer.readUInt16BE(4);

      // Check if the complete message has been received
      if (this.responseBuffer.length < length + 6) {
        // Not enough data yet
        break;
      }

      // Extract the complete message
      const message = this.responseBuffer.slice(0, length + 6);
      this.responseBuffer = this.responseBuffer.slice(length + 6);

      // Check protocol ID
      if (protocolId !== 0) {
        console.warn(`Received message with invalid protocol ID: ${protocolId}`);
        continue;
      }

      // Extract PDU (without header and unit ID)
      const pdu = message.slice(7);

      // Find the pending request
      const request = this.pendingRequests.get(transactionId);
      if (request) {
        this.pendingRequests.delete(transactionId);
        clearTimeout(request.timer);

        // Check for exception response
        const functionCode = pdu.readUInt8(0);
        if (isExceptionResponse(functionCode)) {
          if (pdu.length < 2) {
            request.reject(new Error('Invalid exception response: too short'));
            return;
          }

          const exceptionCode = pdu.readUInt8(1);
          request.reject(createModbusError(exceptionCode));
        } else {
          request.resolve(pdu);
        }
      } else {
        console.warn(`Received response for unknown transaction ID: ${transactionId}`);
      }
    }
  }

  /**
   * Get the next transaction ID
   */
  private getNextTransactionId(): number {
    // Wrap around at 65535
    this.transactionId = (this.transactionId + 1) % 0xffff;
    return this.transactionId;
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (
      this.reconnectTimer ||
      this.isConnected ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      if (this.isConnected) {
        return;
      }

      this.reconnectAttempts++;

      try {
        await this.connect();
      } catch (err) {
        console.error(`Reconnection attempt ${this.reconnectAttempts} failed: ${err.message}`);

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
        }
      }
    }, this.reconnectInterval);
  }

  /**
   * Clean up the socket and associated resources
   */
  private cleanup(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    // Clear any reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear any pending requests
    for (const { reject, timer } of this.pendingRequests.values()) {
      clearTimeout(timer);
      reject(new ConnectionError('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}
