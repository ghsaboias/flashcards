import { useState, memo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import DomainSelector from '../components/DomainSelector'
import Breadcrumbs from '../components/Breadcrumbs'
import MobileNavDrawer from '../components/MobileNavDrawer'
import ErrorBoundary from '../components/ErrorBoundary'
import { SessionWarningBanner, SessionRecoveryNotification } from '../components/SessionWarning'
import { useSessionWarnings } from '../hooks/useSessionWarnings'
import { useAppContext } from '../hooks/useAppContext'

interface MainLayoutProps {
  children: ReactNode
  showDomainSelector?: boolean
  showNavigation?: boolean
  showBreadcrumbs?: boolean
}

const MainLayout = memo(function MainLayout({
  children,
  showDomainSelector = true,
  showNavigation = true,
  showBreadcrumbs = true
}: MainLayoutProps) {
  const { selectedDomain, setSelectedDomain } = useAppContext()
  const location = useLocation()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const {
    showRecoveryNotification,
    savedSessionId,
    handleRestoreSession,
    handleDismissRecovery
  } = useSessionWarnings()

  const navigationItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/practice', label: 'Practice', icon: '📚' },
    { path: '/stats', label: 'Stats', icon: '📊' }
  ]

  return (
    <>
      {/* Session Warning Banner */}
      <SessionWarningBanner />

      {/* Session Recovery Notification */}
      {showRecoveryNotification && savedSessionId && (
        <SessionRecoveryNotification
          sessionId={savedSessionId}
          onRestore={handleRestoreSession}
          onDismiss={handleDismissRecovery}
        />
      )}

      <style>{`
        .main-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .main-nav {
          background: var(--panel);
          border-bottom: 1px solid #262b36;
          padding: 12px 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 18px;
          color: var(--text);
          text-decoration: none;
        }

        .nav-links {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 6px;
          color: var(--muted);
          transition: all 0.2s ease;
          font-size: 14px;
          min-height: 44px;
          min-width: 44px;
          justify-content: center;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
        }

        .nav-link.active {
          background: var(--accent);
          color: #06131f;
          font-weight: 500;
        }

        .mobile-nav-toggle {
          display: none;
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: background-color 0.2s ease;
          min-width: 44px;
          min-height: 44px;
          align-items: center;
          justify-content: center;
        }

        .mobile-nav-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .main-content {
          flex: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
          width: 100%;
        }

        .domain-selector-container {
          margin-bottom: 16px;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .mobile-nav-toggle {
            display: flex;
          }

          .nav-content {
            padding: 0 12px;
          }

          .main-content {
            padding: 0 12px;
          }

          .nav-link {
            font-size: 16px;
            padding: 12px 16px;
            min-height: 48px;
          }
        }

        @media (max-width: 600px) {
          .nav-brand {
            font-size: 16px;
          }

          .main-content {
            padding: 0 8px;
          }
        }
      `}</style>

      <ErrorBoundary>
        <div className="main-layout">
          {/* Navigation */}
          {showNavigation && (
            <nav className="main-nav">
              <div className="nav-content">
                <Link to="/" className="nav-brand">
                  🎯 HSK Flashcards
                </Link>

                {/* Desktop Navigation */}
                <div className="nav-links">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Mobile Navigation Toggle */}
                <button
                  className="mobile-nav-toggle"
                  onClick={() => setIsMobileNavOpen(true)}
                  aria-label="Open navigation menu"
                >
                  ☰
                </button>
              </div>
            </nav>
          )}

          {/* Mobile Navigation Drawer */}
          <MobileNavDrawer
            isOpen={isMobileNavOpen}
            onClose={() => setIsMobileNavOpen(false)}
          />

          {/* Main Content */}
          <div className="main-content">
            {/* Domain Selector */}
            {showDomainSelector && (
              <div className="domain-selector-container">
                <DomainSelector
                  selectedDomain={selectedDomain}
                  onDomainChange={setSelectedDomain}
                />
              </div>
            )}

            {/* Breadcrumbs */}
            {showBreadcrumbs && <Breadcrumbs />}

            {/* Page Content */}
            <main>
              {children}
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </>
  )
})

export default MainLayout