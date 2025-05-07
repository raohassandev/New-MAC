/**
 * Logging service for the Communication Module
 */
import chalk from 'chalk';
import { LogLevel } from '../core/types';

/**
 * Interface for log format options
 */
interface LogFormatOptions {
  timestamp: boolean;
  color: boolean;
  level: boolean;
  source: boolean;
}

/**
 * Singleton service for centralized logging
 */
export class LogService {
  private static instance: LogService;
  private _level: LogLevel = LogLevel.INFO;
  private _enabled = true;
  private _formatOptions: LogFormatOptions = {
    timestamp: true,
    color: true,
    level: true,
    source: true,
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize with environment variables if available
    if (process.env.MODBUS_LOG_LEVEL) {
      const envLevel = process.env.MODBUS_LOG_LEVEL.toUpperCase();
      if (envLevel in LogLevel) {
        this._level = envLevel as LogLevel;
      }
    }

    if (process.env.MODBUS_LOG_ENABLED === 'false') {
      this._enabled = false;
    }
  }

  /**
   * Get the singleton instance
   * @returns The LogService instance
   */
  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  /**
   * Set the log level
   * @param level Log level
   */
  public setLevel(level: LogLevel): void {
    this._level = level;
  }

  /**
   * Get the current log level
   * @returns Current log level
   */
  public getLevel(): LogLevel {
    return this._level;
  }

  /**
   * Enable or disable logging
   * @param enabled Whether logging should be enabled
   */
  public setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * Check if logging is enabled
   * @returns True if logging is enabled
   */
  public isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Configure log format options
   * @param options Log format options
   */
  public setFormatOptions(options: Partial<LogFormatOptions>): void {
    this._formatOptions = {
      ...this._formatOptions,
      ...options,
    };
  }

  /**
   * Log a debug message
   * @param source Source of the log message
   * @param message Log message
   * @param data Optional data to log
   */
  public debug(source: string, message: string, data?: any): void {
    this._log(LogLevel.DEBUG, source, message, data);
  }

  /**
   * Log an info message
   * @param source Source of the log message
   * @param message Log message
   * @param data Optional data to log
   */
  public info(source: string, message: string, data?: any): void {
    this._log(LogLevel.INFO, source, message, data);
  }

  /**
   * Log a warning message
   * @param source Source of the log message
   * @param message Log message
   * @param data Optional data to log
   */
  public warn(source: string, message: string, data?: any): void {
    this._log(LogLevel.WARN, source, message, data);
  }

  /**
   * Log an error message
   * @param source Source of the log message
   * @param message Log message
   * @param error Optional error to log
   */
  public error(source: string, message: string, error?: Error | unknown): void {
    let errorData: any;

    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined) {
      errorData = error;
    }

    this._log(LogLevel.ERROR, source, message, errorData);
  }

  /**
   * Internal logging implementation
   * @param level Log level
   * @param source Source of the log message
   * @param message Log message
   * @param data Optional data to log
   */
  private _log(level: LogLevel, source: string, message: string, data?: any): void {
    // Skip if logging is disabled or level is not sufficient
    if (!this._enabled || !this._shouldLog(level)) {
      return;
    }

    // Build the log message
    let logMessage = '';

    // Add timestamp
    if (this._formatOptions.timestamp) {
      const timestamp = new Date().toISOString();
      logMessage += `${timestamp} `;
    }

    // Add level
    if (this._formatOptions.level) {
      let levelStr = `[${level}]`;

      if (this._formatOptions.color) {
        levelStr = this._colorizeLevel(level, levelStr);
      }

      logMessage += `${levelStr} `;
    }

    // Add source
    if (this._formatOptions.source && source) {
      let sourceStr = `[${source}]`;

      if (this._formatOptions.color) {
        sourceStr = chalk.cyan(sourceStr);
      }

      logMessage += `${sourceStr} `;
    }

    // Add message
    logMessage += message;

    // Log to console
    switch (level) {
      case LogLevel.DEBUG:
        if (data !== undefined) {
          console.debug(logMessage, data);
        } else {
          console.debug(logMessage);
        }
        break;

      case LogLevel.INFO:
        if (data !== undefined) {
          console.info(logMessage, data);
        } else {
          console.info(logMessage);
        }
        break;

      case LogLevel.WARN:
        if (data !== undefined) {
          console.warn(logMessage, data);
        } else {
          console.warn(logMessage);
        }
        break;

      case LogLevel.ERROR:
        if (data !== undefined) {
          console.error(logMessage, data);
        } else {
          console.error(logMessage);
        }
        break;
    }
  }

  /**
   * Check if a message with the given level should be logged
   * @param level Log level to check
   * @returns True if the message should be logged
   */
  private _shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const currentLevelIndex = levels.indexOf(this._level);
    const messageLevelIndex = levels.indexOf(level);

    // Only log if the message level is >= the current level
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Add color to a log level string
   * @param level Log level
   * @param text Text to colorize
   * @returns Colorized text
   */
  private _colorizeLevel(level: LogLevel, text: string): string {
    switch (level) {
      case LogLevel.DEBUG:
        return chalk.blue(text);
      case LogLevel.INFO:
        return chalk.green(text);
      case LogLevel.WARN:
        return chalk.yellow(text);
      case LogLevel.ERROR:
        return chalk.red(text);
      default:
        return text;
    }
  }
}
