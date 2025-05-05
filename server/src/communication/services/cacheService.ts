import { EventEmitter } from '../core/events';
import { Parameter, ParameterValue } from '../core/types';

/**
 * Interface for a cached parameter value
 */
interface CachedValue {
    value: any;
    timestamp: Date;
    quality: 'good' | 'bad' | 'uncertain';
    ttl: number; // Time-to-live in milliseconds
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
    defaultTtl: number; // Default time-to-live in milliseconds
    maxSize?: number; // Maximum number of entries in the cache
    checkInterval?: number; // Interval to check for expired entries in milliseconds
}

/**
 * Value change notification
 */
export interface ValueChangeNotification {
    deviceId: string;
    parameter: Parameter;
    oldValue?: any;
    newValue: any;
    timestamp: Date;
}

/**
 * Service for caching parameter values
 */
export class CacheService extends EventEmitter {
    private static instance: CacheService;
    private cache: Map<string, Map<string, CachedValue>> = new Map();
    private options: CacheOptions;
    private cleanupTimer: NodeJS.Timeout | null = null;

    private constructor(options: CacheOptions) {
        super();
        this.options = {
            defaultTtl: options.defaultTtl || 60000, // Default: 1 minute
            maxSize: options.maxSize || 10000, // Default: 10,000 entries
            checkInterval: options.checkInterval || 60000 // Default: 1 minute
        };

        // Start automatic cleanup if checkInterval is specified
        if (this.options.checkInterval > 0) {
            this.cleanupTimer = setInterval(() => {
                this.cleanup();
            }, this.options.checkInterval);
        }
    }

    /**
     * Get the CacheService instance
     * @param options Cache configuration options
     */
    public static getInstance(options?: CacheOptions): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService(options || {
                defaultTtl: 60000, // Default: 1 minute
                maxSize: 10000, // Default: 10,000 entries
                checkInterval: 60000 // Default: 1 minute
            });
        }
        return CacheService.instance;
    }

    /**
     * Store a parameter value in the cache
     * @param deviceId Device ID
     * @param parameter Parameter object or parameter name
     * @param value Parameter value
     * @param quality Value quality
     * @param ttl Time-to-live in milliseconds (optional)
     */
    public setValue(
        deviceId: string,
        parameter: Parameter | string,
        value: any,
        quality: 'good' | 'bad' | 'uncertain' = 'good',
        ttl?: number
    ): void {
        const paramName = typeof parameter === 'string' ? parameter : parameter.name;
        const parameterObj = typeof parameter === 'string' ? undefined : parameter;

        // Initialize device cache if needed
        if (!this.cache.has(deviceId)) {
            this.cache.set(deviceId, new Map());
        }

        const deviceCache = this.cache.get(deviceId)!;

        // Check for value change
        const oldCachedValue = deviceCache.get(paramName);
        const isValueChanged = oldCachedValue && oldCachedValue.value !== value;

        // Create new cached value
        const cachedValue: CachedValue = {
            value,
            timestamp: new Date(),
            quality,
            ttl: ttl || this.options.defaultTtl
        };

        // Store the value
        deviceCache.set(paramName, cachedValue);

        // Emit value change event if value has changed
        if (isValueChanged) {
            this.emit('valueChanged', {
                deviceId,
                parameter: parameterObj || { name: paramName },
                oldValue: oldCachedValue?.value,
                newValue: value,
                timestamp: cachedValue.timestamp
            });
        }

        // Check cache size
        if (this.options.maxSize && deviceCache.size > this.options.maxSize) {
            this.evictOldest(deviceId);
        }
    }

    /**
     * Store multiple parameter values in the cache
     * @param deviceId Device ID
     * @param values Array of parameter values
     * @param ttl Time-to-live in milliseconds (optional)
     */
    public setValues(
        deviceId: string,
        values: ParameterValue[],
        ttl?: number
    ): void {
        for (const { parameter, value, quality, timestamp } of values) {
            this.setValue(deviceId, parameter, value, quality, ttl);
        }
    }

    /**
     * Get a parameter value from the cache
     * @param deviceId Device ID
     * @param paramName Parameter name
     * @param includeExpired Whether to include expired values
     */
    public getValue(
        deviceId: string,
        paramName: string,
        includeExpired: boolean = false
    ): ParameterValue | undefined {
        const deviceCache = this.cache.get(deviceId);
        if (!deviceCache) {
            return undefined;
        }

        const cachedValue = deviceCache.get(paramName);
        if (!cachedValue) {
            return undefined;
        }

        // Check if value is expired
        if (!includeExpired && this.isExpired(cachedValue)) {
            return undefined;
        }

        return {
            parameter: { name: paramName },
            value: cachedValue.value,
            timestamp: cachedValue.timestamp,
            quality: cachedValue.quality
        };
    }

    /**
     * Get multiple parameter values from the cache
     * @param deviceId Device ID
     * @param paramNames Array of parameter names
     * @param includeExpired Whether to include expired values
     */
    public getValues(
        deviceId: string,
        paramNames: string[],
        includeExpired: boolean = false
    ): ParameterValue[] {
        return paramNames
            .map(paramName => this.getValue(deviceId, paramName, includeExpired))
            .filter((value): value is ParameterValue => value !== undefined);
    }

    /**
     * Get all parameter values for a device
     * @param deviceId Device ID
     * @param includeExpired Whether to include expired values
     */
    public getAllValues(
        deviceId: string,
        includeExpired: boolean = false
    ): ParameterValue[] {
        const deviceCache = this.cache.get(deviceId);
        if (!deviceCache) {
            return [];
        }

        const values: ParameterValue[] = [];

        for (const [paramName, cachedValue] of deviceCache.entries()) {
            if (includeExpired || !this.isExpired(cachedValue)) {
                values.push({
                    parameter: { name: paramName },
                    value: cachedValue.value,
                    timestamp: cachedValue.timestamp,
                    quality: cachedValue.quality
                });
            }
        }

        return values;
    }

    /**
     * Check if a parameter value exists in the cache
     * @param deviceId Device ID
     * @param paramName Parameter name
     * @param includeExpired Whether to include expired values
     */
    public hasValue(
        deviceId: string,
        paramName: string,
        includeExpired: boolean = false
    ): boolean {
        const deviceCache = this.cache.get(deviceId);
        if (!deviceCache) {
            return false;
        }

        const cachedValue = deviceCache.get(paramName);
        if (!cachedValue) {
            return false;
        }

        return includeExpired || !this.isExpired(cachedValue);
    }

    /**
     * Remove a parameter value from the cache
     * @param deviceId Device ID
     * @param paramName Parameter name
     */
    public removeValue(deviceId: string, paramName: string): boolean {
        const deviceCache = this.cache.get(deviceId);
        if (!deviceCache) {
            return false;
        }

        return deviceCache.delete(paramName);
    }

    /**
     * Remove all parameter values for a device
     * @param deviceId Device ID
     */
    public clearDevice(deviceId: string): boolean {
        return this.cache.delete(deviceId);
    }

    /**
     * Clear the entire cache
     */
    public clearAll(): void {
        this.cache.clear();
        this.emit('cacheCleared');
    }

    /**
     * Get the number of cached values for a device
     * @param deviceId Device ID
     */
    public getDeviceCacheSize(deviceId: string): number {
        const deviceCache = this.cache.get(deviceId);
        return deviceCache ? deviceCache.size : 0;
    }

    /**
     * Get the total number of cached values
     */
    public getTotalCacheSize(): number {
        let total = 0;
        for (const deviceCache of this.cache.values()) {
            total += deviceCache.size;
        }
        return total;
    }

    /**
     * Get cache statistics
     */
    public getStatistics(): {
        devices: number;
        values: number;
        expired: number;
    } {
        let devices = 0;
        let values = 0;
        let expired = 0;

        for (const [, deviceCache] of this.cache.entries()) {
            devices++;
            for (const cachedValue of deviceCache.values()) {
                values++;
                if (this.isExpired(cachedValue)) {
                    expired++;
                }
            }
        }

        return {
            devices,
            values,
            expired
        };
    }

    /**
     * Check if a cached value is expired
     * @param cachedValue Cached value to check
     */
    private isExpired(cachedValue: CachedValue): boolean {
        const now = new Date().getTime();
        const expirationTime = cachedValue.timestamp.getTime() + cachedValue.ttl;
        return now > expirationTime;
    }

    /**
     * Remove expired entries from the cache
     */
    private cleanup(): void {
        const now = new Date().getTime();
        let removedCount = 0;

        for (const [deviceId, deviceCache] of this.cache.entries()) {
            for (const [paramName, cachedValue] of deviceCache.entries()) {
                const expirationTime = cachedValue.timestamp.getTime() + cachedValue.ttl;
                if (now > expirationTime) {
                    deviceCache.delete(paramName);
                    removedCount++;
                }
            }

            // Remove device if its cache is empty
            if (deviceCache.size === 0) {
                this.cache.delete(deviceId);
            }
        }

        if (removedCount > 0) {
            this.emit('cacheCleanup', {
                removedCount,
                timestamp: new Date()
            });
        }
    }

    /**
     * Evict the oldest entry from a device's cache
     * @param deviceId Device ID
     */
    private evictOldest(deviceId: string): void {
        const deviceCache = this.cache.get(deviceId);
        if (!deviceCache || deviceCache.size === 0) {
            return;
        }

        let oldestKey: string | null = null;
        let oldestTimestamp: Date | null = null;

        for (const [key, value] of deviceCache.entries()) {
            if (oldestTimestamp === null || value.timestamp < oldestTimestamp) {
                oldestKey = key;
                oldestTimestamp = value.timestamp;
            }
        }

        if (oldestKey) {
            deviceCache.delete(oldestKey);
            this.emit('cacheEviction', {
                deviceId,
                parameterName: oldestKey,
                timestamp: new Date()
            });
        }
    }

    /**
     * Dispose of the cache service
     */
    public dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}