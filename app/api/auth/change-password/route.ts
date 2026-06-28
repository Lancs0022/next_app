import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
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

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Mot de passe actuel et nouveau mot de passe requis' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    // Fetch user with password hash
    const user = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: userId },
      select: { password_hash: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Verify current password
    const valid = await bcrypt.compare(String(currentPassword), user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })
    }

    // Hash and save new password
    const saltRounds = 10
    const newHash = await bcrypt.hash(String(newPassword), saltRounds)

    await prisma.utilisateur.update({
      where: { id_utilisateur: userId },
      data: { password_hash: newHash },
    })

    return NextResponse.json({ message: 'Mot de passe modifié avec succès' })
  } catch (err) {
    console.error('[Auth] Change password error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
