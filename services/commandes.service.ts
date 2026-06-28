import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listCommandes(tenantId: number) {
  const rows = await prisma.commande.findMany({
    orderBy: { id_commande: 'desc' },
    take: 200,
  })
  return { data: rows }
}

export async function createCommande({
  body,
  tenantId,
}: {
  body: Record<string, unknown>
  tenantId: number
}) {
  const id_pdv = Number(body?.id_point_vente ?? body?.id_pdv)
  const id_client = Number(body?.id_client)
  const cree_par_id = Number(body?.cree_par_id)
  if (!id_pdv) throw httpError(400, "'id_point_vente' est requis")
  if (!id_client) throw httpError(400, "'id_client' est requis")
  if (!cree_par_id) throw httpError(400, "'cree_par_id' est requis")

  return prisma.commande.create({
    data: {
      id_pdv,
      id_client,
      cree_par_id,
    },
  })
}
