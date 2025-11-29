import type { MapItem } from '../types/content'

type MapCardProps = {
  item: MapItem
}

function MapCard({ item }: MapCardProps) {
  return (
    <a className="map-card" href={item.link}>
      <div className="map-cover" style={{ backgroundImage: `url(${item.cover})` }}>
        {item.highlight && <span className="pill">{item.highlight}</span>}
      </div>
      <div className="map-meta">
        <p className="map-title">{item.title}</p>
        <p className="map-artist">{item.artist}</p>
        <p className="map-mode">{item.mode}</p>
      </div>
    </a>
  )
}

export default MapCard
