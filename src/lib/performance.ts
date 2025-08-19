// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  type: 'navigation' | 'component' | 'api' | 'user_action';
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            duration: entry.duration,
            timestamp: entry.startTime,
            type: 'navigation',
            metadata: { entryType: entry.entryType }
          });
        });
      });
      navObserver.observe({ entryTypes: ['navigation', 'paint'] });
      this.observers.push(navObserver);

      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn('Long task detected:', entry.duration + 'ms');
            this.recordMetric({
              name: 'long-task',
              duration: entry.duration,
              timestamp: entry.startTime,
              type: 'component',
              metadata: { threshold: 50 }
            });
          }
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    }
  }

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log performance issues
    if (metric.duration > 1000) {
      console.warn(`Slow ${metric.type}: ${metric.name} took ${metric.duration}ms`);
    }
  }

  // Measure component render time
  measureComponent<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.recordMetric({
      name: `component:${name}`,
      duration,
      timestamp: start,
      type: 'component'
    });

    return result;
  }

  // Measure async operations
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.recordMetric({
        name: `async:${name}`,
        duration,
        timestamp: start,
        type: 'api',
        metadata: { success: true }
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric({
        name: `async:${name}`,
        duration,
        timestamp: start,
        type: 'api',
        metadata: { success: false, error: error.message }
      });

      throw error;
    }
  }

  // Get performance summary
  getSummary() {
    const now = performance.now();
    const recent = this.metrics.filter(m => now - m.timestamp < 60000); // Last minute

    const summary = {
      totalMetrics: this.metrics.length,
      recentMetrics: recent.length,
      averageDuration: recent.length > 0 ? recent.reduce((sum, m) => sum + m.duration, 0) / recent.length : 0,
      slowestOperations: this.metrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      longTasks: this.metrics.filter(m => m.name === 'long-task').length
    };

    return summary;
  }

  // Clear metrics
  clear() {
    this.metrics = [];
  }

  // Cleanup observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Cache manager for API responses and computed values
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private memoryThreshold = 100; // Maximum cache entries

  set(key: string, data: any, ttl: number = 300000) { // Default 5 minutes
    // Clean up if approaching memory threshold
    if (this.cache.size >= this.memoryThreshold) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    });

    // If still too many, remove oldest entries
    if (this.cache.size >= this.memoryThreshold) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(this.memoryThreshold * 0.3)); // Remove oldest 30%

      sortedEntries.forEach(([key]) => this.cache.delete(key));
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      memoryThreshold: this.memoryThreshold,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Image optimization utilities
export const optimizeImage = (url: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
} = {}) => {
  const { width, height, quality = 80, format = 'webp' } = options;
  
  // For external images, you could use a service like Cloudinary or Vercel
  // For now, return original URL with basic optimization hints
  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality) params.set('q', quality.toString());
  if (format) params.set('f', format);
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

// Lazy loading utility
export const createLazyLoader = () => {
  if (!('IntersectionObserver' in window)) {
    return { observe: () => {}, unobserve: () => {}, disconnect: () => {} };
  }

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          img.classList.remove('lazy');
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });
};

// Bundle analyzer utility
export const analyzeBundleSize = async () => {
  if (typeof window === 'undefined') return;

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  const jsFiles = resources.filter(resource => 
    resource.name.includes('.js') && 
    !resource.name.includes('node_modules')
  );

  const cssFiles = resources.filter(resource => 
    resource.name.includes('.css')
  );

  const analysis = {
    totalJSSize: jsFiles.reduce((sum, file) => sum + (file.transferSize || 0), 0),
    totalCSSSize: cssFiles.reduce((sum, file) => sum + (file.transferSize || 0), 0),
    largestJS: jsFiles.sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))[0],
    largestCSS: cssFiles.sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))[0],
    loadTime: Math.max(...jsFiles.map(file => file.responseEnd - file.fetchStart))
  };

  console.table(analysis);
  return analysis;
};

// Global instances
export const performanceMonitor = new PerformanceMonitor();
export const cacheManager = new CacheManager();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    measureComponent: performanceMonitor.measureComponent.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    getSummary: performanceMonitor.getSummary.bind(performanceMonitor)
  };
};
