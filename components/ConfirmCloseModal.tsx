'use client'

import Modal from '@/components/Modal/Modal'

const ConfirmCloseModal = ({ open, onClose, onConfirm, title = "Modifications non enregistrées" }: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
}) => {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
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
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white"
          >
            Quitter sans enregistrer
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter le formulaire ?
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Les données seront conservées temporairement jusqu&apos;au rechargement de la page.
      </p>
    </Modal>
  )
}

export default ConfirmCloseModal
