/**
 * 老站 CSS 的构建时入口（第一轮重构 + 第二轮 colocation）。
 *
 * 第一轮：CSS 从 public/static/css/ 迁入 src/styles/legacy/，用 ?inline 变成
 * 构建时静态依赖，由 Shell 渲染声明式 <style>，取代运行时 createElement('link')
 * + 引用计数 + link.disabled 的老做法。
 *
 * 第二轮：只被单个页面使用的 9 个样式表已移到各自页面目录下
 * （如 pages/home/Index.css），由页面组件用标准 `import './Index.css'` 引入，
 * 并加 html[data-page="..."] 作用域前缀，因此能被打包进全局样式表而不串页。
 * 这里只保留多页面共享、必须按页注入的样式，避免未共现文件之间的同名选择器
 * （#content / .clear / .justfix 等）在全量加载时互相覆盖。
 *
 * Shell 的 page prop 会把页面标识写到 <html data-page="...">，
 * 供已 colocation 的作用域样式使用。
 */
import mainCss from './main.css?inline'
import simpleCss from './simple.css?inline'
import akariCss from './akari.css?inline'
import boardCss from './board.css?inline'
import chartlistCss from './chartlist.css?inline'
import profileCss from './profile.css?inline'
import scoreCss from './score.css?inline'
import storeCss from './store.css?inline'
import tmplCss from './tmpl.css?inline'
import uploadCss from './upload.css?inline'
import userCss from './user.css?inline'
import wikiCss from './wiki.css?inline'
import wikiEditCss from './wiki_edit.css?inline'

/** 常规页面都需要的全局基础样式（老站 base.html / base_width.html 的 main.css） */
export const LEGACY_GLOBAL_CSS = mainCss

/** simple 变体对应老站 base_simple.html，不加载 main.css，改加载 simple.css */
export const LEGACY_SIMPLE_CSS = simpleCss

/** 多页面共享的页面级样式，key 与 Shell 的 css prop 保持一致 */
export const LEGACY_PAGE_CSS: Record<string, string> = {
  'akari.css': akariCss,
  'board.css': boardCss,
  'chartlist.css': chartlistCss,
  'profile.css': profileCss,
  'score.css': scoreCss,
  'store.css': storeCss,
  'tmpl.css': tmplCss,
  'upload.css': uploadCss,
  'user.css': userCss,
  'wiki.css': wikiCss,
  'wiki_edit.css': wikiEditCss,
}
