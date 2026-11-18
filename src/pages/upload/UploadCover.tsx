import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import UploadProgress from '../../components/UploadProgress'
import { num } from '../../utils/data'
import { useLoad } from '../../lib/useLoad'
import { URLS } from '../../lib/urls'
import { coverUrl } from '../../utils/formatters'
import { onUpyunSubmit } from './upyunSubmit'
import { t as i18nT } from '../../i18n'
import type { Rec } from '../../utils/response'
import { EMPTY_UPLOAD, IMG_HOST, fileChangeHandler, loadUploadPage, signFieldsOf, type UploadSong } from './uploadCommon'

export default function UploadCover() {
  const [sp] = useSearchParams()
  const sid = sp.get('sid') ?? ''
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const { data } = useLoad<Rec>(() => loadUploadPage('cover', { sid }), [sid], EMPTY_UPLOAD)

  const song = (data.song ?? {}) as UploadSong
  const songId = num(song.id, 0) || num(sid, 0)
  const cover = String(song.cover_url ?? song.cover ?? '')
  const { policy, signature } = signFieldsOf(data)
  const onFile = fileChangeHandler(setFile)

  return (
    <Shell variant="two-col" title={i18nT('Change Cover')} css={['upload.css']}>
      <div className="g_title">{i18nT('Change Cover')}</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href={songId > 0 ? URLS.song(songId) : URLS.index} className="g_btn">{i18nT('Cancel')}</a>
        </div>
        {cover ? (
          <h1><label htmlFor="">{i18nT('Current')}</label><img src={coverUrl(cover)} alt="" /></h1>
        ) : (
          <h1><label htmlFor="">{i18nT('Current')}</label><span>No cover</span></h1>
        )}
        <form
          ref={formRef}
          action={IMG_HOST}
          method="post"
          encType="multipart/form-data"
          onSubmit={(e) => onUpyunSubmit(e, {
            form: formRef.current, file,
            signParams: { type: 2, sid: songId },
            defaultHost: IMG_HOST,
            onProgress: setProgress,
          })}
        >
          <h1><label htmlFor="file">{i18nT('New cover')}</label><input type="file" name="file" accept="image/png, image/jpeg" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <UploadProgress percent={progress} />
          <input type="submit" className="g_btn btn" value={i18nT('Save')} disabled={progress !== null} />
        </form>
      </div>
    </Shell>
  )
}
