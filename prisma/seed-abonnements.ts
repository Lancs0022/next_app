/**
 * seed-abonnements.ts — Seed de validation fonctionnelle du module Abonnements
 *
 * Objectif : couvrir exhaustivement les cas normaux et limites identifiés
 * lors de la conception, pour validation UX/API.
 *
 * Ce seed est COMPLÉMENTAIRE au seed principal (seed.ts).
 * Il peut être exécuté seul : npx tsx prisma/seed-abonnements.ts
 *
 * IMPORTANT : Ce seed utilise :
 *   T1 = 1  → le tenant réel de l'application (admin@pejaa.com, Lancs0022@gmail.com)
 *              Les données seront visibles dans l'UI avec les comptes existants.
 *   T2 = 2  → tenant secondaire fictif pour valider l'isolation multi-tenant.
 *              Aucun utilisateur réel n'a le tenant 2.
 *
 * Pour T1, created_by = id de Lancs0022@gmail.com (super_admin du tenant 1).
 * Pour T2, on crée un utilisateur temporaire.
 *
 * Le seed crée ses propres collaborateurs dédiés aux abonnements (préfixe "ABO-")
 * pour ne pas polluer les collaborateurs du seed principal.
 *
 * Dates de référence : autour de septembre 2026
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter })

// ─── Constantes de tenant ──────────────────────────────────────────────────────

const T1 = 1   // Tenant réel — données visibles dans l'UI
const T2 = 2   // Tenant secondaire — isolation multi-tenant

// ─── Dates de référence déterministes ─────────────────────────────────────────

const D = {
  jan26:  new Date('2026-01-01'),
  fev26:  new Date('2026-02-01'),
  mar26:  new Date('2026-03-01'),
  avr26:  new Date('2026-04-01'),
  mai26:  new Date('2026-05-01'),
  juin26: new Date('2026-06-01'),
  juil26: new Date('2026-07-01'),
  aout26: new Date('2026-08-01'),
  sep26:  new Date('2026-09-01'),
  sep26f: new Date('2026-09-30'),
  oct26:  new Date('2026-10-01'),
  oct26f: new Date('2026-10-31'),
  nov26:  new Date('2026-11-01'),
  nov26f: new Date('2026-11-30'),
  dec26:  new Date('2026-12-01'),
  dec26f: new Date('2026-12-31'),
  jan27:  new Date('2027-01-01'),
  jan27f: new Date('2027-01-31'),
  q1_debut:  new Date('2026-01-01'), q1_fin:   new Date('2026-03-31'),
  q2_debut:  new Date('2026-04-01'), q2_fin:   new Date('2026-06-30'),
  q3_debut:  new Date('2026-07-01'), q3_fin:   new Date('2026-09-30'),
  q4_debut:  new Date('2026-10-01'), q4_fin:   new Date('2026-12-31'),
  an2026_debut: new Date('2026-01-01'), an2026_fin: new Date('2026-12-31'),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createTF(opts: {
  tenantId: number; type: 'IN' | 'OUT'; montant: number
  catId: number; idSouscription: number; userId: number; description: string
}) {
  const tf = await prisma.transactionFinanciere.create({
    data: {
      tenant_id: opts.tenantId, type: opts.type, montant: opts.montant,
      id_categorie_financiere: opts.catId, source_module: 'ABONNEMENT',
      source_id: opts.idSouscription, description: opts.description,
      created_by: opts.userId,
    },
  })
  return tf.id_transaction_financiere
}

async function createPaiement(opts: {
  tenantId: number; idEcheance: number; montant: number
  datePaiement: Date; idTF: number | null; userId: number
}) {
  return prisma.paiementAbonnement.create({
    data: {
      tenant_id: opts.tenantId, id_echeance_abonnement: opts.idEcheance,
      montant: opts.montant, date_paiement: opts.datePaiement,
      id_transaction_financiere: opts.idTF, created_by: opts.userId,
      created_at: opts.datePaiement,
    },
  })
}

async function recalcEcheance(idEcheance: number, montantDu: number, userId: number) {
  const paiements = await prisma.paiementAbonnement.findMany({
    where: { id_echeance_abonnement: idEcheance, canceled_at: null },
    select: { montant: true },
  })
  const paye = paiements.reduce((acc, p) => acc + Number(p.montant), 0)
  const statut =
    paye >= montantDu - 0.001 ? 'payee'
    : paye > 0                ? 'partiellement_payee'
    : 'en_attente'
  await prisma.echeanceAbonnement.update({
    where: { id_echeance_abonnement: idEcheance },
    data: { statut, modified_by: userId, modified_at: new Date() },
  })
  return statut
}

// ─── Nettoyage ciblé — ne touche QUE ce que ce seed a créé ────────────────────

async function cleanup() {
  // Nettoyage T2 complet (tenant fictif)
  const subsT2 = await prisma.souscriptionAbonnement.findMany({
    where: { tenant_id: T2 }, select: { id_souscription_abonnement: true },
  })
  if (subsT2.length > 0) {
    const subIds = subsT2.map(s => s.id_souscription_abonnement)
    const echs = await prisma.echeanceAbonnement.findMany({
      where: { id_souscription_abonnement: { in: subIds } }, select: { id_echeance_abonnement: true },
    })
    if (echs.length > 0) {
      await prisma.paiementAbonnement.deleteMany({ where: { id_echeance_abonnement: { in: echs.map(e => e.id_echeance_abonnement) } } })
      await prisma.echeanceAbonnement.deleteMany({ where: { id_souscription_abonnement: { in: subIds } } })
    }
  }
  await prisma.souscriptionAbonnement.deleteMany({ where: { tenant_id: T2 } })
  await prisma.abonnement.deleteMany({ where: { tenant_id: T2 } })
  await prisma.transactionFinanciere.deleteMany({ where: { tenant_id: T2, source_module: 'ABONNEMENT' } })
  await prisma.financialCategory.deleteMany({ where: { tenant_id: T2 } })
  await prisma.collaborateur.deleteMany({ where: { tenant_id: T2 } })
  await prisma.utilisateur.deleteMany({ where: { email: 'admin-abo-t2@pejaa.test' } })

  // Nettoyage T1 — seulement les offres/souscriptions créées par ce seed (préfixe ABO-)
  const abosT1 = await prisma.abonnement.findMany({
    where: { tenant_id: T1, nom: { startsWith: 'ABO-' } },
    select: { id_abonnement: true },
  })
  if (abosT1.length > 0) {
    const aboIds = abosT1.map(a => a.id_abonnement)
    const subsT1 = await prisma.souscriptionAbonnement.findMany({
      where: { tenant_id: T1, id_abonnement: { in: aboIds } },
      select: { id_souscription_abonnement: true },
    })
    if (subsT1.length > 0) {
      const subIds = subsT1.map(s => s.id_souscription_abonnement)
      const echs = await prisma.echeanceAbonnement.findMany({
        where: { id_souscription_abonnement: { in: subIds } }, select: { id_echeance_abonnement: true },
      })
      if (echs.length > 0) {
        await prisma.paiementAbonnement.deleteMany({ where: { id_echeance_abonnement: { in: echs.map(e => e.id_echeance_abonnement) } } })
        await prisma.echeanceAbonnement.deleteMany({ where: { id_souscription_abonnement: { in: subIds } } })
      }
    }
    await prisma.souscriptionAbonnement.deleteMany({ where: { tenant_id: T1, id_abonnement: { in: aboIds } } })
    await prisma.abonnement.deleteMany({ where: { id_abonnement: { in: aboIds } } })
  }
  // TF ABONNEMENT T1 créées par ce seed
  await prisma.transactionFinanciere.deleteMany({ where: { tenant_id: T1, source_module: 'ABONNEMENT' } })
  // Catégories financières ABO T1
  await prisma.financialCategory.deleteMany({ where: { tenant_id: T1, name: { startsWith: 'ABO-Seed' } } })
  // Collaborateurs ABO T1
  await prisma.collaborateur.deleteMany({ where: { tenant_id: T1, nom: { startsWith: 'ABO-' } } })
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[ABO-SEED] Démarrage…')

  await cleanup()
  console.log('[ABO-SEED] Nettoyage OK')

  // ── Récupérer l'id de l'admin T1 existant (Lancs0022 = super_admin) ──────────

  const adminT1 = await prisma.utilisateur.findUnique({
    where: { email: 'Lancs0022@gmail.com' },
    select: { id_utilisateur: true, tenant_id: true },
  })
  if (!adminT1) throw new Error('Utilisateur Lancs0022@gmail.com introuvable. Lancez d\'abord le seed principal.')
  const U1 = adminT1.id_utilisateur

  // ── Utilisateur T2 (tenant fictif isolation) ─────────────────────────────────

  const hash = await bcrypt.hash('Seed2026!', 10)
  const adminT2 = await prisma.utilisateur.upsert({
    where: { email: 'admin-abo-t2@pejaa.test' },
    update: { tenant_id: T2 },
    create: { tenant_id: T2, nom: 'Admin', prenom: 'T2', email: 'admin-abo-t2@pejaa.test', password_hash: hash, role: 'admin', actif: true },
  })
  const U2 = adminT2.id_utilisateur

  // ── Catégories financières ────────────────────────────────────────────────────

  const catInT1 = await prisma.financialCategory.create({
    data: { tenant_id: T1, name: 'ABO-Seed IN', type: 'IN', actif: true },
  })
  const catInT2 = await prisma.financialCategory.create({
    data: { tenant_id: T2, name: 'ABO-Seed IN', type: 'IN', actif: true },
  })

  // ── Collaborateurs T1 dédiés (préfixe ABO- pour nettoyage ciblé) ─────────────

  const [c1, c2, c3, c4] = await Promise.all([
    prisma.collaborateur.create({ data: { tenant_id: T1, nom: 'ABO-Rakoto',  prenom: 'Jean',  statut: 'actif', poste: 'Artisan'     } }),
    prisma.collaborateur.create({ data: { tenant_id: T1, nom: 'ABO-Miora',   prenom: 'Aina',  statut: 'actif', poste: 'Textile'     } }),
    prisma.collaborateur.create({ data: { tenant_id: T1, nom: 'ABO-Andry',   prenom: 'Fidy',  statut: 'actif', poste: 'Alimentaire' } }),
    prisma.collaborateur.create({ data: { tenant_id: T1, nom: 'ABO-Rasoa',   prenom: 'Marie', statut: 'actif', poste: 'Accessoires' } }),
  ])
  const cT2 = await prisma.collaborateur.create({ data: { tenant_id: T2, nom: 'ABO-Dupont', prenom: 'Paul', statut: 'actif' } })

  console.log('[ABO-SEED] Collaborateurs : 4 (T1) + 1 (T2)')

  // ── Offres (préfixe ABO- pour nettoyage ciblé) ───────────────────────────────

  const [aboPremium, aboStandard, aboTrimestrel, aboAnnuel, aboInactif, aboArchive] = await Promise.all([
    prisma.abonnement.create({ data: { tenant_id: T1, nom: 'ABO-Premium Mensuel',     description: 'Accès complet à toutes les fonctionnalités premium',   montant: 8000,  periodicite: 'mensuel',      statut: 'ACTIVE',   created_by: U1, created_at: D.jan26 } }),
    prisma.abonnement.create({ data: { tenant_id: T1, nom: 'ABO-Standard Mensuel',    description: 'Accès standard — tarif catalogue relevé de 5k→6k en mars', montant: 6000, periodicite: 'mensuel',   statut: 'ACTIVE',   created_by: U1, created_at: D.jan26, modified_by: U1, modified_at: D.mar26 } }),
    prisma.abonnement.create({ data: { tenant_id: T1, nom: 'ABO-Pro Trimestriel',     description: 'Abonnement professionnel par trimestre',                montant: 20000, periodicite: 'trimestriel', statut: 'ACTIVE',   created_by: U1, created_at: D.jan26 } }),
    prisma.abonnement.create({ data: { tenant_id: T1, nom: 'ABO-Annuel Complet',      description: 'Tout inclus — engagement annuel',                       montant: 60000, periodicite: 'annuel',      statut: 'ACTIVE',   created_by: U1, created_at: D.jan26 } }),
    prisma.abonnement.create({ data: { tenant_id: T1, nom: 'ABO-Offre Inactive',      description: 'Offre désactivée — nouvelles souscriptions bloquées',   montant: 7000,  periodicite: 'mensuel',      statut: 'INACTIVE', created_by: U1, created_at: D.jan26 } }),
    prisma.abonnement.create({ data: { tenant_id: T1, nom: 'ABO-Pack Archivé',        description: 'Conservé pour historique uniquement',                   montant: 4000,  periodicite: 'mensuel',      statut: 'ARCHIVED', created_by: U1, created_at: D.jan26 } }),
  ])
  const aboT2 = await prisma.abonnement.create({ data: { tenant_id: T2, nom: 'ABO-Offre T2', description: 'Offre tenant 2', montant: 3000, periodicite: 'mensuel', statut: 'ACTIVE', created_by: U2, created_at: D.jan26 } })

  console.log('[ABO-SEED] Offres : 6 (T1) + 1 (T2)')

  // ════════════════════════════════════════════════════════════════════════════
  // S1 — Rakoto / Premium Mensuel — ACTIVE, renouvellement auto, sans date de fin
  //   Juin+Juil+Août payés en 1 groupe (TF unique 24k)
  //   Septembre → prochaine échéance impayée
  // ════════════════════════════════════════════════════════════════════════════

  const sous1 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboPremium.id_abonnement,
    id_collaborateur: c1.id_collaborateur, montant: 8000,
    renouvellement_auto: true, date_debut: D.juin26, date_fin: null,
    statut: 'ACTIVE', created_by: U1, created_at: D.juin26,
  }})
  const S1 = sous1.id_souscription_abonnement

  const [e1_juin, e1_juil, e1_aout, e1_sep] = await Promise.all([
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S1, montant: 8000, periode_debut: D.juin26, periode_fin: new Date('2026-06-30'), statut: 'en_attente', created_by: U1, created_at: D.juin26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S1, montant: 8000, periode_debut: D.juil26, periode_fin: new Date('2026-07-31'), statut: 'en_attente', created_by: U1, created_at: D.juil26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S1, montant: 8000, periode_debut: D.aout26, periode_fin: new Date('2026-08-31'), statut: 'en_attente', created_by: U1, created_at: D.aout26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S1, montant: 8000, periode_debut: D.sep26,  periode_fin: D.sep26f,              statut: 'en_attente', created_by: U1, created_at: D.sep26  } }),
  ])

  // Paiement groupé 3 mois → 1 TF de 24 000
  const tfS1_g = await createTF({ tenantId: T1, type: 'IN', montant: 24000, catId: catInT1.id_category, idSouscription: S1, userId: U1, description: 'Paiement groupé Rakoto/Premium — juin+juil+août 2026 (3×8k)' })
  for (const e of [e1_juin, e1_juil, e1_aout]) {
    await createPaiement({ tenantId: T1, idEcheance: e.id_echeance_abonnement, montant: 8000, datePaiement: D.juin26, idTF: tfS1_g, userId: U1 })
    await recalcEcheance(e.id_echeance_abonnement, 8000, U1)
  }
  // Septembre reste impayée — prochaine échéance visible dans l'UI
  void e1_sep

  console.log(`[ABO-SEED] S1=${S1} Rakoto/Premium — TF groupe #${tfS1_g}, sept impayée`)

  // ════════════════════════════════════════════════════════════════════════════
  // S2 — Miora / Standard Mensuel — snapshot 5k ≠ catalogue actuel 6k
  //   Jan+Fév payés individuellement (2 TF distinctes)
  //   Mars payé en 2 actes successifs (2 TF, même échéance)
  //   Avril avec réduction (montant échéance abaissé à 4k, payé en 1 TF)
  //   Septembre → impayée
  // ════════════════════════════════════════════════════════════════════════════

  const sous2 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboStandard.id_abonnement,
    id_collaborateur: c2.id_collaborateur, montant: 5000,  // snapshot figé à l'ANCIEN prix
    renouvellement_auto: true, date_debut: D.jan26, date_fin: null,
    statut: 'ACTIVE', created_by: U1, created_at: D.jan26,
  }})
  const S2 = sous2.id_souscription_abonnement

  const [e2_jan, e2_fev, e2_mar, e2_avr, e2_sep] = await Promise.all([
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S2, montant: 5000, periode_debut: D.jan26, periode_fin: new Date('2026-01-31'), statut: 'en_attente', created_by: U1, created_at: D.jan26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S2, montant: 5000, periode_debut: D.fev26, periode_fin: new Date('2026-02-28'), statut: 'en_attente', created_by: U1, created_at: D.fev26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S2, montant: 5000, periode_debut: D.mar26, periode_fin: new Date('2026-03-31'), statut: 'en_attente', created_by: U1, created_at: D.mar26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S2, montant: 5000, periode_debut: D.avr26, periode_fin: new Date('2026-04-30'), statut: 'en_attente', created_by: U1, created_at: D.avr26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S2, montant: 5000, periode_debut: D.sep26, periode_fin: D.sep26f,              statut: 'en_attente', created_by: U1, created_at: D.sep26  } }),
  ])
  void e2_sep

  // Paiements individuels jan + fev (2 TF distinctes)
  const tfS2_jan = await createTF({ tenantId: T1, type: 'IN', montant: 5000, catId: catInT1.id_category, idSouscription: S2, userId: U1, description: 'Miora/Standard — jan 2026' })
  const tfS2_fev = await createTF({ tenantId: T1, type: 'IN', montant: 5000, catId: catInT1.id_category, idSouscription: S2, userId: U1, description: 'Miora/Standard — fév 2026' })
  await createPaiement({ tenantId: T1, idEcheance: e2_jan.id_echeance_abonnement, montant: 5000, datePaiement: D.jan26, idTF: tfS2_jan, userId: U1 })
  await createPaiement({ tenantId: T1, idEcheance: e2_fev.id_echeance_abonnement, montant: 5000, datePaiement: D.fev26, idTF: tfS2_fev, userId: U1 })
  await recalcEcheance(e2_jan.id_echeance_abonnement, 5000, U1)
  await recalcEcheance(e2_fev.id_echeance_abonnement, 5000, U1)

  // Mars — 2 actes successifs (2 TF distinctes sur la même échéance)
  const tfS2_mar1 = await createTF({ tenantId: T1, type: 'IN', montant: 2000, catId: catInT1.id_category, idSouscription: S2, userId: U1, description: 'Miora/Standard — mars 2026 (1er acte partiel 2k)' })
  await createPaiement({ tenantId: T1, idEcheance: e2_mar.id_echeance_abonnement, montant: 2000, datePaiement: D.mar26, idTF: tfS2_mar1, userId: U1 })
  await recalcEcheance(e2_mar.id_echeance_abonnement, 5000, U1)  // → partiellement_payee

  const tfS2_mar2 = await createTF({ tenantId: T1, type: 'IN', montant: 3000, catId: catInT1.id_category, idSouscription: S2, userId: U1, description: 'Miora/Standard — mars 2026 (2e acte solde 3k)' })
  await createPaiement({ tenantId: T1, idEcheance: e2_mar.id_echeance_abonnement, montant: 3000, datePaiement: D.mar26, idTF: tfS2_mar2, userId: U1 })
  await recalcEcheance(e2_mar.id_echeance_abonnement, 5000, U1)  // → payee

  // Avril — réduction directe sur l'échéance (montant net dû = 4k, pas de TF pour la réduction)
  await prisma.echeanceAbonnement.update({ where: { id_echeance_abonnement: e2_avr.id_echeance_abonnement }, data: { montant: 4000, modified_by: U1, modified_at: D.avr26 } })
  const tfS2_avr = await createTF({ tenantId: T1, type: 'IN', montant: 4000, catId: catInT1.id_category, idSouscription: S2, userId: U1, description: 'Miora/Standard — avr 2026 (tarif réduit 4k)' })
  await createPaiement({ tenantId: T1, idEcheance: e2_avr.id_echeance_abonnement, montant: 4000, datePaiement: D.avr26, idTF: tfS2_avr, userId: U1 })
  await recalcEcheance(e2_avr.id_echeance_abonnement, 4000, U1)  // → payee

  console.log(`[ABO-SEED] S2=${S2} Miora/Standard snapshot 5k≠6k — TF mars1=#${tfS2_mar1} TF mars2=#${tfS2_mar2}`)

  // ════════════════════════════════════════════════════════════════════════════
  // S3 — Andry / Premium Mensuel — paiement groupé 6 mois (cas canonique)
  //   6 PaiementAbonnement → 1 TransactionFinanciere de 48k
  // ════════════════════════════════════════════════════════════════════════════

  const sous3 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboPremium.id_abonnement,
    id_collaborateur: c3.id_collaborateur, montant: 8000,
    renouvellement_auto: true, date_debut: D.jan26, date_fin: null,
    statut: 'ACTIVE', created_by: U1, created_at: D.jan26,
  }})
  const S3 = sous3.id_souscription_abonnement

  const mois6 = [
    { debut: D.jan26, fin: new Date('2026-01-31') }, { debut: D.fev26, fin: new Date('2026-02-28') },
    { debut: D.mar26, fin: new Date('2026-03-31') }, { debut: D.avr26, fin: new Date('2026-04-30') },
    { debut: D.mai26, fin: new Date('2026-05-31') }, { debut: D.juin26, fin: new Date('2026-06-30') },
  ]
  const e3_ids: number[] = []
  for (const m of mois6) {
    const e = await prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S3, montant: 8000, periode_debut: m.debut, periode_fin: m.fin, statut: 'en_attente', created_by: U1, created_at: m.debut } })
    e3_ids.push(e.id_echeance_abonnement)
  }

  // 1 seule TF pour les 6 mois
  const tfS3_g6 = await createTF({ tenantId: T1, type: 'IN', montant: 48000, catId: catInT1.id_category, idSouscription: S3, userId: U1, description: 'Paiement groupé Andry/Premium — 6 mois jan→juin 2026 (6×8k)' })
  for (const idE of e3_ids) {
    await createPaiement({ tenantId: T1, idEcheance: idE, montant: 8000, datePaiement: D.jan26, idTF: tfS3_g6, userId: U1 })
    await recalcEcheance(idE, 8000, U1)
  }
  // Juil + Août + Sep impayées
  for (const m of [{ debut: D.juil26, fin: new Date('2026-07-31') }, { debut: D.aout26, fin: new Date('2026-08-31') }, { debut: D.sep26, fin: D.sep26f }]) {
    await prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S3, montant: 8000, periode_debut: m.debut, periode_fin: m.fin, statut: 'en_attente', created_by: U1, created_at: m.debut } })
  }

  console.log(`[ABO-SEED] S3=${S3} Andry/Premium — groupe 6 mois TF #${tfS3_g6}`)

  // ════════════════════════════════════════════════════════════════════════════
  // S4 — Rasoa / Premium Mensuel — paiement groupé puis annulation de ce groupe
  //   TF IN conservée, paiements annulés, TF OUT créée
  // ════════════════════════════════════════════════════════════════════════════

  const sous4 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboPremium.id_abonnement,
    id_collaborateur: c4.id_collaborateur, montant: 8000,
    renouvellement_auto: true, date_debut: D.avr26, date_fin: null,
    statut: 'ACTIVE', created_by: U1, created_at: D.avr26,
  }})
  const S4 = sous4.id_souscription_abonnement

  const [e4_avr, e4_mai] = await Promise.all([
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S4, montant: 8000, periode_debut: D.avr26, periode_fin: new Date('2026-04-30'), statut: 'en_attente', created_by: U1, created_at: D.avr26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S4, montant: 8000, periode_debut: D.mai26, periode_fin: new Date('2026-05-31'), statut: 'en_attente', created_by: U1, created_at: D.mai26 } }),
  ])

  const tfS4_IN = await createTF({ tenantId: T1, type: 'IN', montant: 16000, catId: catInT1.id_category, idSouscription: S4, userId: U1, description: 'Paiement groupé Rasoa/Premium — avr+mai 2026 (à annuler)' })
  const p4_avr = await createPaiement({ tenantId: T1, idEcheance: e4_avr.id_echeance_abonnement, montant: 8000, datePaiement: D.avr26, idTF: tfS4_IN, userId: U1 })
  const p4_mai = await createPaiement({ tenantId: T1, idEcheance: e4_mai.id_echeance_abonnement, montant: 8000, datePaiement: D.avr26, idTF: tfS4_IN, userId: U1 })
  await recalcEcheance(e4_avr.id_echeance_abonnement, 8000, U1)
  await recalcEcheance(e4_mai.id_echeance_abonnement, 8000, U1)

  // Annulation du groupe
  await prisma.paiementAbonnement.updateMany({
    where: { id_transaction_financiere: tfS4_IN },
    data: { canceled_at: D.juin26, canceled_by: U1, modified_at: D.juin26, modified_by: U1 },
  })
  await recalcEcheance(e4_avr.id_echeance_abonnement, 8000, U1)  // → en_attente
  await recalcEcheance(e4_mai.id_echeance_abonnement, 8000, U1)  // → en_attente

  const tfS4_OUT = await createTF({ tenantId: T1, type: 'OUT', montant: 16000, catId: catInT1.id_category, idSouscription: S4, userId: U1, description: `Annulation groupe TF#${tfS4_IN} — Rasoa/Premium avr+mai` })

  // Sep impayée
  await prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S4, montant: 8000, periode_debut: D.sep26, periode_fin: D.sep26f, statut: 'en_attente', created_by: U1, created_at: D.sep26 } })

  console.log(`[ABO-SEED] S4=${S4} Rasoa/Premium — TF IN #${tfS4_IN} conservée, TF OUT #${tfS4_OUT}, p#${p4_avr.id_paiement_abonnement}+#${p4_mai.id_paiement_abonnement} annulés`)

  // ════════════════════════════════════════════════════════════════════════════
  // S5 — Rakoto / Pro Trimestriel — TERMINÉE (historique)
  // ════════════════════════════════════════════════════════════════════════════

  const sous5 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboTrimestrel.id_abonnement,
    id_collaborateur: c1.id_collaborateur, montant: 20000,
    renouvellement_auto: false, date_debut: D.jan26, date_fin: D.juin26,
    statut: 'TERMINEE', created_by: U1, created_at: D.jan26, modified_by: U1, modified_at: D.juin26,
  }})
  const S5 = sous5.id_souscription_abonnement

  const [e5_q1, e5_q2] = await Promise.all([
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S5, montant: 20000, periode_debut: D.q1_debut, periode_fin: D.q1_fin, statut: 'en_attente', created_by: U1, created_at: D.jan26 } }),
    prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S5, montant: 20000, periode_debut: D.q2_debut, periode_fin: D.q2_fin, statut: 'en_attente', created_by: U1, created_at: D.avr26 } }),
  ])
  const tfS5_q1 = await createTF({ tenantId: T1, type: 'IN', montant: 20000, catId: catInT1.id_category, idSouscription: S5, userId: U1, description: 'Rakoto/ProTrimestriel — Q1 2026' })
  const tfS5_q2 = await createTF({ tenantId: T1, type: 'IN', montant: 20000, catId: catInT1.id_category, idSouscription: S5, userId: U1, description: 'Rakoto/ProTrimestriel — Q2 2026' })
  await createPaiement({ tenantId: T1, idEcheance: e5_q1.id_echeance_abonnement, montant: 20000, datePaiement: D.jan26, idTF: tfS5_q1, userId: U1 })
  await createPaiement({ tenantId: T1, idEcheance: e5_q2.id_echeance_abonnement, montant: 20000, datePaiement: D.avr26, idTF: tfS5_q2, userId: U1 })
  await recalcEcheance(e5_q1.id_echeance_abonnement, 20000, U1)
  await recalcEcheance(e5_q2.id_echeance_abonnement, 20000, U1)

  console.log(`[ABO-SEED] S5=${S5} Rakoto/ProTrimestriel TERMINÉE — 2 trimestres payés`)

  // ════════════════════════════════════════════════════════════════════════════
  // S6 — Miora / Annuel Complet — ANNULÉE (paiement partiel dans historique)
  // ════════════════════════════════════════════════════════════════════════════

  const sous6 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboAnnuel.id_abonnement,
    id_collaborateur: c2.id_collaborateur, montant: 60000,
    renouvellement_auto: false, date_debut: D.jan26, date_fin: null,
    statut: 'ANNULEE', canceled_at: D.mar26, canceled_by: U1,
    created_by: U1, created_at: D.jan26, modified_by: U1, modified_at: D.mar26,
  }})
  const S6 = sous6.id_souscription_abonnement

  const e6_an = await prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S6, montant: 60000, periode_debut: D.an2026_debut, periode_fin: D.an2026_fin, statut: 'en_attente', created_by: U1, created_at: D.jan26 } })
  const tfS6 = await createTF({ tenantId: T1, type: 'IN', montant: 15000, catId: catInT1.id_category, idSouscription: S6, userId: U1, description: 'Miora/Annuel — acompte 15k avant annulation' })
  await createPaiement({ tenantId: T1, idEcheance: e6_an.id_echeance_abonnement, montant: 15000, datePaiement: D.jan26, idTF: tfS6, userId: U1 })
  await recalcEcheance(e6_an.id_echeance_abonnement, 60000, U1)  // → partiellement_payee

  console.log(`[ABO-SEED] S6=${S6} Miora/Annuel ANNULÉE — paiement partiel 15k/60k dans l'historique`)

  // ════════════════════════════════════════════════════════════════════════════
  // S7 — Andry / Standard Mensuel — 2 offres différentes chevauchantes (AUTORISÉ)
  //   Andry a déjà S3 (Premium depuis jan 2026) + S7 (Standard depuis avr 2026)
  //   → illustre que la contrainte ne s'applique qu'intra-offre
  // ════════════════════════════════════════════════════════════════════════════

  const sous7 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboStandard.id_abonnement,
    id_collaborateur: c3.id_collaborateur, montant: 5000,  // tarif personnalisé (catalogue = 6k)
    renouvellement_auto: true, date_debut: D.avr26, date_fin: null,
    statut: 'ACTIVE', created_by: U1, created_at: D.avr26,
  }})
  const S7 = sous7.id_souscription_abonnement
  await prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S7, montant: 5000, periode_debut: D.sep26, periode_fin: D.sep26f, statut: 'en_attente', created_by: U1, created_at: D.sep26 } })

  console.log(`[ABO-SEED] S7=${S7} Andry/Standard (chevauchement inter-offres autorisé avec S3)`)

  // ════════════════════════════════════════════════════════════════════════════
  // S8 — Rasoa / Pro Trimestriel — Q3 payé, Q4 futur impayé
  // ════════════════════════════════════════════════════════════════════════════

  const sous8 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboTrimestrel.id_abonnement,
    id_collaborateur: c4.id_collaborateur, montant: 20000,
    renouvellement_auto: true, date_debut: D.q3_debut, date_fin: null,
    statut: 'ACTIVE', created_by: U1, created_at: D.q3_debut,
  }})
  const S8 = sous8.id_souscription_abonnement

  const e8_q3 = await prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S8, montant: 20000, periode_debut: D.q3_debut, periode_fin: D.q3_fin, statut: 'en_attente', created_by: U1, created_at: D.q3_debut } })
  await prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S8, montant: 20000, periode_debut: D.q4_debut, periode_fin: D.q4_fin, statut: 'en_attente', created_by: U1, created_at: D.q3_debut } })

  const tfS8_q3 = await createTF({ tenantId: T1, type: 'IN', montant: 20000, catId: catInT1.id_category, idSouscription: S8, userId: U1, description: 'Rasoa/ProTrimestriel — Q3 2026' })
  await createPaiement({ tenantId: T1, idEcheance: e8_q3.id_echeance_abonnement, montant: 20000, datePaiement: D.q3_debut, idTF: tfS8_q3, userId: U1 })
  await recalcEcheance(e8_q3.id_echeance_abonnement, 20000, U1)

  console.log(`[ABO-SEED] S8=${S8} Rasoa/Trimestriel — Q3 payé, Q4 futur impayé`)

  // ════════════════════════════════════════════════════════════════════════════
  // S9 — Rakoto / Annuel Complet — paiement partiel 30k/60k
  // ════════════════════════════════════════════════════════════════════════════

  const sous9 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T1, id_abonnement: aboAnnuel.id_abonnement,
    id_collaborateur: c1.id_collaborateur, montant: 60000,
    renouvellement_auto: false, date_debut: new Date('2026-07-01'), date_fin: new Date('2027-06-30'),
    statut: 'ACTIVE', created_by: U1, created_at: D.juil26,
  }})
  const S9 = sous9.id_souscription_abonnement

  const e9_an = await prisma.echeanceAbonnement.create({ data: { tenant_id: T1, id_souscription_abonnement: S9, montant: 60000, periode_debut: new Date('2026-07-01'), periode_fin: new Date('2027-06-30'), statut: 'en_attente', created_by: U1, created_at: D.juil26 } })
  const tfS9 = await createTF({ tenantId: T1, type: 'IN', montant: 30000, catId: catInT1.id_category, idSouscription: S9, userId: U1, description: 'Rakoto/Annuel — 1er versement 50%' })
  await createPaiement({ tenantId: T1, idEcheance: e9_an.id_echeance_abonnement, montant: 30000, datePaiement: D.juil26, idTF: tfS9, userId: U1 })
  await recalcEcheance(e9_an.id_echeance_abonnement, 60000, U1)  // → partiellement_payee

  console.log(`[ABO-SEED] S9=${S9} Rakoto/Annuel — partiel 30k/60k`)

  // ════════════════════════════════════════════════════════════════════════════
  // S10 — Tenant T2 — isolation multi-tenant
  // ════════════════════════════════════════════════════════════════════════════

  const sous10 = await prisma.souscriptionAbonnement.create({ data: {
    tenant_id: T2, id_abonnement: aboT2.id_abonnement,
    id_collaborateur: cT2.id_collaborateur, montant: 3000,
    renouvellement_auto: true, date_debut: D.sep26, date_fin: null,
    statut: 'ACTIVE', created_by: U2, created_at: D.sep26,
  }})
  const S10 = sous10.id_souscription_abonnement

  const e10_sep = await prisma.echeanceAbonnement.create({ data: { tenant_id: T2, id_souscription_abonnement: S10, montant: 3000, periode_debut: D.sep26, periode_fin: D.sep26f, statut: 'en_attente', created_by: U2, created_at: D.sep26 } })
  const tfS10 = await createTF({ tenantId: T2, type: 'IN', montant: 3000, catId: catInT2.id_category, idSouscription: S10, userId: U2, description: 'ABO-Dupont/T2Mensuel — sep 2026' })
  await createPaiement({ tenantId: T2, idEcheance: e10_sep.id_echeance_abonnement, montant: 3000, datePaiement: D.sep26, idTF: tfS10, userId: U2 })
  await recalcEcheance(e10_sep.id_echeance_abonnement, 3000, U2)

  console.log(`[ABO-SEED] S10=${S10} T2/ABO-Dupont — isolation multi-tenant (invisible depuis T1)`)

  // ─── Vérifications finales ─────────────────────────────────────────────────

  const [nbSous, nbEch, nbPaie, nbTF] = await Promise.all([
    prisma.souscriptionAbonnement.count({ where: { tenant_id: { in: [T1, T2] }, id_abonnement: { in: [aboPremium.id_abonnement, aboStandard.id_abonnement, aboTrimestrel.id_abonnement, aboAnnuel.id_abonnement, aboInactif.id_abonnement, aboArchive.id_abonnement, aboT2.id_abonnement] } } }),
    prisma.echeanceAbonnement.count({ where: { souscription: { id_abonnement: { in: [aboPremium.id_abonnement, aboStandard.id_abonnement, aboTrimestrel.id_abonnement, aboAnnuel.id_abonnement, aboT2.id_abonnement] } } } }),
    prisma.paiementAbonnement.count({ where: { echeance: { souscription: { id_abonnement: { in: [aboPremium.id_abonnement, aboStandard.id_abonnement, aboTrimestrel.id_abonnement, aboAnnuel.id_abonnement, aboT2.id_abonnement] } } } } }),
    prisma.transactionFinanciere.count({ where: { tenant_id: { in: [T1, T2] }, source_module: 'ABONNEMENT' } }),
  ])

  // Vérifier que le snapshot S2 est bien figé (5k vs catalogue 6k)
  const s2check = await prisma.souscriptionAbonnement.findUnique({ where: { id_souscription_abonnement: S2 }, select: { montant: true, abonnement: { select: { montant: true } } } })
  const snapshotOk = Number(s2check?.montant) !== Number(s2check?.abonnement.montant)

  // Vérifier que le groupe S3 a 6 lignes sur la même TF
  const lignesGroupe = await prisma.paiementAbonnement.count({ where: { id_transaction_financiere: tfS3_g6, canceled_at: null } })

  console.log('\n[ABO-SEED] ═══════════════════════════════════════════════════')
  console.log('[ABO-SEED] ✅ Seed abonnements terminé')
  console.log('[ABO-SEED] ─────────────────────────────────────────────────────')
  console.log(`[ABO-SEED]   Tenant principal (T1=${T1}) — visible dans l'UI`)
  console.log(`[ABO-SEED]   Tenant secondaire (T2=${T2}) — isolation uniquement`)
  console.log(`[ABO-SEED]   Collaborateurs  : 4 T1 (ABO-*) + 1 T2`)
  console.log(`[ABO-SEED]   Offres          : 6 T1 + 1 T2`)
  console.log(`[ABO-SEED]   Souscriptions   : ${nbSous}`)
  console.log(`[ABO-SEED]   Échéances        : ${nbEch}`)
  console.log(`[ABO-SEED]   Paiements       : ${nbPaie}`)
  console.log(`[ABO-SEED]   Transactions    : ${nbTF}`)
  console.log('[ABO-SEED] ─────────────────────────────────────────────────────')
  console.log(`[ABO-SEED]   Snapshot S2=${S2} figé 5k≠catalogue 6k : ${snapshotOk ? 'OK ✓' : 'ERREUR ✗'}`)
  console.log(`[ABO-SEED]   Groupe 6 mois S3 TF#${tfS3_g6} : ${lignesGroupe} lignes (attendu 6) : ${lignesGroupe === 6 ? 'OK ✓' : 'ERREUR ✗'}`)
  console.log('[ABO-SEED] ─────────────────────────────────────────────────────')
  console.log('[ABO-SEED]   Identifiants clés :')
  console.log(`[ABO-SEED]   S1 =${S1}  Rakoto/Premium  — actif, renouvellement auto, sept impayée`)
  console.log(`[ABO-SEED]   S2 =${S2}  Miora/Standard  — snapshot 5k≠catalogue 6k, mars 2 actes`)
  console.log(`[ABO-SEED]   S3 =${S3}  Andry/Premium   — groupe 6 mois TF#${tfS3_g6}`)
  console.log(`[ABO-SEED]   S4 =${S4}  Rasoa/Premium   — groupe ANNULÉ TF IN #${tfS4_IN} → TF OUT #${tfS4_OUT}`)
  console.log(`[ABO-SEED]   S5 =${S5}  Rakoto/Trimestriel — TERMINÉE`)
  console.log(`[ABO-SEED]   S6 =${S6}  Miora/Annuel    — ANNULÉE, partiel 15k/60k`)
  console.log(`[ABO-SEED]   S7 =${S7}  Andry/Standard  — chevauche S3 (inter-offres autorisé)`)
  console.log(`[ABO-SEED]   S8 =${S8}  Rasoa/Trimestriel — Q3 payé, Q4 futur`)
  console.log(`[ABO-SEED]   S9 =${S9}  Rakoto/Annuel   — partiel 30k/60k`)
  console.log(`[ABO-SEED]   S10=${S10} T2/ABO-Dupont   — isolation multi-tenant`)
  console.log('[ABO-SEED] ─────────────────────────────────────────────────────')
  console.log('[ABO-SEED]   Scénarios à tester par API (NON pré-insérés) :')
  console.log(`[ABO-SEED]   [OVERLAP-1] Miora + Standard + 01/09 → doit être REFUSÉ (chevauche S2)`)
  console.log(`[ABO-SEED]   [OVERLAP-2] Miora + Standard + 01/01/2028 → doit être ACCEPTÉ (consécutif)`)
  console.log(`[ABO-SEED]   [OVERLAP-3] Andry + Standard + 01/05 → doit être REFUSÉ (chevauche S7)`)
  console.log(`[ABO-SEED]   [SURPLUS]   Paiement S1/sept > 8 000 Ar → doit être REFUSÉ`)
  console.log(`[ABO-SEED]   [DBL-ANN]   Annuler groupe TF#${tfS4_IN} une 2e fois → doit être REFUSÉ (409)`)
  console.log(`[ABO-SEED]   [TENANT]    GET /souscriptions-abonnements (T1) → S10 absent`)
  console.log('[ABO-SEED] ═══════════════════════════════════════════════════\n')

  // Vérifier que les offres INACTIVE et ARCHIVED sont visibles dans l'UI
  void aboInactif
  void aboArchive
}

main()
  .catch(e => { console.error('[ABO-SEED] Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
