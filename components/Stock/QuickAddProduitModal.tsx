'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/Modal/Modal'
import { Z_MODAL_NESTED } from '@/lib/zIndex'
import TypeaheadSelect from '@/components/TypeaheadSelect'

interface Collaborateur {
  id_collaborateur: string | number
  nom: string
}

interface UniteOption {
  id_unite: number
  code: string
  label: string
}

interface QuickAddFormData {
  id_collaborateur: string
  nom: string
  categorie: string
  /** id_unite sous forme string pour le TypeaheadSelect */
  id_unite: string
  seuil_alerte: string
}

interface QuickAddProduitModalProps {
  open: boolean
  onClose: () => void
  collaborateurs: Collaborateur[]
  categories?: string[]
  unites?: UniteOption[]
  onSubmit: (form: QuickAddFormData) => void
  loading?: boolean
  initialCollab?: string
}

const QuickAddProduitModal = ({
  open,
  onClose,
  collaborateurs,
  categories = [],
  unites = [],
  onSubmit,
  loading = false,
  initialCollab = ''
}: QuickAddProduitModalProps) => {
  const [form, setForm] = useState<QuickAddFormData>({
    id_collaborateur: initialCollab,
    nom: '',
    categorie: '',
    id_unite: '',
    seuil_alerte: ''
  })

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
    if (!open) return
    setForm({
      id_collaborateur: initialCollab || '',
      nom: '',
      categorie: '',
      id_unite: '',
      seuil_alerte: ''
    })
  }, [open, initialCollab])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const handleClose = () => {
    if (!loading) onClose()
  }

  return (
    <Modal
      open={open}
      title="Nouveau produit catalogue"
      zIndex={Z_MODAL_NESTED}
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
            form="quick-add-produit-form"
            disabled={loading}
            className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      }
    >
      <form id="quick-add-produit-form" onSubmit={handleSubmit} className="space-y-4">
        <TypeaheadSelect
          label="Collaborateur"
          options={collaborateurOptions}
          value={form.id_collaborateur}
          onChange={(value) => setForm(prev => ({ ...prev, id_collaborateur: value }))}
          placeholder="Rechercher un collaborateur…"
          disabled={loading}
        />

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TypeaheadSelect
            label="Catégorie"
            options={categoryOptions}
            value={form.categorie}
            onChange={(value) => setForm(prev => ({ ...prev, categorie: value }))}
            placeholder="Saisir ou choisir…"
            disabled={loading}
            allowCustomInput
          />

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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Seuil d&apos;alerte
          </label>
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

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Le prix et la marge pourront être ajustés plus tard via les lots et le catalogue.
        </p>
      </form>
    </Modal>
  )
}

export default QuickAddProduitModal
