/**
 * GET /api/ventes/lot/:id_lot
 * Retourne toutes les lignes de vente (vente_article) associées à un lot,
 * enrichies avec le nom du produit, le collaborateur, la vente parente.
 * Utilisé par le modal d'annulation depuis LotExplorer / LotDetailModal.
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const GET = withAuth(
  async (_req, ctx, { tenantId }) => {
    const id_lot = Number(ctx.params?.id)
    if (!id_lot || !Number.isFinite(id_lot)) {
      return NextResponse.json({ error: 'ID de lot invalide' }, { status: 400 })
    }

    // Récupérer toutes les lignes non supprimées pour ce lot
    const articles = await prisma.venteArticle.findMany({
      where: { tenant_id: tenantId, id_lot, deleted: false },
      include: { vente: true },
      orderBy: { id_ligne: 'desc' },
    })

    if (articles.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Batch-resolve pour l'affichage
    const lotItem = await prisma.livraisonItem.findFirst({
      where: { id_lot, tenant_id: tenantId },
      select: { id_produit: true },
    })
    const produit = lotItem
      ? await prisma.produitCatalogue.findFirst({
          where: { id_produit: lotItem.id_produit },
          select: {
            nom: true,
            id_unite: true,
            unite_mesure: { select: { code: true, label: true, est_decimal: true, precision: true } },
          },
        })
      : null

    const collabIds = [...new Set(articles.map(a => a.id_collaborateur))]
    const collabs = await prisma.collaborateur.findMany({
      where: { id_collaborateur: { in: collabIds } },
      select: { id_collaborateur: true, nom: true },
    })
    const collabMap = Object.fromEntries(collabs.map(c => [c.id_collaborateur, c.nom]))

    const pdvIds = [...new Set(articles.map(a => a.vente.id_point_vente))]
    const pdvs = await prisma.pointDeVente.findMany({
      where: { id_pdv: { in: pdvIds } },
      select: { id_pdv: true, nom: true },
    })
    const pdvMap = Object.fromEntries(pdvs.map(p => [p.id_pdv, p.nom]))

    const data = articles.map(a => ({
      id_ligne:            a.id_ligne,
      id_vente:            a.id_vente,
      date_vente:          a.vente.date_vente,
      statut_vente:        a.vente.statut,
      point_vente_nom:     pdvMap[a.vente.id_point_vente] ?? `PV #${a.vente.id_point_vente}`,
      libelle_produit:     produit?.nom ?? `Lot #${id_lot}`,
      collaborateur_nom:   collabMap[a.id_collaborateur] ?? '-',
      quantite_vendue:     Number(a.quantite_vendue),
      quantite_retournee:  Number(a.quantite_retournee),
      quantite_annulable:  Number(a.quantite_vendue) - Number(a.quantite_retournee),
      prix_initial:        Number(a.prix_initial),
      marge:               Number(a.marge),
      montant_ht:          Number(a.montant_ht ?? 0),
      raison_suppression:  a.raison_suppression ?? null,
      unite_code:          produit?.unite_mesure?.code ?? null,
      unite_label:         produit?.unite_mesure?.label ?? null,
      est_decimal:         produit?.unite_mesure?.est_decimal ?? false,
      precision:           produit?.unite_mesure?.precision ?? 0,
    }))
    // Ne retourner que les lignes encore annulables (quantite_annulable > 0)
    .filter(a => a.quantite_annulable > 0)

    return NextResponse.json({ data })
  },
  'VENTES',
  'read'
)
