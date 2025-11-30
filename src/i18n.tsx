import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'en-US' | 'zh-CN' | 'ja'

type TranslationDict = Record<Locale, Record<string, string>>
type TranslateVars = Record<string, string | number>

const fallbackLocale: Locale = 'en-US'
const storageKey = 'malody.lang'
const supportedLocales: Locale[] = ['en-US', 'zh-CN', 'ja']

const translations: TranslationDict = {
  'en-US': {
    'nav.home': 'Home',
    'nav.charts': 'Charts',
    'nav.wiki': 'Wiki',
    'nav.events': 'Events',
    'nav.players': 'Players',
    'nav.talk': 'Talk',
    'topbar.signIn': 'Sign in',
    'topbar.signUp': 'Sign up',
    'topbar.signOut': 'Sign out',
    'topbar.hi': 'Hi, {{name}}',
    'banner.featured': 'Featured',
    'home.hero.title': 'Charts, rankings, community. Modernized.',
    'home.hero.desc':
      'A refreshed web experience for Malody with faster pages, cleaner layout, and room for new API-driven features. Browse charts, keep track of players, and join discussions from any device.',
    'home.hero.communityEyebrow': 'Community',
    'home.hero.cardTitle': 'Weekly show & new arrivals',
    'home.hero.cardDesc': 'Featuring curated charts every week. Submit yours and climb the rankings.',
    'home.hero.chip.multi': 'Multi-mode',
    'home.hero.chip.cross': 'Cross-platform',
    'home.hero.chip.creator': 'Creator friendly',
    'home.hero.cta.primary': 'Get Malody V',
    'home.hero.cta.secondary': 'Learn more',
    'home.section.news': 'News & Help',
    'home.section.newArrival': 'New Arrival',
    'home.section.weeklyShow': 'Weekly Show',
    'home.section.more': 'More →',
    'charts.eyebrow': 'Charts',
    'charts.title': 'Browse all charts',
    'charts.desc': 'Filter by mode, level, freestyle, or keyword.',
    'charts.filter.title': 'Filters',
    'charts.filter.keyword': 'Keyword',
    'charts.filter.keywordPlaceholder': 'Song, artist, tag...',
    'charts.filter.mode': 'Mode',
    'charts.filter.level': 'Level range',
    'charts.filter.levelMin': 'Min level',
    'charts.filter.levelMax': 'Max level',
    'charts.filter.free': 'Freestyle only',
    'charts.filter.beta': 'Include beta charts',
    'charts.filter.apply': 'Apply filters',
    'charts.filter.reset': 'Reset',
    'charts.mode.all': 'All modes',
    'charts.listTitle': 'Charts',
    'charts.results.count': 'Showing {{count}} charts',
    'charts.results.empty': 'No charts match your filters.',
    'charts.error.fetch': 'Unable to load charts right now',
    'charts.error.network': 'Network error, please try again',
    'charts.loading': 'Loading...',
    'charts.loadMore': 'Load more',
    'charts.card.length': 'Length {{value}}',
    'charts.card.lengthUnknown': 'Length —',
    'charts.card.bpm': '{{value}} BPM',
    'charts.card.bpmUnknown': 'BPM —',
    'charts.card.updated': 'Updated {{time}}',
    'charts.card.updatedUnknown': 'Updated —',
    'charts.card.view': 'View chart',
    'charts.badge.freestyle': 'Freestyle',
    'charts.badge.beta': 'Beta',
    'events.eyebrow': 'Events',
    'events.title': 'Community events',
    'events.desc': 'Join ongoing events or browse past challenges.',
    'events.filter.activeOnly': 'Show active only',
    'events.highlight.title': 'What to expect',
    'events.highlight.desc': 'Events feature curated charts and unique rules. Jump in and compete.',
    'events.listTitle': 'Event list',
    'events.results.count': 'Showing {{count}} events',
    'events.results.empty': 'No events yet.',
    'events.error.fetch': 'Unable to load events',
    'events.error.network': 'Network error, please try again',
    'events.loading': 'Loading...',
    'events.loadMore': 'Load more',
    'events.status.upcoming': 'Upcoming',
    'events.status.ongoing': 'Ongoing',
    'events.status.ended': 'Ended',
    'events.status.unknown': 'Scheduled',
    'events.time.unknown': 'TBD',
    'events.name.untitled': 'Untitled event',
    'home.empty.news': 'No news or help posts yet.',
    'home.empty.arrival': 'No new arrivals yet.',
    'home.empty.weekly': 'Weekly picks will appear here soon.',
    'home.stats.pages.label': 'Pages',
    'home.stats.pages.desc': 'Wiki, songs, charts, guides',
    'home.stats.songs.label': 'Songs',
    'home.stats.songs.desc': 'Multi-mode song entries',
    'home.stats.players.label': 'Players',
    'home.stats.players.desc': 'Across PC, mobile and web',
    'tag.news': 'News',
    'tag.update': 'Update',
    'tag.event': 'Event',
    'tag.guide': 'Guide',
    'tag.new': 'New',
    'tag.weekly': 'Weekly Pick',
    'footer.links': 'External links',
    'footer.copy': 'Copyright © 2013 ~ 2025 Mugzone',
    'footer.language': 'Language',
    'footer.languageHint': 'Switch language',
    'language.en-US': 'English',
    'language.zh-CN': '简体中文',
    'language.ja': '日本語',
    'auth.tab.signIn': 'Sign in',
    'auth.tab.signUp': 'Sign up',
    'auth.field.username': 'Username or email',
    'auth.field.email': 'Email',
    'auth.field.password': 'Password',
    'auth.placeholder.username': 'Your username',
    'auth.placeholder.email': 'you@example.com',
    'auth.placeholder.password': 'Your password',
    'auth.error.login': 'Sign in failed, please check your account or password',
    'auth.error.register': 'Sign up failed, please try again later',
    'auth.error.-1': 'Invalid params or validation failed',
    'auth.error.-2': 'Too many attempts or username exists',
    'auth.error.-3': 'Email exists or account/password incorrect',
    'auth.error.-4': 'Account banned',
    'auth.error.-5': 'Device or IP banned / invalid email',
    'auth.error.-6': 'Password not valid (needs 32-char MD5)',
    'auth.error.-7': 'Device banned',
    'auth.error.md5': 'Password must be a 32-character MD5 string',
    'auth.submit.signIn': 'Sign in',
    'auth.submit.signUp': 'Create account',
    'auth.submit.loading': 'Please wait...',
    'auth.close': 'Close',
    'rank.eyebrow': 'Players',
    'rank.title': 'Global Leaderboard',
    'rank.desc':
      'Experience and MM rankings by mode. Browse without login; sign in to save favorites later.',
    'rank.about.title': 'About',
    'rank.about.desc':
      'Data comes from `/ranking/global`. EXP ranks use mode experience; MM ranks use grade score. List is capped at 200 entries.',
    'rank.selectMode': 'Select mode',
    'rank.table.player': 'Player',
    'rank.table.score.mm': 'MM Score',
    'rank.table.score.exp': 'EXP',
    'rank.table.stats': 'Stats',
    'rank.table.empty': 'No data yet.',
    'rank.table.showing': 'Showing {{count}} players',
    'rank.table.loadMore': 'Load more',
    'rank.table.loading': 'Loading...',
    'rank.error.fetch': 'Unable to fetch leaderboard, please try again later',
    'rank.error.network': 'Unable to fetch leaderboard, please check your network and retry',
    'rank.meta.level': 'Lv. {{value}}',
    'rank.meta.play': 'Play {{value}}',
    'rank.meta.acc': 'Acc {{value}}',
    'rank.meta.combo': 'Combo {{value}}',
    'mode.key': 'Key',
    'mode.catch': 'Catch',
    'mode.taiko': 'Taiko',
    'mode.pad': 'Pad',
    'mode.ring': 'Ring',
    'mode.slide': 'Slide',
    'mode.live': 'Live',
    'mode.cube': 'Cube',
  },
  'zh-CN': {
    'nav.home': '首页',
    'nav.charts': '谱面',
    'nav.wiki': 'Wiki',
    'nav.events': '赛事',
    'nav.players': '玩家',
    'nav.talk': '讨论',
    'topbar.signIn': '登录',
    'topbar.signUp': '注册',
    'topbar.signOut': '退出',
    'topbar.hi': '你好，{{name}}',
    'banner.featured': '精选',
    'home.hero.title': '谱面、排行榜、社区，焕然一新。',
    'home.hero.desc':
      '为 Malody 打造的全新网页体验，更快的页面、更清爽的布局，并为新 API 功能预留空间。随时浏览谱面、关注玩家并参与讨论。',
    'home.hero.communityEyebrow': '社区',
    'home.hero.cardTitle': '每周精选与新到谱面',
    'home.hero.cardDesc': '每周更新策划推荐。提交你的作品登上榜单。',
    'home.hero.chip.multi': '多玩法',
    'home.hero.chip.cross': '全平台',
    'home.hero.chip.creator': '创作者友好',
    'home.hero.cta.primary': '下载 Malody V',
    'home.hero.cta.secondary': '了解更多',
    'home.section.news': '新闻与帮助',
    'home.section.newArrival': '新到谱面',
    'home.section.weeklyShow': '每周精选',
    'home.section.more': '更多 →',
    'charts.eyebrow': '谱面',
    'charts.title': '浏览全部谱面',
    'charts.desc': '按玩法、等级、Freestyle 或关键词筛选。',
    'charts.filter.title': '筛选',
    'charts.filter.keyword': '关键词',
    'charts.filter.keywordPlaceholder': '歌曲、作者、标签...',
    'charts.filter.mode': '玩法',
    'charts.filter.level': '等级范围',
    'charts.filter.levelMin': '最低等级',
    'charts.filter.levelMax': '最高等级',
    'charts.filter.free': '仅显示 Freestyle',
    'charts.filter.beta': '包含 beta 谱面',
    'charts.filter.apply': '应用筛选',
    'charts.filter.reset': '重置',
    'charts.mode.all': '全部玩法',
    'charts.listTitle': '谱面列表',
    'charts.results.count': '已显示 {{count}} 首',
    'charts.results.empty': '没有符合筛选的谱面',
    'charts.error.fetch': '暂时无法获取谱面',
    'charts.error.network': '网络错误，请稍后重试',
    'charts.loading': '加载中...',
    'charts.loadMore': '加载更多',
    'charts.card.length': '时长 {{value}}',
    'charts.card.lengthUnknown': '时长 —',
    'charts.card.bpm': '{{value}} BPM',
    'charts.card.bpmUnknown': 'BPM —',
    'charts.card.updated': '更新于 {{time}}',
    'charts.card.updatedUnknown': '更新于 —',
    'charts.card.view': '查看详情',
    'charts.badge.freestyle': 'Freestyle',
    'charts.badge.beta': 'Beta',
    'events.eyebrow': '赛事',
    'events.title': '社区赛事',
    'events.desc': '加入正在进行的活动或回顾往期挑战。',
    'events.filter.activeOnly': '仅显示进行中的赛事',
    'events.highlight.title': '赛事说明',
    'events.highlight.desc': '赛事包含策划推荐的谱面和专属规则，快来参与。',
    'events.listTitle': '赛事列表',
    'events.results.count': '共 {{count}} 个赛事',
    'events.results.empty': '暂无赛事',
    'events.error.fetch': '暂时无法获取赛事',
    'events.error.network': '网络错误，请稍后再试',
    'events.loading': '加载中...',
    'events.loadMore': '加载更多',
    'events.status.upcoming': '即将开始',
    'events.status.ongoing': '进行中',
    'events.status.ended': '已结束',
    'events.status.unknown': '待定',
    'events.time.unknown': '待定',
    'events.name.untitled': '未命名赛事',
    'home.empty.news': '暂无新闻或帮助内容',
    'home.empty.arrival': '暂无新到谱面',
    'home.empty.weekly': '每周精选暂未发布',
    'home.stats.pages.label': '页面',
    'home.stats.pages.desc': 'Wiki、歌曲、谱面、指南',
    'home.stats.songs.label': '歌曲',
    'home.stats.songs.desc': '多玩法歌曲条目',
    'home.stats.players.label': '玩家',
    'home.stats.players.desc': '覆盖 PC、移动端与 Web',
    'tag.news': '新闻',
    'tag.update': '更新',
    'tag.event': '活动',
    'tag.guide': '指南',
    'tag.new': '最新',
    'tag.weekly': '每周精选',
    'footer.links': '外部链接',
    'footer.copy': 'Copyright © 2013 ~ 2025 Mugzone',
    'footer.language': '语言',
    'footer.languageHint': '手动切换语言',
    'language.en-US': 'English',
    'language.zh-CN': '简体中文',
    'language.ja': '日本語',
    'auth.tab.signIn': '登录',
    'auth.tab.signUp': '注册',
    'auth.field.username': '用户名或邮箱',
    'auth.field.email': '邮箱',
    'auth.field.password': '密码',
    'auth.placeholder.username': '输入用户名',
    'auth.placeholder.email': 'you@example.com',
    'auth.placeholder.password': '输入密码',
    'auth.error.login': '登录失败，请检查账号或密码',
    'auth.error.register': '注册失败，请稍后再试',
    'auth.error.-1': '参数错误或校验失败',
    'auth.error.-2': '尝试次数过多或用户名已存在',
    'auth.error.-3': '邮箱已存在或账号密码错误',
    'auth.error.-4': '账号被封禁',
    'auth.error.-5': '设备或 IP 被封禁 / 邮箱不合法',
    'auth.error.-6': '密码不合法（需要32位MD5）',
    'auth.error.-7': '设备被封禁',
    'auth.error.md5': '密码需要生成 32 位 MD5',
    'auth.submit.signIn': '登录',
    'auth.submit.signUp': '创建账户',
    'auth.submit.loading': '请稍等...',
    'auth.close': '关闭',
    'rank.eyebrow': '玩家',
    'rank.title': '全球排行榜',
    'rank.desc': '按玩法查看 EXP 与 MM 榜单。无需登录即可浏览，登录后可收藏关注。',
    'rank.about.title': '说明',
    'rank.about.desc': '数据来自 `/ranking/global`。EXP 使用玩法经验，MM 使用评级得分，列表最多展示 200 名。',
    'rank.selectMode': '选择玩法',
    'rank.table.player': '玩家',
    'rank.table.score.mm': 'MM 分',
    'rank.table.score.exp': 'EXP',
    'rank.table.stats': '数据',
    'rank.table.empty': '暂无数据',
    'rank.table.showing': '已显示 {{count}} 位玩家',
    'rank.table.loadMore': '加载更多',
    'rank.table.loading': '加载中...',
    'rank.error.fetch': '无法获取排行榜，请稍后重试',
    'rank.error.network': '无法获取排行榜，请检查网络后重试',
    'rank.meta.level': '等级 {{value}}',
    'rank.meta.play': '游玩 {{value}}',
    'rank.meta.acc': '准确率 {{value}}',
    'rank.meta.combo': '连击 {{value}}',
    'mode.key': 'Key',
    'mode.catch': 'Catch',
    'mode.taiko': '太鼓',
    'mode.pad': 'Pad',
    'mode.ring': 'Ring',
    'mode.slide': 'Slide',
    'mode.live': 'Live',
    'mode.cube': 'Cube',
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.charts': '譜面',
    'nav.wiki': 'Wiki',
    'nav.events': 'イベント',
    'nav.players': 'プレイヤー',
    'nav.talk': 'トーク',
    'topbar.signIn': 'ログイン',
    'topbar.signUp': '新規登録',
    'topbar.signOut': 'ログアウト',
    'topbar.hi': 'こんにちは、{{name}}',
    'banner.featured': 'ピックアップ',
    'home.hero.title': '譜面・ランキング・コミュニティを新しく。',
    'home.hero.desc':
      'Malody のための新しいウェブ体験。より速いページとシンプルなレイアウトで、新しい API 機能にも対応。どのデバイスでも譜面を見たり、プレイヤーを追ったり、議論に参加できます。',
    'home.hero.communityEyebrow': 'コミュニティ',
    'home.hero.cardTitle': '毎週のおすすめと新着',
    'home.hero.cardDesc': '毎週キュレーションした譜面を紹介。あなたの作品でランキングを狙おう。',
    'home.hero.chip.multi': 'マルチモード',
    'home.hero.chip.cross': 'クロスプラットフォーム',
    'home.hero.chip.creator': 'クリエイターに優しい',
    'home.hero.cta.primary': 'Malody V を入手',
    'home.hero.cta.secondary': '詳しく見る',
    'home.section.news': 'ニュースとヘルプ',
    'home.section.newArrival': '新着',
    'home.section.weeklyShow': '毎週のピックアップ',
    'home.section.more': 'もっと見る →',
    'charts.eyebrow': '譜面',
    'charts.title': 'すべての譜面を閲覧',
    'charts.desc': 'モード、レベル、フリースタイル、キーワードで絞り込みできます。',
    'charts.filter.title': 'フィルター',
    'charts.filter.keyword': 'キーワード',
    'charts.filter.keywordPlaceholder': '曲名、作者、タグ...',
    'charts.filter.mode': 'モード',
    'charts.filter.level': 'レベル範囲',
    'charts.filter.levelMin': '最小レベル',
    'charts.filter.levelMax': '最大レベル',
    'charts.filter.free': 'フリースタイルのみ',
    'charts.filter.beta': 'ベータ譜面を含める',
    'charts.filter.apply': '適用',
    'charts.filter.reset': 'リセット',
    'charts.mode.all': 'すべてのモード',
    'charts.listTitle': '譜面一覧',
    'charts.results.count': '{{count}} 曲を表示中',
    'charts.results.empty': '条件に合う譜面がありません',
    'charts.error.fetch': '譜面を取得できません',
    'charts.error.network': 'ネットワークエラーです。再試行してください',
    'charts.loading': '読み込み中...',
    'charts.loadMore': 'さらに読み込む',
    'charts.card.length': '長さ {{value}}',
    'charts.card.lengthUnknown': '長さ —',
    'charts.card.bpm': '{{value}} BPM',
    'charts.card.bpmUnknown': 'BPM —',
    'charts.card.updated': '{{time}} に更新',
    'charts.card.updatedUnknown': '更新日 —',
    'charts.card.view': '詳細を見る',
    'charts.badge.freestyle': 'フリースタイル',
    'charts.badge.beta': 'ベータ',
    'events.eyebrow': 'イベント',
    'events.title': 'コミュニティイベント',
    'events.desc': '開催中のイベントに参加したり、過去の挑戦を振り返ろう。',
    'events.filter.activeOnly': '開催中のみ表示',
    'events.highlight.title': 'イベント概要',
    'events.highlight.desc': 'イベントではキュレーションされた譜面と独自ルールを用意。ぜひ参加してください。',
    'events.listTitle': 'イベント一覧',
    'events.results.count': '{{count}} 件を表示中',
    'events.results.empty': 'イベントがありません',
    'events.error.fetch': 'イベントを取得できません',
    'events.error.network': 'ネットワークエラーです。再試行してください',
    'events.loading': '読み込み中...',
    'events.loadMore': 'さらに読み込む',
    'events.status.upcoming': 'まもなく開始',
    'events.status.ongoing': '開催中',
    'events.status.ended': '終了',
    'events.status.unknown': '予定',
    'events.time.unknown': '未定',
    'events.name.untitled': 'イベント名未定',
    'home.empty.news': 'ニュースやヘルプはまだありません',
    'home.empty.arrival': '新着譜面はまだありません',
    'home.empty.weekly': '毎週のおすすめは準備中です',
    'home.stats.pages.label': 'ページ',
    'home.stats.pages.desc': 'Wiki・楽曲・譜面・ガイド',
    'home.stats.songs.label': '楽曲',
    'home.stats.songs.desc': '複数モードの楽曲エントリー',
    'home.stats.players.label': 'プレイヤー',
    'home.stats.players.desc': 'PC・モバイル・Web に対応',
    'tag.news': 'ニュース',
    'tag.update': 'アップデート',
    'tag.event': 'イベント',
    'tag.guide': 'ガイド',
    'tag.new': '新着',
    'tag.weekly': '毎週のおすすめ',
    'footer.links': '外部リンク',
    'footer.copy': 'Copyright © 2013 ~ 2025 Mugzone',
    'footer.language': '言語',
    'footer.languageHint': '言語を変更',
    'language.en-US': 'English',
    'language.zh-CN': '简体中文',
    'language.ja': '日本語',
    'auth.tab.signIn': 'ログイン',
    'auth.tab.signUp': '登録',
    'auth.field.username': 'ユーザー名またはメール',
    'auth.field.email': 'メール',
    'auth.field.password': 'パスワード',
    'auth.placeholder.username': 'ユーザー名を入力',
    'auth.placeholder.email': 'you@example.com',
    'auth.placeholder.password': 'パスワードを入力',
    'auth.error.login': 'ログインに失敗しました。アカウントかパスワードを確認してください',
    'auth.error.register': '登録に失敗しました。時間をおいて再試行してください',
    'auth.error.-1': 'パラメーターエラーまたは検証に失敗しました',
    'auth.error.-2': '試行回数が多すぎるか、ユーザー名が存在します',
    'auth.error.-3': 'メールが存在するか、アカウント/パスワードが間違っています',
    'auth.error.-4': 'アカウントが凍結されています',
    'auth.error.-5': 'デバイスまたは IP がブロックされています / メールが無効です',
    'auth.error.-6': 'パスワードが無効です（32 文字の MD5 が必要）',
    'auth.error.-7': 'デバイスがブロックされています',
    'auth.error.md5': 'パスワードは 32 文字の MD5 を入力してください',
    'auth.submit.signIn': 'ログイン',
    'auth.submit.signUp': 'アカウントを作成',
    'auth.submit.loading': '少々お待ちください...',
    'auth.close': '閉じる',
    'rank.eyebrow': 'プレイヤー',
    'rank.title': 'グローバルランキング',
    'rank.desc':
      'モード別の EXP・MM ランキング。ログインなしでも閲覧でき、ログイン後はお気に入り保存が可能です。',
    'rank.about.title': '概要',
    'rank.about.desc':
      'データは `/ranking/global` から取得。EXP はモード経験値、MM はグレードスコアを使用し、リストは最大 200 件です。',
    'rank.selectMode': 'モードを選択',
    'rank.table.player': 'プレイヤー',
    'rank.table.score.mm': 'MM スコア',
    'rank.table.score.exp': 'EXP',
    'rank.table.stats': 'ステータス',
    'rank.table.empty': 'データがありません',
    'rank.table.showing': '{{count}} 人を表示中',
    'rank.table.loadMore': 'さらに読み込む',
    'rank.table.loading': '読み込み中...',
    'rank.error.fetch': 'ランキングを取得できません。時間をおいて再試行してください',
    'rank.error.network': 'ランキングを取得できません。ネットワークを確認して再試行してください',
    'rank.meta.level': 'Lv. {{value}}',
    'rank.meta.play': 'プレイ {{value}}',
    'rank.meta.acc': 'Acc {{value}}',
    'rank.meta.combo': 'コンボ {{value}}',
    'mode.key': 'Key',
    'mode.catch': 'Catch',
    'mode.taiko': '太鼓',
    'mode.pad': 'Pad',
    'mode.ring': 'Ring',
    'mode.slide': 'Slide',
    'mode.live': 'Live',
    'mode.cube': 'Cube',
  },
}

const normalizeLocale = (lang?: string | null): Locale | undefined => {
  if (!lang) return undefined
  const lower = lang.toLowerCase()
  if (lower.startsWith('zh')) return 'zh-CN'
  if (lower.startsWith('ja')) return 'ja'
  if (lower.startsWith('en')) return 'en-US'
  return undefined
}

const detectLocale = (): Locale => {
  if (typeof window === 'undefined') return fallbackLocale
  try {
    const stored = localStorage.getItem(storageKey)
    const storedLocale = normalizeLocale(stored)
    if (storedLocale) return storedLocale
  } catch {
    // ignore storage errors
  }

  const langs = Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages : []
  const checks = [...langs, navigator.language]
  for (const item of checks) {
    const detected = normalizeLocale(item)
    if (detected) return detected
  }
  return fallbackLocale
}

const formatMessage = (template: string, vars?: TranslateVars) => {
  if (!vars) return template
  let output = template
  Object.entries(vars).forEach(([key, value]) => {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  })
  return output
}

type I18nContextValue = {
  lang: Locale
  setLang: (locale: Locale) => void
  t: (key: string, vars?: TranslateVars) => string
  locales: Locale[]
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>(() => detectLocale())

  useEffect(() => {
    try {
      document.documentElement.lang = lang
      localStorage.setItem(storageKey, lang)
    } catch {
      // ignore
    }
  }, [lang])

  const setLang = (locale: Locale) => {
    setLangState(locale)
    try {
      localStorage.setItem(storageKey, locale)
    } catch {
      // ignore
    }
  }

  const t = useMemo(() => {
    return (key: string, vars?: TranslateVars) => {
      const template = translations[lang]?.[key] ?? translations[fallbackLocale][key] ?? key
      return formatMessage(template, vars)
    }
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      locales: supportedLocales,
    }),
    [lang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}
