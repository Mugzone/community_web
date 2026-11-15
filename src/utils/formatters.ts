export const coverUrl = (cover?: string): string => {
  if (!cover || cover.length === 0) return '//cni.mugzone.net/static/img/empty.jpg'
  if (cover.startsWith('http') || cover.startsWith('//')) return cover
  return `//cni.mugzone.net${cover.startsWith('/') ? '' : '/'}${cover}`
}

export const avatarFallbackUrl = (_seed?: string | number) => '/static/img/avatar.png'

const avatarSizeSuffix = (size: number) =>
  size <= 64 ? '!avatar64' : size <= 128 ? '!avatar128' : '!avatar'

const withAvatarSuffix = (url: string, size: number): string => {
  if (/!avatar(64|128)?(\?|$)/.test(url)) return url
  const suffix = avatarSizeSuffix(size)
  const pos = url.indexOf('?time=')
  return pos === -1 ? url + suffix : url.slice(0, pos) + suffix + url.slice(pos)
}

export const avatarUrl = (avatar?: string, seed?: string | number, size = 64) => {
  if (!avatar || avatar.length === 0) return avatarFallbackUrl(seed)
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
