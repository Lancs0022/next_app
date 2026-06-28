// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPvId(pv: Record<string, any>): string {
  const id = pv.id_point_vente ?? pv.id_pdv
  return id != null ? String(id) : ''
}
