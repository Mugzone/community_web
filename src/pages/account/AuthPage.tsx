import { useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { showNotify } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { login, register } from '../../network/api'
import {
  requestEmailChange,
  requestPasswordReset,
  resetPassword,
} from '../../network/legacy'
import { md5 } from '../../utils/md5'

/* reg.html 是「多模式单页」：按 URL 切换 5 套表单，全部保留。 */
type Mode = 'login' | 'reg' | 'forget' | 'reset_psw' | 'change_email'
type Rec = Record<string, string>
type TipDef = { text: string; err: boolean }

/* 逐条对应 reg.html 里 .g_tip 下的 span（顺序即 showTip 的下标）。 */
const TIPS: Record<Mode, TipDef[]> = {
  login: [
    { text: 'Invalid Email or Password', err: true },
    { text: 'Submitting...', err: false },
  ],
  reg: [
    { text: 'reg_1', err: true },
    { text: 'reg_2', err: true },
    { text: 'Invalid email', err: true },
    { text: 'reg_3', err: true },
    { text: 'Password missmatching', err: true },
    { text: 'reg_4', err: true },
    { text: 'reg_5', err: true },
    { text: 'Submitting...', err: false },
  ],
  forget: [
    { text: 'Invalid email', err: true },
    { text: 'Please check your email to continue', err: false },
    { text: 'Submitting...', err: false },
    { text: 'Operation failed', err: true },
    { text: 'Email address does not exist!', err: true },
  ],
  reset_psw: [
    { text: 'reg_3', err: true },
    { text: 'Password missmatching', err: true },
    { text: 'Submitting...', err: false },
    { text: 'Please login with your new password', err: false },
    { text: 'Operation failed', err: true },
  ],
  change_email: [
    { text: 'Invalid email', err: true },
    { text: 'Please check your new email for activation information', err: false },
    { text: 'Submitting...', err: false },
  ],
}

/* module/account/src/init.js 中 showTip(n) 的下标映射。 */
const SUBMIT_TIP: Record<Mode, number> = { login: 1, reg: 7, forget: 2, reset_psw: 2, change_email: 2 }
const SUCCESS_TIP: Record<Mode, number> = { login: 1, reg: 7, forget: 1, reset_psw: 3, change_email: 1 }
const ERROR_TIP: Record<Mode, number> = { login: 0, reg: 5, forget: 3, reset_psw: 4, change_email: 0 }
const VALID_TIP: Record<Mode, Record<number, number>> = {
  login: { 2: 0, 3: 0 },
  reg: { 1: 0, 2: 2, 3: 3, 4: 4 },
  forget: { 2: 0 },
  reset_psw: { 3: 0, 4: 1 },
  change_email: { 2: 0 },
}
/* 注册接口返回码 -> .g_tip 下标（module/account error 回调） */
const REG_ERR: Record<number, number> = { [-1]: 0, [-3]: 1, [-5]: 2, [-6]: 4, [-4]: 5, [-2]: 6 }
/** 与 LoginModal 一致：code 存在且非 0 视为失败 */
const failed = (res: any): boolean => res?.code !== undefined && Number(res.code) !== 0

const NAME_RE = /^[a-zA-Z0-9\[\]\(\)\-_@]{3,30}$/
const EMAIL_RE = /^[a-z0-9-_\.]+@[a-z0-9-_]+(\.[a-z]{1,3}){1,3}$/i

/** 复刻 module/account validate()，密码在提交前 md5。返回错误码或提交数据。 */
function validate(mode: Mode, form: Rec): number | Rec {
  const out: Rec = {}
  const name = (form.name ?? '').trim()
  const email = (form.email ?? '').trim()
  const psw = (form.psw ?? '').trim()
  const repsw = (form.repsw ?? '').trim()

  switch (mode) {
    case 'login':
      if (!EMAIL_RE.test(email)) return 2
      if (psw.length < 8) return 3
      out.name = email
      out.psw = md5(psw)
      return out
    case 'reg':
      if (!NAME_RE.test(name)) return 1
      if (!EMAIL_RE.test(email)) return 2
      if (psw.length < 8) return 3
      if (repsw !== psw) return 4
      out.name = name
      out.email = email
      out.psw = md5(psw)
      return out
    case 'forget':
    case 'change_email':
      if (!EMAIL_RE.test(email)) return 2
      out.email = email
      return out
    case 'reset_psw':
      if (psw.length < 8) return 3
      if (repsw !== psw) return 4
      out.psw = md5(psw)
      return out
  }
}

function Tips({ mode, tip }: { mode: Mode; tip: number | null }) {
  return (
    <div className="g_tip">
      {TIPS[mode].map((d: TipDef, i: number) => {
        const cls = `${d.err ? 'err' : ''}${tip === i ? ' curr' : ''}`.trim()
        return <span key={i} className={cls}>{d.text}</span>
      })}
    </div>
  )
}

export default function AuthPage() {
  const loc = useLocation()
  const navigate = useNavigate()
  const { signIn } = useSession()
  const pathname = loc.pathname
  const search = loc.search

  let mode: Mode = 'login'
  if (pathname.indexOf('/accounts/register') === 0) mode = 'reg'
  else if (pathname.indexOf('/accounts/forget') === 0) mode = 'forget'
  else if (pathname.indexOf('/accounts/password_reset') === 0) mode = 'reset_psw'
  else if (pathname.indexOf('/accounts/change_email') === 0) mode = 'change_email'

  /* /accounts/password_reset/:uid-:token/ */
  const resetMatch = pathname.match(/\/accounts\/password_reset\/([^/]+)/)
  const resetRaw = resetMatch ? resetMatch[1] : ''
  const dash = resetRaw.indexOf('-')
  const resetUid = dash >= 0 ? resetRaw.slice(0, dash) : resetRaw
  const resetToken = dash >= 0 ? resetRaw.slice(dash + 1) : ''

  const [form, setForm] = useState<Rec>({})
  const [tip, setTip] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const onField = (e: ChangeEvent<HTMLInputElement>) => {
    const key = e.target.name
    const value = e.target.value
    setForm((f: Rec) => ({ ...f, [key]: value }))
  }
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void submit()
    }
  }

  const submit = async () => {
    if (busy) return
    setTip(SUBMIT_TIP[mode])
    showNotify('Submitting...', 'succ')
    const ret = validate(mode, form)
    if (typeof ret === 'number') {
      const idx = VALID_TIP[mode][ret] ?? ERROR_TIP[mode]
      setTip(idx)
      showNotify(TIPS[mode][idx]?.text ?? 'Invalid input', 'err')
      return
    }
    setBusy(true)
    try {
      let res: any
      if (mode === 'login') {
        res = await login({ name: ret.name ?? ret.email ?? '', psw: ret.psw ?? '' })
      } else if (mode === 'reg') {
        res = await register({ name: ret.name ?? '', psw: ret.psw ?? '', email: ret.email ?? '' })
      } else if (mode === 'forget') {
        res = await requestPasswordReset(ret.email ?? '')
      } else if (mode === 'change_email') {
        res = await requestEmailChange(ret.email ?? '')
      } else {
        res = await resetPassword({ uid: resetUid, token: resetToken, psw: ret.psw ?? '' })
      }

      const code = Number(res?.code)
      const loginNoKey = mode === 'login' && !res?.token && !res?.key
      if (failed(res) || loginNoKey) {
        let idx = ERROR_TIP[mode]
        if (mode === 'reg' && REG_ERR[code] !== undefined) idx = REG_ERR[code]
        else if (mode === 'forget' && code === -1) idx = 4
        setTip(idx)
        showNotify(res?.message ?? TIPS[mode][idx]?.text ?? 'Operation failed', 'err')
        return
      }

      if (mode === 'login') {
        signIn({
          uid: Number(res.uid ?? 0),
          key: res.token ?? res.key ?? '',
          storeKey: res.tokenStore ?? res.storeKey,
          username: res.username ?? ret.email ?? '',
          groups: Array.isArray(res.group) ? res.group : res.group ? [res.group] : [],
        })
        setTip(SUCCESS_TIP[mode])
        const q = new URLSearchParams(search)
        navigate(q.get('next') || URLS.index)
        return
      }
      if (mode === 'reg') {
        setTip(SUCCESS_TIP[mode])
        showNotify('Submitting...', 'succ')
        navigate(URLS.index)
        return
      }
      setTip(SUCCESS_TIP[mode])
      showNotify(TIPS[mode][SUCCESS_TIP[mode]].text, 'succ')
      if (mode === 'reset_psw') {
        window.setTimeout(() => navigate(URLS.login), 3000)
      }
    } catch {
      const idx = ERROR_TIP[mode]
      setTip(idx)
      showNotify(TIPS[mode][idx]?.text ?? 'Operation failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  let content: ReactNode
  switch (mode) {
    case 'login':
      content = (
        <>
          <div className="g_title">Sign in</div>
          <div className="g_cont">
            <h1><label htmlFor="s_email">Email</label><input type="text" name="email" id="s_email" value={form.email ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <h1><label htmlFor="s_psw">Password</label><input type="password" name="psw" id="s_psw" value={form.psw ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <h2><a href={URLS.forget}>Forgot Password?</a></h2>
            <div className="g_btn btn" id="J_signin" onClick={() => void submit()}>Sign in</div>
            <Tips mode={mode} tip={tip} />
          </div>
        </>
      )
      break
    case 'reg':
      content = (
        <>
          <div className="g_title">Register a New Account</div>
          <div className="g_cont">
            <h1><label htmlFor="name">Nickname</label><input type="text" name="name" id="name" value={form.name ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <h1><label htmlFor="email">Email</label><input type="text" name="email" id="email" value={form.email ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <h1><label htmlFor="psw">Password</label><input type="password" name="psw" id="psw" value={form.psw ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <h1><label htmlFor="repsw">Confirm</label><input type="password" name="repsw" id="repsw" value={form.repsw ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <h1><label></label>reg_notice</h1>
            <div className="g_btn btn" id="J_new" onClick={() => void submit()}>START::DASH</div>
            <Tips mode={mode} tip={tip} />
          </div>
        </>
      )
      break
    case 'forget':
      content = (
        <>
          <div className="g_title">Forget password</div>
          <div className="g_cont">
            <h1><label htmlFor="email">Email</label><input type="text" name="email" id="email" value={form.email ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <div className="g_btn btn" id="J_forget" onClick={() => void submit()}>Retrieve Password</div>
            <Tips mode={mode} tip={tip} />
          </div>
        </>
      )
      break
    case 'reset_psw':
      content = (
        <>
          <div className="g_title">Reset password</div>
          <div className="g_cont">
            <h1><label htmlFor="psw">Password</label><input type="password" name="psw" id="psw" value={form.psw ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <h1><label htmlFor="repsw">Confirm</label><input type="password" name="repsw" id="repsw" value={form.repsw ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <div className="g_btn btn" id="J_reset" onClick={() => void submit()}>Reset Password</div>
            <Tips mode={mode} tip={tip} />
          </div>
        </>
      )
      break
    case 'change_email':
      content = (
        <>
          <div className="g_title">Change email</div>
          <div className="g_cont">
            <h1><label htmlFor="email">New email</label><input type="text" name="email" id="email" value={form.email ?? ''} onChange={onField} onKeyDown={onEnter} /> </h1>
            <div className="g_btn btn" id="J_changeEmail" onClick={() => void submit()}>Submit</div>
            <Tips mode={mode} tip={tip} />
          </div>
        </>
      )
      break
  }

  return (
    <Shell variant="wide" title="Account" css={['reg.css']} contCls="g_reg">
      {content}
    </Shell>
  )
}
