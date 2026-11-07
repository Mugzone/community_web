import { useEffect, useState, type ChangeEvent } from 'react'
import { useSession } from '../../components/SessionProvider'
import { Shell } from '../../components/Layout'
import { num, showNotify, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchPlayerInfo, savePlayerInfo } from '../../network/api'
import { regionMap } from '../../utils/profile'
import { avatarUrl } from '../../utils/formatters'

/* user_profile.html：编辑资料单页，交互对应 module/profile/src/init.js */
type Rec = Record<string, any>
type ProfileData = {
  username: string
  email: string
  gender: number
  country: number
  birth: string
  tab: number
  avatar: string
  isPub: boolean
}
type FormState = {
  name: string
  email: string
  gender: string
  country: string
  age: string
  tab: string
}

const FALLBACK: ProfileData = {
  username: '', email: '', gender: 3, country: 0, birth: '', tab: 0, avatar: '', isPub: false,
}

/* .g_tip 下的 10 个 span，顺序即 util.showTip(n) 的下标。 */
const TIPS: { text: string; err: boolean; link?: string }[] = [
  { text: 'Saving...', err: false },
  { text: 'Failed to save, please try again later.', err: true },
  { text: 'Password must not be shorter than 8 characters.', err: true },
  { text: 'Please enter the old password, and then the new password twice.', err: true },
  { text: 'Saved', err: false },
  { text: 'Please check the format of DOB (YYYY-MM-DD).', err: true },
  { text: "Can't change username", err: true, link: '/store/all' },
  { text: 'Please use another username', err: true },
  { text: 'Please wait for 180 days after last username changes', err: true },
  { text: 'The username is in use', err: true },
]

/* module/profile/src/init.js error 回调：返回码 -> .g_tip 下标 */
const SAVE_ERR: Record<number, number> = { [-2]: 6, [-3]: 7, [-4]: 8, [-5]: 9 }

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))
const n = (v: unknown, fb = 0): number => num(v, fb)

const dobStr = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return ''
  const raw = String(v)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) return raw
  const t = Number(raw)
  if (!Number.isFinite(t)) return raw
  const d = new Date(t < 1e12 ? t * 1000 : t)
  return Number.isNaN(d.getTime()) ? raw : `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function GenderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts: { id: string; label: string }[] = [
    { id: '1', label: 'Boy' },
    { id: '2', label: 'Girl' },
    { id: '3', label: '男の娘' },
  ]
  return (
    <div className="g_select">
      {opts.map((o: { id: string; label: string }) => (
        <span
          key={o.id}
          data-id={o.id}
          className={value === o.id ? 'curr' : ''}
          onClick={() => { onChange(o.id) }}
        >{o.label}</span>
      ))}
    </div>
  )
}

export default function ProfileSetting() {
  const { session } = useSession()
  const uid = session?.uid ?? 0

  const { data } = useLoad<ProfileData>(
    async () => {
      const res = await fetchPlayerInfo({ uid })
      const d: Rec = (res?.data ?? {}) as Rec
      return {
        username: s(d.username ?? d.name),
        email: s(d.email),
        gender: n(d.gender, 3),
        country: n(d.country ?? d.area),
        birth: dobStr(d.birth),
        tab: n(d.tab),
        avatar: s(d.avatar),
        isPub: (Array.isArray(d.group) ? d.group.length > 1 : false),
      }
    },
    [uid],
    FALLBACK,
  )

  const [form, setForm] = useState<FormState>({
    name: FALLBACK.username,
    email: FALLBACK.email,
    gender: String(FALLBACK.gender),
    country: String(FALLBACK.country),
    age: FALLBACK.birth,
    tab: String(FALLBACK.tab),
  })
  useEffect(() => {
    setForm({
      name: data.username,
      email: data.email,
      gender: String(data.gender),
      country: String(data.country),
      age: data.birth,
      tab: String(data.tab),
    })
  }, [data])

  const [tip, setTip] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const setField = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value
    setForm((f: FormState) => ({ ...f, [key]: v }))
  }

  const save = async () => {
    if (busy) return
    const age = (form.age ?? '').trim()
    if (!/^(\d{4})-(\d{1,2})-(\d{1,2})$/.test(age)) {
      setTip(5)
      showNotify(TIPS[5].text, 'err')
      return
    }
    const t = new Date(age).getTime() / 1000
    if (!Number.isFinite(t) || t < 0 || t > Date.now() / 1000) {
      showNotify('invalid birthday', 'err')
      return
    }
    setTip(0)
    showNotify('Saving...', 'succ')
    setBusy(true)
    try {
      const res = await savePlayerInfo({
        name: form.name,
        birth: String(t),
        gender: Number(form.gender),
        area: Number(form.country),
      })
      const rc = res?.code
      if (rc !== undefined && Number(rc) !== 0) {
        const idx = SAVE_ERR[Number(rc)] ?? 1
        setTip(idx)
        showNotify(TIPS[idx].text, 'err')
        return
      }
      setTip(4)
    } catch {
      setTip(1)
      showNotify(TIPS[1].text, 'err')
    } finally {
      setBusy(false)
    }
  }

  const regionOptions = Object.entries(regionMap).map(([key, meta]) => (
    <option key={key} value={key}>{meta.fallback}</option>
  ))

  return (
    <Shell variant="wide" title="Edit Profile" css={['profile.css']} contCls="">
      <div className="g_title">Edit Profile</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href={URLS.user(uid)} className="g_btn">Back</a>
          <a href="/upload/avatar" className="g_btn">Change avatar</a>
          <a href="/upload/banner" className="g_btn">Change banner</a>
          <a href="/store/my" className="g_btn">My items</a>
          {data.isPub && <a href={URLS.publish} className="g_btn">Publisher</a>}
        </div>
        <h1><label htmlFor="avatar">Avatar</label><a href="/upload/avatar"><img className="g_round" src={avatarUrl(data.avatar, uid)} alt="Avatar" /></a></h1>
        <h1><label htmlFor="name">Nickname</label><input type="text" name="name" id="name" value={form.name} onChange={setField('name')} /> </h1>
        <h1><label htmlFor="email">Email</label><input type="text" className="lock" name="email" id="email" value={form.email} disabled /> </h1>
        <h1 className="select">
          <label htmlFor="gender">Gender</label>
          <GenderSelect value={form.gender} onChange={(v: string) => setForm((f: FormState) => ({ ...f, gender: v }))} />
        </h1>
        <h1><label htmlFor="country">Location</label>
          <select className="g_options" name="country" id="country" value={form.country} onChange={setField('country')}>
            {regionOptions}
          </select>
        </h1>
        <h1><label htmlFor="age">Date of Birth</label><input type="text" name="age" id="age" placeholder="year-month-day" value={form.age} onChange={setField('age')} /></h1>
        <h1>
          <label htmlFor="show">Default tab</label>
          <select name="tab" id="tab" className="g_options" value={form.tab} onChange={setField('tab')}>
            <option value="0">Recent activities</option>
            <option value="1">Recent high scores</option>
            <option value="2">Chart</option>
            <option value="3">Profile</option>
          </select>
        </h1>
        <div className="g_btn btn" id="J_submit" onClick={() => void save()}>Save</div>
        <div className="g_tip">
          {TIPS.map((d, i: number) => {
            const cls = `${d.err ? 'err' : ''}${tip === i ? ' curr' : ''}`.trim()
            return (
              <span key={i} className={cls}>
                {d.text}{d.link && <>&nbsp;&nbsp;<a href={d.link}>Buy item</a></>}
              </span>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}
