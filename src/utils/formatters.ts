/**
 * 老站 wikipage/models.py:258 TempDataSong.cover_url：
 * 数据库里存的是 "/cover/472.jpg!small"，拼接规则是 域名 + cover（cover 自带前导 /），
 * 不能写成 `${domain}/${cover}`，否则出现双斜杠；更不能把短路径直接当 URL 用。
 * 用协议相对域名避免 HTTPS 页面下的 mixed content。
 */
export const coverUrl = (cover?: string): string => {
  if (!cover || cover.length === 0) return '//cni.mugzone.net/static/img/empty.jpg'
  if (cover.startsWith('http') || cover.startsWith('//')) return cover
  return `//cni.mugzone.net${cover.startsWith('/') ? '' : '/'}${cover}`
}

/** 老站 avatar_tags.py：avatarUrl 为空时回落到本地默认头像（不是随机 CDN 图） */
export const avatarFallbackUrl = (_seed?: string | number) => '/static/img/avatar.png'

/** 老站 account/templatetags/avatar_tags.py：<=64 用 !avatar64，<=128 用 !avatar128，否则 !avatar */
const avatarSizeSuffix = (size: number) =>
  size <= 64 ? '!avatar64' : size <= 128 ? '!avatar128' : '!avatar'

/** 缩略图后缀要落在 ?time= 之前；已经带后缀的 URL 不重复追加 */
const withAvatarSuffix = (url: string, size: number): string => {
  if (/!avatar(64|128)?(\?|$)/.test(url)) return url
  const suffix = avatarSizeSuffix(size)
  const pos = url.indexOf('?time=')
  return pos === -1 ? url + suffix : url.slice(0, pos) + suffix + url.slice(pos)
}

/** size 默认 64，与老站小头像一致；个人页大头像传 150 */
export const avatarUrl = (avatar?: string, seed?: string | number, size = 64) => {
  if (!avatar || avatar.length === 0) return avatarFallbackUrl(seed)
  // 完整外链原样返回（老站 avatarUrl 字段只存文件名，这里仅作防御，不追加 CDN 后缀）
  if (avatar.startsWith('http')) return avatar
  const base = avatar.startsWith('/')
    ? `//cdn1.machart.top${avatar}`
    : `//cdn1.machart.top/avatar/${avatar}`
  return withAvatarSuffix(base, size)
}

export const avatarUidUrl = (avatar?: number, size = 64) =>
  withAvatarSuffix(`//cdn1.machart.top/avatar/${avatar}`, size)

const modeMap: Record<number, string> = {
  0: 'Key',
  3: 'Catch',
  4: 'Pad',
  5: 'Taiko',
  6: 'Ring',
  7: 'Slide',
  8: 'Live',
  9: 'Cube',
}

export const modeLabel = (mode?: number) => {
  if (mode === undefined || mode === null) return 'Mode'
  return modeMap[mode] ?? `Mode ${mode}`
}

export const modeLabelsFromMask = (mask?: number) => {
  if (mask === undefined || mask === null) return []
  const labels: string[] = []
  Object.entries(modeMap).forEach(([modeStr, label]) => {
    const mode = Number(modeStr)
    const bit = 1 << mode
    if ((mask & bit) !== 0) {
      labels.push(label)
    }
  })
  return labels
}

export const chartTypeBadge = (type?: number) => {
  if (type === 0) return { label: 'Alpha', className: 'pill type-alpha' }
  if (type === 1) return { label: 'Beta', className: 'pill type-beta' }
  if (type === 2) return { label: 'Stable', className: 'pill type-stable' }
  return undefined
}
