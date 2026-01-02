import { useCallback, useEffect, useRef, useState } from 'react'
import '../styles/range-slider.css'

type RangeSliderProps = {
  label: string
  min: number
  max: number
  minValue: string
  maxValue: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
  minPlaceholder?: string
  maxPlaceholder?: string
  step?: number
}

export default function RangeSlider({
  label,
  min,
  max,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  step = 1,
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)

  // 解析输入值，如果为空或无效则使用默认边界
  const parseValue = (val: string, fallback: number) => {
    const num = Number(val)
    if (val === '' || Number.isNaN(num)) return fallback
    return Math.max(min, Math.min(max, num))
  }

  const currentMin = parseValue(minValue, min)
  const currentMax = parseValue(maxValue, max)

  // 计算滑块位置百分比
  const range = max - min
  const minPercent = ((currentMin - min) / range) * 100
  const maxPercent = ((currentMax - min) / range) * 100

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min
      const rect = trackRef.current.getBoundingClientRect()
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const rawValue = min + percent * range
      // 对齐到 step
      return Math.round(rawValue / step) * step
    },
    [min, range, step]
  )

  const handleMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(type)
  }

  const handleTouchStart = (type: 'min' | 'max') => (e: React.TouchEvent) => {
    e.preventDefault()
    setDragging(type)
  }

  useEffect(() => {
    if (!dragging) return

    const handleMove = (clientX: number) => {
      const newValue = getValueFromPosition(clientX)
      if (dragging === 'min') {
        // 最小值不能超过最大值
        const clampedValue = Math.min(newValue, currentMax)
        onMinChange(String(clampedValue))
      } else {
        // 最大值不能低于最小值
        const clampedValue = Math.max(newValue, currentMin)
        onMaxChange(String(clampedValue))
      }
    }

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX)
    }

    const handleUp = () => setDragging(null)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleUp)
    }
  }, [dragging, currentMin, currentMax, getValueFromPosition, onMinChange, onMaxChange])

  // 点击轨道时移动最近的滑块
  const handleTrackClick = (e: React.MouseEvent) => {
    if (dragging) return
    const value = getValueFromPosition(e.clientX)
    const distToMin = Math.abs(value - currentMin)
    const distToMax = Math.abs(value - currentMax)
    if (distToMin <= distToMax) {
      onMinChange(String(Math.min(value, currentMax)))
    } else {
      onMaxChange(String(Math.max(value, currentMin)))
    }
  }

  return (
    <div className="range-slider-field">
      <span className="range-slider-label">{label}</span>
      <div className="range-slider-container">
        <input
          type="number"
          className="range-slider-input"
          value={minValue}
          min={min}
          max={max}
          step={step}
          placeholder={minPlaceholder}
          onChange={(e) => onMinChange(e.target.value)}
        />
        <div className="range-slider-track-wrapper">
          <div
            ref={trackRef}
            className="range-slider-track"
            onClick={handleTrackClick}
          >
            <div
              className="range-slider-fill"
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`,
              }}
            />
            <div
              className={`range-slider-thumb range-slider-thumb-min ${dragging === 'min' ? 'active' : ''}`}
              style={{ left: `${minPercent}%` }}
              onMouseDown={handleMouseDown('min')}
              onTouchStart={handleTouchStart('min')}
            />
            <div
              className={`range-slider-thumb range-slider-thumb-max ${dragging === 'max' ? 'active' : ''}`}
              style={{ left: `${maxPercent}%` }}
              onMouseDown={handleMouseDown('max')}
              onTouchStart={handleTouchStart('max')}
            />
          </div>
        </div>
        <input
          type="number"
          className="range-slider-input"
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
