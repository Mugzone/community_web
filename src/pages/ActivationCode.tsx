import { useEffect, useRef, useState, type FormEvent } from 'react'
import PageLayout from '../components/PageLayout'
import { UseAuthModal } from '../components/UseAuthModal'
import { useI18n } from '../i18n'
import { getSession, submitActivationCode } from '../network/api'
import '../styles/activation-code.css'

type ToastTone = 'success' | 'error' | 'warning'

type ToastState = {
  message: string
  tone: ToastTone
}

const resolveSuccessMessage = (
  code: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
) => {
  if (code === 1) return t('code.success.adfree')
  if (code === 3 || code === 4 || code === 5) return t('code.success.marlo')
  if (code === 6) return t('code.success.rename')
  return t('code.success.default')
}

function ActivationCodePage() {
  const { t } = useI18n()
  const auth = UseAuthModal()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current)
      }
    }
  }, [])

  const showToast = (message: string, tone: ToastTone) => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current)
    }
    setToast({ message, tone })
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
    }, 3200)
  }

  const requireAuth = () => {
    const session = getSession()
    if (!session || session.uid === 1) {
      auth.openAuth('signin')
      return undefined
    }
    return session
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (loading) return

    const value = code.trim()
    if (!value) {
      showToast(t('code.error.empty'), 'warning')
      return
    }

    const session = requireAuth()
    if (!session) {
      showToast(t('code.error.login'), 'warning')
      return
    }

    setLoading(true)
    try {
      const resp = await submitActivationCode({ code: value })
      if (resp.code === -1) {
        showToast(t('code.error.notFound'), 'error')
        return
      }
      if (resp.code === -2) {
        showToast(t('code.error.used'), 'error')
        return
      }
      if (typeof resp.code === 'number' && resp.code > 0) {
        showToast(resolveSuccessMessage(resp.code, t), 'success')
        setCode('')
        return
      }
      showToast(t('code.error.failed'), 'error')
    } catch (err) {
      console.error(err)
      showToast(t('code.error.network'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout topbarProps={auth.topbarProps}>
      {toast ? (
        <div className={`activation-toast ${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
      <section className="section activation-section">
        <div className="activation-hero">
          <p className="eyebrow">{t('code.eyebrow')}</p>
          <h1>{t('code.title')}</h1>
          <p className="activation-desc">{t('code.desc')}</p>
        </div>
        <div className="activation-card">
          <form className="activation-form" onSubmit={handleSubmit}>
            <label className="activation-field">
              <span>{t('code.field.label')}</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('code.field.placeholder')}
                disabled={loading}
              />
            </label>
            <button className="btn primary full" type="submit" disabled={loading}>
              {loading ? t('code.action.loading') : t('code.action.submit')}
            </button>
          </form>
          <p className="activation-hint">{t('code.hint')}</p>
        </div>
      </section>
      {auth.modal}
    </PageLayout>
  )
}

export default ActivationCodePage
