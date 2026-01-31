import { useEffect, useMemo, useState } from 'react'
import PageLayout from '../components/PageLayout'
import { UseAuthModal } from '../components/UseAuthModal'
import { fetchRoomHistoryLog } from '../network/api'
import { useI18n } from '../i18n'
import AvatarImage from '../components/AvatarImage'
import { avatarUidUrl } from '../utils/formatters'
import '../styles/history.css'

type HistoryEvent = {
  ts: number
  event: string
  fields: Record<string, string>
  raw: string
}

type MatchGroup = {
  id: string
  start?: HistoryEvent
  end?: HistoryEvent
  scores: HistoryEvent[]
}

type MetaItem = {
  key: string
  label: string
  value: string
  type: 'user' | 'chart' | 'song' | 'team' | 'text'
  href?: string
  teams?: { uid: string; team?: string }[]
  displayName?: string
}

const parseTeams = (value?: string) => {
  if (!value) return []
  return value
    .split(',')
    .reduce<{ uid: string; team?: string }[]>((acc, pair) => {
      const [uid, team] = pair.split(':')
      if (!uid) return acc
      acc.push({ uid, team: team || undefined })
      return acc
    }, [])
}

const parseHistoryLog = (text: string) => {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const events: HistoryEvent[] = []
  let invalid = 0

  lines.forEach((line) => {
    const parts = line.split('\x1f')
    if (parts.length < 2) {
      invalid += 1
      return
    }
    const ts = Number(parts[0])
    if (!Number.isFinite(ts)) {
      invalid += 1
      return
    }
    const event = parts[1].trim()
    const fields: Record<string, string> = {}
    for (let i = 2; i < parts.length; i += 1) {
      const segment = parts[i]
      if (!segment) continue
      const eqIndex = segment.indexOf('=')
      if (eqIndex === -1) {
        fields[segment] = ''
        continue
      }
      const key = segment.slice(0, eqIndex)
      const rawValue = segment.slice(eqIndex + 1)
      let value = rawValue
      try {
        value = decodeURIComponent(rawValue)
      } catch {
        value = rawValue
      }
      fields[key] = value
    }
    events.push({ ts, event, fields, raw: line })
  })

  return { events, invalid }
}

const formatTime = (ts?: number) => {
  if (!ts) return ''
  return new Date(ts).toLocaleString()
}

const isNumeric = (value?: string) => {
  if (!value) return false
  return /^[0-9]+$/.test(value)
}

const buildScoreTooltip = (fields: Record<string, string>) => {
  const ignoredKeys = new Set(['uid', 'room', 'match'])
  const primaryKeys = new Set(['score', 'acc', 'combo'])
  const entries = Object.entries(fields).filter(([key, value]) => {
    if (!value) return false
    if (ignoredKeys.has(key)) return false
    if (primaryKeys.has(key)) return false
    return true
  })
  if (!entries.length) return ''
  return entries.map(([key, value]) => `${key}: ${value}`).join('\n')
}

const renderUserChip = (uid: string, displayName?: string, teamLabel?: string) => {
  if (!isNumeric(uid)) {
    return <span className="history-score-uid">{uid}</span>
  }
  return (
    <a className="history-user-link" href={`/player/${uid}`}>
      <span className="history-user-avatar">
        <AvatarImage seed={uid} src={avatarUidUrl(Number(uid))} alt={uid} />
      </span>
      <span>{displayName || uid}</span>
      {displayName && <span className="history-user-uid">{uid}</span>}
      {teamLabel && <span className="history-user-team">{teamLabel}</span>}
    </a>
  )
}

function HistoryPage() {
  const { t } = useI18n()
  const auth = UseAuthModal()
  const mid = useMemo(
    () => new URLSearchParams(window.location.search).get('mid')?.trim() ?? '',
    []
  )
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [invalidLines, setInvalidLines] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const eventLabels = useMemo(
    () => ({
      ROOM_CREATE: t('history.event.roomCreate'),
      PLAYER_JOIN: t('history.event.playerJoin'),
      PLAYER_QUIT: t('history.event.playerQuit'),
      HOST_CHANGE: t('history.event.hostChange'),
      CHART_CHANGE: t('history.event.chartChange'),
      CONFIG_CHANGE: t('history.event.configChange'),
      TEAM_CHANGE: t('history.event.teamChange'),
      MATCH_START: t('history.event.matchStart'),
      MATCH_END: t('history.event.matchEnd'),
      SCORE: t('history.event.score'),
      ROOM_DISMISS: t('history.event.roomDismiss'),
    }),
    [t]
  )

  const fieldLabels = useMemo(
    () => ({
      room: t('history.field.room'),
      name: t('history.field.name'),
      host: t('history.field.host'),
      slots: t('history.field.slots'),
      uid: t('history.field.uid'),
      chart: t('history.field.chart'),
      title: t('history.field.title'),
      match: t('history.field.match'),
      teams: t('history.field.teams'),
      team: t('history.field.team'),
      mod: t('history.field.mod'),
      red_name: t('history.field.redName'),
      blue_name: t('history.field.blueName'),
      judge: t('history.field.judge'),
      pro: t('history.field.pro'),
      score_mode: t('history.field.scoreMode'),
      turbo: t('history.field.turbo'),
      allow_free: t('history.field.allowFree'),
      winner_uid: t('history.field.winner'),
      score: t('history.field.score'),
      acc: t('history.field.acc'),
      combo: t('history.field.combo'),
    }),
    [t]
  )

  const loadHistory = async (mid: string) => {
    setLoading(true)
    setError('')
    try {
      const text = await fetchRoomHistoryLog({ mid })
      const parsed = parseHistoryLog(text)
      setEvents(parsed.events)
      setInvalidLines(parsed.invalid)
      if (!parsed.events.length) {
        setError(t('history.empty'))
      }
    } catch (err) {
      console.error(err)
      setEvents([])
      setInvalidLines(0)
      const message = err instanceof Error ? err.message : ''
      setError(message.startsWith('Request failed') ? t('history.error.fetch') : t('history.error.network'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!mid) {
      setError(t('history.error.missingMid'))
      setEvents([])
      setInvalidLines(0)
      return
    }
    loadHistory(mid)
  }, [mid, t])

  const { matchGroups, timeline } = useMemo(() => {
    const groups = new Map<string, MatchGroup>()
    const timelineEvents: HistoryEvent[] = []

    events.forEach((event) => {
      const matchId = event.fields.match
      if (
        matchId &&
        (event.event === 'MATCH_START' ||
          event.event === 'MATCH_END' ||
          event.event === 'SCORE')
      ) {
        const group = groups.get(matchId) ?? {
          id: matchId,
          scores: [],
        }
        if (event.event === 'MATCH_START') {
          group.start = event
        } else if (event.event === 'MATCH_END') {
          group.end = event
        } else {
          group.scores.push(event)
        }
        groups.set(matchId, group)
      } else {
        timelineEvents.push(event)
      }
    })

    const matchGroups = Array.from(groups.values()).sort((a, b) => {
      const aTime = a.start?.ts ?? 0
      const bTime = b.start?.ts ?? 0
      return aTime - bTime
    })

    const timeline = timelineEvents.sort((a, b) => a.ts - b.ts)

    return { matchGroups, timeline }
  }, [events])

  const summary = useMemo(() => {
    if (!events.length) {
      return {
        range: t('history.stats.rangeEmpty'),
        players: 0,
      }
    }
    const times = events.map((event) => event.ts).filter((ts) => Number.isFinite(ts))
    const min = Math.min(...times)
    const max = Math.max(...times)
    const range =
      Number.isFinite(min) && Number.isFinite(max)
        ? `${formatTime(min)} → ${formatTime(max)}`
        : t('history.stats.rangeEmpty')
    const players = new Set<string>()
    events.forEach((event) => {
      const fields = event.fields
      ;['uid', 'host', 'winner_uid'].forEach((key) => {
        const value = fields[key]
        if (value) players.add(value)
      })
      if (fields.teams) {
        parseTeams(fields.teams).forEach((team) => players.add(team.uid))
      }
    })
    return { range, players: players.size }
  }, [events, t])

  const buildEventMeta = (event: HistoryEvent): MetaItem[] => {
    const preferred: Record<string, string[]> = {
      ROOM_CREATE: ['room', 'name', 'host', 'slots'],
      PLAYER_JOIN: ['uid', 'room'],
      PLAYER_QUIT: ['uid', 'room'],
      HOST_CHANGE: ['host', 'room'],
      CHART_CHANGE: ['chart', 'title'],
      CONFIG_CHANGE: [
        'room',
        'mod',
        'team',
        'red_name',
        'blue_name',
        'judge',
        'pro',
        'score_mode',
        'turbo',
        'allow_free',
      ],
      TEAM_CHANGE: ['uid', 'team', 'room'],
      ROOM_DISMISS: ['room'],
    }
    const keys = preferred[event.event] ?? Object.keys(event.fields)
    const meta: MetaItem[] = []

    keys.forEach((key) => {
      const value = event.fields[key]
      if (!value) return
      if (key === 'room') return
      let label = fieldLabels[key as keyof typeof fieldLabels] ?? key
      if (event.event === 'CONFIG_CHANGE' && key === 'team') {
        label = t('history.field.teamMode')
      }

      if (key === 'teams') {
        const teams = parseTeams(value)
        if (teams.length) {
          meta.push({ key, label, value, type: 'team', teams })
        }
        return
      }

      if (['uid', 'host', 'winner_uid'].includes(key)) {
        const displayName =
          key === 'uid'
            ? event.fields.name || event.fields.username || event.fields.uname
            : event.fields[`${key}_name`]
        meta.push({
          key,
          label,
          value,
          type: 'user',
          href: isNumeric(value) ? `/player/${value}` : undefined,
          displayName,
        })
        return
      }

      if (['cid', 'chart'].includes(key) && isNumeric(value)) {
        meta.push({
          key,
          label,
          value,
          type: 'chart',
          href: `/chart/${value}`,
        })
        return
      }

      if (['sid', 'song'].includes(key) && isNumeric(value)) {
        meta.push({
          key,
          label,
          value,
          type: 'song',
          href: `/song/${value}`,
        })
        return
      }

      meta.push({ key, label, value, type: 'text' })
    })

    return meta.length
      ? meta
      : [
          {
            key: 'unknown',
            label: t('history.field.unknown'),
            value: t('history.field.unknown'),
            type: 'text',
          },
        ]
  }

  return (
    <PageLayout topbarProps={auth.topbarProps}>
      <section className="history-hero content-container">
        <div>
          <p className="eyebrow">{t('history.eyebrow')}</p>
          <h1>{t('history.title')}</h1>
          <p>{t('history.desc')}</p>
          {mid && <span className="pill ghost history-mid">{t('history.meta.mid', { mid })}</span>}
        </div>
        <div className="history-hero-card">
          <p className="eyebrow">{t('history.section.summary')}</p>
          <div className="history-summary-grid">
            <div className="history-summary-card">
              <p>{t('history.stats.events')}</p>
              <strong>{events.length}</strong>
            </div>
            <div className="history-summary-card">
              <p>{t('history.stats.matches')}</p>
              <strong>{matchGroups.length}</strong>
            </div>
            <div className="history-summary-card">
              <p>{t('history.stats.players')}</p>
              <strong>{summary.players}</strong>
            </div>
            <div className="history-summary-card wide">
              <p>{t('history.stats.range')}</p>
              <strong>{summary.range}</strong>
            </div>
          </div>
          {invalidLines > 0 && (
            <div className="history-warning">
              {t('history.meta.invalid', { count: invalidLines })}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        {error && !events.length ? (
          <div className="chart-empty">{error}</div>
        ) : loading ? (
          <div className="chart-empty">{t('history.input.loading')}</div>
        ) : null}
      </section>

      {events.length > 0 && (
        <>
          <section className="section">
            <div className="section-header">
              <h2>{t('history.section.matches')}</h2>
              <span className="chart-count">
                {t('history.meta.matches', { count: matchGroups.length })}
              </span>
            </div>
            <div className="history-match-grid">
              {matchGroups.map((group) => {
                const start = group.start?.fields ?? {}
                const end = group.end?.fields ?? {}
                const chartTitle = start.title || start.chart
                const teams = start.teams ? parseTeams(start.teams) : []
                const chartValue = start.chart
                const chartLink = isNumeric(chartValue) ? `/chart/${chartValue}` : undefined
                const songValue = start.sid ?? start.song
                const songLink = isNumeric(songValue) ? `/song/${songValue}` : undefined
                return (
                  <div className="history-match-card" key={group.id}>
                    <div className="history-match-head">
                      <div>
                        <p className="history-match-title">
                          {t('history.match.label', { id: group.id })}
                        </p>
                        <p className="history-match-time">
                          {group.start?.ts
                            ? t('history.match.startAt', { time: formatTime(group.start.ts) })
                            : t('history.field.unknown')}
                        </p>
                        {group.end?.ts && (
                          <p className="history-match-time">
                            {t('history.match.endAt', { time: formatTime(group.end.ts) })}
                          </p>
                        )}
                      </div>
                      <span className="pill ghost">#{group.id}</span>
                    </div>
                    <div className="history-match-body">
                      <div className="history-kv">
                        <span>{start.title ? t('history.field.title') : t('history.field.chart')}</span>
                        {chartLink && !start.title ? (
                          <a className="history-link type-chart" href={chartLink}>
                            {chartTitle || t('history.field.unknown')}
                          </a>
                        ) : (
                          <span>{chartTitle || t('history.field.unknown')}</span>
                        )}
                      </div>
                      {start.chart && start.title && (
                        <div className="history-kv">
                          <span>{t('history.field.chart')}</span>
                          {chartLink ? (
                            <a className="history-link type-chart" href={chartLink}>
                              {start.chart}
                            </a>
                          ) : (
                            <span>{start.chart}</span>
                          )}
                        </div>
                      )}
                      {songValue && (
                        <div className="history-kv">
                          <span>{t('history.field.song')}</span>
                          {songLink ? (
                            <a className="history-link type-song" href={songLink}>
                              {songValue}
                            </a>
                          ) : (
                            <span>{songValue}</span>
                          )}
                        </div>
                      )}
                      {start.teams && (
                        <div className="history-kv">
                          <span>{t('history.field.teams')}</span>
                          {teams.length ? (
                            <div className="history-team-list">
                                  {teams.map((team) => (
                                    <div className="history-team-chip" key={`${group.id}-${team.uid}`}>
                                      {renderUserChip(team.uid, undefined, team.team)}
                                    </div>
                                  ))}
                                </div>
                          ) : (
                            <span>{t('history.field.unknown')}</span>
                          )}
                        </div>
                      )}
                      {end.winner_uid && (
                        <div className="history-kv">
                          <span>{t('history.field.winner')}</span>
                          <span>{end.winner_uid}</span>
                        </div>
                      )}
                      {end.score_mode && (
                        <div className="history-kv">
                          <span>{t('history.field.scoreMode')}</span>
                          <span>{end.score_mode}</span>
                        </div>
                      )}
                    </div>
                    <div className="history-score-list">
                      <div className="history-score-header">
                        <span>{t('history.match.scoreCount', { count: group.scores.length })}</span>
                      </div>
                      {group.scores.length ? (
                        <div className="history-score-grid">
                          {group.scores.map((score) => {
                            const tooltip = buildScoreTooltip(score.fields)
                            return (
                              <div
                                className={`history-score-card${tooltip ? ' has-tooltip' : ''}`}
                                key={score.raw}
                                title={tooltip}
                              >
                              <div className="history-score-user">
                                {score.fields.uid
                                  ? renderUserChip(
                                      score.fields.uid,
                                      score.fields.name || score.fields.username || score.fields.uname
                                    )
                                  : <span className="history-score-uid">-</span>}
                              </div>
                              <div className="history-score-meta">
                                <span>{score.fields.score ?? '-'}</span>
                                <span>{score.fields.acc ? `${score.fields.acc}%` : '-'}</span>
                                <span>{score.fields.combo ?? '-'}</span>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="history-empty-inline">{t('history.field.unknown')}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2>{t('history.section.timeline')}</h2>
              <span className="chart-count">
                {t('history.timeline.count', { count: timeline.length })}
              </span>
            </div>
            <div className="history-timeline">
              {timeline.map((event) => (
                <div className="history-event" key={event.raw}>
                  <div className="history-event-time">{formatTime(event.ts)}</div>
                  <div className="history-event-content">
                    <span className={`pill ghost history-event-pill type-${event.event.toLowerCase()}`}>
                      {eventLabels[event.event as keyof typeof eventLabels] ??
                        t('history.event.unknown')}
                    </span>
                    <div className="history-event-meta">
                      {buildEventMeta(event).map((meta) => (
                        <div className={`history-meta-row type-${meta.type}`} key={`${event.raw}-${meta.key}`}>
                          <span className="history-meta-label">{meta.label}</span>
                          <span className="history-meta-value">
                            {meta.type === 'user' ? (
                              renderUserChip(meta.value, meta.displayName)
                            ) : meta.type === 'team' && meta.teams ? (
                              <div className="history-team-list">
                                {meta.teams.map((team) => (
                                  <div className="history-team-chip" key={`${event.raw}-${team.uid}`}>
                                    {renderUserChip(team.uid, undefined, team.team)}
                                  </div>
                                ))}
                              </div>
                            ) : meta.type === 'chart' && meta.href ? (
                              <a className="history-link type-chart" href={meta.href}>
                                {meta.value}
                              </a>
                            ) : meta.type === 'song' && meta.href ? (
                              <a className="history-link type-song" href={meta.href}>
                                {meta.value}
                              </a>
                            ) : (
                              <span>{meta.value}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {auth.modal}
    </PageLayout>
  )
}

export default HistoryPage
