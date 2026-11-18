import { useRef, useState } from 'react'
import { Shell } from '../../components/Layout'
import UploadProgress from '../../components/UploadProgress'
import { num } from '../../utils/data'
import { useLoad } from '../../lib/useLoad'
import { URLS } from '../../lib/urls'
import { avatarUidUrl } from '../../utils/formatters'
import { onUpyunSubmit } from './upyunSubmit'
import { t as i18nT } from '../../i18n'
import type { Rec } from '../../utils/response'
import { EMPTY_UPLOAD, IMG_HOST, fileChangeHandler, loadUploadPage, signFieldsOf, type UploadTarget } from './uploadCommon'

export default function UploadAvatar() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const { data } = useLoad<Rec>(() => loadUploadPage('avatar'), [], EMPTY_UPLOAD)

  const target = (data.target ?? {}) as UploadTarget
  const toUidRaw = data.to_uid ?? ''
  const toUid = String(toUidRaw)
  const targetId: number | string = target.id ?? toUid
  const { policy, signature } = signFieldsOf(data)
  const onFile = fileChangeHandler(setFile)

  return (
    <Shell variant="two-col" title={i18nT('Change Avatar')} css={['upload.css']}>
      <div className="g_title">{i18nT('Change Avatar')}</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href={URLS.user(targetId)} className="g_btn">{i18nT('Cancel')}</a>
        </div>
        {toUidRaw ? <h1><label></label>Current user: {targetId}</h1> : null}
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
            onProgress: setProgress,
          })}
        >
          <h1><label htmlFor="file">{i18nT('New image')}</label><input type="file" name="file" accept="image/png, image/jpeg" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <UploadProgress percent={progress} />
          <p className="line">
            <input type="submit" className="g_btn btn" value={i18nT('Save')} disabled={progress !== null} />
          </p>
        </form>
      </div>
    </Shell>
  )
}
