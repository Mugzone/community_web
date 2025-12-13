import type { NewsItem } from '../types/content'
import { useI18n } from '../i18n'

type NewsListProps = {
  items: NewsItem[]
}

function NewsList({ items }: NewsListProps) {
  const { t } = useI18n()

  const formatTime = (ts?: number) => {
    if (!ts) return ''
    const ms = ts < 1_000_000_000_000 ? ts * 1000 : ts
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString()
  }

  if (!items.length) {
    return (
      <div className="news">
        <p className="home-news-empty">{t('home.empty.news')}</p>
      </div>
    )
  }

  return (
    <div className="news">
      <ul>
        {items.map((item) => (
          <li key={item.title}>
            {(item.time || item.tag) && (
              <div className="news-meta">
                {item.time && <span className="pill ghost">{formatTime(item.time)}</span>}
              </div>
            )}
            <a href={item.link}>{item.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NewsList
