import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

// ─── List ───────────────────────────────────────────────────────────────────

export async function listUnitesDeMesure(tenantId: number) {
  const data = await prisma.uniteDeMesure.findMany({
    where: { tenant_id: tenantId },
    orderBy: [{ est_decimal: 'asc' }, { code: 'asc' }],
  })
  return { data }
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createUniteDeMesure({
  body,
  tenantId,
}: {
  body: Record<string, unknown>
  tenantId: number
}) {
  const code = String(body?.code || '').trim().toUpperCase()
  const label = String(body?.label || '').trim()
  if (!code) throw httpError(400, "Le champ 'code' est requis")
  if (!label) throw httpError(400, "Le champ 'label' est requis")

  const existing = await prisma.uniteDeMesure.findFirst({
    where: { tenant_id: tenantId, code },
  })
  if (existing) throw httpError(409, `Une unité avec le code '${code}' existe déjà`)

  const unite = await prisma.uniteDeMesure.create({
    data: {
      tenant_id: tenantId,
      code,
      label,
      est_decimal: body?.est_decimal === true || body?.est_decimal === 'true',
      precision: Math.max(0, Math.min(6, Number(body?.precision ?? 0))),
      actif: true,
    },
  })
  return unite
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateUniteDeMesure({
  id,
  body,
  tenantId,
}: {
  id: number
  body: Record<string, unknown>
  tenantId: number
}) {
  const existing = await prisma.uniteDeMesure.findFirst({
    where: { id_unite: id, tenant_id: tenantId },
  })
  if (!existing) throw httpError(404, 'Unité introuvable')

  const newCode = body?.code ? String(body.code).trim().toUpperCase() : existing.code
  if (newCode !== existing.code) {
    const conflict = await prisma.uniteDeMesure.findFirst({
      where: { tenant_id: tenantId, code: newCode },
    })
    if (conflict) throw httpError(409, `Une unité avec le code '${newCode}' existe déjà`)
  }

  return prisma.uniteDeMesure.update({
    where: { id_unite: id },
    data: {
      code: newCode,
      label: body?.label ? String(body.label).trim() : existing.label,
      est_decimal: body?.est_decimal !== undefined
        ? body.est_decimal === true || body.est_decimal === 'true'
        : existing.est_decimal,
      precision: body?.precision !== undefined
        ? Math.max(0, Math.min(6, Number(body.precision)))
        : existing.precision,
      actif: body?.actif !== undefined
        ? body.actif === true || body.actif === 'true'
        : existing.actif,
    },
  })
}

// ─── Delete (soft — désactive) ───────────────────────────────────────────────

export async function deleteUniteDeMesure({
  id,
  tenantId,
}: {
  id: number
  tenantId: number
}) {
  const existing = await prisma.uniteDeMesure.findFirst({
    where: { id_unite: id, tenant_id: tenantId },
  })
  if (!existing) throw httpError(404, 'Unité introuvable')

  // Vérifier qu'aucun produit actif ne l'utilise
  const linked = await prisma.produitCatalogue.count({
    where: { id_unite: id, statut: 'actif' },
  })
  if (linked > 0) {
    throw httpError(409, `Cette unité est utilisée par ${linked} produit(s) actif(s) — désaffectez-les avant de supprimer`)
  }

  return prisma.uniteDeMesure.update({
    where: { id_unite: id },
    data: { actif: false },
  })
}
