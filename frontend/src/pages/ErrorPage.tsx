import { memo } from 'react'
import MainLayout from '../layouts/MainLayout'

const ErrorPage = memo(function ErrorPage() {
  return (
    <MainLayout>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>🚧 Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <div style={{ marginTop: '24px' }}>
          <a href="/" style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            🏠 Go Home
          </a>
        </div>
      </div>
    </MainLayout>
  )
})

export default ErrorPage