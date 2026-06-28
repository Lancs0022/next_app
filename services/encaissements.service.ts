import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listEncaissements(tenantId: number) {
  const rows = await prisma.encaissement.findMany({
    where: { tenant_id: tenantId },
    orderBy: { id_encaissement: 'desc' },
  })
  return { data: rows }
}

export async function createEncaissement({
  body,
  tenantId,
}: {
  body: Record<string, unknown>
  tenantId: number
}) {
  const montant = Number(body?.montant)
  const mode = String(body?.mode || 'cash').trim()
  const id_vente = Number(body?.id_vente)
  const cree_par_id = Number(body?.cree_par_id)

  if (!montant || montant <= 0) throw httpError(400, 'Le montant doit être > 0')
  if (!id_vente) throw httpError(400, "'id_vente' est requis")
  if (!cree_par_id) throw httpError(400, "'cree_par_id' est requis")

  return prisma.encaissement.create({
    data: {
      tenant_id: tenantId,
      id_vente,
      montant,
      mode,
      cree_par_id,
    },
  })
}
