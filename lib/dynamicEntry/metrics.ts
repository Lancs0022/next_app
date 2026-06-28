import type { EntryRow, MetricsSummary, DynamicEntryModule } from './types'

const parseNum = (v: string) => {
  const n = Number(String(v).replace(/\s/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function computeRowTotal(row: EntryRow, module: DynamicEntryModule): number {
  const qty = parseNum(row.quantite)
  const price = parseNum(row.prix_initial)
  const reduction = parseNum(row.reduction)
  if (module === 'vente') {
    return Math.max(0, qty * price - reduction)
  }
  return qty * price
}

export function computeMetrics(rows: EntryRow[], module: DynamicEntryModule): MetricsSummary {
  let totalArticles = 0
  let totalCost = 0
  let totalProfit = 0

  for (const row of rows) {
    const qty = parseNum(row.quantite)
    const price = parseNum(row.prix_initial)
    const margin = parseNum(row.marge)
    const reduction = parseNum(row.reduction)

    totalArticles += qty

    if (module === 'livraison') {
      totalCost += price * qty
      totalProfit += margin * qty
    } else {
      const lineTotal = Math.max(0, qty * price - reduction)
      totalCost += lineTotal
      totalProfit += margin * qty
    }
  }

  return { totalArticles, totalCost, totalProfit }
}

export function formatAr(value: number): string {
  return value.toLocaleString('fr-FR')
}
