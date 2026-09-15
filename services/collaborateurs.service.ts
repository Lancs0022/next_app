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

  if (rows.length === 0) return { data: [] }

  // Charger en batch la situation d'abonnement de chaque collaborateur
  // Une seule requête pour tous les ids — pas de N+1
  const collabIds = rows.map(r => r.id_collaborateur)

  const souscriptions = await prisma.souscriptionAbonnement.findMany({
    where: {
      tenant_id: tenantId,
      id_collaborateur: { in: collabIds },
      canceled_at: null,
    },
    orderBy: { created_at: 'desc' },
    include: {
      abonnement: { select: { nom: true, periodicite: true } },
      echeances: {
        where: { canceled_at: null },
        orderBy: { periode_debut: 'desc' },
        take: 1,
        select: {
          statut: true,
          montant: true,
          periode_fin: true,
          paiements: {
            where: { canceled_at: null },
            select: { montant: true },
          },
        },
      },
    },
  })

  // Indexer par collaborateur — on garde uniquement la souscription la plus récente
  const souscriptionByCollab = new Map<number, typeof souscriptions[0]>()
  for (const s of souscriptions) {
    if (!souscriptionByCollab.has(s.id_collaborateur)) {
      souscriptionByCollab.set(s.id_collaborateur, s)
    }
  }

  const data = rows.map(r => {
    const s = souscriptionByCollab.get(r.id_collaborateur) ?? null
    const echeance = s?.echeances[0] ?? null
    const montantPaye = echeance
      ? echeance.paiements.reduce((acc, p) => acc + Number(p.montant), 0)
      : 0

    return {
      ...r,
      abonnement_situation: s
        ? {
            id_souscription_abonnement: s.id_souscription_abonnement,
            nom_offre:          s.abonnement.nom,
            periodicite:        s.abonnement.periodicite,
            montant_applicable: Number(s.montant),
            statut_souscription: s.statut,
            echeance_statut:    echeance?.statut ?? null,
            echeance_montant:   echeance ? Number(echeance.montant) : null,
            echeance_paye:      echeance ? montantPaye : null,
            echeance_reste:     echeance ? Number(echeance.montant) - montantPaye : null,
            echeance_fin:       echeance?.periode_fin ?? null,
          }
        : null,
    }
  })

  return { data }
}

// ─── Situation abonnement détaillée d'un collaborateur ───────────────────────

export async function getCollaborateurAbonnements(id: number, tenantId: number) {
  const collab = await prisma.collaborateur.findFirst({
    where: { id_collaborateur: id, tenant_id: tenantId },
    select: { id_collaborateur: true, nom: true, prenom: true },
  })
  if (!collab) throw httpError(404, 'Collaborateur non trouvé')

  const souscriptions = await prisma.souscriptionAbonnement.findMany({
    where: { id_collaborateur: id, tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      abonnement: { select: { id_abonnement: true, nom: true, periodicite: true, statut: true } },
      echeances: {
        orderBy: { periode_debut: 'desc' },
        select: {
          id_echeance_abonnement: true,
          montant: true,
          periode_debut: true,
          periode_fin: true,
          statut: true,
          canceled_at: true,
          paiements: {
            orderBy: { date_paiement: 'desc' },
            select: {
              id_paiement_abonnement: true,
              montant: true,
              date_paiement: true,
              canceled_at: true,
              created_by: true,
              created_at: true,
            },
          },
        },
      },
    },
  })

  return {
    data: {
      collaborateur: collab,
      souscriptions: souscriptions.map(s => ({
        id_souscription_abonnement: s.id_souscription_abonnement,
        id_abonnement:       s.id_abonnement,
        nom_offre:           s.abonnement.nom,
        periodicite:         s.abonnement.periodicite,
        statut_offre:        s.abonnement.statut,
        montant:             Number(s.montant),
        renouvellement_auto: s.renouvellement_auto,
        date_debut:          s.date_debut,
        date_fin:            s.date_fin,
        statut:              s.statut,
        canceled_at:         s.canceled_at,
        created_at:          s.created_at,
        echeances: s.echeances.map(e => ({
          id_echeance_abonnement: e.id_echeance_abonnement,
          montant:       Number(e.montant),
          periode_debut: e.periode_debut,
          periode_fin:   e.periode_fin,
          statut:        e.statut,
          canceled_at:   e.canceled_at,
          montant_paye:  e.paiements
            .filter(p => !p.canceled_at)
            .reduce((acc, p) => acc + Number(p.montant), 0),
          paiements: e.paiements.map(p => ({
            id_paiement_abonnement: p.id_paiement_abonnement,
            montant:        Number(p.montant),
            date_paiement:  p.date_paiement,
            canceled_at:    p.canceled_at,
            created_by:     p.created_by,
            created_at:     p.created_at,
          })),
        })),
      })),
    },
  }
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
