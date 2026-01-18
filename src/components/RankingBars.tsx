import AvatarImage from './AvatarImage'
import { avatarUidUrl } from '../utils/formatters'

type RankingBarItem = {
  uid?: number
  name?: string
  value?: number
  rank?: number
}

type RankingBarsProps = {
  items: RankingBarItem[]
  columns?: {
    rank: string
    player: string
    value: string
  }
}

const toNumber = (value?: number) => (Number.isFinite(value) ? Number(value) : 0)

const renderLabel = (item: RankingBarItem, labelText: string) => {
  if (item.uid) {
    return (
      <a className='wiki-template-label' href={`/player/${item.uid}`}>
        {labelText}
      </a>
    )
  }
  return <span className='wiki-template-label'>{labelText}</span>
}

const formatName = (item: RankingBarItem) =>
  item.name ?? (item.uid ? `#${item.uid}` : '-')

function RankingBars({ items, columns }: RankingBarsProps) {
  const max = Math.max(...items.map((item) => toNumber(item.value)), 1)
  return (
    <div className='wiki-template-bars-wrap'>
      {columns && (
        <div className='wiki-template-bars-head'>
          <span>{columns.rank}</span>
          <span>{columns.player}</span>
          <span>{columns.value}</span>
        </div>
      )}
      <ul className='wiki-template-bars'>
        {items.map((item, index) => {
          const value = toNumber(item.value)
          const percent = Math.round((value / max) * 100)
          const rank = item.rank ?? index + 1
          const displayName = formatName(item)
          return (
            <li key={`${item.uid ?? 'row'}-${item.rank ?? index}`}>
              <span className='wiki-template-rank'>{rank}</span>
              <div className='wiki-template-user'>
                {item.uid ? (
                  <AvatarImage
                    className='wiki-template-avatar'
                    src={avatarUidUrl(item.uid)}
                    alt={displayName}
                    seed={item.uid}
                  />
                ) : (
                  <span className='wiki-template-avatar placeholder' aria-hidden='true' />
                )}
                {renderLabel(item, displayName)}
              </div>
              <span className='wiki-template-value'>{value}</span>
              <div className='wiki-template-bar' style={{ width: `${percent}%` }} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default RankingBars
export type { RankingBarItem }
