export type BannerItem = {
  title: string
  description: string
  link: string
  image: string
}

export type StatItem = {
  label: string
  value: string
  desc: string
}

export type MapItem = {
  title: string
  artist: string
  mode: string
  cover: string
  link: string
  highlight?: string
  tags?: string[]
}

export type NewsItem = {
  title: string
  link: string
  tag?: string
  desc?: string
  time?: number
}
