import { useRef, useState, type ChangeEvent } from 'react'
import { Shell } from '../../components/Layout'
import { useLoad } from '../../lib/legacy'
import { fetchUploadPage } from '../../network/legacy'
import { onUpyunSubmit } from './upyunSubmit'
import { t as i18nT } from '../../i18n'

const STATIC_HOST = 'http://v0.api.upyun.com/ma-static'

export default function UploadInternal() {
  const [file, setFile] = useState<File | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const queryName = new URLSearchParams(window.location.search).get('name') ?? ''

  const { data } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchUploadPage('internal')
      return (resp?.data ?? resp ?? {}) as Record<string, any>
    },
    [],
    {} as Record<string, any>,
  )

  const name = queryName || String(data.name ?? '')
  const policy = String(data.policy ?? '')
  const signature = String(data.signature ?? '')

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
  }

  return (
    <Shell
      variant="two-col"
      title={i18nT('Upload file')}
      css={['upload.css']}
      sidebar={
        <div className="tool">
          {/* 老站指向 /lolicon/home（后台首页）；v3 不移植该页，改回站点首页 */}
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
          })}
        >
          <h1><label htmlFor="file">{i18nT('Select file')}</label><input type="file" name="file" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <input type="submit" className="g_btn btn" value={i18nT('Save')} />
        </form>
      </div>
    </Shell>
  )
}
