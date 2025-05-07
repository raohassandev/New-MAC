/**
 * Cache service for communication module
 */
import { ParameterValue } from '../core/types';
import { LogService } from './logService';

/**
 * Interface for cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: Date;
  expiresAt?: Date;
}

/**
 * Cache service for storing parameter values and other data
 */
export class CacheService {
  private static instance: CacheService;
  private _cache = new Map<string, Map<string, CacheEntry<any>>>();
  private _defaultTtl: number = 60 * 60 * 1000; // 1 hour in milliseconds
  private _cleanupInterval: NodeJS.Timeout | null = null;
  private _logger: LogService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this._logger = LogService.getInstance();
    this._startCleanupInterval();
  }

  /**
   * Get the singleton instance
   * @returns The CacheService instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set the default TTL (time to live) for cache entries
   * @param ttl TTL in milliseconds
   */
  public setDefaultTtl(ttl: number): void {
    this._defaultTtl = ttl;
  }

  /**
   * Get a value from the cache
   * @param namespace Cache namespace
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  public get<T>(namespace: string, key: string): T | undefined {
    // Get the namespace
    const namespaceCache = this._cache.get(namespace);
    if (!namespaceCache) {
      return undefined;
    }

    // Get the entry
    const entry = namespaceCache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      namespaceCache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache
   * @param namespace Cache namespace
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Optional TTL in milliseconds
   */
  public set<T>(namespace: string, key: string, value: T, ttl?: number): void {
    // Get or create the namespace
    let namespaceCache = this._cache.get(namespace);
    if (!namespaceCache) {
      namespaceCache = new Map<string, CacheEntry<any>>();
      this._cache.set(namespace, namespaceCache);
    }

    // Create the entry
    const now = new Date();
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
    };

    // Add expiration if TTL is provided
    if (ttl !== undefined) {
      entry.expiresAt = new Date(now.getTime() + ttl);
    } else if (this._defaultTtl > 0) {
      entry.expiresAt = new Date(now.getTime() + this._defaultTtl);
    }

    // Store the entry
    namespaceCache.set(key, entry);
  }

  /**
   * Delete a value from the cache
   * @param namespace Cache namespace
   * @param key Cache key
   * @returns True if the value was deleted
   */
  public delete(namespace: string, key: string): boolean {
    const namespaceCache = this._cache.get(namespace);
    if (!namespaceCache) {
      return false;
    }

    return namespaceCache.delete(key);
  }

  /**
   * Clear all values in a namespace
   * @param namespace Cache namespace
   * @returns True if the namespace existed
   */
  public clearNamespace(namespace: string): boolean {
    return this._cache.delete(namespace);
  }

  /**
   * Clear all values in the cache
   */
  public clear(): void {
    this._cache.clear();
  }

  /**
   * Get the timestamp of a cached value
   * @param namespace Cache namespace
   * @param key Cache key
   * @returns Timestamp or undefined if not found
   */
  public getTimestamp(namespace: string, key: string): Date | undefined {
    const namespaceCache = this._cache.get(namespace);
    if (!namespaceCache) {
      return undefined;
    }

    const entry = namespaceCache.get(key);
    if (!entry) {
      return undefined;
    }

    return entry.timestamp;
  }

  /**
   * Check if a value is expired
   * @param namespace Cache namespace
   * @param key Cache key
   * @returns True if the value is expired or not found
   */
  public isExpired(namespace: string, key: string): boolean {
    const namespaceCache = this._cache.get(namespace);
    if (!namespaceCache) {
      return true;
    }

    const entry = namespaceCache.get(key);
    if (!entry) {
      return true;
    }

    return entry.expiresAt !== undefined && entry.expiresAt < new Date();
  }

  /**
   * Get all keys in a namespace
   * @param namespace Cache namespace
   * @returns Array of keys
   */
  public getKeys(namespace: string): string[] {
    const namespaceCache = this._cache.get(namespace);
    if (!namespaceCache) {
      return [];
    }

    return Array.from(namespaceCache.keys());
  }

  /**
   * Get all namespaces
   * @returns Array of namespaces
   */
  public getNamespaces(): string[] {
    return Array.from(this._cache.keys());
  }

  /**
   * Store multiple parameter values for a device
   * @param deviceId Device ID
   * @param values Parameter values to store
   */
  public storeParameterValues(deviceId: string, values: ParameterValue[]): void {
    for (const value of values) {
      this.set(`device:${deviceId}:params`, value.parameter.name, value);
    }

    // Also store the last update timestamp
    this.set(`device:${deviceId}`, 'lastUpdate', new Date());
  }

  /**
   * Get a parameter value for a device
   * @param deviceId Device ID
   * @param parameterName Parameter name
   * @returns Parameter value or undefined
   */
  public getParameterValue(deviceId: string, parameterName: string): ParameterValue | undefined {
    return this.get<ParameterValue>(`device:${deviceId}:params`, parameterName);
  }

  /**
   * Get all parameter values for a device
   * @param deviceId Device ID
   * @returns Map of parameter names to values
   */
  public getDeviceParameterValues(deviceId: string): Map<string, ParameterValue> {
    const result = new Map<string, ParameterValue>();
    const namespace = `device:${deviceId}:params`;

    const namespaceCache = this._cache.get(namespace);
    if (!namespaceCache) {
      return result;
    }

    // Add all non-expired entries
    const now = new Date();
    for (const [key, entry] of namespaceCache.entries()) {
      if (!entry.expiresAt || entry.expiresAt > now) {
        result.set(key, entry.value);
      }
    }

    return result;
  }

  /**
   * Start the cleanup interval
   */
  private _startCleanupInterval(): void {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }

    // Run cleanup every 5 minutes
    this._cleanupInterval = setInterval(
      () => {
        this._cleanup();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Clean up expired entries
   */
  private _cleanup(): void {
    const now = new Date();
    let expiredCount = 0;

    // Iterate through all namespaces
    for (const [namespaceName, namespaceCache] of this._cache.entries()) {
      // Iterate through all entries in the namespace
      for (const [key, entry] of namespaceCache.entries()) {
        if (entry.expiresAt && entry.expiresAt < now) {
          namespaceCache.delete(key);
          expiredCount++;
        }
      }

      // If the namespace is empty, remove it
      if (namespaceCache.size === 0) {
        this._cache.delete(namespaceName);
      }
    }

    if (expiredCount > 0) {
      this._logger.debug('CacheService', `Cleaned up ${expiredCount} expired cache entries`);
    }
  }

  /**
   * Destroy the cache service
   */
  public destroy(): void {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }

    this._cache.clear();
  }
}
