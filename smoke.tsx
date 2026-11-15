const g = globalThis as any
g.window = {
  location: { pathname: '/index', origin: 'http://localhost:5173', href: 'http://localhost:5173/index' },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  setTimeout, clearTimeout, innerHeight: 800,
}
g.localStorage = {
  _d: {} as Record<string, string>,
  getItem(k: string) { return this._d[k] ?? null },
  setItem(k: string, v: string) { this._d[k] = v },
  removeItem(k: string) { delete this._d[k] },
}
g.document = {
  title: '',
  head: { appendChild() {} },
  querySelector() { return null },
  createElement() { return { setAttribute() {}, rel: '', type: '', href: '' } },
}
g.fetch = async () => ({ ok: true, status: 200, json: async () => ({ code: 0, data: {} }), text: async () => '' })

const ROUTES = [
  '/', '/index',
  '/wiki/729', '/song/100', '/chart/100', '/wiki/edit', '/wiki/meta',
  '/page/search?keyword=test', '/page/create', '/page/userpage/edit/1', '/page/change',
  '/page/cate/1', '/page/latest', '/page/all/chart', '/page/all/player', '/page/all/cate',
  '/page/all/quest', '/page/all/daily', '/page/all', '/page/special/cate',
  '/page/tmpl/user', '/page/tmpl/edit', '/page/download/100', '/visit/stable',
  '/accounts/login', '/accounts/register', '/accounts/forget', '/accounts/change_email',
  '/accounts/password_reset/abc-token', '/accounts/user/1', '/accounts/user/achieve/1', '/accounts/config/profile',
  '/accounts/friend', '/accounts/limit', '/accounts/invite', '/accounts/publish',
  '/accounts/activate/key', '/accounts/confirm_email/key',
  '/talk/user', '/talk/user/notify', '/talk/user/1/2', '/talk/chart?cid=100',
  '/score/100', '/score/event', '/score/event?eid=1', '/score/event/edit',
  '/score/event/edit?eid=1', '/score/event/1', '/score/event_rank/1',
  '/store/all', '/store/my', '/store/skin', '/store/skin/entry', '/store/skin/detail/1',
  '/submit/all',
  '/upload/cover', '/upload/internal', '/upload/banner', '/upload/avatar',
  '/emiri/command', '/emiri/skinhash', '/lolicon/home',
  '/403', '/404', '/500', '/ddos',
  '/talk/group', '/talk/group/1', '/talk/topic/1', '/accounts/config',
]

async function main() {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  const App = (await import('./src/App')).default
  const { SessionProvider } = await import('./src/components/SessionProvider')

  let failed = 0
  for (const route of ROUTES) {
    try {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, { initialEntries: [route] },
          React.createElement(SessionProvider, null, React.createElement(App))),
      )
      const pureRedirect = route.startsWith('/visit/')
      if (!pureRedirect && (!html || html.length < 40)) throw new Error('empty render output')
      console.log('OK  ', route, html.length)
    } catch (e) {
      failed++
      console.log('FAIL', route, e instanceof Error ? e.message : String(e))
    }
  }
  console.log(`\n${ROUTES.length - failed}/${ROUTES.length} routes rendered`)
  if (failed) process.exitCode = 1
}

main()
