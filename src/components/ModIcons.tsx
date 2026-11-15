const MOD_NAMES = [
  'Auto', 'Luck', 'Flip', 'Const', 'Dash',
  'Rush', 'Hide', 'Origin', 'Slow', 'Death',
] as const

export function ModIcons({ value, none = false }: { value: unknown; none?: boolean }) {
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
