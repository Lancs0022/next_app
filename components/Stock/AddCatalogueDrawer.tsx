'use client'

import { useEffect, useState } from 'react'
import Drawer from '@/components/Drawer/Drawer'

interface Collaborateur {
  id_collaborateur: string | number
  nom: string
}

interface CatalogueFormData {
  id_collaborateur: string
  libelle: string
  categorie: string
  description: string
  prix_initial_actuel: string
  marge_actuelle: string
}

interface AddCatalogueDrawerProps {
  open: boolean
  onClose: (form?: CatalogueFormData) => void
  collaborateurs: Collaborateur[]
  onSubmit: (form: CatalogueFormData) => void
  loading?: boolean
  draft?: CatalogueFormData | null
}

const AddCatalogueDrawer = ({ 
  open, 
  onClose, 
  collaborateurs, 
  onSubmit,
  loading = false,
  draft = null
}: AddCatalogueDrawerProps) => {
  const [form, setForm] = useState<CatalogueFormData>({
    id_collaborateur: '',
    libelle: '',
    categorie: '',
    description: '',
    prix_initial_actuel: '',
    marge_actuelle: ''
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
    const initialForm: CatalogueFormData = {
      id_collaborateur: '',
      libelle: '',
      categorie: '',
      description: '',
      prix_initial_actuel: '',
      marge_actuelle: ''
    }
    const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)
    setHasDirtyFields(isDirty)
  }, [form])

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
      libelle: '',
      categorie: '',
      description: '',
      prix_initial_actuel: '',
      marge_actuelle: ''
    })
    setHasDirtyFields(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <>
      <Drawer
        open={open}
        title="Ajouter au catalogue"
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
                form="create-produit-catalogue-form"
                disabled={loading}
                className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        }
      >
        <form id="create-produit-catalogue-form" onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Libellé</label>
              <input
                value={form.libelle}
                onChange={(e) => setForm(prev => ({ ...prev, libelle: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Catégorie</label>
              <input
                value={form.categorie}
                onChange={(e) => setForm(prev => ({ ...prev, categorie: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prix initial actuel (Ar)</label>
              <input
                type="number"
                value={form.prix_initial_actuel}
                onChange={(e) => setForm(prev => ({ ...prev, prix_initial_actuel: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Marge actuelle (Ar)</label>
              <input
                type="number"
                value={form.marge_actuelle}
                onChange={(e) => setForm(prev => ({ ...prev, marge_actuelle: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              disabled={loading}
            />
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

export default AddCatalogueDrawer
