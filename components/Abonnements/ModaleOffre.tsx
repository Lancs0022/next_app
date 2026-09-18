import React, { useState } from 'react'
import Modal from '@/components/Modal/Modal'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'

interface ModaleOffreProps {
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export default function ModaleOffre({ open, onClose, onSuccess }: ModaleOffreProps) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    nom: '',
    description: '',
    montant: '',
    periodicite: 'mensuel',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montant = parseFloat(form.montant)
    if (!form.nom.trim()) {
      showToast('Le nom est requis', 'error')
      return
    }
    if (!montant || montant <= 0) {
      showToast('Le montant doit être > 0', 'error')
      return
    }
    setLoading(true)
    try {
      await api.post('/abonnements', {
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        montant,
        periodicite: form.periodicite,
      })
      showToast('Offre créée', 'success')
      setForm({ nom: '', description: '', montant: '', periodicite: 'mensuel' })
      onClose()
      await onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur création', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Créer une offre"
      onClose={() => !loading && onClose()}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="form-create-offre"
            disabled={loading}
            className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      }
    >
      <form id="form-create-offre" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Nom de l'offre <span className="text-red-500">*</span>
          </label>
          <input
            value={form.nom}
            onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
            placeholder="Ex: Premium"
            disabled={loading}
            required
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description optionnelle"
            disabled={loading}
            rows={2}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Prix catalogue (Ar) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.montant}
              onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))}
              placeholder="Ex: 8000"
              disabled={loading}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tarif de référence — chaque collaborateur peut avoir un tarif différent.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Périodicité <span className="text-red-500">*</span>
            </label>
            <select
              value={form.periodicite}
              onChange={(e) => setForm((p) => ({ ...p, periodicite: e.target.value }))}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
            >
              <option value="mensuel">Mensuel</option>
              <option value="trimestriel">Trimestriel</option>
              <option value="annuel">Annuel</option>
              <option value="ponctuel">Ponctuel</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  )
}
