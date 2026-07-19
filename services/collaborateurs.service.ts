import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export interface CollaborateurQueryParams {
  tenantId: number
  statut?: string
}

export async function listCollaborateurs(params: CollaborateurQueryParams) {
  const { tenantId, statut } = params

  const where: Record<string, unknown> = { tenant_id: tenantId }
  if (statut) {
    where.statut = statut
  }

  const rows = await prisma.collaborateur.findMany({
    where,
    orderBy: { id_collaborateur: 'desc' },
  })

  return { data: rows }
}

export async function createCollaborateur({
  body,
  tenantId,
}: {
  body: Record<string, unknown>
  tenantId: number
}) {
  const nom = String(body?.nom || '').trim()
  if (!nom) throw httpError(400, "Le champ 'nom' est requis")

  const client_uuid = body?.client_uuid ? String(body.client_uuid) : null

  if (client_uuid) {
    const existing = await prisma.collaborateur.findFirst({
      where: { tenant_id: tenantId, client_uuid },
    })
    if (existing) {
      return existing
    }
  }

  const collab = await prisma.collaborateur.create({
    data: {
      tenant_id: tenantId,
      nom,
      prenom: String(body?.prenom || ''),
      email: body?.email ? String(body.email) : null,
      telephone: body?.telephone ? String(body.telephone) : null,
      poste: body?.poste ? String(body.poste) : null,
      client_uuid,
    },
  })

  return collab
}
