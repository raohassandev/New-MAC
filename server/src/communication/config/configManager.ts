import { EventEmitter } from '../core/events';
import { LogService } from '../services/logService';
import { ModuleConfig, DeviceConfig, ParameterConfig } from './types';
import { createErrorFromException } from '../core/errors';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ConfigManager class for handling configuration loading and validation
 */
export class ConfigManager extends EventEmitter {
    private static instance: ConfigManager;
    private config: ModuleConfig = { devices: [] };
    private configPath: string | null = null;
    private logger: LogService;

    private constructor() {
        super();
        this.logger = LogService.getInstance();
    }

    /**
     * Get the ConfigManager instance
     */
    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Load configuration from a file
     * @param filePath Path to the configuration file
     */
    public loadFromFile(filePath: string): ModuleConfig {
        try {
            this.logger.info(`Loading configuration from ${filePath}`, 'ConfigManager');
            
            if (!fs.existsSync(filePath)) {
                throw new Error(`Configuration file not found: ${filePath}`);
            }

            const fileContent = fs.readFileSync(filePath, 'utf8');
            const parsedConfig = JSON.parse(fileContent) as ModuleConfig;
            
            this.configPath = filePath;
            this.setConfig(parsedConfig);
            
            return this.config;
        } catch (error) {
            const formattedError = createErrorFromException(error);
            this.logger.error(`Failed to load configuration: ${formattedError.message}`, 'ConfigManager');
            throw formattedError;
        }
    }

    /**
     * Save configuration to a file
     * @param filePath Path to save the configuration file (optional, uses last loaded path if not specified)
     */
    public saveToFile(filePath?: string): void {
        try {
            const saveFilePath = filePath || this.configPath;
            
            if (!saveFilePath) {
                throw new Error('No file path specified and no previous file path available');
            }

            this.logger.info(`Saving configuration to ${saveFilePath}`, 'ConfigManager');
            
            // Ensure directory exists
            const dirPath = path.dirname(saveFilePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            
            const configJson = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(saveFilePath, configJson, 'utf8');
            
            this.configPath = saveFilePath;
            this.emit('configSaved', { filePath: saveFilePath });
        } catch (error) {
            const formattedError = createErrorFromException(error);
            this.logger.error(`Failed to save configuration: ${formattedError.message}`, 'ConfigManager');
            throw formattedError;
        }
    }

    /**
     * Set the configuration
     * @param config Module configuration
     */
    public setConfig(config: ModuleConfig): void {
        try {
            // Validate the configuration
            this.validateConfig(config);
            
            this.config = config;
            this.emit('configUpdated', { config });
            
            this.logger.info('Configuration updated', 'ConfigManager');
        } catch (error) {
            const formattedError = createErrorFromException(error);
            this.logger.error(`Failed to set configuration: ${formattedError.message}`, 'ConfigManager');
            throw formattedError;
        }
    }

    /**
     * Get the current configuration
     */
    public getConfig(): ModuleConfig {
        return this.config;
    }

    /**
     * Add a device to the configuration
     * @param device Device configuration
     */
    public addDevice(device: DeviceConfig): void {
        if (this.getDevice(device.id)) {
            throw new Error(`Device with ID ${device.id} already exists`);
        }

        this.validateDeviceConfig(device);
        this.config.devices.push(device);
        
        this.emit('deviceAdded', { deviceId: device.id });
        this.logger.info(`Device added: ${device.id}`, 'ConfigManager');
    }

    /**
     * Update a device in the configuration
     * @param device Device configuration
     */
    public updateDevice(device: DeviceConfig): void {
        const index = this.config.devices.findIndex(d => d.id === device.id);
        
        if (index === -1) {
            throw new Error(`Device with ID ${device.id} not found`);
        }

        this.validateDeviceConfig(device);
        this.config.devices[index] = device;
        
        this.emit('deviceUpdated', { deviceId: device.id });
        this.logger.info(`Device updated: ${device.id}`, 'ConfigManager');
    }

    /**
     * Remove a device from the configuration
     * @param deviceId Device ID
     */
    public removeDevice(deviceId: string): void {
        const index = this.config.devices.findIndex(d => d.id === deviceId);
        
        if (index === -1) {
            throw new Error(`Device with ID ${deviceId} not found`);
        }

        this.config.devices.splice(index, 1);
        
        this.emit('deviceRemoved', { deviceId });
        this.logger.info(`Device removed: ${deviceId}`, 'ConfigManager');
    }

    /**
     * Get a device from the configuration
     * @param deviceId Device ID
     */
    public getDevice(deviceId: string): DeviceConfig | undefined {
        return this.config.devices.find(d => d.id === deviceId);
    }

    /**
     * Get all devices from the configuration
     */
    public getAllDevices(): DeviceConfig[] {
        return [...this.config.devices];
    }

    /**
     * Add a parameter to a device
     * @param deviceId Device ID
     * @param parameter Parameter configuration
     */
    public addParameter(deviceId: string, parameter: ParameterConfig): void {
        const device = this.getDevice(deviceId);
        
        if (!device) {
            throw new Error(`Device with ID ${deviceId} not found`);
        }

        if (device.parameters.some(p => p.name === parameter.name)) {
            throw new Error(`Parameter with name ${parameter.name} already exists in device ${deviceId}`);
        }

        this.validateParameterConfig(parameter);
        device.parameters.push(parameter);
        
        this.emit('parameterAdded', { deviceId, parameterName: parameter.name });
        this.logger.info(`Parameter added: ${parameter.name} to device ${deviceId}`, 'ConfigManager');
    }

    /**
     * Update a parameter in a device
     * @param deviceId Device ID
     * @param parameter Parameter configuration
     */
    public updateParameter(deviceId: string, parameter: ParameterConfig): void {
        const device = this.getDevice(deviceId);
        
        if (!device) {
            throw new Error(`Device with ID ${deviceId} not found`);
        }

        const index = device.parameters.findIndex(p => p.name === parameter.name);
        
        if (index === -1) {
            throw new Error(`Parameter with name ${parameter.name} not found in device ${deviceId}`);
        }

        this.validateParameterConfig(parameter);
        device.parameters[index] = parameter;
        
        this.emit('parameterUpdated', { deviceId, parameterName: parameter.name });
        this.logger.info(`Parameter updated: ${parameter.name} in device ${deviceId}`, 'ConfigManager');
    }

    /**
     * Remove a parameter from a device
     * @param deviceId Device ID
     * @param parameterName Parameter name
     */
    public removeParameter(deviceId: string, parameterName: string): void {
        const device = this.getDevice(deviceId);
        
        if (!device) {
            throw new Error(`Device with ID ${deviceId} not found`);
        }

        const index = device.parameters.findIndex(p => p.name === parameterName);
        
        if (index === -1) {
            throw new Error(`Parameter with name ${parameterName} not found in device ${deviceId}`);
        }

        device.parameters.splice(index, 1);
        
        this.emit('parameterRemoved', { deviceId, parameterName });
        this.logger.info(`Parameter removed: ${parameterName} from device ${deviceId}`, 'ConfigManager');
    }

    /**
     * Get a parameter from a device
     * @param deviceId Device ID
     * @param parameterName Parameter name
     */
    public getParameter(deviceId: string, parameterName: string): ParameterConfig | undefined {
        const device = this.getDevice(deviceId);
        
        if (!device) {
            return undefined;
        }

        return device.parameters.find(p => p.name === parameterName);
    }

    /**
     * Get all parameters from a device
     * @param deviceId Device ID
     */
    public getDeviceParameters(deviceId: string): ParameterConfig[] {
        const device = this.getDevice(deviceId);
        
        if (!device) {
            return [];
        }

        return [...device.parameters];
    }

    /**
     * Validate the module configuration
     * @param config Module configuration to validate
     */
    private validateConfig(config: ModuleConfig): void {
        if (!config) {
            throw new Error('Configuration is null or undefined');
        }

        if (!Array.isArray(config.devices)) {
            throw new Error('Configuration must have a devices array');
        }

        // Check for duplicate device IDs
        const deviceIds = new Set<string>();
        
        for (const device of config.devices) {
            if (deviceIds.has(device.id)) {
                throw new Error(`Duplicate device ID: ${device.id}`);
            }
            deviceIds.add(device.id);
            
            this.validateDeviceConfig(device);
        }
    }

    /**
     * Validate a device configuration
     * @param device Device configuration to validate
     */
    private validateDeviceConfig(device: DeviceConfig): void {
        if (!device.id) {
            throw new Error('Device must have an ID');
        }

        if (!device.name) {
            throw new Error(`Device ${device.id} must have a name`);
        }

        if (!device.protocolType) {
            throw new Error(`Device ${device.id} must have a protocol type`);
        }

        if (!device.connectionOptions) {
            throw new Error(`Device ${device.id} must have connection options`);
        }

        if (!Array.isArray(device.parameters)) {
            throw new Error(`Device ${device.id} must have a parameters array`);
        }

        // Check for duplicate parameter names
        const parameterNames = new Set<string>();
        
        for (const parameter of device.parameters) {
            if (parameterNames.has(parameter.name)) {
                throw new Error(`Duplicate parameter name in device ${device.id}: ${parameter.name}`);
            }
            parameterNames.add(parameter.name);
            
            this.validateParameterConfig(parameter);
        }

        // Validate poll groups if present
        if (device.pollGroups) {
            if (!Array.isArray(device.pollGroups)) {
                throw new Error(`Device ${device.id} poll groups must be an array`);
            }

            // Check for duplicate poll group IDs
            const pollGroupIds = new Set<string>();
            
            for (const pollGroup of device.pollGroups) {
                if (!pollGroup.id) {
                    throw new Error(`Poll group in device ${device.id} must have an ID`);
                }

                if (pollGroupIds.has(pollGroup.id)) {
                    throw new Error(`Duplicate poll group ID in device ${device.id}: ${pollGroup.id}`);
                }
                pollGroupIds.add(pollGroup.id);

                if (!pollGroup.name) {
                    throw new Error(`Poll group ${pollGroup.id} in device ${device.id} must have a name`);
                }

                if (!Array.isArray(pollGroup.parameterNames)) {
                    throw new Error(`Poll group ${pollGroup.id} in device ${device.id} must have a parameterNames array`);
                }

                // Validate that all parameter names exist in the device
                for (const paramName of pollGroup.parameterNames) {
                    if (!parameterNames.has(paramName)) {
                        throw new Error(
                            `Poll group ${pollGroup.id} in device ${device.id} references non-existent parameter: ${paramName}`
                        );
                    }
                }

                if (pollGroup.intervalMs !== undefined && (typeof pollGroup.intervalMs !== 'number' || pollGroup.intervalMs <= 0)) {
                    throw new Error(
                        `Poll group ${pollGroup.id} in device ${device.id} must have a positive interval`
                    );
                }
            }
        }
    }

    /**
     * Validate a parameter configuration
     * @param parameter Parameter configuration to validate
     */
    private validateParameterConfig(parameter: ParameterConfig): void {
        if (!parameter.name) {
            throw new Error('Parameter must have a name');
        }

        if (parameter.address === undefined || parameter.address < 0) {
            throw new Error(`Parameter ${parameter.name} must have a valid address`);
        }

        if (!parameter.registerType) {
            throw new Error(`Parameter ${parameter.name} must have a register type`);
        }

        if (!parameter.dataType) {
            throw new Error(`Parameter ${parameter.name} must have a data type`);
        }

        // Additional validation based on data type
        if ((parameter.dataType === 'string' || parameter.dataType === 'byteArray') && 
            (!parameter.length || parameter.length <= 0)) {
            throw new Error(`Parameter ${parameter.name} of type ${parameter.dataType} must have a positive length`);
        }

        // Validate bit index
        if (parameter.bitIndex !== undefined && 
            (parameter.bitIndex < 0 || parameter.bitIndex > 15)) {
            throw new Error(`Parameter ${parameter.name} has invalid bit index: ${parameter.bitIndex}. Must be between 0 and 15.`);
        }

        // Validate scaling factor
        if (parameter.scaling !== undefined && typeof parameter.scaling !== 'number') {
            throw new Error(`Parameter ${parameter.name} has invalid scaling factor: ${parameter.scaling}. Must be a number.`);
        }

        // Validate alarm and warning thresholds
        if (parameter.alarmHigh !== undefined && parameter.alarmLow !== undefined &&
            parameter.alarmHigh < parameter.alarmLow) {
            throw new Error(
                `Parameter ${parameter.name} has invalid alarm thresholds: high (${parameter.alarmHigh}) < low (${parameter.alarmLow})`
            );
        }

        if (parameter.warningHigh !== undefined && parameter.warningLow !== undefined &&
            parameter.warningHigh < parameter.warningLow) {
            throw new Error(
                `Parameter ${parameter.name} has invalid warning thresholds: high (${parameter.warningHigh}) < low (${parameter.warningLow})`
            );
        }

        // Validate deadband
        if (parameter.deadband !== undefined && parameter.deadband < 0) {
            throw new Error(`Parameter ${parameter.name} has invalid deadband: ${parameter.deadband}. Must be non-negative.`);
        }
    }
}