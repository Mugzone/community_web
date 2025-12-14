import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import PageLayout from '../components/PageLayout'
import { useAuthModal } from '../components/useAuthModal'
import { useI18n } from '../i18n'
import {
  fetchSongCoverUpload,
  fetchSongInfo,
  getSession,
  saveSongInfo,
  type RespSongInfo,
  type RespTagMeta,
} from '../network/api'
import { coverUrl } from '../utils/formatters'
import './song.css'

const parseSongId = () => {
  const match = window.location.pathname.match(/\/song\/(\d+)\/edit/)
  if (match?.[1]) return Number(match[1])
  const search = new URLSearchParams(window.location.search)
  const sid = search.get('sid')
  return sid ? Number(sid) : undefined
}

type SongFormState = {
  title: string
  artist: string
  titleOrg: string
  artistOrg: string
  length: string
  bpm: string
}

const parseLengthInput = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return Number.NaN
  if (trimmed.includes(':')) {
    const [m, s] = trimmed.split(':')
    const minutes = Number(m)
    const seconds = Number(s)
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return Number.NaN
    return minutes * 60 + seconds
  }
  return Number(trimmed)
}

function SongEditPage() {
  const { t } = useI18n()
  const auth = useAuthModal()
  const songId = useMemo(() => parseSongId(), [])
  const [info, setInfo] = useState<RespSongInfo>()
  const [infoError, setInfoError] = useState('')
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [form, setForm] = useState<SongFormState>({
    title: '',
    artist: '',
    titleOrg: '',
    artistOrg: '',
    length: '',
    bpm: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [tagOptions, setTagOptions] = useState<RespTagMeta[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [coverFile, setCoverFile] = useState<File>()
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [coverSuccess, setCoverSuccess] = useState('')

  useEffect(() => {
    if (!songId || Number.isNaN(songId)) {
      setInfoError(t('song.error.missingId'))
      return
    }
    let cancelled = false
    const loadInfo = async () => {
      setLoadingInfo(true)
      setInfoError('')
      try {
        const resp = await fetchSongInfo({ sid: songId, meta: 1 })
        if (cancelled) return
        if (resp.code !== 0) {
          setInfoError(t('song.error.load'))
          return
        }
        setInfo(resp)
      } catch (err) {
        console.error(err)
        if (!cancelled) setInfoError(t('song.error.load'))
      } finally {
        if (!cancelled) setLoadingInfo(false)
      }
    }
    loadInfo()
    return () => {
      cancelled = true
    }
  }, [songId, t])

  useEffect(() => {
    if (!info) return
    setForm({
      title: info.title ?? '',
      artist: info.artist ?? '',
      titleOrg: info.titleOrg ?? '',
      artistOrg: info.artistOrg ?? '',
      length: info.length ? String(info.length) : '',
      bpm: info.bpm ? String(info.bpm) : '',
    })
    setTagOptions(info.tagOptions ?? [])
    setSelectedTags(info.tags ?? [])
  }, [info])

  const updateField = (key: keyof SongFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaveError('')
    setSaveSuccess('')
  }

  const requireAuth = () => {
    const session = getSession()
    if (!session || session.uid === 1) {
      auth.openAuth('signin')
      return false
    }
    return true
  }

  const errorFromCode = (code: number) => {
    const mod = Math.abs(code) % 1000
    if (mod === 5) return t('song.edit.error.permission')
    if (mod === 6) return t('song.edit.error.forbid')
    if (mod === 4) return t('song.edit.error.duplicate')
    if (mod === 3) return t('song.edit.error.invalidChar')
    if (mod === 2) return t('song.error.missingId')
    if (mod === 1) return t('song.edit.error.required')
    return t('song.edit.error.save')
  }

  const handleSave = async () => {
    if (!songId || Number.isNaN(songId)) {
      setSaveError(t('song.error.missingId'))
      return
    }
    if (!requireAuth()) {
      setSaveError(t('song.edit.login'))
      return
    }
    const title = form.title.trim()
    const artist = form.artist.trim()
    const lengthValue = parseLengthInput(form.length)
    const bpmValue = Number(form.bpm)

    if (!title || !artist) {
      setSaveError(t('song.edit.error.required'))
      return
    }
    if (!Number.isFinite(lengthValue) || lengthValue <= 0) {
      setSaveError(t('song.edit.error.length'))
      return
    }
    if (!Number.isFinite(bpmValue) || bpmValue <= 0) {
      setSaveError(t('song.edit.error.bpm'))
      return
    }

    setSaving(true)
    setSaveError('')
    setSaveSuccess('')
    try {
      const resp = await saveSongInfo({
        sid: songId,
        title,
        artist,
        length: Math.round(lengthValue),
        bpm: bpmValue,
        titleOrg: form.titleOrg.trim() || undefined,
        artistOrg: form.artistOrg.trim() || undefined,
        tags: selectedTags,
      })
      if (resp.code !== 0) {
        setSaveError(errorFromCode(resp.code))
        return
      }
      setSaveSuccess(t('song.edit.saved'))
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              title,
              artist,
              titleOrg: form.titleOrg.trim() || undefined,
              artistOrg: form.artistOrg.trim() || undefined,
              length: Math.round(lengthValue),
              bpm: bpmValue,
            }
          : prev,
      )
    } catch (err) {
      console.error(err)
      setSaveError(t('song.edit.error.save'))
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (id: number) => {
    setSelectedTags((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      return [...prev, id]
    })
    setSaveError('')
    setSaveSuccess('')
  }

  const handleCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setCoverFile(file)
    setCoverError('')
    setCoverSuccess('')
  }

  const handleCoverUpload = async () => {
    if (!songId || Number.isNaN(songId)) {
      setCoverError(t('song.error.missingId'))
      return
    }
    if (!coverFile) {
      setCoverError(t('song.edit.cover.needFile'))
      return
    }
    if (!requireAuth()) {
      setCoverError(t('song.edit.login'))
      return
    }
    setCoverUploading(true)
    setCoverError('')
    setCoverSuccess('')
    try {
      const sign = await fetchSongCoverUpload({ sid: songId })
      if (sign.code !== 0 || !sign.url || !sign.meta) {
        const mod = Math.abs(sign.code) % 1000
        setCoverError(mod === 5 ? t('song.edit.error.permission') : t('song.edit.cover.error'))
        return
      }
      const formData = new FormData()
      Object.entries(sign.meta).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('file', coverFile)

      const res = await fetch(sign.url, { method: 'POST', body: formData })
      if (!res.ok) {
        setCoverError(t('song.edit.cover.error'))
        return
      }

      const policy = sign.meta.policy
      if (policy) {
        try {
          const decoded = atob(policy)
          const parsed = JSON.parse(decoded) as { 'save-key'?: string }
          const saveKey = parsed['save-key']
          if (saveKey) {
            const cleanKey = saveKey.startsWith('/') ? saveKey.slice(1) : saveKey
            setInfo((prev) => (prev ? { ...prev, cover: cleanKey } : prev))
          }
        } catch (err) {
          console.error(err)
        }
      }

      setCoverSuccess(t('song.edit.cover.success'))
      setCoverFile(undefined)
    } catch (err) {
      console.error(err)
      setCoverError(t('song.edit.cover.error'))
    } finally {
      setCoverUploading(false)
    }
  }

  return (
    <PageLayout className="song-page" topbarProps={auth.topbarProps}>

      <main className="content-container">
        <section className="section song-edit-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t('song.edit.eyebrow')}</p>
              <h2>{t('song.edit.title')}</h2>
              <p className="song-edit-desc">{t('song.edit.desc')}</p>
            </div>
            {songId && (
              <a className="link" href={`/song/${songId}`}>
                {t('song.edit.back')}
              </a>
            )}
          </div>
          {loadingInfo && <p className="song-loading">{t('charts.loading')}</p>}
          {infoError && <p className="song-error">{infoError}</p>}
          <div className="song-editor">
            <div className="song-editor-card">
              <div className="song-form-grid">
                <label className="song-field">
                  <span>{t('song.edit.field.title')}</span>
                  <input
                    type="text"
                    value={form.title}
                    placeholder={t('song.placeholder.title')}
                    onChange={(e) => updateField('title', e.target.value)}
                  />
                </label>
                <label className="song-field">
                  <span>{t('song.edit.field.artist')}</span>
                  <input
                    type="text"
                    value={form.artist}
                    placeholder={t('song.placeholder.artist')}
                    onChange={(e) => updateField('artist', e.target.value)}
                  />
                </label>
                <label className="song-field">
                  <span>{t('song.edit.field.titleOrg')}</span>
                  <input
                    type="text"
                    value={form.titleOrg}
                    onChange={(e) => updateField('titleOrg', e.target.value)}
                  />
                </label>
                <label className="song-field">
                  <span>{t('song.edit.field.artistOrg')}</span>
                  <input
                    type="text"
                    value={form.artistOrg}
                    onChange={(e) => updateField('artistOrg', e.target.value)}
                  />
                </label>
                <label className="song-field">
                  <span>{t('song.edit.field.length')}</span>
                  <input
                    type="text"
                    value={form.length}
                    placeholder="210"
                    onChange={(e) => updateField('length', e.target.value)}
                  />
                  <small>{t('song.edit.lengthHint')}</small>
                </label>
                <label className="song-field">
                  <span>{t('song.edit.field.bpm')}</span>
                  <input
                    type="text"
                    value={form.bpm}
                    placeholder="180"
                    onChange={(e) => updateField('bpm', e.target.value)}
              />
            </label>
          </div>
          {tagOptions.length > 0 && (
            <div className="song-tags">
              <div className="song-tag-header">
                <span>{t('song.edit.field.tags')}</span>
                <small>{t('song.edit.tags.hint')}</small>
              </div>
              <div className="song-tag-list">
                {tagOptions.map((tag) => {
                  const active = selectedTags.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`song-tag${active ? ' selected' : ''}`}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <span className="song-tag-name">{tag.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="song-editor-footer">
            <p className="song-hint">{t('song.edit.login')}</p>
            {saveError && <p className="song-error">{saveError}</p>}
            {saveSuccess && <p className="song-success">{saveSuccess}</p>}
            <div className="song-editor-actions">
                  <button className="btn primary" type="button" onClick={handleSave} disabled={saving}>
                    {saving ? t('song.edit.saving') : t('song.edit.save')}
                  </button>
                </div>
              </div>
            </div>
            <div className="song-editor-card song-cover-card">
              <div className="song-cover-preview" style={{ backgroundImage: `url(${coverUrl(info?.cover)})` }} />
              <p className="song-hint">{t('song.edit.cover.hint')}</p>
              <label className="song-file-input">
                <input type="file" accept="image/png,image/jpeg" onChange={handleCoverFileChange} />
                <span>{coverFile ? coverFile.name : t('song.edit.cover.select')}</span>
              </label>
              {coverError && <p className="song-error">{coverError}</p>}
              {coverSuccess && <p className="song-success">{coverSuccess}</p>}
              <div className="song-editor-actions">
                <button className="btn ghost" type="button" onClick={handleCoverUpload} disabled={coverUploading}>
                  {coverUploading ? t('song.edit.cover.uploading') : t('song.edit.cover.upload')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {auth.modal}
    </PageLayout>
  )
}

export default SongEditPage
