import type { MouseEvent } from 'react'
import { t as i18nT } from '../i18n'

type LinkPagerProps = {
  base: string
  page: number
  total: number
  extraQuery?: string
  onChange: (page: number) => void
}

export function LinkPager({ base, page, total, extraQuery, onChange }: LinkPagerProps) {
  if (total <= 1) return null
  const href = (p: number) => `${base}?page=${p}${extraQuery ? `&${extraQuery}` : ''}`
  const go = (e: MouseEvent<HTMLAnchorElement>, p: number) => {
    e.preventDefault()
    onChange(p)
  }
  return (
    <div className="g_more">
      {page > 1 ? (
        <a href={href(page - 1)} className="g_round" data-type="back" onClick={(e) => go(e, page - 1)}>{i18nT('Prev')}</a>
      ) : (
        <a className="fake" href="#"></a>
      )}
      <span>{page}/{total}</span>
      {page < total ? (
        <a href={href(page + 1)} className="g_round" data-type="back" onClick={(e) => go(e, page + 1)}>{i18nT('Next')}</a>
      ) : (
        <a className="fake" href="#"></a>
      )}
    </div>
  )
}
