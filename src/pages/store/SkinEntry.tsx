import { useEffect, useState, type ChangeEvent } from 'react'
import { Shell } from '../../components/Layout'
import UploadProgress from '../../components/UploadProgress'
import { asArray, num } from '../../utils/data'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import { fetchUploadSign, removeSkinPreview, setSkinStatus, submitSkin } from '../../network/pageContent'
import { finishImageUpload } from '../../network/api'
import { postFileToOSS } from '../../lib/ossUpload'
import { t as i18nT } from '../../i18n'
import './SkinEntry.css'

const MODE_BITS: { bit: number; label: string }[] = [
  { bit: 1, label: 'Key' }, { bit: 8, label: 'Catch' }, { bit: 16, label: 'Pad' },
  { bit: 32, label: 'Taiko' }, { bit: 64, label: 'Ring' }, { bit: 128, label: 'Slide' },
  { bit: 256, label: 'Live' }, { bit: 512, label: 'Cube' },
]
const PLATFORM_BITS: { bit: number; label: string }[] = [
  { bit: 1, label: 'PC' }, { bit: 2, label: i18nT('Pad Horizontal') }, { bit: 4, label: i18nT('Pad Portrait') },
  { bit: 8, label: i18nT('Phone Horizontal') }, { bit: 16, label: i18nT('Phone Portrait') },
]

const TIP = {
  MSG_DELETE_CONFIRM: 'Do you want to delete this image?',
  MSG_SET_STATUS: 'Do you want to change status? Unsaved changes will be lost.',
  MSG_IMG_LIMIT: 'You can upload at most 5 preview images',
  HINT_DELETE: 'Delete this image',
  SAVE_SUCCESS: 'Skin saved successfully',
  VALID_NAME: 'Required and should be less than 100 characters',
  VALID_NUM: 'Required and should be a number',
  VALID_REQ: i18nT('Required'),
  SUCC_STATUS: 'Skin status changed successfully',
  MSG_SAVE_FIRST: 'Please save the skin info first',
  UPLOAD_SUCCESS: 'Upload succeeded',
  UPLOAD_FAILED: 'Upload failed',
}

// 图片新上传走 ali OSS ma-img；皮肤包走 ma-skin，两者同在 oss-cn-shanghai。
// 实际 host 由 /upload/sign 下发（upyun_host_img / param_oss.host），常量只是兜底。
const IMG_HOST = 'https://ma-img.oss-cn-shanghai.aliyuncs.com'
const OSS_HOST = 'https://ma-skin.oss-cn-shanghai.aliyuncs.com'

// param_oss 里 host / expire 是给前端选域名用的元数据，不是 OSS 表单字段，
// 混进 FormData 会被 OSS 判为 Extra field。
const SKIP_FORM_FIELDS = new Set(['host', 'expire', 'accessid'])

// 库里存的是不带域名的 key，按 SkinDetail 的口径拼缩略图域名与 !small 样式。
const previewSrc = (img: string) =>
  img.startsWith('http') || img.startsWith('//') || img.startsWith('blob:')
    ? img
    : `//cni.machart.top/${img.replace(/^\/+/, '')}!small`

type UploadKind = 'cover' | 'skin' | 'preview'

const initialSkinId = () => new URLSearchParams(window.location.search).get('id') ?? ''

export default function SkinEntry() {
  const [skinId, setSkinId] = useState<string>(initialSkinId)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [minv, setMinv] = useState('')
  const [maxv, setMaxv] = useState('')
  const [modeBits, setModeBits] = useState<number[]>([])
  const [platBits, setPlatBits] = useState<number[]>([])
  const [preview, setPreview] = useState<string[]>([])
  const [coverSrc, setCoverSrc] = useState('')
  const [skinLink, setSkinLink] = useState('')
  const [lock, setLock] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const { data: pageData } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchUploadSign({ type: 'skin', ...(skinId ? { id: skinId } : {}) })
      return (resp?.data ?? resp ?? {}) as Record<string, any>
    },
    [skinId],
    {} as Record<string, any>,
  )

  useEffect(() => {
    const skin: any = pageData.skin ?? {}
    if (!skin || Object.keys(skin).length === 0) return
    setName(String(skin.name ?? ''))
    setPrice(String(skin.price ?? ''))
    setMinv(String(skin.client ?? ''))
    setMaxv(String(skin.clientmax ?? ''))
    setModeBits(MODE_BITS.filter((b) => (num(skin.mode, 0) & b.bit) !== 0).map((b) => b.bit))
    setPlatBits(PLATFORM_BITS.filter((b) => (num(skin.platform, 0) & b.bit) !== 0).map((b) => b.bit))
    setCoverSrc(String(skin.cover_url ?? skin.cover ?? ''))
    setSkinLink(String(skin.link ?? ''))
    const rawPreview = pageData.preview
      ?? (typeof skin.preview === 'string' ? skin.preview.split('|') : skin.preview)
    setPreview(asArray<string>(rawPreview))
  }, [pageData])

  const modeValue = modeBits.reduce((sum, b) => sum + b, 0)
  const platValue = platBits.reduce((sum, b) => sum + b, 0)

  const toggleBit = (list: number[], set: (v: number[]) => void, bit: number) => {
    set(list.includes(bit) ? list.filter((b) => b !== bit) : [...list, bit])
  }

  const onSave = async () => {
    if (!name.trim() || name.length > 100) {
      showNotify(TIP.VALID_NAME, 'err')
      return
    }
    if (price === '' || !Number.isFinite(Number(price))) {
      showNotify(TIP.VALID_NUM, 'err')
      return
    }
    if (modeValue === 0 || platValue === 0) {
      showNotify(TIP.VALID_REQ, 'err')
      return
    }
    if (lock) return
    setLock(true)
    try {
      const resp = await submitSkin({
        name,
        price: num(price, 100),
        minv,
        maxv,
        mode: modeValue,
        platform: platValue,
        ...(skinId ? { id: num(skinId, 0) } : {}),
      })
      const id = num(resp?.data?.id ?? resp?.id, 0)
      showNotify(TIP.SAVE_SUCCESS, 'succ')
      if (id > 0 && !skinId) setSkinId(String(id))
    } catch {
      showNotify(i18nT('Editing is available for active account'), 'err')
    } finally {
      setLock(false)
    }
  }

  const onStatus = async (stat: number) => {
    if (!skinId) return
    if (!window.confirm(TIP.MSG_SET_STATUS)) return
    try {
      await setSkinStatus({ status: stat, id: skinId })
      showNotify(TIP.SUCC_STATUS, 'succ')
    } catch {
      showNotify(i18nT('Operation failed'), 'err')
    }
  }

  const onCancel = () => {
    if (skinId) window.location.href = `/store/skin/detail/${skinId}`
    else window.history.back()
  }

  const onDeletePreview = async (img: string) => {
    if (!window.confirm(TIP.MSG_DELETE_CONFIRM)) return
    try {
      await removeSkinPreview({ img, id: skinId })
      setPreview((list) => list.filter((p) => p !== img))
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  // 三类上传共用：重新取签名 → POST 到 OSS → /api/upload/finish 落库。
  // 封面走 ma-img、预览图走 ma-img、皮肤包走 ma-skin，落库由服务端按 key 前缀区分。
  const uploadFile = async (kind: UploadKind, file: File) => {
    if (!skinId) {
      showNotify(TIP.MSG_SAVE_FIRST, 'err')
      return
    }
    setUploading(true)
    try {
      // 每次上传前重新取签名：预览图 key 含纳秒时间戳，避免多张互相覆盖。
      const resp = await fetchUploadSign({ type: 'skin', id: skinId })
      const data = (resp?.data ?? resp ?? {}) as Record<string, any>
      const params: Record<string, any> = kind === 'cover'
        ? data.param_img_cover
        : kind === 'preview' ? data.param_img_preview : data.param_oss
      const key = String(params?.key ?? '')
      if (!key || !params?.policy) throw new Error('missing upload sign')

      const host = kind === 'skin'
        ? String(params.host ?? OSS_HOST)
        : String(data.upyun_host_img ?? IMG_HOST)
      const fields: Record<string, string> = {}
      Object.entries(params).forEach(([k, v]) => {
        if (!SKIP_FORM_FIELDS.has(k)) fields[k] = String(v)
      })
      await postFileToOSS(host, fields, file, (loaded, total) => {
        setProgress(total > 0 ? Math.round((loaded / total) * 100) : 0)
      })

      const finish = await finishImageUpload({ path: key })
      if (finish.code !== 0) throw new Error('upload finish failed')

      // 用真实 key 更新本地状态，删除预览图时才能按原串从库里移除。
      if (kind === 'cover') setCoverSrc(previewSrc(key))
      if (kind === 'preview') setPreview((list) => [...list, key])
      if (kind === 'skin') setSkinLink(`//file.mugzone.net/${key}`)
      showNotify(TIP.UPLOAD_SUCCESS, 'succ')
    } catch {
      showNotify(TIP.UPLOAD_FAILED, 'err')
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  const onFile = (kind: UploadKind, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (kind === 'preview' && preview.length >= 5) {
      showNotify(TIP.MSG_IMG_LIMIT, 'err')
      return
    }
    if (uploading) return
    e.target.value = '' // 允许重复选同一个文件
    void uploadFile(kind, file)
  }

  const ossParams: Record<string, any> = pageData.param_oss ?? {}
  // 封面 / 预览图与头像、歌曲封面共用 ma-img 桶的 OSS 表单字段。
  const imgCoverParams: Record<string, any> = pageData.param_img_cover ?? {}
  const imgPreviewParams: Record<string, any> = pageData.param_img_preview ?? {}
  const imgHost: string = pageData.upyun_host_img ?? IMG_HOST
  const ossHost: string = ossParams.host ?? OSS_HOST

  return (
    <Shell page="skin_submit" variant="two-col" title={i18nT('Submit my skin')} css={[]}>
      <div className="g_title">{i18nT('Submit my skin')}</div>
      <div className="g_cont">
        <div id="option">
          <form id="basic" onSubmit={(e) => e.preventDefault()}>
            {!skinId && <div className="hint">Please fill the basic info first before uploading images and skin file</div>}
            <input id="skin_id" type="hidden" value={skinId} readOnly />
            <div className="row">
              <span className="g_round field">{i18nT('Skin name')}</span>
              <input id="skin_name" name="skin_name" className="g_round input-box" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="row">
              <span className="g_round field">{i18nT('Price')}</span>
              <input id="price" name="price" className="g_round input-box" value={price} placeholder="from 100 to 1000" onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="row">
              <span className="g_round field">{i18nT('Mode')}</span>
              <input id="mode_val" value={modeValue} type="hidden" readOnly />
              <div className="cb-wrap" id="wrap_mode">
                {MODE_BITS.map((b) => (
                  <span key={b.bit}>
                    <input
                      name="mode" type="checkbox" id={`cb_mode_${b.bit}`} value={b.bit}
                      checked={modeBits.includes(b.bit)}
                      onChange={() => toggleBit(modeBits, setModeBits, b.bit)}
                    />
                    <label htmlFor={`cb_mode_${b.bit}`}>{b.label}</label>
                  </span>
                ))}
              </div>
            </div>
            <div className="row">
              <span className="g_round field">{i18nT('Platform')}</span>
              <input id="platform_val" value={platValue} type="hidden" readOnly />
              <div className="cb-wrap" id="wrap_plat">
                {PLATFORM_BITS.map((b) => (
                  <span key={b.bit}>
                    <input
                      name="platform" type="checkbox" id={`cb_plat_${b.bit}`} value={b.bit}
                      checked={platBits.includes(b.bit)}
                      onChange={() => toggleBit(platBits, setPlatBits, b.bit)}
                    />
                    <label htmlFor={`cb_plat_${b.bit}`}>{b.label}</label>
                  </span>
                ))}
              </div>
            </div>
            <div className="row">
              <span className="g_round field">{i18nT('Required')}</span>
              <input id="minv" name="minv" className="g_round input-box" value={minv} placeholder="minimum client version require" onChange={(e) => setMinv(e.target.value)} />
            </div>
            <div className="row">
              <span className="g_round field">{i18nT('Required highest')}</span>
              <input id="maxv" name="maxv" className="g_round input-box" value={maxv} placeholder="highest client version require" onChange={(e) => setMaxv(e.target.value)} />
            </div>
          </form>
          {skinId && (
            <>
              <div className="row">
                <span className="g_round field vtop">{i18nT('Cover')}</span>
                <div className="vtop value">
                  <div className="img-wrap" id="img_cover">
                    <img src={coverSrc || '/static/img/cover.png'} alt="" />
                  </div>
                  <div className="upload-wrap vtop">
                    <form id="form_cover" action={imgHost} method="post" encType="multipart/form-data" onSubmit={(e) => e.preventDefault()}>
                      <div className="upload-btn" id="upload_cover">
                        <div className="upload-icon"></div>
                        <div className="upload-text">{i18nT('Change cover')}</div>
                        {Object.entries(imgCoverParams).map(([k, v]) => (
                          <input name={k} type="hidden" value={String(v)} key={k} readOnly />
                        ))}
                        <input type="file" name="file" id="file_cover" accept="image/jpeg, image/png" disabled={uploading} onChange={(e) => void onFile('cover', e)} />
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="row">
                <span className="g_round field vtop">{i18nT('Skin file')}</span>
                <div className="vtop value">
                  {skinLink && (
                    <span id="skin_uploaded_hint"><a href={skinLink}>Click here to download</a> , or upload a new skin to replace this</span>
                  )}
                  <div className="upload-wrap vtop">
                    <form id="form_skin" action={ossHost} method="post" encType="multipart/form-data" onSubmit={(e) => e.preventDefault()}>
                      <div className="upload-btn" id="upload_cover">
                        <div className="upload-icon"></div>
                        <div className="upload-text">{i18nT('Upload skin')}</div>
                        {Object.entries(ossParams).map(([k, v]) => (
                          <input name={k} type="hidden" value={String(v)} key={k} readOnly />
                        ))}
                        <input type="file" name="file" id="file_skin" accept=".msz,.msp" disabled={uploading} onChange={(e) => void onFile('skin', e)} />
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="row">
                <span className="g_round field vtop">{i18nT('Preview image')}</span>
                <div className="vtop value" id="preview_list">
                  {preview.map((img) => (
                    <div className="img-wrap" data-src={img} key={img}>
                      <img src={previewSrc(img)} alt="" />
                      <div className="toolbar">
                        <span className="icon icon-delete" title="Remove this image" onClick={() => void onDeletePreview(img)}></span>
                      </div>
                    </div>
                  ))}
                  <div className="upload-wrap">
                    <form id="form_preview" action={imgHost} method="post" encType="multipart/form-data" onSubmit={(e) => e.preventDefault()}>
                      <div className="upload-btn" id="upload_preview">
                        <div className="upload-icon"></div>
                        <div className="upload-text">{i18nT('Upload image')}</div>
                        {Object.entries(imgPreviewParams).map(([k, v]) => (
                          <input name={k} type="hidden" value={String(v)} key={k} readOnly />
                        ))}
                        <input type="file" name="file" id="file_preview" accept="image/jpeg, image/png" disabled={uploading} onChange={(e) => void onFile('preview', e)} />
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <UploadProgress percent={progress} />
        <div id="btn_bottom">
          <div className="g_btn btn" data-type="btn_save" onClick={() => void onSave()}>{skinId ? i18nT('Save') : i18nT('Next')}</div>
          {skinId && <div className="g_btn btn" data-type="btn_stable" onClick={() => void onStatus(2)}>Stable</div>}
          {skinId && <div className="g_btn btn" data-type="btn_beta" onClick={() => void onStatus(1)}>Beta</div>}
          <a href="#" className="btn" data-type="cancel" onClick={(e) => { e.preventDefault(); onCancel() }}>{i18nT('Cancel')}</a>
        </div>
      </div>
    </Shell>
  )
}
