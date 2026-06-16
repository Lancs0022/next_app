import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listLivraisons(tenantId: number) {
  const rows = await prisma.livraison.findMany({
    where: { tenant_id: tenantId },
    orderBy: { id_livraison: 'desc' },
  })
  return { data: rows }
}

export async function createLivraison({
  body,
  tenantId,
}: {
  body: Record<string, unknown>
  tenantId: number
}) {
  const id_pdv = Number(body?.id_pdv)
  const id_produit = Number(body?.id_produit)
  const quantite = Number(body?.quantite)
  const prix_unitaire = Number(body?.prix_unitaire ?? 0)

  if (!id_pdv) throw httpError(400, "Le champ 'id_pdv' est requis")
  if (!id_produit) throw httpError(400, "Le champ 'id_produit' est requis")
  if (!quantite || quantite <= 0) throw httpError(400, 'La quantite doit être > 0')

  return prisma.livraison.create({
    data: {
      tenant_id: tenantId,
      id_pdv,
      id_produit,
      quantite,
      prix_unitaire,
    },
  })
}
