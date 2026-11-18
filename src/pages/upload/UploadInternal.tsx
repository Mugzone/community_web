import { useRef, useState } from 'react'
import { Shell } from '../../components/Layout'
import UploadProgress from '../../components/UploadProgress'
import { useLoad } from '../../lib/useLoad'
import { onUpyunSubmit } from './upyunSubmit'
import { t as i18nT } from '../../i18n'
import type { Rec } from '../../utils/response'
import { EMPTY_UPLOAD, STATIC_HOST, fileChangeHandler, loadUploadPage, signFieldsOf } from './uploadCommon'

export default function UploadInternal() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const queryName = new URLSearchParams(window.location.search).get('name') ?? ''

  const { data } = useLoad<Rec>(() => loadUploadPage('internal'), [], EMPTY_UPLOAD)

  const name = queryName || String(data.name ?? '')
  const { policy, signature } = signFieldsOf(data)
  const onFile = fileChangeHandler(setFile)

  return (
    <Shell
      variant="two-col"
      title={i18nT('Upload file')}
      css={['upload.css']}
      sidebar={
        <div className="tool">
          <a href="/index" className="g_btn">Home</a>
        </div>
      }
    >
      <div className="g_title">{i18nT('Upload file')}</div>
      <div className="g_cont">
        <h1><label htmlFor="">{i18nT('Name')}</label><span>{name}</span></h1>
        <form
          ref={formRef}
          action={STATIC_HOST}
          method="post"
          encType="multipart/form-data"
          onSubmit={(e) => onUpyunSubmit(e, {
            form: formRef.current, file,
            signParams: { type: 'internal', name },
            defaultHost: STATIC_HOST,
            onProgress: setProgress,
          })}
        >
          <h1><label htmlFor="file">{i18nT('Select file')}</label><input type="file" name="file" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <UploadProgress percent={progress} />
          <input type="submit" className="g_btn btn" value={i18nT('Save')} disabled={progress !== null} />
        </form>
      </div>
    </Shell>
  )
}
