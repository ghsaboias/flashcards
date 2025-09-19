import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAppContext } from '../hooks/useAppContext'
import { useSessionStateAndActions } from '../hooks/useSessionContext'

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: string
  active?: boolean
}

export default function Breadcrumbs() {
  const location = useLocation()
  const params = useParams()
  const { selectedDomain } = useAppContext()
  const [sessionState] = useSessionStateAndActions()

  const breadcrumbs = useMemo(() => {
    const items: BreadcrumbItem[] = []
    const path = location.pathname

    // Always start with Home
    items.push({
      label: 'Home',
      path: '/',
      icon: '🏠'
    })

    // Add domain context if available
    if (selectedDomain) {
      items.push({
        label: selectedDomain.name,
        icon: selectedDomain.icon
      })
    }

    // Route-specific breadcrumbs
    if (path === '/practice') {
      items.push({
        label: 'Practice',
        icon: '📚',
        active: true
      })
    } else if (path === '/stats') {
      items.push({
        label: 'Statistics',
        icon: '📊',
        active: true
      })
    } else if (path.startsWith('/session/')) {
      items.push({
        label: 'Practice',
        path: '/practice',
        icon: '📚'
      })

      // Add session context if available
      if (sessionState.selectedSets.length > 0) {
        const setLabel = sessionState.selectedSets.length === 1
          ? sessionState.selectedSets[0].replace(/^.*\//, '').replace(/_/g, ' ')
          : `${sessionState.selectedSets.length} Sets`

        items.push({
          label: setLabel,
          icon: '📋'
        })
      }

      items.push({
        label: `Session ${params.id?.slice(-4) || ''}`,
        icon: '🎯',
        active: true
      })
    } else if (path.startsWith('/complete/')) {
      items.push({
        label: 'Practice',
        path: '/practice',
        icon: '📚'
      })

      items.push({
        label: 'Session Complete',
        icon: '✅',
        active: true
      })
    } else if (path.startsWith('/browse/')) {
      items.push({
        label: 'Practice',
        path: '/practice',
        icon: '📚'
      })

      const setName = params.set?.replace(/_/g, ' ') || 'Unknown Set'
      items.push({
        label: `Browse ${setName}`,
        icon: '👁️',
        active: true
      })
    } else if (path.startsWith('/drawing/')) {
      items.push({
        label: 'Practice',
        path: '/practice',
        icon: '📚'
      })

      const setName = params.set?.replace(/_/g, ' ') || 'Unknown Set'
      items.push({
        label: `Drawing ${setName}`,
        icon: '✏️',
        active: true
      })
    }

    return items
  }, [location.pathname, params, selectedDomain, sessionState.selectedSets])

  // Don't show breadcrumbs on home page
  if (location.pathname === '/') {
    return null
  }

  return (
    <>
      <style>{`
        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 8px 0;
          font-size: 14px;
          color: var(--muted);
          border-bottom: 1px solid #262b36;
          overflow-x: auto;
          white-space: nowrap;
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          color: var(--muted);
          transition: color 0.2s ease;
          flex-shrink: 0;
        }

        .breadcrumb-item:hover:not(.active) {
          color: var(--accent);
        }

        .breadcrumb-item.active {
          color: var(--text);
          font-weight: 500;
        }

        .breadcrumb-separator {
          color: #3a4150;
          margin: 0 4px;
          user-select: none;
          flex-shrink: 0;
        }

        .breadcrumb-icon {
          font-size: 12px;
          margin-right: 2px;
        }

        @media (max-width: 600px) {
          .breadcrumbs {
            font-size: 13px;
            padding: 6px 0;
            margin-bottom: 12px;
          }

          .breadcrumb-icon {
            font-size: 11px;
          }
        }
      `}</style>

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
            {index > 0 && <span className="breadcrumb-separator">›</span>}

            {item.path && !item.active ? (
              <Link
                to={item.path}
                className="breadcrumb-item"
                title={item.label}
              >
                {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                {item.label}
              </Link>
            ) : (
              <span
                className={`breadcrumb-item ${item.active ? 'active' : ''}`}
                title={item.label}
              >
                {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                {item.label}
              </span>
            )}
          </div>
        ))}
      </nav>
    </>
  )
}