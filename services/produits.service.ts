import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listProduits(tenantId: number) {
  const rows = await prisma.produitCatalogue.findMany({
    where: { tenant_id: tenantId, statut: 'actif' },
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

  const produit = await prisma.produitCatalogue.create({
    data: {
      tenant_id: tenantId,
      nom,
      id_collaborateur: Number(body.id_collaborateur),
      description: body?.description ? String(body.description) : null,
      categorie: body?.categorie ? String(body.categorie) : null,
      unite: body?.unite ? String(body.unite) : null,
      seuil_alerte: body?.seuil_alerte != null ? Number(body.seuil_alerte) : null,
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
      categorie: body?.categorie !== undefined ? String(body.categorie) : existing.categorie,
      unite: body?.unite !== undefined ? String(body.unite) : existing.unite,
      seuil_alerte: body?.seuil_alerte != null ? Number(body.seuil_alerte) : existing.seuil_alerte,
      id_collaborateur: body?.id_collaborateur != null ? Number(body.id_collaborateur) : existing.id_collaborateur,
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
    data: { statut: 'archive' },
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
