'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/Modal/Modal'
import { Z_MODAL_NESTED } from '@/lib/zIndex'
import { formInputClass } from '@/components/FormField'

export interface QuickAddClientForm {
  nom: string
  prenom: string
  email: string
  telephone: string
}

interface QuickAddClientModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (form: QuickAddClientForm) => void
  loading?: boolean
}

export default function QuickAddClientModal({
  open,
  onClose,
  onSubmit,
  loading = false,
}: QuickAddClientModalProps) {
  const [form, setForm] = useState<QuickAddClientForm>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
  })

  useEffect(() => {
    if (!open) return
    setForm({ nom: '', prenom: '', email: '', telephone: '' })
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <Modal
      open={open}
      title="Nouveau client"
      zIndex={Z_MODAL_NESTED}
      preventBackdropClose
      onClose={() => !loading && onClose()}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="quick-add-client-form"
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary-strong text-white disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      }
    >
      <form id="quick-add-client-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nom</label>
            <input
              value={form.nom}
              onChange={e => setForm(prev => ({ ...prev, nom: e.target.value }))}
              className={formInputClass.replace('bg-slate-900', 'bg-white dark:bg-slate-700').replace('text-slate-200', 'text-slate-900 dark:text-white')}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prénom</label>
            <input
              value={form.prenom}
              onChange={e => setForm(prev => ({ ...prev, prenom: e.target.value }))}
              className={formInputClass.replace('bg-slate-900', 'bg-white dark:bg-slate-700').replace('text-slate-200', 'text-slate-900 dark:text-white')}
              disabled={loading}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            className={formInputClass.replace('bg-slate-900', 'bg-white dark:bg-slate-700').replace('text-slate-200', 'text-slate-900 dark:text-white')}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Téléphone</label>
          <input
            value={form.telephone}
            onChange={e => setForm(prev => ({ ...prev, telephone: e.target.value }))}
            className={formInputClass.replace('bg-slate-900', 'bg-white dark:bg-slate-700').replace('text-slate-200', 'text-slate-900 dark:text-white')}
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  )
}
