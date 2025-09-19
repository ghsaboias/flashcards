import { useState, useRef, type ReactNode } from 'react'

interface TouchGestureHandlerProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  swipeThreshold?: number
  className?: string
  disabled?: boolean
}

interface TouchPosition {
  x: number
  y: number
  time: number
}

export default function TouchGestureHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 50,
  className = '',
  disabled = false
}: TouchGestureHandlerProps) {
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return

    const touch = e.touches[0]
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    })
    setIsScrolling(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !touchStart) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStart.x)
    const deltaY = Math.abs(touch.clientY - touchStart.y)

    // Detect if user is scrolling vertically
    if (deltaY > deltaX && deltaY > 10) {
      setIsScrolling(true)
    }

    // Prevent horizontal scrolling during swipe gestures
    if (deltaX > deltaY && deltaX > 10 && !isScrolling) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !touchStart || isScrolling) {
      setTouchStart(null)
      setIsScrolling(false)
      return
    }

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const deltaTime = Date.now() - touchStart.time

    // Ignore very slow gestures (> 500ms)
    if (deltaTime > 500) {
      setTouchStart(null)
      return
    }

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Only trigger if movement exceeds threshold
    if (Math.max(absX, absY) < swipeThreshold) {
      setTouchStart(null)
      return
    }

    // Determine swipe direction
    if (absX > absY) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }

    setTouchStart(null)
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: disabled ? 'auto' : 'pan-y', // Allow vertical scrolling, prevent horizontal
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  )
}