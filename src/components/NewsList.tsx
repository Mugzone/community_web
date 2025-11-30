import type { NewsItem } from '../types/content'
import { useI18n } from '../i18n'

type NewsListProps = {
  items: NewsItem[]
}

function NewsList({ items }: NewsListProps) {
  const { t } = useI18n()

  const renderTag = (tag?: string) => {
    if (!tag) return null
    const key = `tag.${tag.toLowerCase()}`
    const translated = t(key)
    const label = translated === key ? tag : translated
    return <span className="pill ghost">{label}</span>
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
            {renderTag(item.tag)}
            <a href={item.link}>{item.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NewsList
