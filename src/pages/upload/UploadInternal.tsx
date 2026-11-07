import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Shell } from '../../components/Layout'
import { showNotify, useLoad } from '../../lib/legacy'
import { fetchUploadPage, fetchUploadSign } from '../../network/legacy'

const STATIC_HOST = 'http://v0.api.upyun.com/ma-static'

export default function UploadInternal() {
  const [file, setFile] = useState<File | null>(null)
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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      return
    }
    try {
      await fetchUploadSign({ type: 'internal', name })
    } catch {
      showNotify('Upload failed', 'err')
    }
  }

  return (
    <Shell
      variant="two-col"
      title="Upload file"
      css={['upload.css']}
      sidebar={
        <div className="tool">
          <a href="/lolicon/home" className="g_btn">Home</a>
        </div>
      }
    >
      <div className="g_title">Upload file</div>
      <div className="g_cont">
        <h1><label htmlFor="">Name</label><span>{name}</span></h1>
        <form action={STATIC_HOST} method="post" encType="multipart/form-data" onSubmit={(e) => void onSubmit(e)}>
          <h1><label htmlFor="file">Select file</label><input type="file" name="file" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <input type="submit" className="g_btn btn" value="Save" />
        </form>
      </div>
    </Shell>
  )
}
