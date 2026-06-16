'use client'

import { useEffect, useState } from 'react'
import Drawer from '@/components/Drawer/Drawer'
import TypeaheadSelect from '@/components/TypeaheadSelect'

interface Collaborateur {
  id_collaborateur: string | number
  nom: string
}

interface PointVente {
  id_point_vente: string | number
  nom: string
}

interface ProduitCatalogue {
  value: string | number
  label: string
}

interface Lot {
  id_produit_catalogue: string
  description: string
  prix_initial: string
  marge: string
  quantite_initiale: string
  categorie?: string
}

interface LivraisonFormData {
  id_collaborateur: string
  id_point_vente: string
  date_livraison: string
  reference: string
  commentaire: string
  lots: Lot[]
}

interface AddLivraisonDrawerProps {
  open: boolean
  onClose: (form?: LivraisonFormData) => void
  collaborateurs: Collaborateur[]
  pointsVente: PointVente[]
  produitsCatalogue: ProduitCatalogue[]
  onSubmit: (form: LivraisonFormData) => void
  onQuickAddClick: (lotIndex: number, collaborateurId: string) => void
  loading?: boolean
  draft?: LivraisonFormData | null
  keepManual?: boolean
  onKeepManualChange?: (checked: boolean) => void
  quickAddTargetLotIndex?: number | null
  quickAddProduitId?: string | number | null
}

const defaultLot: Lot = { id_produit_catalogue: '', description: '', prix_initial: '', marge: '', quantite_initiale: '' }

const AddLivraisonDrawer = ({ 
  open, 
  onClose, 
  collaborateurs,
  pointsVente,
  produitsCatalogue,
  onSubmit,
  onQuickAddClick,
  loading = false,
  draft = null,
  keepManual = false,
  onKeepManualChange,
  quickAddTargetLotIndex,
  quickAddProduitId
}: AddLivraisonDrawerProps) => {
  const [form, setForm] = useState<LivraisonFormData>({
    id_collaborateur: '',
    id_point_vente: '',
    date_livraison: new Date().toISOString().slice(0, 10),
    reference: '',
    commentaire: '',
    lots: [{ ...defaultLot }]
  })

  const [hasDirtyFields, setHasDirtyFields] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  useEffect(() => {
    if (open && draft) {
      setForm(draft)
      setHasDirtyFields(true)
    }
  }, [open, draft])

  useEffect(() => {
    const initialForm: LivraisonFormData = {
      id_collaborateur: '',
      id_point_vente: '',
      date_livraison: new Date().toISOString().slice(0, 10),
      reference: '',
      commentaire: '',
      lots: [{ ...defaultLot }]
    }
    const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)
    setHasDirtyFields(isDirty)
  }, [form])

  useEffect(() => {
    if (quickAddTargetLotIndex === null || quickAddTargetLotIndex === undefined || !quickAddProduitId) {
      return
    }

    setForm(prev => {
      if (!Array.isArray(prev.lots) || !prev.lots[quickAddTargetLotIndex]) {
        return prev
      }

      return {
        ...prev,
        lots: prev.lots.map((lot, idx) => (
          idx === quickAddTargetLotIndex
            ? { ...lot, id_produit_catalogue: String(quickAddProduitId) }
            : lot
        ))
      }
    })
  }, [quickAddTargetLotIndex, quickAddProduitId])

  const handleClose = () => {
    if (hasDirtyFields && !loading) {
      setShowConfirmClose(true)
    } else {
      onClose()
    }
  }

  const confirmClose = () => {
    setShowConfirmClose(false)
    onClose(form)
  }

  const cancelClose = () => {
    setShowConfirmClose(false)
  }

  const resetForm = () => {
    setForm({
      id_collaborateur: '',
      id_point_vente: '',
      date_livraison: new Date().toISOString().slice(0, 10),
      reference: '',
      commentaire: '',
      lots: [{ ...defaultLot }]
    })
    setHasDirtyFields(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const addLot = () => {
    setForm(prev => ({
      ...prev,
      lots: [...prev.lots, { id_produit_catalogue: '', categorie: '', description: '', prix_initial: '', marge: '', quantite_initiale: '' }]
    }))
  }

  const removeLot = (index: number) => {
    if (form.lots.length > 1) {
      setForm(prev => ({
        ...prev,
        lots: prev.lots.filter((_, i) => i !== index)
      }))
    }
  }

  const updateLot = (index: number, updates: Partial<Lot>) => {
    setForm(prev => ({
      ...prev,
      lots: prev.lots.map((lot, i) => i === index ? { ...lot, ...updates } : lot)
    }))
  }

  return (
    <>
      <Drawer
        open={open}
        title="Ajouter une marchandise (livraison)"
        onClose={handleClose}
        footer={
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Réinitialiser
            </button>
            <div className="flex items-center gap-2">
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
                form="create-livraison-form"
                disabled={loading}
                className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        }
      >
        <form id="create-livraison-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={keepManual}
                onChange={(e) => onKeepManualChange?.(e.target.checked)}
                className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
              />
              <span>Garder les champs manuels après création</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Collaborateur</label>
              <select
                value={form.id_collaborateur}
                onChange={(e) => setForm(prev => ({ ...prev, id_collaborateur: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
                required
              >
                <option value="">Sélectionner</option>
                {collaborateurs.map(c => (
                  <option key={c.id_collaborateur} value={c.id_collaborateur}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Point de vente</label>
              <select
                value={form.id_point_vente}
                onChange={(e) => setForm(prev => ({ ...prev, id_point_vente: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
                required
              >
                <option value="">Sélectionner</option>
                {pointsVente.map(pv => (
                  <option key={pv.id_point_vente} value={pv.id_point_vente}>{pv.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date de livraison</label>
              <input
                type="date"
                value={form.date_livraison}
                onChange={(e) => setForm(prev => ({ ...prev, date_livraison: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Référence</label>
              <input
                value={form.reference}
                onChange={(e) => setForm(prev => ({ ...prev, reference: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Commentaire</label>
            <textarea
              value={form.commentaire}
              onChange={(e) => setForm(prev => ({ ...prev, commentaire: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              disabled={loading}
            />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Lots</h3>
              <button
                type="button"
                onClick={addLot}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-[#7e3560] hover:bg-[#6a2f55] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                + Ajouter un lot
              </button>
            </div>

            <div className="space-y-4">
              {form.lots.map((lot, index) => (
                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Lot {index + 1}</h4>
                    {form.lots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLot(index)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Produit catalogue</label>
                      <TypeaheadSelect
                        options={produitsCatalogue}
                        value={lot.id_produit_catalogue}
                        onChange={(val: string) => updateLot(index, { id_produit_catalogue: val })}
                        placeholder="Rechercher un produit…"
                        showAddButton
                        onAddClick={() => onQuickAddClick(index, form.id_collaborateur)}
                        addAriaLabel="Ajouter un produit catalogue"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sélectionne un produit existant ou crée-en un nouveau via le bouton +</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prix initial (Ar)</label>
                        <input
                          type="number"
                          value={lot.prix_initial}
                          onChange={(e) => updateLot(index, { prix_initial: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          disabled={loading}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Marge (Ar)</label>
                        <input
                          type="number"
                          value={lot.marge}
                          onChange={(e) => updateLot(index, { marge: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          disabled={loading}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quantité</label>
                        <input
                          type="number"
                          value={lot.quantite_initiale}
                          onChange={(e) => updateLot(index, { quantite_initiale: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                      <input
                        value={lot.description}
                        onChange={(e) => updateLot(index, { description: e.target.value })}
                        placeholder="Description optionnelle du lot"
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Drawer>

      {showConfirmClose && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelClose} />
          <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Modifications non enregistrées</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter le formulaire ?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Les données seront conservées temporairement jusqu'au rechargement de la page.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelClose}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmClose}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Quitter sans enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AddLivraisonDrawer
