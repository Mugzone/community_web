import type { ChangeEvent } from 'react'
import { fetchUploadPage } from '../../network/pageContent'
import type { Params } from '../../network/pageBase'
import { payloadOf, type Rec } from '../../utils/response'

// 图片新上传走 ali OSS 的 ma-img 桶（与 ma-chart / ma-skin 同在 oss-cn-shanghai）。
// 后台已同步又拍云历史对象并配置 !avatar64 / !small / !skin512 图片样式，
// 展示侧 CDN 域名与 formatters.ts 保持不变。
export const IMG_HOST = 'https://ma-img.oss-cn-shanghai.aliyuncs.com'
// ma-static 静态文件桶保留在又拍云，不迁移。
export const STATIC_HOST = 'http://v0.api.upyun.com/ma-static'

export type UploadTarget = { id?: number | string }
export type UploadSong = { id?: number | string; cover?: string; cover_url?: string }

export const EMPTY_UPLOAD: Rec = {}

export const loadUploadPage = (type: string, params?: Params): Promise<Rec> =>
  fetchUploadPage(type, params).then(payloadOf)

export const signFieldsOf = (data: Rec) => ({
  policy: String(data.policy ?? ''),
  signature: String(data.signature ?? ''),
})

export const firstFileOf = (e: ChangeEvent<HTMLInputElement>): File | null => e.target.files?.[0] ?? null

export const fileChangeHandler = (setFile: (file: File | null) => void) =>
  (e: ChangeEvent<HTMLInputElement>) => {
    const file = firstFileOf(e)
    if (file) setFile(file)
  }
