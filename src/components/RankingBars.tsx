type RankingBarItem = {
  uid?: number
  name?: string
  value?: number
  rank?: number
}

type RankingBarsProps = {
  items: RankingBarItem[]
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

const formatLabel = (item: RankingBarItem, index: number) => {
  const rank = item.rank ?? index + 1
  const name = item.name ?? (item.uid ? `#${item.uid}` : '-')
  return `${rank}. ${name}`
}

function RankingBars({ items }: RankingBarsProps) {
  const max = Math.max(...items.map((item) => toNumber(item.value)), 1)
  return (
    <ul className='wiki-template-bars'>
      {items.map((item, index) => {
        const value = toNumber(item.value)
        const percent = Math.round((value / max) * 100)
        const labelText = formatLabel(item, index)
        return (
          <li key={`${item.uid ?? 'row'}-${item.rank ?? index}`}>
            {renderLabel(item, labelText)}
            <div
              className='wiki-template-bar'
              style={{ width: `${percent}%` }}
            />
            <span className='wiki-template-value'>{value}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default RankingBars
export type { RankingBarItem }
