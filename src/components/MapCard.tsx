import type { MapItem } from '../types/content'
import { useI18n } from '../i18n'

type MapCardProps = {
  item: MapItem
}

function MapCard({ item }: MapCardProps) {
  const { t } = useI18n()
  const highlightLabel = item.highlight
    ? (() => {
        const normalized = item.highlight.toLowerCase().replace(/\s+/g, '')
        const keyMap: Record<string, string> = { new: 'tag.new', weeklypick: 'tag.weekly' }
        const key = keyMap[normalized]
        if (!key) return item.highlight
        const translated = t(key)
        return translated === key ? item.highlight : translated
      })()
    : undefined

  return (
    <a className="map-card" href={item.link}>
      <div className="map-cover" style={{ backgroundImage: `url(${item.cover})` }}>
        {highlightLabel && <span className="pill">{highlightLabel}</span>}
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
