import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { authHeaders } from './test-helpers'

import { GET as ventesGet, POST as ventesPost } from '@/app/api/ventes/route'

const ctx = { params: Promise.resolve({}) }

describe('Ventes API', () => {
  it('GET /api/ventes — returns paginated ventes from seed', async () => {
    const req = new NextRequest('http://localhost/api/ventes', {
      method: 'GET',
      headers: authHeaders(),
    })
    const res = await ventesGet(req, ctx)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    expect(body).toHaveProperty('total')
    expect(body.total).toBeGreaterThanOrEqual(1)

    // Verify shape of a vente row
    const first = body.data[0]
    expect(first).toHaveProperty('id_vente')
    expect(first).toHaveProperty('date_vente')
    expect(first).toHaveProperty('montant_total')
    expect(first).toHaveProperty('point_vente_nom')
  })

  it('GET /api/ventes — supports pagination', async () => {
    const req = new NextRequest('http://localhost/api/ventes?page=1&limit=3', {
      method: 'GET',
      headers: authHeaders(),
    })
    const res = await ventesGet(req, ctx)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.length).toBeLessThanOrEqual(3)
    expect(body.limit).toBe(3)
  })

  it('POST /api/ventes — creates a vente with ledger entries', async () => {
    // Fetch a lot with available stock first
    const stockReq = new NextRequest('http://localhost/api/stock', {
      method: 'GET',
      headers: authHeaders(),
    })
    const stockRes = await (await import('@/app/api/stock/route')).GET(stockReq, ctx)
    const stockBody = await stockRes.json()
    const stockRow = stockBody.data[0]
    expect(stockRow).toBeDefined()

    const venteBody = {
      id_point_vente: 1,
      id_client: 1,
      lines: [
        {
          id_lot: stockRow.id_lot,
          id_collaborateur: 1,
          quantite_vendue: 1,
          prix_initial: 15,
          marge: 5,
        },
      ],
    }

    const req = new NextRequest('http://localhost/api/ventes', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(venteBody),
    })
    const res = await ventesPost(req, ctx)
    expect(res.status).toBe(201)

    const result = await res.json()
    expect(result).toHaveProperty('id_vente')
    expect(result).toHaveProperty('montant_total')

    // Verify VenteArticles were created via DB lookup
    const { prisma } = await import('@/lib/db')
    const articles = await prisma.venteArticle.findMany({
      where: { id_vente: result.id_vente, deleted: false },
    })
    expect(articles.length).toBe(1)

    // Verify ledger: stock_mouvement sortie should exist
    const { listStockMouvements } = await import('@/services/stock.service')
    const mvs = await listStockMouvements({
      tenantId: 1,
      id_lot: String(stockRow.id_lot),
      source_type: 'VENTE',
      limit: 5,
    })
    expect(mvs.data.length).toBeGreaterThanOrEqual(1)
    expect(mvs.data[0].type).toBe('sortie')

    // Verify ledger: transaction_financiere should exist
    const txn = await prisma.transactionFinanciere.findFirst({
      where: { source_module: 'VENTE', source_id: result.id_vente },
    })
    expect(txn).toBeTruthy()
    expect(txn!.type).toBe('IN')
  })

  it('POST /api/ventes — 400 without lignes', async () => {
    const req = new NextRequest('http://localhost/api/ventes', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id_point_vente: 1, id_client: 1, lines: [] }),
    })
    const res = await ventesPost(req, ctx)
    expect(res.status).toBe(400)
  })

  it('GET /api/ventes — 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/ventes', {
      method: 'GET',
    })
    const res = await ventesGet(req, ctx)
    expect(res.status).toBe(401)
  })
})
