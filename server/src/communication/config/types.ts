import { 
    ConnectionOptions, 
    TcpConnectionOptions,
    RtuConnectionOptions,
    ByteOrder,
    RegisterType,
    DataType 
} from '../core/types';

/**
 * Protocol types supported by the communication module
 */
export enum ProtocolType {
    MODBUS_TCP = 'modbus-tcp',
    MODBUS_RTU = 'modbus-rtu'
}

/**
 * Interface for parameter configuration
 */
export interface ParameterConfig {
    name: string;
    displayName?: string;
    address: number;
    registerType: RegisterType;
    dataType: DataType;
    byteOrder?: ByteOrder;
    scaling?: number;
    offset?: number;
    units?: string;
    description?: string;
    readOnly?: boolean;
    isDigital?: boolean;
    length?: number; // For string data types
    bitIndex?: number; // For bit-level access within registers
    alarmHigh?: number;
    alarmLow?: number;
    warningHigh?: number;
    warningLow?: number;
    deadband?: number;
    engineeringUnits?: string;
    metadata?: Record<string, any>;
}

/**
 * Interface for device configuration
 */
export interface DeviceConfig {
    id: string;
    name: string;
    description?: string;
    protocolType: ProtocolType;
    connectionOptions: ConnectionOptions | TcpConnectionOptions | RtuConnectionOptions;
    parameters: ParameterConfig[];
    pollGroups?: PollGroupConfig[];
    metadata?: Record<string, any>;
}

/**
 * Interface for poll group configuration
 */
export interface PollGroupConfig {
    id: string;
    name: string;
    description?: string;
    parameterNames: string[];
    intervalMs: number;
    enabled?: boolean;
    priority?: 'high' | 'normal' | 'low';
}

/**
 * Interface for module configuration
 */
export interface ModuleConfig {
    devices: DeviceConfig[];
    defaultPollInterval?: number;
    defaultRequestTimeout?: number;
    cacheOptions?: {
        enabled?: boolean;
        defaultTtl?: number;
        maxSize?: number;
        checkInterval?: number;
    };
    logOptions?: {
        level?: string;
        console?: boolean;
        file?: {
            enabled?: boolean;
            path?: string;
            maxSize?: number;
            maxFiles?: number;
        };
    };
}