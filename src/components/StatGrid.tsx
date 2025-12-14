import type { StatItem } from '../types/content'

type StatGridProps = {
  items: StatItem[]
}

function StatGrid({ items }: StatGridProps) {
  return (
    <div className="stat-grid-wrapper">
      <div className="stat-grid">
        {items.map((item) => (
          <div className="stat-card" key={item.label}>
            <p className="stat-value">{item.value}</p>
            <p className="stat-label">{item.label}</p>
            <p className="stat-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatGrid
