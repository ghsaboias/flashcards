import { createBrowserRouter, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ErrorPage from './pages/ErrorPage'
import RouteLoadingFallback from './components/RouteLoadingFallback'

import { performanceMonitor } from './utils/performance-monitor'
import { NavigationGuardProvider } from './components/NavigationGuard'

// Performance monitoring for route transitions
const markRouteStart = (routeName: string) => {
  performance.mark(`route-${routeName}-start`)
}

const markRouteEnd = (routeName: string) => {
  performance.mark(`route-${routeName}-end`)
  performance.measure(`route-${routeName}-transition`, `route-${routeName}-start`, `route-${routeName}-end`)

  // Record in our performance monitor
  const measure = performance.getEntriesByName(`route-${routeName}-transition`)[0]
  if (measure) {
    performanceMonitor.recordRouteTransition(routeName, measure.duration)
  }
}

// Lazy load page components with priority-based loading
// HomePage: Immediate load (main entry point) - keep as regular import for fastest initial load
import HomePage from './pages/HomePage'

// High priority: Primary navigation flow
const PracticePage = lazy(() => {
  markRouteStart('practice')
  return import('./pages/PracticePage').then(module => {
    markRouteEnd('practice')
    return module
  })
})

// Medium priority: Session flow components (practice → session → complete)
const SessionPage = lazy(() => {
  markRouteStart('session')
  return import('./pages/SessionPage').then(module => {
    markRouteEnd('session')
    return module
  })
})

const CompletePage = lazy(() => {
  markRouteStart('complete')
  return import('./pages/CompletePage').then(module => {
    markRouteEnd('complete')
    return module
  })
})

// Low priority: Secondary features
const StatsPage = lazy(() => {
  markRouteStart('stats')
  return import('./pages/StatsPage').then(module => {
    markRouteEnd('stats')
    return module
  })
})

const BrowsePage = lazy(() => {
  markRouteStart('browse')
  return import('./pages/BrowsePage').then(module => {
    markRouteEnd('browse')
    return module
  })
})

const DrawingPage = lazy(() => {
  markRouteStart('drawing')
  return import('./pages/DrawingPage').then(module => {
    markRouteEnd('drawing')
    return module
  })
})

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <NavigationGuardProvider>
        <Outlet />
      </NavigationGuardProvider>
    ), 
    errorElement: <ErrorPage />, 
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'practice',
        element: (
          <Suspense fallback={<RouteLoadingFallback routeName="Practice" />}>
            <PracticePage />
          </Suspense>
        )
      },
      {
        path: 'session/:id',
        element: (
          <Suspense fallback={<RouteLoadingFallback routeName="Session" />}>
            <SessionPage />
          </Suspense>
        )
      },
      {
        path: 'complete/:id',
        element: (
          <Suspense fallback={<RouteLoadingFallback routeName="Complete" />}>
            <CompletePage />
          </Suspense>
        )
      },
      {
        path: 'stats',
        element: (
          <Suspense fallback={<RouteLoadingFallback routeName="Stats" />}>
            <StatsPage />
          </Suspense>
        )
      },
      {
        path: 'browse/:set',
        element: (
          <Suspense fallback={<RouteLoadingFallback routeName="Browse" />}>
            <BrowsePage />
          </Suspense>
        )
      },
      {
        path: 'drawing/:set',
        element: (
          <Suspense fallback={<RouteLoadingFallback routeName="Drawing" />}>
            <DrawingPage />
          </Suspense>
        )
      },
      {
        path: '*',
        element: <ErrorPage />
      }
    ]
  }
])
