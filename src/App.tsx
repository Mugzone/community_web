import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useSession } from './components/SessionProvider'

import Index from './pages/home/Index'
import Intro from './pages/home/Intro'
import Error403 from './pages/errors/Error403'
import Error404 from './pages/errors/Error404'
import Error500 from './pages/errors/Error500'
import DDoS from './pages/errors/DDoS'
import Abandoned, { LegacyRedirect } from './pages/errors/Abandoned'

import TalkUser from './pages/talk/TalkUser'
import Notify from './pages/talk/Notify'
import UserMsg from './pages/talk/UserMsg'
import ChartTalk from './pages/talk/ChartTalk'

import WikiPage from './pages/wiki/WikiPage'
import SongPage from './pages/wiki/SongPage'
import ChartPage from './pages/wiki/ChartPage'
import WikiEdit from './pages/wiki/WikiEdit'
import WikiMeta from './pages/wiki/WikiMeta'
import WikiCreate from './pages/wiki/WikiCreate'
import WikiSearch from './pages/wiki/WikiSearch'
import WikiCate from './pages/wiki/WikiCate'
import AllPage from './pages/wiki/AllPage'
import AllChart from './pages/wiki/AllChart'
import AllPlayer from './pages/wiki/AllPlayer'
import AllCate from './pages/wiki/AllCate'
import AllQuest from './pages/wiki/AllQuest'
import AllDaily from './pages/wiki/AllDaily'
import WikiLatest from './pages/wiki/WikiLatest'
import WikiChange from './pages/wiki/WikiChange'
import TmplPage from './pages/wiki/TmplPage'
import TmplEdit from './pages/wiki/TmplEdit'
import UserpageEdit from './pages/wiki/UserpageEdit'
import ChartDownload from './pages/wiki/ChartDownload'
import SpecialList from './pages/wiki/SpecialList'
import Visit from './pages/wiki/Visit'

import AuthPage from './pages/account/AuthPage'
import UserPage from './pages/account/UserPage'
import ProfileSetting from './pages/account/ProfileSetting'
import FriendList from './pages/account/FriendList'
import Limit from './pages/account/Limit'
import Invite from './pages/account/Invite'
import Publish from './pages/account/Publish'
import Activate from './pages/account/Activate'

import ScorePage from './pages/score/ScorePage'
import EventPage from './pages/score/EventPage'
import EventRank from './pages/score/EventRank'

import StoreAll from './pages/store/StoreAll'
import MyItems from './pages/store/MyItems'
import SkinList from './pages/store/SkinList'
import SkinEntry from './pages/store/SkinEntry'
import SkinDetail from './pages/store/SkinDetail'
import Promotion from './pages/store/Promotion'
import SubmitAll from './pages/store/SubmitAll'

import UploadCover from './pages/upload/UploadCover'
import UploadInternal from './pages/upload/UploadInternal'
import UploadBanner from './pages/upload/UploadBanner'
import UploadAvatar from './pages/upload/UploadAvatar'

/** 老站 /page/<id> 只是 302 到 /wiki/<id>，保持 URL 与跳转行为 */
function PageRedirect() {
  const { pageId } = useParams()
  return <Navigate to={`/wiki/${pageId ?? ''}`} replace />
}

/** 老站 /accounts/logout 清 session 后回 /index */
function Logout() {
  const { signOut } = useSession()
  signOut()
  return <Navigate to="/index" replace />
}

export default function App() {
  return (
    <Routes>
      {/* 首页组 */}
      <Route path="/" element={<Intro />} />
      <Route path="/index" element={<Index />} />

      {/* wiki 组（根路由） */}
      <Route path="/wiki/:id" element={<WikiPage />} />
      <Route path="/visit/:key" element={<Visit />} />
      <Route path="/song/:id" element={<SongPage />} />
      <Route path="/chart/:id" element={<ChartPage />} />
      <Route path="/wiki/edit" element={<WikiEdit />} />
      <Route path="/wiki/meta" element={<WikiMeta />} />

      {/* wiki 组（/page 路由） */}
      <Route path="/page/search" element={<WikiSearch />} />
      <Route path="/page/create" element={<WikiCreate />} />
      <Route path="/page/userpage/edit/:id" element={<UserpageEdit />} />
      <Route path="/page/change" element={<WikiChange />} />
      <Route path="/page/cate/:id" element={<WikiCate />} />
      <Route path="/page/latest" element={<WikiLatest />} />
      <Route path="/page/all/chart" element={<AllChart />} />
      <Route path="/page/all/player" element={<AllPlayer />} />
      <Route path="/page/all/cate" element={<AllCate />} />
      <Route path="/page/all/quest" element={<AllQuest />} />
      <Route path="/page/all/daily" element={<AllDaily />} />
      <Route path="/page/all" element={<AllPage />} />
      <Route path="/page/special/:name" element={<SpecialList />} />
      <Route path="/page/tmpl/edit" element={<TmplEdit />} />
      <Route path="/page/tmpl/:name" element={<TmplPage />} />
      <Route path="/page/download/:id" element={<ChartDownload />} />
      <Route path="/page/:pageId" element={<PageRedirect />} />

      {/* 用户组 */}
      <Route path="/accounts/login" element={<AuthPage />} />
      <Route path="/accounts/register" element={<AuthPage />} />
      <Route path="/accounts/forget" element={<AuthPage />} />
      <Route path="/accounts/change_email" element={<AuthPage />} />
      <Route path="/accounts/password_reset/:reset" element={<AuthPage />} />
      <Route path="/accounts/password_reset/*" element={<AuthPage />} />
      <Route path="/accounts/activate/:key" element={<Activate />} />
      <Route path="/accounts/confirm_email/:key" element={<Activate />} />
      <Route path="/accounts/logout" element={<Logout />} />
      <Route path="/accounts/friend" element={<FriendList />} />
      <Route path="/accounts/config/profile" element={<ProfileSetting />} />
      <Route path="/accounts/user/:id" element={<UserPage />} />
      <Route path="/accounts/limit" element={<Limit />} />
      <Route path="/accounts/invite" element={<Invite />} />
      <Route path="/accounts/publish" element={<Publish />} />

      {/* 讨论 / 私信组 */}
      <Route path="/talk/user" element={<TalkUser />} />
      <Route path="/talk/user/notify" element={<Notify />} />
      <Route path="/talk/user/:host/:guest" element={<UserMsg />} />
      <Route path="/talk/chart" element={<ChartTalk />} />

      {/* 成绩组 */}
      <Route path="/score/event/:id" element={<EventPage />} />
      <Route path="/score/event_rank/:id" element={<EventRank />} />
      <Route path="/score/:chartId" element={<ScorePage />} />

      {/* 商店 / 皮肤 / 投稿组 */}
      <Route path="/store/all" element={<StoreAll />} />
      <Route path="/store/my" element={<MyItems />} />
      <Route path="/store/skin" element={<SkinList />} />
      <Route path="/store/skin/entry" element={<SkinEntry />} />
      <Route path="/store/skin/detail/:sid" element={<SkinDetail />} />
      <Route path="/store/promotion" element={<Promotion />} />
      <Route path="/submit/all" element={<SubmitAll />} />

      {/* 上传组 */}
      <Route path="/upload/cover" element={<UploadCover />} />
      <Route path="/upload/internal" element={<UploadInternal />} />
      <Route path="/upload/banner" element={<UploadBanner />} />
      <Route path="/upload/avatar" element={<UploadAvatar />} />

      {/* 错误页 */}
      <Route path="/403" element={<Error403 />} />
      <Route path="/404" element={<Error404 />} />
      <Route path="/500" element={<Error500 />} />
      <Route path="/ddos" element={<DDoS />} />

      {/* 废弃页面：功能不做，URL 保持且给出一致降级 */}
      {/* /wiki/get_lang 为老站 AJAX 端点，显式兜底避免被 /wiki/:id 吞掉渲染 WikiPage */}
      <Route path="/wiki/get_lang" element={<Abandoned />} />
      <Route path="/store/*" element={<Abandoned />} />
      <Route path="/talk/group" element={<LegacyRedirect />} />
      <Route path="/talk/group/:id" element={<Abandoned />} />
      <Route path="/talk/topic/:id" element={<Abandoned />} />
      <Route path="/talk/create" element={<Abandoned />} />
      <Route path="/accounts/config" element={<Abandoned />} />
      <Route path="/page/create_charts" element={<Abandoned />} />
      <Route path="/store/skin/detail" element={<Abandoned />} />
      <Route path="/captcha/*" element={<Abandoned />} />
      <Route path="/plugin/*" element={<Abandoned />} />
      <Route path="/cgi/*" element={<Abandoned />} />
      <Route path="/lolicon/*" element={<Abandoned />} />
      <Route path="/sistercon/*" element={<Abandoned />} />
      <Route path="/i18n/*" element={<Abandoned />} />
      <Route path="/git-update/" element={<Abandoned />} />
      <Route path="/git-docker/" element={<Abandoned />} />
      <Route path="/upload/*" element={<Abandoned />} />
      <Route path="/accounts/*" element={<Abandoned />} />
      <Route path="/page/*" element={<Abandoned />} />

      <Route path="*" element={<Error404 />} />
    </Routes>
  )
}
