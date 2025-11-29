export const coverUrl = (cover?: string) => {
  if (!cover || cover.length === 0) return '//cni.mugzone.net/static/img/empty.jpg'
  return cover.startsWith('http') ? cover : `//cni.mugzone.net/${cover}`
}

export const avatarUrl = (avatar?: string) => {
  if (!avatar || avatar.length === 0) return '//cni.machart.top/static/img/avatar/default.jpg'
  return avatar.startsWith('http') ? avatar : `//cni.machart.top/avatar/${avatar}!avatar64`
}

export const modeLabel = (mode?: number) => {
  if (mode === undefined || mode === null) return 'Mode'
  const map: Record<number, string> = {
    0: 'Key',
    3: 'Catch',
    4: 'Pad',
    5: 'Taiko',
    6: 'Ring',
    7: 'Slide',
    8: 'Live',
    9: 'Cube',
  }
  return map[mode] ?? `Mode ${mode}`
}
