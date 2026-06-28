import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { authHeaders } from './test-helpers'

import { GET as livraisonsGet, POST as livraisonsPost } from '@/app/api/livraisons/route'

const ctx = { params: Promise.resolve({}) }

describe('Livraisons API', () => {
  it('GET /api/livraisons — returns seeded livraisons with items', async () => {
    const req = new NextRequest('http://localhost/api/livraisons', {
      method: 'GET',
      headers: authHeaders(),
    })
    const res = await livraisonsGet(req, ctx)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)

    // Each livraison should have items
    const first = body.data[0]
    expect(first).toHaveProperty('items')
    expect(Array.isArray(first.items)).toBe(true)
    expect(first.items.length).toBeGreaterThanOrEqual(1)
  })

  it('POST /api/livraisons — creates a livraison with ledger entries', async () => {
    // Get a product id to use
    const { listProduits } = await import('@/services/produits.service')
    const prods = await listProduits(1)
    const prodId = prods.data[0].id_produit

    const livraisonBody = {
      id_pdv: 1,
      id_collaborateur: 1,
      date_livraison: new Date().toISOString(),
      lines: [
        { id_produit: prodId, quantite: 10, prix_unitaire: 25 },
        { id_produit: prodId, quantite: 5, prix_unitaire: 30 },
      ],
    }

    const req = new NextRequest('http://localhost/api/livraisons', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(livraisonBody),
    })
    const res = await livraisonsPost(req, ctx)
    expect(res.status).toBe(201)

    const result = await res.json()
    expect(result).toHaveProperty('id_livraison')
    expect(result).toHaveProperty('id_collaborateur')

    // Verify LivraisonItems were created via DB lookup
    const { prisma } = await import('@/lib/db')
    const items = await prisma.livraisonItem.findMany({
      where: { id_livraison: result.id_livraison },
    })
    expect(items.length).toBe(2)

    // Verify stock_actuel was incremented
    const lotId = items[0].id_lot
    const stockRow = await prisma.stockActuel.findFirst({
      where: { id_lot: lotId, id_pdv: 1, tenant_id: 1 },
    })
    expect(stockRow).toBeTruthy()
    expect(Number(stockRow!.quantite)).toBeGreaterThanOrEqual(10)

    // Verify stock_mouvement entree was created
    const mvs = await prisma.stockMouvement.findMany({
      where: { id_lot: lotId, type: 'entree', source_type: 'LIVRAISON' },
      orderBy: { date_mouvement: 'desc' },
      take: 1,
    })
    expect(mvs.length).toBe(1)
    expect(Number(mvs[0].after_qty)).toBeGreaterThan(Number(mvs[0].before_qty))
  })

  it('POST /api/livraisons — 400 without lines', async () => {
    const req = new NextRequest('http://localhost/api/livraisons', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id_pdv: 1, id_collaborateur: 1, lines: [] }),
    })
    const res = await livraisonsPost(req, ctx)
    expect(res.status).toBe(400)
  })

  it('POST /api/livraisons — 400 without id_pdv', async () => {
    const req = new NextRequest('http://localhost/api/livraisons', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id_collaborateur: 1, lines: [{ id_produit: 1, quantite: 1 }] }),
    })
    const res = await livraisonsPost(req, ctx)
    expect(res.status).toBe(400)
  })

  it('GET /api/livraisons — 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/livraisons', {
      method: 'GET',
    })
    const res = await livraisonsGet(req, ctx)
    expect(res.status).toBe(401)
  })
})
