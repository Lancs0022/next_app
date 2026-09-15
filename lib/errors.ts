import { NextResponse } from 'next/server'

export function httpError(status: number, message: string): Error & { httpStatus: number } {
  const err = new Error(message) as Error & { httpStatus: number }
  err.httpStatus = status
  return err
}

/**
 * Transforme une erreur quelconque en NextResponse JSON.
 *
 * Priorité pour le status HTTP :
 *   1. err.httpStatus  — erreur créée par httpError()
 *   2. err.status      — ancien pattern (compatibilité)
 *   3. 500             — fallback
 *
 * Les erreurs Prisma P2002 (violation de contrainte unique) sont interceptées ici
 * pour retourner un 409 générique — le service doit en général intercepter P2002
 * avant d'arriver ici avec un message métier explicite, mais ce fallback évite
 * qu'une violation concurrente laisse fuir un message Prisma brut.
 */
export function toErrorResponse(e: unknown): NextResponse {
  // Prisma unique/exclude constraint violation
  if (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: string }).code === 'P2002'
  ) {
    return NextResponse.json(
      { error: 'Opération impossible : une contrainte d\'unicité a été violée (conflit de données).' },
      { status: 409 }
    )
  }

  const err = e as { httpStatus?: number; status?: number; message?: string }
  const status = err.httpStatus ?? err.status ?? 500
  return NextResponse.json({ error: err.message ?? 'Erreur interne' }, { status })
}
