interface RouteLoadingFallbackProps {
  routeName: string
}

export default function RouteLoadingFallback({ routeName }: RouteLoadingFallbackProps) {
  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="loading-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        fontSize: '16px',
        color: '#666'
      }}>
        <div className="loading-spinner" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span>Loading {routeName}...</span>
        </div>
      </div>
    </>
  )
}