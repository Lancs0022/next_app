import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

// ─── Types ────────────────────────────────────────────────────────────────────

export type AbonnementStatut = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type SouscriptionStatut = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE'

// ─── Abonnements (offres catalogue) ──────────────────────────────────────────

export async function listAbonnements(tenantId: number) {
  const rows = await prisma.abonnement.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { souscriptions: true } },
      souscriptions: {
        where: { statut: 'ACTIVE', canceled_at: null },
        select: { id_souscription_abonnement: true },
      },
    },
  })

  return {
    data: rows.map((r) => ({
      id_abonnement:      r.id_abonnement,
      tenant_id:          r.tenant_id,
      nom:                r.nom,
      description:        r.description,
      montant:            Number(r.montant),
      periodicite:        r.periodicite,
      statut:             r.statut as AbonnementStatut,
      created_at:         r.created_at,
      modified_at:        r.modified_at,
      nb_souscriptions:        r._count.souscriptions,
      nb_souscriptions_actives: r.souscriptions.length,
    })),
  }
}

export async function getAbonnement(id: number, tenantId: number) {
  const row = await prisma.abonnement.findFirst({
    where: { id_abonnement: id, tenant_id: tenantId },
    include: {
      _count: { select: { souscriptions: true } },
      souscriptions: {
        orderBy: { created_at: 'desc' },
        include: {
          echeances: {
            where: { canceled_at: null },
            orderBy: { periode_debut: 'desc' },
            take: 1,
            select: { periode_debut: true, periode_fin: true, statut: true, montant: true },
          },
        },
      },
    },
  })
  if (!row) throw httpError(404, 'Offre non trouvée')

  // Résoudre les noms de collaborateurs en batch
  const collabIds = [...new Set(row.souscriptions.map(s => s.id_collaborateur))]
  const collabs = collabIds.length > 0
    ? await prisma.collaborateur.findMany({
        where: { id_collaborateur: { in: collabIds } },
        select: { id_collaborateur: true, nom: true, prenom: true },
      })
    : []
  const collabMap = new Map(collabs.map(c => [c.id_collaborateur, c]))

  return {
    data: {
      id_abonnement:  row.id_abonnement,
      tenant_id:      row.tenant_id,
      nom:            row.nom,
      description:    row.description,
      montant:        Number(row.montant),
      periodicite:    row.periodicite,
      statut:         row.statut as AbonnementStatut,
      created_by:     row.created_by,
      created_at:     row.created_at,
      modified_by:    row.modified_by,
      modified_at:    row.modified_at,
      nb_souscriptions: row._count.souscriptions,
      souscriptions: row.souscriptions.map((s) => {
        const c = collabMap.get(s.id_collaborateur)
        const e = s.echeances[0] ?? null
        return {
          id_souscription_abonnement: s.id_souscription_abonnement,
          id_collaborateur:  s.id_collaborateur,
          collaborateur_nom: c ? `${c.nom}${c.prenom ? ` ${c.prenom}` : ''}` : `#${s.id_collaborateur}`,
          montant:           Number(s.montant),
          renouvellement_auto: s.renouvellement_auto,
          date_debut:        s.date_debut,
          date_fin:          s.date_fin,
          statut:            s.statut as SouscriptionStatut,
          canceled_at:       s.canceled_at,
          prochaine_echeance: e ? {
            periode_debut: e.periode_debut,
            periode_fin:   e.periode_fin,
            statut:        e.statut,
            montant:       Number(e.montant),
          } : null,
        }
      }),
    },
  }
}

export async function createAbonnement({
  body,
  tenantId,
  userId,
}: {
  body: Record<string, unknown>
  tenantId: number
  userId: number
}) {
  const nom        = typeof body.nom === 'string' ? body.nom.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() || null : null
  const montant    = Number(body.montant)
  const periodicite = typeof body.periodicite === 'string' ? body.periodicite.trim() : ''

  if (!nom)             throw httpError(400, "'nom' est requis")
  if (!montant || montant <= 0) throw httpError(400, "'montant' doit être > 0")
  if (!periodicite)     throw httpError(400, "'periodicite' est requise")

  const PERIODICITES = ['mensuel', 'trimestriel', 'annuel', 'ponctuel']
  if (!PERIODICITES.includes(periodicite)) {
    throw httpError(400, `'periodicite' doit être parmi : ${PERIODICITES.join(', ')}`)
  }

  const row = await prisma.abonnement.create({
    data: {
      tenant_id:   tenantId,
      nom,
      description,
      montant,
      periodicite,
      statut:      'ACTIVE',
      created_by:  userId,
    },
  })

  return { data: { ...row, montant: Number(row.montant) } }
}

export async function updateAbonnementStatut({
  id,
  tenantId,
  statut,
  userId,
}: {
  id: number
  tenantId: number
  statut: AbonnementStatut
  userId: number
}) {
  const row = await prisma.abonnement.findFirst({
    where: { id_abonnement: id, tenant_id: tenantId },
    include: { _count: { select: { souscriptions: true } } },
  })
  if (!row) throw httpError(404, 'Offre non trouvée')

  // Archivage bloqué si des souscriptions actives existent
  if (statut === 'ARCHIVED') {
    const nbActives = await prisma.souscriptionAbonnement.count({
      where: {
        id_abonnement: id,
        statut: 'ACTIVE',
        canceled_at: null,
      },
    })
    if (nbActives > 0) {
      throw httpError(
        409,
        `Impossible d'archiver : ${nbActives} souscription(s) active(s). Terminez-les d'abord.`
      )
    }
  }

  const updated = await prisma.abonnement.update({
    where: { id_abonnement: id },
    data: { statut, modified_by: userId, modified_at: new Date() },
  })
  return { data: { ...updated, montant: Number(updated.montant) } }
}

export async function deleteAbonnement({
  id,
  tenantId,
}: {
  id: number
  tenantId: number
}) {
  const row = await prisma.abonnement.findFirst({
    where: { id_abonnement: id, tenant_id: tenantId },
    include: { _count: { select: { souscriptions: true } } },
  })
  if (!row) throw httpError(404, 'Offre non trouvée')

  // Suppression physique uniquement si aucune souscription n'a jamais existé
  if (row._count.souscriptions > 0) {
    throw httpError(
      409,
      `Suppression impossible : cette offre a eu ${row._count.souscriptions} souscription(s). Utilisez l'archivage.`
    )
  }

  await prisma.abonnement.delete({ where: { id_abonnement: id } })
  return { success: true }
}

// ─── Souscriptions ────────────────────────────────────────────────────────────

export async function listSouscriptions({
  tenantId,
  statut,
}: {
  tenantId: number
  statut?: SouscriptionStatut
}) {
  const where = {
    tenant_id: tenantId,
    ...(statut ? { statut } : {}),
  }

  const rows = await prisma.souscriptionAbonnement.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      abonnement: { select: { nom: true, periodicite: true, montant: true, statut: true } },
      echeances: {
        where: { canceled_at: null },
        orderBy: { periode_debut: 'desc' },
        select: {
          id_echeance_abonnement: true,
          periode_debut: true,
          periode_fin: true,
          statut: true,
          montant: true,
          paiements: {
            where: { canceled_at: null },
            select: {
              id_paiement_abonnement: true,
              montant: true,
              date_paiement: true,
              id_transaction_financiere: true,
            },
          },
        },
      },
    },
  })

  // Résoudre les noms de collaborateurs en batch — pas de N+1
  const collabIds = [...new Set(rows.map(r => r.id_collaborateur))]
  const collabs = collabIds.length > 0
    ? await prisma.collaborateur.findMany({
        where: { id_collaborateur: { in: collabIds } },
        select: { id_collaborateur: true, nom: true, prenom: true },
      })
    : []
  const collabMap = new Map(collabs.map(c => [c.id_collaborateur, c]))

  return {
    data: rows.map((s) => {
      const allEchs = s.echeances.map((ech) => {
        const montantPaye = ech.paiements.reduce((acc, p) => acc + Number(p.montant), 0)
        return {
          id_echeance_abonnement: ech.id_echeance_abonnement,
          periode_debut: ech.periode_debut,
          periode_fin: ech.periode_fin,
          statut: ech.statut,
          montant: Number(ech.montant),
          montant_paye: montantPaye,
          reste: Math.max(0, Number(ech.montant) - montantPaye),
          date_paiement: ech.paiements[0]?.date_paiement ?? null,
          paiements: ech.paiements.map(p => ({
            id_paiement_abonnement: p.id_paiement_abonnement,
            montant: Number(p.montant),
            date_paiement: p.date_paiement,
            id_transaction_financiere: p.id_transaction_financiere,
          })),
          _type: 'ech' as const,
          id_souscription: s.id_souscription_abonnement,
        }
      })

      const echeance = s.echeances[0] ?? null
      const montantPaye = echeance
        ? echeance.paiements.reduce((acc, p) => acc + Number(p.montant), 0)
        : null
      const collab = collabMap.get(s.id_collaborateur)
      const collaborateur_nom = collab
        ? `${collab.nom}${collab.prenom ? ` ${collab.prenom}` : ''}`
        : `#${s.id_collaborateur}`

      return {
        id_souscription_abonnement: s.id_souscription_abonnement,
        tenant_id:              s.tenant_id,
        id_abonnement:          s.id_abonnement,
        id_collaborateur:       s.id_collaborateur,
        collaborateur_nom,
        abonnement_nom:         s.abonnement.nom,
        abonnement_periodicite: s.abonnement.periodicite,
        abonnement_statut:      s.abonnement.statut,
        montant:                Number(s.montant),
        renouvellement_auto:    s.renouvellement_auto,
        date_debut:             s.date_debut,
        date_fin:               s.date_fin,
        statut:                 s.statut as SouscriptionStatut,
        canceled_at:            s.canceled_at,
        created_at:             s.created_at,
        echeances:              allEchs,
        prochaine_echeance: echeance
          ? {
              id:            echeance.id_echeance_abonnement,
              periode_debut: echeance.periode_debut,
              periode_fin:   echeance.periode_fin,
              statut:        echeance.statut,
              montant_du:    Number(echeance.montant),
              montant_paye:  montantPaye,
              reste:         Number(echeance.montant) - (montantPaye ?? 0),
            }
          : null,
      }
    }),
  }
}

// ─── Création de souscription ─────────────────────────────────────────────────

export async function createSouscription({
  body,
  tenantId,
  userId,
}: {
  body: Record<string, unknown>
  tenantId: number
  userId: number
}) {
  const id_abonnement    = Number(body.id_abonnement)
  const id_collaborateur = Number(body.id_collaborateur)
  const montant          = Number(body.montant)
  const date_debut       = body.date_debut ? new Date(String(body.date_debut)) : new Date()
  const date_fin         = body.date_fin   ? new Date(String(body.date_fin))   : null
  const renouvellement_auto = body.renouvellement_auto !== false

  if (!id_abonnement || !Number.isFinite(id_abonnement))
    throw httpError(400, "'id_abonnement' est requis")
  if (!id_collaborateur || !Number.isFinite(id_collaborateur))
    throw httpError(400, "'id_collaborateur' est requis")
  if (!montant || montant <= 0)
    throw httpError(400, "'montant' doit être > 0")
  if (isNaN(date_debut.getTime()))
    throw httpError(400, "'date_debut' invalide")
  if (date_fin && isNaN(date_fin.getTime()))
    throw httpError(400, "'date_fin' invalide")
  if (date_fin && date_fin <= date_debut)
    throw httpError(400, "'date_fin' doit être postérieure à 'date_debut'")

  // Vérifier que l'offre existe, appartient au tenant et est ACTIVE
  const offre = await prisma.abonnement.findFirst({
    where: { id_abonnement, tenant_id: tenantId },
  })
  if (!offre) throw httpError(404, 'Offre introuvable')
  if (offre.statut !== 'ACTIVE')
    throw httpError(409, `Impossible de souscrire : l'offre "${offre.nom}" est ${offre.statut === 'INACTIVE' ? 'inactive' : 'archivée'}`)

  // Vérifier que le collaborateur existe et appartient au tenant
  const collab = await prisma.collaborateur.findFirst({
    where: { id_collaborateur, tenant_id: tenantId },
  })
  if (!collab) throw httpError(404, 'Collaborateur introuvable')

  // ── Garde-fou chevauchement ────────────────────────────────────────────────
  // Règle V1 : un même collaborateur + une même offre ne peuvent pas avoir deux
  // souscriptions dont les périodes se chevauchent.
  // Les souscriptions ANNULEE et TERMINEE ne bloquent pas.
  // Ce contrôle applicatif protège l'UX ; la contrainte DB (EXCLUDE) protège
  // contre les races concurrentes.
  //
  // Chevauchement : [date_debut_A, date_fin_A) ∩ [date_debut_B, date_fin_B) ≠ ∅
  // Équivalent SQL : NOT (A.date_fin <= B.date_debut OR B.date_fin <= A.date_debut)
  // Où NULL (pas de fin) = +infinity
  const chevauchement = await prisma.souscriptionAbonnement.findFirst({
    where: {
      tenant_id: tenantId,
      id_abonnement,
      id_collaborateur,
      canceled_at: null,
      statut: { notIn: ['ANNULEE', 'TERMINEE'] },
      // date_debut de l'existant < date_fin demandée (ou +inf si nulle)
      date_debut: date_fin ? { lt: date_fin } : undefined,
      // date_fin de l'existant > date_debut demandée (ou existant sans fin → chevauche toujours)
      OR: [
        { date_fin: null },               // souscription existante sans date de fin
        { date_fin: { gt: date_debut } },  // ou qui se termine après notre début
      ],
    },
    select: { id_souscription_abonnement: true, date_debut: true, date_fin: true },
  })

  if (chevauchement) {
    const debut = chevauchement.date_debut.toLocaleDateString('fr-FR')
    const fin   = chevauchement.date_fin
      ? chevauchement.date_fin.toLocaleDateString('fr-FR')
      : 'sans date de fin'
    throw httpError(
      409,
      `Ce collaborateur a déjà une souscription active à cette offre sur une période qui se chevauche (${debut} → ${fin}). Résiliez ou terminez la souscription existante avant d'en créer une nouvelle.`
    )
  }

  // ── Création avec protection contre la race condition ────────────────────────
  // Si deux requêtes passent le findFirst simultanément, la contrainte EXCLUDE
  // PostgreSQL rejette la seconde avec P2002. On l'intercepte ici pour retourner
  // un 409 avec message métier lisible plutôt qu'un 500 Prisma.
  let row
  try {
    row = await prisma.souscriptionAbonnement.create({
      data: {
        tenant_id:         tenantId,
        id_abonnement,
        id_collaborateur,
        montant,
        renouvellement_auto,
        date_debut,
        date_fin,
        statut:            'ACTIVE',
        created_by:        userId,
      },
      include: {
        abonnement: { select: { nom: true, periodicite: true } },
      },
    })
  } catch (e: unknown) {
    const prismaErr = e as { code?: string }
    if (prismaErr.code === 'P2002') {
      // Violation de la contrainte EXCLUDE (race concurrente)
      throw httpError(
        409,
        `Ce collaborateur a déjà une souscription active à cette offre sur une période qui se chevauche. Résiliez ou terminez la souscription existante avant d'en créer une nouvelle.`
      )
    }
    throw e
  }

  return {
    data: {
      id_souscription_abonnement: row.id_souscription_abonnement,
      id_abonnement:       row.id_abonnement,
      id_collaborateur:    row.id_collaborateur,
      collaborateur_nom:   `${collab.nom}${collab.prenom ? ` ${collab.prenom}` : ''}`,
      abonnement_nom:      row.abonnement.nom,
      montant:             Number(row.montant),
      renouvellement_auto: row.renouvellement_auto,
      date_debut:          row.date_debut,
      date_fin:            row.date_fin,
      statut:              row.statut,
      created_at:          row.created_at,
    },
  }
}

// ─── Modification du tarif d'une souscription ─────────────────────────────────
// Le nouveau tarif s'applique aux futures échéances uniquement.
// Les échéances et paiements existants sont conservés intacts.

export async function updateSouscriptionTarif({
  id,
  tenantId,
  montant,
  userId,
}: {
  id: number
  tenantId: number
  montant: number
  userId: number
}) {
  if (!montant || montant <= 0) throw httpError(400, "'montant' doit être > 0")

  const row = await prisma.souscriptionAbonnement.findFirst({
    where: { id_souscription_abonnement: id, tenant_id: tenantId },
  })
  if (!row) throw httpError(404, 'Souscription introuvable')
  if (row.canceled_at) throw httpError(409, 'Impossible de modifier une souscription annulée')
  if (row.statut === 'TERMINEE') throw httpError(409, 'Impossible de modifier une souscription terminée')

  const ancien_montant = Number(row.montant)

  const updated = await prisma.souscriptionAbonnement.update({
    where: { id_souscription_abonnement: id },
    data: { montant, modified_by: userId, modified_at: new Date() },
  })

  return {
    data: {
      id_souscription_abonnement: updated.id_souscription_abonnement,
      ancien_montant,
      nouveau_montant: Number(updated.montant),
      note: 'Le nouveau tarif s\'applique aux futures échéances. Les échéances et paiements existants ne sont pas modifiés.',
    },
  }
}

// ─── Changement de statut d'une souscription ──────────────────────────────────
// TERMINEE  : date_fin = aujourd'hui, renouvellement_auto = false
// ANNULEE   : canceled_at = maintenant, canceled_by = userId
// SUSPENDUE : statut seul, sans toucher à date_fin ni canceled_at

export async function updateSouscriptionStatut({
  id,
  tenantId,
  statut,
  userId,
}: {
  id: number
  tenantId: number
  statut: SouscriptionStatut
  userId: number
}) {
  const row = await prisma.souscriptionAbonnement.findFirst({
    where: { id_souscription_abonnement: id, tenant_id: tenantId },
  })
  if (!row) throw httpError(404, 'Souscription introuvable')
  if (row.canceled_at) throw httpError(409, 'Souscription déjà annulée')
  if (row.statut === 'TERMINEE' && statut !== 'ACTIVE')
    throw httpError(409, "Une souscription terminée ne peut être que réactivée (ACTIVE)")

  const STATUTS: SouscriptionStatut[] = ['ACTIVE', 'SUSPENDUE', 'TERMINEE', 'ANNULEE']
  if (!STATUTS.includes(statut)) throw httpError(400, `statut invalide : ${statut}`)

  const data: Record<string, unknown> = {
    statut,
    modified_by: userId,
    modified_at: new Date(),
  }

  if (statut === 'TERMINEE') {
    data.date_fin = new Date()
    data.renouvellement_auto = false
  }

  if (statut === 'ANNULEE') {
    data.canceled_at = new Date()
    data.canceled_by = userId
  }

  const updated = await prisma.souscriptionAbonnement.update({
    where: { id_souscription_abonnement: id },
    data,
  })

  return {
    data: {
      id_souscription_abonnement: updated.id_souscription_abonnement,
      statut: updated.statut,
      canceled_at: updated.canceled_at,
      date_fin: updated.date_fin,
    },
  }
}

// ─── Détail complet d'une souscription ────────────────────────────────────────

export async function getSouscription(id: number, tenantId: number) {
  const row = await prisma.souscriptionAbonnement.findFirst({
    where: { id_souscription_abonnement: id, tenant_id: tenantId },
    include: {
      abonnement: { select: { id_abonnement: true, nom: true, periodicite: true, statut: true, montant: true } },
      echeances: {
        orderBy: { periode_debut: 'desc' },
        include: {
          paiements: {
            orderBy: { date_paiement: 'desc' },
            select: {
              id_paiement_abonnement: true,
              montant: true,
              date_paiement: true,
              canceled_at: true,
              canceled_by: true,
              created_by: true,
              created_at: true,
            },
          },
        },
      },
    },
  })
  if (!row) throw httpError(404, 'Souscription introuvable')

  const collab = await prisma.collaborateur.findFirst({
    where: { id_collaborateur: row.id_collaborateur },
    select: { nom: true, prenom: true },
  })

  return {
    data: {
      id_souscription_abonnement: row.id_souscription_abonnement,
      id_collaborateur:   row.id_collaborateur,
      collaborateur_nom:  collab ? `${collab.nom}${collab.prenom ? ` ${collab.prenom}` : ''}` : `#${row.id_collaborateur}`,
      id_abonnement:      row.id_abonnement,
      abonnement_nom:     row.abonnement.nom,
      abonnement_periodicite: row.abonnement.periodicite,
      abonnement_statut:  row.abonnement.statut,
      montant_catalogue:  Number(row.abonnement.montant),
      montant:            Number(row.montant),
      renouvellement_auto: row.renouvellement_auto,
      date_debut:         row.date_debut,
      date_fin:           row.date_fin,
      statut:             row.statut as SouscriptionStatut,
      canceled_at:        row.canceled_at,
      canceled_by:        row.canceled_by,
      created_at:         row.created_at,
      modified_at:        row.modified_at,
      echeances: row.echeances.map(e => {
        const paiementsActifs = e.paiements.filter(p => !p.canceled_at)
        const montant_paye    = paiementsActifs.reduce((acc, p) => acc + Number(p.montant), 0)
        return {
          id_echeance_abonnement: e.id_echeance_abonnement,
          montant:       Number(e.montant),
          periode_debut: e.periode_debut,
          periode_fin:   e.periode_fin,
          statut:        e.statut,
          canceled_at:   e.canceled_at,
          montant_paye,
          reste:         Number(e.montant) - montant_paye,
          paiements: e.paiements.map(p => ({
            id_paiement_abonnement: p.id_paiement_abonnement,
            montant:      Number(p.montant),
            date_paiement: p.date_paiement,
            canceled_at:  p.canceled_at,
            canceled_by:  p.canceled_by,
            created_by:   p.created_by,
            created_at:   p.created_at,
          })),
        }
      }),
    },
  }
}

// ─── Génération manuelle d'une échéance ───────────────────────────────────────
// Le montant est un snapshot figé du tarif applicable au moment de la génération.

export async function createEcheance({
  body,
  tenantId,
  userId,
}: {
  body: Record<string, unknown>
  tenantId: number
  userId: number
}) {
  const id_souscription_abonnement = Number(body.id_souscription_abonnement)
  const montant       = Number(body.montant)
  const periode_debut = body.periode_debut ? new Date(String(body.periode_debut)) : null
  const periode_fin   = body.periode_fin   ? new Date(String(body.periode_fin))   : null

  if (!id_souscription_abonnement || !Number.isFinite(id_souscription_abonnement))
    throw httpError(400, "'id_souscription_abonnement' est requis")
  if (!montant || montant <= 0)
    throw httpError(400, "'montant' doit être > 0")
  if (!periode_debut || isNaN(periode_debut.getTime()))
    throw httpError(400, "'periode_debut' invalide")
  if (!periode_fin || isNaN(periode_fin.getTime()))
    throw httpError(400, "'periode_fin' invalide")
  if (periode_fin <= periode_debut)
    throw httpError(400, "'periode_fin' doit être postérieure à 'periode_debut'")

  const souscription = await prisma.souscriptionAbonnement.findFirst({
    where: { id_souscription_abonnement, tenant_id: tenantId },
  })
  if (!souscription) throw httpError(404, 'Souscription introuvable')
  if (souscription.canceled_at) throw httpError(409, 'Impossible d\'ajouter une échéance à une souscription annulée')
  if (souscription.statut === 'TERMINEE') throw httpError(409, 'Impossible d\'ajouter une échéance à une souscription terminée')

  const row = await prisma.echeanceAbonnement.create({
    data: {
      tenant_id:                  tenantId,
      id_souscription_abonnement,
      montant,
      periode_debut,
      periode_fin,
      statut:                     'en_attente',
      created_by:                 userId,
    },
  })

  return {
    data: {
      id_echeance_abonnement: row.id_echeance_abonnement,
      id_souscription_abonnement: row.id_souscription_abonnement,
      montant:       Number(row.montant),
      periode_debut: row.periode_debut,
      periode_fin:   row.periode_fin,
      statut:        row.statut,
      created_at:    row.created_at,
    },
  }
}

// ─── Paiements groupés ────────────────────────────────────────────────────────
//
// Architecture retenue :
//   N PaiementAbonnement → 1 TransactionFinanciere(IN)
//
//   TransactionFinanciere:
//     type          = IN
//     montant       = SUM(lignes)
//     source_module = 'ABONNEMENT'
//     source_id     = id_souscription_abonnement
//
//   Chaque PaiementAbonnement porte id_transaction_financiere → même TF.
//
// Règles V1 :
//   - Toutes les échéances doivent appartenir à la même souscription
//   - Pas d'excédent : montant demandé ≤ restant dû de chaque échéance
//   - Paiements partiels autorisés
//   - Annulation uniquement au niveau du groupe (id_transaction_financiere)

interface LignePaiement {
  id_echeance_abonnement: number
  montant: number
}

export async function createPaiements({
  body,
  tenantId,
  userId,
}: {
  body: Record<string, unknown>
  tenantId: number
  userId: number
}) {
  // ── Parse et validation basique ──────────────────────────────────────────────
  const lignesRaw = body.lignes
  if (!Array.isArray(lignesRaw) || lignesRaw.length === 0)
    throw httpError(400, "'lignes' doit contenir au moins une ligne")

  const date_str = typeof body.date_paiement === 'string' ? body.date_paiement : null
  const date_paiement = date_str ? new Date(date_str) : new Date()
  if (isNaN(date_paiement.getTime()))
    throw httpError(400, "'date_paiement' invalide")

  const lignes: LignePaiement[] = lignesRaw.map((l: unknown, i: number) => {
    const item = l as Record<string, unknown>
    const id = Number(item.id_echeance_abonnement)
    const montant = Number(item.montant)
    if (!id || !Number.isFinite(id))
      throw httpError(400, `Ligne ${i + 1} : 'id_echeance_abonnement' invalide`)
    if (!montant || montant <= 0)
      throw httpError(400, `Ligne ${i + 1} : 'montant' doit être > 0`)
    return { id_echeance_abonnement: id, montant }
  })

  // Doublons dans la requête
  const idsSet = new Set(lignes.map(l => l.id_echeance_abonnement))
  if (idsSet.size !== lignes.length)
    throw httpError(400, "La même échéance apparaît plusieurs fois dans 'lignes'")

  // ── Chargement et validation des échéances ────────────────────────────────────
  const echeances = await prisma.echeanceAbonnement.findMany({
    where: {
      id_echeance_abonnement: { in: [...idsSet] },
      tenant_id: tenantId,
    },
    include: {
      paiements: { where: { canceled_at: null }, select: { montant: true } },
      souscription: { select: { id_souscription_abonnement: true } },
    },
  })

  if (echeances.length !== lignes.length)
    throw httpError(404, "Une ou plusieurs échéances sont introuvables ou n'appartiennent pas à ce tenant")

  // Toutes les échéances doivent appartenir à la même souscription (règle V1)
  const souscriptionIds = new Set(echeances.map(e => e.id_souscription_abonnement))
  if (souscriptionIds.size > 1)
    throw httpError(400, "Toutes les échéances doivent appartenir à la même souscription (règle V1)")
  const id_souscription_abonnement = [...souscriptionIds][0]

  const echeanceMap = new Map(echeances.map(e => [e.id_echeance_abonnement, e]))

  for (const ligne of lignes) {
    const e = echeanceMap.get(ligne.id_echeance_abonnement)!
    if (e.canceled_at)
      throw httpError(409, `Échéance #${e.id_echeance_abonnement} est annulée`)
    if (e.statut === 'payee')
      throw httpError(409, `Échéance #${e.id_echeance_abonnement} est déjà intégralement payée`)
    const deja_paye = e.paiements.reduce((acc, p) => acc + Number(p.montant), 0)
    const reste     = Number(e.montant) - deja_paye
    if (ligne.montant > reste + 0.001) // tolérance flottants
      throw httpError(400, `Échéance #${e.id_echeance_abonnement} : montant demandé (${ligne.montant}) dépasse le restant dû (${reste})`)
  }

  const montant_total = lignes.reduce((acc, l) => acc + l.montant, 0)

  // ── Catégorie financière ──────────────────────────────────────────────────────
  const cat = await prisma.financialCategory.findFirst({
    where: { tenant_id: tenantId, type: { in: ['IN', 'BOTH'] } },
    select: { id_category: true },
  })

  // ── Transaction atomique ──────────────────────────────────────────────────────
  const result = await prisma.$transaction(async (tx) => {
    // 1. Une seule TransactionFinanciere pour le groupe
    let id_transaction_financiere: number | null = null
    if (cat) {
      const tf = await tx.transactionFinanciere.create({
        data: {
          tenant_id:               tenantId,
          type:                    'IN',
          montant:                 montant_total,
          id_categorie_financiere: cat.id_category,
          source_module:           'ABONNEMENT',
          source_id:               id_souscription_abonnement,
          description:             `Paiement abonnement — ${lignes.length} échéance(s) — souscription #${id_souscription_abonnement}`,
          created_by:              userId,
        },
      })
      id_transaction_financiere = tf.id_transaction_financiere
    }

    // 2. N PaiementAbonnement, un par ligne
    const paiements_crees: { id_paiement_abonnement: number; id_echeance: number; montant: number }[] = []
    for (const ligne of lignes) {
      const p = await tx.paiementAbonnement.create({
        data: {
          tenant_id:                tenantId,
          id_echeance_abonnement:   ligne.id_echeance_abonnement,
          montant:                  ligne.montant,
          date_paiement,
          id_transaction_financiere,
          created_by:               userId,
        },
      })
      paiements_crees.push({
        id_paiement_abonnement: p.id_paiement_abonnement,
        id_echeance:            ligne.id_echeance_abonnement,
        montant:                Number(p.montant),
      })
    }

    // 3. Recalculer le statut de chaque échéance concernée
    for (const ligne of lignes) {
      const e     = echeanceMap.get(ligne.id_echeance_abonnement)!
      const avant = e.paiements.reduce((acc, p) => acc + Number(p.montant), 0)
      const apres = avant + ligne.montant
      const du    = Number(e.montant)
      const nouveau_statut =
        apres >= du - 0.001 ? 'payee'
        : apres > 0          ? 'partiellement_payee'
        : 'en_attente'

      await tx.echeanceAbonnement.update({
        where: { id_echeance_abonnement: ligne.id_echeance_abonnement },
        data: { statut: nouveau_statut, modified_at: new Date(), modified_by: userId },
      })
    }

    return { id_transaction_financiere, paiements_crees, montant_total }
  })

  return {
    data: {
      id_transaction_financiere:  result.id_transaction_financiere,
      id_souscription_abonnement,
      montant_total:              result.montant_total,
      date_paiement,
      nb_lignes:                  result.paiements_crees.length,
      paiements:                  result.paiements_crees,
    },
  }
}

// ─── Annulation d'un groupe de paiements ──────────────────────────────────────
// Annule toutes les lignes PaiementAbonnement associées à la même TF.
// Crée une seule TransactionFinanciere(OUT) compensatoire.
// La TF IN d'origine est conservée intacte — jamais modifiée.
// Une annulation partielle de groupe est hors scope V1 → rejetée.

export async function cancelPaiementGroupe({
  id_transaction_financiere,
  tenantId,
  userId,
}: {
  id_transaction_financiere: number
  tenantId: number
  userId: number
}) {
  if (!id_transaction_financiere || !Number.isFinite(id_transaction_financiere))
    throw httpError(400, "'id_transaction_financiere' invalide")

  // Charger la TF originale
  const tf = await prisma.transactionFinanciere.findFirst({
    where: { id_transaction_financiere, tenant_id: tenantId, source_module: 'ABONNEMENT', type: 'IN' },
  })
  if (!tf) throw httpError(404, 'Transaction de paiement introuvable')

  // Charger toutes les lignes du groupe
  const lignes = await prisma.paiementAbonnement.findMany({
    where: { id_transaction_financiere, tenant_id: tenantId },
    include: {
      echeance: {
        include: {
          paiements: { where: { canceled_at: null }, select: { id_paiement_abonnement: true, montant: true } },
        },
      },
    },
  })
  if (lignes.length === 0)
    throw httpError(404, 'Aucune ligne de paiement trouvée pour ce groupe')

  // Vérifier qu'aucune ligne n'est déjà annulée — sinon le groupe est déjà traité
  const deja_annulees = lignes.filter(l => l.canceled_at)
  if (deja_annulees.length === lignes.length)
    throw httpError(409, 'Ce groupe de paiement est déjà entièrement annulé')
  if (deja_annulees.length > 0)
    throw httpError(409, `Annulation partielle de groupe hors scope V1 : ${deja_annulees.length}/${lignes.length} ligne(s) déjà annulées`)

  const montant_annule = lignes.reduce((acc, l) => acc + Number(l.montant), 0)
  const id_souscription_abonnement = Number(tf.source_id)

  const cat = await prisma.financialCategory.findFirst({
    where: { tenant_id: tenantId, type: { in: ['OUT', 'BOTH'] } },
    select: { id_category: true },
  })

  await prisma.$transaction(async (tx) => {
    // 1. Annuler toutes les lignes
    await tx.paiementAbonnement.updateMany({
      where: { id_transaction_financiere, tenant_id: tenantId },
      data: { canceled_at: new Date(), canceled_by: userId, modified_at: new Date(), modified_by: userId },
    })

    // 2. Recalculer le statut de chaque échéance concernée
    const echeanceIds = [...new Set(lignes.map(l => l.id_echeance_abonnement))]
    for (const id_echeance of echeanceIds) {
      const echeance = lignes.find(l => l.id_echeance_abonnement === id_echeance)!.echeance
      // Montant restant actif après annulation des lignes de CE groupe
      const reste_actifs = echeance.paiements
        .filter(p => !lignes.some(l => l.id_paiement_abonnement === p.id_paiement_abonnement))
        .reduce((acc, p) => acc + Number(p.montant), 0)
      const montant_du = Number(echeance.montant)
      const nouveau_statut =
        reste_actifs >= montant_du - 0.001 ? 'payee'
        : reste_actifs > 0                  ? 'partiellement_payee'
        : 'en_attente'

      await tx.echeanceAbonnement.update({
        where: { id_echeance_abonnement: id_echeance },
        data: { statut: nouveau_statut, modified_at: new Date(), modified_by: userId },
      })
    }

    // 3. Une seule TF compensatoire
    if (cat) {
      await tx.transactionFinanciere.create({
        data: {
          tenant_id:               tenantId,
          type:                    'OUT',
          montant:                 montant_annule,
          id_categorie_financiere: cat.id_category,
          source_module:           'ABONNEMENT',
          source_id:               id_souscription_abonnement,
          description:             `Annulation paiement groupe TF#${id_transaction_financiere} — souscription #${id_souscription_abonnement}`,
          created_by:              userId,
        },
      })
    }
  })

  return {
    data: {
      id_transaction_financiere,
      id_souscription_abonnement,
      montant_annule,
      nb_lignes_annulees: lignes.length,
    },
  }
}

// ─── Liste des paiements ──────────────────────────────────────────────────────

export async function listPaiements({ tenantId }: { tenantId: number }) {
  const rows = await prisma.paiementAbonnement.findMany({
    where: { tenant_id: tenantId },
    orderBy: { date_paiement: 'desc' },
    include: {
      echeance: {
        select: {
          id_echeance_abonnement: true,
          montant: true,
          periode_debut: true,
          periode_fin: true,
          statut: true,
          souscription: {
            select: {
              id_souscription_abonnement: true,
              id_collaborateur: true,
              montant: true,
              abonnement: { select: { nom: true, periodicite: true } },
            },
          },
        },
      },
    },
  })

  // Noms collaborateurs en batch
  const collabIds = [...new Set(rows.map(r => r.echeance.souscription.id_collaborateur))]
  const collabs = collabIds.length > 0
    ? await prisma.collaborateur.findMany({
        where: { id_collaborateur: { in: collabIds } },
        select: { id_collaborateur: true, nom: true, prenom: true },
      })
    : []
  const collabMap = new Map(collabs.map(c => [c.id_collaborateur, c]))

  return {
    data: rows.map(p => {
      const s = p.echeance.souscription
      const c = collabMap.get(s.id_collaborateur)
      return {
        id_paiement_abonnement:     p.id_paiement_abonnement,
        id_transaction_financiere:  p.id_transaction_financiere,
        id_echeance_abonnement:     p.id_echeance_abonnement,
        id_souscription_abonnement: s.id_souscription_abonnement,
        id_collaborateur:           s.id_collaborateur,
        collaborateur_nom:          c ? `${c.nom}${c.prenom ? ` ${c.prenom}` : ''}` : `#${s.id_collaborateur}`,
        abonnement_nom:             s.abonnement.nom,
        abonnement_periodicite:     s.abonnement.periodicite,
        montant:                    Number(p.montant),
        date_paiement:              p.date_paiement,
        periode_debut:              p.echeance.periode_debut,
        periode_fin:                p.echeance.periode_fin,
        echeance_statut:            p.echeance.statut,
        canceled_at:                p.canceled_at,
        canceled_by:                p.canceled_by,
        created_at:                 p.created_at,
        created_by:                 p.created_by,
      }
    }),
  }
}
