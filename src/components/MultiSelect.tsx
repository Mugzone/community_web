import { useEffect, useRef, useState } from 'react'
import '../styles/multi-select.css'

type Option = {
  value: number
  label: string
}

type MultiSelectProps = {
  label: string
  options: Option[]
  selected: number[]
  onChange: (values: number[]) => void
  placeholder?: string
}

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: number) => {
    if (selected.includes(value)) {
      // 至少保留一个选项
      if (selected.length > 1) {
        onChange(selected.filter((v) => v !== value))
      }
    } else {
      onChange([...selected, value])
    }
  }

  const displayText = () => {
    if (selected.length === 0) return placeholder
    if (selected.length === options.length) return placeholder
    const labels = options
      .filter((opt) => selected.includes(opt.value))
      .map((opt) => opt.label)
    return labels.join(', ')
  }

  return (
    <div className="multi-select-field" ref={containerRef}>
      <span className="multi-select-label">{label}</span>
      <button
        type="button"
        className={`multi-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="multi-select-text">{displayText()}</span>
        <svg
          className="multi-select-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="multi-select-dropdown">
          {options.map((opt) => (
            <label className="multi-select-option" key={opt.value}>
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggleOption(opt.value)}
              />
              <span className="multi-select-checkmark">
                {selected.includes(opt.value) && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
