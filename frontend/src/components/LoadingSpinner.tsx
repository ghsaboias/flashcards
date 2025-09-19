import type { ReactNode } from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  fullScreen?: boolean
  children?: ReactNode
}

export default function LoadingSpinner({
  size = 'medium',
  text = 'Loading...',
  fullScreen = false,
  children
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: { width: '20px', height: '20px', borderWidth: '2px' },
    medium: { width: '32px', height: '32px', borderWidth: '3px' },
    large: { width: '48px', height: '48px', borderWidth: '4px' }
  }

  const spinnerStyle = {
    ...sizeClasses[size],
    border: `${sizeClasses[size].borderWidth} solid #262b36`,
    borderTop: `${sizeClasses[size].borderWidth} solid var(--accent)`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }

  const containerStyle = fullScreen ? {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(11, 14, 20, 0.8)',
    zIndex: 9999
  } : {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    minHeight: '120px'
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .loading-container {
          animation: fadeIn 0.2s ease-in;
        }

        .loading-text {
          margin-top: 12px;
          color: var(--muted);
          font-size: 14px;
          text-align: center;
        }

        .loading-content {
          margin-top: 16px;
          text-align: center;
          max-width: 300px;
        }
      `}</style>

      <div style={containerStyle} className="loading-container">
        <div style={spinnerStyle}></div>
        {text && <div className="loading-text">{text}</div>}
        {children && <div className="loading-content">{children}</div>}
      </div>
    </>
  )
}