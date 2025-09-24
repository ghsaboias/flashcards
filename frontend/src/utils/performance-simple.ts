// Simple performance monitoring for personal learning app
// Replaces complex performance monitor with lightweight development-focused utilities

interface PerformanceEntry {
  name: string
  duration: number
  timestamp: number
}

class SimplePerformanceMonitor {
  private entries: PerformanceEntry[] = []
  private enabled: boolean

  constructor() {
    this.enabled = import.meta.env.DEV
  }

  markRouteStart(routeName: string) {
    if (this.enabled) {
      performance.mark(`route-${routeName}-start`)
    }
  }

  markRouteEnd(routeName: string) {
    if (!this.enabled) return

    try {
      performance.mark(`route-${routeName}-end`)
      performance.measure(
        `route-${routeName}`,
        `route-${routeName}-start`,
        `route-${routeName}-end`
      )

      const measure = performance.getEntriesByName(`route-${routeName}`)[0]
      if (measure) {
        const entry: PerformanceEntry = {
          name: routeName,
          duration: measure.duration,
          timestamp: Date.now()
        }

        this.entries.push(entry)

        // Warn about slow routes
        if (measure.duration > 200) {
          console.warn(`🐌 Slow route: ${routeName} took ${Math.round(measure.duration)}ms`)
        } else {
          console.log(`⚡ Route loaded: ${routeName} (${Math.round(measure.duration)}ms)`)
        }

        // Keep only last 20 entries
        if (this.entries.length > 20) {
          this.entries.shift()
        }
      }
    } catch (error) {
      console.warn('Performance measurement failed:', error)
    }
  }

  getRecentMetrics() {
    return [...this.entries]
  }

  clear() {
    this.entries = []
  }
}

export const performanceMonitor = new SimplePerformanceMonitor()