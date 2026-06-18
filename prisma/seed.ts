import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config() // loads .env from cwd (next_app/)

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('[Seed] Starting database seed...')

  const tenantId = 1

  // 1. Roles
  const roles = [
    { code: 'super_admin', label: 'Super Administrateur' },
    { code: 'admin', label: 'Administrateur' },
    { code: 'employe', label: 'Employé' },
    { code: 'client', label: 'Client' },
    { code: 'collaborateur', label: 'Collaborateur' },
  ]
  for (const r of roles) {
    await prisma.role.upsert({ where: { code: r.code }, update: {}, create: r })
  }
  console.log('[Seed] Roles created')

  // 2. Access domains
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
  ]
  for (const d of domains) {
    await prisma.accessDomain.upsert({ where: { code: d.code }, update: {}, create: d })
  }
  console.log('[Seed] Access domains created')

  // 3. Role access matrix
  const matrix: { role: string; domain: string; r: boolean; w: boolean; d: boolean; m: boolean }[] = [
    // super_admin: full access everywhere
    ...domains.map((d) => ({ role: 'super_admin', domain: d.code, r: true, w: true, d: true, m: true })),
    // admin: full access except PARAM delete/manage
    ...domains.map((d) => ({
      role: 'admin',
      domain: d.code,
      r: true,
      w: true,
      d: d.code !== 'PARAM',
      m: d.code !== 'PARAM',
    })),
    // employe: read + write on operational domains
    { role: 'employe', domain: 'DASHBOARD', r: true, w: false, d: false, m: false },
    { role: 'employe', domain: 'STOCK', r: true, w: true, d: false, m: false },
    { role: 'employe', domain: 'VENTES', r: true, w: true, d: false, m: false },
    { role: 'employe', domain: 'COLLAB', r: true, w: true, d: false, m: false },
    { role: 'employe', domain: 'FINANCE', r: true, w: true, d: false, m: false },
    { role: 'employe', domain: 'PRODUITS', r: true, w: true, d: false, m: false },
    { role: 'employe', domain: 'COMMANDES', r: true, w: true, d: false, m: false },
    // client: nothing
    { role: 'client', domain: 'DASHBOARD', r: false, w: false, d: false, m: false },
    // collaborateur: read dashboard only
    { role: 'collaborateur', domain: 'DASHBOARD', r: true, w: false, d: false, m: false },
  ]

  for (const entry of matrix) {
    const role = await prisma.role.findUnique({ where: { code: entry.role } })
    const domain = await prisma.accessDomain.findUnique({ where: { code: entry.domain } })
    if (role && domain) {
      await prisma.roleAccessMatrix.upsert({
        where: { id_role_id_domain: { id_role: role.id_role, id_domain: domain.id_domain } },
        update: {},
        create: {
          id_role: role.id_role,
          id_domain: domain.id_domain,
          can_read: entry.r,
          can_write: entry.w,
          can_delete: entry.d,
          can_manage: entry.m,
        },
      })
    }
  }
  console.log('[Seed] Role access matrix created')

  // 4. Users (passwords hashed with bcrypt)
  const users = [
    { email: 'admin@pejaa.com', password: 'Pejaa2026', nom: 'Admin', prenom: 'Principal', role: 'admin' },
    { email: 'Lancs0022@gmail.com', password: 'Lancs0022', nom: 'Lancs', prenom: 'Dev', role: 'admin' },
    { email: 'employe@pejaa.com', password: 'Pejaa2026', nom: 'Employe', prenom: 'Test', role: 'employe' },
    { email: 'client@pejaa.com', password: 'Pejaa2026', nom: 'Client', prenom: 'Test', role: 'client' },
    { email: 'collab@pejaa.com', password: 'Pejaa2026', nom: 'Collaborateur', prenom: 'Test', role: 'collaborateur' },
  ]

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10)
    await prisma.utilisateur.upsert({
      where: { email: u.email },
      update: {},
      create: {
        tenant_id: tenantId,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        password_hash: hash,
        role: u.role,
        actif: true,
      },
    })
  }
  console.log('[Seed] Users created')

  // 5. Point de vente
  const pdv = await prisma.pointDeVente.upsert({
    where: { id_pdv: 1 },
    update: {},
    create: {
      tenant_id: tenantId,
      nom: 'PEJAA - Boutique principale',
      adresse: 'Centre-ville, Antananarivo',
      actif: true,
    },
  })
  console.log(`[Seed] Point de vente created (id=${pdv.id_pdv})`)

  // 6. Collaborateurs
  const collabs = [
    { nom: 'Rakoto', prenom: 'Market', email: 'rakoto@collab.com', telephone: '+261 34 11 111 11' },
    { nom: 'Miora', prenom: 'Artisanat', email: 'miora@collab.com', telephone: '+261 34 22 222 22' },
  ]
  const createdCollabs = []
  for (const c of collabs) {
    const created = await prisma.collaborateur.create({ data: { tenant_id: tenantId, ...c } })
    createdCollabs.push(created)
  }
  console.log(`[Seed] ${createdCollabs.length} collaborateurs created`)

  // 7. Produits catalogue
  const produits = [
    { nom: 'Panier artisanal', prix_achat: 15000, prix_vente: 20000 },
    { nom: 'Épices locales', prix_achat: 6000, prix_vente: 8000 },
    { nom: 'Chapeau raphia', prix_achat: 10000, prix_vente: 15000 },
    { nom: 'Nappe brodée', prix_achat: 12000, prix_vente: 18000 },
  ]
  const createdProduits = []
  for (const p of produits) {
    const created = await prisma.produitCatalogue.create({
      data: { tenant_id: tenantId, ...p, description: `${p.nom} - description`, actif: true },
    })
    createdProduits.push(created)
  }
  console.log(`[Seed] ${createdProduits.length} produits created`)

  // 8. Livraisons + stock
  for (const p of createdProduits) {
    await prisma.livraison.create({
      data: {
        tenant_id: tenantId,
        id_pdv: pdv.id_pdv,
        id_produit: p.id_produit,
        quantite: 50,
        prix_unitaire: p.prix_achat,
      },
    })
    await prisma.stockLocal.create({
      data: {
        tenant_id: tenantId,
        id_produit: p.id_produit,
        id_pdv: pdv.id_pdv,
        quantite: 50,
        seuil_alerte: 10,
      },
    })
  }
  console.log('[Seed] Livraisons + stock created')

  // 9. Client "Divers" (walk-in)
  await prisma.client.create({
    data: { tenant_id: tenantId, nom: 'Client', prenom: 'Divers', actif: true },
  })
  console.log('[Seed] Client Divers created')

  // 10. Abonnement
  const abo = await prisma.abonnement.create({
    data: {
      tenant_id: tenantId,
      nom: 'Abonnement de base',
      montant: 20000,
      periodicite: 'mensuel',
      actif: true,
    },
  })
  if (createdCollabs.length > 0) {
    await prisma.abonnementCollaborateur.create({
      data: { id_abonnement: abo.id_abonnement, id_collaborateur: createdCollabs[0].id_collaborateur },
    })
  }
  console.log('[Seed] Abonnement created')

  console.log('[Seed] Database seed complete!')
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
