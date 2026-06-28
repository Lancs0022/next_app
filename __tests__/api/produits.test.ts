import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { authHeaders } from './test-helpers'

import { GET as produitsGet, POST as produitsPost } from '@/app/api/produits/route'

const ctx = { params: Promise.resolve({}) }

describe('Produits API', () => {
  it('GET /api/produits — returns seeded actifs produits', async () => {
    const req = new NextRequest('http://localhost/api/produits', {
      method: 'GET',
      headers: authHeaders(),
    })
    const res = await produitsGet(req, ctx)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)

    const first = body.data[0]
    expect(first).toHaveProperty('id_produit')
    expect(first).toHaveProperty('nom')
    expect(first).toHaveProperty('statut')
    expect(first.statut).toBe('actif')
  })

  it('POST /api/produits — creates a new produit', async () => {
    const produitBody = {
      nom: `Test Product ${Date.now()}`,
      id_collaborateur: 1,
      description: 'Created by test suite',
      categorie: 'Test',
      unite: 'pcs',
      seuil_alerte: 5,
    }

    const req = new NextRequest('http://localhost/api/produits', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(produitBody),
    })
    const res = await produitsPost(req, ctx)
    expect(res.status).toBe(201)

    const result = await res.json()
    expect(result).toHaveProperty('id_produit')
    expect(result.nom).toBe(produitBody.nom)
    expect(result.categorie).toBe('Test')

    // Verify it appears in the list
    const listReq = new NextRequest('http://localhost/api/produits', {
      method: 'GET',
      headers: authHeaders(),
    })
    const listRes = await produitsGet(listReq, ctx)
    const listBody = await listRes.json()
    const found = listBody.data.find((p: any) => p.id_produit === result.id_produit)
    expect(found).toBeTruthy()
  })

  it('POST /api/produits — 400 without nom', async () => {
    const req = new NextRequest('http://localhost/api/produits', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id_collaborateur: 1 }),
    })
    const res = await produitsPost(req, ctx)
    expect(res.status).toBe(400)
  })

  it('GET /api/produits — 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/produits', {
      method: 'GET',
    })
    const res = await produitsGet(req, ctx)
    expect(res.status).toBe(401)
  })
})
