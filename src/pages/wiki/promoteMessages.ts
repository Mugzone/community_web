/**
 * /api/community/chart/promote 的返回码与前端前置校验。
 *
 * 后端：MaApi-go/internal/handler/community_chart.go:PromoteChart
 * 编码：util.MakeCode(mod, err) = -(mod * 1000 + err)，ModCommunityChart = 2
 *   0      成功
 *  -1      读取用户资料 / player_evt 失败
 *  -1000   token 中间件鉴权失败（internal/middleware/token.go）
 *  -2002   ErrNotFound   谱面不存在
 *  -2004   ErrNotAllow   非作者，或谱面已是 Stable
 *  -2008   ErrContent    length < 60 或 LevelNumber() == 0（后端合并为一个码）
 *  -2009   ErrGold       金币不足（mode 0 需 12000，其它 mode 需 6000）
 *  -2010   ErrTimeLimit  上次推广未满 24*3600 秒
 *
 * 老站 Django 把 -2008 拆成 -5（时长）/-7（等级），另有 -6（缺封面）；
 * C# 旧 API 与 Go 实现同为 -2008。老站文案写 "48 hours"，后端实际是 24 小时，
 * 这里按后端代码口径。文案 key 的翻译由 scripts/build_locales.py 生成。
 */

export const PROMOTE_MIN_LENGTH = 60
export const PROMOTE_MODULE = 2

export const PROMOTE_ERROR_KEYS: Readonly<Record<number, string>> = {
  [-1000]: 'Session expired, please sign in again',
  [-1]: 'Promotion failed, please try again later',
  [-2002]: 'Chart not found',
  [-2004]: 'Only the chart author can promote a non-Stable chart',
  [-2008]: 'The chart needs at least 60 seconds of length and a non-zero level',
  [-2009]: 'Not enough gold for promotion',
  [-2010]: 'Please wait 24 hours before promoting again',
}

export const PROMOTE_FALLBACK_KEY = 'Promotion failed, please try again later'

/** 返回 undefined 表示成功；其余返回要展示的 i18n 文案 key。 */
export const promoteErrorKey = (code: unknown): string | undefined => {
  if (code === 0) return undefined
  if (typeof code === 'number' && Number.isFinite(code)) {
    return PROMOTE_ERROR_KEYS[code] ?? PROMOTE_FALLBACK_KEY
  }
  // 非 JSON 响应 / 缺少 code / 未知码统一当失败处理
  return PROMOTE_FALLBACK_KEY
}

/** 与后端 LevelNumber() 的兜底一致：level 为 0 时 version 里的 Lv.<n> 仍算有等级。 */
export const hasVersionLevel = (version: string): boolean => /lv\.\d+/i.test(version ?? '')

/** 表单值与接口下发的原值不一致时，说明影响推广条件的改动还没保存。 */
export const hasUnsavedPromoteMeta = (
  form: Record<string, unknown>,
  info: Record<string, unknown>,
): boolean =>
  ['length', 'level', 'version'].some((k) => String(form[k] ?? '') !== String(info[k] ?? ''))

export type PromotePrecheck = {
  length: number
  level: number
  version: string
  /** 表单里的 length/level/version 与接口下发的原值不一致（改动尚未保存） */
  hasUnsavedMeta: boolean
}

/**
 * 点击"立刻推广"前的本地预检，条件与 PromoteChart 一致。
 * 返回 undefined 才发起请求；服务端仍是最终裁决。
 */
export const promotePrecheckKey = (input: PromotePrecheck): string | undefined => {
  // 推广只读数据库，不读表单；先保存才能让新填的时长/等级生效
  if (input.hasUnsavedMeta) return 'Save the chart info before promoting'
  if (!Number.isFinite(input.length) || input.length < PROMOTE_MIN_LENGTH) {
    return 'Chart length must be at least 60 seconds'
  }
  if (!Number.isFinite(input.level) || (input.level <= 0 && !hasVersionLevel(input.version))) {
    return 'Please set a level before promoting'
  }
  return undefined
}
