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
      // Handle each parameter individually for simplicity
      for (const param of sortedParams) {
        try {
          // Read value based on register type
          let rawValue: any;
          switch (registerType) {
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
          }
          
          // Apply scaling if needed
          if (param.scalingFactor && param.scalingFactor !== 1) {
            result[param.id] = rawValue * param.scalingFactor;
          } else {
            result[param.id] = rawValue;
          }
        } catch (error) {
          logService.error(`Error reading parameter ${param.id}: ${error}`);
          result[param.id] = null;
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