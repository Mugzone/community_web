export const hasGroup = (groups: number[] | undefined, targets: number[]) => {
  if (!groups || !groups.length) return false
  return targets.some((id) => groups.includes(id))
}

export const isPublisher = (groups?: number[]) => hasGroup(groups, [2, 3])
export const isEditor = (groups?: number[]) => hasGroup(groups, [2, 3, 5, 8, 9])
export const isAssistant = (groups?: number[]) => hasGroup(groups, [2, 3, 8])
export const isOrgMember = (groups?: number[]) => hasGroup(groups, [2, 3, 8, 9])
