import { EventEmitter } from '../core/events';
import { LogLevel, LogEntry } from '../core/types';

/**
 * Log handler interface - Implementations handle log entries
 */
export interface LogHandler {
    handle(entry: LogEntry): void;
}

/**
 * Console log handler - Writes log entries to the console
 */
export class ConsoleLogHandler implements LogHandler {
    private readonly levelColors: Record<LogLevel, string> = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m'  // Red
    };

    private readonly resetColor = '\x1b[0m';

    /**
     * Handle a log entry by writing it to the console
     * @param entry Log entry to handle
     */
    public handle(entry: LogEntry): void {
        const color = this.levelColors[entry.level] || '';
        const timestamp = entry.timestamp.toISOString();
        const context = entry.context ? ` [${entry.context}]` : '';
        const levelPadded = entry.level.toUpperCase().padEnd(5);
        
        let message = `${timestamp} ${color}${levelPadded}${this.resetColor}${context}: ${entry.message}`;
        
        // Add data if available
        if (entry.data !== undefined) {
            try {
                const dataString = typeof entry.data === 'string' 
                    ? entry.data 
                    : JSON.stringify(entry.data, null, 2);
                message += `\n${dataString}`;
            } catch (error) {
                message += `\n[Error serializing data: ${error instanceof Error ? error.message : String(error)}]`;
            }
        }
        
        switch (entry.level) {
            case LogLevel.ERROR:
                console.error(message);
                break;
            case LogLevel.WARN:
                console.warn(message);
                break;
            case LogLevel.INFO:
                console.info(message);
                break;
            case LogLevel.DEBUG:
            default:
                console.debug(message);
                break;
        }
    }
}

/**
 * In-memory log handler - Stores log entries in memory
 */
export class InMemoryLogHandler implements LogHandler {
    private entries: LogEntry[] = [];
    private readonly maxEntries: number;
    
    /**
     * Create an in-memory log handler
     * @param maxEntries Maximum number of entries to store
     */
    constructor(maxEntries: number = 1000) {
        this.maxEntries = maxEntries;
    }
    
    /**
     * Handle a log entry by storing it in memory
     * @param entry Log entry to handle
     */
    public handle(entry: LogEntry): void {
        this.entries.push({ ...entry });
        
        // Trim if necessary
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(-this.maxEntries);
        }
    }
    
    /**
     * Get all stored log entries
     */
    public getEntries(): LogEntry[] {
        return [...this.entries];
    }
    
    /**
     * Get entries filtered by level and/or context
     * @param level Optional level to filter by
     * @param context Optional context to filter by
     */
    public getFilteredEntries(level?: LogLevel, context?: string): LogEntry[] {
        return this.entries.filter(entry => {
            const levelMatch = level === undefined || entry.level === level;
            const contextMatch = context === undefined || entry.context === context;
            return levelMatch && contextMatch;
        });
    }
    
    /**
     * Clear all stored entries
     */
    public clear(): void {
        this.entries = [];
    }
}

/**
 * LogService for centralized logging
 */
export class LogService extends EventEmitter {
    private static instance: LogService;
    private handlers: LogHandler[] = [];
    private minLevel: LogLevel = LogLevel.INFO;
    
    private constructor() {
        super();
    }
    
    /**
     * Get the LogService instance
     */
    public static getInstance(): LogService {
        if (!LogService.instance) {
            LogService.instance = new LogService();
            // Add default console handler
            LogService.instance.addHandler(new ConsoleLogHandler());
        }
        return LogService.instance;
    }
    
    /**
     * Set the minimum log level
     * @param level Minimum log level
     */
    public setMinLevel(level: LogLevel): void {
        this.minLevel = level;
    }
    
    /**
     * Get the current minimum log level
     */
    public getMinLevel(): LogLevel {
        return this.minLevel;
    }
    
    /**
     * Add a log handler
     * @param handler Handler to add
     */
    public addHandler(handler: LogHandler): void {
        this.handlers.push(handler);
    }
    
    /**
     * Remove a log handler
     * @param handler Handler to remove
     */
    public removeHandler(handler: LogHandler): void {
        const index = this.handlers.indexOf(handler);
        if (index !== -1) {
            this.handlers.splice(index, 1);
        }
    }
    
    /**
     * Clear all handlers
     */
    public clearHandlers(): void {
        this.handlers = [];
    }
    
    /**
     * Log a message at the specified level
     * @param level Log level
     * @param message Log message
     * @param context Optional context
     * @param data Optional data
     */
    public log(level: LogLevel, message: string, context?: string, data?: any): void {
        // Skip if level is below minimum
        if (this.getLevelValue(level) < this.getLevelValue(this.minLevel)) {
            return;
        }
        
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            context,
            data
        };
        
        // Process the entry with all handlers
        for (const handler of this.handlers) {
            try {
                handler.handle(entry);
            } catch (error) {
                console.error(`Error in log handler: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        
        // Emit the entry
        this.emit('log', entry);
    }
    
    /**
     * Log a debug message
     * @param message Log message
     * @param context Optional context
     * @param data Optional data
     */
    public debug(message: string, context?: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, context, data);
    }
    
    /**
     * Log an info message
     * @param message Log message
     * @param context Optional context
     * @param data Optional data
     */
    public info(message: string, context?: string, data?: any): void {
        this.log(LogLevel.INFO, message, context, data);
    }
    
    /**
     * Log a warning message
     * @param message Log message
     * @param context Optional context
     * @param data Optional data
     */
    public warn(message: string, context?: string, data?: any): void {
        this.log(LogLevel.WARN, message, context, data);
    }
    
    /**
     * Log an error message
     * @param message Log message
     * @param context Optional context
     * @param data Optional data
     */
    public error(message: string, context?: string, data?: any): void {
        this.log(LogLevel.ERROR, message, context, data);
    }
    
    /**
     * Log an error object
     * @param error Error object
     * @param context Optional context
     * @param additionalData Optional additional data
     */
    public logError(error: Error, context?: string, additionalData?: any): void {
        const message = error.message || 'Unknown error';
        const data = {
            name: error.name,
            stack: error.stack,
            ...additionalData
        };
        
        this.error(message, context, data);
    }
    
    /**
     * Get a numeric value for a log level for comparison
     * @param level Log level
     */
    private getLevelValue(level: LogLevel): number {
        switch (level) {
            case LogLevel.DEBUG:
                return 0;
            case LogLevel.INFO:
                return 1;
            case LogLevel.WARN:
                return 2;
            case LogLevel.ERROR:
                return 3;
            default:
                return -1;
        }
    }
}