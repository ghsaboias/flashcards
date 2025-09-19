import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import DomainSelector from '../components/DomainSelector'
import { useAppContext } from '../hooks/useAppContext'

interface MainLayoutProps {
  children: ReactNode
  showDomainSelector?: boolean
  showNavigation?: boolean
}

export default function MainLayout({
  children,
  showDomainSelector = true,
  showNavigation = true
}: MainLayoutProps) {
  const { selectedDomain, setSelectedDomain } = useAppContext()
  const location = useLocation()

  return (
    <div className="container">
      {/* Global keyboard handler - will be added later when we implement global shortcuts */}

      {showNavigation && (
        <nav className="main-nav" style={{
          padding: '16px 0',
          borderBottom: '1px solid #eee',
          marginBottom: '16px',
          background: '#fafafa'
        }}>
          <div style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 16px'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#333' }}>
              🎯 HSK Flashcards
            </div>
            <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
              <Link
                to="/"
                style={{
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: location.pathname === '/' ? 'bold' : 'normal',
                  backgroundColor: location.pathname === '/' ? '#007bff' : 'transparent',
                  color: location.pathname === '/' ? 'white' : '#666',
                  transition: 'all 0.2s ease'
                }}
              >
                🏠 Home
              </Link>
              <Link
                to="/practice"
                style={{
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: location.pathname === '/practice' ? 'bold' : 'normal',
                  backgroundColor: location.pathname === '/practice' ? '#007bff' : 'transparent',
                  color: location.pathname === '/practice' ? 'white' : '#666',
                  transition: 'all 0.2s ease'
                }}
              >
                📚 Practice
              </Link>
              <Link
                to="/stats"
                style={{
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: location.pathname === '/stats' ? 'bold' : 'normal',
                  backgroundColor: location.pathname === '/stats' ? '#007bff' : 'transparent',
                  color: location.pathname === '/stats' ? 'white' : '#666',
                  transition: 'all 0.2s ease'
                }}
              >
                📊 Stats
              </Link>
            </div>
          </div>
        </nav>
      )}

      {showDomainSelector && (
        <div style={{ marginBottom: '16px' }}>
          <DomainSelector
            selectedDomain={selectedDomain}
            onDomainChange={setSelectedDomain}
          />
        </div>
      )}

      <main>
        {children}
      </main>
    </div>
  )
}