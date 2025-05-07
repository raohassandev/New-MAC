/**
 * Cache Service
 * 
 * Provides a simple in-memory cache for parameter values
 */

import { logService } from './logService';

class CacheService {
  private cache: Map<string, any> = new Map();
  private timestamps: Map<string, number> = new Map(); // Timestamps for TTL
  private ttl: number = 60000; // Default TTL: 1 minute
  private enabled: boolean = true;
  
  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @returns The value
   */
  set(key: string, value: any): any {
    if (!this.enabled) return value;
    
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
    return value;
  }
  
  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value, or null if not found or expired
   */
  get(key: string): any {
    if (!this.enabled) return null;
    
    // Check if key exists
    if (!this.cache.has(key)) {
      return null;
    }
    
    // Check if value has expired
    const timestamp = this.timestamps.get(key) || 0;
    if (Date.now() - timestamp > this.ttl) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }
  
  /**
   * Delete a value from the cache
   * @param key The cache key
   * @returns True if the value was deleted, false otherwise
   */
  delete(key: string): boolean {
    this.timestamps.delete(key);
    return this.cache.delete(key);
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
    logService.debug('Cache cleared');
  }
  
  /**
   * Set the TTL (Time To Live) for cached values
   * @param ttl The TTL in milliseconds
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
    logService.debug(`Cache TTL set to ${ttl}ms`);
  }
  
  /**
   * Get the current TTL value
   * @returns The TTL in milliseconds
   */
  getTTL(): number {
    return this.ttl;
  }
  
  /**
   * Enable or disable the cache
   * @param enabled True to enable the cache, false to disable
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logService.debug(`Cache ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!enabled) {
      this.clear();
    }
  }
  
  /**
   * Check if the cache is enabled
   * @returns True if the cache is enabled, false otherwise
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Get the number of items in the cache
   * @returns The number of cached items
   */
  size(): number {
    return this.cache.size;
  }
}

// Export a singleton instance
export const cacheService = new CacheService();