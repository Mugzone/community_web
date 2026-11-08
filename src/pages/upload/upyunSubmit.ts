import type { FormEvent } from 'react'
import { showNotify } from '../../lib/legacy'
import { fetchUploadSign } from '../../network/legacy'

/* ------------------------------------------------------------------ *
 * 老站 upload/*.html 的表单是原生 POST 到又拍云：
 *   <form action="http://v0.api.upyun.com/ma-img" method="post"
 *         enctype="multipart/form-data">
 *     <input type="file" name="file"/>
 *     <input name="policy" type="hidden" value="{{ policy }}"/>
 *     <input name="signature" type="hidden" value="{{ signature }}"/>
 * 服务端渲染好 policy/signature，浏览器直接带文件提交，成功后由 policy 里的
 * return-url 跳回站内。
 *
 * v3 早期在 onSubmit 里 preventDefault() 后只调了 /upload/sign，
 * 既没把返回值写回隐藏域也没提交表单，文件从未发出。这里补全这段链路：
 * 取新鲜签名 → 填隐藏域 → 用后端下发的 host → form.submit() 原生提交。
 * 不用 fetch/XHR 是因为又拍云表单接口不保证 CORS 响应头，原生表单提交
 * 才能可靠地把 multipart 发到跨域桶。
 * ------------------------------------------------------------------ */

type SignParams = Record<string, string | number | undefined>
type Rec = Record<string, any>

export type UpyunSubmitOptions = {
  form: HTMLFormElement | null
  file: File | null
  signParams: SignParams
  defaultHost: string
}

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

export const submitUpyunForm = async (options: UpyunSubmitOptions): Promise<void> => {
  const { form, file, signParams, defaultHost } = options
  if (!file) {
    showNotify('Please select a file', 'err')
    return
  }
  if (!form) return
  try {
    const resp = (await fetchUploadSign(signParams)) as Rec
    const data: Rec = resp?.data && typeof resp.data === 'object' && !Array.isArray(resp.data)
      ? (resp.data as Rec)
      : (resp ?? {})
    const policy = String(data.policy ?? '')
    const signature = String(data.signature ?? '')
    if (!policy || !signature) throw new Error('missing upyun signature')
    setHidden(form, 'policy', policy)
    setHidden(form, 'signature', signature)
    form.action = String(data.host || defaultHost)
    // 原生提交：不触发 onSubmit，浏览器会以 multipart/form-data 把 file 发出去
    form.submit()
  } catch {
    showNotify('Upload failed', 'err')
  }
}

/** 4 个上传页共用的 onSubmit：先阻止 React 默认行为，再走真实上传 */
export const onUpyunSubmit = (
  event: FormEvent<HTMLFormElement>,
  options: UpyunSubmitOptions,
): void => {
  event.preventDefault()
  void submitUpyunForm(options)
}
