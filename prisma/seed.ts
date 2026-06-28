import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { createHash } from 'node:crypto'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter })

/** UUID v4 déterministe pour idempotence offline-sync en seed */
function seedClientUuid(kind: 'livraison' | 'vente', key: string): string {
  const hash = createHash('sha256').update(`pejaa-seed:${kind}:${key}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

/** Purge les données métier du tenant pour permettre un re-seed sans migrate reset */
async function clearTenantSeedData(tenantId: number) {
  const snapshots = await prisma.stockSnapshot.findMany({
    where: { tenant_id: tenantId },
    select: { id_snapshot: true },
  })
  if (snapshots.length > 0) {
    const snapshotIds = snapshots.map(s => s.id_snapshot)
    await prisma.snapshotLigne.deleteMany({ where: { id_snapshot: { in: snapshotIds } } })
    await prisma.stockSnapshot.deleteMany({ where: { tenant_id: tenantId } })
  }

  await prisma.venteArticle.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.encaissement.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.transactionFinanciere.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.vente.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.stockMouvement.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.stockActuel.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.livraisonItem.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.livraison.deleteMany({ where: { tenant_id: tenantId } })

  const abonnements = await prisma.abonnement.findMany({
    where: { tenant_id: tenantId },
    select: { id_abonnement: true },
  })
  if (abonnements.length > 0) {
    const aboIds = abonnements.map(a => a.id_abonnement)
    await prisma.abonnementCollaborateur.deleteMany({ where: { id_abonnement: { in: aboIds } } })
    await prisma.abonnementPaiement.deleteMany({ where: { id_abonnement: { in: aboIds } } })
    await prisma.abonnement.deleteMany({ where: { tenant_id: tenantId } })
  }

  await prisma.client.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.produitCatalogue.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.collaborateur.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.financialCategory.deleteMany({ where: { tenant_id: tenantId } })
}

async function main() {
  console.log('[Seed] Starting database seed...')
  const T = 1 // tenant_id

  // ═══ 1. RBAC ═══════════════════════════════════════════════════════════
  const roles = [
    { code: 'super_admin', label: 'Super Administrateur' },
    { code: 'admin', label: 'Administrateur' },
    { code: 'employe', label: 'Employé' },
    { code: 'client', label: 'Client' },
    { code: 'collaborateur', label: 'Collaborateur' },
  ]
  for (const r of roles) await prisma.role.upsert({ where: { code: r.code }, update: {}, create: r })

  const domains = [
    { code: 'DASHBOARD', label: 'Dashboard' }, { code: 'STOCK', label: 'Stock' },
    { code: 'VENTES', label: 'Ventes' }, { code: 'ABO', label: 'Abonnements' },
    { code: 'COLLAB', label: 'Collaborateurs' }, { code: 'FINANCE', label: 'Finance' },
    { code: 'PARAM', label: 'Paramètres' }, { code: 'PRODUITS', label: 'Produits' },
    { code: 'COMMANDES', label: 'Commandes' }, { code: 'LIVRAISONS', label: 'Livraisons' },
    { code: 'POINTS_DE_VENTE', label: 'Points de vente' }, { code: 'ENCAISSEMENTS', label: 'Encaissements' },
  ]
  for (const d of domains) await prisma.accessDomain.upsert({ where: { code: d.code }, update: {}, create: d })

  const matrix: { role: string; domain: string; r: boolean; w: boolean; d: boolean; m: boolean }[] = [
    ...domains.map((d) => ({ role: 'super_admin', domain: d.code, r: true, w: true, d: true, m: true })),
    ...domains.map((d) => ({ role: 'admin', domain: d.code, r: true, w: true, d: d.code !== 'PARAM', m: d.code !== 'PARAM' })),
    ...['DASHBOARD','STOCK','VENTES','COLLAB','FINANCE','PRODUITS','COMMANDES','LIVRAISONS','POINTS_DE_VENTE','ENCAISSEMENTS']
      .map((d) => ({ role: 'employe', domain: d, r: true, w: true, d: false, m: false })),
    { role: 'client', domain: 'DASHBOARD', r: false, w: false, d: false, m: false },
    { role: 'collaborateur', domain: 'DASHBOARD', r: true, w: false, d: false, m: false },
  ]
  for (const e of matrix) {
    const role = await prisma.role.findUnique({ where: { code: e.role } })
    const domain = await prisma.accessDomain.findUnique({ where: { code: e.domain } })
    if (role && domain) {
      await prisma.roleAccessMatrix.upsert({
        where: { id_role_id_domain: { id_role: role.id_role, id_domain: domain.id_domain } },
        update: {},
        create: { id_role: role.id_role, id_domain: domain.id_domain, can_read: e.r, can_write: e.w, can_delete: e.d, can_manage: e.m },
      })
    }
  }
  console.log('[Seed] RBAC created')

  // ═══ 2. Users ══════════════════════════════════════════════════════════
  const usersDef = [
    { email: 'admin@pejaa.com', password: 'Pejaa2026', nom: 'Admin', prenom: 'Principal', role: 'admin' },
    { email: 'Lancs0022@gmail.com', password: 'Lancs0022', nom: 'Lancs', prenom: 'Dev', role: 'admin' },
    { email: 'employe@pejaa.com', password: 'Pejaa2026', nom: 'Employe', prenom: 'Test', role: 'employe' },
    { email: 'client@pejaa.com', password: 'Pejaa2026', nom: 'Client', prenom: 'Test', role: 'client' },
    { email: 'collab@pejaa.com', password: 'Pejaa2026', nom: 'Collaborateur', prenom: 'Test', role: 'collaborateur' },
  ]
  const userIds: number[] = []
  for (const u of usersDef) {
    const hash = await bcrypt.hash(u.password, 10)
    const user = await prisma.utilisateur.upsert({
      where: { email: u.email }, update: {},
      create: { tenant_id: T, nom: u.nom, prenom: u.prenom, email: u.email, password_hash: hash, role: u.role, actif: true },
    })
    userIds.push(user.id_utilisateur)
  }
  const adminId = userIds[0] // admin
  const lancsId = userIds[1] // Lancs
  console.log('[Seed] Users created')

  // ═══ 3. Point de vente ═════════════════════════════════════════════════
  const pdv = await prisma.pointDeVente.upsert({
    where: { id_pdv: 1 }, update: {},
    create: {
      tenant_id: T, nom: 'PEJAA - Boutique principale', quartier: 'Analakely', ville: 'Antananarivo',
      adresse: 'Rue Rainilaiarivony, Analakely', telephone: '+261 20 22 123 45', email: 'boutique@pejaa.com',
      responsable_id: adminId, statut: 'actif', date_ouverture: new Date('2024-01-15'),
    },
  })
  console.log(`[Seed] PDV created (id=${pdv.id_pdv})`)

  await clearTenantSeedData(T)
  console.log('[Seed] Données métier du tenant réinitialisées (re-seed idempotent)')

  // ═══ 4. Collaborateurs ═════════════════════════════════════════════════
  const collabDefs = [
    { nom: 'Rakoto', prenom: 'Jean', telephone: '+261 34 11 111 11', email: 'rakoto@pejaa.com', poste: 'Artisanat' },
    { nom: 'Miora', prenom: 'Aina', telephone: '+261 34 22 222 22', email: 'miora@pejaa.com', poste: 'Textile' },
    { nom: 'Andry', prenom: 'Fidy', telephone: '+261 34 33 333 33', email: 'andry@pejaa.com', poste: 'Alimentaire' },
    { nom: 'Fara', prenom: 'Noro', telephone: '+261 34 44 444 44', email: 'fara@pejaa.com', poste: 'Accessoires' },
    { nom: 'Hery', prenom: 'Lova', telephone: '+261 34 55 555 55', email: 'hery@pejaa.com', poste: 'Décoration' },
  ]
  const collabIds: number[] = []
  for (const c of collabDefs) {
    const created = await prisma.collaborateur.create({
      data: { tenant_id: T, ...c, statut: 'actif', date_adhesion: new Date('2024-01-01') },
    })
    collabIds.push(created.id_collaborateur)
  }
  console.log(`[Seed] ${collabIds.length} collaborateurs created`)

  // ═══ 5. Produits catalogue (5 per collaborateur = 25) ═════════════════
  const prodDefs: { nom: string; cat: string; unite: string; collab: number }[] = [
    // Rakoto — Artisanat
    { nom: 'Panier artisanal tressé', cat: 'Artisanat', unite: 'pièce', collab: 0 },
    { nom: 'Panier rond décoratif', cat: 'Artisanat', unite: 'pièce', collab: 0 },
    { nom: 'Corbeille à fruits', cat: 'Artisanat', unite: 'pièce', collab: 0 },
    { nom: 'Sac en raphia', cat: 'Artisanat', unite: 'pièce', collab: 0 },
    { nom: 'Vase en terre cuite', cat: 'Artisanat', unite: 'pièce', collab: 0 },
    // Miora — Textile
    { nom: 'Nappe brodée', cat: 'Textile', unite: 'pièce', collab: 1 },
    { nom: 'Foulard en soie', cat: 'Textile', unite: 'pièce', collab: 1 },
    { nom: 'Coussin décoratif', cat: 'Textile', unite: 'pièce', collab: 1 },
    { nom: 'Rideau en lin', cat: 'Textile', unite: 'pièce', collab: 1 },
    { nom: 'Plaid en coton', cat: 'Textile', unite: 'pièce', collab: 1 },
    // Andry — Alimentaire
    { nom: 'Épices locales (lot)', cat: 'Alimentaire', unite: 'kg', collab: 2 },
    { nom: 'Vanille de Madagascar', cat: 'Alimentaire', unite: 'kg', collab: 2 },
    { nom: 'Poivre sauvage', cat: 'Alimentaire', unite: 'kg', collab: 2 },
    { nom: 'Cacao en poudre', cat: 'Alimentaire', unite: 'kg', collab: 2 },
    { nom: 'Miel de forêt', cat: 'Alimentaire', unite: 'pot', collab: 2 },
    // Fara — Accessoires
    { nom: 'Chapeau raphia', cat: 'Accessoires', unite: 'pièce', collab: 3 },
    { nom: 'Bracelet en corne', cat: 'Accessoires', unite: 'pièce', collab: 3 },
    { nom: 'Collier perles', cat: 'Accessoires', unite: 'pièce', collab: 3 },
    { nom: 'Bague argent', cat: 'Accessoires', unite: 'pièce', collab: 3 },
    { nom: 'Boucles oreilles', cat: 'Accessoires', unite: 'pièce', collab: 3 },
    // Hery — Décoration
    { nom: 'Bougeoir en bois', cat: 'Décoration', unite: 'pièce', collab: 4 },
    { nom: 'Cadre photo sculpté', cat: 'Décoration', unite: 'pièce', collab: 4 },
    { nom: 'Statuette palissandre', cat: 'Décoration', unite: 'pièce', collab: 4 },
    { nom: 'Lampe artisanale', cat: 'Décoration', unite: 'pièce', collab: 4 },
    { nom: 'Miroir décoratif', cat: 'Décoration', unite: 'pièce', collab: 4 },
  ]
  const produitIds: number[] = []
  for (const p of prodDefs) {
    const created = await prisma.produitCatalogue.create({
      data: {
        tenant_id: T, id_collaborateur: collabIds[p.collab], nom: p.nom,
        description: `${p.nom} — fabrication malgache`, categorie: p.cat, unite: p.unite,
        seuil_alerte: 10, statut: 'actif', created_by: lancsId,
      },
    })
    produitIds.push(created.id_produit)
  }
  console.log(`[Seed] ${produitIds.length} produits created`)

  // ═══ 6. Livraisons + LivraisonItem + StockActuel + StockMouvement ══════
  const dateL1 = new Date('2025-01-10')
  const dateL2 = new Date('2025-02-05')
  const dateL3 = new Date('2025-03-12')
  const dateL4 = new Date('2025-04-01')

  // Each delivery line: { produitIndex (in produitIds), qty, prix, marge }
  const deliveryDefs: { date: Date; collab: number; ref: string; items: { pi: number; qty: number; prix: number; marge: number }[] }[] = [
    { date: dateL1, collab: 0, ref: 'LIV-2025-001', items: [
      { pi: 0, qty: 50, prix: 15000, marge: 3000 }, { pi: 5, qty: 40, prix: 25000, marge: 5000 },
      { pi: 10, qty: 60, prix: 8000, marge: 2000 }, { pi: 15, qty: 35, prix: 12000, marge: 3000 },
      { pi: 20, qty: 45, prix: 18000, marge: 4000 },
    ]},
    { date: dateL2, collab: 1, ref: 'LIV-2025-002', items: [
      { pi: 1, qty: 30, prix: 20000, marge: 4000 }, { pi: 6, qty: 25, prix: 30000, marge: 6000 },
    ]},
    { date: dateL3, collab: 2, ref: 'LIV-2025-003', items: [
      { pi: 2, qty: 40, prix: 10000, marge: 2500 }, { pi: 7, qty: 35, prix: 22000, marge: 5000 },
      { pi: 12, qty: 50, prix: 9000, marge: 2000 },
    ]},
    { date: dateL4, collab: 3, ref: 'LIV-2025-004', items: [
      { pi: 3, qty: 30, prix: 28000, marge: 6000 }, { pi: 8, qty: 20, prix: 35000, marge: 7000 },
      { pi: 22, qty: 25, prix: 45000, marge: 10000 },
    ]},
  ]

  // Track lot IDs by product index for sales
  const lotByProdIdx: Map<number, { id_lot: number; id_pdv: number; qty: number }> = new Map()

  for (const del of deliveryDefs) {
    const clientUuid = seedClientUuid('livraison', del.ref)
    const livraison = await prisma.livraison.upsert({
      where: { tenant_id_client_uuid: { tenant_id: T, client_uuid: clientUuid } },
      update: {},
      create: {
        tenant_id: T, id_collaborateur: collabIds[del.collab], id_pdv: pdv.id_pdv,
        client_uuid: clientUuid,
        date_livraison: del.date, reference: del.ref,
      },
    })

    const existingItems = await prisma.livraisonItem.count({
      where: { id_livraison: livraison.id_livraison },
    })
    if (existingItems > 0) {
      for (const item of del.items) {
        const li = await prisma.livraisonItem.findFirst({
          where: { id_livraison: livraison.id_livraison, id_produit: produitIds[item.pi] },
        })
        if (li) {
          const stock = await prisma.stockActuel.findFirst({
            where: { tenant_id: T, id_lot: li.id_lot, id_pdv: pdv.id_pdv },
          })
          lotByProdIdx.set(item.pi, {
            id_lot: li.id_lot,
            id_pdv: pdv.id_pdv,
            qty: stock ? Number(stock.quantite) : Number(li.quantite_initiale),
          })
        }
      }
      continue
    }

    for (const item of del.items) {
      const li = await prisma.livraisonItem.create({
        data: {
          tenant_id: T, id_produit: produitIds[item.pi], id_livraison: livraison.id_livraison,
          id_pdv: pdv.id_pdv, prix_initial: item.prix, marge: item.marge,
          quantite_initiale: item.qty, date_livraison: del.date, created_by: lancsId,
        },
      })

      await prisma.stockActuel.create({
        data: { tenant_id: T, id_lot: li.id_lot, id_pdv: pdv.id_pdv, quantite: item.qty, created_by: lancsId },
      })

      await prisma.stockMouvement.create({
        data: {
          tenant_id: T, id_lot: li.id_lot, type: 'entree', quantite: item.qty,
          before_qty: 0, after_qty: item.qty, source_type: 'LIVRAISON',
          source_id: livraison.id_livraison, created_by: lancsId,
        },
      })

      lotByProdIdx.set(item.pi, { id_lot: li.id_lot, id_pdv: pdv.id_pdv, qty: item.qty })
    }
  }
  console.log(`[Seed] ${deliveryDefs.length} livraisons with items, stock_actuel, mouvements created`)

  // ═══ 7. Clients ════════════════════════════════════════════════════════
  const clientDefs = [
    { nom: 'Client', prenom: 'Divers', email: null, telephone: null },
    { nom: 'Rasoa', prenom: 'Marie', email: 'rasoa@email.com', telephone: '+261 34 60 000 01' },
    { nom: 'Rabe', prenom: 'Pierre', email: 'rabe@email.com', telephone: '+261 34 60 000 02' },
    { nom: 'Randria', prenom: 'Hanta', email: 'hanta@email.com', telephone: '+261 34 60 000 03' },
  ]
  const clientIds: number[] = []
  for (const c of clientDefs) {
    const created = await prisma.client.create({
      data: { tenant_id: T, ...c, date_inscription: new Date('2025-01-01') },
    })
    clientIds.push(created.id_client)
  }
  console.log(`[Seed] ${clientIds.length} clients created`)

  // ═══ 8. Abonnement ═════════════════════════════════════════════════════
  const abo = await prisma.abonnement.create({
    data: {
      tenant_id: T, nom: 'Abonnement de base', montant: 20000, periodicite: 'mensuel',
      impact_type: 'POURCENTAGE', impact_pourcentage: 10, actif: true,
    },
  })
  await prisma.abonnementCollaborateur.create({ data: { id_abonnement: abo.id_abonnement, id_collaborateur: collabIds[0], date_debut: new Date() } })
  await prisma.abonnementCollaborateur.create({ data: { id_abonnement: abo.id_abonnement, id_collaborateur: collabIds[1], date_debut: new Date() } })
  console.log('[Seed] Abonnement created')

  // ═══ 9. Financial categories ═══════════════════════════════════════════
  const catDefs = [
    { name: 'Vente directe', type: 'IN' }, { name: 'Vente sur commande', type: 'IN' },
    { name: 'Retour', type: 'OUT' }, { name: 'Transport', type: 'OUT' },
    { name: 'Salaire', type: 'OUT' }, { name: 'Loyer', type: 'OUT' },
    { name: 'Autre', type: 'BOTH' },
  ]
  const catIds: number[] = []
  for (const cat of catDefs) {
    const c = await prisma.financialCategory.create({ data: { tenant_id: T, ...cat } })
    catIds.push(c.id_category)
  }
  const venteCatId = catIds[0] // "Vente directe" category
  console.log(`[Seed] ${catIds.length} financial categories created`)

  // ═══ 10. Ventes (10 ventes × 2 articles each, full ledger) ════════════
  // Each vente: Vente + VenteArticle ×2 + StockMouvement(sortie) ×2 + TransactionFinanciere(IN) + update stock_actuel
  const venteDefs: { clientIdx: number; items: { pi: number; qty: number; collabIdx: number }[] }[] = [
    { clientIdx: 0, items: [{ pi: 0, qty: 3, collabIdx: 0 }, { pi: 5, qty: 2, collabIdx: 1 }] },
    { clientIdx: 1, items: [{ pi: 10, qty: 5, collabIdx: 2 }, { pi: 15, qty: 2, collabIdx: 3 }] },
    { clientIdx: 2, items: [{ pi: 20, qty: 1, collabIdx: 4 }, { pi: 1, qty: 3, collabIdx: 0 }] },
    { clientIdx: 0, items: [{ pi: 6, qty: 2, collabIdx: 1 }, { pi: 12, qty: 4, collabIdx: 2 }] },
    { clientIdx: 3, items: [{ pi: 7, qty: 1, collabIdx: 1 }, { pi: 2, qty: 3, collabIdx: 0 }] },
    { clientIdx: 1, items: [{ pi: 3, qty: 2, collabIdx: 0 }, { pi: 8, qty: 1, collabIdx: 1 }] },
    { clientIdx: 0, items: [{ pi: 22, qty: 1, collabIdx: 4 }, { pi: 0, qty: 5, collabIdx: 0 }] },
    { clientIdx: 2, items: [{ pi: 5, qty: 3, collabIdx: 1 }, { pi: 10, qty: 2, collabIdx: 2 }] },
    { clientIdx: 0, items: [{ pi: 15, qty: 4, collabIdx: 3 }, { pi: 20, qty: 2, collabIdx: 4 }] },
    { clientIdx: 3, items: [{ pi: 1, qty: 2, collabIdx: 0 }, { pi: 12, qty: 3, collabIdx: 2 }] },
  ]

  // Helper to get lot info and decrement stock
  async function sellArticle(
    tx: any, pi: number, qty: number, venteId: number, collabId: number, prix: number, marge: number,
  ) {
    const lotInfo = lotByProdIdx.get(pi)
    if (!lotInfo) throw new Error(`No lot for product index ${pi}`)

    const line_ht = qty * prix
    const line_marge = marge * qty

    await tx.venteArticle.create({
      data: {
        tenant_id: T, id_vente: venteId, id_lot: lotInfo.id_lot, id_collaborateur: collabId,
        quantite_vendue: qty, prix_initial: prix, marge, montant_ht: line_ht, montant_tva: 0, montant_marge: line_marge,
      },
    })

    // Stock movement (sortie)
    const stock = await tx.stockActuel.findFirst({
      where: { tenant_id: T, id_lot: lotInfo.id_lot, id_pdv: lotInfo.id_pdv },
    })
    const before = stock ? Number(stock.quantite) : 0
    const after = before - qty

    await tx.stockMouvement.create({
      data: {
        tenant_id: T, id_lot: lotInfo.id_lot, type: 'sortie', quantite: qty,
        before_qty: before, after_qty: after, source_type: 'VENTE', source_id: venteId, created_by: lancsId,
      },
    })

    if (stock) {
      await tx.stockActuel.update({ where: { id: stock.id }, data: { quantite: after } })
    }

    // Update lot tracking
    lotInfo.qty = after

    return { line_ht, line_marge }
  }

  for (let i = 0; i < venteDefs.length; i++) {
    const vd = venteDefs[i]
    const item0 = vd.items[0]
    const item1 = vd.items[1]
    const lot0 = lotByProdIdx.get(item0.pi)!
    const lot1 = lotByProdIdx.get(item1.pi)!
    const prix0 = (await prisma.livraisonItem.findUnique({ where: { id_lot: lot0.id_lot } }))!.prix_initial
    const marge0 = (await prisma.livraisonItem.findUnique({ where: { id_lot: lot0.id_lot } }))!.marge
    const prix1 = (await prisma.livraisonItem.findUnique({ where: { id_lot: lot1.id_lot } }))!.prix_initial
    const marge1 = (await prisma.livraisonItem.findUnique({ where: { id_lot: lot1.id_lot } }))!.marge

    const venteUuid = seedClientUuid('vente', `vente-${i + 1}`)
    const existingVente = await prisma.vente.findUnique({
      where: { tenant_id_client_uuid: { tenant_id: T, client_uuid: venteUuid } },
    })
    if (existingVente) continue

    await prisma.$transaction(async (tx) => {
      const vente = await tx.vente.create({
        data: {
          tenant_id: T, id_point_vente: pdv.id_pdv, id_client: clientIds[vd.clientIdx],
          client_uuid: venteUuid,
          enregistre_par_admin_id: lancsId, id_utilisateur: lancsId,
          date_vente: new Date(2025, 0, 15 + i * 3), statut: 'payee',
        },
      })

      const r0 = await sellArticle(tx, item0.pi, item0.qty, vente.id_vente, collabIds[item0.collabIdx], Number(prix0), Number(marge0))
      const r1 = await sellArticle(tx, item1.pi, item1.qty, vente.id_vente, collabIds[item1.collabIdx], Number(prix1), Number(marge1))

      const total_ht = r0.line_ht + r1.line_ht
      const total_marge = r0.line_marge + r1.line_marge

      await tx.vente.update({
        where: { id_vente: vente.id_vente },
        data: { montant_ht: total_ht, montant_tva: 0, montant_marge: total_marge, montant_total: total_ht },
      })

      await tx.transactionFinanciere.create({
        data: {
          tenant_id: T, type: 'IN', montant: total_ht, id_categorie_financiere: venteCatId,
          source_module: 'VENTE', source_id: vente.id_vente,
          description: `Vente #${vente.id_vente} — ${vd.items.length} articles`, created_by: lancsId,
        },
      })
    })
  }
  console.log(`[Seed] ${venteDefs.length} ventes with full ledger entries created`)

  console.log('[Seed] ✅ Database seed complete!')
}

main()
  .catch((e) => { console.error('[Seed] Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
