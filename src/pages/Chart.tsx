import { useCallback, useEffect, useMemo, useState } from 'react'
import CommentThread from '../components/CommentThread'
import PageLayout from '../components/PageLayout'
import { useAuthModal } from '../components/useAuthModal'
import { useI18n } from '../i18n'
import {
  addComment,
  deleteComment as removeComment,
  donateChart,
  fetchChartDonateList,
  fetchChartInfo,
  fetchComments,
  fetchRankingList,
  fetchWiki,
  fetchWikiTemplate,
  getSession,
  likeChart,
  type RespChartDonate,
  type RespChartInfo,
  type RespRanking,
} from '../network/api'
import {avatarUidUrl, coverUrl, modeLabel} from '../utils/formatters'
import { applyTemplateHtml, renderTemplateHtml } from '../utils/wikiTemplates'
import { renderWiki, type WikiTemplate } from '../utils/wiki'
import './chart.css'
import '../components/comment.css'
import './wiki.css'

const parseChartId = () => {
  const match = window.location.pathname.match(/\/chart\/(\d+)/)
  if (match?.[1]) return Number(match[1])
  const search = new URLSearchParams(window.location.search)
  const cid = search.get('cid')
  return cid ? Number(cid) : undefined
}

const computeRating = (like?: number, dislike?: number) => {
  const l = like ?? 0
  const d = dislike ?? 0
  const score = (l + 1) / (l + d + 2)
  const percent = Math.round(score * 100)
  const score5 = Math.round(score * 50) / 10
  return { percent, score5 }
}

const formatSeconds = (value?: number) => {
  if (!value || Number.isNaN(value)) return ''
  const minutes = Math.floor(value / 60)
  const seconds = Math.max(0, value - minutes * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

type RankFilters = {
  pro: boolean
  sort: 'score' | 'combo' | 'acc'
  mod: 'all' | 'noMod' | 'noSpeed' | 'noModNoSpeed'
}

function ChartPage() {
  const { t } = useI18n()
  const auth = useAuthModal()
  const chartId = useMemo(() => parseChartId(), [])

  const [info, setInfo] = useState<RespChartInfo>()
  const [infoError, setInfoError] = useState('')
  const [loadingInfo, setLoadingInfo] = useState(false)

  const [likeLoading, setLikeLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'ranking' | 'comment' | 'donate' | 'wiki'>('ranking')

  const [ranking, setRanking] = useState<RespRanking>()
  const [rankingError, setRankingError] = useState('')
  const [rankingLoading, setRankingLoading] = useState(false)
  const [rankFilters, setRankFilters] = useState<RankFilters>({
    pro: false,
    sort: 'score',
    mod: 'all',
  })

  const [donateList, setDonateList] = useState<RespChartDonate[]>([])
  const [donateError, setDonateError] = useState('')
  const [donateLoading, setDonateLoading] = useState(false)
  const [donateAmount, setDonateAmount] = useState('10')
  const [donateSubmitting, setDonateSubmitting] = useState(false)

  const [wikiHtml, setWikiHtml] = useState('')
  const [wikiBase, setWikiBase] = useState('')
  const [wikiTemplates, setWikiTemplates] = useState<WikiTemplate[]>([])
  const [wikiError, setWikiError] = useState('')
  const [wikiLoading, setWikiLoading] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateError, setTemplateError] = useState('')

  useEffect(() => {
    if (!chartId || Number.isNaN(chartId)) {
      setInfoError(t('chart.error.missingId'))
      return
    }
    let cancelled = false
    const loadInfo = async () => {
      setLoadingInfo(true)
      setInfoError('')
      try {
        const resp = await fetchChartInfo({ cid: chartId })
        if (cancelled) return
        if (resp.code !== 0) {
          setInfoError(t('chart.error.load'))
          return
        }
        setInfo(resp)
      } catch (err) {
        console.error(err)
        if (!cancelled) setInfoError(t('chart.error.load'))
      } finally {
        if (!cancelled) setLoadingInfo(false)
      }
    }
    loadInfo()
    return () => {
      cancelled = true
    }
  }, [chartId, t])

  const buildOrder = (filters: RankFilters) => {
    let order = 0
    if (filters.sort === 'combo') order |= 1
    if (filters.sort === 'acc') order |= 2
    if (filters.mod === 'noMod' || filters.mod === 'noModNoSpeed') order |= 4
    if (filters.mod === 'noSpeed' || filters.mod === 'noModNoSpeed') order |= 8
    return order
  }

  const loadRanking = async (filters = rankFilters) => {
    if (!chartId || Number.isNaN(chartId)) {
      setRankingError(t('chart.error.missingId'))
      setRanking(undefined)
      return
    }
    setRankingLoading(true)
    setRankingError('')
    try {
      const resp = await fetchRankingList({ cid: chartId, pro: filters.pro ? 1 : 0, order: buildOrder(filters) })
      if (resp.code !== 0 || !resp.data) {
        setRankingError(t('chart.ranking.error'))
        setRanking(undefined)
        return
      }
      setRanking(resp)
    } catch (err) {
      console.error(err)
      setRankingError(t('chart.ranking.error'))
      setRanking(undefined)
    } finally {
      setRankingLoading(false)
    }
  }

  useEffect(() => {
    loadRanking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDonate = useCallback(async () => {
    if (!chartId || Number.isNaN(chartId)) {
      setDonateError(t('chart.error.missingId'))
      setDonateList([])
      return
    }
    setDonateLoading(true)
    setDonateError('')
    try {
      const resp = await fetchChartDonateList({ cid: chartId })
      if (resp.code !== 0 || !resp.data) {
        setDonateError(t('chart.donate.error'))
        setDonateList([])
        return
      }
      setDonateList(resp.data)
    } catch (err) {
      console.error(err)
      setDonateError(t('chart.donate.error'))
      setDonateList([])
    } finally {
      setDonateLoading(false)
    }
  }, [chartId, t])

  useEffect(() => {
    if (activeTab === 'donate') {
      loadDonate()
    }
    if (activeTab === 'wiki') {
      if (!chartId || Number.isNaN(chartId)) {
        setWikiError(t('chart.error.missingId'))
        setWikiBase('')
        setWikiTemplates([])
        setWikiHtml('')
        setWikiLoading(false)
        return
      }
      setWikiError('')
      setWikiLoading(true)
      fetchWiki({ cid: chartId, raw: 1 })
        .then((resp) => {
          if (resp.code !== 0 || !resp.wiki) {
            setWikiHtml('')
            setWikiTemplates([])
            setWikiBase('')
            return
          }
          if (resp.raw === false) {
            setWikiBase(resp.wiki)
            setWikiTemplates([])
          } else {
            const parsed = renderWiki(resp.wiki, {
              hiddenLabel: t('wiki.hiddenLabel'),
              templateLabel: t('wiki.templateLabel'),
              templateLoading: t('wiki.template.loading'),
            })
            setWikiBase(parsed.html)
            setWikiTemplates(parsed.templates)
          }
        })
        .catch((err) => {
          console.error(err)
          setWikiError(t('chart.wiki.error'))
          setWikiBase('')
          setWikiTemplates([])
          setWikiHtml('')
        })
        .finally(() => setWikiLoading(false))
    }
  }, [activeTab, chartId, loadDonate, t])

  useEffect(() => {
    if (!wikiBase) {
      setWikiHtml('')
      setTemplateError('')
      setTemplateLoading(false)
      return
    }
    if (!wikiTemplates.length) {
      setWikiHtml(wikiBase)
      setTemplateLoading(false)
      return
    }
    let cancelled = false
    const loadTemplates = async () => {
      setTemplateLoading(true)
      setTemplateError('')
      try {
        const blocks = await Promise.all(
          wikiTemplates.map(async (tmpl) => {
            try {
              const resp = await fetchWikiTemplate({ name: tmpl.name, ...tmpl.params })
              if (resp.code !== 0) return renderTemplateHtml(t, tmpl, resp)
              return renderTemplateHtml(t, tmpl, resp)
            } catch (err) {
              console.error(err)
              return `<div class="wiki-template-placeholder wiki-template-warning">${t('wiki.template.error')}</div>`
            }
          }),
        )
        if (cancelled) return
        const merged = applyTemplateHtml(wikiBase, blocks)
        setWikiHtml(merged)
      } catch (err) {
        console.error(err)
        if (cancelled) return
        setTemplateError(t('wiki.template.error'))
        setWikiHtml(wikiBase)
      } finally {
        if (!cancelled) setTemplateLoading(false)
      }
    }
    loadTemplates()
    return () => {
      cancelled = true
    }
  }, [t, wikiBase, wikiTemplates])

  const handleLike = async (state: 1 | 2) => {
    if (!chartId || Number.isNaN(chartId)) return
    const session = getSession()
    if (!session || session.uid === 1) {
      auth.openAuth('signin')
      return
    }
    if (likeLoading) return
    setLikeLoading(true)
    try {
      const resp = await likeChart({ cid: chartId, state })
      if (resp.code !== 0) return
      setInfo((prev) => {
        if (!prev) return prev
        const nextState = prev.likeState === state ? 0 : state
        const delta = prev.likeState === state ? -1 : 1
        if (state === 1) {
          return { ...prev, likeState: nextState, like: Math.max(0, (prev.like ?? 0) + delta) }
        }
        return { ...prev, likeState: nextState, dislike: Math.max(0, (prev.dislike ?? 0) + delta) }
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLikeLoading(false)
    }
  }

  const rating = computeRating(info?.like, info?.dislike)
  const rankLevel = ranking?.meta?.level

  const commentFetcher = async ({ from }: { from?: number }) => {
    const resp = await fetchComments({ cid: chartId ?? 0, from })
    return resp
  }

  const commentSubmitter = async (content: string) => {
    const resp = await addComment({ cid: chartId ?? 0, content })
    return resp
  }

  const commentDeleter = async (tid: number) => {
    const resp = await removeComment({ tid })
    return resp
  }

  const handleDonate = async () => {
    if (!chartId || Number.isNaN(chartId)) return
    const session = getSession()
    if (!session || session.uid === 1) {
      auth.openAuth('signin')
      return
    }
    const gold = Number(donateAmount)
    if (!Number.isFinite(gold) || gold <= 0) {
      setDonateError(t('chart.donate.invalid'))
      return
    }
    setDonateSubmitting(true)
    setDonateError('')
    try {
      const resp = await donateChart({ cid: chartId, gold })
      if (resp.code !== 0) {
        setDonateError(t('chart.donate.error'))
        return
      }
      setDonateAmount('10')
      loadDonate()
    } catch (err) {
      console.error(err)
      setDonateError(t('chart.donate.error'))
    } finally {
      setDonateSubmitting(false)
    }
  }

  const renderRankingTable = () => {
    if (rankingLoading) {
      return (
        <div className="chart-rank-skeleton">
          <div className="line wide" />
          <div className="line" />
          <div className="line" />
        </div>
      )
    }
    if (rankingError) return <div className="chart-rank-empty">{rankingError}</div>
    const data = ranking?.data ?? []
    if (!data.length) return <div className="chart-rank-empty">{t('chart.ranking.empty')}</div>
    return (
      <div className="chart-rank-table">
        <div className="chart-rank-head">
          <span>#</span>
          <span>{t('chart.ranking.player')}</span>
          <span>{t('chart.ranking.score')}</span>
          <span>{t('chart.ranking.acc')}</span>
          <span>{t('chart.ranking.combo')}</span>
          <span>{t('chart.ranking.time')}</span>
        </div>
        {data.map((item) => (
          <div className="chart-rank-row" key={`${item.uid}-${item.time}-${item.score}`}>
            <span className="chart-rank-pos">{item.ranking ?? '-'}</span>
            <a className="chart-rank-player" href={`/player/${item.uid}`}>
              <img className="chart-rank-avatar" src={avatarUidUrl(item.uid)} alt={item.username || t('chart.ranking.unknown')} />
              <span>{item.username || t('chart.ranking.unknown')}</span>
            </a>
            <span>{item.score}</span>
            <span>{`${item.acc?.toFixed(2) ?? '0'}%`}</span>
            <span>{item.combo}</span>
            <span>{item.time ? new Date(item.time * 1000).toLocaleDateString() : '-'}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <PageLayout className="chart-page" topbarProps={auth.topbarProps}>

      <header className="chart-hero content-container">
        <div className="chart-cover" style={{ backgroundImage: `url(${coverUrl(info?.cover)})` }} />
        <div className="chart-summary">
          <p className="eyebrow">{t('chart.eyebrow')}</p>
          <h1>{info?.title || t('chart.placeholder.title')}</h1>
          <p className="chart-artist">{info?.artist || t('chart.placeholder.artist')}</p>
          <p className="chart-version">{info?.version || t('chart.placeholder.version')}</p>
          <div className="chart-meta-row">
            {info?.sid && (
              <a className="pill ghost" href={`/song/${info.sid}`}>
                {t('chart.meta.song', { id: info.sid })}
              </a>
            )}
            <span className="pill ghost">{modeLabel(info?.mode)}</span>
            {info?.length ? <span className="pill ghost">{t('charts.card.length', { value: formatSeconds(info.length) })}</span> : null}
            {rankLevel !== undefined && <span className="pill ghost">{t('chart.meta.level', { level: rankLevel })}</span>}
          </div>
          {chartId && !Number.isNaN(chartId) && (
            <div className="song-actions">
              <a className="btn ghost small" href={`/chart/${chartId}/edit`}>
                {t('chart.edit.open')}
              </a>
            </div>
          )}
          {loadingInfo && <p className="chart-loading">{t('charts.loading')}</p>}
          {infoError && <p className="chart-error">{infoError}</p>}
        </div>
      </header>

      <div className="content-container">
        <section className="chart-score">
          <div className="chart-score-main">
            <p className="eyebrow">{t('chart.score.title')}</p>
            <h2>{t('chart.score.value', { value: rating.score5.toFixed(1) })}</h2>
            <p className="chart-score-sub">{t('chart.score.percent', { value: rating.percent })}</p>
            <div className="chart-score-actions">
              <button
                className={`pill ghost ${info?.likeState === 1 ? 'active' : ''}`}
                type="button"
                onClick={() => handleLike(1)}
                disabled={likeLoading}
              >
                {t('chart.score.like')} · {info?.like ?? 0}
              </button>
              <button
                className={`pill ghost ${info?.likeState === 2 ? 'active' : ''}`}
                type="button"
                onClick={() => handleLike(2)}
                disabled={likeLoading}
              >
                {t('chart.score.dislike')} · {info?.dislike ?? 0}
              </button>
            </div>
          </div>
          <div className="chart-score-meta">
            <p className="chart-score-label">{t('chart.meta.creator')}</p>
            <p className="chart-score-value">{info?.creator || t('chart.placeholder.creator')}</p>
            {info?.cid && <p className="chart-score-id">CID {info.cid}</p>}
          </div>
        </section>

        <section className="section">
          <div className="chart-tabs">
            <button className={activeTab === 'ranking' ? 'active' : ''} type="button" onClick={() => setActiveTab('ranking')}>
              {t('chart.tab.ranking')}
            </button>
            <button className={activeTab === 'comment' ? 'active' : ''} type="button" onClick={() => setActiveTab('comment')}>
              {t('chart.tab.comment')}
            </button>
            <button className={activeTab === 'donate' ? 'active' : ''} type="button" onClick={() => setActiveTab('donate')}>
              {t('chart.tab.donate')}
            </button>
            <button className={activeTab === 'wiki' ? 'active' : ''} type="button" onClick={() => setActiveTab('wiki')}>
              {t('chart.tab.wiki')}
            </button>
          </div>

          {activeTab === 'ranking' && (
            <div className="chart-panel">
              <div className="chart-rank-controls">
                <label>
                  <span>{t('chart.ranking.platform')}</span>
                  <select
                    value={rankFilters.pro ? 1 : 0}
                    onChange={(e) => {
                      const next = { ...rankFilters, pro: e.target.value === '1' }
                      setRankFilters(next)
                      loadRanking(next)
                    }}
                  >
                    <option value={0}>{t('chart.ranking.platform.mobile')}</option>
                    <option value={1}>{t('chart.ranking.platform.pc')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('chart.ranking.sort')}</span>
                  <select
                    value={rankFilters.sort}
                    onChange={(e) => {
                      const next = { ...rankFilters, sort: e.target.value as RankFilters['sort'] }
                      setRankFilters(next)
                      loadRanking(next)
                    }}
                  >
                    <option value="score">{t('chart.ranking.sort.score')}</option>
                    <option value="combo">{t('chart.ranking.sort.combo')}</option>
                    <option value="acc">{t('chart.ranking.sort.acc')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('chart.ranking.modFilter')}</span>
                  <select
                    value={rankFilters.mod}
                    onChange={(e) => {
                      const next = { ...rankFilters, mod: e.target.value as RankFilters['mod'] }
                      setRankFilters(next)
                      loadRanking(next)
                    }}
                  >
                    <option value="all">{t('chart.ranking.mod.all')}</option>
                    <option value="noMod">{t('chart.ranking.noMod')}</option>
                    <option value="noSpeed">{t('chart.ranking.noSpeed')}</option>
                    <option value="noModNoSpeed">{t('chart.ranking.noModNoSpeed')}</option>
                  </select>
                </label>
              </div>
              {renderRankingTable()}
            </div>
          )}

          {activeTab === 'comment' && (
            <div className="chart-panel">
              <CommentThread
                fetchComments={commentFetcher}
                submitComment={commentSubmitter}
                deleteComment={commentDeleter}
                onRequireAuth={() => auth.openAuth('signin')}
              />
            </div>
          )}

          {activeTab === 'donate' && (
            <div className="chart-panel donate-panel">
              <div className="donate-form">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder="10"
                />
                <button className="btn primary small" type="button" onClick={handleDonate} disabled={donateSubmitting}>
                  {donateSubmitting ? t('chart.donate.sending') : t('chart.donate.send')}
                </button>
              </div>
              {donateError && <div className="chart-error">{donateError}</div>}
              {donateLoading && <div className="chart-loading">{t('charts.loading')}</div>}
              {!donateLoading && (
                <div className="donate-list">
                  {donateList.length === 0 && <div className="chart-empty">{t('chart.donate.empty')}</div>}
                  {donateList.map((item) => (
                    <div className="donate-item" key={`${item.uid}-${item.time}`}>
                      <div>
                        {item.uid ? (
                          <a className="donate-user" href={`/player/${item.uid}`}>
                            {item.username || t('chart.donate.unknown')}
                          </a>
                        ) : (
                          <p className="donate-user">{item.username || t('chart.donate.unknown')}</p>
                        )}
                        <p className="donate-meta">{item.time ? new Date(item.time * 1000).toLocaleDateString() : ''}</p>
                      </div>
                      <span className="pill ghost">{t('chart.donate.gold', { value: item.gold })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wiki' && (
            <div className="chart-panel">
              {wikiError && <div className="chart-error">{wikiError}</div>}
              {(wikiLoading || templateLoading) && !wikiError && (
                <div className="wiki-skeleton">
                  <div className="wiki-skeleton-line wide" />
                  <div className="wiki-skeleton-line" />
                  <div className="wiki-skeleton-line" />
                </div>
              )}
              {!wikiLoading && !wikiError && (
                <>
                  {templateError && <div className="chart-error">{templateError}</div>}
                  {wikiHtml ? (
                    <div className="wiki-body" dangerouslySetInnerHTML={{ __html: wikiHtml }} />
                  ) : (
                    <div className="chart-empty">{t('chart.wiki.empty')}</div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {auth.modal}
    </PageLayout>
  )
}

export default ChartPage
