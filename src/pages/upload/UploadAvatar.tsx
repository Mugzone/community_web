import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Shell } from '../../components/Layout'
import { num, showNotify, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchUploadPage, fetchUploadSign } from '../../network/legacy'
import { avatarUidUrl } from '../../utils/formatters'

const IMG_HOST = 'http://v0.api.upyun.com/ma-img'

export default function UploadAvatar() {
  const [file, setFile] = useState<File | null>(null)

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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      return
    }
    try {
      await fetchUploadSign({ type: 0, uid: num(targetId, 0) })
    } catch {
      showNotify('Upload failed', 'err')
    }
  }

  return (
    <Shell variant="two-col" title="Change Avatar" css={['upload.css']}>
      <div className="g_title">Change Avatar</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href={URLS.user(targetId)} className="g_btn">Cancel</a>
        </div>
        {toUid ? <h1><label></label>Current user: {targetId}</h1> : null}
        <h1>
          <label htmlFor="">Current</label>
          <img className="g_round" src={avatarUidUrl(num(targetId, 0))} alt="" />
        </h1>
        <form action={IMG_HOST} method="post" encType="multipart/form-data" onSubmit={(e) => void onSubmit(e)}>
          <h1><label htmlFor="file">New image</label><input type="file" name="file" accept="image/png, image/jpeg" onChange={onFile} /></h1>
          <input name="policy" type="hidden" value={policy} readOnly />
          <input name="signature" type="hidden" value={signature} readOnly />
          <p className="line">
            <input type="submit" className="g_btn btn" value="Save" />
          </p>
        </form>
      </div>
    </Shell>
  )
}
