'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/Modal/Modal'

interface Collaborateur {
  id_collaborateur: string | number
  nom: string
}

interface QuickAddFormData {
  id_collaborateur: string
  nom: string
  categorie: string
  unite_mesure: string
  seuil_alerte: string
  prix_vente: string
}

interface QuickAddProduitModalProps {
  open: boolean
  onClose: () => void
  collaborateurs: Collaborateur[]
  onSubmit: (form: QuickAddFormData) => void
  loading?: boolean
  initialCollab?: string
}

const QuickAddProduitModal = ({ 
  open, 
  onClose, 
  collaborateurs, 
  onSubmit,
  loading = false,
  initialCollab = ''
}: QuickAddProduitModalProps) => {
  const [form, setForm] = useState<QuickAddFormData>({
    id_collaborateur: initialCollab,
    nom: '',
    categorie: '',
    unite_mesure: '',
    seuil_alerte: '',
    prix_vente: ''
  })

  useEffect(() => {
    if (!open) return
    setForm({
      id_collaborateur: initialCollab || '',
      nom: '',
      categorie: '',
      unite_mesure: '',
      seuil_alerte: '',
      prix_vente: ''
    })
  }, [open, initialCollab])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      title="Nouveau produit catalogue"
      zIndex="z-[60]"
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nom du produit</label>
          <input
            value={form.nom}
            onChange={(e) => setForm(prev => ({ ...prev, nom: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            disabled={loading}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Catégorie</label>
            <input
              value={form.categorie}
              onChange={(e) => setForm(prev => ({ ...prev, categorie: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Unité de mesure</label>
            <input
              value={form.unite_mesure}
              onChange={(e) => setForm(prev => ({ ...prev, unite_mesure: e.target.value }))}
              placeholder="pièce, kg, L, m..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Seuil d'alerte</label>
          <input
            type="number"
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
