import { useState } from 'react'
import { Shell } from '../../components/Layout'
import { asArray, EmptyBlock, LoadingBlock, num, Pager, useLoad } from '../../lib/legacy'
import { staticUrl, URLS } from '../../lib/urls'
import { fetchSubmissionPage } from '../../network/legacy'
import { coverUrl } from '../../utils/formatters'
import { t as i18nT } from '../../i18n'

type SubmissionRow = {
  chart?: Record<string, any>
  status?: number | string | Record<string, any>
}

type SubmissionData = { items: SubmissionRow[]; total: number; page: number }

export default function SubmitAll() {
  const [page, setPage] = useState(1)
  const [mode, setMode] = useState(-1)
  const [status, setStatus] = useState(0)

  const { data, loading, error } = useLoad<SubmissionData>(
    async () => {
      const resp = await fetchSubmissionPage(page)
      const d: any = resp?.data ?? resp ?? {}
      return {
        items: asArray<SubmissionRow>(d?.items ?? d?.list ?? d),
        total: Math.max(1, num(d?.total, 1)),
        page: num(d?.page, page - 1),
      }
    },
    [page, mode, status],
    { items: [] as SubmissionRow[], total: 1, page: 0 },
  )

  const visible = data.items.filter((row) => {
    const m: any = row.chart ?? row
    if (mode >= 0 && num(m.mode, -1) !== mode) return false
    if (status === 1 && num(row.status, 0) !== 1) return false
    return true
  })
  const blanks = visible.length % 6 === 0 ? 0 : 6 - (visible.length % 6)

  const pickMode = (v: number) => {
    setMode(v)
    setPage(1)
  }
  const pickStatus = (v: number) => {
    setStatus(v)
    setPage(1)
  }

  return (
    <Shell variant="two-col" title="Submission" css={['chartlist.css']}>
      <div className="g_title">Submission</div>
      <div className="g_cont">
        <div id="option">
          <div>
            <span className="g_round">{i18nT('Mode')}</span>
            <div className="g_select sel_mode" data-key="mode">
              <span className={mode === -1 ? 'curr' : ''} data-id="-1" onClick={() => pickMode(-1)}>{i18nT('All')}</span>
              {[0, 3, 4, 5, 6].map((m) => (
                <span key={m} className={mode === m ? 'curr' : ''} data-id={m} onClick={() => pickMode(m)}>
                  <img src={staticUrl(`img/mode/mode-${m}.png`)} alt="" />
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="g_round">{i18nT('Status')}</span>
            <div className="g_select" data-key="status">
              <span className={status === 0 ? 'curr' : ''} data-id="0" onClick={() => pickStatus(0)}>{i18nT('All')}</span>
              <span className={status === 1 ? 'curr' : ''} data-id="1" onClick={() => pickStatus(1)}>{i18nT('Submitted')}</span>
            </div>
          </div>
        </div>
        {loading && <LoadingBlock />}
        {!loading && error && visible.length === 0 && <EmptyBlock />}
        {visible.length > 0 ? (
          <div id="maps">
            {visible.map((row, idx) => {
              const m: any = row.chart ?? row
              const cid = m.id ?? m.cid ?? idx
              const cover = m.cover ?? m.song?.cover_url ?? m.song?.cover ?? ''
              return (
                <div className="g_map" key={cid}>
                  <a className="link" href={URLS.chartPage(cid)} target="_blank" rel="noreferrer">
                    {cover
                      ? <div className="cover g_cover" style={{ backgroundImage: `url(${coverUrl(String(cover))})` }}></div>
                      : <div className="cover"></div>}
                    <img className="mode" src={staticUrl(`img/mode/mode-${num(m.mode, 0)}.png`)} alt="" />
                    <div className="meta">
                      <p className="title textfix">{String(m.title ?? m.song?.title ?? '')}</p>
                      <p className="version textfix">{String(m.version ?? m.display_version ?? '')}</p>
                    </div>
                  </a>
                </div>
              )
            })}
            {Array.from({ length: blanks }, (_, i) => (
              <div className="g_map justfyHold" key={`blank-${i}`}></div>
            ))}
            <span className="justfix"></span>
          </div>
        ) : (
          <div className="g_memo" style={{ display: !loading && visible.length === 0 ? 'block' : 'none' }}>
            <span className="g_round">{i18nT('No more charts')}</span>
          </div>
        )}
        <Pager page={page} total={data.total} onChange={(p) => { setPage(p) }} />
      </div>
    </Shell>
  )
}
