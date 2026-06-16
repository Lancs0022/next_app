import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const user = await prisma.utilisateur.findFirst({
      where: { email: String(email), actif: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const valid = await bcrypt.compare(String(password), user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const expiresIn = process.env.JWT_EXPIRES_IN ?? '1d'
    const token = jwt.sign(
      { userId: user.id_utilisateur, tenantId: user.tenant_id },
      process.env.JWT_SECRET!,
      { expiresIn } as jwt.SignOptions
    )

    const maxAge = String(expiresIn).endsWith('d')
      ? parseInt(String(expiresIn), 10) * 86_400
      : 86_400

    const res = NextResponse.json({
      user: {
        id_utilisateur: user.id_utilisateur,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    })

    res.cookies.set('pejaa_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    return res
  } catch (err) {
    console.error('[Auth] Login error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
