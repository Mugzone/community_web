export const coverUrl = (cover?: string) => {
  if (!cover || cover.length === 0) return '//cni.mugzone.net/static/img/empty.jpg'
  return cover.startsWith('http') ? cover : `//cni.mugzone.net/${cover}`
}

export const modeLabel = (mode?: number) => {
  if (mode === undefined || mode === null) return 'Mode'
  const map: Record<number, string> = {
    0: 'Key',
    1: 'Step',
    2: 'Taiko',
    3: 'Catch',
    4: 'Pad',
    5: 'Live',
  }
  return map[mode] ?? `Mode ${mode}`
}
