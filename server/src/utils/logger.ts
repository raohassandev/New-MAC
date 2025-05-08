import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { 
  LOG_LEVEL, 
  MAX_LOG_FILES, 
  MAX_LOG_SIZE, 
  LOG_FILE_PATH,
  CONSOLE_LOGGING,
  USE_JSON_FORMAT
} from '../config/logging';

const { combine, timestamp, printf, colorize, align, json } = format;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../', LOG_FILE_PATH);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  align(),
  printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

// Custom format for file logs
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  align(),
  printf((info) => {
    const { timestamp, level, message, ...args } = info;
    const extraInfo = Object.keys(args).length ? JSON.stringify(args) : '';
    return `[${timestamp}] ${level}: ${message} ${extraInfo}`;
  })
);

// Create a logger specifically for Modbus operations
const modbusLogger = createLogger({
  level: 'debug',
  format: fileFormat,
  defaultMeta: { service: 'modbus-service' },
  transports: [
    // Console transport
    new transports.Console({
      format: consoleFormat,
    }),
    // File transport for all logs
    new transports.File({
      filename: path.join(logsDir, 'modbus.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for error logs
    new transports.File({
      level: 'error',
      filename: path.join(logsDir, 'modbus-error.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Create a logger for API requests
const apiLogger = createLogger({
  level: 'debug',
  format: fileFormat,
  defaultMeta: { service: 'api-service' },
  transports: [
    // Console transport
    new transports.Console({
      format: consoleFormat,
      level: 'info', // Only log info and above to console
    }),
    // File transport for all logs
    new transports.File({
      filename: path.join(logsDir, 'api.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for error logs
    new transports.File({
      level: 'error',
      filename: path.join(logsDir, 'api-error.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

export { modbusLogger, apiLogger };