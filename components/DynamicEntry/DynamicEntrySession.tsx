'use client'

import { useMemo, useState } from 'react'
import TypeaheadSelect from '@/components/TypeaheadSelect'
import Modal from '@/components/Modal/Modal'
import { FormField, formInputClass } from '@/components/FormField'
import DynamicEntryGrid from '@/components/DynamicEntry/DynamicEntryGrid'
import DynamicEntryMetricsBar from '@/components/DynamicEntry/DynamicEntryMetricsBar'
import CollaboratorTabs from '@/components/DynamicEntry/CollaboratorTabs'
import SyncStatusIndicator from '@/components/DynamicEntry/SyncStatusIndicator'
import ResetSessionModal from '@/components/DynamicEntry/ResetSessionModal'
import { useDynamicEntrySession } from '@/hooks/useDynamicEntrySession'
import { livraisonColumns } from '@/lib/dynamicEntry/columnConfigs'
import type { DynamicEntryModule, ProductOption } from '@/lib/dynamicEntry/types'

interface PointVente {
  id_pdv?: string | number
  id_point_vente?: string | number
  nom: string
}

interface Collaborateur {
  id_collaborateur: string | number
  nom: string
}

interface DynamicEntrySessionProps {
  module: DynamicEntryModule
  title: string
  collaborateurs: Collaborateur[]
  pointsVente: PointVente[]
  produitsCatalogue: ProductOption[]
  onQuickAddProduct?: () => void
  onSyncSuccess?: () => void
  onSyncError?: (msg: string) => void
}

export default function DynamicEntrySession({
  module,
  title,
  collaborateurs,
  pointsVente,
  produitsCatalogue,
  onQuickAddProduct,
  onSyncSuccess,
  onSyncError,
}: DynamicEntrySessionProps) {
  const [resetOpen, setResetOpen] = useState(false)
  const [addCollabOpen, setAddCollabOpen] = useState(false)
  const [selectedNewCollab, setSelectedNewCollab] = useState('')

  const session = useDynamicEntrySession({
    module,
    collaborateurs,
    produitsCatalogue,
    onSyncSuccess,
    onSyncError,
  })

  const columns = livraisonColumns
  const productOptions = useMemo(
    () => session.getProductOptionsForTab(session.activeTabId),
    [session.activeTabId, session.tabs, produitsCatalogue, session.getProductOptionsForTab]
  )

  const formatTitleDate = () => {
    const d = session.meta.date || new Date().toISOString().slice(0, 10)
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const usedCollabIds = new Set(session.tabs.map(t => t.id_collaborateur))
  const canAddMore = collaborateurs.some(c => !usedCollabIds.has(String(c.id_collaborateur)))

  const recentIds = session.getRecentCollabIds()
  const availableCollabOptions = collaborateurs
    .filter(c => !usedCollabIds.has(String(c.id_collaborateur)))
    .sort((a, b) => {
      const ai = recentIds.indexOf(String(a.id_collaborateur))
      const bi = recentIds.indexOf(String(b.id_collaborateur))
      if (ai === -1 && bi === -1) return a.nom.localeCompare(b.nom)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
    .map(c => ({ value: String(c.id_collaborateur), label: c.nom }))

  const pvOptions = pointsVente.map(pv => ({
    value: String(pv.id_pdv ?? pv.id_point_vente),
    label: pv.nom,
  }))

  const handleAddCollaborator = () => {
    if (!selectedNewCollab) return
    if (session.addCollaboratorById(selectedNewCollab)) {
      setSelectedNewCollab('')
      setAddCollabOpen(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[480px] bg-slate-900 text-slate-100 overflow-hidden rounded-lg border border-slate-700">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-sm text-slate-100 font-medium">
            {title} - {formatTitleDate()}
          </h1>
          <SyncStatusIndicator status={session.syncStatus} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded transition-colors border text-white"
            style={{ backgroundColor: '#EF4444', borderColor: '#DC2626' }}
          >
            Réinitialiser la session
          </button>
          <button
            type="button"
            onClick={session.saveAndNext}
            disabled={!session.activeTab}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors border border-indigo-500 disabled:opacity-50"
          >
            Enregistrer & Suivant
          </button>
          <button
            type="button"
            onClick={session.validateSession}
            disabled={session.tabs.length === 0}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors border border-slate-600 disabled:opacity-50"
          >
            Valider la session
          </button>
        </div>
      </header>

      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        <FormField label="Date de livraison">
          <input
            type="date"
            value={session.meta.date}
            onChange={e => session.setMeta(prev => ({ ...prev, date: e.target.value }))}
            className={formInputClass}
          />
        </FormField>
        <TypeaheadSelect
          label="Point de vente"
          options={pvOptions}
          value={session.meta.id_pdv}
          onChange={val => session.setMeta(prev => ({ ...prev, id_pdv: val }))}
          placeholder="Sélectionner"
        />
      </div>
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        <FormField label="Référence">
          <input
            type="text"
            value={session.meta.reference || new Date().toISOString()}
            onChange={e => session.setMeta(prev => ({ ...prev, reference: e.target.value }))}
            className={formInputClass}
          />
        </FormField>
        <FormField label="Commentaire">
          <textarea
            value={session.meta.comment}
            onChange={e => session.setMeta(prev => ({ ...prev, comment: e.target.value }))}
            className={formInputClass}
            rows={2}
          />
        </FormField>
      </div>

      <CollaboratorTabs
        tabs={session.tabs}
        activeId={session.activeTabId}
        onSelect={session.setActiveTabId}
        onAddTab={() => setAddCollabOpen(true)}
        onRemoveTab={session.removeCollaboratorTab}
        canAddMore={canAddMore}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        {session.activeTab ? (
          <DynamicEntryGrid
            rows={session.activeTab.rows}
            columns={columns}
            module={module}
            productOptions={productOptions}
            onAddRow={session.addRow}
            onRemoveRow={session.removeRow}
            onUpdateRow={session.updateRow}
            onQuickAddProduct={onQuickAddProduct}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center">
            <p className="text-sm text-slate-400 mb-4">
              Aucun collaborateur sélectionné. Ajoutez un collaborateur pour commencer la saisie.
            </p>
            {canAddMore && (
              <button
                type="button"
                onClick={() => setAddCollabOpen(true)}
                className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg border border-indigo-500"
              >
                Ajouter un collaborateur
              </button>
            )}
          </div>
        )}
      </div>

      {session.tabs.length > 0 && (
        <DynamicEntryMetricsBar tabs={session.tabs} module={module} />
      )}

      <ResetSessionModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          session.resetSession()
          setResetOpen(false)
        }}
      />

      <Modal
        open={addCollabOpen}
        title="Ajouter un collaborateur"
        onClose={() => { setAddCollabOpen(false); setSelectedNewCollab('') }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setAddCollabOpen(false); setSelectedNewCollab('') }}
              className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAddCollaborator}
              disabled={!selectedNewCollab}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        }
      >
        <TypeaheadSelect
          label="Collaborateur"
          options={availableCollabOptions}
          value={selectedNewCollab}
          onChange={setSelectedNewCollab}
          placeholder="Choisir un collaborateur..."
        />
      </Modal>
    </div>
  )
}
