/**
 * Modbus TCP Client implementation
 */

import ModbusRTU from 'modbus-serial';
import { TCPConnectionSettings, ModbusClient } from '../../../core/types';
import { logService } from '../../../services/logService';

/**
 * Modbus TCP client implementation
 */
export class ModbusTCPClient implements ModbusClient {
  private client: ModbusRTU;
  private options: TCPConnectionSettings;
  private connected: boolean = false;
  private connectInProgress: boolean = false;
  private timeout: number;
  private retries: number;
  
  /**
   * Create a new Modbus TCP client
   * @param options TCP connection settings
   */
  constructor(options: TCPConnectionSettings) {
    this.options = options;
    this.client = new ModbusRTU();
    this.timeout = options.timeout || 5000;
    this.retries = options.retries || 3;
  }
  
  /**
   * Connect to the Modbus TCP server
   */
  async connect(): Promise<void> {
    if (this.connected || this.connectInProgress) {
      return;
    }
    
    try {
      this.connectInProgress = true;
      
      // Set timeout
      this.client.setTimeout(this.timeout);
      
      // Connect to the server
      await this.client.connectTCP(this.options.host, { port: this.options.port });
      
      // Set the slave ID if provided
      if (this.options.unitId !== undefined) {
        this.client.setID(this.options.unitId);
      }
      
      this.connected = true;
      this.connectInProgress = false;
      
      logService.debug(`Connected to Modbus TCP server at ${this.options.host}:${this.options.port}`);
    } catch (error) {
      this.connected = false;
      this.connectInProgress = false;
      
      logService.error(`Failed to connect to Modbus TCP server: ${error}`);
      throw error;
    }
  }
  
  /**
   * Disconnect from the Modbus TCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      await this.client.close();
      this.connected = false;
      
      logService.debug(`Disconnected from Modbus TCP server at ${this.options.host}:${this.options.port}`);
    } catch (error) {
      logService.error(`Failed to disconnect from Modbus TCP server: ${error}`);
      throw error;
    }
  }
  
  /**
   * Check if the client is connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Read a coil from the device
   * @param address Coil address
   * @returns Coil value
   */
  async readCoil(address: number): Promise<boolean> {
    return (await this.executeWithRetry(() => this.client.readCoils(address, 1))).data[0];
  }
  
  /**
   * Read multiple coils from the device
   * @param address Starting coil address
   * @param length Number of coils to read
   * @returns Array of coil values
   */
  async readCoils(address: number, length: number): Promise<boolean[]> {
    return (await this.executeWithRetry(() => this.client.readCoils(address, length))).data;
  }
  
  /**
   * Read a discrete input from the device
   * @param address Discrete input address
   * @returns Discrete input value
   */
  async readDiscreteInput(address: number): Promise<boolean> {
    return (await this.executeWithRetry(() => this.client.readDiscreteInputs(address, 1))).data[0];
  }
  
  /**
   * Read multiple discrete inputs from the device
   * @param address Starting discrete input address
   * @param length Number of discrete inputs to read
   * @returns Array of discrete input values
   */
  async readDiscreteInputs(address: number, length: number): Promise<boolean[]> {
    return (await this.executeWithRetry(() => this.client.readDiscreteInputs(address, length))).data;
  }
  
  /**
   * Read a holding register from the device
   * @param address Holding register address
   * @returns Holding register value
   */
  async readHoldingRegister(address: number): Promise<number> {
    return (await this.executeWithRetry(() => this.client.readHoldingRegisters(address, 1))).data[0];
  }
  
  /**
   * Read multiple holding registers from the device
   * @param address Starting holding register address
   * @param length Number of holding registers to read
   * @returns Array of holding register values
   */
  async readHoldingRegisters(address: number, length: number): Promise<number[]> {
    return (await this.executeWithRetry(() => this.client.readHoldingRegisters(address, length))).data;
  }
  
  /**
   * Read an input register from the device
   * @param address Input register address
   * @returns Input register value
   */
  async readInputRegister(address: number): Promise<number> {
    return (await this.executeWithRetry(() => this.client.readInputRegisters(address, 1))).data[0];
  }
  
  /**
   * Read multiple input registers from the device
   * @param address Starting input register address
   * @param length Number of input registers to read
   * @returns Array of input register values
   */
  async readInputRegisters(address: number, length: number): Promise<number[]> {
    return (await this.executeWithRetry(() => this.client.readInputRegisters(address, length))).data;
  }
  
  /**
   * Write a coil to the device
   * @param address Coil address
   * @param value Coil value
   */
  async writeCoil(address: number, value: boolean): Promise<void> {
    await this.executeWithRetry(() => this.client.writeCoil(address, value));
  }
  
  /**
   * Write multiple coils to the device
   * @param address Starting coil address
   * @param values Array of coil values
   */
  async writeCoils(address: number, values: boolean[]): Promise<void> {
    await this.executeWithRetry(() => this.client.writeCoils(address, values));
  }
  
  /**
   * Write a register to the device
   * @param address Register address
   * @param value Register value
   */
  async writeRegister(address: number, value: number): Promise<void> {
    await this.executeWithRetry(() => this.client.writeRegister(address, value));
  }
  
  /**
   * Write multiple registers to the device
   * @param address Starting register address
   * @param values Array of register values
   */
  async writeRegisters(address: number, values: number[]): Promise<void> {
    await this.executeWithRetry(() => this.client.writeRegisters(address, values));
  }
  
  /**
   * Execute a function with retries on error
   * @param fn Function to execute
   * @returns Result of the function
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    // Make sure we're connected first
    if (!this.connected) {
      await this.connect();
    }
    
    let lastError: any;
    
    // Try the operation with retries
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if the error is due to connection loss
        const err = error as Error;
        if (
          err.message?.includes('Port is closed') ||
          err.message?.includes('Connection timeout') ||
          err.message?.includes('ETIMEDOUT') ||
          err.message?.includes('ECONNRESET')
        ) {
          // Try to reconnect
          this.connected = false;
          try {
            await this.connect();
          } catch (connectError) {
            // Continue to next retry
          }
        }
        
        if (attempt < this.retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
    
    // All retries failed
    throw lastError;
  }
}