import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../network/api'
import { md5 } from '../utils/md5'
import { showNotify } from '../lib/legacy'
import { URLS } from '../lib/urls'
import { useSession } from './SessionProvider'

/** 复刻老站 templates/widget/login.html */
export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [psw, setPsw] = useState('')
  const [busy, setBusy] = useState(false)
  const { signIn } = useSession()
  const navigate = useNavigate()

  const submit = async () => {
    if (!email || !psw || busy) return
    setBusy(true)
    try {
      const res: any = await login({ name: email, psw: md5(psw) })
      const key = res?.token ?? res?.key
      if (res?.code !== undefined && res.code !== 0) {
        showNotify(res.message ?? 'Invalid Email or Password', 'err')
        return
      }
      if (!key) {
        showNotify('Invalid Email or Password', 'err')
        return
      }
      signIn({
        uid: Number(res.uid ?? 0),
        key,
        storeKey: res.tokenStore ?? res.storeKey,
        username: res.username ?? email,
        groups: Array.isArray(res.group) ? res.group : res.group ? [res.group] : [],
      })
      onClose()
      showNotify('Sign in success')
      navigate(URLS.index)
    } catch (e) {
      showNotify(e instanceof Error ? e.message : 'Invalid Email or Password', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="login" style={{ display: open ? 'block' : 'none' }}>
      <div className="g_title">Sign in<span className="click" data-type="close" onClick={onClose}>X</span></div>
      <div className="g_cont">
        <h1><label htmlFor="s_email">Email</label><input type="text" name="email" id="s_email" value={email} onChange={(e) => setEmail(e.target.value)} /></h1>
        <h1><label htmlFor="s_psw">Password</label><input type="password" name="psw" id="s_psw" value={psw} onChange={(e) => setPsw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></h1>
        <div className="g_btn btn click" data-type="login" onClick={submit}>{busy ? 'Submitting...' : 'Sign in'}</div>
        <h1 style={{ marginLeft: 100 }}>
          <Link to={URLS.forget}>Forgot Password?</Link>
          <a style={{ marginLeft: 32, color: '#ef6666' }} href={URLS.register}>Register</a>
        </h1>
      </div>
    </div>
  )
}
