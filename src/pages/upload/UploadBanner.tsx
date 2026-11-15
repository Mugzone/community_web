import { useRef, useState } from 'react'
import { Shell } from '../../components/Layout'
import { num } from '../../utils/data'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import { deleteBanner } from '../../network/pageContent'
import { onUpyunSubmit } from './upyunSubmit'
import { t as i18nT } from '../../i18n'
import type { Rec } from '../../utils/response'
import { EMPTY_UPLOAD, IMG_HOST, fileChangeHandler, loadUploadPage, signFieldsOf } from './uploadCommon'

export default function UploadBanner() {
  const [file, setFile] = useState<File | null>(null)
  const [deleted, setDeleted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const { data } = useLoad<Rec>(() => loadUploadPage('banner'), [], EMPTY_UPLOAD)

  const toUidRaw = data.to_uid ?? ''
  const toUid = String(toUidRaw)
  const banner = deleted ? '' : String(data.banner ?? '')
  const { policy, signature } = signFieldsOf(data)
  const onFile = fileChangeHandler(setFile)

  const onDelete = async () => {
    try {
      await deleteBanner()
      setDeleted(true)
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  return (
    <Shell variant="two-col" title={i18nT('Change Banner')} css={['upload.css']}>
      <div className="g_title">{i18nT('Change Banner')}</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href="/accounts/config/profile" className="g_btn">{i18nT('Cancel')}</a>
        </div>
        {toUidRaw ? <h1><label></label>Current user: {toUid}</h1> : null}
        {banner ? (
          <h1><label htmlFor="">{i18nT('Current')}</label><img src={banner} alt="" /></h1>
        ) : (
          <h1><label htmlFor="">{i18nT('Current')}</label><span>No banner</span></h1>
        )}
        <form
          ref={formRef}
          action={IMG_HOST}
          method="post"
          encType="multipart/form-data"
          onSubmit={(e) => onUpyunSubmit(e, {
            form: formRef.current, file,
            signParams: { type: 1, uid: num(toUid, 0) },
            defaultHost: IMG_HOST,
          })}
        >
          <h1><label htmlFor="file">{i18nT('New image')}</label><input type="file" name="file" accept="image/png, image/jpeg" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <p className="line">
            <input type="submit" className="g_btn btn" value={i18nT('Save')} />
            {banner && (
              <a href="#" id="J_del" onClick={(e) => { e.preventDefault(); void onDelete() }}>{i18nT('Delete')}</a>
            )}
          </p>
        </form>
      </div>
    </Shell>
  )
}
