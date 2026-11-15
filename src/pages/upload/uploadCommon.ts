import type { ChangeEvent } from 'react'
import { fetchUploadPage } from '../../network/pageContent'
import { payloadOf, type Rec } from '../../utils/response'

export const IMG_HOST = 'http://v0.api.upyun.com/ma-img'
export const STATIC_HOST = 'http://v0.api.upyun.com/ma-static'

export type UploadTarget = { id?: number | string }
export type UploadSong = { id?: number | string; cover?: string; cover_url?: string }

export const EMPTY_UPLOAD: Rec = {}

export const loadUploadPage = (type: string): Promise<Rec> => fetchUploadPage(type).then(payloadOf)

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
