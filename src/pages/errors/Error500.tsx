import { Shell, DefaultSidebar } from '../../components/Layout'
import { staticUrl, URLS } from '../../lib/urls'

/** 500.html —— 独立整页模板，自带简化 header / sidebar / footer */
export default function Error500() {
  return (
    <Shell variant="simple" css={['akari.css']}>
      <header id="header">
        <div className="center">
          <span><img src={staticUrl('img/icon-64.png')} /><a href={URLS.index}>Malody</a></span>
        </div>
      </header>
      <div id="center">
        <div id="content">
          <div className="g_title">Wow, such a page, so empty, very bad</div>
          <div className="g_cont p404">
            <img src={staticUrl('img/500.png')} />
          </div>
        </div>
        <div id="sidebar">
          <DefaultSidebar />
        </div>
        <span className="clear"></span>
      </div>
      <footer id="footer">
        <span>Copyright © 2013 ~ 2014 Mugzone</span>
      </footer>
    </Shell>
  )
}
