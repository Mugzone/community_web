import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

type Props = {
  label: string
  min: number
  max: number
  step?: number
  minValue: string
  maxValue: string
  minPlaceholder?: string
  maxPlaceholder?: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
}

export default function RangeSlider({
  label,
  min,
  max,
  step = 1,
  minValue,
  maxValue,
  minPlaceholder,
  maxPlaceholder,
  onMinChange,
  onMaxChange,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)

  const parseValue = (value: string, fallback: number) => {
    const parsed = Number(value)
    if (value === '' || !Number.isFinite(parsed)) return fallback
    return Math.max(min, Math.min(max, parsed))
  }

  const currentMin = parseValue(minValue, min)
  const currentMax = parseValue(maxValue, max)
  const range = max - min
  const minPercent = ((currentMin - min) / range) * 100
  const maxPercent = ((currentMax - min) / range) * 100

  const valueFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current) return min
    const rect = trackRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round((min + percent * range) / step) * step
  }, [min, range, step])

  const startDrag = (type: 'min' | 'max') => (e: ReactMouseEvent) => {
    e.preventDefault()
    setDragging(type)
  }

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      const type = target.classList.contains('chart_range_thumb_min') ? 'min'
        : target.classList.contains('chart_range_thumb_max') ? 'max' : null
      if (!type) return
      if (e.cancelable) e.preventDefault()
      setDragging(type)
    }
    track.addEventListener('touchstart', onTouchStart, { passive: false })
    return () => track.removeEventListener('touchstart', onTouchStart)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const move = (clientX: number) => {
      const value = valueFromPosition(clientX)
      if (dragging === 'min') onMinChange(String(Math.min(value, currentMax)))
      else onMaxChange(String(Math.max(value, currentMin)))
    }
    const onMouseMove = (e: MouseEvent) => move(e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault()
      if (e.touches.length > 0) move(e.touches[0].clientX)
    }
    const stop = () => setDragging(null)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stop)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', stop)
    document.addEventListener('touchcancel', stop)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', stop)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', stop)
      document.removeEventListener('touchcancel', stop)
    }
  }, [dragging, currentMin, currentMax, valueFromPosition, onMinChange, onMaxChange])

  const onTrackClick = (e: ReactMouseEvent) => {
    if (dragging) return
    const value = valueFromPosition(e.clientX)
    if (Math.abs(value - currentMin) <= Math.abs(value - currentMax)) {
      onMinChange(String(Math.min(value, currentMax)))
    } else {
      onMaxChange(String(Math.max(value, currentMin)))
    }
  }

  return (
    <div className="chart_range">
      <span className="chart_range_label">{label}</span>
      <div className="chart_range_row">
        <input
          type="number"
          className="chart_range_input"
          value={minValue}
          min={min}
          max={max}
          step={step}
          placeholder={minPlaceholder}
          onChange={(e) => onMinChange(e.target.value)}
        />
        <div className="chart_range_track_wrap">
          <div ref={trackRef} className="chart_range_track" onClick={onTrackClick}>
            <div className="chart_range_fill" style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }} />
            <div
              className={`chart_range_thumb chart_range_thumb_min${dragging === 'min' ? ' active' : ''}`}
              style={{ left: `${minPercent}%` }}
              role="slider"
              aria-label={`${label} min`}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={currentMin}
              onMouseDown={startDrag('min')}
            />
            <div
              className={`chart_range_thumb chart_range_thumb_max${dragging === 'max' ? ' active' : ''}`}
              style={{ left: `${maxPercent}%` }}
              role="slider"
              aria-label={`${label} max`}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={currentMax}
              onMouseDown={startDrag('max')}
            />
          </div>
        </div>
        <input
          type="number"
          className="chart_range_input"
          value={maxValue}
          min={min}
          max={max}
          step={step}
          placeholder={maxPlaceholder}
          onChange={(e) => onMaxChange(e.target.value)}
        />
      </div>
    </div>
  )
}
