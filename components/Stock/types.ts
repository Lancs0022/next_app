// Types shared across Stock components (matching Prisma schema - snake_case)
export interface Collaborateur {
  id_collaborateur: number;
  tenant_id: number;
  nom: string;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  poste?: string | null;
  adresse?: string | null;
  statut: string;
  date_adhesion: string;
  created_at: string;
  updated_at: string;
}

export interface PointDeVente {
  id_pdv: number;
  tenant_id: number;
  nom: string;
  quartier?: string | null;
  ville?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  responsable_id?: number | null;
  statut: string;
  date_ouverture?: string | null;
  date_fermeture?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProduitCatalogue {
  id_produit: number;
  tenant_id: number;
  id_collaborateur: number;
  nom: string;
  description?: string | null;
  categorie?: string | null;
  sku?: string | null;
  unite?: string | null;
  seuil_alerte?: number | null;
  image_url?: string | null;
  statut: string;
  created_by?: number | null;
  modified_by?: number | null;
  created_at: string;
  updated_at: string;
  modified_at?: string | null;
  deleted_at?: string | null;
  // Computed fields
  lotsActifs?: number;
  stockTotal?: number;
  chiffreAffaires?: number;
  // User creator info
  createur_nom?: string | null;
  createur_par?: number | null;
}

export interface LivraisonItem {
  id_lot: number;
  tenant_id: number;
  id_produit: number;
  id_livraison: number;
  id_pdv: number;
  prix_initial: number;
  marge: number;
  quantite_initiale: number;
  quantite_remboursee: number;
  id_lot_parent?: number;
  statut: string;
  date_livraison: string;
  ventes_fermees: number;
  created_by?: number;
  modified_by?: number;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StockActuel {
  id: number;
  tenant_id: number;
  id_lot: number;
  id_pdv: number;
  quantite: number;
  quantite_reservee: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

// UI-facing types (camelCase for component consumption) - mapped from database types
export interface LotActif {
  id: string;
  produitId: string;
  livraisonId: string;
  livraisonItemId: string;
  pdvId: string;
  dateArrivee: string;
  prixInitial: number;
  marge: number;
  quantiteActuelle: number;
  quantiteInitiale: number;
  quantiteVendue: number; // NEW: Total quantity sold (ventes confirmées - annulations)
  ventesFermees: number;
  chiffreAffaires?: number;
  benefice?: number;
  createdAt: string;
  createdBy: string;
  produitNom?: string;
  produitDescription?: string | null;
  produitCategorie?: string | null;
  produitCreatedAt?: string;
  produitCreatedBy?: string | null;
  produitCreateurNom?: string | null;
  collaborateurId?: string | null;
  collaborateurNom?: string | null;
  pdvNom?: string | null;
  pdvVille?: string | null;
  livraisonCreatedAt?: string;
  livraisonCommentaire?: string | null;
  // Unité de mesure
  unite_code?: string | null;
  unite_label?: string | null;
  est_decimal?: boolean;
  precision?: number;
  // Snake_case aliases for legacy components
    livraison_id?: string;
    livraison_item_id?: string;
    date_arrivee?: string;
    pdv_id?: string;
    created_at?: string;
    created_by?: string;
    prix_initial?: number;
    quantite_actuelle?: number;
    quantite_initiale?: number;
    quantite_vendue?: number;
    ventes_fermees?: number;
    chiffre_affaires?: number;
  }

// Mapping functions
export function mapToLotActif(
  item: LivraisonItem & {
    quantite_disponible?: number;
    quantite_vendue?: number;
    point_vente_nom?: string;
    point_vente_ville?: string | null;
    collaborateur_nom?: string;
    description_produit?: string | null;
    produit_description?: string | null;
    produit_categorie?: string | null;
    produit_created_at?: string;
    produit_created_by?: string | number | null;
    produit_createur_nom?: string | null;
    chiffre_affaires?: number;
    chiffreAffaires?: number;
    benefice?: number;
    livraison_created_at?: string;
    livraison_commentaire?: string | null;
    unite_code?: string | null;
    unite_label?: string | null;
    est_decimal?: boolean;
    precision?: number;
  },
  produit: ProduitCatalogue
): LotActif {
  return {
    id: item.id_lot.toString(),
    produitId: item.id_produit.toString(),
    livraisonId: item.id_livraison.toString(),
    livraisonItemId: item.id_lot.toString(), // Using id_lot as livraisonItemId for now
    pdvId: item.id_pdv.toString(),
    dateArrivee: item.date_livraison,
    prixInitial: Number(item.prix_initial),
    marge: Number(item.marge),
    quantiteActuelle: Number(item.quantite_disponible ?? 0),
    quantiteInitiale: Number(item.quantite_initiale),
    quantiteVendue: Number(item.quantite_vendue ?? 0),
    ventesFermees: item.ventes_fermees,
    createdAt: item.created_at,
    createdBy: item.created_by?.toString() || 'Unknown',
    produitNom: produit.nom,
    produitDescription: item.produit_description ?? item.description_produit ?? produit.description ?? null,
    produitCategorie: item.produit_categorie ?? produit.categorie ?? null,
    produitCreatedAt: item.produit_created_at ?? produit.created_at,
    produitCreatedBy: item.produit_created_by?.toString() ?? produit.created_by?.toString() ?? null,
    produitCreateurNom: item.produit_createur_nom ?? null,
    collaborateurId: produit.id_collaborateur?.toString() ?? null,
    collaborateurNom: item.collaborateur_nom ?? null,
    pdvNom: item.point_vente_nom ?? null,
    pdvVille: item.point_vente_ville ?? null,
    chiffreAffaires: Number(item.chiffre_affaires ?? item.chiffreAffaires ?? 0),
        benefice: Number(item.benefice ?? 0),
        livraisonCreatedAt: item.livraison_created_at,
        livraisonCommentaire: item.livraison_commentaire ?? null,
        unite_code: item.unite_code ?? null,
        unite_label: item.unite_label ?? null,
        est_decimal: item.est_decimal ?? false,
        precision: item.precision ?? 0,
        // Snake_case aliases for legacy components
        livraison_id: item.id_livraison.toString(),
        livraison_item_id: item.id_lot.toString(),
        date_arrivee: item.date_livraison,
        pdv_id: item.id_pdv.toString(),
        created_at: item.created_at,
        created_by: item.created_by?.toString() ?? 'Unknown',
        prix_initial: Number(item.prix_initial),
        quantite_actuelle: Number(item.quantite_disponible ?? 0),
        quantite_initiale: Number(item.quantite_initiale),
        quantite_vendue: Number(item.quantite_vendue ?? 0),
        ventes_fermees: item.ventes_fermees,
        chiffre_affaires: Number(item.chiffre_affaires ?? item.chiffreAffaires ?? 0),
      };
}

export function mapToProduitCatalogue(item: ProduitCatalogue): ProduitCatalogue {
  // This is a pass-through for now, but could add computed fields
  return {
    ...item,
    lotsActifs: item.lotsActifs ?? 0,
    stockTotal: item.stockTotal ?? 0,
    chiffreAffaires: item.chiffreAffaires ?? 0
  };
}
