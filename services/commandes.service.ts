import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listCommandes(tenantId: number) {
  const rows = await prisma.commande.findMany({
    where: { tenant_id: tenantId },
    orderBy: { id_commande: 'desc' },
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
  if (!id_pdv) throw httpError(400, "'id_point_vente' est requis")

  return prisma.commande.create({
    data: {
      tenant_id: tenantId,
      id_pdv,
      total: 0,
    },
  })
}
