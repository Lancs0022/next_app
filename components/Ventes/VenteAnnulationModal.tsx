'use client'

/**
 * Modal d'annulation de vente — partielle ou totale, ligne par ligne.
 * Spec : .hermes/plans/annulation-vente-flow-final.md
 *
 * Props :
 *   lignes      : lignes de vente récupérées depuis /api/ventes/lot/:id ou /api/ventes/:id
 *   idVente     : id de la vente parente (unique si les lignes viennent d'une vente agrégée)
 *   defaultCheckAll : true = toutes cochées par défaut (vue agrégée), false = aucune (vue lot)
 *   lockSelection   : true = la sélection est verrouillée (vue atomique)
 */

import { useCallback, useMemo, useState } from 'react'
import Modal from '@/components/Modal/Modal'
import api from '@/services/api'
import { logAction } from '@/lib/logger'

export interface LigneVente {
  id_ligne: number
  id_vente: number
  date_vente: string | Date
  statut_vente: string
  point_vente_nom: string
  libelle_produit: string
  collaborateur_nom: string
  quantite_vendue: number
  quantite_retournee: number
  quantite_annulable: number
  prix_initial: number
  marge: number
  montant_ht: number
  raison_suppression?: string | null
  unite_code?: string | null
  est_decimal?: boolean
  precision?: number
}

interface VenteAnnulationModalProps {
  open: boolean
  onClose: () => void
  lignes: LigneVente[]
  /** Si toutes les lignes appartiennent à la même vente, passer l'id ici. */
  idVente?: number
  defaultCheckAll?: boolean
  lockSelection?: boolean
  onSuccess?: () => void
}

type Etape = 'selection' | 'confirmation'

function fmtQty(val: number, ligne: LigneVente): string {
  const p = ligne.precision ?? 0
  const num = p > 0 ? val.toFixed(p).replace(/\.?0+$/, '') : String(Math.round(val))
  return ligne.unite_code ? `${num} ${ligne.unite_code}` : num
}

function fmtAr(val: number): string {
  return `${val.toLocaleString('fr-FR')} Ar`
}

export default function VenteAnnulationModal({
  open,
  onClose,
  lignes,
  idVente,
  defaultCheckAll = false,
  lockSelection = false,
  onSuccess,
}: VenteAnnulationModalProps) {
  // ── État sélection ──────────────────────────────────────────────────────────
  const [checked, setChecked] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(lignes.map(l => [l.id_ligne, defaultCheckAll || lockSelection]))
  )
  const [quantites, setQuantites] = useState<Record<number, string>>(() =>
    Object.fromEntries(lignes.map(l => [l.id_ligne, String(l.quantite_annulable)]))
  )
  const [raison, setRaison] = useState('')
  const [etape, setEtape] = useState<Etape>('selection')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Re-sync quand les lignes changent (ouverture du modal)
  const reset = useCallback(() => {
    setChecked(Object.fromEntries(lignes.map(l => [l.id_ligne, defaultCheckAll || lockSelection])))
    setQuantites(Object.fromEntries(lignes.map(l => [l.id_ligne, String(l.quantite_annulable)])))
    setRaison('')
    setEtape('selection')
    setError('')
  }, [lignes, defaultCheckAll, lockSelection])

  // ── Lignes sélectionnées validées ───────────────────────────────────────────
  const lignesSelectionnees = useMemo(() =>
    lignes.filter(l => checked[l.id_ligne] && l.quantite_annulable > 0),
    [lignes, checked]
  )

  const lignesPayload = useMemo(() =>
    lignesSelectionnees.map(l => ({
      id_ligne: l.id_ligne,
      quantite: parseFloat(quantites[l.id_ligne] || '0'),
    })).filter(lp => lp.quantite > 0),
    [lignesSelectionnees, quantites]
  )

  const montantCompensatoire = useMemo(() =>
    lignesPayload.reduce((s, lp) => {
      const ligne = lignes.find(l => l.id_ligne === lp.id_ligne)
      return s + lp.quantite * (ligne?.prix_initial ?? 0)
    }, 0),
    [lignesPayload, lignes]
  )

  const peutConfirmer = lignesPayload.length > 0 && raison.trim().length > 0

  // ── Gestion quantité ────────────────────────────────────────────────────────
  const handleQtyChange = (idLigne: number, val: string, ligne: LigneVente) => {
    let cleaned = ligne.est_decimal
      ? val.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1')
      : val.replace(/[^0-9]/g, '')
    const num = parseFloat(cleaned)
    if (!isNaN(num) && num > ligne.quantite_annulable) {
      cleaned = String(ligne.quantite_annulable)
    }
    setQuantites(prev => ({ ...prev, [idLigne]: cleaned }))
  }

  // ── Soumission ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!peutConfirmer || loading) return
    logAction('VenteAnnulation → Confirmer', { idVente, lignesCount: lignesPayload.length })
    setLoading(true)
    setError('')
    try {
      // Grouper les lignes par vente (cas multi-vente depuis un lot)
      const parVente = new Map<number, typeof lignesPayload>()
      for (const lp of lignesPayload) {
        const ligne = lignes.find(l => l.id_ligne === lp.id_ligne)!
        const vid = idVente ?? ligne.id_vente
        if (!parVente.has(vid)) parVente.set(vid, [])
        parVente.get(vid)!.push(lp)
      }

      for (const [vid, ls] of parVente.entries()) {
        await api.post(`/ventes/${vid}/annuler`, {
          raison: raison.trim(),
          lignes: ls,
        })
      }

      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setError(err?.response?.data?.error || err?.message || 'Erreur lors de l\'annulation')
    } finally {
      setLoading(false)
    }
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────
  const title = etape === 'selection' ? 'Annuler des ventes' : 'Confirmer l\'annulation'

  return (
    <Modal
      open={open}
      title={title}
      onClose={() => { reset(); onClose() }}
      size="large"
      footer={
        etape === 'selection' ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => { reset(); onClose() }}
              className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!peutConfirmer}
              onClick={() => setEtape('confirmation')}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-40"
            >
              Voir le résumé →
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setEtape('selection')}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
            >
              {loading ? 'Annulation en cours…' : 'Confirmer l\'annulation'}
            </button>
          </div>
        )
      }
    >
      {etape === 'selection' ? (
        <div className="space-y-4">
          {/* Raison */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Motif d&apos;annulation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={raison}
              onChange={e => setRaison(e.target.value)}
              placeholder="Ex : Marchandise défectueuse, erreur de saisie…"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
              autoFocus
            />
          </div>

          {/* Lignes */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {!lockSelection && <th className="px-3 py-2 w-8" />}
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Produit / Vente</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Vendu</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Déjà annulé</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-400">Qté à annuler</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {lignes.map(ligne => {
                  const isChecked = !!checked[ligne.id_ligne]
                  const qty = parseFloat(quantites[ligne.id_ligne] || '0')
                  const montant = qty * ligne.prix_initial
                  return (
                    <tr
                      key={ligne.id_ligne}
                      className={`${isChecked ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-slate-900/40'}`}
                    >
                      {!lockSelection && (
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => setChecked(prev => ({ ...prev, [ligne.id_ligne]: e.target.checked }))}
                            className="rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500"
                          />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{ligne.libelle_produit}</p>
                        <p className="text-slate-500 dark:text-slate-400">
                          Vente #{ligne.id_vente} · {new Date(ligne.date_vente).toLocaleDateString('fr-FR')} · {ligne.point_vente_nom}
                        </p>
                        {ligne.raison_suppression && (
                          <p className="text-amber-600 dark:text-amber-400">
                            Motif précédent : {ligne.raison_suppression}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">
                        {fmtQty(ligne.quantite_vendue, ligne)}
                      </td>
                      <td className="px-3 py-3 text-right text-amber-600 dark:text-amber-400">
                        {ligne.quantite_retournee > 0 ? fmtQty(ligne.quantite_retournee, ligne) : '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isChecked ? (
                          <input
                            type="text"
                            inputMode={ligne.est_decimal ? 'decimal' : 'numeric'}
                            value={quantites[ligne.id_ligne]}
                            onChange={e => handleQtyChange(ligne.id_ligne, e.target.value, ligne)}
                            className="w-20 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-center focus:outline-none focus:border-red-500"
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {isChecked && qty > 0
                          ? <span className="text-red-600 dark:text-red-400">-{fmtAr(montant)}</span>
                          : <span className="text-slate-400">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
      ) : (
        /* ── Écran de confirmation ─────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              ⚠ Cette action est irréversible
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Les quantités annulées seront remises en stock et un flux financier compensatoire sera
              enregistré. Les enregistrements originaux de vente restent inchangés.
            </p>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Motif : <span className="font-medium text-slate-900 dark:text-white">{raison}</span>
          </p>

          {/* Résumé lignes */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Ligne</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Qté annulée</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Stock +</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Remboursement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900/40">
                {lignesPayload.map(lp => {
                  const ligne = lignes.find(l => l.id_ligne === lp.id_ligne)!
                  return (
                    <tr key={lp.id_ligne}>
                      <td className="px-3 py-3 text-slate-900 dark:text-slate-100">
                        {ligne.libelle_produit}
                        <span className="text-slate-400 ml-2">Vente #{ligne.id_vente}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-red-600 dark:text-red-400 font-mono">
                        -{fmtQty(lp.quantite, ligne)}
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                        +{fmtQty(lp.quantite, ligne)}
                      </td>
                      <td className="px-3 py-3 text-right text-red-600 dark:text-red-400 font-mono">
                        -{fmtAr(lp.quantite * ligne.prix_initial)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total remboursement :
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-red-600 dark:text-red-400">
                    -{fmtAr(montantCompensatoire)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
