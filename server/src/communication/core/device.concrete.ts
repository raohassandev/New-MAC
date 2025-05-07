/**
 * Concrete device implementation for Modbus
 */

import { Device } from '../services/types';
import { DeviceOptions, DeviceParameterOptions, RegisterType } from './types';
import { logService } from '../services/logService';

/**
 * A concrete implementation of a Modbus device
 */
export class ModbusDevice implements Device {
  id: string;
  name: string;
  private client: any;
  private parametersMap: Map<string, DeviceParameterOptions> = new Map();
  private enabled: boolean;
  
  /**
   * Create a new Modbus device
   * @param options Device options
   */
  constructor(options: DeviceOptions) {
    this.id = options.id;
    this.name = options.name;
    this.client = options.client;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    
    // Add parameters if provided
    if (options.parameters && options.parameters.length > 0) {
      for (const paramOptions of options.parameters) {
        this.addParameter(paramOptions);
      }
    }
  }
  
  /**
   * Add a parameter to the device
   * @param paramOptions Parameter options
   */
  addParameter(paramOptions: DeviceParameterOptions): void {
    this.parametersMap.set(paramOptions.id, paramOptions);
  }
  
  /**
   * Get a parameter by ID
   * @param paramId Parameter ID
   * @returns The parameter if found, null otherwise
   */
  getParameter(paramId: string): DeviceParameterOptions | null {
    return this.parametersMap.get(paramId) || null;
  }
  
  /**
   * Get all parameters
   * @returns Array of all parameters
   */
  getAllParameters(): DeviceParameterOptions[] {
    return Array.from(this.parametersMap.values());
  }
  
  /**
   * Read a single parameter from the device
   * @param paramId Parameter ID
   * @returns The parameter value
   */
  async readParameter(paramId: string): Promise<any> {
    const param = this.parametersMap.get(paramId);
    if (!param) {
      throw new Error(`Parameter ${paramId} not found`);
    }
    
    try {
      await this.ensureConnected();
      
      // Read value based on register type
      let rawValue: any;
      switch (param.registerType) {
        case RegisterType.COIL:
          rawValue = await this.client.readCoil(param.address);
          break;
        case RegisterType.DISCRETE_INPUT:
          rawValue = await this.client.readDiscreteInput(param.address);
          break;
        case RegisterType.HOLDING_REGISTER:
          rawValue = await this.client.readHoldingRegister(param.address);
          break;
        case RegisterType.INPUT_REGISTER:
          rawValue = await this.client.readInputRegister(param.address);
          break;
        default:
          throw new Error(`Unsupported register type: ${param.registerType}`);
      }
      
      // Apply scaling if needed
      if (param.scalingFactor && param.scalingFactor !== 1) {
        return rawValue * param.scalingFactor;
      }
      
      return rawValue;
    } catch (error) {
      logService.error(`Error reading parameter ${paramId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Read all parameters from the device
   * @returns Object mapping parameter IDs to values
   */
  async readAllParameters(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    try {
      await this.ensureConnected();
      
      // Group parameters by register type for more efficient reading
      const paramsByType = this.groupParametersByRegisterType();
      
      // Read each group of parameters
      for (const [registerType, params] of Object.entries(paramsByType)) {
        await this.readParameterGroup(registerType as RegisterType, params, result);
      }
      
      return result;
    } catch (error) {
      logService.error(`Error reading all parameters: ${error}`);
      throw error;
    }
  }
  
  /**
   * Read multiple registers of the same type
   * @param registerType Register type
   * @param address Starting address
   * @param length Number of registers to read
   * @returns Array of register values
   */
  async readMultipleRegisters(
    registerType: RegisterType,
    address: number,
    length: number,
  ): Promise<number[]> {
    try {
      await this.ensureConnected();
      
      // Read values based on register type
      switch (registerType) {
        case RegisterType.COIL:
          return (await this.client.readCoils(address, length)).map(Number);
        case RegisterType.DISCRETE_INPUT:
          return (await this.client.readDiscreteInputs(address, length)).map(Number);
        case RegisterType.HOLDING_REGISTER:
          return await this.client.readHoldingRegisters(address, length);
        case RegisterType.INPUT_REGISTER:
          return await this.client.readInputRegisters(address, length);
        default:
          throw new Error(`Unsupported register type: ${registerType}`);
      }
    } catch (error) {
      logService.error(`Error reading multiple registers: ${error}`);
      throw error;
    }
  }
  
  /**
   * Group parameters by register type for more efficient reading
   * @returns Grouped parameters
   */
  private groupParametersByRegisterType(): Record<RegisterType, DeviceParameterOptions[]> {
    const result: Record<RegisterType, DeviceParameterOptions[]> = {
      [RegisterType.COIL]: [],
      [RegisterType.DISCRETE_INPUT]: [],
      [RegisterType.HOLDING_REGISTER]: [],
      [RegisterType.INPUT_REGISTER]: [],
    };
    
    // Convert the iterable to an array before iteration
    const params = Array.from(this.parametersMap.values());
    for (const param of params) {
      result[param.registerType].push(param);
    }
    
    return result;
  }
  
  /**
   * Read a group of parameters of the same register type
   * @param registerType Register type
   * @param params Parameters to read
   * @param result Result object to update
   */
  private async readParameterGroup(
    registerType: RegisterType,
    params: DeviceParameterOptions[],
    result: Record<string, any>,
  ): Promise<void> {
    if (params.length === 0) return;
    
    // Sort parameters by address
    const sortedParams = [...params].sort((a, b) => a.address - b.address);
    
    try {
      // Group consecutive addresses to read them in batches
      const batches: { startAddr: number; count: number; params: DeviceParameterOptions[] }[] = [];
      let currentBatch: { startAddr: number; count: number; params: DeviceParameterOptions[] } | null = null;
      
      // Identify batches of consecutive registers
      for (const param of sortedParams) {
        if (!currentBatch) {
          // Start a new batch
          currentBatch = {
            startAddr: param.address,
            count: 1,
            params: [param]
          };
        } else {
          // Check if this parameter is consecutive with the current batch
          if (param.address === currentBatch.startAddr + currentBatch.count) {
            // Add to current batch
            currentBatch.count++;
            currentBatch.params.push(param);
          } else {
            // This address is not consecutive, finish current batch and start a new one
            batches.push(currentBatch);
            currentBatch = {
              startAddr: param.address,
              count: 1,
              params: [param]
            };
          }
        }
      }
      
      // Add the last batch if it exists
      if (currentBatch) {
        batches.push(currentBatch);
      }
      
      logService.info(`Optimized ${params.length} parameters into ${batches.length} batch reads`);
      
      // Process each batch
      for (const batch of batches) {
        try {
          // Read registers in a single call based on register type
          let rawValues: any[];
          
          switch (registerType) {
            case RegisterType.COIL:
              rawValues = await this.client.readCoils(batch.startAddr, batch.count);
              break;
            case RegisterType.DISCRETE_INPUT:
              rawValues = await this.client.readDiscreteInputs(batch.startAddr, batch.count);
              break;
            case RegisterType.HOLDING_REGISTER:
              rawValues = await this.client.readHoldingRegisters(batch.startAddr, batch.count);
              break;
            case RegisterType.INPUT_REGISTER:
              rawValues = await this.client.readInputRegisters(batch.startAddr, batch.count);
              break;
            default:
              throw new Error(`Unsupported register type: ${registerType}`);
          }
          
          // Process each parameter in the batch
          for (let i = 0; i < batch.params.length; i++) {
            const param = batch.params[i];
            const rawValue = rawValues[i];
            
            // Apply scaling if needed
            if (param.scalingFactor && param.scalingFactor !== 1) {
              result[param.id] = rawValue * param.scalingFactor;
            } else {
              result[param.id] = rawValue;
            }
            
            logService.debug(`Read parameter ${param.id}: ${rawValue} (${param.name})`);
          }
        } catch (error) {
          logService.error(`Error reading batch at address ${batch.startAddr}, count ${batch.count}: ${error}`);
          
          // Set all parameters in this batch to null
          for (const param of batch.params) {
            result[param.id] = null;
            logService.warn(`Setting parameter ${param.id} to null due to batch read error`);
          }
        }
      }
    } catch (error) {
      logService.error(`Error reading parameter group: ${error}`);
      throw error;
    }
  }
  
  /**
   * Ensure the client is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
  }
}