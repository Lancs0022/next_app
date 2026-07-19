'use client'

import Modal from '@/components/Modal/Modal'
import { Z_MODAL_NESTED } from '@/lib/zIndex'
import { FormField, formInputClass } from '@/components/FormField'
import TypeaheadSelect from '@/components/TypeaheadSelect'
import LotSelectionTable from '@/components/Ventes/LotSelectionTable'
import type { LotRow, LotSortField, SelectedLine } from '@/hooks/useVenteEntrySession'

interface AjouterMarchandisesModalProps {
  open: boolean
  onClose: () => void
  lots: LotRow[]
  loading?: boolean
  selected: Record<number, SelectedLine>
  sortField: LotSortField
  sortDir: 'asc' | 'desc'
  onToggleSort: (field: LotSortField) => void
  onToggleLot: (lot: LotRow) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  collaborateurs: { value: string; label: string }[]
  filterCollaborateur: string
  onFilterCollaborateurChange: (value: string) => void
}

export default function AjouterMarchandisesModal({
  open,
  onClose,
  lots,
  loading = false,
  selected,
  sortField,
  sortDir,
  onToggleSort,
  onToggleLot,
  searchQuery,
  onSearchChange,
  collaborateurs,
  filterCollaborateur,
  onFilterCollaborateurChange,
}: AjouterMarchandisesModalProps) {
  return (
    <Modal
      open={open}
      title="Sélectionner les marchandises"
      zIndex={Z_MODAL_NESTED}
      size="large"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            Valider la sélection
          </button>
        </div>
      }
    >
      <div className="space-y-4 flex flex-col h-full max-h-[60vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          <FormField label="Rechercher un produit">
            <input
              type="search"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Rechercher un produit…"
              className={formInputClass.replace('bg-slate-900', 'bg-white dark:bg-slate-700').replace('text-slate-200', 'text-slate-900 dark:text-white')}
            />
          </FormField>
          <TypeaheadSelect
            label="Collaborateur"
            options={collaborateurs}
            value={filterCollaborateur}
            onChange={onFilterCollaborateurChange}
            placeholder="Tous les collaborateurs"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-900 p-1">
          <LotSelectionTable
            lots={lots}
            loading={loading}
            selected={selected}
            sortField={sortField}
            sortDir={sortDir}
            onToggleSort={onToggleSort}
            onToggleLot={onToggleLot}
          />
        </div>
      </div>
    </Modal>
  )
}
