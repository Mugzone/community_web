import type { ReactNode } from 'react'

type ChartCardProps = {
  href: string
  cover: string
  title: string
  artist?: string
  badges?: ReactNode
  meta?: ReactNode
  footer?: ReactNode
  className?: string
}

function ChartCard({
  href,
  cover,
  title,
  artist,
  badges,
  meta,
  footer,
  className,
}: ChartCardProps) {
  const cardClassName = className ? `chart-card ${className}` : 'chart-card'

  return (
    <a className={cardClassName} href={href}>
      <div
        className="chart-card-cover"
        style={{ backgroundImage: `url(${cover})` }}
      />
      <div className="chart-card-body">
        <div className="chart-card-header">
          {badges && <div className="chart-card-badges">{badges}</div>}
          <div>
            <p className="chart-card-title">{title}</p>
            {artist && <p className="chart-card-artist">{artist}</p>}
          </div>
        </div>
        {(meta || footer) && (
          <div className="chart-card-foot">
            {meta && <div className="chart-card-meta">{meta}</div>}
            {footer && <div className="chart-card-footer">{footer}</div>}
          </div>
        )}
      </div>
    </a>
  )
}

export default ChartCard
