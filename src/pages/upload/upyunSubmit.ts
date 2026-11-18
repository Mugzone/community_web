import type { FormEvent } from 'react'
import { showNotify } from '../../lib/notify'
import { fetchUploadSign } from '../../network/pageContent'
import { finishImageUpload } from '../../network/api'
import { postFileToOSS } from '../../lib/ossUpload'
import type { AnyRec as Rec } from '../../utils/data'


type SignParams = Record<string, string | number | undefined>

export type UpyunSubmitOptions = {
  form: HTMLFormElement | null
  file: File | null
  signParams: SignParams
  defaultHost: string
  // 上传进度百分比；结束时回传 null 让页面清除进度条。
  onProgress?: (percent: number | null) => void
}

// OSS PostObject 只接受这些表单字段，多塞 host / expire 之类会被判为 Extra field。
const OSS_FORM_FIELDS = ['policy', 'signature', 'key', 'OSSAccessKeyId', 'success_action_status']

const payloadOf = (resp: Rec): Rec =>
  resp?.data && typeof resp.data === 'object' && !Array.isArray(resp.data)
    ? (resp.data as Rec)
    : (resp ?? {})

const setHidden = (form: HTMLFormElement, name: string, value: string) => {
  const el = form.elements.namedItem(name)
  if (el instanceof HTMLInputElement) {
    el.value = value
    return
  }
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = name
  input.value = value
  form.appendChild(input)
}

// 图片新上传：ali OSS ma-img 桶的 PostObject 直传 + 主动确认落库。
// key 由服务端下发（不带前导斜杠），/upload/finish 会补成 /avatar/<uid> 等前缀。
const uploadToOSS = async (
  data: Rec,
  file: File,
  key: string,
  defaultHost: string,
  onProgress?: (percent: number | null) => void,
) => {
  const meta: Rec = data.meta && typeof data.meta === 'object' && !Array.isArray(data.meta)
    ? (data.meta as Rec)
    : {}
  const fields: Record<string, string> = {}
  for (const name of OSS_FORM_FIELDS) {
    const value = meta[name] ?? data[name]
    if (value === undefined || value === null || value === '') {
      throw new Error(`missing OSS field: ${name}`)
    }
    fields[name] = String(value)
  }
  await postFileToOSS(String(data.host || defaultHost), fields, file, (loaded, total) => {
    onProgress?.(total > 0 ? Math.round((loaded / total) * 100) : 0)
  })
  const finish = await finishImageUpload({ path: key })
  if (finish.code !== 0) throw new Error('upload finish failed')
}

export const submitUpyunForm = async (options: UpyunSubmitOptions): Promise<void> => {
  const { form, file, signParams, defaultHost, onProgress } = options
  if (!file) {
    showNotify('Please select a file', 'err')
    return
  }
  if (!form) return
  try {
    const data = payloadOf((await fetchUploadSign(signParams)) as Rec)
    const key = String(data.key ?? data?.meta?.key ?? '')
    if (key) {
      await uploadToOSS(data, file, key, defaultHost, onProgress)
      showNotify('Upload succeeded', 'succ')
      window.setTimeout(() => window.location.reload(), 600)
      return
    }
    // ma-static 静态文件桶保留又拍云：签名响应无 key，走原生表单直传
    // （跨域表单不保证 CORS 响应头），成功后由 policy 的 return-url 跳回。
    const policy = String(data.policy ?? '')
    const signature = String(data.signature ?? '')
    if (!policy || !signature) throw new Error('missing upyun signature')
    setHidden(form, 'policy', policy)
    setHidden(form, 'signature', signature)
    form.action = String(data.host || defaultHost)
    form.submit()
  } catch {
    showNotify('Upload failed', 'err')
  } finally {
    onProgress?.(null)
  }
}

export const onUpyunSubmit = (
  event: FormEvent<HTMLFormElement>,
  options: UpyunSubmitOptions,
): void => {
  event.preventDefault()
  void submitUpyunForm(options)
}
