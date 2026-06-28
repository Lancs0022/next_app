import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

function extractUserId(req: NextRequest): number | null {
  let token: string | null = null
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    token = req.cookies.get('pejaa_token')?.value ?? null
  }
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }
    return Number.isFinite(decoded.userId) ? decoded.userId : null
  } catch {
    return null
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = extractUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { nom, prenom, email } = body

    // Validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, string> = {}
    if (nom && typeof nom === 'string' && nom.trim()) updateData.nom = nom.trim()
    if (prenom && typeof prenom === 'string' && prenom.trim()) updateData.prenom = prenom.trim()
    if (email) updateData.email = email.trim()

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    // Check email uniqueness if changing email
    if (updateData.email) {
      const existing = await prisma.utilisateur.findFirst({
        where: { email: updateData.email, id_utilisateur: { not: userId } },
        select: { id_utilisateur: true },
      })
      if (existing) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
      }
    }

    const updated = await prisma.utilisateur.update({
      where: { id_utilisateur: userId },
      data: updateData,
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error('[Auth] Profile update error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
