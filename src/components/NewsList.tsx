import type { NewsItem } from '../types/content'

type NewsListProps = {
  items: NewsItem[]
}

function NewsList({ items }: NewsListProps) {
  return (
    <div className="news">
      <ul>
        {items.map((item) => (
          <li key={item.title}>
            {item.tag && <span className="pill ghost">{item.tag}</span>}
            <a href={item.link}>{item.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NewsList
