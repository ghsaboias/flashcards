import React, { Component, type ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
  maxRetries?: number
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      })
    }
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    const { hasError, error, retryCount } = this.state
    const { children, fallback, maxRetries = 3 } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.handleRetry)
      }

      // Default error UI
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'var(--panel)',
          borderRadius: '8px',
          margin: '20px',
          border: '1px solid var(--bad)'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            💥
          </div>

          <h2 style={{
            color: 'var(--bad)',
            marginBottom: '16px',
            fontSize: '24px'
          }}>
            Something went wrong
          </h2>

          <p style={{
            color: 'var(--muted)',
            marginBottom: '24px',
            fontSize: '16px',
            lineHeight: '1.4'
          }}>
            We encountered an unexpected error. This might be due to a temporary issue.
          </p>

          {retryCount < maxRetries && (
            <button
              onClick={this.handleRetry}
              className="btn-primary"
              style={{ marginRight: '12px' }}
            >
              🔄 Try Again ({maxRetries - retryCount} attempts left)
            </button>
          )}

          <button
            onClick={this.handleGoHome}
            className={retryCount >= maxRetries ? 'btn-primary' : 'btn-secondary'}
          >
            🏠 Go Home
          </button>

          {import.meta.env.DEV && (
            <details style={{
              marginTop: '24px',
              textAlign: 'left',
              background: 'var(--bg)',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #262b36'
            }}>
              <summary style={{
                cursor: 'pointer',
                color: 'var(--muted)',
                marginBottom: '8px'
              }}>
                🔍 Error Details (Development)
              </summary>
              <pre style={{
                fontSize: '12px',
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0
              }}>
                <strong>Error:</strong> {error.name}: {error.message}
                {error.stack && (
                  <>
                    <br /><br />
                    <strong>Stack Trace:</strong><br />
                    {error.stack}
                  </>
                )}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return children
  }
}