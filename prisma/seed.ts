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
    await prisma.abonnementCollaborateur.deleteMany({ where: { id_abonnement: { in: aboIds } } })
    await prisma.abonnementPaiement.deleteMany({ where: { id_abonnement: { in: aboIds } } })
    await prisma.abonnement.deleteMany({ where: { tenant_id: tenantId } })
  }
  await prisma.client.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.produitCatalogue.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.collaborateur.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.uniteDeMesure.deleteMany({ where: { tenant_id: tenantId } })
  await prisma.financialCategory.deleteMany({ where: { tenant_id: tenantId } })
}

async function main() {
  console.log('[Seed] Starting…')
  const T = 1

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
    { code: 'DASHBOARD', label: 'Dashboard' },
    { code: 'STOCK', label: 'Stock' },
    { code: 'VENTES', label: 'Ventes' },
    { code: 'ABO', label: 'Abonnements' },
    { code: 'COLLAB', label: 'Collaborateurs' },
    { code: 'FINANCE', label: 'Finance' },
    { code: 'PARAM', label: 'Paramètres' },
    { code: 'PRODUITS', label: 'Produits' },
    { code: 'COMMANDES', label: 'Commandes' },
    { code: 'LIVRAISONS', label: 'Livraisons' },
    { code: 'POINTS_DE_VENTE', label: 'Points de vente' },
    { code: 'ENCAISSEMENTS', label: 'Encaissements' },
    { code: 'UNITES', label: 'Unités de mesure' },
    { code: 'UTILISATEURS', label: 'Gestion utilisateurs' },
    { code: 'RBAC', label: 'Gestion autorisations' },
  ]
  for (const d of domains) await prisma.accessDomain.upsert({ where: { code: d.code }, update: {}, create: d })

  const operationalDomains = [
    'DASHBOARD','STOCK','VENTES','ABO','COLLAB','FINANCE','PRODUITS',
    'COMMANDES','LIVRAISONS','POINTS_DE_VENTE','ENCAISSEMENTS',
  ]
  const matrix: { role: string; domain: string; r: boolean; w: boolean; d: boolean; m: boolean }[] = [
    // super_admin : tout
    ...domains.map(d => ({ role: 'super_admin', domain: d.code, r: true, w: true, d: true, m: true })),
    // admin : tout sauf domaines super_admin réservés
    ...domains.map(d => ({
      role: 'admin', domain: d.code,
      r: !['UNITES','UTILISATEURS','RBAC'].includes(d.code),
      w: !['UNITES','UTILISATEURS','RBAC','PARAM'].includes(d.code),
      d: !['UNITES','UTILISATEURS','RBAC','PARAM'].includes(d.code),
      m: !['UNITES','UTILISATEURS','RBAC','PARAM'].includes(d.code),
    })),
    // employe : opérationnel lecture+écriture, pas de suppression ni gestion
    ...operationalDomains.map(d => ({ role: 'employe', domain: d, r: true, w: true, d: false, m: false })),
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
  console.log('[Seed] RBAC ok')

  // ═══ 2. Utilisateurs ══════════════════════════════════════════════════
  const usersDef = [
    { email: 'admin@pejaa.com',       password: 'Pejaa2026', nom: 'Admin',   prenom: 'Principal', role: 'admin'       },
    { email: 'Lancs0022@gmail.com',   password: 'Lancs0022', nom: 'Lancs',   prenom: 'Dev',       role: 'super_admin' },
    { email: 'employe@pejaa.com',     password: 'Pejaa2026', nom: 'Employe', prenom: 'Test',      role: 'employe'     },
  ]
  const userMap: Record<string, number> = {}
  for (const u of usersDef) {
    const hash = await bcrypt.hash(u.password, 10)
    const user = await prisma.utilisateur.upsert({
      where: { email: u.email },
      update: { role: u.role }, // met à jour le rôle si besoin
      create: { tenant_id: T, nom: u.nom, prenom: u.prenom, email: u.email, password_hash: hash, role: u.role, actif: true },
    })
    userMap[u.email] = user.id_utilisateur
  }
  const adminId = userMap['admin@pejaa.com']
  const lancsId = userMap['Lancs0022@gmail.com']
  console.log('[Seed] Users ok — Lancs0022 est super_admin')

  // ═══ 3. Point de vente ════════════════════════════════════════════════
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

  // ═══ 4. Unités de mesure ══════════════════════════════════════════════
  // Créées APRÈS clearTenantSeedData car elles sont supprimées dedans
  const unitesDef = [
    { code: 'U',  label: 'Unité',       est_decimal: false, precision: 0 },
    { code: 'KG', label: 'Kilogramme',  est_decimal: true,  precision: 3 },
    { code: 'G',  label: 'Gramme',      est_decimal: true,  precision: 1 },
    { code: 'L',  label: 'Litre',       est_decimal: true,  precision: 3 },
    { code: 'ML', label: 'Millilitre',  est_decimal: true,  precision: 1 },
    { code: 'M',  label: 'Mètre',       est_decimal: true,  precision: 2 },
    { code: 'CM', label: 'Centimètre',  est_decimal: true,  precision: 1 },
  ]
  const uniteIds: Record<string, number> = {}
  for (const u of unitesDef) {
    const created = await prisma.uniteDeMesure.create({
      data: { tenant_id: T, ...u, actif: true },
    })
    uniteIds[u.code] = created.id_unite
  }
  console.log(`[Seed] ${unitesDef.length} unités de mesure créées`)

  // ═══ 5. Collaborateurs ════════════════════════════════════════════════
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

  // ═══ 6. Produits catalogue ════════════════════════════════════════════
  // collab: index dans collabIds | unite: code d'unité | seuil: seuil_alerte
  type ProdDef = { nom: string; cat: string; unite: string; collab: number; seuil: number }
  const prodDefs: ProdDef[] = [
    // Rakoto — Artisanat (unités entières)
    { nom: 'Panier artisanal tressé',  cat: 'Artisanat',    unite: 'U',  collab: 0, seuil: 5  },
    { nom: 'Panier rond décoratif',    cat: 'Artisanat',    unite: 'U',  collab: 0, seuil: 5  },
    { nom: 'Corbeille à fruits',       cat: 'Artisanat',    unite: 'U',  collab: 0, seuil: 5  },
    { nom: 'Sac en raphia',            cat: 'Artisanat',    unite: 'U',  collab: 0, seuil: 5  },
    { nom: 'Vase en terre cuite',      cat: 'Artisanat',    unite: 'U',  collab: 0, seuil: 3  },
    // Miora — Textile (unités entières)
    { nom: 'Nappe brodée',             cat: 'Textile',      unite: 'U',  collab: 1, seuil: 5  },
    { nom: 'Foulard en soie',          cat: 'Textile',      unite: 'U',  collab: 1, seuil: 5  },
    { nom: 'Coussin décoratif',        cat: 'Textile',      unite: 'U',  collab: 1, seuil: 5  },
    { nom: 'Rideau en lin',            cat: 'Textile',      unite: 'U',  collab: 1, seuil: 3  },
    { nom: 'Plaid en coton',           cat: 'Textile',      unite: 'U',  collab: 1, seuil: 3  },
    // Andry — Alimentaire (décimaux en KG ou L)
    { nom: 'Épices locales (vrac)',    cat: 'Alimentaire',  unite: 'KG', collab: 2, seuil: 1  },
    { nom: 'Vanille de Madagascar',    cat: 'Alimentaire',  unite: 'KG', collab: 2, seuil: 0.5},
    { nom: 'Poivre sauvage',           cat: 'Alimentaire',  unite: 'KG', collab: 2, seuil: 0.5},
    { nom: 'Cacao en poudre',          cat: 'Alimentaire',  unite: 'KG', collab: 2, seuil: 1  },
    { nom: 'Miel de forêt (vrac)',     cat: 'Alimentaire',  unite: 'L',  collab: 2, seuil: 0.5},
    { nom: 'Miel de forêt 250ml',      cat: 'Alimentaire',  unite: 'U',  collab: 2, seuil: 5  },
    // Cas d'usage huile : même produit, deux conditionnements différents
    { nom: 'Huile (vrac)',             cat: 'Alimentaire',  unite: 'L',  collab: 2, seuil: 2  },
    { nom: 'Huile en bouteille 1L',    cat: 'Alimentaire',  unite: 'U',  collab: 2, seuil: 5  },
    // Fara — Accessoires (unités entières)
    { nom: 'Chapeau raphia',           cat: 'Accessoires',  unite: 'U',  collab: 3, seuil: 5  },
    { nom: 'Bracelet en corne',        cat: 'Accessoires',  unite: 'U',  collab: 3, seuil: 5  },
    { nom: 'Collier perles',           cat: 'Accessoires',  unite: 'U',  collab: 3, seuil: 5  },
    { nom: 'Bague argent',             cat: 'Accessoires',  unite: 'U',  collab: 3, seuil: 3  },
    { nom: 'Boucles oreilles',         cat: 'Accessoires',  unite: 'U',  collab: 3, seuil: 3  },
    // Hery — Décoration (unités entières)
    { nom: 'Bougeoir en bois',         cat: 'Décoration',   unite: 'U',  collab: 4, seuil: 3  },
    { nom: 'Cadre photo sculpté',      cat: 'Décoration',   unite: 'U',  collab: 4, seuil: 3  },
    { nom: 'Statuette palissandre',    cat: 'Décoration',   unite: 'U',  collab: 4, seuil: 3  },
    { nom: 'Lampe artisanale',         cat: 'Décoration',   unite: 'U',  collab: 4, seuil: 2  },
    { nom: 'Miroir décoratif',         cat: 'Décoration',   unite: 'U',  collab: 4, seuil: 2  },
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
        // Champ legacy conservé pour compatibilité
        unite: unitesDef.find(u => u.code === p.unite)?.label ?? p.unite,
        id_unite: uniteIds[p.unite],
        seuil_alerte: p.seuil,
        statut: 'actif',
        created_by: lancsId,
      },
    })
    produitIds.push(created.id_produit)
  }
  // Index de référence pour les livraisons (par nom de produit)
  const piByNom = Object.fromEntries(prodDefs.map((p, i) => [p.nom, i]))
  console.log(`[Seed] ${produitIds.length} produits créés`)

  // ═══ 7. Clients ═══════════════════════════════════════════════════════
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

  // ═══ 8. Catégories financières ════════════════════════════════════════
  const catDefs = [
    { name: 'Vente directe',     type: 'IN'   },
    { name: 'Vente sur commande',type: 'IN'   },
    { name: 'Retour',            type: 'OUT'  },
    { name: 'Transport',         type: 'OUT'  },
    { name: 'Salaire',           type: 'OUT'  },
    { name: 'Loyer',             type: 'OUT'  },
    { name: 'Autre',             type: 'BOTH' },
  ]
  const catIds: number[] = []
  for (const cat of catDefs) {
    const c = await prisma.financialCategory.create({ data: { tenant_id: T, ...cat } })
    catIds.push(c.id_category)
  }
  const venteCatId = catIds[0]
  console.log(`[Seed] ${catIds.length} catégories financières créées`)

  // ═══ 9. Livraisons (stock initial) ════════════════════════════════════
  // Chaque livraison : { ref, collab, items: [{pi, qty, prix, marge}] }
  // qty peut être décimal pour les produits en KG/L
  type LivItem = { pi: number; qty: number; prix: number; marge: number }
  const deliveries: { ref: string; collab: number; date: Date; items: LivItem[] }[] = [
    {
      ref: 'LIV-2025-001', collab: 0, date: new Date('2025-01-10'),
      items: [
        { pi: piByNom['Panier artisanal tressé'],  qty: 50,   prix: 15000, marge: 3000 },
        { pi: piByNom['Sac en raphia'],             qty: 30,   prix: 28000, marge: 6000 },
        { pi: piByNom['Nappe brodée'],              qty: 40,   prix: 25000, marge: 5000 },
        { pi: piByNom['Foulard en soie'],           qty: 25,   prix: 30000, marge: 6000 },
      ],
    },
    {
      ref: 'LIV-2025-002', collab: 2, date: new Date('2025-02-05'),
      items: [
        { pi: piByNom['Épices locales (vrac)'],   qty: 12.5, prix: 8000,  marge: 2000 },
        { pi: piByNom['Vanille de Madagascar'],    qty: 3.75, prix: 80000, marge: 20000 },
        { pi: piByNom['Poivre sauvage'],           qty: 8.0,  prix: 12000, marge: 3000 },
        { pi: piByNom['Cacao en poudre'],          qty: 10.0, prix: 6000,  marge: 1500 },
        { pi: piByNom['Miel de forêt (vrac)'],    qty: 6.5,  prix: 18000, marge: 4000 },
        { pi: piByNom['Miel de forêt 250ml'],     qty: 24,   prix: 6500,  marge: 1500 },
        { pi: piByNom['Huile (vrac)'],             qty: 20.0, prix: 4500,  marge: 1000 },
        { pi: piByNom['Huile en bouteille 1L'],    qty: 48,   prix: 5500,  marge: 1200 },
      ],
    },
    {
      ref: 'LIV-2025-003', collab: 3, date: new Date('2025-03-12'),
      items: [
        { pi: piByNom['Chapeau raphia'],     qty: 35, prix: 12000, marge: 3000 },
        { pi: piByNom['Bracelet en corne'],  qty: 50, prix: 8000,  marge: 2000 },
        { pi: piByNom['Collier perles'],     qty: 40, prix: 15000, marge: 4000 },
        { pi: piByNom['Bague argent'],       qty: 25, prix: 22000, marge: 6000 },
      ],
    },
    {
      ref: 'LIV-2025-004', collab: 4, date: new Date('2025-04-01'),
      items: [
        { pi: piByNom['Bougeoir en bois'],     qty: 30, prix: 18000, marge: 4000 },
        { pi: piByNom['Cadre photo sculpté'],  qty: 20, prix: 35000, marge: 8000 },
        { pi: piByNom['Statuette palissandre'],qty: 15, prix: 45000, marge: 12000 },
        { pi: piByNom['Miroir décoratif'],     qty: 25, prix: 28000, marge: 7000 },
      ],
    },
  ]

  // Map lot_id par produit index pour les ventes
  const lotByProdIdx = new Map<number, { id_lot: number; id_pdv: number; qty: number }>()

  for (const del of deliveries) {
    const clientUuid = seedClientUuid('livraison', del.ref)
    const livraison = await prisma.livraison.create({
      data: {
        tenant_id: T, id_collaborateur: collabIds[del.collab], id_pdv: pdv.id_pdv,
        client_uuid: clientUuid, date_livraison: del.date, reference: del.ref,
      },
    })

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
  console.log(`[Seed] ${deliveries.length} livraisons créées avec stock`)

  // ═══ 10. Ventes de démonstration ══════════════════════════════════════
  type VenteItem = { pi: number; qty: number; collabIdx: number }
  const venteDefs: { clientIdx: number; items: VenteItem[] }[] = [
    // Ventes d'articles entiers (U)
    { clientIdx: 1, items: [{ pi: piByNom['Panier artisanal tressé'], qty: 3,   collabIdx: 0 }, { pi: piByNom['Nappe brodée'],          qty: 2,   collabIdx: 1 }] },
    { clientIdx: 2, items: [{ pi: piByNom['Foulard en soie'],         qty: 2,   collabIdx: 1 }, { pi: piByNom['Bracelet en corne'],      qty: 4,   collabIdx: 3 }] },
    { clientIdx: 0, items: [{ pi: piByNom['Chapeau raphia'],          qty: 1,   collabIdx: 3 }, { pi: piByNom['Miroir décoratif'],       qty: 1,   collabIdx: 4 }] },
    { clientIdx: 3, items: [{ pi: piByNom['Sac en raphia'],           qty: 2,   collabIdx: 0 }, { pi: piByNom['Collier perles'],         qty: 3,   collabIdx: 3 }] },
    { clientIdx: 1, items: [{ pi: piByNom['Bougeoir en bois'],        qty: 2,   collabIdx: 4 }, { pi: piByNom['Cadre photo sculpté'],    qty: 1,   collabIdx: 4 }] },
    // Ventes décimales (KG / L)
    { clientIdx: 2, items: [{ pi: piByNom['Épices locales (vrac)'],  qty: 0.5, collabIdx: 2 }, { pi: piByNom['Cacao en poudre'],       qty: 1.25,collabIdx: 2 }] },
    { clientIdx: 0, items: [{ pi: piByNom['Vanille de Madagascar'],   qty: 0.1, collabIdx: 2 }, { pi: piByNom['Poivre sauvage'],         qty: 0.75,collabIdx: 2 }] },
    { clientIdx: 3, items: [{ pi: piByNom['Huile (vrac)'],            qty: 2.5, collabIdx: 2 }, { pi: piByNom['Miel de forêt (vrac)'], qty: 1.0, collabIdx: 2 }] },
    // Mixte (unité + décimal)
    { clientIdx: 1, items: [{ pi: piByNom['Huile en bouteille 1L'],   qty: 3,   collabIdx: 2 }, { pi: piByNom['Huile (vrac)'],          qty: 0.75,collabIdx: 2 }] },
    { clientIdx: 2, items: [{ pi: piByNom['Miel de forêt 250ml'],    qty: 6,   collabIdx: 2 }, { pi: piByNom['Vanille de Madagascar'],  qty: 0.05,collabIdx: 2 }] },
  ]

  async function sellArticle(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    pi: number, qty: number, venteId: number, collabId: number, prix: number, marge: number,
  ): Promise<{ line_ht: number; line_marge: number }> {
    const lotInfo = lotByProdIdx.get(pi)
    if (!lotInfo) throw new Error(`Lot introuvable pour produit index ${pi} (${prodDefs[pi]?.nom})`)

    const line_ht = qty * prix
    const line_marge = marge * qty

    await tx.venteArticle.create({
      data: {
        tenant_id: T, id_vente: venteId, id_lot: lotInfo.id_lot, id_collaborateur: collabId,
        quantite_vendue: qty, prix_initial: prix, marge,
        montant_ht: line_ht, montant_tva: 0, montant_marge: line_marge,
      },
    })

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

    if (stock) await tx.stockActuel.update({ where: { id: stock.id }, data: { quantite: after } })
    lotInfo.qty = after

    return { line_ht, line_marge }
  }

  for (let i = 0; i < venteDefs.length; i++) {
    const vd = venteDefs[i]
    const venteUuid = seedClientUuid('vente', `vente-${i + 1}`)

    await prisma.$transaction(async (tx) => {
      const vente = await tx.vente.create({
        data: {
          tenant_id: T, id_point_vente: pdv.id_pdv, id_client: clientIds[vd.clientIdx],
          client_uuid: venteUuid, id_utilisateur: lancsId, enregistre_par_admin_id: lancsId,
          date_vente: new Date(2025, 0, 15 + i * 3), statut: 'payee',
        },
      })

      let montant_ht = 0, montant_marge = 0
      for (const item of vd.items) {
        const lot = lotByProdIdx.get(item.pi)
        if (!lot) return // skip si lot absent
        const li = await tx.livraisonItem.findUnique({ where: { id_lot: lot.id_lot } })
        if (!li) return
        const r = await sellArticle(tx, item.pi, item.qty, vente.id_vente, collabIds[item.collabIdx], Number(li.prix_initial), Number(li.marge))
        montant_ht += r.line_ht
        montant_marge += r.line_marge
      }

      await tx.vente.update({
        where: { id_vente: vente.id_vente },
        data: { montant_ht, montant_tva: 0, montant_marge, montant_total: montant_ht },
      })

      await tx.transactionFinanciere.create({
        data: {
          tenant_id: T, type: 'IN', montant: montant_ht, id_categorie_financiere: venteCatId,
          source_module: 'VENTE', source_id: vente.id_vente,
          description: `Vente #${vente.id_vente}`, created_by: lancsId,
        },
      })
    })
  }
  console.log(`[Seed] ${venteDefs.length} ventes créées (dont ventes décimales)`)

  console.log('[Seed] ✅ Terminé !')
}

main()
  .catch(e => { console.error('[Seed] Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
