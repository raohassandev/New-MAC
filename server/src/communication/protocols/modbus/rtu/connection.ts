import { EventEmitter } from '../../../../core/events';
import { 
    ConnectionError, 
    TimeoutError,
    createErrorFromException 
} from '../../../../core/errors';
import { 
    ConnectionState, 
    ConnectionOptions, 
    RtuConnectionOptions 
} from '../../../../core/types';
import * as SerialPort from 'serialport';
import { crc16modbus } from '../common/crc';
import { ResponseTimeoutError } from '../../../../core/errors';

/**
 * Interface for Modbus RTU request
 */
export interface ModbusRtuRequest {
    address: number;
    functionCode: number;
    data: Buffer;
    timestamp: number;
    timeout: NodeJS.Timeout;
    resolve: (response: Buffer) => void;
    reject: (error: Error) => void;
}

/**
 * Class for managing Modbus RTU connections
 * Handles serial port connection, request/response management,
 * automatic reconnection, and error handling
 */
export class ModbusRtuConnection extends EventEmitter {
    private port: SerialPort | null = null;
    private parser: SerialPort.parsers.DelimiterParser | null = null;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private requestQueue: ModbusRtuRequest[] = [];
    private currentRequest: ModbusRtuRequest | null = null;
    private responseBuffer: Buffer = Buffer.alloc(0);
    private connectionOptions: RtuConnectionOptions;
    private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds

    /**
     * Create a Modbus RTU connection
     * @param options Connection options
     */
    constructor(options: RtuConnectionOptions) {
        super();
        this.connectionOptions = {
            ...options,
            baudRate: options.baudRate || 9600,
            dataBits: options.dataBits || 8,
            stopBits: options.stopBits || 1,
            parity: options.parity || 'none',
            autoReconnect: options.autoReconnect !== false,
            reconnectInterval: options.reconnectInterval || 5000,
            timeout: options.timeout || this.DEFAULT_TIMEOUT
        };
    }

    /**
     * Get the current connection state
     */
    public getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Connect to the Modbus RTU slave
     */
    public async connect(): Promise<void> {
        if (this.connectionState === ConnectionState.CONNECTED) {
            return;
        }

        if (this.connectionState === ConnectionState.CONNECTING) {
            throw new ConnectionError('Connection attempt already in progress');
        }

        this.setConnectionState(ConnectionState.CONNECTING);

        try {
            this.port = new SerialPort(this.connectionOptions.path, {
                baudRate: this.connectionOptions.baudRate,
                dataBits: this.connectionOptions.dataBits,
                stopBits: this.connectionOptions.stopBits,
                parity: this.connectionOptions.parity,
                autoOpen: false
            });

            // Create parser for response data
            this.parser = this.port.pipe(new SerialPort.parsers.Delimiter({ delimiter: Buffer.from([]) }));

            // Setup event handlers
            this.setupEventHandlers();

            // Open the port
            await new Promise<void>((resolve, reject) => {
                if (!this.port) {
                    reject(new ConnectionError('Serial port not initialized'));
                    return;
                }

                this.port.open((err) => {
                    if (err) {
                        reject(new ConnectionError(`Failed to open serial port: ${err.message}`));
                        return;
                    }
                    resolve();
                });
            });

            this.setConnectionState(ConnectionState.CONNECTED);
            this.emit('connected');

            // Process any queued requests
            this.processQueue();
        } catch (err) {
            this.setConnectionState(ConnectionState.DISCONNECTED);
            const error = createErrorFromException(err);
            this.emit('error', error);
            
            // Schedule reconnection if enabled
            if (this.connectionOptions.autoReconnect) {
                this.scheduleReconnect();
            }
            
            throw error;
        }
    }

    /**
     * Disconnect from the Modbus RTU slave
     */
    public async disconnect(): Promise<void> {
        // Clear reconnection timer if active
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // If already disconnected, just return
        if (this.connectionState === ConnectionState.DISCONNECTED) {
            return;
        }

        this.setConnectionState(ConnectionState.DISCONNECTING);

        try {
            // Reject any pending requests
            this.rejectAllRequests(new ConnectionError('Connection closed'));

            // Close the port
            if (this.port && this.port.isOpen) {
                await new Promise<void>((resolve, reject) => {
                    if (!this.port) {
                        resolve();
                        return;
                    }

                    this.port.close((err) => {
                        if (err) {
                            reject(new ConnectionError(`Failed to close serial port: ${err.message}`));
                            return;
                        }
                        resolve();
                    });
                });
            }

            // Clean up resources
            this.port = null;
            this.parser = null;
            this.setConnectionState(ConnectionState.DISCONNECTED);
            this.emit('disconnected');
        } catch (err) {
            const error = createErrorFromException(err);
            this.emit('error', error);
            this.setConnectionState(ConnectionState.DISCONNECTED);
            throw error;
        }
    }

    /**
     * Send a Modbus RTU request
     * @param address Slave address (1-247)
     * @param functionCode Function code
     * @param data Request data
     */
    public async sendRequest(address: number, functionCode: number, data: Buffer): Promise<Buffer> {
        // Validate parameters
        if (address < 1 || address > 247) {
            throw new Error(`Invalid slave address: ${address}. Valid range is 1-247.`);
        }

        // Check connection state
        if (this.connectionState !== ConnectionState.CONNECTED) {
            try {
                await this.connect();
            } catch (err) {
                throw new ConnectionError(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        // Create request
        const pdu = Buffer.concat([Buffer.from([functionCode]), data]);
        const adu = Buffer.concat([
            Buffer.from([address]),
            pdu
        ]);

        // Calculate CRC and append it
        const crc = crc16modbus(adu);
        const crcBuffer = Buffer.alloc(2);
        crcBuffer.writeUInt16LE(crc, 0);
        const message = Buffer.concat([adu, crcBuffer]);

        // Send request and wait for response
        return new Promise<Buffer>((resolve, reject) => {
            const request: ModbusRtuRequest = {
                address,
                functionCode,
                data,
                timestamp: Date.now(),
                timeout: setTimeout(() => {
                    if (this.currentRequest === request) {
                        this.currentRequest = null;
                    } else {
                        const index = this.requestQueue.indexOf(request);
                        if (index !== -1) {
                            this.requestQueue.splice(index, 1);
                        }
                    }
                    reject(new TimeoutError(`Request timed out after ${this.connectionOptions.timeout}ms`));
                    this.processQueue();
                }, this.connectionOptions.timeout),
                resolve,
                reject
            };

            // Add request to queue
            if (!this.currentRequest) {
                this.currentRequest = request;
                this.sendMessage(message);
            } else {
                this.requestQueue.push(request);
            }
        });
    }

    /**
     * Set up event handlers for the serial port
     */
    private setupEventHandlers(): void {
        if (!this.port || !this.parser) {
            return;
        }

        // Handle port errors
        this.port.on('error', (err) => {
            const error = createErrorFromException(err);
            this.emit('error', error);
            this.handleConnectionFailure(error);
        });

        // Handle data from parser
        this.parser.on('data', (data: Buffer) => {
            this.handleResponseData(data);
        });

        // Handle port closure
        this.port.on('close', () => {
            if (this.connectionState !== ConnectionState.DISCONNECTING && 
                this.connectionState !== ConnectionState.DISCONNECTED) {
                const error = new ConnectionError('Connection closed unexpectedly');
                this.emit('error', error);
                this.handleConnectionFailure(error);
            }
        });
    }

    /**
     * Handle response data from the serial port
     * @param data Received data
     */
    private handleResponseData(data: Buffer): void {
        // Add to response buffer
        this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

        // Process the buffer if we have a current request
        if (this.currentRequest) {
            this.processResponseBuffer();
        }
    }

    /**
     * Process the response buffer to extract a complete Modbus RTU response
     */
    private processResponseBuffer(): void {
        // Minimum response length (address + function code + CRC) is 4 bytes
        if (this.responseBuffer.length < 4) {
            return;
        }

        // Extract address and function code
        const address = this.responseBuffer[0];
        const functionCode = this.responseBuffer[1];

        // Determine response length based on function code
        let expectedLength = this.calculateExpectedResponseLength(functionCode, this.responseBuffer);

        // If we can't determine the length yet, wait for more data
        if (expectedLength === -1 || this.responseBuffer.length < expectedLength) {
            return;
        }

        // Extract the complete response
        const response = this.responseBuffer.slice(0, expectedLength);
        
        // Remove the processed data from the buffer
        this.responseBuffer = this.responseBuffer.slice(expectedLength);

        // Validate the response
        try {
            this.validateResponse(response);
        } catch (err) {
            if (this.currentRequest) {
                clearTimeout(this.currentRequest.timeout);
                this.currentRequest.reject(err instanceof Error ? err : new Error(String(err)));
                this.currentRequest = null;
                this.processQueue();
            }
            return;
        }

        // Process the response for the current request
        if (this.currentRequest) {
            clearTimeout(this.currentRequest.timeout);
            
            // Extract the PDU (without address and CRC)
            const pdu = response.slice(1, response.length - 2);
            
            // Resolve the request
            this.currentRequest.resolve(pdu);
            this.currentRequest = null;
            
            // Process the next request in the queue
            this.processQueue();
        }
    }

    /**
     * Calculate the expected length of a Modbus RTU response
     * @param functionCode Function code
     * @param buffer Current buffer
     */
    private calculateExpectedResponseLength(functionCode: number, buffer: Buffer): number {
        // Check if response indicates an exception
        if ((functionCode & 0x80) !== 0) {
            // Exception response: address + function code + exception code + CRC (2 bytes)
            return 5;
        }

        // For function codes where we can determine the length from the buffer
        switch (functionCode) {
            case 1: // Read Coils
            case 2: // Read Discrete Inputs
            case 3: // Read Holding Registers
            case 4: // Read Input Registers
                // If we have enough data to read the byte count
                if (buffer.length >= 3) {
                    const byteCount = buffer[2];
                    // address + function code + byte count + data + CRC (2 bytes)
                    return 3 + byteCount + 2;
                }
                break;
            case 5: // Write Single Coil
            case 6: // Write Single Register
                // Fixed length: address + function code + output address (2 bytes) + output value (2 bytes) + CRC (2 bytes)
                return 8;
            case 15: // Write Multiple Coils
            case 16: // Write Multiple Registers
                // Fixed length: address + function code + address (2 bytes) + quantity (2 bytes) + CRC (2 bytes)
                return 8;
            default:
                // For other function codes, wait for more data or implement specific logic
                break;
        }

        // Can't determine the length yet or unsupported function code
        return -1;
    }

    /**
     * Validate a Modbus RTU response
     * @param response Complete response buffer
     */
    private validateResponse(response: Buffer): void {
        // Check minimum length
        if (response.length < 4) {
            throw new Error('Response too short');
        }

        // Validate CRC
        const messageData = response.slice(0, response.length - 2);
        const receivedCrc = response.readUInt16LE(response.length - 2);
        const calculatedCrc = crc16modbus(messageData);

        if (receivedCrc !== calculatedCrc) {
            throw new Error(`CRC check failed: received ${receivedCrc}, calculated ${calculatedCrc}`);
        }

        // Check if the address matches the request
        if (this.currentRequest && response[0] !== this.currentRequest.address) {
            throw new Error(`Unexpected slave address: ${response[0]}, expected: ${this.currentRequest.address}`);
        }

        // Check function code
        const functionCode = response[1];
        if (this.currentRequest) {
            const expectedFunctionCode = this.currentRequest.functionCode;

            // Check for exception response
            if ((functionCode & 0x80) !== 0) {
                if ((functionCode & 0x7F) === expectedFunctionCode) {
                    const exceptionCode = response[2];
                    throw new Error(`Modbus exception: function code ${expectedFunctionCode}, exception code ${exceptionCode}`);
                } else {
                    throw new Error(`Unexpected exception function code: ${functionCode}, expected: ${expectedFunctionCode}`);
                }
            }

            // Check for normal response
            if (functionCode !== expectedFunctionCode) {
                throw new Error(`Unexpected function code: ${functionCode}, expected: ${expectedFunctionCode}`);
            }
        }
    }

    /**
     * Send a message to the serial port
     * @param message Message buffer
     */
    private sendMessage(message: Buffer): void {
        if (!this.port || !this.port.isOpen) {
            const error = new ConnectionError('Cannot send message: port not open');
            if (this.currentRequest) {
                clearTimeout(this.currentRequest.timeout);
                this.currentRequest.reject(error);
                this.currentRequest = null;
            }
            this.handleConnectionFailure(error);
            return;
        }

        this.port.write(message, (err) => {
            if (err) {
                const error = createErrorFromException(err);
                if (this.currentRequest) {
                    clearTimeout(this.currentRequest.timeout);
                    this.currentRequest.reject(error);
                    this.currentRequest = null;
                }
                this.handleConnectionFailure(error);
            }
            this.port?.drain();
        });
    }

    /**
     * Process the next request in the queue
     */
    private processQueue(): void {
        if (this.requestQueue.length > 0 && !this.currentRequest) {
            this.currentRequest = this.requestQueue.shift()!;
            
            // Create request message
            const pdu = Buffer.concat([Buffer.from([this.currentRequest.functionCode]), this.currentRequest.data]);
            const adu = Buffer.concat([
                Buffer.from([this.currentRequest.address]),
                pdu
            ]);

            // Calculate CRC and append it
            const crc = crc16modbus(adu);
            const crcBuffer = Buffer.alloc(2);
            crcBuffer.writeUInt16LE(crc, 0);
            const message = Buffer.concat([adu, crcBuffer]);

            this.sendMessage(message);
        }
    }

    /**
     * Handle connection failure
     * @param error Connection error
     */
    private handleConnectionFailure(error: Error): void {
        // If we're already disconnected or disconnecting, ignore
        if (this.connectionState === ConnectionState.DISCONNECTED || 
            this.connectionState === ConnectionState.DISCONNECTING) {
            return;
        }

        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.emit('disconnected');

        // Reject all pending requests
        this.rejectAllRequests(error);

        // Schedule reconnection if enabled
        if (this.connectionOptions.autoReconnect) {
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule a reconnection attempt
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((err) => {
                this.emit('error', createErrorFromException(err));
            });
        }, this.connectionOptions.reconnectInterval);
    }

    /**
     * Reject all pending requests with an error
     * @param error Error to reject with
     */
    private rejectAllRequests(error: Error): void {
        // Reject current request
        if (this.currentRequest) {
            clearTimeout(this.currentRequest.timeout);
            this.currentRequest.reject(error);
            this.currentRequest = null;
        }

        // Reject all queued requests
        for (const request of this.requestQueue) {
            clearTimeout(request.timeout);
            request.reject(error);
        }
        this.requestQueue = [];
    }

    /**
     * Set the connection state and emit state change event
     * @param state New connection state
     */
    private setConnectionState(state: ConnectionState): void {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.emit('stateChanged', state);
        }
    }
}