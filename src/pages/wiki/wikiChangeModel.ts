export type ChangeItem = {
  user_id?: number | string
  user?: { id?: number | string; username?: string }
  username?: string
  link?: string
  msg?: string
  create_time_str?: string
}

export const uidOf = (it: ChangeItem): number | string => it.user_id ?? it.user?.id ?? 0

export const nameOf = (it: ChangeItem): string => it.user?.username ?? it.username ?? ''

export const changeKeyOf = (it: ChangeItem, index: number): string =>
  `${uidOf(it)}:${it.create_time_str ?? ''}:${it.msg ?? ''}:${index}`
