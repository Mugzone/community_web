import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { URLS } from '../../lib/urls'
import { useLoad } from '../../lib/legacy'
import { activateAccount, confirmEmail } from '../../network/legacy'

/* /accounts/activate/:key/ 与 /accounts/confirm_email/:key/：调用接口后按结果跳 wiki（老站行为） */
export default function Activate() {
  const { pathname } = useLocation()
  const m = pathname.match(/\/(activate|confirm_email)\/([^/]+)/)
  const kind = m ? m[1] : 'activate'
  const key = m ? m[2] : ''

  /* 老站 activeaccount/email_confirm：成功跳 GLOBAL_PAGE["welcome"](=1)，失败跳 page_id=0 */
  const { data: target, loading } = useLoad<string>(
    async () => {
      try {
        const res = kind === 'confirm_email' ? await confirmEmail(key) : await activateAccount(key)
        const rc = res?.code
        return rc === undefined || Number(rc) === 0 ? URLS.wiki(1) : URLS.wiki(0)
      } catch {
        return URLS.wiki(0)
      }
    },
    [kind, key],
    URLS.wiki(0),
  )

  useEffect(() => {
    if (!loading && target) {
      window.location.assign(target)
    }
  }, [loading, target])

  return (
    <Shell variant="wide" title="Account" css={[]} contCls="g_reg">
      <div className="g_title">Account</div>
      <div className="g_cont">
        <p>{loading ? 'Activating...' : 'Redirecting...'}</p>
      </div>
    </Shell>
  )
}
