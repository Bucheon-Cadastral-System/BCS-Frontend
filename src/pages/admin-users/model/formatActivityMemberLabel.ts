export function formatActivityMemberLabel(id?: number | null, name?: string | null) {
  if (id == null) return '-'
  return name ? `${name} #${id}` : `#${id}`
}
