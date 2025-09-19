import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
  duration?: number
  className?: string
}

export default function PageTransition({
  children,
  duration = 200,
  className = ''
}: PageTransitionProps) {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const [currentPath, setCurrentPath] = useState(location.pathname)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    // Handle route changes
    if (location.pathname !== currentPath) {
      // Fade out
      setIsVisible(false)

      // After fade out, update path and fade in
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = window.setTimeout(() => {
        setCurrentPath(location.pathname)
        setIsVisible(true)
        timeoutRef.current = null
      }, duration)
    } else {
      // Initial load
      setIsVisible(true)
    }
  }, [location.pathname, currentPath, duration])

  useEffect(() => () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <>
      <style>{`
        .page-transition {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity ${duration}ms ease-in-out, transform ${duration}ms ease-in-out;
        }

        .page-transition.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .page-transition.fast {
          transition-duration: 150ms;
        }

        .page-transition.slow {
          transition-duration: 300ms;
        }
      `}</style>

      <div className={`page-transition ${isVisible ? 'visible' : ''} ${className}`}>
        {currentPath === location.pathname ? children : null}
      </div>
    </>
  )
}
