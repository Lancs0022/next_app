// Contrats TypeScript stricts pour le module Abonnements

export type AbonnementStatut = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type SouscriptionStatut = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE'
export type PaySt = 'a_jour' | 'en_attente' | 'partielle' | 'impayee'

export interface Offre {
  id_abonnement: number
  nom: string
  description: string | null
  montant: number
  periodicite: string
  statut: AbonnementStatut
  nb_souscriptions: number
  nb_souscriptions_actives: number
  created_at: string
  modified_at: string | null
}

export interface ProchaineEcheance {
  id: number
  periode_debut: string
  periode_fin: string
  statut: string
  montant_du: number
  montant_paye: number | null
  reste: number
}

export interface Souscription {
  id_souscription_abonnement: number
  id_abonnement: number
  id_collaborateur: number
  collaborateur_nom: string
  abonnement_nom: string
  abonnement_periodicite: string
  abonnement_statut: string
  montant: number
  renouvellement_auto: boolean
  date_debut: string
  date_fin: string | null
  statut: SouscriptionStatut
  canceled_at: string | null
  created_at: string
  prochaine_echeance: ProchaineEcheance | null
}

export interface EcheanceItem {
  id_echeance_abonnement: number
  periode_debut: string
  periode_fin: string
  montant: number
  statut: string
  montant_paye?: number | null
  reste: number
  date_paiement: string | null
  _type: 'ech'
  id_souscription: number
}

export interface EcheanceHeaderRow {
  id: string
  _type: 'ech_header'
  id_souscription: number
}

export interface EcheanceFooterRow {
  id: string
  _type: 'ech_footer'
  id_souscription: number
  remainingCount: number
  expanded: boolean
}

export type EcheanceChildRow = EcheanceHeaderRow | EcheanceItem | EcheanceFooterRow

export interface SouscriptionEnriched extends Souscription {
  id: string
  _type: 'sous'
  paiementStatut: PaySt
  children?: EcheanceChildRow[]
}

export interface CollabGroupRow {
  id: string
  _type: 'collab'
  id_collaborateur: number
  collaborateur_nom: string
  nb_souscriptions: number
  nb_impayees: number
  globalPayStatut: PaySt
  children: SouscriptionEnriched[]
}

export type SouscriptionDisplayRow = SouscriptionEnriched | CollabGroupRow | EcheanceChildRow

export interface CollaborateurOption {
  id_collaborateur: number
  nom: string
  prenom: string | null
}

export type DateFilterValue = {
  dateMin?: string | null
  dateMax?: string | null
  mode?: string
  target?: string
  [key: string]: unknown
}

export interface PaiementListe {
  id_paiement_abonnement: number
  id_transaction_financiere: number | null
  id_echeance_abonnement: number
  id_souscription_abonnement: number
  id_collaborateur: number
  collaborateur_nom: string
  abonnement_nom: string
  abonnement_periodicite: string
  montant: number
  date_paiement: string
  periode_debut: string
  periode_fin: string
  echeance_statut: string
  canceled_at: string | null
  created_at: string
  created_by: number | null
}

export type FiltresSouscription = SouscriptionStatut | 'TOUTES' | 'IMPAYEES'

export interface ConfirmDialog {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  confirmVariant: 'danger' | 'warning' | 'primary'
  onConfirm: () => Promise<void>
}
