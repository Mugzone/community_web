import { useEffect, useState, type ChangeEvent } from 'react'
import { useSession } from '../../components/SessionProvider'
import { Shell } from '../../components/Layout'
import { num, showNotify, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchPlayerInfo, savePlayerInfo } from '../../network/api'
import { formatBirthPayload, regionMap } from '../../utils/profile'
import { avatarUrl } from '../../utils/formatters'
import { t as i18nT } from '../../i18n'

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
  { text: i18nT('Saving...'), err: false },
  { text: i18nT('Failed to save, please try again later.'), err: true },
  { text: i18nT('Password must not be shorter than 8 characters.'), err: true },
  { text: i18nT('Please enter the old password, and then the new password twice.'), err: true },
  { text: i18nT('Saved'), err: false },
  { text: i18nT('Please check the format of DOB (YYYY-MM-DD).'), err: true },
  { text: i18nT("Can't change username"), err: true, link: '/store/all' },
  { text: i18nT('Please use another username'), err: true },
  { text: i18nT('Please wait for 180 days after last username changes'), err: true },
  { text: i18nT('The username is in use'), err: true },
]

/* 返回码 -> .g_tip 下标。
 * 这里是 MaApi-go PlayerSaveInfo 的码表，不是老站 /accounts/config/profile 的：
 * -1 金币/改名券不足, -2 资料不存在或生日非法, -3 用户名非法,
 * -4 半年内已改过名, -5 用户名已存在。老站 -2 才是「没有改名券」。 */
const SAVE_ERR: Record<number, number> = { [-1]: 6, [-2]: 5, [-3]: 7, [-4]: 8, [-5]: 9 }

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
    { id: '1', label: i18nT('Boy') },
    { id: '2', label: i18nT('Girl') },
    { id: '3', label: i18nT('男の娘') },
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
      // /player/info 返回的是扁平结构（username/gender/... 在顶层），没有 data 包裹；
      // 早期写成 res?.data ?? {} 会把整份资料丢掉，表单全部落回默认值。
      const d: Rec = ((res as Rec | undefined)?.data ?? res ?? {}) as Rec
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
    // 空生日表示不修改；非空必须是后端能 time.Parse("2006-1-2") 的日期串，
    // 不能再转成老站 age 参数那种 Unix 时间戳（会触发 code:-2）。
    let birth: string | undefined
    if (age !== '') {
      birth = formatBirthPayload(age)
      if (!birth) {
        setTip(5)
        showNotify(TIPS[5].text, 'err')
        return
      }
    }
    setTip(0)
    showNotify(i18nT('Saving...'), 'succ')
    setBusy(true)
    try {
      const res = await savePlayerInfo({
        name: form.name,
        birth,
        gender: Number(form.gender),
        area: Number(form.country),
        tab: Number(form.tab),
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
    <Shell variant="wide" title={i18nT('Edit Profile')} css={['profile.css']} contCls="">
      <div className="g_title">{i18nT('Edit Profile')}</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href={URLS.user(uid)} className="g_btn">{i18nT('Back')}</a>
          <a href="/upload/avatar" className="g_btn">{i18nT('Change avatar')}</a>
          <a href="/upload/banner" className="g_btn">{i18nT('Change banner')}</a>
          <a href="/store/my" className="g_btn">My items</a>
          {data.isPub && <a href={URLS.publish} className="g_btn">Publisher</a>}
        </div>
        {/* 老站 user_profile.html:18 {% avatar user 128 hclass="g_round" %}：!avatar128 + 内联 128px 上限 */}
        <h1><label htmlFor="avatar">{i18nT('Avatar')}</label><a href="/upload/avatar"><img className="g_round" src={avatarUrl(data.avatar, uid, 128)} alt={i18nT('Avatar')} style={{ maxWidth: 128, maxHeight: 128 }} /></a></h1>
        <h1><label htmlFor="name">{i18nT('Nickname')}</label><input type="text" name="name" id="name" value={form.name} onChange={setField('name')} /> </h1>
        <h1><label htmlFor="email">Email</label><input type="text" className="lock" name="email" id="email" value={form.email} disabled /> </h1>
        <h1 className="select">
          <label htmlFor="gender">{i18nT('Gender')}</label>
          <GenderSelect value={form.gender} onChange={(v: string) => setForm((f: FormState) => ({ ...f, gender: v }))} />
        </h1>
        <h1><label htmlFor="country">{i18nT('Location')}</label>
          <select className="g_options" name="country" id="country" value={form.country} onChange={setField('country')}>
            {regionOptions}
          </select>
        </h1>
        <h1><label htmlFor="age">{i18nT('Date of Birth')}</label><input type="text" name="age" id="age" placeholder="year-month-day" value={form.age} onChange={setField('age')} /></h1>
        <h1>
          <label htmlFor="show">Default tab</label>
          <select name="tab" id="tab" className="g_options" value={form.tab} onChange={setField('tab')}>
            <option value="0">{i18nT('Recent activities')}</option>
            <option value="1">{i18nT('Recent high scores')}</option>
            <option value="2">{i18nT('Chart')}</option>
            <option value="3">{i18nT('Profile')}</option>
          </select>
        </h1>
        <div className="g_btn btn" id="J_submit" onClick={() => void save()}>{i18nT('Save')}</div>
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
