import { useCallback, useEffect, useRef, useState } from 'react'

interface DrawingCanvasProps {
  character: string
  onProgressUpdate: (percentage: number) => void
  onComplete: () => void
}

export default function DrawingCanvas({ character, onProgressUpdate, onComplete }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const referenceCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [percentage, setPercentage] = useState(0)
  const [referencePixels, setReferencePixels] = useState<Set<string>>(new Set())

  // Canvas dimensions
  const CANVAS_SIZE = 300
  const BRUSH_SIZE = 8

  // Initialize reference character outline
  useEffect(() => {
    if (!character || !referenceCanvasRef.current) return

    const canvas = referenceCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE

    // Clear canvas
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Draw character outline with better styling for Chinese characters
    ctx.font = `bold ${Math.floor(CANVAS_SIZE * 0.6)}px serif`
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Draw character with stroke for better outline detection
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 3
    ctx.fillText(character, CANVAS_SIZE / 2, CANVAS_SIZE / 2)
    ctx.strokeText(character, CANVAS_SIZE / 2, CANVAS_SIZE / 2)

    // Get reference pixels (black pixels from the character)
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const pixels = imageData.data
    const refPixels = new Set<string>()

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      
      // If pixel is dark (character outline) - more lenient threshold
      if (r < 200 && g < 200 && b < 200) {
        const pixelIndex = i / 4
        const x = pixelIndex % CANVAS_SIZE
        const y = Math.floor(pixelIndex / CANVAS_SIZE)
        refPixels.add(`${x},${y}`)
      }
    }

    console.log('Reference pixels generated:', refPixels.size, 'for character:', character)
    setReferencePixels(refPixels)
  }, [character])

  // Initialize drawing canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear to white
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Draw light gray outline for reference
    if (character && referenceCanvasRef.current) {
      const refCtx = referenceCanvasRef.current.getContext('2d')
      if (refCtx) {
        ctx.globalAlpha = 0.3
        ctx.drawImage(referenceCanvasRef.current, 0, 0)
        ctx.globalAlpha = 1.0
      }
    }
  }, [character])

  const calculatePercentage = useCallback(() => {
    if (!canvasRef.current || referencePixels.size === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const pixels = imageData.data

    let correctPixels = 0
    let incorrectPixels = 0

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]

      // If pixel is blue (user drawing) - distinguish from black reference outline
      const isBlueDrawing = (b > 200 && r < 100 && g < 100) // Blue pixels
      
      if (isBlueDrawing) {
        const pixelIndex = i / 4
        const x = pixelIndex % CANVAS_SIZE
        const y = Math.floor(pixelIndex / CANVAS_SIZE)
        const key = `${x},${y}`

        if (referencePixels.has(key)) {
          correctPixels++
        } else {
          incorrectPixels++
        }
      }
    }

    if (referencePixels.size === 0) {
      setPercentage(0)
      onProgressUpdate(0)
      return
    }

    // Calculate percentage: inside progress minus outside penalty
    const insidePercentage = Math.min(100, (correctPixels / referencePixels.size) * 100)
    const outsidePercentage = Math.min(100, (incorrectPixels / referencePixels.size) * 100)
    
    const finalPercentage = Math.max(0, insidePercentage - outsidePercentage)

    console.log('Debug:', {
      correctPixels,
      incorrectPixels, 
      totalReferencePixels: referencePixels.size,
      percentageOfSymbolCovered: finalPercentage,
      hasDrawnOutside: incorrectPixels > 0,
      totalBluePixelsDrawn: correctPixels + incorrectPixels
    })

    setPercentage(finalPercentage)
    onProgressUpdate(finalPercentage)

    // Move to next symbol when 80% of the symbol is covered
    if (finalPercentage >= 80) {
      onComplete()
    }
  }, [referencePixels, onProgressUpdate, onComplete])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) * CANVAS_SIZE) / rect.width
    const y = ((e.clientY - rect.top) * CANVAS_SIZE) / rect.height

    // Use blue for user drawing to distinguish from black reference
    ctx.fillStyle = 'blue'
    ctx.beginPath()
    ctx.arc(x, y, BRUSH_SIZE / 2, 0, 2 * Math.PI)
    ctx.fill()

    // Update percentage in real-time while drawing
    if (isDrawing) {
      calculatePercentage()
    }
  }, [isDrawing, calculatePercentage])

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }, [draw])

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      calculatePercentage()
    }
  }, [isDrawing, calculatePercentage])

  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear everything to white
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Redraw light gray reference outline
    if (referenceCanvasRef.current) {
      const refCtx = referenceCanvasRef.current.getContext('2d')
      if (refCtx) {
        ctx.globalAlpha = 0.3
        ctx.drawImage(referenceCanvasRef.current, 0, 0)
        ctx.globalAlpha = 1.0
      }
    }

    setPercentage(0)
    onProgressUpdate(0)
  }, [onProgressUpdate])

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ 
          width: '100%', 
          height: 20, 
          backgroundColor: '#f0f0f0', 
          borderRadius: 10,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: percentage >= 80 ? '#4CAF50' : '#2196F3',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ marginTop: 4, fontSize: 14 }}>
          {percentage.toFixed(1)}% Complete
        </div>
      </div>

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid #ddd',
          borderRadius: 8,
          cursor: 'crosshair',
          display: 'block',
          margin: '0 auto'
        }}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      {/* Hidden reference canvas */}
      <canvas
        ref={referenceCanvasRef}
        style={{ display: 'none' }}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
      />

      {/* Controls */}
      <div style={{ marginTop: 16 }}>
        <button onClick={clearCanvas} style={{ marginRight: 8 }}>
          Clear
        </button>
        <button 
          onClick={onComplete} 
          disabled={percentage < 80}
          style={{ 
            opacity: percentage >= 80 ? 1 : 0.5,
            cursor: percentage >= 80 ? 'pointer' : 'not-allowed'
          }}
        >
          Next Character {percentage >= 80 ? '✓' : `(${percentage.toFixed(0)}%)`}
        </button>
      </div>
    </div>
  )
}