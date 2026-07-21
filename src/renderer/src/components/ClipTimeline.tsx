import React, { useCallback, useRef } from 'react'

interface Props {
  durationSec: number
  startSec: number
  endSec: number
  onChange: (start: number, end: number) => void
  onScrub?: (sec: number) => void
  onScrubEnd?: () => void
}

export const ClipTimeline: React.FC<Props> = ({
  durationSec,
  startSec,
  endSec,
  onChange,
  onScrub,
  onScrubEnd
}) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'start' | 'end' | null>(null)

  const xToSec = useCallback(
    (clientX: number): number => {
      const track = trackRef.current
      if (!track) return 0
      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return ratio * durationSec
    },
    [durationSec]
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return
      const sec = xToSec(e.clientX)
      if (dragging.current === 'start') {
        const next = Math.min(sec, endSec - 0.1)
        onChange(next, endSec)
        onScrub?.(next)
      } else {
        const next = Math.max(sec, startSec + 0.1)
        onChange(startSec, next)
        onScrub?.(next)
      }
    },
    [xToSec, onChange, onScrub, startSec, endSec]
  )

  const stopDrag = useCallback(() => {
    dragging.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopDrag)
    onScrubEnd?.()
  }, [onPointerMove, onScrubEnd])

  const startDrag = (which: 'start' | 'end') => (): void => {
    dragging.current = which
    onScrub?.(which === 'start' ? startSec : endSec)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stopDrag)
  }

  const startPct = durationSec ? (startSec / durationSec) * 100 : 0
  const endPct = durationSec ? (endSec / durationSec) * 100 : 100

  return (
    <div
      ref={trackRef}
      style={{
        position: 'relative',
        height: 40,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(0,245,255,0.25)',
        borderRadius: 2
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${startPct}%`,
          width: `${Math.max(0, endPct - startPct)}%`,
          background: 'linear-gradient(90deg, rgba(0,245,255,0.35), rgba(255,43,214,0.35))',
          borderTop: '2px solid var(--cyan)',
          borderBottom: '2px solid var(--magenta)'
        }}
      />
      <div
        onPointerDown={startDrag('start')}
        title="Marcador de entrada"
        style={{
          position: 'absolute',
          left: `${startPct}%`,
          top: -2,
          bottom: -2,
          width: 10,
          marginLeft: -5,
          background: 'var(--cyan)',
          boxShadow: 'var(--glow-cyan)',
          cursor: 'ew-resize',
          borderRadius: 2
        }}
      />
      <div
        onPointerDown={startDrag('end')}
        title="Marcador de salida"
        style={{
          position: 'absolute',
          left: `${endPct}%`,
          top: -2,
          bottom: -2,
          width: 10,
          marginLeft: -5,
          background: 'var(--magenta)',
          boxShadow: 'var(--glow-magenta)',
          cursor: 'ew-resize',
          borderRadius: 2
        }}
      />
    </div>
  )
}
