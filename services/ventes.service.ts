import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export interface VenteQueryParams {
  tenantId: number
  id_point_vente?: string
  statut?: string
  page?: number
  limit?: number
}

export async function listVentes(params: VenteQueryParams) {
  const { tenantId, id_point_vente, statut, page = 1, limit = 50 } = params

  const pageNum = Math.max(1, page)
  const limitNum = Math.min(200, Math.max(1, limit))
  const skip = (pageNum - 1) * limitNum

  const where: Record<string, unknown> = { tenant_id: tenantId }
  if (id_point_vente) where.id_pdv = parseInt(id_point_vente, 10)
  if (statut) where.statut = statut

  const [data, total] = await prisma.$transaction([
    prisma.vente.findMany({
      where,
      include: { articles: true },
      skip,
      take: limitNum,
      orderBy: { created_at: 'desc' },
    }),
    prisma.vente.count({ where }),
  ])

  return { data, page: pageNum, limit: limitNum, total }
}

export async function createVenteDirecte({
  body,
  user,
}: {
  body: Record<string, unknown>
  user: { id_utilisateur: number; tenant_id: number }
}) {
  const { tenant_id } = user
  if (!tenant_id) throw httpError(401, 'Tenant manquant')

  const id_pdv = Number(body?.id_point_vente ?? body?.id_pdv)
  if (!id_pdv) throw httpError(400, "'id_point_vente' est requis")

  const lignes = Array.isArray(body?.lines)
    ? (body.lines as Array<Record<string, unknown>>)
    : Array.isArray(body?.lignes)
      ? (body.lignes as Array<Record<string, unknown>>)
      : []

  if (lignes.length === 0) throw httpError(400, 'Au moins une ligne est requise')

  let total = 0
  const articles: Array<{ id_produit: number; quantite: number; prix_unitaire: number }> = []

  for (const l of lignes) {
    const id_produit = Number(l.id_produit ?? l.id_lot)
    const quantite = Number(l.quantite)
    const prix_unitaire = Number(l.prix_initial ?? l.prix_unitaire ?? 0)
    if (!id_produit || quantite <= 0)
      throw httpError(400, 'Chaque ligne doit avoir id_produit et quantite > 0')
    total += quantite * prix_unitaire
    articles.push({ id_produit, quantite, prix_unitaire })
  }

  const vente = await prisma.$transaction(async (tx) => {
    const v = await tx.vente.create({
      data: {
        tenant_id,
        id_pdv,
        total,
        statut: 'validee',
      },
    })

    for (const a of articles) {
      await tx.venteArticle.create({
        data: {
          id_vente: v.id_vente,
          id_produit: a.id_produit,
          quantite: a.quantite,
          prix_unitaire: a.prix_unitaire,
        },
      })
    }

    return v
  })

  return { status: 201, payload: vente }
}
