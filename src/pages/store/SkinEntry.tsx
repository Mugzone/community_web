import { useEffect, useState, type ChangeEvent } from 'react'
import { Shell } from '../../components/Layout'
import { asArray, num, showNotify, useLoad } from '../../lib/legacy'
import { fetchUploadSign, removeSkinPreview, setSkinStatus, submitSkin } from '../../network/legacy'

/** const.MODE_BITS，老站 skin_submit.html 排除位值 2 / 4 */
const MODE_BITS: { bit: number; label: string }[] = [
  { bit: 1, label: 'Key' }, { bit: 8, label: 'Catch' }, { bit: 16, label: 'Pad' },
  { bit: 32, label: 'Taiko' }, { bit: 64, label: 'Ring' }, { bit: 128, label: 'Slide' },
  { bit: 256, label: 'Live' }, { bit: 512, label: 'Cube' },
]
/** const.PLATFORM_BITS */
const PLATFORM_BITS: { bit: number; label: string }[] = [
  { bit: 1, label: 'PC' }, { bit: 2, label: 'Pad Horizontal' }, { bit: 4, label: 'Pad Portrait' },
  { bit: 8, label: 'Phone Horizontal' }, { bit: 16, label: 'Phone Portrait' },
]

/** 老站 skin_submit.html 的 window.malody.tip，取 locale/en 的实际英文文案 */
const TIP = {
  MSG_DELETE_CONFIRM: 'Do you want to delete this image?',
  MSG_SET_STATUS: 'Do you want to change status? Unsaved changes will be lost.',
  MSG_IMG_LIMIT: 'You can upload at most 5 preview images',
  HINT_DELETE: 'Delete this image',
  SAVE_SUCCESS: 'Skin saved successfully',
  VALID_NAME: 'Required and should be less than 100 characters',
  VALID_NUM: 'Required and should be a number',
  VALID_REQ: 'Required',
  SUCC_STATUS: 'Skin status changed successfully',
}

const IMG_HOST = 'http://v0.api.upyun.com/ma-img'
const OSS_HOST = 'http://oss-cni.oss-cn-hongkong.aliyuncs.com'

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

  const { data: pageData } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchUploadSign({ type: 'skin', ...(skinId ? { id: skinId } : {}) })
      return (resp?.data ?? resp ?? {}) as Record<string, any>
    },
    [skinId],
    {} as Record<string, any>,
  )

  // 编辑态（带 id）时把接口返回的表单值填回老站原有的输入框
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      showNotify('Editing is available for active account', 'err')
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
      showNotify('Operation failed', 'err')
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

  const onFile = async (kind: UploadKind, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (kind === 'preview' && preview.length >= 5) {
      showNotify(TIP.MSG_IMG_LIMIT, 'err')
      return
    }
    try {
      // 老站改变文件即 form.submit()；这里先取上传签名再反馈
      await fetchUploadSign({ type: kind, ...(skinId ? { id: skinId } : {}) })
      if (kind === 'preview') setPreview((list) => [...list, URL.createObjectURL(file)])
      if (kind === 'cover') setCoverSrc(URL.createObjectURL(file))
    } catch {
      showNotify('Upload failed', 'err')
    }
  }

  const ossParams: Record<string, any> = pageData.param_oss ?? {}
  const imgHost: string = pageData.upyun_host_img ?? IMG_HOST
  const ossHost: string = ossParams.host ?? OSS_HOST

  return (
    <Shell variant="two-col" title="Submit my skin" css={['skin_submit.css']}>
      <div className="g_title">Submit my skin</div>
      <div className="g_cont">
        <div id="option">
          <form id="basic" onSubmit={(e) => e.preventDefault()}>
            {!skinId && <div className="hint">Please fill the basic info first before uploading images and skin file</div>}
            <input id="skin_id" type="hidden" value={skinId} readOnly />
            <div className="row">
              <span className="g_round field">Skin name</span>
              <input id="skin_name" name="skin_name" className="g_round input-box" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="row">
              <span className="g_round field">Price</span>
              <input id="price" name="price" className="g_round input-box" value={price} placeholder="from 100 to 1000" onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="row">
              <span className="g_round field">Mode</span>
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
              <span className="g_round field">Platform</span>
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
              <span className="g_round field">Required</span>
              <input id="minv" name="minv" className="g_round input-box" value={minv} placeholder="minimum client version require" onChange={(e) => setMinv(e.target.value)} />
            </div>
            <div className="row">
              <span className="g_round field">Required highest</span>
              <input id="maxv" name="maxv" className="g_round input-box" value={maxv} placeholder="highest client version require" onChange={(e) => setMaxv(e.target.value)} />
            </div>
          </form>
          {skinId && (
            <>
              <div className="row">
                <span className="g_round field vtop">Cover</span>
                <div className="vtop value">
                  <div className="img-wrap" id="img_cover">
                    <img src={coverSrc || '/static/img/cover.png'} alt="" />
                  </div>
                  <div className="upload-wrap vtop">
                    <form id="form_cover" action={imgHost} method="post" encType="multipart/form-data" onSubmit={(e) => e.preventDefault()}>
                      <div className="upload-btn" id="upload_cover">
                        <div className="upload-icon"></div>
                        <div className="upload-text">Change cover</div>
                        <input type="file" name="file" id="file_cover" accept="image/jpeg, image/png" onChange={(e) => void onFile('cover', e)} />
                        <input name="policy" type="hidden" value={String(pageData.policy_cover ?? '')} readOnly />
                        <input name="signature" type="hidden" value={String(pageData.signature_cover ?? '')} readOnly />
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="row">
                <span className="g_round field vtop">Skin file</span>
                <div className="vtop value">
                  {skinLink && (
                    <span id="skin_uploaded_hint"><a href={skinLink}>Click here to download</a> , or upload a new skin to replace this</span>
                  )}
                  <div className="upload-wrap vtop">
                    <form id="form_skin" action={ossHost} method="post" encType="multipart/form-data" onSubmit={(e) => e.preventDefault()}>
                      <div className="upload-btn" id="upload_cover">
                        <div className="upload-icon"></div>
                        <div className="upload-text">Upload skin</div>
                        {Object.entries(ossParams).map(([k, v]) => (
                          <input name={k} type="hidden" value={String(v)} key={k} readOnly />
                        ))}
                        <input type="file" name="file" id="file_skin" accept=".msz,.msp" onChange={(e) => void onFile('skin', e)} />
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="row">
                <span className="g_round field vtop">Preview image</span>
                <div className="vtop value" id="preview_list">
                  {preview.map((img) => (
                    <div className="img-wrap" data-src={img} key={img}>
                      <img src={img} alt="" />
                      <div className="toolbar">
                        <span className="icon icon-delete" title="Remove this image" onClick={() => void onDeletePreview(img)}></span>
                      </div>
                    </div>
                  ))}
                  <div className="upload-wrap">
                    <form id="form_preview" action={imgHost} method="post" encType="multipart/form-data" onSubmit={(e) => e.preventDefault()}>
                      <div className="upload-btn" id="upload_preview">
                        <div className="upload-icon"></div>
                        <div className="upload-text">Upload image</div>
                        <input type="file" name="file" id="file_preview" accept="image/jpeg, image/png" onChange={(e) => void onFile('preview', e)} />
                        <input name="policy" type="hidden" value={String(pageData.policy_preview ?? '')} readOnly />
                        <input name="signature" type="hidden" value={String(pageData.signature_preview ?? '')} readOnly />
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div id="btn_bottom">
          <div className="g_btn btn" data-type="btn_save" onClick={() => void onSave()}>{skinId ? 'Save' : 'Next'}</div>
          {skinId && <div className="g_btn btn" data-type="btn_stable" onClick={() => void onStatus(2)}>Stable</div>}
          {skinId && <div className="g_btn btn" data-type="btn_beta" onClick={() => void onStatus(1)}>Beta</div>}
          <a href="#" className="btn" data-type="cancel" onClick={(e) => { e.preventDefault(); onCancel() }}>Cancel</a>
        </div>
      </div>
    </Shell>
  )
}
