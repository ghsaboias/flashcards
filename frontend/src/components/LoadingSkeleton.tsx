interface LoadingSkeletonProps {
  variant?: 'table' | 'card' | 'text' | 'button' | 'stats' | 'question'
  rows?: number
  height?: string
  width?: string
  className?: string
}

function SkeletonShimmer({ width = '100%', height = '20px', borderRadius = '4px' }: {
  width?: string
  height?: string
  borderRadius?: string
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #262b36 25%, #3a4150 50%, #262b36 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite ease-in-out'
      }}
    />
  )
}

export default function LoadingSkeleton({
  variant = 'text',
  rows = 3,
  height,
  width,
  className = ''
}: LoadingSkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .skeleton-container {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>

      <div className={`skeleton-container ${className}`}>
        {variant === 'table' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Table header */}
            <div style={{ display: 'flex', gap: '12px', padding: '8px 0' }}>
              <SkeletonShimmer width="120px" height="16px" />
              <SkeletonShimmer width="80px" height="16px" />
              <SkeletonShimmer width="100px" height="16px" />
              <SkeletonShimmer width="90px" height="16px" />
            </div>
            {/* Table rows */}
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 0' }}>
                <SkeletonShimmer width="120px" height="14px" />
                <SkeletonShimmer width="80px" height="14px" />
                <SkeletonShimmer width="100px" height="14px" />
                <SkeletonShimmer width="90px" height="14px" />
              </div>
            ))}
          </div>
        )}

        {variant === 'card' && (
          <div style={{
            background: 'var(--panel)',
            borderRadius: '8px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <SkeletonShimmer width="70%" height="24px" />
            <SkeletonShimmer width="100%" height="16px" />
            <SkeletonShimmer width="85%" height="16px" />
            <SkeletonShimmer width="60%" height="16px" />
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <SkeletonShimmer width="100px" height="36px" borderRadius="6px" />
              <SkeletonShimmer width="80px" height="36px" borderRadius="6px" />
            </div>
          </div>
        )}

        {variant === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonShimmer
                key={i}
                width={i === rows - 1 ? '75%' : '100%'}
                height={height || '16px'}
              />
            ))}
          </div>
        )}

        {variant === 'button' && (
          <SkeletonShimmer
            width={width || '120px'}
            height={height || '36px'}
            borderRadius="6px"
          />
        )}

        {variant === 'stats' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px'
          }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                background: 'var(--bg)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'center'
              }}>
                <SkeletonShimmer width="40px" height="24px" />
                <SkeletonShimmer width="60px" height="12px" />
              </div>
            ))}
          </div>
        )}

        {variant === 'question' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            padding: '40px',
            minHeight: '200px',
            justifyContent: 'center'
          }}>
            <SkeletonShimmer width="200px" height="64px" borderRadius="8px" />
            <SkeletonShimmer width="150px" height="16px" />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <SkeletonShimmer width="200px" height="40px" borderRadius="6px" />
              <SkeletonShimmer width="80px" height="40px" borderRadius="6px" />
            </div>
          </div>
        )}
      </div>
    </>
  )
}