/**
 * Performance monitoring and optimization utilities
 * Track app performance metrics and identify bottlenecks
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 200;

/**
 * Measure execution time of a function
 */
export const measurePerformance = async <T>(
  name: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    recordMetric(name, duration, metadata);
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordMetric(name, duration, { ...metadata, error: true });
    throw error;
  }
};

/**
 * Record a performance metric
 */
export const recordMetric = (
  name: string,
  duration: number,
  metadata?: Record<string, any>
): void => {
  const metric: PerformanceMetric = {
    name,
    duration,
    timestamp: Date.now(),
    metadata,
  };
  
  metrics.push(metric);
  
  // Keep only last MAX_METRICS
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }
  
  // Warn about slow operations
  if (duration > 1000) {
    console.warn(`[Performance] Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
  }
  
  // Log in development
  if (import.meta.env.DEV) {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`, metadata);
  }
};

/**
 * Get performance metrics
 */
export const getMetrics = (name?: string): PerformanceMetric[] => {
  if (name) {
    return metrics.filter((m) => m.name === name);
  }
  return [...metrics];
};

/**
 * Get average duration for a metric
 */
export const getAverageDuration = (name: string): number => {
  const filtered = metrics.filter((m) => m.name === name);
  if (filtered.length === 0) return 0;
  
  const total = filtered.reduce((sum, m) => sum + m.duration, 0);
  return total / filtered.length;
};

/**
 * Monitor component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  if (import.meta.env.DEV) {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      recordMetric(`render:${componentName}`, duration);
    };
  }
  
  return () => {}; // No-op in production
};

/**
 * Report Core Web Vitals
 */
export const reportWebVitals = (): void => {
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      recordMetric('lcp', lastEntry.startTime, {
        element: (lastEntry as any).element?.tagName,
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        recordMetric('fid', (entry as any).processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift (CLS)
    let clsScore = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsScore += (entry as any).value;
          recordMetric('cls', clsScore);
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }
};

/**
 * Get bundle size information
 */
export const getBundleInfo = (): { total: number; resources: number } => {
  if (!performance.getEntriesByType) {
    return { total: 0, resources: 0 };
  }
  
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const total = resources.reduce((sum, resource) => {
    return sum + (resource.transferSize || 0);
  }, 0);
  
  return {
    total,
    resources: resources.length,
  };
};
