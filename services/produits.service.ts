import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listProduits(tenantId: number) {
  const rows = await prisma.produitCatalogue.findMany({
    where: { tenant_id: tenantId, actif: true },
    orderBy: { id_produit: 'desc' },
  })
  return { data: rows }
}

export async function createProduit({
  body,
  tenantId,
}: {
  body: Record<string, unknown>
  tenantId: number
}) {
  const nom = String(body?.nom || '').trim()
  if (!nom) throw httpError(400, "Le champ 'nom' est requis")

  const prixAchat = Number(body?.prix_achat ?? 0)
  const prixVente = Number(body?.prix_vente ?? 0)
  if (prixAchat < 0 || prixVente < 0) throw httpError(400, 'Les prix doivent être positifs')

  const produit = await prisma.produitCatalogue.create({
    data: {
      tenant_id: tenantId,
      nom,
      description: body?.description ? String(body.description) : null,
      prix_achat: prixAchat,
      prix_vente: prixVente,
    },
  })

  return produit
}

export async function updateProduit({
  id,
  body,
  tenantId,
}: {
  id: number
  body: Record<string, unknown>
  tenantId: number
}) {
  const existing = await prisma.produitCatalogue.findFirst({
    where: { id_produit: id, tenant_id: tenantId },
  })
  if (!existing) throw httpError(404, 'Produit introuvable')

  return prisma.produitCatalogue.update({
    where: { id_produit: id },
    data: {
      nom: body?.nom ? String(body.nom) : existing.nom,
      description:
        body?.description !== undefined ? String(body.description) : existing.description,
      prix_achat:
        body?.prix_achat !== undefined ? Number(body.prix_achat) : existing.prix_achat,
      prix_vente:
        body?.prix_vente !== undefined ? Number(body.prix_vente) : existing.prix_vente,
    },
  })
}

export async function deleteProduit({
  id,
  tenantId,
}: {
  id: number
  tenantId: number
}) {
  const existing = await prisma.produitCatalogue.findFirst({
    where: { id_produit: id, tenant_id: tenantId },
  })
  if (!existing) throw httpError(404, 'Produit introuvable')

  return prisma.produitCatalogue.update({
    where: { id_produit: id },
    data: { actif: false },
  })
}

export async function updateProduitImage({
  id,
  imageUrl,
  tenantId,
}: {
  id: number
  imageUrl: string
  tenantId: number
}) {
  const existing = await prisma.produitCatalogue.findFirst({
    where: { id_produit: id, tenant_id: tenantId },
  })
  if (!existing) throw httpError(404, 'Produit introuvable')

  return prisma.produitCatalogue.update({
    where: { id_produit: id },
    data: { image_url: imageUrl },
  })
}
