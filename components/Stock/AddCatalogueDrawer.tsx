'use client'

import { useEffect, useMemo, useState } from 'react'
import Drawer from '@/components/Drawer/Drawer'
import TypeaheadSelect from '@/components/TypeaheadSelect'

interface Collaborateur {
  id_collaborateur: string | number
  nom: string
}

interface PointDeVente {
  id_pdv: string | number
  nom: string
}

interface UniteOption {
  id_unite: number
  code: string
  label: string
}

interface CatalogueFormData {
  id_collaborateur: string
  nom: string
  categorie: string
  /** id_unite sous forme string */
  id_unite: string
  seuil_alerte: string
  id_pdv: string
  description: string
}

interface AddCatalogueDrawerProps {
  open: boolean
  onClose: (form?: CatalogueFormData) => void
  collaborateurs: Collaborateur[]
  pointsVente?: PointDeVente[]
  categories?: string[]
  unites?: UniteOption[]
  onSubmit: (form: CatalogueFormData) => void
  loading?: boolean
  draft?: CatalogueFormData | null
}

const emptyForm: CatalogueFormData = {
  id_collaborateur: '',
  nom: '',
  categorie: '',
  id_unite: '',
  seuil_alerte: '',
  id_pdv: '',
  description: ''
}

const AddCatalogueDrawer = ({
  open,
  onClose,
  collaborateurs,
  pointsVente = [],
  categories = [],
  unites = [],
  onSubmit,
  loading = false,
  draft = null
}: AddCatalogueDrawerProps) => {
  const [form, setForm] = useState<CatalogueFormData>({ ...emptyForm })
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  const collaborateurOptions = useMemo(
    () => collaborateurs.map(c => ({ value: String(c.id_collaborateur), label: c.nom })),
    [collaborateurs]
  )

  const categoryOptions = useMemo(
    () => categories.map(category => ({ value: category, label: category })),
    [categories]
  )

  const uniteOptions = useMemo(
    () => unites.map(u => ({
      value: String(u.id_unite),
      label: `${u.code} — ${u.label}`,
    })),
    [unites]
  )

  useEffect(() => {
    if (open && draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(draft)
    }
  }, [open, draft])

  const hasDirtyFields = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(emptyForm),
    [form]
  )

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
    setForm({ ...emptyForm })
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
            <TypeaheadSelect
              label="Collaborateur"
              options={collaborateurOptions}
              value={form.id_collaborateur}
              onChange={(value) => setForm(prev => ({ ...prev, id_collaborateur: value }))}
              placeholder="Rechercher un collaborateur…"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Point de vente</label>
            <select
              value={form.id_pdv}
              onChange={(e) => setForm(prev => ({ ...prev, id_pdv: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              disabled={loading}
            >
              <option value="">Sélectionner (optionnel)</option>
              {pointsVente.map(pv => (
                <option key={pv.id_pdv} value={pv.id_pdv}>{pv.nom}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input
                value={form.nom}
                onChange={(e) => setForm(prev => ({ ...prev, nom: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                disabled={loading}
                required
              />
            </div>
            <div>
              <TypeaheadSelect
                label="Catégorie"
                options={categoryOptions}
                value={form.categorie}
                onChange={(value) => setForm(prev => ({ ...prev, categorie: value }))}
                placeholder="Saisir ou choisir une catégorie…"
                disabled={loading}
                allowCustomInput
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <TypeaheadSelect
                label="Unité de mesure"
                options={uniteOptions}
                value={form.id_unite}
                onChange={(value) => setForm(prev => ({ ...prev, id_unite: value }))}
                placeholder="Sélectionner une unité…"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Seuil d&apos;alerte</label>
              <input
                type="number"
                step="any"
                value={form.seuil_alerte}
                onChange={(e) => setForm(prev => ({ ...prev, seuil_alerte: e.target.value }))}
                placeholder="Quantité minimale avant alerte"
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
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelClose} />
          <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Modifications non enregistrées</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter le formulaire ?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Les données seront conservées temporairement jusqu&apos;au rechargement de la page.
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
