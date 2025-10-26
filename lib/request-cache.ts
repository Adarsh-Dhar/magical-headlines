"use client";

// Request cache and deduplication system to prevent rate limiting
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private rateLimiter = new Map<string, number>();
  
  // Rate limiting: max requests per second per key
  private readonly MAX_REQUESTS_PER_SECOND = 2;
  private readonly DEFAULT_TTL = 30000; // 30 seconds

  private isRateLimited(key: string): boolean {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(key) || 0;
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < 1000 / this.MAX_REQUESTS_PER_SECOND) {
      return true;
    }
    
    this.rateLimiter.set(key, now);
    return false;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check if we have a valid cached entry
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // If the pending request is recent (within 5 seconds), return it
      if (Date.now() - pending.timestamp < 5000) {
        return pending.promise;
      } else {
        // Remove stale pending request
        this.pendingRequests.delete(key);
      }
    }

    // Check rate limiting
    if (this.isRateLimited(key)) {
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.get(key, fetcher, ttl);
    }

    // Create new request
    const promise = this.executeWithRetry(fetcher, key);
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    try {
      const result = await promise;
      
      // Cache the result
      this.cache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl
      });
      
      return result;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(key);
    }
  }

  private async executeWithRetry<T>(
    fetcher: () => Promise<T>, 
    key: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fetcher();
      } catch (error) {
        lastError = error as Error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if it's a rate limiting error
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
          if (attempt < maxRetries - 1) {
            // Exponential backoff: wait 2^attempt seconds
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // If it's not a rate limiting error or we've exhausted retries, throw
        throw error;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  // Clear cache for a specific key
  clear(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.rateLimiter.clear();
  }

  // Get cache stats
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      rateLimiterSize: this.rateLimiter.size
    };
  }
}

// Global cache instance
export const requestCache = new RequestCache();

// Helper function to create cache keys
export function createCacheKey(prefix: string, ...params: (string | number | boolean)[]): string {
  return `${prefix}:${params.join(':')}`;
}

// Cleanup function to remove expired entries
export function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of requestCache['cache'].entries()) {
    if (now - entry.timestamp > entry.ttl) {
      requestCache['cache'].delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 5 * 60 * 1000);
}
