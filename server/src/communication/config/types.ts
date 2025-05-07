/**
 * Communication module configuration types
 */

export interface ModbusConfig {
  /** Default timeout for Modbus operations in milliseconds */
  timeout: number;
  /** Maximum number of retries for failed operations */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Default slave ID/unit ID if not specified */
  defaultUnitId: number;
  /** Maximum PDU size (default: 253) */
  maxPDUSize: number;
  /** TCP-specific configuration */
  tcp: {
    /** Default port for Modbus TCP (default: 502) */
    defaultPort: number;
    /** Connection timeout in milliseconds */
    connectionTimeout: number;
    /** Whether to use transaction IDs */
    useTransactionIds: boolean;
  };
  /** RTU-specific configuration */
  rtu: {
    /** Default baud rate (default: 9600) */
    defaultBaudRate: number;
    /** Default data bits (default: 8) */
    defaultDataBits: 5 | 6 | 7 | 8;
    /** Default stop bits (default: 1) */
    defaultStopBits: 1 | 2;
    /** Default parity (default: 'none') */
    defaultParity: 'none' | 'even' | 'odd';
    /** Maximum attempts for port allocation */
    maxPortAttempts: number;
    /** Port open timeout in milliseconds */
    portOpenTimeout: number;
    /** Allow concurrent register reads */
    allowConcurrentReads: boolean;
  };
}

export interface DeviceConfig {
  /** Maximum devices to manage */
  maxDevices: number;
  /** Default polling interval in milliseconds */
  defaultPollingInterval: number;
  /** Default values for byte ordering strategies */
  byteOrder: {
    /** Default byte order for 16-bit values */
    default16Bit: 'AB' | 'BA';
    /** Default byte order for 32-bit values */
    default32Bit: 'ABCD' | 'CDAB' | 'BADC' | 'DCBA';
    /** Default byte order for 64-bit values */
    default64Bit: 'ABCDEFGH' | 'GHEFCDAB' | 'BADCFEHG' | 'HGFEDCBA';
  };
}

export interface LoggingConfig {
  /** Minimum log level to display */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Whether to include timestamps in log messages */
  includeTimestamps: boolean;
  /** Whether to color log messages */
  useColors: boolean;
  /** Whether to log to a file */
  logToFile: boolean;
  /** Path to log file if enabled */
  logFilePath?: string;
  /** Maximum log file size in bytes */
  maxLogFileSize?: number;
}

export interface CacheConfig {
  /** Whether caching is enabled */
  enabled: boolean;
  /** Default time-to-live for cache entries in milliseconds */
  defaultTTL: number;
  /** Maximum entries in cache */
  maxEntries: number;
  /** Whether to enable cache invalidation on errors */
  invalidateOnError: boolean;
}

export interface PollingConfig {
  /** Minimum allowed polling interval in milliseconds */
  minInterval: number;
  /** Maximum allowed polling interval in milliseconds */
  maxInterval: number;
  /** Whether to automatically adjust polling interval based on performance */
  adaptivePolling: boolean;
  /** Maximum concurrent polling operations */
  maxConcurrentPolls: number;
  /** Default batch size for parameter grouping */
  defaultBatchSize: number;
  /** Maximum batch size for parameter grouping */
  maxBatchSize: number;
}

export interface CommunicationConfig {
  modbus: ModbusConfig;
  device: DeviceConfig;
  logging: LoggingConfig;
  cache: CacheConfig;
  polling: PollingConfig;
}