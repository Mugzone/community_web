import { Children, Fragment, type ReactNode } from 'react'
import { SkeletonRows } from './Skeleton'

export function JustifyRow({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <>
      {items.map((child, i) => (
        <Fragment key={i}>{child}{' '}</Fragment>
      ))}
    </>
  )
}

export function Pager({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (page: number) => void
}) {
  if (total <= 1) return null
  return (
    <div className="pager g_more">
      {page > 1 ? (
        <a href="#" className="g_round" onClick={(e) => { e.preventDefault(); onChange(page - 1) }}>&lt;</a>
      ) : (
        <a className="fake" href="#">&nbsp;</a>
      )}
      <span>{page}/{total}</span>
      {page < total ? (
        <a href="#" className="g_round" onClick={(e) => { e.preventDefault(); onChange(page + 1) }}>&gt;</a>
      ) : (
        <a className="fake" href="#">&nbsp;</a>
      )}
    </div>
  )
}

export function LoadingBlock({ text = 'Loading...', count = 5 }: { text?: string; count?: number }) {
  return <SkeletonRows count={count} label={text} />
}

export function EmptyBlock({ text = 'No data' }: { text?: string }) {
  return <div className="empty_block">{text}</div>
}
