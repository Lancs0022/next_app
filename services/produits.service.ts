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
      id_unite: body?.id_unite != null ? Number(body.id_unite) : null,
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
      id_unite: body?.id_unite !== undefined ? (body.id_unite != null ? Number(body.id_unite) : null) : existing.id_unite,
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

export async function listAggregatedProduits(tenantId: number) {
  const produits = await prisma.produitCatalogue.findMany({
    where: { tenant_id: tenantId, statut: 'actif' },
    select: {
      id_produit: true,
      nom: true,
      description: true,
      categorie: true,
      unite: true,
      image_url: true,
    },
  });

  const aggregatedData = await Promise.all(
    produits.map(async (produit) => {
      // Available Quantity
      const stock = await prisma.stockActuel.aggregate({
        _sum: {
          quantite: true,
        },
        where: {
          tenant_id: tenantId,
          id_lot: {
            in: (await prisma.livraisonItem.findMany({
              where: { id_produit: produit.id_produit, statut: 'en_stock' },
              select: { id_lot: true },
            })).map((item) => item.id_lot),
          },
        },
      });
      const availableQuantity = stock._sum.quantite?.toNumber() || 0;

      // Average Cost (from LivraisonItem)
      const livraisonItems = await prisma.livraisonItem.findMany({
        where: { id_produit: produit.id_produit, tenant_id: tenantId },
        select: { prix_initial: true },
      });
      const totalCost = livraisonItems.reduce((sum, item) => sum + item.prix_initial.toNumber(), 0);
      const averageCost = livraisonItems.length > 0 ? totalCost / livraisonItems.length : 0;

      // Sales Price (from VenteArticle, assuming prix_initial + marge is the sales price)
      const venteArticles = await prisma.venteArticle.findMany({
        where: { id_lot: {
          in: (await prisma.livraisonItem.findMany({
            where: { id_produit: produit.id_produit },
            select: { id_lot: true },
          })).map((item) => item.id_lot),
        }, tenant_id: tenantId },
        select: { prix_initial: true, marge: true },
      });
      const totalSalesPrice = venteArticles.reduce((sum, item) => sum + item.prix_initial.toNumber() + item.marge.toNumber(), 0);
      const averageSalesPrice = venteArticles.length > 0 ? totalSalesPrice / venteArticles.length : 0;

      return {
        ...produit,
        availableQuantity,
        averageCost: averageCost.toFixed(2),
        salesPrice: averageSalesPrice.toFixed(2),
      };
    })
  );

  return { data: aggregatedData };
}
