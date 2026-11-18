/**
 * 逐码校验「立刻推广」的返回码映射、前置校验与多语文案。
 * 运行：node scripts/check_promote_codes.mjs（任意 cwd 均可）
 *
 * 后端权威来源：MaApi-go/internal/handler/community_chart.go:PromoteChart
 * 编码规则：MaApi-go/internal/util/enums.go  MakeCode(mod, err) = -(mod*1000 + err)
 */
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = new URL('../', import.meta.url)

const loadModule = async (relative) => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(relative, root))],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
  })
  const code = result.outputFiles[0].text
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}

const m = await loadModule('src/pages/wiki/promoteMessages.ts')
const { translations } = await loadModule('src/locales.ts')

let checked = 0
const check = (label, actual, expected) => {
  assert.equal(actual, expected, label)
  checked += 1
}

// 1. 后端常量与编码规则
check('ModCommunityChart', m.PROMOTE_MODULE, 2)
check('最短时长', m.PROMOTE_MIN_LENGTH, 60)

const ERR = {
  ErrNotFound: 2,
  ErrNotAllow: 4,
  ErrContent: 8,
  ErrGold: 9,
  ErrTimeLimit: 10,
}
const EXPECTED = {
  [-1000]: 'Session expired, please sign in again', // token 中间件鉴权失败
  [-1]: 'Promotion failed, please try again later', // 用户资料 / player_evt 读取失败
  [-2002]: 'Chart not found',
  [-2004]: 'Only the chart author can promote a non-Stable chart',
  [-2008]: 'The chart needs at least 60 seconds of length and a non-zero level',
  [-2009]: 'Not enough gold for promotion',
  [-2010]: 'Please wait 24 hours before promoting again',
}
for (const [name, err] of Object.entries(ERR)) {
  const code = -(m.PROMOTE_MODULE * 1000 + err)
  check(`${name} -> ${code}`, m.PROMOTE_ERROR_KEYS[code], EXPECTED[code])
}
check('token 中间件 -1000', m.PROMOTE_ERROR_KEYS[-1000], EXPECTED[-1000])
check('服务端异常 -1', m.PROMOTE_ERROR_KEYS[-1], EXPECTED[-1])
check('映射表条目数', Object.keys(m.PROMOTE_ERROR_KEYS).length, Object.keys(EXPECTED).length)

// 2. promoteErrorKey：成功 / 已知码 / 未知码 / 畸形响应
check('成功码 0', m.promoteErrorKey(0), undefined)
for (const code of Object.keys(EXPECTED)) {
  check(`返回 ${code}`, m.promoteErrorKey(Number(code)), EXPECTED[code])
}
check('未知负码', m.promoteErrorKey(-2999), m.PROMOTE_FALLBACK_KEY)
check('正数码', m.promoteErrorKey(1), m.PROMOTE_FALLBACK_KEY)
check('undefined', m.promoteErrorKey(undefined), m.PROMOTE_FALLBACK_KEY)
check('null', m.promoteErrorKey(null), m.PROMOTE_FALLBACK_KEY)
check('NaN', m.promoteErrorKey(Number.NaN), m.PROMOTE_FALLBACK_KEY)
check('非 JSON 字符串', m.promoteErrorKey('oops'), m.PROMOTE_FALLBACK_KEY)

// 3. version 里的 Lv.<n> 兜底（对齐 models.TempDataChart.ParseLevel 正则 lv\.(\d+)）
check('lv.12 小写', m.hasVersionLevel('Extra lv.12'), true)
check('LV.3 大写', m.hasVersionLevel('LV.3'), true)
check('Lv.0 后端抬成 1', m.hasVersionLevel('Lv.0'), true)
check('Lv 3 无点不算', m.hasVersionLevel('Lv 3'), false)
check('空版本名', m.hasVersionLevel(''), false)

// 4. 未保存改动判断（表单是字符串，接口原值是数字；缺失字段两边都是空串）
check('已保存：值一致', m.hasUnsavedPromoteMeta(
  { length: '120', level: '10', version: 'Extra' },
  { length: 120, level: 10, version: 'Extra' },
), false)
check('已保存：字段都缺失', m.hasUnsavedPromoteMeta(
  { length: '120', level: '', version: 'Extra' },
  { length: 120, version: 'Extra' },
), false)
check('改了 level 未保存', m.hasUnsavedPromoteMeta(
  { length: '120', level: '12', version: 'Extra' },
  { length: 120, level: 10, version: 'Extra' },
), true)
check('清空 length 未保存', m.hasUnsavedPromoteMeta(
  { length: '', level: '10', version: 'Extra' },
  { length: 120, level: 10, version: 'Extra' },
), true)
check('改了 version 未保存', m.hasUnsavedPromoteMeta(
  { length: '120', level: '10', version: 'New Lv.9' },
  { length: 120, level: 10, version: 'Extra' },
), true)

// 5. 点击前的本地预检
const pre = (length, level, version, hasUnsavedMeta = false) =>
  m.promotePrecheckKey({ length, level, version, hasUnsavedMeta })
check('未保存改动优先', pre(120, 10, 'Extra', true), 'Save the chart info before promoting')
check('时长 59 秒', pre(59, 10, 'Extra'), 'Chart length must be at least 60 seconds')
check('时长 0', pre(0, 10, 'Extra'), 'Chart length must be at least 60 seconds')
check('时长 NaN', pre(Number.NaN, 10, 'Extra'), 'Chart length must be at least 60 seconds')
check('等级为 0', pre(120, 0, 'Extra'), 'Please set a level before promoting')
check('等级为 0 但版本含 Lv.12', pre(120, 0, 'Extra Lv.12'), undefined)
check('时长 60 边界 + 等级 1', pre(60, 1, 'Extra'), undefined)
check('正常谱面', pre(180, 12, 'Extra'), undefined)

// 6. 所有会展示的文案 key 必须有简中/繁中/日翻译；en 允许缺（t() 回退到英文 key）
const keys = new Set([
  ...Object.values(m.PROMOTE_ERROR_KEYS),
  m.PROMOTE_FALLBACK_KEY,
  'Chart length must be at least 60 seconds',
  'Please set a level before promoting',
  'Save the chart info before promoting',
])
for (const lang of ['zh-hans', 'zh-hant', 'ja']) {
  for (const key of keys) {
    assert.ok(translations[lang]?.[key], `${lang} 缺少文案: ${key}`)
    checked += 1
  }
  assert.match(translations[lang]['Not enough gold for promotion'], /\{\{price\}\}/, `${lang} 缺少 {{price}} 插值`)
  checked += 1
}

console.log(`✓ promote 返回码/预检断言 ${checked} 条通过；文案 ${keys.size} 个 key × 3 语言齐全`)
