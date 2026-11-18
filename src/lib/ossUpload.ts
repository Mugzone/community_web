export type UploadProgressHandler = (loaded: number, total: number) => void

/**
 * 用 XHR 把文件直传到 OSS PostObject。
 *
 * fetch 拿不到上传进度，只有 XMLHttpRequest.upload.onprogress 能报。
 * 不设置 Content-Type、不加任何自定义头，保持 CORS 简单请求，
 * 避免触发 OPTIONS 预检（OSS 已允许站点 origin 的 POST）。
 */
export const postFileToOSS = (
  host: string,
  fields: Record<string, string>,
  file: File,
  onProgress?: UploadProgressHandler,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const form = new FormData()
    Object.entries(fields).forEach(([name, value]) => form.append(name, value))
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', host)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded, event.total)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`upload failed: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('upload network error'))
    xhr.onabort = () => reject(new Error('upload aborted'))
    xhr.send(form)
  })
