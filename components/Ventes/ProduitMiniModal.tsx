'use client'

/**
 * Mini-modal de détail d'un produit, affiché au clic sur une ligne de vente.
 * Moins détaillé que LotDetailModal — données catalogue uniquement.
 */

import { useEffect, useState } from 'react'
import Modal from '@/components/Modal/Modal'
import api from '@/services/api'

interface ProduitMiniModalProps {
  open: boolean
  onClose: () => void
  idLot?: number
  idProduit?: number
  libelleProduit?: string
}

interface ProduitDetail {
  nom: string
  description?: string | null
  categorie?: string | null
  collaborateur_nom?: string
  unite_code?: string | null
  unite_label?: string | null
  est_decimal?: boolean
  statut?: string
  seuil_alerte?: number | null
}

export default function ProduitMiniModal({
  open,
  onClose,
  idLot,
  idProduit,
  libelleProduit,
}: ProduitMiniModalProps) {
  const [produit, setProduit] = useState<ProduitDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const fetchProduit = async () => {
      setLoading(true)
      setProduit(null)
      try {
        // Si on a un id_lot, on charge via stock/lots pour avoir l'unité
        if (idLot) {
          const { data: res } = await api.get('/stock/lots', { params: { id_lot: idLot, limit: 1 } })
          const row = (res?.data || [])[0]
          if (row) {
            setProduit({
              nom:              row.libelle_produit ?? libelleProduit ?? 'Produit',
              description:      row.description_produit ?? null,
              categorie:        row.categorie_produit ?? null,
              collaborateur_nom:row.collaborateur_nom ?? '—',
              unite_code:       row.unite_code ?? null,
              unite_label:      row.unite_label ?? null,
              est_decimal:      row.est_decimal ?? false,
            })
            return
          }
        }
        // Fallback : libelle seul
        setProduit({ nom: libelleProduit ?? 'Produit' })
      } catch {
        setProduit({ nom: libelleProduit ?? 'Produit' })
      } finally {
        setLoading(false)
      }
    }
    fetchProduit()
  }, [open, idLot, idProduit, libelleProduit])

  return (
    <Modal
      open={open}
      title="Détail du produit"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          >
            Fermer
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Chargement…
        </div>
      ) : produit ? (
        <div className="space-y-4">
          {/* Nom + unité */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{produit.nom}</h2>
              {produit.categorie && (
                <span className="inline-flex mt-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                  {produit.categorie}
                </span>
              )}
            </div>
            {produit.unite_code && (
              <span
                title={produit.unite_label ?? produit.unite_code}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-mono font-bold border ${
                  produit.est_decimal
                    ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
                }`}
              >
                {produit.unite_code}
                {produit.est_decimal && <span className="text-[9px] opacity-60 ml-0.5">dec</span>}
              </span>
            )}
          </div>

          {/* Champs détail */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {produit.collaborateur_nom && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Collaborateur</span>
                  <span className="text-sm text-slate-900 dark:text-slate-100">{produit.collaborateur_nom}</span>
                </div>
              )}
              {produit.unite_label && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Unité</span>
                  <span className="text-sm text-slate-900 dark:text-slate-100">
                    {produit.unite_label}
                    {produit.est_decimal ? ' — valeurs décimales autorisées' : ' — entiers seulement'}
                  </span>
                </div>
              )}
              {produit.description && (
                <div className="px-4 py-2.5">
                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Description</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{produit.description}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
