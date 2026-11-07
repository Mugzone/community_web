import { useEffect, useState } from 'react'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, JustifyRow } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchHomeData } from '../../network/legacy'
import { fetchBasicInfo } from '../../network/api'
import { t as i18nT } from '../../i18n'
import { coverUrl } from '../../utils/formatters'
import { skeletonCardNodes } from '../../components/Skeleton'

/* 老站 index.html 的数据结构（homepage.views.index） */
type Banner = { img?: string; image?: string; url?: string; link?: string }
type News = { title?: string; desc?: string; link?: string }
type MapSong = {
  id?: number | string
  cover?: string
  cover_url?: string
  title?: string
  title_org?: string
  artist?: string
}
type MapCard = {
  id?: number | string
  song?: MapSong
  mode?: number | string
  display_version?: string
  version?: string
  hotcount?: number | string
  type?: number
  title?: string
}
type HomeState = {
  banner: Banner[]
  info: { pages?: string | number; songs?: string | number; players?: string | number }
  news: News[]
  keyword: News[]
  newMap: MapCard[]
  hotMap: MapCard[]
  newMapBlank: unknown[]
  hotMapBlank: unknown[]
}

const EMPTY_HOME: HomeState = {
  banner: [],
  info: {},
  news: [],
  keyword: [],
  newMap: [],
  hotMap: [],
  newMapBlank: [],
  hotMapBlank: [],
}

const unwrap = (res: any): any => {
  if (!res || typeof res !== 'object') return {}
  const data = (res as any).data
  return data !== undefined && data !== null ? data : res
}

const normalize = (homeRes: any, basicRes: any): HomeState => {
  const h: any = unwrap(homeRes) || {}
  const b: any = basicRes || {}

  const banner: Banner[] = asArray<any>(h.banner).map((it: any) => ({
    img: it?.img ?? it?.image ?? it?.url,
    link: it?.link ?? URLS.index,
  }))
  if (banner.length === 0 && Array.isArray(b.banner)) {
    b.banner.forEach((img: string) => banner.push({ img, link: URLS.index }))
  }

  const news: News[] = asArray<any>(h.news ?? h.newsList).map((it: any) => ({
    title: it?.title ?? it?.desc ?? '',
    link: it?.link ?? '#',
  }))
  if (news.length === 0 && Array.isArray(b.news)) {
    b.news.forEach((it: any) => news.push({
      title: it?.title ?? it?.desc ?? '',
      link: it?.link ?? '#',
    }))
  }

  return {
    banner,
    info: (h.info ?? {}) as HomeState['info'],
    news,
    keyword: asArray<News>(h.keyword),
    newMap: asArray<MapCard>(h.newMap),
    hotMap: asArray<MapCard>(h.hotMap),
    newMapBlank: asArray<unknown>(h.newMapBlank),
    hotMapBlank: asArray<unknown>(h.hotMapBlank),
  }
}

/** widget/map.html —— song=True 走歌曲页，否则走谱面页；run 时显示 hotcount */
function MapCardView({ map, song, run }: { map: MapCard; song?: boolean; run?: boolean }) {
  const s: MapSong = map?.song ?? {}
  const href = song ? URLS.song(s.id ?? 0) : URLS.chartPage(map.id ?? 0)
  const title = s.title ?? s.title_org ?? map.title ?? ''
  return (
    <div className="g_map">
      <a className="link" href={href}>
        {s.cover ? (
          <div className="cover g_cover" style={{ backgroundImage: `url(${coverUrl(s.cover_url ?? s.cover)})` }}></div>
        ) : (
          <div className="cover"></div>
        )}
        <img className="mode" src={staticUrl(`img/mode/mode-${map.mode ?? 0}.png`)} />
        <div className="meta">
          <p className="title textfix">{title}</p>
          <p className="version textfix">{map.display_version ?? map.version ?? ''}</p>
        </div>
        {run ? <div className="num">{map.hotcount ?? ''}</div> : null}
      </a>
    </div>
  )
}

/** module/home/src/init.js —— 6 秒自动轮播 + 圆点跳转，curr 高亮 */
function BannerSlider({ items }: { items: Banner[] }) {
  const [curr, setCurr] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const timer = window.setInterval(() => {
      setCurr((v) => (v + 1) % items.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [items.length])

  if (items.length === 0) return null
  return (
    <div id="banner" className="list_wrap">
      <ul style={{ transform: `translateX(-${curr * 100}%)`, transition: 'transform 0.4s ease' }}>
        {items.map((item, i) => (
          <li key={i}>
            <a href={item.link ?? '#'} style={{ backgroundImage: `url(${item.img ?? item.image ?? ''})` }}></a>
          </li>
        ))}
      </ul>
      {items.length > 1 ? (
        <div className="dot">
          {items.map((_, i) => (
            <i
              key={i}
              className={i === curr ? 'curr' : ''}
              onClick={() => setCurr(i)}
            ></i>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FooterExtra() {
  return (
    <div className="line top">
      <span>{i18nT('External link')}</span>
      <a href="https://discord.gg/unk9hgF" target="_blank">Discord</a>
      <i></i>
      <a href="https://www.facebook.com/MalodyHome" target="_blank">Facebook</a>
      <i></i>
      <a href="http://weibo.com/u/5351167572" target="_blank">Sina</a>
    </div>
  )
}

export default function Index() {
  const { data, loading } = useLoad<HomeState>(
    async () => {
      const [home, basic] = await Promise.all([
        fetchHomeData().catch(() => ({ code: -1 })),
        fetchBasicInfo().catch(() => ({ code: -1 })),
      ])
      return normalize(home, basic)
    },
    [],
    EMPTY_HOME,
  )

  return (
    <Shell variant="two-col" css={['home.css']} contCls="gb_index" footerExtra={<FooterExtra />}>
      <BannerSlider items={data.banner} />

      <div id="top">
        <div className="g_rblock" id="top_left">
          <p>{i18nT('index_intro')}<a href={URLS.wikiLearnMore}>Learn more&gt;&gt;</a></p>
        </div>
        <div className="g_rblock" id="top_right">
          <div className="item">
            <a href={URLS.allPage}>{data.info.pages ?? ''}</a><span>{i18nT('Pages')}</span>
          </div>
          <div className="item">
            <a href={`${URLS.chart}?type=3`}>{data.info.songs ?? ''}</a><span>{i18nT('Songs')}</span>
          </div>
          <div className="item">
            <a href={URLS.player}>{data.info.players ?? ''}</a><span>{i18nT('Players')}</span>
          </div>
          <div className="item justfix"></div>
        </div>
        <span className="clear"></span>
      </div>

      <div className="g_rblock" id="news">
        <p className="label">News</p>
        {data.news.map((item, i) => (
          <a key={`n${i}`} href={item.link ?? '#'}>News:{item.title ?? ''}</a>
        ))}
        {data.keyword.map((item, i) => (
          <a key={`k${i}`} href={item.link ?? '#'}>Help:{item.title ?? ''}</a>
        ))}
      </div>

      <div id="newMap" className="g_rblock">
        <p className="label">New Arrival <a href={`${URLS.chart}?type=2`} className="more">{i18nT('More')}</a></p>
        <JustifyRow>
          {/* 加载中用卡片骨架占位，避免整块空白（老站服务端直出无此态） */}
          {loading && skeletonCardNodes(5)}
          {!loading && data.newMap.map((map, i) => (
            <MapCardView key={`nm${i}`} map={map} song />
          ))}
          {!loading && data.newMapBlank.map((_, i) => (
            <div className="g_map justfyHold" key={`nmb${i}`}></div>
          ))}
          <span className="justfix"></span>
        </JustifyRow>

        <p className="label">{i18nT('Weekly Show')}</p>
        <JustifyRow>
          {loading && skeletonCardNodes(5)}
          {!loading && data.hotMap.map((map, i) => (
            <MapCardView key={`hm${i}`} map={map} run />
          ))}
          {!loading && data.hotMapBlank.map((_, i) => (
            <div className="g_map justfyHold" key={`hmb${i}`}></div>
          ))}
          <span className="justfix"></span>
        </JustifyRow>
      </div>

      <span className="clear"></span>
    </Shell>
  )
}
