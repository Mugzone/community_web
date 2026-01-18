import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import AvatarImage from '../components/AvatarImage'
import PageLayout from '../components/PageLayout'
import { UseAuthModal } from '../components/UseAuthModal'
import { useI18n } from '../i18n'
import {
  fetchPlayerImageUpload,
  fetchPlayerInfo,
  getSession,
  savePlayerInfo,
  setSession,
  type RespPlayerInfoData,
} from '../network/api'
import { avatarUrl } from '../utils/formatters'
import { regionMap } from '../utils/profile'
import '../styles/song.css'
import '../styles/player-edit.css'

type PlayerFormState = {
  name: string
  gender: string
  area: string
  birth: string
}

const AVATAR_UPLOAD_TYPE = 0

const formatBirthInput = (value?: number) => {
  if (!value) return ''
  const ms = value > 10_000_000_000 ? value : value * 1000
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatBirthPayload = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const [year, month, day] = trimmed.split('-')
  if (!year || !month || !day) return trimmed
  return `${Number(year)}-${Number(month)}-${Number(day)}`
}

const birthToTimestamp = (value: string) => {
  const payload = formatBirthPayload(value)
  if (!payload) return undefined
  const [year, month, day] = payload.split('-').map(Number)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined
  }
  return Math.floor(Date.UTC(year, month - 1, day) / 1000)
}

function PlayerEditPage() {
  const { t } = useI18n()
  const auth = UseAuthModal()
  const [info, setInfo] = useState<RespPlayerInfoData>()
  const [infoError, setInfoError] = useState('')
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [form, setForm] = useState<PlayerFormState>({
    name: '',
    gender: '0',
    area: '0',
    birth: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [avatarFile, setAvatarFile] = useState<File>()
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [avatarSuccess, setAvatarSuccess] = useState('')

  const requireAuth = () => {
    const session = getSession()
    if (!session || session.uid === 1) {
      auth.openAuth('signin')
      return undefined
    }
    return session
  }

  useEffect(() => {
    const session = getSession()
    if (!session || session.uid === 1) {
      setInfoError(t('player.edit.login'))
      return
    }
    let cancelled = false
    const loadInfo = async () => {
      setLoadingInfo(true)
      setInfoError('')
      try {
        const resp = await fetchPlayerInfo({ uid: session.uid })
        if (cancelled) return
        const data = resp.data ?? (resp as RespPlayerInfoData)
        if (resp.code !== 0 || !data) {
          setInfoError(t('player.edit.error.load'))
          return
        }
        setInfo(data)
        const genderValue = data.gender
        const normalizedGender =
          genderValue === 1 || genderValue === 2 || genderValue === 3
            ? genderValue
            : 1
        setForm({
          name: data.name ?? data.username ?? '',
          gender: String(normalizedGender),
          area: String(data.area ?? data.country ?? 0),
          birth: formatBirthInput(data.birth),
        })
      } catch (err) {
        console.error(err)
        if (!cancelled) setInfoError(t('player.edit.error.load'))
      } finally {
        if (!cancelled) setLoadingInfo(false)
      }
    }

    loadInfo()
    return () => {
      cancelled = true
    }
  }, [t])

  const updateField = (key: keyof PlayerFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaveError('')
    setSaveSuccess('')
  }

  const genderOptions = useMemo(
    () => [
      { value: '1', label: t('player.gender.male') },
      { value: '2', label: t('player.gender.female') },
      { value: '3', label: t('player.gender.other') },
    ],
    [t],
  )

  const regionOptions = useMemo(() => {
    const formatRegionLabel = (value: number) => {
      const region = regionMap[value]
      if (!region) return t('player.profile.unknown')
      const localized = t(region.labelKey)
      return localized || region.fallback
    }
    const entries = Object.keys(regionMap)
      .map((key) => Number(key))
      .filter((value) => value !== 0)
      .sort((a, b) => a - b)
      .map((value) => ({
        value: String(value),
        label: formatRegionLabel(value),
      }))
    return [{ value: '0', label: formatRegionLabel(0) }, ...entries]
  }, [t])

  const errorFromCode = (code: number) => {
    if (code === -1) return t('player.edit.error.gold')
    if (code === -2) return t('player.edit.error.invalid')
    if (code === -3) return t('player.edit.error.name')
    if (code === -4) return t('player.edit.error.cooldown')
    if (code === -5) return t('player.edit.error.duplicate')
    return t('player.edit.error.save')
  }

  const handleSave = async () => {
    const session = requireAuth()
    if (!session) {
      setSaveError(t('player.edit.login'))
      return
    }
    const trimmedName = form.name.trim()
    setSaving(true)
    setSaveError('')
    setSaveSuccess('')
    try {
      const resp = await savePlayerInfo({
        name: trimmedName || undefined,
        gender: Number(form.gender),
        area: Number(form.area),
        birth: formatBirthPayload(form.birth),
      })
      if (resp.code !== 0) {
        setSaveError(errorFromCode(resp.code))
        return
      }
      setSaveSuccess(t('player.edit.saved'))
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              name: trimmedName || prev.name,
              gender: Number(form.gender),
              area: Number(form.area),
              birth: form.birth ? birthToTimestamp(form.birth) ?? prev.birth : prev.birth,
            }
          : prev,
      )
      if (trimmedName) {
        setSession({ ...session, username: trimmedName })
      }
    } catch (err) {
      console.error(err)
      setSaveError(t('player.edit.error.save'))
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setAvatarFile(file)
    setAvatarError('')
    setAvatarSuccess('')
  }

  const handleAvatarUpload = async () => {
    const session = requireAuth()
    if (!session) {
      setAvatarError(t('player.edit.login'))
      return
    }
    if (!avatarFile) {
      setAvatarError(t('player.edit.avatar.needFile'))
      return
    }
    setAvatarUploading(true)
    setAvatarError('')
    setAvatarSuccess('')
    try {
      const sign = await fetchPlayerImageUpload({ type: AVATAR_UPLOAD_TYPE })
      if (sign.code !== 0 || !sign.url || !sign.meta) {
        setAvatarError(t('player.edit.avatar.error'))
        return
      }
      const formData = new FormData()
      Object.entries(sign.meta).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('file', avatarFile)

      const res = await fetch(sign.url, { method: 'POST', body: formData })
      if (!res.ok) {
        setAvatarError(t('player.edit.avatar.error'))
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
            setInfo((prev) => (prev ? { ...prev, avatar: cleanKey } : prev))
          }
        } catch (err) {
          console.error(err)
        }
      }

      setAvatarSuccess(t('player.edit.avatar.success'))
      setAvatarFile(undefined)
    } catch (err) {
      console.error(err)
      setAvatarError(t('player.edit.avatar.error'))
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <PageLayout className="player-edit-page" topbarProps={auth.topbarProps}>
      <main className="content-container">
        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t('player.edit.eyebrow')}</p>
              <h2>{t('player.edit.title')}</h2>
              <p className="song-edit-desc">{t('player.edit.desc')}</p>
            </div>
            <a className="link" href={info?.uid ? `/player/${info.uid}` : '/player/'}>
              {t('player.edit.back')}
            </a>
          </div>
          {loadingInfo && <p className="song-loading">{t('player.edit.loading')}</p>}
          {infoError && <p className="song-error">{infoError}</p>}
          <div className="song-editor">
            <div className="song-editor-card">
              <div className="song-form-grid">
                <label className="song-field">
                  <span>{t('player.edit.field.name')}</span>
                  <input
                    type="text"
                    value={form.name}
                    placeholder={t('player.edit.field.namePlaceholder')}
                    onChange={(event) => updateField('name', event.target.value)}
                  />
                </label>
                <label className="song-field">
                  <span>{t('player.edit.field.gender')}</span>
                  <select
                    value={form.gender}
                    onChange={(event) => updateField('gender', event.target.value)}
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="song-field">
                  <span>{t('player.edit.field.area')}</span>
                  <select
                    value={form.area}
                    onChange={(event) => updateField('area', event.target.value)}
                  >
                    {regionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="song-field">
                  <span>{t('player.edit.field.birth')}</span>
                  <input
                    type="date"
                    value={form.birth}
                    onChange={(event) => updateField('birth', event.target.value)}
                  />
                </label>
              </div>
              <div className="song-editor-footer">
                <p className="song-hint">{t('player.edit.hint')}</p>
                {saveError && <p className="song-error">{saveError}</p>}
                {saveSuccess && <p className="song-success">{saveSuccess}</p>}
                <div className="song-editor-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? t('player.edit.saving') : t('player.edit.save')}
                  </button>
                </div>
              </div>
            </div>
            <div className="song-editor-card player-edit-avatar-card">
              <AvatarImage
                className="player-edit-avatar"
                src={avatarUrl(info?.avatar, info?.uid)}
                alt={form.name || info?.name || t('topbar.profile')}
                seed={info?.uid}
              />
              <p className="song-hint">{t('player.edit.avatar.hint')}</p>
              <label className="song-file-input">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleAvatarFileChange}
                />
                <span>
                  {avatarFile ? avatarFile.name : t('player.edit.avatar.select')}
                </span>
              </label>
              {avatarError && <p className="song-error">{avatarError}</p>}
              {avatarSuccess && <p className="song-success">{avatarSuccess}</p>}
              <div className="song-editor-actions">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={avatarUploading}
                >
                  {avatarUploading
                    ? t('player.edit.avatar.uploading')
                    : t('player.edit.avatar.upload')}
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

export default PlayerEditPage
