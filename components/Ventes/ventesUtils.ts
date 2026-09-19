export const STATUT_LABELS: Record<string, string> = {
  en_attente_paiement: 'En attente',
  payee: 'Payée',
  annulee: 'Annulée',
  retournee: 'Retournée',
}

export const STATUT_LETTER: Record<string, string> = {
  en_attente_paiement: 'A',
  payee: 'P',
  annulee: 'X',
  retournee: 'R',
}

export function formatStatut(statut: string): string {
  return STATUT_LABELS[statut] || statut
}

export function getStatutBadgeClass(statut: string): string {
  const classes: Record<string, string> = {
    en_attente_paiement:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    payee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    annulee: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    retournee: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  }
  return classes[statut] || 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
}

export function formatAr(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return `${Number(amount).toLocaleString('fr-FR')} Ar`
}
