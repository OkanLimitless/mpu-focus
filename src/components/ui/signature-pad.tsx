'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void
  className?: string
  height?: number
}

/**
 * Lightweight draw-to-sign canvas. Emits a PNG data URL whenever the
 * signature changes, or null when cleared/empty.
 */
export default function SignaturePad({ onChange, className, height = 180 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const hasStrokesRef = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  const getContext = () => canvasRef.current?.getContext('2d') || null

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const width = canvas.clientWidth

    // Preserve drawing on resize by re-painting the old bitmap.
    const previous = hasStrokesRef.current ? canvas.toDataURL('image/png') : null

    canvas.width = width * ratio
    canvas.height = height * ratio
    const ctx = getContext()
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'

    if (previous) {
      const image = new Image()
      image.onload = () => ctx.drawImage(image, 0, 0, width, height)
      image.src = previous
    }
  }, [height])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const ctx = getContext()
    if (!ctx) return
    canvasRef.current?.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const { x, y } = getPoint(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
    // A dot for single taps.
    ctx.lineTo(x + 0.1, y + 0.1)
    ctx.stroke()
    hasStrokesRef.current = true
    setIsEmpty(false)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    event.preventDefault()
    const ctx = getContext()
    if (!ctx) return
    const { x, y } = getPoint(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handlePointerUp = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (canvas && hasStrokesRef.current) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokesRef.current = false
    setIsEmpty(true)
    onChange(null)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
        {isEmpty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-400">
            Hier mit Finger oder Maus unterschreiben
          </p>
        )}
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={clear} disabled={isEmpty}>
          <Eraser className="h-4 w-4" aria-hidden="true" />
          Löschen
        </Button>
      </div>
    </div>
  )
}
