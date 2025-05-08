/**
 * Logging configuration file
 */

// Set log level based on environment
export const LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Set maxFiles based on environment
export const MAX_LOG_FILES = 5;

// Set maximum log file size
export const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

// Set log paths
export const LOG_FILE_PATH = process.env.NODE_ENV === 'production' 
  ? '/var/log/macsys'  // Production path
  : './logs';          // Development path

// Enable console logging in development
export const CONSOLE_LOGGING = process.env.NODE_ENV !== 'production';

// Enable JSON format in production
export const USE_JSON_FORMAT = process.env.NODE_ENV === 'production';