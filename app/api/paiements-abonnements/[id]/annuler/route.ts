import { NextResponse } from 'next/server'

/**
 * @deprecated
 * Cette route annulait un paiement ligne par ligne.
 * Elle est remplacée par :
 *   POST /api/paiements-abonnements/groupes/:id_tf/annuler
 *
 * L'annulation se fait désormais au niveau du groupe (TransactionFinanciere),
 * pas au niveau d'une ligne individuelle.
 */
export function POST() {
  return NextResponse.json(
    {
      error:
        'Cette route est obsolète. Utilisez POST /api/paiements-abonnements/groupes/:id_tf/annuler ' +
        "en passant l'id_transaction_financiere du groupe à annuler.",
      nouvelle_route: '/api/paiements-abonnements/groupes/:id_tf/annuler',
    },
    { status: 410 }
  )
}
