// Performance monitoring utilities for React performance optimization
// Tracks route transitions, component render times, and bundle loading

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  type: 'route-transition' | 'component-render' | 'bundle-load' | 'user-interaction'
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []
  private enabled: boolean

  constructor() {
    this.enabled = typeof window !== 'undefined' &&
                  (import.meta.env.DEV ||
                   localStorage.getItem('performance-monitoring') === 'true')

    if (this.enabled) {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    // Core Web Vitals observer
    if ('PerformanceObserver' in window) {
      const vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: entry.name,
            value: entry.startTime,
            timestamp: Date.now(),
            type: 'user-interaction'
          })
        }
      })

      try {
        vitalsObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
        this.observers.push(vitalsObserver)
      } catch (e) {
        console.warn('Performance observer not supported:', e)
      }
    }
  }

  // Record route transition performance
  recordRouteTransition(routeName: string, duration: number) {
    if (!this.enabled) return

    this.recordMetric({
      name: `route-${routeName}`,
      value: duration,
      timestamp: Date.now(),
      type: 'route-transition'
    })

    // Log slow transitions
    if (duration > 500) {
      console.warn(`Slow route transition to ${routeName}: ${duration}ms`)
    }
  }

  // Record component render performance
  recordComponentRender(componentName: string, duration: number) {
    if (!this.enabled) return

    this.recordMetric({
      name: `component-${componentName}`,
      value: duration,
      timestamp: Date.now(),
      type: 'component-render'
    })

    // Log slow renders
    if (duration > 100) {
      console.warn(`Slow component render ${componentName}: ${duration}ms`)
    }
  }

  // Record bundle loading performance
  recordBundleLoad(bundleName: string, duration: number) {
    if (!this.enabled) return

    this.recordMetric({
      name: `bundle-${bundleName}`,
      value: duration,
      timestamp: Date.now(),
      type: 'bundle-load'
    })

    // Log slow bundle loads
    if (duration > 1000) {
      console.warn(`Slow bundle load ${bundleName}: ${duration}ms`)
    }
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`📊 Performance: ${metric.name} = ${metric.value}ms`)
    }
  }

  // Get performance summary
  getSummary() {
    if (!this.enabled) return null

    const routeTransitions = this.metrics.filter(m => m.type === 'route-transition')
    const componentRenders = this.metrics.filter(m => m.type === 'component-render')
    const bundleLoads = this.metrics.filter(m => m.type === 'bundle-load')

    return {
      totalMetrics: this.metrics.length,
      averageRouteTransition: this.average(routeTransitions.map(m => m.value)),
      averageComponentRender: this.average(componentRenders.map(m => m.value)),
      averageBundleLoad: this.average(bundleLoads.map(m => m.value)),
      slowestRoute: this.findSlowest(routeTransitions),
      slowestComponent: this.findSlowest(componentRenders),
      slowestBundle: this.findSlowest(bundleLoads)
    }
  }

  private average(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }

  private findSlowest(metrics: PerformanceMetric[]): PerformanceMetric | null {
    return metrics.reduce((slowest, current) =>
      (!slowest || current.value > slowest.value) ? current : slowest, null as PerformanceMetric | null)
  }

  // Clear metrics
  clear() {
    this.metrics = []
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Hook for React components to measure render performance
export function useRenderPerformance(componentName: string) {
  if (typeof window === 'undefined') return

  const startTime = performance.now()

  // Use effect to measure render duration
  return () => {
    const duration = performance.now() - startTime
    performanceMonitor.recordComponentRender(componentName, duration)
  }
}

// Utility to measure async operations
export async function measureAsync<T>(
  operationName: string,
  operation: () => Promise<T>,
  type: PerformanceMetric['type'] = 'user-interaction'
): Promise<T> {
  const startTime = performance.now()

  try {
    const result = await operation()
    const duration = performance.now() - startTime

    if (type === 'route-transition') {
      performanceMonitor.recordRouteTransition(operationName, duration)
    } else if (type === 'bundle-load') {
      performanceMonitor.recordBundleLoad(operationName, duration)
    }

    return result
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`Operation ${operationName} failed after ${duration}ms:`, error)
    throw error
  }
}

// Performance budget checker
export function checkPerformanceBudget() {
  const summary = performanceMonitor.getSummary()
  if (!summary) return

  const warnings: string[] = []

  if (summary.averageRouteTransition > 200) {
    warnings.push(`Average route transition (${summary.averageRouteTransition.toFixed(1)}ms) exceeds budget (200ms)`)
  }

  if (summary.averageComponentRender > 50) {
    warnings.push(`Average component render (${summary.averageComponentRender.toFixed(1)}ms) exceeds budget (50ms)`)
  }

  if (summary.averageBundleLoad > 1000) {
    warnings.push(`Average bundle load (${summary.averageBundleLoad.toFixed(1)}ms) exceeds budget (1000ms)`)
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Performance Budget Warnings:', warnings)
  }

  return { summary, warnings }
}