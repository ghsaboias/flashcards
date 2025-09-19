import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppContext } from '../hooks/useAppContext'

interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const location = useLocation()
  const { selectedDomain } = useAppContext()
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  // Close drawer when route changes
  useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [location.pathname, isOpen, onClose])

  // Handle touch gestures for closing
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return

    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchEndX - touchStartX

    // Swipe left to close (delta < -50px)
    if (deltaX < -50) {
      onClose()
    }

    setTouchStartX(null)
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const navigationItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/practice', label: 'Practice', icon: '📚' },
    { path: '/stats', label: 'Statistics', icon: '📊' }
  ]

  return (
    <>
      <style>{`
        .mobile-nav-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .mobile-nav-backdrop.open {
          opacity: 1;
          visibility: visible;
        }

        .mobile-nav-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          max-width: 80vw;
          background: var(--panel);
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          z-index: 1001;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #262b36;
        }

        .mobile-nav-drawer.open {
          transform: translateX(0);
        }

        .mobile-nav-header {
          padding: 20px;
          border-bottom: 1px solid #262b36;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mobile-nav-title {
          font-size: 18px;
          font-weight: bold;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mobile-nav-close {
          background: transparent;
          border: none;
          color: var(--muted);
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-nav-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .mobile-nav-content {
          flex: 1;
          padding: 16px 0;
          overflow-y: auto;
        }

        .mobile-nav-section {
          margin-bottom: 24px;
        }

        .mobile-nav-section-title {
          padding: 0 20px 8px 20px;
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          color: var(--text);
          text-decoration: none;
          transition: background-color 0.2s ease;
          font-size: 16px;
          min-height: 48px;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          cursor: pointer;
        }

        .mobile-nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .mobile-nav-item.active {
          background: rgba(88, 166, 255, 0.15);
          color: var(--accent);
          border-right: 3px solid var(--accent);
        }

        .mobile-nav-item-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .mobile-nav-domain {
          padding: 16px 20px;
          border-bottom: 1px solid #262b36;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--muted);
        }

        .mobile-nav-footer {
          padding: 16px 20px;
          border-top: 1px solid #262b36;
          font-size: 12px;
          color: var(--muted);
          text-align: center;
        }

        /* Touch target optimization */
        @media (max-width: 600px) {
          .mobile-nav-item {
            min-height: 52px;
            font-size: 17px;
          }

          .mobile-nav-close {
            min-width: 48px;
            min-height: 48px;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={`mobile-nav-backdrop ${isOpen ? 'open' : ''}`}
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <nav
        className={`mobile-nav-drawer ${isOpen ? 'open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="mobile-nav-header">
          <div className="mobile-nav-title">
            🎯 HSK Flashcards
          </div>
          <button
            className="mobile-nav-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        {/* Domain info */}
        {selectedDomain && (
          <div className="mobile-nav-domain">
            <span>{selectedDomain.icon}</span>
            <span>{selectedDomain.name}</span>
          </div>
        )}

        {/* Content */}
        <div className="mobile-nav-content">
          <div className="mobile-nav-section">
            <div className="mobile-nav-section-title">Navigation</div>
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="mobile-nav-item-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mobile-nav-footer">
          Swipe left or tap outside to close
        </div>
      </nav>
    </>
  )
}