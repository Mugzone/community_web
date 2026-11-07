import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Shell } from '../../components/Layout'
import { num, showNotify, useLoad } from '../../lib/legacy'
import { deleteBanner, fetchUploadPage, fetchUploadSign } from '../../network/legacy'

const IMG_HOST = 'http://v0.api.upyun.com/ma-img'

export default function UploadBanner() {
  const [file, setFile] = useState<File | null>(null)
  const [deleted, setDeleted] = useState(false)

  const { data } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchUploadPage('banner')
      return (resp?.data ?? resp ?? {}) as Record<string, any>
    },
    [],
    {} as Record<string, any>,
  )

  const toUid = data.to_uid ?? ''
  const banner = deleted ? '' : String(data.banner ?? '')
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
      await fetchUploadSign({ type: 1, uid: num(toUid, 0) })
    } catch {
      showNotify('Upload failed', 'err')
    }
  }

  const onDelete = async () => {
    try {
      await deleteBanner()
      setDeleted(true)
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  return (
    <Shell variant="two-col" title="Change Banner" css={['upload.css']}>
      <div className="g_title">Change Banner</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href="/accounts/config/profile" className="g_btn">Cancel</a>
        </div>
        {toUid ? <h1><label></label>Current user: {toUid}</h1> : null}
        {banner ? (
          <h1><label htmlFor="">Current</label><img src={banner} alt="" /></h1>
        ) : (
          <h1><label htmlFor="">Current</label><span>No banner</span></h1>
        )}
        <form action={IMG_HOST} method="post" encType="multipart/form-data" onSubmit={(e) => void onSubmit(e)}>
          <h1><label htmlFor="file">New image</label><input type="file" name="file" accept="image/png, image/jpeg" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <p className="line">
            <input type="submit" className="g_btn btn" value="Save" />
            {banner && (
              <a href="#" id="J_del" onClick={(e) => { e.preventDefault(); void onDelete() }}>Delete</a>
            )}
          </p>
        </form>
      </div>
    </Shell>
  )
}
