'use client'

import Modal from '@/components/Modal/Modal'
import { Z_MODAL_NESTED } from '@/lib/zIndex'

interface ResetSessionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ResetSessionModal({ open, onClose, onConfirm }: ResetSessionModalProps) {
  return (
    <Modal
      open={open}
      title="Réinitialiser la session"
      onClose={onClose}
      preventBackdropClose
      zIndex={Z_MODAL_NESTED}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white"
            style={{ backgroundColor: '#EF4444' }}
          >
            Oui, tout effacer
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Cette action supprimera définitivement toutes les données de saisie en cours, y compris celles stockées localement.
      </p>
      <p className="mt-2 text-xs text-red-500 font-medium">
        Cette opération est irréversible. Confirmez uniquement si vous souhaitez repartir de zéro.
      </p>
    </Modal>
  )
}
