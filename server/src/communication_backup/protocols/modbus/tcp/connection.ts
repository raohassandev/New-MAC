/**
 * Modbus TCP connection implementation
 */
import * as net from 'net';
import { EventEmitter } from 'events';
import { ModbusTCPOptions } from '../../../core/types';
import { ConnectionError, TimeoutError } from '../../../core/errors';

/**
 * Events emitted by the TCP connection
 */
export enum TCPConnectionEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  DATA = 'data',
  ERROR = 'error',
  TIMEOUT = 'timeout',
}

/**
 * Manages the TCP connection for Modbus TCP
 */
export class TCPConnection extends EventEmitter {
  private _client: net.Socket | null = null;
  private _connected = false;
  private _connectionPromise: Promise<void> | null = null;
  private _disconnectionPromise: Promise<void> | null = null;
  private _debugMode = false;
  private _options: ModbusTCPOptions;
  private _transactionId = 0;

  // Default connection options
  private static readonly DEFAULT_OPTIONS: Partial<ModbusTCPOptions> = {
    port: 502,
    timeout: 5000,
    retries: 3,
    retryInterval: 1000,
    autoReconnect: true,
    reconnectInterval: 5000,
  };

  /**
   * Create a new TCP connection
   * @param options Connection options
   */
  constructor(options: ModbusTCPOptions) {
    super();

    // Set max listeners to avoid Node.js warnings
    this.setMaxListeners(50);

    // Merge default options with provided options
    this._options = {
      ...TCPConnection.DEFAULT_OPTIONS,
      ...options,
    };

    if (!this._options.host) {
      throw new Error('TCP host is required');
    }
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
  }

  /**
   * Get the current transaction ID and increment it
   * @returns Current transaction ID
   */
  public getNextTransactionId(): number {
    // Increment and wrap around at 65535
    this._transactionId = (this._transactionId + 1) % 65536;
    return this._transactionId;
  }

  /**
   * Connect to the Modbus TCP server
   * @returns Promise that resolves when connected
   */
  public async connect(): Promise<void> {
    // If already connected, return immediately
    if (this._connected) {
      return;
    }

    // If already connecting, return the existing promise
    if (this._connectionPromise) {
      return this._connectionPromise;
    }

    this._connectionPromise = this._connect();

    try {
      await this._connectionPromise;
    } finally {
      this._connectionPromise = null;
    }
  }

  /**
   * Internal connect implementation
   */
  private async _connect(): Promise<void> {
    if (this._debugMode) {
      console.log(`[TCP] Connecting to ${this._options.host}:${this._options.port}...`);
    }

    let attempts = 0;
    let lastError: Error | null = null;

    // Try to connect with retries
    while (attempts <= this._options.retries!) {
      attempts++;

      try {
        await this._attemptConnect();

        // Connection successful
        this._connected = true;
        this.emit(TCPConnectionEvent.CONNECTED);

        if (this._debugMode) {
          console.log(`[TCP] Connected to ${this._options.host}:${this._options.port}`);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this._debugMode) {
          console.error(`[TCP] Connection attempt ${attempts} failed: ${lastError.message}`);
        }

        // If we've reached the maximum retries, throw the error
        if (attempts > this._options.retries!) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this._options.retryInterval));
      }
    }

    // If we get here, all connection attempts failed
    const error = new ConnectionError(
      `Failed to connect to ${this._options.host}:${this._options.port} after ${attempts} attempts`,
      lastError || undefined,
    );

    this.emit(TCPConnectionEvent.ERROR, error);
    throw error;
  }

  /**
   * Attempt to connect once
   */
  private _attemptConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a new Socket
      this._client = new net.Socket();

      // Create timeout
      const connectionTimeout = setTimeout(() => {
        // Clean up listeners to avoid memory leaks
        this._client?.removeAllListeners();

        // Destroy the socket
        this._client?.destroy();
        this._client = null;

        // Reject with timeout error
        const error = new TimeoutError(
          `Connection timeout after ${this._options.timeout}ms`,
          this._options.timeout!,
        );

        reject(error);
      }, this._options.timeout);

      // Set up event handlers
      this._client.on('connect', () => {
        clearTimeout(connectionTimeout);

        // Set up data event handler
        this._client!.on('data', (data: Buffer) => {
          this.emit(TCPConnectionEvent.DATA, data);
        });

        // Set up error event handler
        this._client!.on('error', (error: Error) => {
          if (this._debugMode) {
            console.error(`[TCP] Socket error: ${error.message}`);
          }

          this.emit(
            TCPConnectionEvent.ERROR,
            new ConnectionError(`Socket error: ${error.message}`, error),
          );

          // If auto-reconnect is enabled, try to reconnect
          if (this._options.autoReconnect && this._connected) {
            this._handleDisconnect();

            setTimeout(() => {
              this.connect().catch(err => {
                if (this._debugMode) {
                  console.error(`[TCP] Auto-reconnect failed: ${err.message}`);
                }
              });
            }, this._options.reconnectInterval);
          }
        });

        // Set up close event handler
        this._client!.on('close', () => {
          this._handleDisconnect();
        });

        // Set up timeout event handler
        this._client!.on('timeout', () => {
          if (this._debugMode) {
            console.warn('[TCP] Socket timeout');
          }

          this.emit(TCPConnectionEvent.TIMEOUT);
        });

        // Set socket timeout
        this._client!.setTimeout(this._options.timeout!);

        resolve();
      });

      // Connect to the server
      this._client.connect({
        host: this._options.host,
        port: this._options.port,
      });

      // Handle connection errors
      this._client.on('error', (error: Error) => {
        clearTimeout(connectionTimeout);

        // Clean up
        this._client?.removeAllListeners();
        this._client?.destroy();
        this._client = null;

        reject(new ConnectionError(`Connection error: ${error.message}`, error));
      });
    });
  }

  /**
   * Handle socket disconnect
   */
  private _handleDisconnect(): void {
    // Clean up
    this._client?.removeAllListeners();
    this._client?.destroy();
    this._client = null;

    // Update state
    const wasConnected = this._connected;
    this._connected = false;

    // Only emit the event if we were previously connected
    if (wasConnected) {
      this.emit(TCPConnectionEvent.DISCONNECTED);

      if (this._debugMode) {
        console.log(`[TCP] Disconnected from ${this._options.host}:${this._options.port}`);
      }
    }
  }

  /**
   * Disconnect from the Modbus TCP server
   * @returns Promise that resolves when disconnected
   */
  public async disconnect(): Promise<void> {
    // If already disconnected, return immediately
    if (!this._connected) {
      return;
    }

    // If already disconnecting, return the existing promise
    if (this._disconnectionPromise) {
      return this._disconnectionPromise;
    }

    this._disconnectionPromise = this._disconnect();

    try {
      await this._disconnectionPromise;
    } finally {
      this._disconnectionPromise = null;
    }
  }

  /**
   * Internal disconnect implementation
   */
  private async _disconnect(): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this._client || !this._connected) {
        this._connected = false;
        resolve();
        return;
      }

      if (this._debugMode) {
        console.log(`[TCP] Disconnecting from ${this._options.host}:${this._options.port}...`);
      }

      // Set up one-time close event handler
      this._client.once('close', () => {
        this._handleDisconnect();
        resolve();
      });

      // End the connection
      this._client.end();

      // Set a timeout in case the close event doesn't fire
      setTimeout(() => {
        if (this._connected) {
          // Force destroy the socket
          this._client?.destroy();
          this._handleDisconnect();
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * Check if connected to the Modbus TCP server
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this._connected && this._client !== null;
  }

  /**
   * Send data to the Modbus TCP server
   * @param data Data to send
   * @param timeout Timeout in milliseconds
   * @returns Promise that resolves with the response data
   */
  public async send(data: Buffer, timeout?: number): Promise<Buffer> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const effectiveTimeout = timeout || this._options.timeout!;

      // Create timeout
      let timeoutId: NodeJS.Timeout | null = null;

      if (effectiveTimeout > 0) {
        timeoutId = setTimeout(() => {
          // Remove the handler to avoid memory leaks
          this.removeListener(TCPConnectionEvent.DATA, dataHandler);

          const error = new TimeoutError(
            `Response timeout after ${effectiveTimeout}ms`,
            effectiveTimeout,
          );

          reject(error);
        }, effectiveTimeout);
      }

      // Extract the transaction ID from the data
      const transactionId = data.readUInt16BE(0);

      // Set up data handler
      const dataHandler = (response: Buffer) => {
        // Check if the response matches this request's transaction ID
        if (response.length >= 2 && response.readUInt16BE(0) === transactionId) {
          // Remove the handler and clear the timeout
          this.removeListener(TCPConnectionEvent.DATA, dataHandler);

          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Resolve with the response
          resolve(response);
        }
      };

      // Add the data handler
      this.on(TCPConnectionEvent.DATA, dataHandler);

      // Send the data
      this._client!.write(data, error => {
        if (error) {
          // Remove the handler and clear the timeout
          this.removeListener(TCPConnectionEvent.DATA, dataHandler);

          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Reject with the error
          reject(new ConnectionError(`Send error: ${error.message}`, error));
        }
      });
    });
  }
}
