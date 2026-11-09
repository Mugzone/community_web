/**
 * 老站 wikipage/templatetags/filter_wiki.py:format_mods 的 React 版。
 *
 * score_key.mod 是位掩码，位序见老站 clientcgi/enums.py ENUM_MODS：
 * 0=Auto 1=Luck 2=Flip 3=Const 4=Dash 5=Rush 6=Hide 7=Origin 8=Slow 9=Death。
 * 老站按位输出 `<i class="g_mod g_mod_N"></i>` 图标（CSS 在 main.css +
 * 各页面样式里给尺寸），从来不直接显示这个数字。
 *
 * none 与老站 format_mods 的同名参数一致：
 *   none=false（个人主页卡片，模板写 `none=False`）→ mod=0 时整块留空；
 *   none=true （成绩列表，模板用默认值）        → mod=0 时显示文本 "None"。
 */
const MOD_NAMES = [
  'Auto', 'Luck', 'Flip', 'Const', 'Dash',
  'Rush', 'Hide', 'Origin', 'Slow', 'Death',
] as const

export function ModIcons({ value, none = false }: { value: unknown; none?: boolean }) {
  // 后端若已给出可读名称（而不是位掩码），直接沿用，避免把文本吞成 0。
  if (typeof value === 'string' && value.trim() !== '' && !Number.isFinite(Number(value))) {
    return <>{value}</>
  }
  const mask = Number(value) || 0
  const bits = MOD_NAMES.map((_, i) => i).filter((i) => (mask & (1 << i)) !== 0)
  if (bits.length === 0) return none ? <>None</> : null
  return (
    <>
      {bits.map((i) => (
        <i key={i} className={`g_mod g_mod_${i}`} title={MOD_NAMES[i]} aria-label={MOD_NAMES[i]} />
      ))}
    </>
  )
}
