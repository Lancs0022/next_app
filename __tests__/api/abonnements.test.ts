/**
 * __tests__/api/abonnements.test.ts
 *
 * PASSE 2 — Tests métier module Abonnements
 *
 * Périmètre :
 *   - Paiements groupés (architecture N lignes → 1 TransactionFinanciere)
 *   - Machine d'état des souscriptions (transitions, guards, effets)
 *   - Chevauchements de périodes (même collab + même offre)
 *   - Annulation de groupe de paiement
 *
 * Stratégie d'isolation :
 *   - Chaque describe crée ses propres données dans le tenant 1 avec des noms
 *     préfixés "TEST-" pour que le cleanup soit chirurgical.
 *   - afterEach / afterAll nettoient UNIQUEMENT les données créées par ce test.
 *   - Les données du seed principal (offres ABO-*, collaborateurs ABO-*)
 *     et les données du seed secondaire ne sont jamais touchées.
 *
 * Conventions :
 *   - Les helpers d'appel API reproduisent le pattern des tests existants :
 *     NextRequest direct → handler → json().
 *   - Le tenant utilisé est T1 = 1, admin id = 2 (Lancs0022@gmail.com).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { authHeaders, testAdmin } from './test-helpers'
import { prisma } from '@/lib/db'

// ─── Imports des handlers ──────────────────────────────────────────────────────

import { GET as aboGet,   POST as aboPost   } from '@/app/api/abonnements/route'
import { GET as aboIdGet, DELETE as aboIdDelete } from '@/app/api/abonnements/[id]/route'
import { PATCH as aboStatutPatch } from '@/app/api/abonnements/[id]/statut/route'

import { GET as sousGet,  POST as sousPost  } from '@/app/api/souscriptions-abonnements/route'
import { GET as sousIdGet }    from '@/app/api/souscriptions-abonnements/[id]/route'
import { PATCH as sousStatutPatch } from '@/app/api/souscriptions-abonnements/[id]/statut/route'
import { PATCH as sousTarifPatch  } from '@/app/api/souscriptions-abonnements/[id]/tarif/route'

import { POST as echPost  } from '@/app/api/echeances-abonnements/route'
import { GET as paieGet,  POST as paiePost  } from '@/app/api/paiements-abonnements/route'
import { POST as groupeAnnulerPost } from '@/app/api/paiements-abonnements/groupes/[id_tf]/annuler/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const T1 = testAdmin.tenant_id   // 1

/** Construit un NextRequest POST JSON */
function req(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
}

/** Construit un NextRequest GET */
function reqGet(url: string) {
  return new NextRequest(url, { method: 'GET', headers: authHeaders() })
}

/** Construit un NextRequest PATCH JSON */
function reqPatch(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
}

/** Contexte de route avec params */
function ctx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) }
}

// ─── Données de test isolées — créées et détruites par les suites ─────────────

interface TestFixture {
  idOffre: number
  idCollab1: number
  idCollab2: number
}

/** Crée une offre et 2 collaborateurs de test, retourne leurs IDs */
async function createTestFixture(suffix: string): Promise<TestFixture> {
  const offre = await prisma.abonnement.create({
    data: {
      tenant_id:   T1,
      nom:         `TEST-${suffix}`,
      description: `Offre de test — ${suffix}`,
      montant:     8000,
      periodicite: 'mensuel',
      statut:      'ACTIVE',
      created_by:  testAdmin.id_utilisateur,
    },
  })
  const c1 = await prisma.collaborateur.create({
    data: { tenant_id: T1, nom: `TEST-${suffix}-C1`, prenom: 'Alpha', statut: 'actif' },
  })
  const c2 = await prisma.collaborateur.create({
    data: { tenant_id: T1, nom: `TEST-${suffix}-C2`, prenom: 'Beta', statut: 'actif' },
  })
  return { idOffre: offre.id_abonnement, idCollab1: c1.id_collaborateur, idCollab2: c2.id_collaborateur }
}

/** Nettoie en cascade toutes les données liées à une fixture */
async function cleanupFixture(fx: TestFixture) {
  // Chercher les souscriptions de cette offre
  const sous = await prisma.souscriptionAbonnement.findMany({
    where: { id_abonnement: fx.idOffre },
    select: { id_souscription_abonnement: true },
  })
  const sousIds = sous.map(s => s.id_souscription_abonnement)

  if (sousIds.length > 0) {
    // Trouver les échéances
    const echs = await prisma.echeanceAbonnement.findMany({
      where: { id_souscription_abonnement: { in: sousIds } },
      select: { id_echeance_abonnement: true },
    })
    const echIds = echs.map(e => e.id_echeance_abonnement)

    if (echIds.length > 0) {
      // Supprimer les paiements
      await prisma.paiementAbonnement.deleteMany({ where: { id_echeance_abonnement: { in: echIds } } })
      await prisma.echeanceAbonnement.deleteMany({ where: { id_echeance_abonnement: { in: echIds } } })
    }
    // Supprimer les TF ABONNEMENT liées aux souscriptions
    await prisma.transactionFinanciere.deleteMany({
      where: { tenant_id: T1, source_module: 'ABONNEMENT', source_id: { in: sousIds } },
    })
    await prisma.souscriptionAbonnement.deleteMany({ where: { id_souscription_abonnement: { in: sousIds } } })
  }

  await prisma.abonnement.deleteMany({ where: { id_abonnement: fx.idOffre } })
  await prisma.collaborateur.deleteMany({ where: { id_collaborateur: { in: [fx.idCollab1, fx.idCollab2] } } })
}

/**
 * Nettoyage automatique chirurgical de TOUTES les données de test résiduelles.
 * Supprime les collaborateurs TEST-* ou Overlap4, abonnements TEST-*,
 * ainsi que leurs souscriptions, échéances, paiements et transactions financières.
 */
async function purgeAllTestArtifacts() {
  const collabs = await prisma.collaborateur.findMany({
    where: {
      tenant_id: T1,
      OR: [
        { nom: { startsWith: 'TEST-' } },
        { prenom: 'Overlap4' },
      ],
    },
    select: { id_collaborateur: true },
  })
  const collabIds = collabs.map(c => c.id_collaborateur)

  const abos = await prisma.abonnement.findMany({
    where: {
      tenant_id: T1,
      nom: { startsWith: 'TEST-' },
    },
    select: { id_abonnement: true },
  })
  const aboIds = abos.map(a => a.id_abonnement)

  if (collabIds.length === 0 && aboIds.length === 0) return

  const sous = await prisma.souscriptionAbonnement.findMany({
    where: {
      tenant_id: T1,
      OR: [
        ...(collabIds.length > 0 ? [{ id_collaborateur: { in: collabIds } }] : []),
        ...(aboIds.length > 0 ? [{ id_abonnement: { in: aboIds } }] : []),
      ],
    },
    select: { id_souscription_abonnement: true },
  })
  const sousIds = sous.map(s => s.id_souscription_abonnement)

  if (sousIds.length > 0) {
    const echs = await prisma.echeanceAbonnement.findMany({
      where: { id_souscription_abonnement: { in: sousIds } },
      select: { id_echeance_abonnement: true },
    })
    const echIds = echs.map(e => e.id_echeance_abonnement)

    if (echIds.length > 0) {
      await prisma.paiementAbonnement.deleteMany({
        where: { id_echeance_abonnement: { in: echIds } },
      })
      await prisma.echeanceAbonnement.deleteMany({
        where: { id_echeance_abonnement: { in: echIds } },
      })
    }

    await prisma.transactionFinanciere.deleteMany({
      where: {
        tenant_id: T1,
        source_module: 'ABONNEMENT',
        source_id: { in: sousIds },
      },
    })

    await prisma.souscriptionAbonnement.deleteMany({
      where: { id_souscription_abonnement: { in: sousIds } },
    })
  }

  if (aboIds.length > 0) {
    await prisma.abonnement.deleteMany({
      where: { id_abonnement: { in: aboIds } },
    })
  }

  if (collabIds.length > 0) {
    await prisma.collaborateur.deleteMany({
      where: { id_collaborateur: { in: collabIds } },
    })
  }
}

beforeAll(async () => {
  await purgeAllTestArtifacts()
})

afterAll(async () => {
  await purgeAllTestArtifacts()
})


// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — PAIEMENTS GROUPÉS
// Teste l'architecture N PaiementAbonnement → 1 TransactionFinanciere
// ══════════════════════════════════════════════════════════════════════════════

describe('Paiements groupés', () => {
  let fx: TestFixture
  let idSous: number

  // Créer une souscription avec 6 échéances de test
  const echeanceDefs = [
    { debut: '2026-01-01', fin: '2026-01-31' },
    { debut: '2026-02-01', fin: '2026-02-28' },
    { debut: '2026-03-01', fin: '2026-03-31' },
    { debut: '2026-04-01', fin: '2026-04-30' },
    { debut: '2026-05-01', fin: '2026-05-31' },
    { debut: '2026-06-01', fin: '2026-06-30' },
  ]

  let echIds: number[] = []
  let catId: number

  beforeAll(async () => {
    fx = await createTestFixture('PAIE')

    // Catégorie financière (récupérer une existante du tenant 1)
    const cat = await prisma.financialCategory.findFirst({ where: { tenant_id: T1, type: { in: ['IN', 'BOTH'] } } })
    catId = cat?.id_category ?? 1

    // Souscription via API
    const res = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:       fx.idOffre,
        id_collaborateur:    fx.idCollab1,
        montant:             8000,
        date_debut:          '2026-01-01',
        renouvellement_auto: false,
      }),
      ctx()
    )
    const body = await res.json()
    idSous = body.data.id_souscription_abonnement

    // Créer les 6 échéances via API
    for (const d of echeanceDefs) {
      const r = await echPost(
        req('http://localhost/api/echeances-abonnements', {
          id_souscription_abonnement: idSous,
          montant:      8000,
          periode_debut: d.debut,
          periode_fin:   d.fin,
        }),
        ctx()
      )
      const b = await r.json()
      echIds.push(b.data.id_echeance_abonnement)
    }
  })

  afterAll(() => cleanupFixture(fx))

  // ── A. Paiement exact d'une seule échéance ────────────────────────────────

  it('A — paiement exact (1 ligne, 1 TF)', async () => {
    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [{ id_echeance_abonnement: echIds[0], montant: 8000 }],
        date_paiement: '2026-01-15',
      }),
      ctx()
    )
    expect(res.status).toBe(201)
    const body = await res.json()

    // 1 ligne créée
    expect(body.data.nb_lignes).toBe(1)
    expect(body.data.montant_total).toBe(8000)

    // Exactement 1 TF IN
    expect(body.data.id_transaction_financiere).toBeDefined()
    const tf = await prisma.transactionFinanciere.findUnique({
      where: { id_transaction_financiere: body.data.id_transaction_financiere },
    })
    expect(tf).toBeTruthy()
    expect(tf!.type).toBe('IN')
    expect(Number(tf!.montant)).toBe(8000)
    expect(tf!.source_module).toBe('ABONNEMENT')
    expect(tf!.source_id).toBe(idSous)

    // Statut échéance → payee
    const ech = await prisma.echeanceAbonnement.findUnique({ where: { id_echeance_abonnement: echIds[0] } })
    expect(ech!.statut).toBe('payee')
  })

  // ── B. Paiement partiel ────────────────────────────────────────────────────

  it('B — paiement partiel (montant < dû)', async () => {
    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [{ id_echeance_abonnement: echIds[1], montant: 3000 }],
        date_paiement: '2026-02-10',
      }),
      ctx()
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.montant_total).toBe(3000)

    // Statut → partiellement_payee
    const ech = await prisma.echeanceAbonnement.findUnique({ where: { id_echeance_abonnement: echIds[1] } })
    expect(ech!.statut).toBe('partiellement_payee')
  })

  // ── C. Deux actes de paiement successifs sur la même échéance ─────────────
  // (le B a déjà payé 3 000 sur echIds[1], ce test complète avec 5 000)

  it('C — second acte de paiement → même échéance, TF distincte', async () => {
    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [{ id_echeance_abonnement: echIds[1], montant: 5000 }],
        date_paiement: '2026-02-20',
      }),
      ctx()
    )
    expect(res.status).toBe(201)
    const body2 = await res.json()

    // TF différente de celle du premier acte
    const paiements = await prisma.paiementAbonnement.findMany({
      where: { id_echeance_abonnement: echIds[1], canceled_at: null },
    })
    expect(paiements).toHaveLength(2)
    // Les deux actes ont des TF distinctes
    expect(paiements[0].id_transaction_financiere).not.toBe(paiements[1].id_transaction_financiere)

    // Statut → payee
    const ech = await prisma.echeanceAbonnement.findUnique({ where: { id_echeance_abonnement: echIds[1] } })
    expect(ech!.statut).toBe('payee')

    void body2
  })

  // ── D. Paiement groupé de 6 échéances — le cas canonique ──────────────────
  // (echIds[2..5] = mars, avr, mai, juin — toutes encore impayées)
  // NOTE : seulement 4 encore libres (mar, avr, mai, juin) car jan et fev sont payées

  it('D — paiement groupé 4 échéances → 4 PaiementAbonnement, 1 TF de 32 000', async () => {
    const lignes = echIds.slice(2).map(id => ({ id_echeance_abonnement: id, montant: 8000 }))

    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes,
        date_paiement: '2026-03-01',
      }),
      ctx()
    )
    expect(res.status).toBe(201)
    const body = await res.json()

    expect(body.data.nb_lignes).toBe(4)
    expect(body.data.montant_total).toBe(32000)

    // Exactement 1 TF pour le groupe
    const idTF = body.data.id_transaction_financiere
    expect(idTF).toBeDefined()
    const lignesBD = await prisma.paiementAbonnement.findMany({
      where: { id_transaction_financiere: idTF },
    })
    expect(lignesBD).toHaveLength(4)
    // Toutes partagent la même TF
    const ids = [...new Set(lignesBD.map(l => l.id_transaction_financiere))]
    expect(ids).toHaveLength(1)

    // TF en base : montant 32 000
    const tf = await prisma.transactionFinanciere.findUnique({ where: { id_transaction_financiere: idTF } })
    expect(Number(tf!.montant)).toBe(32000)
  })

  // ── E. Surpaiement → rejeté ───────────────────────────────────────────────

  it('E — surplus interdit (montant > restant dû)', async () => {
    // Créer une échéance fraîche pour ce test
    const r = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: idSous,
        montant: 5000,
        periode_debut: '2026-07-01',
        periode_fin:   '2026-07-31',
      }),
      ctx()
    )
    const b = await r.json()
    const idEch = b.data.id_echeance_abonnement

    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [{ id_echeance_abonnement: idEch, montant: 6000 }],
      }),
      ctx()
    )
    expect(res.status).toBe(400)
    const err = await res.json()
    expect(err).toHaveProperty('error')
    expect(err.error).toMatch(/restant dû|surplus|dépasse/i)
  })

  // ── F. Montant nul → rejeté ────────────────────────────────────────────────

  it('F — montant nul rejeté', async () => {
    const r = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: idSous,
        montant: 5000,
        periode_debut: '2026-08-01',
        periode_fin:   '2026-08-31',
      }),
      ctx()
    )
    const b = await r.json()
    const idEch = b.data.id_echeance_abonnement

    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [{ id_echeance_abonnement: idEch, montant: 0 }],
      }),
      ctx()
    )
    expect(res.status).toBe(400)
  })

  // ── G. Montant négatif → rejeté ───────────────────────────────────────────

  it('G — montant négatif rejeté', async () => {
    const r = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: idSous,
        montant: 5000,
        periode_debut: '2026-09-01',
        periode_fin:   '2026-09-30',
      }),
      ctx()
    )
    const b = await r.json()
    const idEch = b.data.id_echeance_abonnement

    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [{ id_echeance_abonnement: idEch, montant: -100 }],
      }),
      ctx()
    )
    expect(res.status).toBe(400)
  })

  // ── H. Échéance déjà totalement payée → rejeté ────────────────────────────

  it('H — échéance déjà payée → rejeté', async () => {
    // echIds[0] est déjà totalement payée (test A)
    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [{ id_echeance_abonnement: echIds[0], montant: 1000 }],
      }),
      ctx()
    )
    expect(res.status).toBe(409)
    const err = await res.json()
    expect(err).toHaveProperty('error')
  })

  // ── I. Même échéance deux fois dans la requête → rejeté ───────────────────

  it('I — même échéance en double dans lignes → rejeté', async () => {
    const r = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: idSous,
        montant: 5000,
        periode_debut: '2026-10-01',
        periode_fin:   '2026-10-31',
      }),
      ctx()
    )
    const b = await r.json()
    const idEch = b.data.id_echeance_abonnement

    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [
          { id_echeance_abonnement: idEch, montant: 2000 },
          { id_echeance_abonnement: idEch, montant: 2000 },
        ],
      }),
      ctx()
    )
    expect(res.status).toBe(400)
    const err = await res.json()
    expect(err.error).toMatch(/plusieurs|deux fois|doublon|dupliqu/i)
  })

  // ── J. Atomicité — une erreur annule tout ─────────────────────────────────

  it('J — atomicité : si une ligne invalide, aucune TF ni PaiementAbonnement créés', async () => {
    // Créer 2 échéances valides + 1 invalide (déjà payée)
    const r1 = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: idSous,
        montant: 5000,
        periode_debut: '2026-11-01',
        periode_fin:   '2026-11-30',
      }),
      ctx()
    )
    const r2 = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: idSous,
        montant: 5000,
        periode_debut: '2026-12-01',
        periode_fin:   '2026-12-31',
      }),
      ctx()
    )
    const idEchVal1 = (await r1.json()).data.id_echeance_abonnement
    const idEchVal2 = (await r2.json()).data.id_echeance_abonnement

    // Compter les TF avant
    const tfBefore = await prisma.transactionFinanciere.count({
      where: { tenant_id: T1, source_module: 'ABONNEMENT', source_id: idSous },
    })

    // Requête avec : 1 valide + 1 excédentaire (montant > 5000 sur idEchVal2)
    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [
          { id_echeance_abonnement: idEchVal1, montant: 5000 },
          { id_echeance_abonnement: idEchVal2, montant: 9999 }, // surplus → erreur
        ],
      }),
      ctx()
    )
    expect(res.status).toBe(400)

    // Aucune TF créée
    const tfAfter = await prisma.transactionFinanciere.count({
      where: { tenant_id: T1, source_module: 'ABONNEMENT', source_id: idSous },
    })
    expect(tfAfter).toBe(tfBefore)

    // Aucun PaiementAbonnement créé pour idEchVal1
    const paieCount = await prisma.paiementAbonnement.count({
      where: { id_echeance_abonnement: idEchVal1 },
    })
    expect(paieCount).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — ANNULATION DE GROUPE DE PAIEMENT
// ══════════════════════════════════════════════════════════════════════════════

describe('Annulation groupe de paiement', () => {
  let fx: TestFixture
  let idSous: number
  let idEch1: number
  let idEch2: number
  let idTF: number

  beforeAll(async () => {
    fx = await createTestFixture('ANNUL')

    const rSous = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: fx.idCollab1,
        montant:          8000,
        date_debut:       '2026-01-01',
        renouvellement_auto: false,
      }),
      ctx()
    )
    idSous = (await rSous.json()).data.id_souscription_abonnement

    // Créer 2 échéances
    const r1 = await echPost(req('http://localhost/api/echeances-abonnements', { id_souscription_abonnement: idSous, montant: 8000, periode_debut: '2026-01-01', periode_fin: '2026-01-31' }), ctx())
    const r2 = await echPost(req('http://localhost/api/echeances-abonnements', { id_souscription_abonnement: idSous, montant: 8000, periode_debut: '2026-02-01', periode_fin: '2026-02-28' }), ctx())
    idEch1 = (await r1.json()).data.id_echeance_abonnement
    idEch2 = (await r2.json()).data.id_echeance_abonnement

    // Paiement groupé
    const rPaie = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [
          { id_echeance_abonnement: idEch1, montant: 8000 },
          { id_echeance_abonnement: idEch2, montant: 8000 },
        ],
        date_paiement: '2026-01-05',
      }),
      ctx()
    )
    idTF = (await rPaie.json()).data.id_transaction_financiere
  })

  afterAll(() => cleanupFixture(fx))

  it('TF IN créée avant annulation', async () => {
    const tf = await prisma.transactionFinanciere.findUnique({ where: { id_transaction_financiere: idTF } })
    expect(tf).toBeTruthy()
    expect(tf!.type).toBe('IN')
    expect(Number(tf!.montant)).toBe(16000)
  })

  it('Annulation groupe → 2 lignes annulées + TF OUT créée', async () => {
    const res = await groupeAnnulerPost(
      req(`http://localhost/api/paiements-abonnements/groupes/${idTF}/annuler`, {}),
      ctx({ id_tf: String(idTF) })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.nb_lignes_annulees).toBe(2)
    expect(body.data.montant_annule).toBe(16000)

    // Les 2 lignes sont bien annulées
    const lignes = await prisma.paiementAbonnement.findMany({ where: { id_transaction_financiere: idTF } })
    expect(lignes).toHaveLength(2)
    expect(lignes.every(l => l.canceled_at !== null)).toBe(true)

    // TF IN d'origine CONSERVÉE (jamais modifiée)
    const tfIN = await prisma.transactionFinanciere.findUnique({ where: { id_transaction_financiere: idTF } })
    expect(tfIN).toBeTruthy()
    expect(tfIN!.type).toBe('IN')

    // Une TF OUT compensatoire créée
    const tfOUT = await prisma.transactionFinanciere.findFirst({
      where: { tenant_id: T1, source_module: 'ABONNEMENT', source_id: idSous, type: 'OUT' },
    })
    expect(tfOUT).toBeTruthy()
    expect(Number(tfOUT!.montant)).toBe(16000)

    // Statuts échéances repassent à en_attente
    const e1 = await prisma.echeanceAbonnement.findUnique({ where: { id_echeance_abonnement: idEch1 } })
    const e2 = await prisma.echeanceAbonnement.findUnique({ where: { id_echeance_abonnement: idEch2 } })
    expect(e1!.statut).toBe('en_attente')
    expect(e2!.statut).toBe('en_attente')
  })

  it('Deuxième annulation du même groupe → rejeté (409)', async () => {
    const res = await groupeAnnulerPost(
      req(`http://localhost/api/paiements-abonnements/groupes/${idTF}/annuler`, {}),
      ctx({ id_tf: String(idTF) })
    )
    expect(res.status).toBe(409)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — MACHINE D'ÉTAT DES SOUSCRIPTIONS
// Transitions, guards, effets sur date_fin et renouvellement
// ══════════════════════════════════════════════════════════════════════════════

describe('Machine d\'état souscriptions', () => {
  let fx: TestFixture
  const createdCollabIds: number[] = []

  beforeAll(async () => { fx = await createTestFixture('ETAT') })
  afterAll(async () => {
    if (createdCollabIds.length > 0) {
      await prisma.collaborateur.deleteMany({ where: { id_collaborateur: { in: createdCollabIds } } })
    }
    await cleanupFixture(fx)
  })

  /** Crée un collaborateur isolé et une souscription via API, retourne { idSous, idCollab } */
  async function creerSousIsolé(opts: {
    dateDebut?: string
    dateFin?: string | null
    renoAuto?: boolean
    montant?: number
  } = {}) {
    // Chaque souscription de test a son propre collaborateur → zéro interférence
    const collab = await prisma.collaborateur.create({
      data: { tenant_id: T1, nom: `TEST-ETAT-ISO-${Date.now()}-${Math.random().toString(36).slice(2)}`, statut: 'actif' },
    })
    createdCollabIds.push(collab.id_collaborateur)
    const res = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: collab.id_collaborateur,
        montant:          opts.montant ?? 8000,
        date_debut:       opts.dateDebut ?? '2026-01-01',
        ...(opts.dateFin !== undefined ? { date_fin: opts.dateFin } : {}),
        renouvellement_auto: opts.renoAuto ?? false,
      }),
      ctx()
    )
    const body = await res.json()
    if (res.status !== 201) throw new Error(`Création souscription échouée: ${JSON.stringify(body)}`)
    return { idSous: body.data.id_souscription_abonnement as number, idCollab: collab.id_collaborateur }
  }

  // Alias simple pour les tests qui n'ont besoin que de l'id
  async function creerSous(opts: Parameters<typeof creerSousIsolé>[0] = {}) {
    const { idSous } = await creerSousIsolé(opts)
    return idSous
  }

  /** Change le statut d'une souscription via API */
  async function changerStatut(idSous: number, statut: string) {
    return sousStatutPatch(
      reqPatch(`http://localhost/api/souscriptions-abonnements/${idSous}/statut`, { statut }),
      ctx({ id: String(idSous) })
    )
  }

  // ── ACTIVE → SUSPENDUE ────────────────────────────────────────────────────

  it('ACTIVE → SUSPENDUE : statut mis à jour, date_fin inchangée', async () => {
    const id = await creerSous({ dateDebut: '2026-01-01', renoAuto: false })
    const res = await changerStatut(id, 'SUSPENDUE')
    expect(res.status).toBe(200)

    const sous = await prisma.souscriptionAbonnement.findUnique({ where: { id_souscription_abonnement: id } })
    expect(sous!.statut).toBe('SUSPENDUE')
    expect(sous!.date_fin).toBeNull()       // date_fin non affectée
    expect(sous!.canceled_at).toBeNull()    // pas d'annulation
  })

  // ── SUSPENDUE → ACTIVE ────────────────────────────────────────────────────

  it('SUSPENDUE → ACTIVE : réactivation possible', async () => {
    const id = await creerSous({ dateDebut: '2026-01-02', renoAuto: false })
    await changerStatut(id, 'SUSPENDUE')

    const res = await changerStatut(id, 'ACTIVE')
    expect(res.status).toBe(200)
    const sous = await prisma.souscriptionAbonnement.findUnique({ where: { id_souscription_abonnement: id } })
    expect(sous!.statut).toBe('ACTIVE')
  })

  // ── ACTIVE → TERMINEE ─────────────────────────────────────────────────────

  it('ACTIVE → TERMINEE : date_fin = today, renouvellement_auto = false', async () => {
    const id = await creerSous({ dateDebut: '2026-01-03', renoAuto: true })
    const before = new Date()

    const res = await changerStatut(id, 'TERMINEE')
    expect(res.status).toBe(200)

    const sous = await prisma.souscriptionAbonnement.findUnique({ where: { id_souscription_abonnement: id } })
    expect(sous!.statut).toBe('TERMINEE')
    expect(sous!.renouvellement_auto).toBe(false)   // désactivé par la terminaison
    expect(sous!.date_fin).toBeTruthy()
    expect(new Date(sous!.date_fin!).getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
  })

  // ── TERMINEE ne peut aller qu'en ACTIVE (réactivation) ───────────────────

  it('TERMINEE → SUSPENDUE : rejeté', async () => {
    const id = await creerSous({ dateDebut: '2026-01-04', renoAuto: false })
    await changerStatut(id, 'TERMINEE')

    const res = await changerStatut(id, 'SUSPENDUE')
    expect(res.status).toBe(409)
  })

  // ── ACTIVE → ANNULEE ──────────────────────────────────────────────────────

  it('ACTIVE → ANNULEE : canceled_at renseigné, irréversible', async () => {
    const id = await creerSous({ dateDebut: '2026-01-05', renoAuto: false })
    const res = await changerStatut(id, 'ANNULEE')
    expect(res.status).toBe(200)

    const sous = await prisma.souscriptionAbonnement.findUnique({ where: { id_souscription_abonnement: id } })
    expect(sous!.statut).toBe('ANNULEE')
    expect(sous!.canceled_at).toBeTruthy()
    expect(sous!.canceled_by).toBe(testAdmin.id_utilisateur)
  })

  it('ANNULEE → toute autre transition : rejetée (409)', async () => {
    const id = await creerSous({ dateDebut: '2026-01-06', renoAuto: false })
    await changerStatut(id, 'ANNULEE')

    for (const statut of ['ACTIVE', 'SUSPENDUE', 'TERMINEE']) {
      const res = await changerStatut(id, statut)
      expect(res.status).toBe(409)
    }
  })

  // ── SUSPENDUE → ANNULEE ───────────────────────────────────────────────────

  it('SUSPENDUE → ANNULEE : fonctionne', async () => {
    const id = await creerSous({ dateDebut: '2026-01-07', renoAuto: false })
    await changerStatut(id, 'SUSPENDUE')
    const res = await changerStatut(id, 'ANNULEE')
    expect(res.status).toBe(200)
    const sous = await prisma.souscriptionAbonnement.findUnique({ where: { id_souscription_abonnement: id } })
    expect(sous!.statut).toBe('ANNULEE')
  })

  // ── Changement de tarif : historique préservé ─────────────────────────────

  it('Changement de tarif → snapshot souscription mis à jour, anciennes échéances inchangées', async () => {
    const id = await creerSous({ dateDebut: '2026-01-08', renoAuto: false, montant: 8000 })

    // Créer une échéance avec l'ancien tarif snapshot
    const rEch = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: id,
        montant: 8000,
        periode_debut: '2026-01-01',
        periode_fin:   '2026-01-31',
      }),
      ctx()
    )
    const idEch = (await rEch.json()).data.id_echeance_abonnement

    // Changer le tarif
    const res = await sousTarifPatch(
      reqPatch(`http://localhost/api/souscriptions-abonnements/${id}/tarif`, { montant: 10000 }),
      ctx({ id: String(id) })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.nouveau_montant).toBe(10000)
    expect(body.data.ancien_montant).toBe(8000)

    // Le montant de la souscription est mis à jour
    const sous = await prisma.souscriptionAbonnement.findUnique({ where: { id_souscription_abonnement: id } })
    expect(Number(sous!.montant)).toBe(10000)

    // L'échéance existante garde son ancien montant (snapshot figé)
    const ech = await prisma.echeanceAbonnement.findUnique({ where: { id_echeance_abonnement: idEch } })
    expect(Number(ech!.montant)).toBe(8000)
  })

  // ── Changement de tarif interdit sur souscription ANNULEE ────────────────

  it('Changement de tarif sur souscription ANNULEE → rejeté (409)', async () => {
    const id = await creerSous({ dateDebut: '2026-01-09', renoAuto: false })
    await changerStatut(id, 'ANNULEE')

    const res = await sousTarifPatch(
      reqPatch(`http://localhost/api/souscriptions-abonnements/${id}/tarif`, { montant: 5000 }),
      ctx({ id: String(id) })
    )
    expect(res.status).toBe(409)
  })

  // ── Paiement autorisé sur ACTIVE ──────────────────────────────────────────

  it('Paiement sur souscription ACTIVE : autorisé', async () => {
    const id = await creerSous({ dateDebut: '2026-02-01', renoAuto: false })
    const rEch = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: id,
        montant: 5000,
        periode_debut: '2026-02-01',
        periode_fin:   '2026-02-28',
      }),
      ctx()
    )
    const idEch = (await rEch.json()).data.id_echeance_abonnement

    const res = await paiePost(
      req('http://localhost/api/paiements-abonnements', {
        lignes: [{ id_echeance_abonnement: idEch, montant: 5000 }],
      }),
      ctx()
    )
    expect(res.status).toBe(201)
  })

  // ── Échéance ne peut pas être créée sur souscription ANNULEE ─────────────

  it('Nouvelle échéance sur souscription ANNULEE → rejetée (409)', async () => {
    const id = await creerSous({ dateDebut: '2026-03-01', renoAuto: false })
    await changerStatut(id, 'ANNULEE')

    const res = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: id,
        montant: 5000,
        periode_debut: '2026-03-01',
        periode_fin:   '2026-03-31',
      }),
      ctx()
    )
    expect(res.status).toBe(409)
  })

  // ── Échéance ne peut pas être créée sur souscription TERMINEE ────────────

  it('Nouvelle échéance sur souscription TERMINEE → rejetée (409)', async () => {
    const id = await creerSous({ dateDebut: '2026-04-01', renoAuto: false })
    await changerStatut(id, 'TERMINEE')

    const res = await echPost(
      req('http://localhost/api/echeances-abonnements', {
        id_souscription_abonnement: id,
        montant: 5000,
        periode_debut: '2026-04-01',
        periode_fin:   '2026-04-30',
      }),
      ctx()
    )
    expect(res.status).toBe(409)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — CHEVAUCHEMENTS DE PÉRIODES
// Règle V1 : même collaborateur + même offre → pas de chevauchement
// Offres différentes → chevauchement autorisé
// ══════════════════════════════════════════════════════════════════════════════

describe('Chevauchements de périodes', () => {
  let fx: TestFixture
  let idOffre2: number // seconde offre pour tester chevauchement inter-offres

  beforeAll(async () => {
    fx = await createTestFixture('CHEV')
    // Créer une seconde offre
    const offre2 = await prisma.abonnement.create({
      data: { tenant_id: T1, nom: 'TEST-CHEV-2', montant: 5000, periodicite: 'mensuel', statut: 'ACTIVE', created_by: testAdmin.id_utilisateur },
    })
    idOffre2 = offre2.id_abonnement
  })

  afterAll(async () => {
    await prisma.souscriptionAbonnement.deleteMany({ where: { id_abonnement: idOffre2 } })
    await cleanupFixture(fx)
    await prisma.abonnement.deleteMany({ where: { id_abonnement: idOffre2 } })
  })

  // ── Cas de référence : souscription de base ───────────────────────────────

  it('Souscription 01/09/2026 → NULL créée sans problème', async () => {
    const res = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: fx.idCollab1,
        montant: 8000, date_debut: '2026-09-01',
        renouvellement_auto: false,
      }),
      ctx()
    )
    expect(res.status).toBe(201)
  })

  // ── OVERLAP-1 : même collab + même offre + période chevauchante → REFUS ───

  it('[OVERLAP-1] même collab + même offre + 01/09 chevauchante → rejeté (409)', async () => {
    const res = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: fx.idCollab1,
        montant: 8000, date_debut: '2026-09-15', // chevauche 01/09→NULL
        renouvellement_auto: false,
      }),
      ctx()
    )
    expect(res.status).toBe(409)
    const err = await res.json()
    expect(err.error).toMatch(/chevauche|overlap|souscription.*active/i)
  })

  // ── OVERLAP-2 : périodes adjacentes (non chevauchantes) → ACCEPTÉ ─────────

  it('[OVERLAP-2] même collab + même offre + périodes adjacentes → accepté', async () => {
    // D'abord terminer la souscription existante le 30/09
    const subs = await prisma.souscriptionAbonnement.findMany({
      where: { id_abonnement: fx.idOffre, id_collaborateur: fx.idCollab1, statut: 'ACTIVE' },
    })
    if (subs.length > 0) {
      for (const s of subs) {
        await prisma.souscriptionAbonnement.update({
          where: { id_souscription_abonnement: s.id_souscription_abonnement },
          data: { statut: 'TERMINEE', date_fin: new Date('2026-09-30'), renouvellement_auto: false },
        })
      }
    }

    // Nouvelle souscription à partir du 01/10 (borne adjacente)
    const res = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: fx.idCollab1,
        montant: 8000, date_debut: '2026-10-01',
        renouvellement_auto: false,
      }),
      ctx()
    )
    expect(res.status).toBe(201)
  })

  // ── OVERLAP-3 : offres différentes + mêmes périodes → ACCEPTÉ ────────────

  it('[OVERLAP-3] même collab + offres différentes + mêmes périodes → accepté', async () => {
    // Collab2 souscrit à offre1 sep→null
    const r1 = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: fx.idCollab2,
        montant: 8000, date_debut: '2026-09-01',
        renouvellement_auto: false,
      }),
      ctx()
    )
    expect(r1.status).toBe(201)

    // Même collab2 souscrit à offre2 sep→null (offre différente → autorisé)
    const r2 = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    idOffre2,
        id_collaborateur: fx.idCollab2,
        montant: 5000, date_debut: '2026-09-01',
        renouvellement_auto: false,
      }),
      ctx()
    )
    expect(r2.status).toBe(201)
  })

  // ── OVERLAP-4 : souscription ANNULEE ne bloque pas ────────────────────────

  it('[OVERLAP-4] souscription ANNULEE ne bloque pas nouvelle souscription', async () => {
    const collabO4 = await prisma.collaborateur.create({
      data: { tenant_id: T1, nom: 'Collab', prenom: 'Overlap4', email: `ov4_${Date.now()}@test.com` },
    })

    // Créer + annuler une souscription pour collabO4 avec offre1 sur jan 2027
    const rC = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: collabO4.id_collaborateur,
        montant: 8000, date_debut: '2027-01-01',
        renouvellement_auto: false,
      }),
      ctx()
    )
    expect(rC.status).toBe(201)
    const bodyC = await rC.json()
    const idC = bodyC.data.id_souscription_abonnement
    await sousStatutPatch(
      reqPatch(`http://localhost/api/souscriptions-abonnements/${idC}/statut`, { statut: 'ANNULEE' }),
      ctx({ id: String(idC) })
    )

    // Nouvelle souscription sur la même période → doit être acceptée
    const res = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: collabO4.id_collaborateur,
        montant: 8000, date_debut: '2027-01-01',
        renouvellement_auto: false,
      }),
      ctx()
    )
    expect(res.status).toBe(201)

    // Cleanup local
    await prisma.souscriptionAbonnement.deleteMany({ where: { id_collaborateur: collabO4.id_collaborateur } })
    await prisma.collaborateur.delete({ where: { id_collaborateur: collabO4.id_collaborateur } })
  })

  // ── OVERLAP-5 : erreur métier lisible (pas de message SQL brut) ───────────

  it('[OVERLAP-5] message d\'erreur de chevauchement lisible (pas de message SQL)', async () => {
    // Recréer une souscription active sur une période connue
    await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: fx.idCollab1,
        montant: 8000, date_debut: '2027-06-01',
        renouvellement_auto: false,
      }),
      ctx()
    )

    const res = await sousPost(
      req('http://localhost/api/souscriptions-abonnements', {
        id_abonnement:    fx.idOffre,
        id_collaborateur: fx.idCollab1,
        montant: 8000, date_debut: '2027-06-15', // chevauche
        renouvellement_auto: false,
      }),
      ctx()
    )
    expect(res.status).toBe(409)
    const err = await res.json()
    // L'erreur doit être lisible, pas un message Prisma/SQL brut
    expect(err.error).toBeTruthy()
    expect(err.error).not.toMatch(/PrismaClientKnownRequestError|P[0-9]{4}|btree_gist|SQLSTATE/i)
    // Le message doit être en français et compréhensible
    expect(typeof err.error).toBe('string')
    expect(err.error.length).toBeGreaterThan(10)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — OFFRES : CYCLE DE VIE
// ══════════════════════════════════════════════════════════════════════════════

describe('Cycle de vie des offres', () => {
  let idOffreTest: number
  let idOffreAvecSous: number
  let idCollabTest: number

  beforeAll(async () => {
    const o1 = await prisma.abonnement.create({
      data: { tenant_id: T1, nom: 'TEST-CV-OFFRE', montant: 1000, periodicite: 'mensuel', statut: 'ACTIVE', created_by: testAdmin.id_utilisateur },
    })
    const o2 = await prisma.abonnement.create({
      data: { tenant_id: T1, nom: 'TEST-CV-OFFRE-AVEC-SOUS', montant: 1000, periodicite: 'mensuel', statut: 'ACTIVE', created_by: testAdmin.id_utilisateur },
    })
    const c = await prisma.collaborateur.create({
      data: { tenant_id: T1, nom: 'TEST-CV-C', prenom: 'X', statut: 'actif' },
    })
    idOffreTest = o1.id_abonnement
    idOffreAvecSous = o2.id_abonnement
    idCollabTest = c.id_collaborateur

    // Créer une souscription sur o2
    await prisma.souscriptionAbonnement.create({
      data: { tenant_id: T1, id_abonnement: idOffreAvecSous, id_collaborateur: idCollabTest, montant: 1000, date_debut: new Date('2026-01-01'), statut: 'ACTIVE', renouvellement_auto: false, created_by: testAdmin.id_utilisateur },
    })
  })

  afterAll(async () => {
    await prisma.souscriptionAbonnement.deleteMany({ where: { id_abonnement: idOffreAvecSous } })
    await prisma.abonnement.deleteMany({ where: { id_abonnement: { in: [idOffreTest, idOffreAvecSous] } } })
    await prisma.collaborateur.deleteMany({ where: { id_collaborateur: idCollabTest } })
  })

  it('Offre sans souscription peut être supprimée définitivement', async () => {
    const res = await aboIdDelete(
      new NextRequest(`http://localhost/api/abonnements/${idOffreTest}`, { method: 'DELETE', headers: authHeaders() }),
      ctx({ id: String(idOffreTest) })
    )
    expect(res.status).toBe(200)
    const inBD = await prisma.abonnement.findUnique({ where: { id_abonnement: idOffreTest } })
    expect(inBD).toBeNull()
  })

  it('Offre avec souscription ne peut PAS être supprimée → 409', async () => {
    const res = await aboIdDelete(
      new NextRequest(`http://localhost/api/abonnements/${idOffreAvecSous}`, { method: 'DELETE', headers: authHeaders() }),
      ctx({ id: String(idOffreAvecSous) })
    )
    expect(res.status).toBe(409)
    const err = await res.json()
    expect(err.error).toMatch(/souscription|archivage/i)
  })

  it('Archivage offre avec souscription ACTIVE → rejeté (409)', async () => {
    const res = await aboStatutPatch(
      reqPatch(`http://localhost/api/abonnements/${idOffreAvecSous}/statut`, { statut: 'ARCHIVED' }),
      ctx({ id: String(idOffreAvecSous) })
    )
    expect(res.status).toBe(409)
    const err = await res.json()
    expect(err.error).toMatch(/active|souscription/i)
  })

  it('Désactivation offre avec souscription ACTIVE → OK (les souscriptions continuent)', async () => {
    const res = await aboStatutPatch(
      reqPatch(`http://localhost/api/abonnements/${idOffreAvecSous}/statut`, { statut: 'INACTIVE' }),
      ctx({ id: String(idOffreAvecSous) })
    )
    expect(res.status).toBe(200)

    // La souscription est toujours ACTIVE
    const sous = await prisma.souscriptionAbonnement.findFirst({
      where: { id_abonnement: idOffreAvecSous },
    })
    expect(sous!.statut).toBe('ACTIVE')
  })

  it('Nouvelle souscription sur offre INACTIVE → rejetée (409)', async () => {
    const c2 = await prisma.collaborateur.create({ data: { tenant_id: T1, nom: 'TEST-CV-C2', statut: 'actif' } })
    try {
      const res = await sousPost(
        req('http://localhost/api/souscriptions-abonnements', {
          id_abonnement:    idOffreAvecSous,
          id_collaborateur: c2.id_collaborateur,
          montant: 1000, date_debut: '2026-06-01',
          renouvellement_auto: false,
        }),
        ctx()
      )
      expect(res.status).toBe(409)
      const err = await res.json()
      expect(err.error).toMatch(/inactive|active/i)
    } finally {
      await prisma.collaborateur.deleteMany({ where: { id_collaborateur: c2.id_collaborateur } })
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — ISOLATION MULTI-TENANT
// Les données d'un tenant ne doivent pas être visibles par un autre
// ══════════════════════════════════════════════════════════════════════════════

describe('Isolation multi-tenant', () => {
  it('GET /api/souscriptions-abonnements (T1) ne retourne pas les souscriptions T2', async () => {
    const res = await sousGet(reqGet('http://localhost/api/souscriptions-abonnements'), ctx())
    expect(res.status).toBe(200)
    const body = await res.json()
    const rows = body.data as Array<{ tenant_id: number }>
    const t2Rows = rows.filter(r => r.tenant_id === 2)
    expect(t2Rows).toHaveLength(0)
  })

  it('GET /api/abonnements (T1) ne retourne pas les offres T2', async () => {
    const res = await aboGet(reqGet('http://localhost/api/abonnements'), ctx())
    expect(res.status).toBe(200)
    const body = await res.json()
    const rows = body.data as Array<{ tenant_id: number }>
    const t2Rows = rows.filter(r => r.tenant_id === 2)
    expect(t2Rows).toHaveLength(0)
  })
})
