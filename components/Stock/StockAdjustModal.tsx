'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/Modal/Modal'
import { Z_MODAL } from '@/lib/zIndex'

interface Lot {
  id_lot: string | number
  libelle_produit?: string
  point_vente_nom?: string
  id_point_vente?: string | number
  unite_mesure?: string
  quantite_disponible?: number
  quantite_restante?: number
  quantite_initiale?: number
}

interface AdjustFormData {
  type: string
  delta: string
  motif: string
  date_ajustement: string
}

interface StockAdjustModalProps {
  open: boolean
  onClose: () => void
  lot: Lot | null
  onSubmit: (form: AdjustFormData) => void
  loading?: boolean
}

const StockAdjustModal = ({ open, onClose, lot, onSubmit, loading = false }: StockAdjustModalProps) => {
  const [form, setForm] = useState<AdjustFormData>({
    type: 'correction',
    delta: '',
    motif: '',
    date_ajustement: ''
  })
  const [deltaError, setDeltaError] = useState('')

  const isPieceUnit = useMemo(() => {
    if (!lot || !lot.unite_mesure) return false
    const u = String(lot.unite_mesure).toLowerCase()
    return u.includes('piece') || u.includes('pièce')
  }, [lot])

  const currentQty = useMemo(() => {
    if (!lot) return 0
    const val = lot.quantite_disponible ?? lot.quantite_restante ?? lot.quantite_initiale ?? 0
    return Number(val)
  }, [lot])

  const unitLabel = lot?.unite_mesure || ''

  useEffect(() => {
    if (!open) return
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

    setForm({
      type: 'correction',
      delta: '',
      motif: '',
      date_ajustement: value
    })
    setDeltaError('')
  }, [open, lot])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setDeltaError('')

    const raw = String(form.delta || '').trim()
    if (!raw || raw === '0' || raw === '+0' || raw === '-0') {
      setDeltaError("La quantité d'ajustement est requise et ne peut pas être nulle")
      return
    }

    const decimalRegex = /^[+-]?\d+([.,]\d+)?$/
    const integerRegex = /^[+-]?\d+$/

    if (!decimalRegex.test(raw)) {
      setDeltaError('Format invalide. Utilise uniquement des chiffres, un signe +/- optionnel et une virgule ou un point.')
      return
    }

    if (isPieceUnit && !integerRegex.test(raw)) {
      setDeltaError('Pour une unité en pièces, la quantité doit être un entier (sans décimales).')
      return
    }

    if (!form.type) {
      setDeltaError("Le type d'ajustement est requis")
      return
    }

    onSubmit({
      type: form.type,
      delta: raw,
      motif: form.motif,
      date_ajustement: form.date_ajustement
    })
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      title={lot ? `Ajuster le stock du lot #${lot.id_lot}` : 'Ajuster le stock'}
      zIndex={Z_MODAL}
      preventBackdropClose={true}
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="stock-adjust-form"
            disabled={loading}
            className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <form id="stock-adjust-form" onSubmit={handleSubmit} className="space-y-4">
        {lot && (
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              {lot.libelle_produit || 'Sans nom'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lot #{lot.id_lot} · {lot.point_vente_nom || (lot.id_point_vente ? `PV #${lot.id_point_vente}` : 'PV -')}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type d'ajustement</label>
          <select
            value={form.type}
            onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            disabled={loading}
            required
          >
            <option value="correction">Correction</option>
            <option value="perte">Perte</option>
            <option value="casse">Casse</option>
            <option value="inventaire">Inventaire</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <p className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Quantité actuelle</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {currentQty.toLocaleString('fr-FR')} {unitLabel}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Ajustement (delta)</label>
            <input
              type="text"
              value={form.delta}
              onChange={(e) => setForm(prev => ({ ...prev, delta: e.target.value }))}
              placeholder={isPieceUnit ? '+3, -2, 5...' : '+1, -0,5, 2,5...'}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm ${
                deltaError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-primary'
              }`}
              disabled={loading}
            />
            {isPieceUnit && !deltaError && form.delta && String(form.delta).includes(',') && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Les décimales ne seront pas acceptées pour une unité en pièces.
              </p>
            )}
            {deltaError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{deltaError}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Motif (optionnel)</label>
          <textarea
            value={form.motif}
            onChange={(e) => setForm(prev => ({ ...prev, motif: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date et heure de l'ajustement</label>
          <input
            type="datetime-local"
            value={form.date_ajustement}
            onChange={(e) => setForm(prev => ({ ...prev, date_ajustement: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  )
}

export default StockAdjustModal
