/**
 * Log Service
 * 
 * Provides standardized logging functionality for the communication module
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class LogService {
  private logLevel: LogLevel = LogLevel.INFO;
  
  /**
   * Set the log level
   * @param level The log level to set
   */
  setLogLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      switch (level.toLowerCase()) {
        case 'debug':
          this.logLevel = LogLevel.DEBUG;
          break;
        case 'info':
          this.logLevel = LogLevel.INFO;
          break;
        case 'warn':
          this.logLevel = LogLevel.WARN;
          break;
        case 'error':
          this.logLevel = LogLevel.ERROR;
          break;
        default:
          this.logLevel = LogLevel.INFO;
      }
    } else {
      this.logLevel = level;
    }
    
    this.info(`Log level set to ${LogLevel[this.logLevel]}`);
  }
  
  /**
   * Get the current log level
   * @returns The current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
  
  /**
   * Log a debug message
   * @param message The message to log
   */
  debug(message: string): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`);
    }
  }
  
  /**
   * Log an info message
   * @param message The message to log
   */
  info(message: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.info(`[INFO] [${new Date().toISOString()}] ${message}`);
    }
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   */
  warn(message: string): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] [${new Date().toISOString()}] ${message}`);
    }
  }
  
  /**
   * Log an error message
   * @param message The message to log
   */
  error(message: string): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] [${new Date().toISOString()}] ${message}`);
    }
  }
}

// Export a singleton instance
export const logService = new LogService();