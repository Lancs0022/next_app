import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listClients({
  tenantId,
  q,
  limit = 200,
}: {
  tenantId: number
  q?: string
  limit?: number
}) {
  const where: Record<string, unknown> = { tenant_id: tenantId }
  if (q?.trim()) {
    where.OR = [
      { nom: { contains: q.trim(), mode: 'insensitive' } },
      { prenom: { contains: q.trim(), mode: 'insensitive' } },
      { email: { contains: q.trim(), mode: 'insensitive' } },
    ]
  }

  const rows = await prisma.client.findMany({
    where,
    orderBy: { nom: 'asc' },
    take: limit,
    select: {
      id_client: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
    },
  })

  return {
    data: rows.map(c => ({
      ...c,
      label: [c.prenom, c.nom].filter(Boolean).join(' ') || c.nom,
    })),
  }
}

export async function createClient({
  body,
  tenantId,
}: {
  body: Record<string, unknown>
  tenantId: number
}) {
  const nom = String(body?.nom || '').trim()
  if (!nom) throw httpError(400, "Le champ 'nom' est requis")

  return prisma.client.create({
    data: {
      tenant_id: tenantId,
      nom,
      prenom: body?.prenom ? String(body.prenom).trim() : null,
      email: body?.email ? String(body.email).trim() : null,
      telephone: body?.telephone ? String(body.telephone).trim() : null,
      adresse: body?.adresse ? String(body.adresse).trim() : null,
    },
    select: {
      id_client: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
    },
  })
}
