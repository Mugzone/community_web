import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { RespLogin } from '../network/api'
import { login, register, setSession } from '../network/api'
import { md5 } from '../utils/md5'

type AuthMode = 'signin' | 'signup'

type AuthModalProps = {
  mode: AuthMode
  onClose: () => void
  onSuccess?: (payload: { username?: string; uid?: number }) => void
}

const ERRORS: Record<string, string> = {
  login: '登录失败，请检查账号或密码',
  register: '注册失败，请稍后再试',
  '-1': '参数错误或校验失败',
  '-2': '尝试次数过多或用户名已存在',
  '-3': '邮箱已存在或账号密码错误',
  '-4': '账号被封禁',
  '-5': '设备或 IP 被封禁 / 邮箱不合法',
  '-6': '密码不合法（需要32位MD5）',
  '-7': '设备被封禁',
}

const makeError = (code: number, fallback: string) => {
  return ERRORS[String(code)] ?? fallback
}

function AuthModal({ mode, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<AuthMode>(mode)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTab(mode)
    setError('')
  }, [mode])

  const disableSubmit = useMemo(() => {
    if (loading) return true
    if (!name.trim() || !password.trim()) return true
    if (tab === 'signup' && !email.trim()) return true
    return false
  }, [email, loading, name, password, tab])

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault()
    if (disableSubmit) return

    setLoading(true)
    setError('')
    try {
      const hashed = md5(password.trim())
      if (!hashed || hashed.length !== 32) {
        setError('密码需要生成 32 位 MD5')
        setLoading(false)
        return
      }

      let resp: RespLogin
      if (tab === 'signin') {
        resp = await login({ name: name.trim(), psw: hashed })
      } else {
        resp = await register({ name: name.trim(), psw: hashed, email: email.trim() })
      }

      if (resp.code !== 0) {
        setError(makeError(resp.code, tab === 'signin' ? ERRORS.login : ERRORS.register))
        return
      }

      if (resp.uid && (resp.token || resp.tokenStore)) {
        setSession({ uid: resp.uid, key: resp.token ?? resp.tokenStore ?? '', storeKey: resp.tokenStore })
        const fallbackName = name.trim()
        onSuccess?.({ username: resp.username ?? fallbackName, uid: resp.uid })
      }
      onClose()
    } catch (err) {
      console.error(err)
      setError(tab === 'signin' ? ERRORS.login : ERRORS.register)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-tabs">
            <button className={tab === 'signin' ? 'active' : ''} onClick={() => setTab('signin')} type="button">
              Sign in
            </button>
            <button className={tab === 'signup' ? 'active' : ''} onClick={() => setTab('signup')} type="button">
              Sign up
            </button>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="input-label">
            Username or email
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your username"
              autoComplete={tab === 'signin' ? 'username' : 'new-username'}
            />
          </label>

          {tab === 'signup' && (
            <label className="input-label">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
          )}

          <label className="input-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="btn primary full" type="submit" disabled={disableSubmit}>
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AuthModal
