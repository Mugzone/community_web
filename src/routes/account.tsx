import type { RouteDef } from './types'
import { Logout } from './internal'
import AuthPage from '../pages/account/AuthPage'
import UserPage from '../pages/account/UserPage'
import ProfileSetting from '../pages/account/ProfileSetting'
import FriendList from '../pages/account/FriendList'
import Limit from '../pages/account/Limit'
import Invite from '../pages/account/Invite'
import Publish from '../pages/account/Publish'
import Activate from '../pages/account/Activate'
import AchievePage from '../pages/account/AchievePage'
import UploadCover from '../pages/upload/UploadCover'
import UploadInternal from '../pages/upload/UploadInternal'
import UploadBanner from '../pages/upload/UploadBanner'
import UploadAvatar from '../pages/upload/UploadAvatar'

export const accountRoutes: RouteDef[] = [
  { path: '/accounts/login', component: AuthPage },
  { path: '/accounts/register', component: AuthPage },
  { path: '/accounts/forget', component: AuthPage },
  { path: '/accounts/change_email', component: AuthPage },
  { path: '/accounts/password_reset/:reset', component: AuthPage },
  { path: '/accounts/password_reset/*', component: AuthPage },
  { path: '/accounts/activate/:key', component: Activate },
  { path: '/accounts/confirm_email/:key', component: Activate },
  { path: '/accounts/logout', component: Logout },
  { path: '/accounts/friend', component: FriendList },
  { path: '/accounts/config/profile', component: ProfileSetting },
  { path: '/accounts/user/:id', component: UserPage },
  { path: '/accounts/user/achieve/:uid', component: AchievePage },
  { path: '/accounts/limit', component: Limit },
  { path: '/accounts/invite', component: Invite },
  { path: '/accounts/publish', component: Publish },
]

export const uploadRoutes: RouteDef[] = [
  { path: '/upload/cover', component: UploadCover },
  { path: '/upload/internal', component: UploadInternal },
  { path: '/upload/banner', component: UploadBanner },
  { path: '/upload/avatar', component: UploadAvatar },
]
