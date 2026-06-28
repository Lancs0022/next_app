import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { authHeaders } from './test-helpers'

import { GET as stockGet } from '@/app/api/stock/route'

const ctx = { params: Promise.resolve({}) }

describe('Stock API', () => {
  it('GET /api/stock — returns stock_actuel rows', async () => {
    const req = new NextRequest('http://localhost/api/stock', {
      method: 'GET',
      headers: authHeaders(),
    })
    const res = await stockGet(req, ctx)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    expect(body).toHaveProperty('total')

    // Verify shape
    const row = body.data[0]
    expect(row).toHaveProperty('id_lot')
    expect(row).toHaveProperty('quantite')
    expect(row).toHaveProperty('id_pdv')
  })

  it('GET /api/stock — supports id_lot filter', async () => {
    // First get all stock
    const allReq = new NextRequest('http://localhost/api/stock', {
      method: 'GET',
      headers: authHeaders(),
    })
    const allRes = await stockGet(allReq, ctx)
    const allBody = await allRes.json()
    const firstLot = allBody.data[0].id_lot

    // Now filter by that lot
    const req = new NextRequest(`http://localhost/api/stock?id_lot=${firstLot}`, {
      method: 'GET',
      headers: authHeaders(),
    })
    const res = await stockGet(req, ctx)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    for (const row of body.data) {
      expect(row.id_lot).toBe(firstLot)
    }
  })

  it('GET /api/stock — 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/stock', {
      method: 'GET',
    })
    const res = await stockGet(req, ctx)
    expect(res.status).toBe(401)
  })
})
