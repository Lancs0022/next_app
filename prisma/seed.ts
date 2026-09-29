import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { createHash } from 'node:crypto'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter })

function seedClientUuid(kind: 'livraison' | 'vente', key: string): string {
  const hash = createHash('sha256').update(`pejaa-seed:${kind}:${key}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}



// ─── Helpers stock ─────────────────────────────────────────────────────────────

async function applyStockMouvement(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  opts: {
    tenant_id: number
    id_lot: number
    id_pdv: number
    type: string
    quantite: number
    source_type: string
    source_id: number
    created_by: number
  }
) {
  const { tenant_id, id_lot, id_pdv, type, quantite, source_type, source_id, created_by } = opts
  const stock = await tx.stockActuel.findFirst({ where: { tenant_id, id_lot, id_pdv } })
  const before_qty = stock ? Number(stock.quantite) : 0
  const delta = type === 'sortie' ? -quantite : quantite
  const after_qty = before_qty + delta

  await tx.stockMouvement.create({
    data: { tenant_id, id_lot, type, quantite, before_qty, after_qty, source_type, source_id, created_by },
  })

  if (stock) {
    await tx.stockActuel.update({ where: { id: stock.id }, data: { quantite: after_qty } })
  } else {
    await tx.stockActuel.create({
      data: { tenant_id, id_lot, id_pdv, quantite: after_qty, quantite_reservee: 0, created_by },
    })
  }
  return after_qty
}

// ─── Clear ─────────────────────────────────────────────────────────────────────

async function clearTenantSeedData(tenantId: number) {
  const snapshots = await prisma.stockSnapshot.findMany({
    where: { tenant_id: tenantId },
    select: { id_snapshot: true },
  })
  if (snapshots.length > 0) {
    const ids = snapshots.map(s => s.id_snapshot)
    await prisma.snapshotLigne.deleteMany({ where: { id_snapshot: { in: ids } } })
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

  const abos = await prisma.abonnement.findMany({
    where: { tenant_id: tenantId },
    select: { id_abonnement: true },
  })
  if (abos.length > 0) {
    const aboIds = abos.map(a => a.id_abonnement)
    const souscriptions = await prisma.souscriptionAbonnement.findMany({
      where: { id_abonnement: { in: aboIds } },
      select: { id_souscription_abonnement: true },
    })
    if (souscriptions.length > 0) {
      const souscriptionIds = souscriptions.map(s => s.id_souscription_abonnement)
      const echeances = await prisma.echeanceAbonnement.findMany({
        where: { id_souscription_abonnement: { in: souscriptionIds } },
        select: { id_echeance_abonnement: true },
      })
      if (echeances.length > 0) {
        const echeanceIds = echeances.map(e => e.id_echeance_abonnement)
        await prisma.paiementAbonnement.deleteMany({ where: { id_echeance_abonnement: { in: echeanceIds } } })
      }
      await prisma.echeanceAbonnement.deleteMany({ where: { id_souscription_abonnement: { in: souscriptionIds } } })
    }
    await prisma.souscriptionAbonnement.deleteMany({ where: { id_abonnement: { in: aboIds } } })
    await prisma.abonnement.deleteMany({ where: { tenant_id: tenantId } })
  }

  await prisma.client.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.produitCatalogue.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.collaborateur.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.uniteDeMesure.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.financialCategory.deleteMany({ where: { tenant_id: tenantId } })
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Seed] Starting…')
  const T = 1

  // ═══ 1. RBAC ═══════════════════════════════════════════════════════════════
  const roles = [
    { code: 'super_admin', label: 'Super Administrateur' },
    { code: 'admin',       label: 'Administrateur' },
    { code: 'employe',     label: 'Employé' },
    { code: 'client',      label: 'Client' },
    { code: 'collaborateur', label: 'Collaborateur' },
  ]
  for (const r of roles) await prisma.role.upsert({ where: { code: r.code }, update: {}, create: r })

  const domains = [
    { code: 'DASHBOARD',      label: 'Dashboard' },
    { code: 'STOCK',          label: 'Stock' },
    { code: 'VENTES',         label: 'Ventes' },
    { code: 'ABO',            label: 'Abonnements' },
    { code: 'COLLAB',         label: 'Collaborateurs' },
    { code: 'FINANCE',        label: 'Finance' },
    { code: 'PARAM',          label: 'Paramètres' },
    { code: 'PRODUITS',       label: 'Produits' },
    { code: 'COMMANDES',      label: 'Commandes' },
    { code: 'LIVRAISONS',     label: 'Livraisons' },
    { code: 'POINTS_DE_VENTE',label: 'Points de vente' },
    { code: 'ENCAISSEMENTS',  label: 'Encaissements' },
    { code: 'UNITES',         label: 'Unités de mesure' },
    { code: 'UTILISATEURS',   label: 'Gestion utilisateurs' },
    { code: 'RBAC',           label: 'Gestion autorisations' },
  ]
  for (const d of domains) await prisma.accessDomain.upsert({ where: { code: d.code }, update: {}, create: d })

  const operationalDomains = [
    'DASHBOARD','STOCK','VENTES','ABO','COLLAB','FINANCE','PRODUITS',
    'COMMANDES','LIVRAISONS','POINTS_DE_VENTE','ENCAISSEMENTS',
    'UNITES',
  ]
  const matrix: { role: string; domain: string; r: boolean; w: boolean; d: boolean; m: boolean }[] = [
    ...domains.map(d => ({ role: 'super_admin', domain: d.code, r: true, w: true, d: true, m: true })),
    ...domains.map(d => ({
      role: 'admin', domain: d.code,
      r: !['UTILISATEURS','RBAC'].includes(d.code),
      w: !['UNITES','UTILISATEURS','RBAC','PARAM'].includes(d.code),
      d: !['UNITES','UTILISATEURS','RBAC','PARAM'].includes(d.code),
      m: !['UNITES','UTILISATEURS','RBAC','PARAM'].includes(d.code),
    })),
    ...operationalDomains.map(d => ({ role: 'employe', domain: d, r: true, w: true, d: false, m: false })),
    { role: 'client',        domain: 'DASHBOARD', r: false, w: false, d: false, m: false },
    { role: 'client',        domain: 'UNITES',    r: true,  w: false, d: false, m: false },
    { role: 'collaborateur', domain: 'DASHBOARD', r: true,  w: false, d: false, m: false },
    { role: 'collaborateur', domain: 'UNITES',    r: true,  w: false, d: false, m: false },
  ]
  for (const e of matrix) {
    const role   = await prisma.role.findUnique({ where: { code: e.role } })
    const domain = await prisma.accessDomain.findUnique({ where: { code: e.domain } })
    if (role && domain) {
      await prisma.roleAccessMatrix.upsert({
        where: { id_role_id_domain: { id_role: role.id_role, id_domain: domain.id_domain } },
        update: { can_read: e.r, can_write: e.w, can_delete: e.d, can_manage: e.m },
        create: { id_role: role.id_role, id_domain: domain.id_domain, can_read: e.r, can_write: e.w, can_delete: e.d, can_manage: e.m },
      })
    }
  }
  console.log('[Seed] RBAC ok')

  // ═══ 2. Utilisateurs ════════════════════════════════════════════════════════
  const usersDef = [
    { email: 'admin@pejaa.com',     password: 'Pejaa2026', nom: 'Admin',   prenom: 'Principal', role: 'admin'       },
    { email: 'Lancs0022@gmail.com', password: 'Lancs0022', nom: 'Lancs',   prenom: 'Dev',       role: 'super_admin' },
    { email: 'employe@pejaa.com',   password: 'Pejaa2026', nom: 'Employe', prenom: 'Test',      role: 'employe'     },
  ]
  const userMap: Record<string, number> = {}
  for (const u of usersDef) {
    const hash = await bcrypt.hash(u.password, 10)
    const user = await prisma.utilisateur.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { tenant_id: T, nom: u.nom, prenom: u.prenom, email: u.email, password_hash: hash, role: u.role, actif: true },
    })
    userMap[u.email] = user.id_utilisateur
  }
  const adminId = userMap['admin@pejaa.com']
  const lancsId = userMap['Lancs0022@gmail.com']
  console.log('[Seed] Users ok')

  // ═══ 3. Point de vente ══════════════════════════════════════════════════════
  const pdv = await prisma.pointDeVente.upsert({
    where: { id_pdv: 1 },
    update: {},
    create: {
      tenant_id: T, nom: 'PEJAA — Boutique principale', quartier: 'Analakely', ville: 'Antananarivo',
      adresse: 'Rue Rainilaiarivony, Analakely', telephone: '+261 20 22 123 45', email: 'boutique@pejaa.com',
      responsable_id: adminId, statut: 'actif', date_ouverture: new Date('2024-01-15'),
    },
  })
  console.log(`[Seed] PDV ok (id=${pdv.id_pdv})`)

  await clearTenantSeedData(T)
  console.log('[Seed] Données métier réinitialisées')

  // ═══ 4. Unités de mesure ════════════════════════════════════════════════════
  const unitesDef = [
    { code: 'U',  label: 'Unité',      est_decimal: false, precision: 0 },
    { code: 'KG', label: 'Kilogramme', est_decimal: true,  precision: 3 },
    { code: 'G',  label: 'Gramme',     est_decimal: true,  precision: 1 },
    { code: 'L',  label: 'Litre',      est_decimal: true,  precision: 3 },
    { code: 'ML', label: 'Millilitre', est_decimal: true,  precision: 1 },
    { code: 'M',  label: 'Mètre',      est_decimal: true,  precision: 2 },
    { code: 'CM', label: 'Centimètre', est_decimal: true,  precision: 1 },
  ]
  const uniteIds: Record<string, number> = {}
  for (const u of unitesDef) {
    const created = await prisma.uniteDeMesure.create({ data: { tenant_id: T, ...u, actif: true } })
    uniteIds[u.code] = created.id_unite
  }
  console.log(`[Seed] ${unitesDef.length} unités de mesure créées`)

  // ═══ 5. Collaborateurs ══════════════════════════════════════════════════════
  const collabDefs = [
    { nom: 'Rakoto', prenom: 'Jean',  poste: 'Artisanat'   },
    { nom: 'Miora',  prenom: 'Aina',  poste: 'Textile'     },
    { nom: 'Andry',  prenom: 'Fidy',  poste: 'Alimentaire' },
    { nom: 'Fara',   prenom: 'Noro',  poste: 'Accessoires' },
    { nom: 'Hery',   prenom: 'Lova',  poste: 'Décoration'  },
  ]
  const collabIds: number[] = []
  for (const c of collabDefs) {
    const created = await prisma.collaborateur.create({
      data: { tenant_id: T, ...c, statut: 'actif', date_adhesion: new Date('2024-01-01') },
    })
    collabIds.push(created.id_collaborateur)
  }
  console.log(`[Seed] ${collabIds.length} collaborateurs créés`)

  // ═══ 6. Produits catalogue ══════════════════════════════════════════════════
  type ProdDef = { nom: string; cat: string; unite: string; collab: number; seuil: number }
  const prodDefs: ProdDef[] = [
    // Rakoto — Artisanat
    { nom: 'Panier artisanal tressé', cat: 'Artisanat',   unite: 'U',  collab: 0, seuil: 5   },
    { nom: 'Panier rond décoratif',   cat: 'Artisanat',   unite: 'U',  collab: 0, seuil: 5   },
    { nom: 'Corbeille à fruits',      cat: 'Artisanat',   unite: 'U',  collab: 0, seuil: 5   },
    { nom: 'Sac en raphia',           cat: 'Artisanat',   unite: 'U',  collab: 0, seuil: 5   },
    { nom: 'Vase en terre cuite',     cat: 'Artisanat',   unite: 'U',  collab: 0, seuil: 3   },
    // Miora — Textile
    { nom: 'Nappe brodée',            cat: 'Textile',     unite: 'U',  collab: 1, seuil: 5   },
    { nom: 'Foulard en soie',         cat: 'Textile',     unite: 'U',  collab: 1, seuil: 5   },
    { nom: 'Coussin décoratif',       cat: 'Textile',     unite: 'U',  collab: 1, seuil: 5   },
    { nom: 'Rideau en lin',           cat: 'Textile',     unite: 'U',  collab: 1, seuil: 3   },
    { nom: 'Plaid en coton',          cat: 'Textile',     unite: 'U',  collab: 1, seuil: 3   },
    // Andry — Alimentaire (décimaux)
    { nom: 'Épices locales (vrac)',   cat: 'Alimentaire', unite: 'KG', collab: 2, seuil: 1   },
    { nom: 'Vanille de Madagascar',   cat: 'Alimentaire', unite: 'KG', collab: 2, seuil: 0.5 },
    { nom: 'Poivre sauvage',          cat: 'Alimentaire', unite: 'KG', collab: 2, seuil: 0.5 },
    { nom: 'Cacao en poudre',         cat: 'Alimentaire', unite: 'KG', collab: 2, seuil: 1   },
    { nom: 'Miel de forêt (vrac)',    cat: 'Alimentaire', unite: 'L',  collab: 2, seuil: 0.5 },
    { nom: 'Miel de forêt 250ml',     cat: 'Alimentaire', unite: 'U',  collab: 2, seuil: 5   },
    { nom: 'Huile (vrac)',            cat: 'Alimentaire', unite: 'L',  collab: 2, seuil: 2   },
    { nom: 'Huile en bouteille 1L',   cat: 'Alimentaire', unite: 'U',  collab: 2, seuil: 5   },
    // Fara — Accessoires
    { nom: 'Chapeau raphia',          cat: 'Accessoires', unite: 'U',  collab: 3, seuil: 5   },
    { nom: 'Bracelet en corne',       cat: 'Accessoires', unite: 'U',  collab: 3, seuil: 5   },
    { nom: 'Collier perles',          cat: 'Accessoires', unite: 'U',  collab: 3, seuil: 5   },
    { nom: 'Bague argent',            cat: 'Accessoires', unite: 'U',  collab: 3, seuil: 3   },
    { nom: 'Boucles oreilles',        cat: 'Accessoires', unite: 'U',  collab: 3, seuil: 3   },
    // Hery — Décoration
    { nom: 'Bougeoir en bois',        cat: 'Décoration',  unite: 'U',  collab: 4, seuil: 3   },
    { nom: 'Cadre photo sculpté',     cat: 'Décoration',  unite: 'U',  collab: 4, seuil: 3   },
    { nom: 'Statuette palissandre',   cat: 'Décoration',  unite: 'U',  collab: 4, seuil: 3   },
    { nom: 'Lampe artisanale',        cat: 'Décoration',  unite: 'U',  collab: 4, seuil: 2   },
    { nom: 'Miroir décoratif',        cat: 'Décoration',  unite: 'U',  collab: 4, seuil: 2   },
    // ── Nouveaux produits pour les scénarios d'annulation ──────────────────────
    // Andry — Alimentaire (décimaux) : pour la livraison 5
    { nom: 'Café vert (vrac)',        cat: 'Alimentaire', unite: 'KG', collab: 2, seuil: 0.5 },
    { nom: 'Thé rouge (vrac)',        cat: 'Alimentaire', unite: 'KG', collab: 2, seuil: 0.5 },
    // Miora — Textile (entier) : pour la livraison 6
    { nom: 'Tapis en sisal',          cat: 'Textile',     unite: 'U',  collab: 1, seuil: 2   },
    { nom: 'Jeté de lit brodé',       cat: 'Textile',     unite: 'U',  collab: 1, seuil: 2   },
  ]
  const produitIds: number[] = []
  for (const p of prodDefs) {
    const created = await prisma.produitCatalogue.create({
      data: {
        tenant_id: T,
        id_collaborateur: collabIds[p.collab],
        nom: p.nom,
        description: `${p.nom} — fabrication malgache`,
        categorie: p.cat,
        unite: unitesDef.find(u => u.code === p.unite)?.label ?? p.unite,
        id_unite: uniteIds[p.unite],
        seuil_alerte: p.seuil,
        statut: 'actif',
        created_by: lancsId,
      },
    })
    produitIds.push(created.id_produit)
  }
  const piByNom = Object.fromEntries(prodDefs.map((p, i) => [p.nom, i]))
  console.log(`[Seed] ${produitIds.length} produits créés`)

  // ═══ 7. Clients ═════════════════════════════════════════════════════════════
  const clientDefs = [
    { nom: 'Client',  prenom: 'Divers', email: null as string | null, telephone: null as string | null },
    { nom: 'Rasoa',   prenom: 'Marie',  email: 'rasoa@email.com',  telephone: '+261 34 60 000 01' },
    { nom: 'Rabe',    prenom: 'Pierre', email: 'rabe@email.com',   telephone: '+261 34 60 000 02' },
    { nom: 'Randria', prenom: 'Hanta',  email: 'hanta@email.com',  telephone: '+261 34 60 000 03' },
  ]
  const clientIds: number[] = []
  for (const c of clientDefs) {
    const created = await prisma.client.create({
      data: { tenant_id: T, ...c, date_inscription: new Date('2025-01-01') },
    })
    clientIds.push(created.id_client)
  }
  console.log(`[Seed] ${clientIds.length} clients créés`)

  // ═══ 8. Catégories financières ═══════════════════════════════════════════════
  const catDefs = [
    { name: 'Vente directe',      type: 'IN'   },
    { name: 'Vente sur commande', type: 'IN'   },
    { name: 'Retour',             type: 'OUT'  },
    { name: 'Transport',          type: 'OUT'  },
    { name: 'Salaire',            type: 'OUT'  },
    { name: 'Loyer',              type: 'OUT'  },
    { name: 'Autre',              type: 'BOTH' },
  ]
  const catIds: number[] = []
  for (const cat of catDefs) {
    const c = await prisma.financialCategory.create({ data: { tenant_id: T, ...cat } })
    catIds.push(c.id_category)
  }
  const venteCatId  = catIds[0]
  const retourCatId = catIds[2]
  console.log(`[Seed] ${catIds.length} catégories financières créées`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // ─── Helpers ventes ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════════

  // Map lot_id → { id_pdv, prix_initial, marge } — alimentée par les livraisons
  const lotMeta = new Map<number, { id_pdv: number; prix: number; marge: number }>()

  async function createLivraison(opts: {
    ref: string
    collab: number  // index dans collabIds
    date: Date
    items: { pi: number; qty: number; prix: number; marge: number }[]
  }): Promise<Map<number, number>> {
    // Retourne une map produitIndex → id_lot
    const livIndexToLot = new Map<number, number>()
    const clientUuid = seedClientUuid('livraison', opts.ref)
    const livraison = await prisma.livraison.create({
      data: {
        tenant_id: T,
        id_collaborateur: collabIds[opts.collab],
        id_pdv: pdv.id_pdv,
        client_uuid: clientUuid,
        date_livraison: opts.date,
        reference: opts.ref,
      },
    })
    await prisma.$transaction(async (tx) => {
      for (const item of opts.items) {
        const li = await tx.livraisonItem.create({
          data: {
            tenant_id: T,
            id_produit: produitIds[item.pi],
            id_livraison: livraison.id_livraison,
            id_pdv: pdv.id_pdv,
            prix_initial: item.prix,
            marge: item.marge,
            quantite_initiale: item.qty,
            date_livraison: opts.date,
            created_by: lancsId,
          },
        })
        await applyStockMouvement(tx, {
          tenant_id: T,
          id_lot: li.id_lot,
          id_pdv: pdv.id_pdv,
          type: 'entree',
          quantite: item.qty,
          source_type: 'LIVRAISON',
          source_id: livraison.id_livraison,
          created_by: lancsId,
        })
        lotMeta.set(li.id_lot, { id_pdv: pdv.id_pdv, prix: item.prix, marge: item.marge })
        livIndexToLot.set(item.pi, li.id_lot)
      }
    })
    return livIndexToLot
  }

  async function createVente(opts: {
    uuid: string
    clientIdx: number
    date: Date
    lignes: { id_lot: number; id_collaborateur: number; qty: number }[]
  }): Promise<{ id_vente: number; ligneIds: Map<number, number> /* id_lot → id_ligne */ }> {
    let id_vente!: number
    const ligneIds = new Map<number, number>()

    await prisma.$transaction(async (tx) => {
      const vente = await tx.vente.create({
        data: {
          tenant_id: T,
          id_point_vente: pdv.id_pdv,
          id_client: clientIds[opts.clientIdx],
          client_uuid: opts.uuid,
          id_utilisateur: lancsId,
          enregistre_par_admin_id: lancsId,
          date_vente: opts.date,
          statut: 'payee',
        },
      })
      id_vente = vente.id_vente
      let montant_ht = 0, montant_marge = 0

      for (const l of opts.lignes) {
        const meta = lotMeta.get(l.id_lot)
        if (!meta) throw new Error(`lotMeta manquant pour id_lot=${l.id_lot}`)
        const line_ht    = l.qty * meta.prix
        const line_marge = l.qty * meta.marge
        montant_ht    += line_ht
        montant_marge += line_marge

        const article = await tx.venteArticle.create({
          data: {
            tenant_id: T,
            id_vente,
            id_lot: l.id_lot,
            id_collaborateur: l.id_collaborateur,
            quantite_vendue: l.qty,
            prix_initial: meta.prix,
            marge: meta.marge,
            montant_ht: line_ht,
            montant_tva: 0,
            montant_marge: line_marge,
          },
        })
        ligneIds.set(l.id_lot, article.id_ligne)

        await applyStockMouvement(tx, {
          tenant_id: T,
          id_lot: l.id_lot,
          id_pdv: pdv.id_pdv,
          type: 'sortie',
          quantite: l.qty,
          source_type: 'VENTE',
          source_id: id_vente,
          created_by: lancsId,
        })
      }

      await tx.vente.update({
        where: { id_vente },
        data: { montant_ht, montant_tva: 0, montant_marge, montant_total: montant_ht },
      })
      await tx.transactionFinanciere.create({
        data: {
          tenant_id: T,
          type: 'IN',
          montant: montant_ht,
          id_categorie_financiere: venteCatId,
          source_module: 'VENTE',
          source_id: id_vente,
          description: `Vente #${id_vente}`,
          created_by: lancsId,
        },
      })
    })

    return { id_vente, ligneIds }
  }

  async function cancelLignes(opts: {
    id_vente: number
    lignes: { id_ligne: number; quantite: number; id_lot: number }[]
    raison: string
  }) {
    // Reproduit exactement la logique de cancelVente du service
    await prisma.$transaction(async (tx) => {
      let montantCompensatoire = 0

      for (const l of opts.lignes) {
        const article = await tx.venteArticle.findUniqueOrThrow({ where: { id_ligne: l.id_ligne } })

        await tx.venteArticle.update({
          where: { id_ligne: l.id_ligne },
          data: {
            quantite_retournee: { increment: l.quantite },
            raison_suppression: opts.raison,
          },
        })

        const after_qty = await applyStockMouvement(tx, {
          tenant_id: T,
          id_lot: l.id_lot,
          id_pdv: pdv.id_pdv,
          type: 'annulation_vente',
          quantite: l.quantite,
          source_type: 'VENTE',
          source_id: opts.id_vente,
          created_by: lancsId,
        })
        void after_qty

        montantCompensatoire += l.quantite * Number(article.prix_initial)
      }

      await tx.transactionFinanciere.create({
        data: {
          tenant_id: T,
          type: 'OUT',
          montant: montantCompensatoire,
          id_categorie_financiere: retourCatId,
          source_module: 'VENTE',
          source_id: opts.id_vente,
          description: `Annulation vente #${opts.id_vente} : ${opts.raison}`,
          created_by: lancsId,
        },
      })

      // Recalcul du statut par dérivation
      const articles = await tx.venteArticle.findMany({
        where: { id_vente: opts.id_vente, deleted: false },
        select: { quantite_vendue: true, quantite_retournee: true },
      })
      const totalVendu    = articles.reduce((s, a) => s + Number(a.quantite_vendue), 0)
      const totalRetourne = articles.reduce((s, a) => s + Number(a.quantite_retournee), 0)
      const statut        = totalRetourne >= totalVendu ? 'annulee' : 'retournee'

      await tx.vente.update({
        where: { id_vente: opts.id_vente },
        data: { statut, raison_suppression: opts.raison },
      })
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ─── Livraisons 1-4 (existantes) ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════════

  const liv1Lots = await createLivraison({
    ref: 'LIV-2025-001', collab: 0, date: new Date('2025-01-10'),
    items: [
      { pi: piByNom['Panier artisanal tressé'], qty: 50,   prix: 15000, marge: 3000 },
      { pi: piByNom['Sac en raphia'],           qty: 30,   prix: 28000, marge: 6000 },
      { pi: piByNom['Nappe brodée'],            qty: 40,   prix: 25000, marge: 5000 },
      { pi: piByNom['Foulard en soie'],         qty: 25,   prix: 30000, marge: 6000 },
    ],
  })

  const liv2Lots = await createLivraison({
    ref: 'LIV-2025-002', collab: 2, date: new Date('2025-02-05'),
    items: [
      { pi: piByNom['Épices locales (vrac)'],  qty: 12.5, prix: 8000,  marge: 2000 },
      { pi: piByNom['Vanille de Madagascar'],   qty: 3.75, prix: 80000, marge: 20000 },
      { pi: piByNom['Poivre sauvage'],          qty: 8.0,  prix: 12000, marge: 3000 },
      { pi: piByNom['Cacao en poudre'],         qty: 10.0, prix: 6000,  marge: 1500 },
      { pi: piByNom['Miel de forêt (vrac)'],   qty: 6.5,  prix: 18000, marge: 4000 },
      { pi: piByNom['Miel de forêt 250ml'],    qty: 24,   prix: 6500,  marge: 1500 },
      { pi: piByNom['Huile (vrac)'],            qty: 20.0, prix: 4500,  marge: 1000 },
      { pi: piByNom['Huile en bouteille 1L'],   qty: 48,   prix: 5500,  marge: 1200 },
    ],
  })

  await createLivraison({
    ref: 'LIV-2025-003', collab: 3, date: new Date('2025-03-12'),
    items: [
      { pi: piByNom['Chapeau raphia'],    qty: 35, prix: 12000, marge: 3000 },
      { pi: piByNom['Bracelet en corne'], qty: 50, prix: 8000,  marge: 2000 },
      { pi: piByNom['Collier perles'],    qty: 40, prix: 15000, marge: 4000 },
      { pi: piByNom['Bague argent'],      qty: 25, prix: 22000, marge: 6000 },
    ],
  })

  await createLivraison({
    ref: 'LIV-2025-004', collab: 4, date: new Date('2025-04-01'),
    items: [
      { pi: piByNom['Bougeoir en bois'],      qty: 30, prix: 18000, marge: 4000 },
      { pi: piByNom['Cadre photo sculpté'],   qty: 20, prix: 35000, marge: 8000 },
      { pi: piByNom['Statuette palissandre'], qty: 15, prix: 45000, marge: 12000 },
      { pi: piByNom['Miroir décoratif'],      qty: 25, prix: 28000, marge: 7000 },
    ],
  })

  console.log('[Seed] Livraisons 1-4 créées')

  // ═══════════════════════════════════════════════════════════════════════════════
  // ─── Ventes 1-10 (existantes) ──────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════════

  type VenteDef = { clientIdx: number; items: { pi: number; qty: number; collabIdx: number }[] }
  const venteDefs: VenteDef[] = [
    { clientIdx: 1, items: [{ pi: piByNom['Panier artisanal tressé'], qty: 3,    collabIdx: 0 }, { pi: piByNom['Nappe brodée'],          qty: 2,    collabIdx: 1 }] },
    { clientIdx: 2, items: [{ pi: piByNom['Foulard en soie'],         qty: 2,    collabIdx: 1 }, { pi: piByNom['Bracelet en corne'],      qty: 4,    collabIdx: 3 }] },
    { clientIdx: 0, items: [{ pi: piByNom['Chapeau raphia'],          qty: 1,    collabIdx: 3 }, { pi: piByNom['Miroir décoratif'],       qty: 1,    collabIdx: 4 }] },
    { clientIdx: 3, items: [{ pi: piByNom['Sac en raphia'],           qty: 2,    collabIdx: 0 }, { pi: piByNom['Collier perles'],         qty: 3,    collabIdx: 3 }] },
    { clientIdx: 1, items: [{ pi: piByNom['Bougeoir en bois'],        qty: 2,    collabIdx: 4 }, { pi: piByNom['Cadre photo sculpté'],    qty: 1,    collabIdx: 4 }] },
    { clientIdx: 2, items: [{ pi: piByNom['Épices locales (vrac)'],  qty: 0.5,  collabIdx: 2 }, { pi: piByNom['Cacao en poudre'],       qty: 1.25, collabIdx: 2 }] },
    { clientIdx: 0, items: [{ pi: piByNom['Vanille de Madagascar'],   qty: 0.1,  collabIdx: 2 }, { pi: piByNom['Poivre sauvage'],         qty: 0.75, collabIdx: 2 }] },
    { clientIdx: 3, items: [{ pi: piByNom['Huile (vrac)'],            qty: 2.5,  collabIdx: 2 }, { pi: piByNom['Miel de forêt (vrac)'], qty: 1.0,  collabIdx: 2 }] },
    { clientIdx: 1, items: [{ pi: piByNom['Huile en bouteille 1L'],   qty: 3,    collabIdx: 2 }, { pi: piByNom['Huile (vrac)'],          qty: 0.75, collabIdx: 2 }] },
    { clientIdx: 2, items: [{ pi: piByNom['Miel de forêt 250ml'],    qty: 6,    collabIdx: 2 }, { pi: piByNom['Vanille de Madagascar'],  qty: 0.05, collabIdx: 2 }] },
  ]

  for (let i = 0; i < venteDefs.length; i++) {
    const vd = venteDefs[i]
    const lignes = vd.items.map(item => {
      const id_lot = liv1Lots.get(item.pi) ?? liv2Lots.get(item.pi)
        ?? [...lotMeta.keys()].find(k => k === item.pi) ?? 0
      // Résoudre le bon lot en cherchant dans toutes les livraisons
      return { id_lot: 0, id_collaborateur: collabIds[item.collabIdx], qty: item.qty, pi: item.pi }
    })

    // Résolution du lot via lotMeta (chercher parmi tous les lots créés)
    const lotsParProduit = new Map<number, number>()
    for (const [lotId] of lotMeta) {
      const li = await prisma.livraisonItem.findUnique({
        where: { id_lot: lotId },
        select: { id_produit: true },
      })
      if (li) lotsParProduit.set(li.id_produit, lotId)
    }

    const lignesResolved = vd.items.map(item => ({
      id_lot: lotsParProduit.get(produitIds[item.pi]) ?? 0,
      id_collaborateur: collabIds[item.collabIdx],
      qty: item.qty,
    })).filter(l => l.id_lot !== 0)

    if (lignesResolved.length > 0) {
      await createVente({
        uuid: seedClientUuid('vente', `vente-${i + 1}`),
        clientIdx: vd.clientIdx,
        date: new Date(2025, 0, 15 + i * 3),
        lignes: lignesResolved,
      })
    }
  }
  console.log(`[Seed] 10 ventes de base créées`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // ─── Livraison 5 — Nouveaux produits décimaux (Café + Thé)
  //     Scénario : lot Café non épuisé, lot Thé épuisé après 2 achats
  //     + 2 lots supplémentaires sur produits existants déjà livrés (Épices + Vanille)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('[Seed] === Livraison 5 : nouveaux produits + lots supplémentaires ===')

  const liv5Lots = await createLivraison({
    ref: 'LIV-2025-005', collab: 2, date: new Date('2025-05-10'),
    items: [
      // Nouveau produit KG — ne sera PAS épuisé (reste 3.25 KG après un achat)
      { pi: piByNom['Café vert (vrac)'],      qty: 5.0,  prix: 22000, marge: 5000 },
      // Nouveau produit KG — sera épuisé par 2 achats successifs
      { pi: piByNom['Thé rouge (vrac)'],      qty: 2.0,  prix: 18000, marge: 4000 },
      // 2e lot sur Épices locales (déjà dans LIV-002) — lot supplémentaire
      { pi: piByNom['Épices locales (vrac)'], qty: 8.0,  prix: 8500,  marge: 2200 },
      // 2e lot sur Vanille (déjà dans LIV-002) — lot supplémentaire
      { pi: piByNom['Vanille de Madagascar'], qty: 2.0,  prix: 82000, marge: 21000 },
    ],
  })

  const lotCafe    = liv5Lots.get(piByNom['Café vert (vrac)'])!
  const lotThe     = liv5Lots.get(piByNom['Thé rouge (vrac)'])!
  const lotEpices2 = liv5Lots.get(piByNom['Épices locales (vrac)'])!
  const lotVanille2 = liv5Lots.get(piByNom['Vanille de Madagascar'])!

  // Vente 11 — Café (partiel, 1.75 kg) + Thé (premier achat, 1.2 kg)
  // → Café reste en stock : 5 - 1.75 = 3.25 kg
  // → Thé : 2 - 1.2 = 0.8 restant
  const { id_vente: v11 } = await createVente({
    uuid: seedClientUuid('vente', 'vente-11'),
    clientIdx: 1,
    date: new Date('2025-05-12'),
    lignes: [
      { id_lot: lotCafe, id_collaborateur: collabIds[2], qty: 1.75 },
      { id_lot: lotThe,  id_collaborateur: collabIds[2], qty: 1.2 },
    ],
  })
  void v11

  // Vente 12 — Thé : dernier achat (0.8 kg restants = épuisement total)
  const { id_vente: v12 } = await createVente({
    uuid: seedClientUuid('vente', 'vente-12'),
    clientIdx: 3,
    date: new Date('2025-05-15'),
    lignes: [
      { id_lot: lotThe, id_collaborateur: collabIds[2], qty: 0.8 },
    ],
  })
  void v12

  // Vente 13 — utilise les 2 lots supplémentaires de la livraison 5
  const { id_vente: v13 } = await createVente({
    uuid: seedClientUuid('vente', 'vente-13'),
    clientIdx: 2,
    date: new Date('2025-05-20'),
    lignes: [
      { id_lot: lotEpices2,  id_collaborateur: collabIds[2], qty: 2.5 },
      { id_lot: lotVanille2, id_collaborateur: collabIds[2], qty: 0.5 },
    ],
  })
  void v13

  console.log(`[Seed] Livraison 5 ok — Café ${5 - 1.75} kg en stock, Thé épuisé`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // ─── Livraison 6 — 1 produit décimal (Tapis KG) + 1 entier (Jeté de lit U)
  //     Scénario : Rabe (client) achète TOUTE la livraison → vente intégralement
  //     remboursée ensuite (annulation totale)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('[Seed] === Livraison 6 : achat total + remboursement intégral ===')

  const liv6Lots = await createLivraison({
    ref: 'LIV-2025-006', collab: 1, date: new Date('2025-06-01'),
    items: [
      // Tapis en sisal — entier (U) : 5 unités
      { pi: piByNom['Tapis en sisal'],     qty: 5, prix: 35000, marge: 8000 },
      // Jeté de lit brodé — entier (U) : 8 unités
      { pi: piByNom['Jeté de lit brodé'],  qty: 8, prix: 55000, marge: 12000 },
    ],
  })

  const lotTapis = liv6Lots.get(piByNom['Tapis en sisal'])!
  const lotJete  = liv6Lots.get(piByNom['Jeté de lit brodé'])!

  // Vente 14 — Rabe achète tout (5 tapis + 8 jetés)
  const { id_vente: v14, ligneIds: v14lignes } = await createVente({
    uuid: seedClientUuid('vente', 'vente-14'),
    clientIdx: 2,  // Rabe
    date: new Date('2025-06-03'),
    lignes: [
      { id_lot: lotTapis, id_collaborateur: collabIds[1], qty: 5 },
      { id_lot: lotJete,  id_collaborateur: collabIds[1], qty: 8 },
    ],
  })

  // ─── Remboursements sur la vente 14 ─────────────────────────────────────────

  // CAS 1 — Remboursement PARTIEL d'un lot (Tapis : rend 2 unités sur 5)
  //   → quantite_retournee du lot Tapis = 2, vente passe en 'retournee'
  console.log('[Seed] Cas 1 : remboursement partiel du lot Tapis (2/5 U)')
  await cancelLignes({
    id_vente: v14,
    lignes: [{ id_ligne: v14lignes.get(lotTapis)!, quantite: 2, id_lot: lotTapis }],
    raison: 'Défaut qualité sur une partie du lot',
  })

  // CAS 2 — Remboursement du reste du lot Tapis (3 unités restantes)
  //   → quantite_retournee Tapis = 5 (= quantite_vendue), lot totalement annulé
  //   → vente toujours 'retournee' (Jeté non encore annulé)
  console.log('[Seed] Cas 2 : remboursement total du lot Tapis (3 U restantes)')
  await cancelLignes({
    id_vente: v14,
    lignes: [{ id_ligne: v14lignes.get(lotTapis)!, quantite: 3, id_lot: lotTapis }],
    raison: 'Client insatisfait — remboursement complet du lot',
  })

  // CAS 3 — Remboursement intégral de la vente entière (Jeté de lit : 8 U)
  //   → Le Tapis est déjà 100% annulé.
  //   → On annule le Jeté → vente passe en 'annulee'
  console.log('[Seed] Cas 3 : remboursement intégral de la vente (Jeté de lit 8U)')
  await cancelLignes({
    id_vente: v14,
    lignes: [{ id_ligne: v14lignes.get(lotJete)!, quantite: 8, id_lot: lotJete }],
    raison: 'Remboursement intégral vente — client retourne tout',
  })

  console.log(`[Seed] Vente 14 : statut attendu = annulee (tout remboursé)`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // Vérification finale des statuts
  // ═══════════════════════════════════════════════════════════════════════════════
  const venteFinale = await prisma.vente.findUniqueOrThrow({
    where: { id_vente: v14 },
    select: { statut: true, raison_suppression: true },
  })
  if (venteFinale.statut !== 'annulee') {
    throw new Error(`[Seed] ERREUR : vente 14 devrait être 'annulee', trouvé '${venteFinale.statut}'`)
  }

  const tapis = await prisma.venteArticle.findFirstOrThrow({
    where: { id_vente: v14, id_lot: lotTapis },
    select: { quantite_vendue: true, quantite_retournee: true },
  })
  if (Number(tapis.quantite_retournee) !== Number(tapis.quantite_vendue)) {
    throw new Error(`[Seed] ERREUR : Tapis devrait être 100% remboursé`)
  }

  const jete = await prisma.venteArticle.findFirstOrThrow({
    where: { id_vente: v14, id_lot: lotJete },
    select: { quantite_vendue: true, quantite_retournee: true },
  })
  if (Number(jete.quantite_retournee) !== Number(jete.quantite_vendue)) {
    throw new Error(`[Seed] ERREUR : Jeté de lit devrait être 100% remboursé`)
  }

  const cafeStock = await prisma.stockActuel.findFirst({ where: { id_lot: lotCafe } })
  const cafeRestant = cafeStock ? Number(cafeStock.quantite) : 0
  if (Math.abs(cafeRestant - 3.25) > 0.001) {
    throw new Error(`[Seed] ERREUR : Café devrait avoir 3.25 kg en stock, trouvé ${cafeRestant}`)
  }

  const theStock = await prisma.stockActuel.findFirst({ where: { id_lot: lotThe } })
  const theRestant = theStock ? Number(theStock.quantite) : 0
  if (Math.abs(theRestant) > 0.001) {
    throw new Error(`[Seed] ERREUR : Thé devrait être épuisé (0), trouvé ${theRestant}`)
  }

  console.log('[Seed] ✅ Assertions OK :')
  console.log(`        — Café vert : ${cafeRestant} kg en stock (attendu 3.25)`)
  console.log(`        — Thé rouge : ${theRestant} kg en stock (attendu 0 — épuisé)`)
  console.log(`        — Vente 14  : statut=${venteFinale.statut} (attendu annulee)`)
  console.log(`        — Tapis     : ${tapis.quantite_retournee}/${tapis.quantite_vendue} remboursé`)
  console.log(`        — Jeté lit  : ${jete.quantite_retournee}/${jete.quantite_vendue} remboursé`)

  console.log('\n[Seed] ✅ Terminé !')
}

main()
  .catch(e => { console.error('[Seed] Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
