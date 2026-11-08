import { useRef, useState, type ChangeEvent } from 'react'
import { Shell } from '../../components/Layout'
import { num, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchUploadPage } from '../../network/legacy'
import { avatarUidUrl } from '../../utils/formatters'
import { onUpyunSubmit } from './upyunSubmit'
import { t as i18nT } from '../../i18n'

const IMG_HOST = 'http://v0.api.upyun.com/ma-img'

export default function UploadAvatar() {
  const [file, setFile] = useState<File | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const { data } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchUploadPage('avatar')
      return (resp?.data ?? resp ?? {}) as Record<string, any>
    },
    [],
    {} as Record<string, any>,
  )

  const target: any = data.target ?? {}
  const targetId = target.id ?? data.to_uid ?? ''
  const toUid = data.to_uid ?? ''
  const policy = String(data.policy ?? '')
  const signature = String(data.signature ?? '')

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
  }

  return (
    <Shell variant="two-col" title={i18nT('Change Avatar')} css={['upload.css']}>
      <div className="g_title">{i18nT('Change Avatar')}</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href={URLS.user(targetId)} className="g_btn">{i18nT('Cancel')}</a>
        </div>
        {toUid ? <h1><label></label>Current user: {targetId}</h1> : null}
        <h1>
          <label htmlFor="">{i18nT('Current')}</label>
          <img className="g_round" src={avatarUidUrl(num(targetId, 0))} alt="" />
        </h1>
        <form
          ref={formRef}
          action={IMG_HOST}
          method="post"
          encType="multipart/form-data"
          onSubmit={(e) => onUpyunSubmit(e, {
            form: formRef.current, file,
            signParams: { type: 0, uid: num(targetId, 0) },
            defaultHost: IMG_HOST,
          })}
        >
          <h1><label htmlFor="file">{i18nT('New image')}</label><input type="file" name="file" accept="image/png, image/jpeg" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <p className="line">
            <input type="submit" className="g_btn btn" value={i18nT('Save')} />
          </p>
        </form>
      </div>
    </Shell>
  )
}
