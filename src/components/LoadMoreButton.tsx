type LoadMoreButtonProps = {
  label: string
  loadingLabel: string
  loading?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}

function LoadMoreButton({
  label,
  loadingLabel,
  loading = false,
  disabled = false,
  onClick,
  className = '',
}: LoadMoreButtonProps) {
  const classNames = `load-more${className ? ` ${className}` : ''}`
  const isDisabled = disabled || loading

  return (
    <button className={classNames} type="button" onClick={onClick} disabled={isDisabled}>
      {loading ? loadingLabel : label}
    </button>
  )
}

export default LoadMoreButton
