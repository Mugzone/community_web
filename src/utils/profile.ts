export type RegionMeta = {
  labelKey: string
  fallback: string
}

export const regionMap: Record<number, RegionMeta> = {
  0: { labelKey: 'player.region.unknown', fallback: '???' },
  1: { labelKey: 'player.region.1', fallback: 'Asia' },
  2: { labelKey: 'player.region.2', fallback: 'Africa' },
  3: { labelKey: 'player.region.3', fallback: 'North America' },
  4: { labelKey: 'player.region.4', fallback: 'South America' },
  5: { labelKey: 'player.region.5', fallback: 'Europe' },
  6: { labelKey: 'player.region.6', fallback: 'Australia' },
  7: { labelKey: 'player.region.7', fallback: 'Japan' },
  8: { labelKey: 'player.region.8', fallback: 'China' },
  9: { labelKey: 'player.region.9', fallback: 'United States' },
  10: { labelKey: 'player.region.10', fallback: 'Taiwan' },
  11: { labelKey: 'player.region.11', fallback: 'Korea' },
  12: { labelKey: 'player.region.12', fallback: 'Germany' },
  13: { labelKey: 'player.region.13', fallback: 'Russian Federation' },
  14: { labelKey: 'player.region.14', fallback: 'Poland' },
  15: { labelKey: 'player.region.15', fallback: 'France' },
  16: { labelKey: 'player.region.16', fallback: 'Hong Kong' },
  17: { labelKey: 'player.region.17', fallback: 'Canada' },
  18: { labelKey: 'player.region.18', fallback: 'Chile' },
  19: { labelKey: 'player.region.19', fallback: 'Indonesia' },
  20: { labelKey: 'player.region.20', fallback: 'Brazil' },
  21: { labelKey: 'player.region.21', fallback: 'Thailand' },
  22: { labelKey: 'player.region.22', fallback: 'Italy' },
  23: { labelKey: 'player.region.23', fallback: 'United Kingdom' },
  24: { labelKey: 'player.region.24', fallback: 'Argentina' },
  25: { labelKey: 'player.region.25', fallback: 'Philippines' },
  26: { labelKey: 'player.region.26', fallback: 'Finland' },
  27: { labelKey: 'player.region.27', fallback: 'Netherlands' },
  28: { labelKey: 'player.region.28', fallback: 'Malaysia' },
  29: { labelKey: 'player.region.29', fallback: 'Spain' },
  30: { labelKey: 'player.region.30', fallback: 'Mexico' },
  31: { labelKey: 'player.region.31', fallback: 'Sweden' },
  32: { labelKey: 'player.region.32', fallback: 'Singapore' },
  33: { labelKey: 'player.region.33', fallback: 'New Zealand' },
  34: { labelKey: 'player.region.34', fallback: 'Vietnam' },
  35: { labelKey: 'player.region.35', fallback: 'Belgium' },
  36: { labelKey: 'player.region.36', fallback: 'Switzerland' },
  37: { labelKey: 'player.region.37', fallback: 'Austria' },
  38: { labelKey: 'player.region.38', fallback: 'Bulgaria' },
  39: { labelKey: 'player.region.39', fallback: 'Macau' },
}

/**
 * 老站 account/views.py:user_page：
 *   ma_user.active_type != MalodyUserProfile.ACTIVE_TYPE_NORMAL(0) 时
 *   context["red_name"] = True，profile/index.html 与 profile/user.html 把
 *   用户名染成 #ef6666（0=NORMAL / 1=CODE / 2=STB）。
 * MaApi-go 的 /player/info 用 `active` 返回同一列 active_type，并不返回
 * red_name；兼容老 web 可能直接给出 red_name / active_type 的情况。
 */
export const isRedName = (info: Record<string, unknown>): boolean => {
  if (info.red_name ?? info.redName) return true
  const active = Number(info.active ?? info.active_type ?? 0)
  return Number.isFinite(active) && active !== 0
}
