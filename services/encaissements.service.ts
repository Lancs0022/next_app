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
  const mode_paiement = String(body?.mode_paiement || '').trim()
  const id_pdv = Number(body?.id_pdv ?? 0)

  if (!montant || montant <= 0) throw httpError(400, 'Le montant doit être > 0')
  if (!mode_paiement) throw httpError(400, "'mode_paiement' est requis")
  if (!id_pdv) throw httpError(400, "'id_pdv' est requis")

  return prisma.encaissement.create({
    data: {
      tenant_id: tenantId,
      id_pdv,
      montant,
      mode_paiement,
    },
  })
}
