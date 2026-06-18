import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export interface StockQueryParams {
  tenantId: number
  id_collaborateur?: string
  id_point_vente?: string
  q?: string
  page?: number
  limit?: number
}

export async function listLotsDisponibles(params: StockQueryParams) {
  const { tenantId, id_point_vente, page = 1, limit = 50 } = params

  const pageNum = Math.max(1, page)
  const limitNum = Math.min(200, Math.max(1, limit))
  const skip = (pageNum - 1) * limitNum

  const whereFilter: Record<string, unknown> = {
    tenant_id: tenantId,
  }

  if (id_point_vente) {
    const pvId = parseInt(id_point_vente, 10)
    if (!isNaN(pvId)) {
      whereFilter.id_pdv = pvId
    }
  }

  const [data, total] = await prisma.$transaction([
    prisma.stockLocal.findMany({
      where: whereFilter,
      skip,
      take: limitNum,
      orderBy: { id_stock: 'desc' },
    }),
    prisma.stockLocal.count({ where: whereFilter }),
  ])

  return { data, page: pageNum, limit: limitNum, total }
}

export async function createStockAjustement({
  body,
  user,
}: {
  body: Record<string, unknown>
  user: { id_utilisateur: number; tenant_id: number }
}) {
  const { id_utilisateur, tenant_id } = user

  if (!id_utilisateur) throw httpError(401, 'Utilisateur non authentifié')
  if (!tenant_id) throw httpError(401, 'Tenant manquant')

  const type = String(body?.type || '').trim()
  const allowedTypes = ['perte', 'casse', 'inventaire', 'correction']
  if (!allowedTypes.includes(type)) {
    throw httpError(400, `Le type d'ajustement doit être parmi: ${allowedTypes.join(', ')}`)
  }

  const rawDelta = String(body?.delta ?? body?.quantite ?? '').trim()
  if (!rawDelta) throw httpError(400, "La quantité d'ajustement (delta) est requise")

  const delta = Number(rawDelta.replace(',', '.'))
  if (!Number.isFinite(delta) || delta === 0) {
    throw httpError(400, "La quantité d'ajustement doit être un nombre non nul")
  }

  return {
    status: 201,
    payload: {
      type,
      quantite: delta,
      message: 'Ajustement enregistré',
    },
  }
}

export async function listCatalogueStock(tenantId: number) {
  const rows = await prisma.produitCatalogue.findMany({
    where: { tenant_id: tenantId, actif: true },
    orderBy: { id_produit: 'desc' },
  })
  return { data: rows }
}

export async function listStockMouvements(params: {
  tenantId: number
  id_lot?: string
  limit?: number
}) {
  // No stock_mouvement table yet — return empty dataset
  const { tenantId: _tenantId, id_lot: _id_lot, limit: _limit } = params
  return { data: [] }
}

export async function generateStockSnapshot() {
  const snapshots = await prisma.stockLocal.findMany()
  const periode = new Date().toISOString().substring(0, 7)

  for (const s of snapshots) {
    const snap = await prisma.stockSnapshot.create({
      data: {
        tenant_id: s.tenant_id,
        id_pdv: s.id_pdv,
        periode,
      },
    })
    await prisma.snapshotLigne.create({
      data: {
        id_snapshot: snap.id_snapshot,
        id_produit: s.id_produit,
        quantite: s.quantite,
      },
    })
  }
}
