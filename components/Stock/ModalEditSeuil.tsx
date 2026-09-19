import Modal from '@/components/Modal/Modal'
import type { AnyRecord } from './stockTypes'

interface ModalEditSeuilProps {
  open: boolean
  loading: boolean
  produit: AnyRecord | null
  value: string
  onChange: (val: string) => void
  onClose: () => void
  onSave: () => void
}

export default function ModalEditSeuil({
  open,
  loading,
  produit,
  value,
  onChange,
  onClose,
  onSave,
}: ModalEditSeuilProps) {
  return (
    <Modal
      open={open}
      title={produit ? `Modifier le seuil • ${produit.libelle}` : 'Modifier le seuil'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Seuil d&apos;alerte
          </label>
          <input
            type="number"
            min="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Laisser vide pour aucun seuil"
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ce seuil sert à signaler les produits dont le stock devient bas dans le catalogue.
        </p>
      </div>
    </Modal>
  )
}
