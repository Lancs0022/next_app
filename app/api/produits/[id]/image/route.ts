import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { withAuth } from '@/lib/auth'
import { updateProduitImage } from '@/services/produits.service'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'produits')

export const POST = withAuth(
  async (req, ctx, { tenantId }) => {
    const id = Number(ctx.params.id)

    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 422 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté (image/* requis)' },
        { status: 422 }
      )
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Generate a unique filename
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${id}-${Date.now()}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Build the public URL
    const imageUrl = `/uploads/produits/${filename}`

    await updateProduitImage({ id, imageUrl, tenantId })
    return NextResponse.json({ url: imageUrl })
  },
  'PRODUITS',
  'write'
)
