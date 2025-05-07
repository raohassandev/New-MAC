/**
 * Configuration Manager for Communication Module
 * 
 * Provides a centralized way to access and update configuration settings.
 */

import { CommunicationConfig } from './types';
import { defaultConfig } from './index';

/**
 * Configuration Manager class
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: CommunicationConfig;
  
  private constructor() {
    // Initialize with default config
    this.config = structuredClone(defaultConfig);
  }
  
  /**
   * Get the singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * Get the full configuration
   */
  public getConfig(): CommunicationConfig {
    return this.config;
  }
  
  /**
   * Update the configuration
   * @param newConfig The new configuration (will be merged with existing)
   */
  public updateConfig(newConfig: Partial<CommunicationConfig>): void {
    this.config = this.mergeConfigs(this.config, newConfig);
  }
  
  /**
   * Reset the configuration to defaults
   */
  public resetConfig(): void {
    this.config = structuredClone(defaultConfig);
  }
  
  /**
   * Get Modbus configuration
   */
  public getModbusConfig() {
    return this.config.modbus;
  }
  
  /**
   * Get device configuration
   */
  public getDeviceConfig() {
    return this.config.device;
  }
  
  /**
   * Get logging configuration
   */
  public getLoggingConfig() {
    return this.config.logging;
  }
  
  /**
   * Get cache configuration
   */
  public getCacheConfig() {
    return this.config.cache;
  }
  
  /**
   * Get polling configuration
   */
  public getPollingConfig() {
    return this.config.polling;
  }
  
  /**
   * Update Modbus configuration
   */
  public updateModbusConfig(config: Partial<CommunicationConfig['modbus']>): void {
    this.config.modbus = { ...this.config.modbus, ...config };
  }
  
  /**
   * Update device configuration
   */
  public updateDeviceConfig(config: Partial<CommunicationConfig['device']>): void {
    this.config.device = { ...this.config.device, ...config };
  }
  
  /**
   * Update logging configuration
   */
  public updateLoggingConfig(config: Partial<CommunicationConfig['logging']>): void {
    this.config.logging = { ...this.config.logging, ...config };
  }
  
  /**
   * Update cache configuration
   */
  public updateCacheConfig(config: Partial<CommunicationConfig['cache']>): void {
    this.config.cache = { ...this.config.cache, ...config };
  }
  
  /**
   * Update polling configuration
   */
  public updatePollingConfig(config: Partial<CommunicationConfig['polling']>): void {
    this.config.polling = { ...this.config.polling, ...config };
  }
  
  /**
   * Deep merge configurations
   */
  private mergeConfigs(target: any, source: any): any {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeConfigs(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
}

/**
 * Check if value is an object
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Export the singleton instance
export const configManager = ConfigManager.getInstance();