import { useEffect, useState } from 'react'
import { Shell } from '../../components/Layout'
import { useLoad } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchIntroData } from '../../network/legacy'

/** homepage.views.intro —— WebConfig(type=0) 的 key/value */
type IntroState = {
  version_win_emiria?: string | number
  version_ios_emiria?: string | number
  version_and_emiria?: string | number
  [key: string]: any
}

const EMPTY_INTRO: IntroState = {}

const unwrap = (res: any): IntroState => {
  if (!res || typeof res !== 'object') return {}
  const d = (res as any).data
  const raw = d !== undefined && d !== null ? d : res
  return (raw && typeof raw === 'object' ? raw : {}) as IntroState
}

/** module/intro/src/init.js —— #banner / #banner2 两个独立轮播 */
function IntroSlider({ id, images }: { id: string; images: string[] }) {
  const [curr, setCurr] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const timer = window.setInterval(() => {
      setCurr((v) => (v + 1) % images.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [images.length])

  return (
    <div id={id} className="list_wrap">
      <ul style={{ transform: `translateX(-${curr * 100}%)`, transition: 'transform 0.4s ease' }}>
        {images.map((src, i) => (
          <li key={i}><img src={src} /></li>
        ))}
      </ul>
      <div className="dot">
        {images.map((_, i) => (
          <i
            key={i}
            className={i === curr ? 'curr' : ''}
            onClick={() => setCurr(i)}
          ></i>
        ))}
      </div>
    </div>
  )
}

const BANNER_IMGS = [
  staticUrl('img/home/banner-0.jpg'),
  staticUrl('img/home/banner-1.jpg'),
  staticUrl('img/home/banner-2.jpg'),
]
const SKIN_IMGS = [
  staticUrl('img/home/skin-1.jpg'),
  staticUrl('img/home/skin-2.jpg'),
  staticUrl('img/home/skin-4.jpg'),
  staticUrl('img/home/skin-5.jpg'),
  staticUrl('img/home/skin-6.jpg'),
]

export default function Intro() {
  const { data } = useLoad<IntroState>(
    async () => unwrap(await fetchIntroData()),
    [],
    EMPTY_INTRO,
  )

  return (
    <Shell variant="simple" css={['intro.css']}>
      {/* 抵消 Shell simple 骨架自动引入的 simple.css（body 居中 / min-height） */}
      <style>{`body { text-align: left; min-height: 0; }`}</style>
      <div id="top">
        <div id="top_body">
          <img src={staticUrl('img/icon-64.png')} />
          <span className="title">Malody</span>

          <a href="http://facebook.com/MalodyHome" target="_blank"><img src={staticUrl('img/home/icon-fa.png')} /></a>
          <a href="https://discord.gg/unk9hgF" target="_blank"><img style={{ marginTop: 3 }} src={staticUrl('img/home/icon-dis.png')} /></a>
          <a href="http://weibo.com/u/5351167572" target="_blank"><img src={staticUrl('img/home/icon-t.png')} /></a>
        </div>
      </div>
      <div id="head">
        <img src={staticUrl('img/home/banner.png')} id="bg" />
        <img src={staticUrl('img/home/tachie.png')} id="ma" />

        <div id="head_body">
          <p className="line" style={{ width: 100 }}></p>
          <h2>Dance with</h2>
          <h1>Malody</h1>
          <h3>Full featured cross-platform music game community</h3>
          <p className="line" style={{ width: 330 }}></p>

          <div id="download">
            <span>PC/MAC<i>v{data.version_win_emiria ?? ''}</i></span>
            <span>iOS<i>v{data.version_ios_emiria ?? ''}</i></span>
            <span>Android<i>v{data.version_and_emiria ?? ''}</i></span>
          </div>
          <div id="downbg">
            <a href="https://store.steampowered.com/app/1512940/Malody_V/" target="_blank">Steam</a>
            <a href="https://apps.apple.com/us/app/malody-v/id1566873256" target="_blank">App Store</a>
            <a href="https://play.google.com/store/apps/details?id=me.mugzone.emiria&pli=1" target="_blank">Google Play</a>
          </div>
        </div>
      </div>
      <div id="body">
        <div id="part1" className="part">
          <IntroSlider id="banner" images={BANNER_IMGS} />
          <div className="intro">
            <h2>WHAT IS</h2>
            <h1>Malody</h1>
            <p>Malody is a music(or rhythm) game community, consists of a cross-platform game client, with a full-featured chart editor and also an online player ranking system. Malody provides a variety of customizable features, such as user interface, language option and so on. The game is developed by a group of dedicated volunteers and the charts are created by players from all around the world.</p>
            <a href={URLS.index} className="btn">Enter community</a>
          </div>
        </div>
        <div id="part2" className="part">
          <div className="intro">
            <h2>Feature I</h2>
            <h1>Rich game modes</h1>
            <p><span>Key</span>Press corresponding keys while falling notes reach the judge line</p>
            <p><span>Catch</span>Move catcher to catch the notes descending</p>
            <p><span>Pad</span>Hit the panel while notes glows</p>
            <p><span>Taiko</span>The original Taiko as the name</p>
            <p><span>Ring</span>Enjoy music with thumbs</p>
            <p><span>Slide</span>Slide, hold and more</p>
          </div>
          <img src={staticUrl('img/home/mode.png')} />
        </div>
        <div id="part4" className="part">
          <IntroSlider id="banner2" images={SKIN_IMGS} />
          <div className="intro">
            <h2>Feature II</h2>
            <h1>Customizable</h1>
            <p><span>Flexible</span>Ability to change every elements in playfield</p>
            <p><span>Performance</span>High performance skin engine</p>
          </div>
        </div>
        <div id="part3" className="part">
          <img src={staticUrl('img/home/banner-edit.jpg')} />
          <div className="intro">
            <h2>Feature III</h2>
            <h1>full-featured ingame editor</h1>
            <p><span>Efficient</span>Visualized editing and browsing are implemented to minimize unnecessary works</p>
            <p><span>Powerful</span>Multiple game-play modes editing support that is satisfied for all the preferences</p>
            <p><span>Convenient</span>Onekey uploading and sharing within the community</p>
          </div>
        </div>
        <div id="part5" className="part">
          <img src={staticUrl('img/home/banner-mp.jpg')} />
          <div className="intro">
            <h2>Feature IV</h2>
            <h1>Multiplayer</h1>
            <p><span>Fun</span>Play with any mod and any mode with 8 players together</p>
            <p><span>Fair</span>Use the same judgement on all platforms and devices</p>
          </div>
        </div>
      </div>
      <div id="foot">
        Copyright &copy; 2013-2026 Mugzone
      </div>
    </Shell>
  )
}
