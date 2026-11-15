import { getJson, postForm } from './api'

export type WebResp<T = any> = {
  code: number
  data?: T
  message?: string
  [key: string]: any
}

export type Params = Record<string, string | number | undefined>

export const get = <T = any>(path: string, params?: Params, auth = true): Promise<T> =>
  getJson<T>(path, { params, auth })

export const post = <T = any>(path: string, body?: Params, params?: Params, auth = true): Promise<T> =>
  postForm<T>(path, { body, params, auth })
