export const coverUrl = (cover?: string) => {
  if (!cover || cover.length === 0) return '//cni.mugzone.net/static/img/empty.jpg'
  return cover.startsWith('http') ? cover : `//cni.mugzone.net/${cover}`
}

const avatarFallbacks = [
  'https://cni.machart.top/static/img/avatar_0.jpg',
  'https://cni.machart.top/static/img/avatar_1.jpg',
  'https://cni.machart.top/static/img/avatar_2.jpg',
  'https://cni.machart.top/static/img/avatar_3.jpg',
  'https://cni.machart.top/static/img/avatar_4.jpg',
  'https://cni.machart.top/static/img/avatar_5.jpg',
]

export const avatarFallbackUrl = (seed?: string | number) => {
  if (seed === undefined || seed === null) return avatarFallbacks[0]
  const value = String(seed)
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % avatarFallbacks.length
  return avatarFallbacks[index]
}

export const avatarUrl = (avatar?: string, seed?: string | number) => {
  if (!avatar || avatar.length === 0) return avatarFallbackUrl(seed)
  if (avatar.startsWith('http')) return avatar
  if (avatar.startsWith('/')) return `//cni.machart.top${avatar}`
  return `//cni.machart.top/avatar/${avatar}!avatar64`
}

export const avatarUidUrl = (avatar?: number) => {
    return `//cni.machart.top/avatar/${avatar}!avatar64`
}

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
