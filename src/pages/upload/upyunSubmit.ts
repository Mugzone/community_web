import type { FormEvent } from 'react'
import { showNotify } from '../../lib/notify'
import { fetchUploadSign } from '../../network/pageContent'
import type { AnyRec as Rec } from '../../utils/data'


type SignParams = Record<string, string | number | undefined>

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
    form.submit()
  } catch {
    showNotify('Upload failed', 'err')
  }
}

export const onUpyunSubmit = (
  event: FormEvent<HTMLFormElement>,
  options: UpyunSubmitOptions,
): void => {
  event.preventDefault()
  void submitUpyunForm(options)
}
