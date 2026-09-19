import type { ProduitCatalogue, LotActif } from '@/components/Stock/types'
import type { AnyRecord } from './stockTypes'

export function toProduitCatalogue(row: AnyRecord, produitsCatalogue: AnyRecord[] = []): ProduitCatalogue {
  const source = produitsCatalogue.find(p => Number(p.id_produit) === Number(row.id || row.id_produit)) || row
  return {
    id_produit: Number(source.id_produit ?? row.id),
    tenant_id: Number(source.tenant_id ?? 0),
    id_collaborateur: Number(source.id_collaborateur ?? row.id_collaborateur ?? 0),
    nom: String(source.nom ?? source.libelle ?? row.libelle ?? 'Sans nom'),
    description: source.description ?? null,
    categorie: source.categorie ?? row.categorie ?? null,
    sku: source.sku ?? null,
    unite: source.unite ?? row.unite ?? null,
    seuil_alerte: source.seuil_alerte ?? row.seuil_alerte ?? null,
    image_url: source.image_url ?? null,
    statut: source.statut ?? row.statut ?? 'actif',
    created_by: source.created_by ?? undefined,
    modified_by: source.modified_by ?? undefined,
    created_at: source.created_at ?? new Date().toISOString(),
    updated_at: source.updated_at ?? new Date().toISOString(),
    modified_at: source.modified_at ?? undefined,
    deleted_at: source.deleted_at ?? undefined,
    lotsActifs: Number(row.lots_actifs ?? row.lotsActifs ?? 0),
    stockTotal: Number(row.quantite_en_stock ?? row.stockTotal ?? 0),
    chiffreAffaires: Number(row.chiffre_affaires ?? row.chiffreAffaires ?? 0),
  }
}

export function toLotActif(row: AnyRecord, produit: ProduitCatalogue): LotActif {
  return {
    id: String(row.id_lot),
    produitId: String(row.id_produit),
    livraisonId: String(row.id_livraison),
    livraisonItemId: String(row.id_lot),
    pdvId: String(row.id_point_vente ?? row.id_pdv),
    dateArrivee: String(row.date_livraison ?? row.date_creation ?? new Date().toISOString()),
    prixInitial: Number(row.prix_initial ?? 0),
    marge: Number(row.marge ?? 0),
    quantiteActuelle: Number(row.quantite_disponible ?? 0),
    quantiteInitiale: Number(row.quantite_initiale ?? 0),
    quantiteVendue: Number(row.quantite_vendue ?? 0),
    ventesFermees: Number(row.ventes_fermees ?? 0),
    createdAt: String(row.date_creation ?? row.created_at ?? new Date().toISOString()),
    createdBy: String(row.created_by_nom ?? row.created_by ?? 'N/A'),
    produitNom: produit.nom,
    produitDescription: row.description_produit ?? produit.description ?? null,
    produitCategorie: row.categorie_produit ?? produit.categorie ?? null,
    produitCreatedAt: row.produit_created_at ?? produit.created_at,
    produitCreatedBy: row.produit_created_by != null ? String(row.produit_created_by) : produit.created_by?.toString() ?? null,
    produitCreateurNom: row.produit_createur_nom ?? null,
    collaborateurId: row.id_collaborateur != null ? String(row.id_collaborateur) : String(produit.id_collaborateur),
    collaborateurNom: row.collaborateur_nom ?? null,
    pdvNom: row.point_vente_nom ?? null,
    pdvVille: row.point_vente_ville ?? null,
    chiffreAffaires: Number(row.chiffre_affaires ?? row.chiffreAffaires ?? 0),
    benefice: Number(row.benefice ?? 0),
    unite_code: row.unite_code ?? null,
    unite_label: row.unite_label ?? null,
    est_decimal: row.est_decimal ?? false,
    precision: row.precision ?? 0,
    // Aliases snake_case pour LotDetailModal (héritage)
    livraison_id: String(row.id_livraison),
    livraison_item_id: String(row.id_lot),
    date_arrivee: String(row.date_livraison ?? row.date_creation ?? new Date().toISOString()),
    pdv_id: String(row.id_point_vente ?? row.id_pdv),
    created_at: String(row.date_creation ?? row.created_at ?? new Date().toISOString()),
    created_by: String(row.created_by_nom ?? row.created_by ?? 'N/A'),
    prix_initial: Number(row.prix_initial ?? 0),
    quantite_actuelle: Number(row.quantite_disponible ?? 0),
    quantite_initiale: Number(row.quantite_initiale ?? 0),
    quantite_vendue: Number(row.quantite_vendue ?? 0),
    ventes_fermees: Number(row.ventes_fermees ?? 0),
    chiffre_affaires: Number(row.chiffre_affaires ?? row.chiffreAffaires ?? 0),
  }
}

export function formatAr(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return `${Number(amount).toLocaleString('fr-FR')} Ar`
}
