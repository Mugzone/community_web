import { fetchEventCoverUpload, finishImageUpload } from '../../network/api'

export type EventCoverUploadResult = { code: number; cover?: string }

export const uploadEventCover = async (eid: number, file: File): Promise<EventCoverUploadResult> => {
  const sign = await fetchEventCoverUpload({ eid, type: 1 })
  if (sign.code !== 0 || !sign.url || !sign.meta) return { code: sign.code !== 0 ? sign.code : -1 }

  const formData = new FormData()
  Object.entries(sign.meta).forEach(([key, value]) => formData.append(key, value))
  formData.append('file', file)
  const res = await fetch(sign.url, { method: 'POST', body: formData })
  if (!res.ok) return { code: -2 }

  // ali OSS 的 policy 没有 save-key，path 直接取服务端下发的 key。
  // 仍保留又拍云 policy 解码作为旧响应的兼容分支。
  let saveKey = String(sign.meta.key ?? '')
  if (!saveKey && sign.meta.policy) {
    try {
      saveKey = (JSON.parse(atob(sign.meta.policy)) as { 'save-key'?: string })['save-key'] ?? ''
    } catch {
      saveKey = ''
    }
  }
  if (!saveKey) return { code: -1 }

  const finish = await finishImageUpload({ path: saveKey })
  if (finish.code !== 0) return { code: finish.code }
  return { code: 0, cover: saveKey }
}
