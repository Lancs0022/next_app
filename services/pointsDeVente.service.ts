import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listPointsDeVente(tenantId: number) {
  const rows = await prisma.pointDeVente.findMany({
    where: { tenant_id: tenantId, actif: true },
    orderBy: { id_pdv: 'desc' },
  })
  return { data: rows }
}

export async function createPointDeVente({
  body,
  tenantId,
}: {
  body: Record<string, unknown>
  tenantId: number
}) {
  const nom = String(body?.nom || '').trim()
  if (!nom) throw httpError(400, "Le champ 'nom' est requis")

  return prisma.pointDeVente.create({
    data: {
      tenant_id: tenantId,
      nom,
      adresse: body?.adresse ? String(body.adresse) : null,
    },
  })
}
