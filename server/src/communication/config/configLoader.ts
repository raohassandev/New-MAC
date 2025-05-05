import { ModuleConfig, DeviceConfig, ParameterConfig, ProtocolType } from './types';
import { ConfigManager } from './configManager';
import { DeviceManager } from '../services/deviceManager';
import { PollingService } from '../services/pollingService';
import { LogService } from '../services/logService';
import { CacheService } from '../services/cacheService';
import { ModbusTcpClient } from '../protocols/modbus/tcp/client';
import { ModbusRtuClient } from '../protocols/modbus/rtu/client';
import { Parameter, LogLevel, TcpConnectionOptions, RtuConnectionOptions } from '../core/types';
import { ConcreteDevice } from '../core/device.concrete';
import { Protocol } from '../core/protocol.interface';
import { createError, createErrorFromException } from '../core/errors';

/**
 * ConfigLoader class - responsible for loading configurations and creating instances
 */
export class ConfigLoader {
    private static instance: ConfigLoader;
    private configManager: ConfigManager;
    private deviceManager: DeviceManager;
    private pollingService: PollingService;
    private logger: LogService;
    
    private constructor() {
        this.configManager = ConfigManager.getInstance();
        this.deviceManager = DeviceManager.getInstance();
        this.pollingService = PollingService.getInstance();
        this.logger = LogService.getInstance();
    }
    
    /**
     * Get the ConfigLoader instance
     */
    public static getInstance(): ConfigLoader {
        if (!ConfigLoader.instance) {
            ConfigLoader.instance = new ConfigLoader();
        }
        return ConfigLoader.instance;
    }
    
    /**
     * Load configuration and instantiate services
     * @param configPath Path to the configuration file (optional)
     */
    public async loadAndApply(configPath?: string): Promise<void> {
        try {
            // Load configuration
            let config: ModuleConfig;
            
            if (configPath) {
                config = this.configManager.loadFromFile(configPath);
            } else {
                config = this.configManager.getConfig();
            }
            
            // Initialize services
            this.initializeServices(config);
            
            // Create and register devices
            await this.createAndRegisterDevices(config.devices);
            
            this.logger.info('Configuration loaded and applied successfully', 'ConfigLoader');
        } catch (error) {
            const formattedError = createErrorFromException(error);
            this.logger.error(`Failed to load and apply configuration: ${formattedError.message}`, 'ConfigLoader');
            throw formattedError;
        }
    }
    
    /**
     * Initialize services based on configuration
     * @param config Module configuration
     */
    private initializeServices(config: ModuleConfig): void {
        // Configure logging
        if (config.logOptions) {
            const logLevel = this.parseLogLevel(config.logOptions.level || 'info');
            this.logger.setMinLevel(logLevel);
            this.logger.info(`Log level set to ${logLevel}`, 'ConfigLoader');
        }
        
        // Configure caching
        if (config.cacheOptions && config.cacheOptions.enabled !== false) {
            CacheService.getInstance({
                defaultTtl: config.cacheOptions.defaultTtl || 60000,
                maxSize: config.cacheOptions.maxSize || 10000,
                checkInterval: config.cacheOptions.checkInterval || 60000
            });
            this.logger.info('Cache service initialized', 'ConfigLoader');
        }
        
        // Initialize polling service with resolvers
        this.pollingService.initialize(
            // Device resolver
            (deviceId: string) => this.deviceManager.getDevice(deviceId),
            // Parameter resolver
            (deviceId: string, paramName: string) => {
                const device = this.deviceManager.getDevice(deviceId) as AbstractDevice;
                if (!device) return undefined;
                return device.getParameter(paramName);
            }
        );
        this.logger.info('Polling service initialized', 'ConfigLoader');
    }
    
    /**
     * Create devices and register them with the device manager
     * @param deviceConfigs Device configurations
     */
    private async createAndRegisterDevices(deviceConfigs: DeviceConfig[]): Promise<void> {
        for (const deviceConfig of deviceConfigs) {
            try {
                // Create protocol instance
                const protocol = this.createProtocol(deviceConfig);
                
                // Register protocol
                this.deviceManager.registerProtocol(
                    `${deviceConfig.id}_protocol`,
                    protocol
                );
                
                // Create device parameters
                const parameters = deviceConfig.parameters.map(paramConfig => 
                    this.createParameterFromConfig(paramConfig)
                );
                
                // Create device instance
                const device = new ConcreteDevice(
                    deviceConfig.id,
                    deviceConfig.name,
                    protocol,
                    parameters,
                    deviceConfig.description
                );
                
                // Register device
                this.deviceManager.registerDevice(device);
                
                // Set up polling if configured
                if (deviceConfig.pollGroups) {
                    for (const pollGroup of deviceConfig.pollGroups) {
                        this.pollingService.addPollGroup({
                            id: `${deviceConfig.id}_${pollGroup.id}`,
                            deviceId: deviceConfig.id,
                            parameters: pollGroup.parameterNames,
                            interval: pollGroup.intervalMs,
                            description: pollGroup.description,
                            enabled: pollGroup.enabled !== false
                        });
                    }
                }
                
                this.logger.info(`Device ${deviceConfig.id} created and registered successfully`, 'ConfigLoader');
            } catch (error) {
                const formattedError = createErrorFromException(error);
                this.logger.error(
                    `Failed to create device ${deviceConfig.id}: ${formattedError.message}`,
                    'ConfigLoader'
                );
                // Continue with other devices
            }
        }
    }
    
    /**
     * Create a protocol instance based on device configuration
     * @param deviceConfig Device configuration
     */
    private createProtocol(deviceConfig: DeviceConfig): Protocol {
        switch (deviceConfig.protocolType) {
            case ProtocolType.MODBUS_TCP: {
                const options = deviceConfig.connectionOptions as TcpConnectionOptions;
                return new ModbusTcpClient(options);
            }
            case ProtocolType.MODBUS_RTU: {
                const options = deviceConfig.connectionOptions as RtuConnectionOptions;
                // Default slave address is 1 if not specified
                const unitId = (options as any).unitId || 1;
                return new ModbusRtuClient(options, unitId);
            }
            default:
                throw new Error(`Unsupported protocol type: ${deviceConfig.protocolType}`);
        }
    }
    
    /**
     * Create a Parameter object from parameter configuration
     * @param paramConfig Parameter configuration
     */
    private createParameterFromConfig(paramConfig: ParameterConfig): Parameter {
        return {
            name: paramConfig.name,
            address: paramConfig.address,
            registerType: paramConfig.registerType,
            dataType: paramConfig.dataType,
            byteOrder: paramConfig.byteOrder,
            scaling: paramConfig.scaling,
            units: paramConfig.units,
            description: paramConfig.description,
            readOnly: paramConfig.readOnly,
            length: paramConfig.length,
            bitIndex: paramConfig.bitIndex
        };
    }
    
    /**
     * Parse log level string to LogLevel enum
     * @param level Log level string
     */
    private parseLogLevel(level: string): LogLevel {
        const levelLower = level.toLowerCase();
        
        switch (levelLower) {
            case 'debug':
                return LogLevel.DEBUG;
            case 'info':
                return LogLevel.INFO;
            case 'warn':
            case 'warning':
                return LogLevel.WARN;
            case 'error':
                return LogLevel.ERROR;
            default:
                this.logger.warn(`Unknown log level: ${level}, defaulting to INFO`, 'ConfigLoader');
                return LogLevel.INFO;
        }
    }
}