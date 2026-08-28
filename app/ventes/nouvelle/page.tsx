'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TypeaheadSelect from '@/components/TypeaheadSelect'
import { FormField, formInputClass } from '@/components/FormField'
import QuickAddClientModal from '@/components/Ventes/QuickAddClientModal'
import SyncStatusIndicator from '@/components/DynamicEntry/SyncStatusIndicator'
import ResetSessionModal from '@/components/DynamicEntry/ResetSessionModal'
import { useVenteEntrySession } from '@/hooks/useVenteEntrySession'
import { formatAr } from '@/lib/dynamicEntry/metrics'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import { PlusIcon } from '@/components/icons/Icons'
import AjouterMarchandisesModal from '@/components/Ventes/AjouterMarchandisesModal'
import { getPvId } from '@/lib/pointVente'
import { logAction } from '@/lib/logger'

interface Collaborateur {
  id_collaborateur: string | number
  nom: string
}

interface PointVente {
  id: string
  nom: string
}

interface ClientOption {
  id_client: number
  nom: string
  prenom?: string | null
  label?: string
}

const ANONYMOUS_VALUE = '__anonymous__'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function NouvelleVentePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const fromLotId = searchParams.get('from_lot') || ''
  const fromPvId = searchParams.get('from_pv') || ''

  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([])
  const [pointsVente, setPointsVente] = useState<PointVente[]>([])
  const [resetOpen, setResetOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientAnonymous, setClientAnonymous] = useState(false)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addClientLoading, setAddClientLoading] = useState(false)
  const [ajouterMarchandisesOpen, setAjouterMarchandisesOpen] = useState(false)

  const session = useVenteEntrySession({
    onSyncSuccess: () => {
      showToast('Vente synchronisée', 'success')
      router.push('/ventes')
    },
    onSyncError: (msg) => showToast(msg, 'info')
  })

  const loadClients = async () => {
    try {
      const { data: res } = await api.get('/clients', { params: { limit: 200 } })
      setClients(res.data || [])
    } catch {
      setClients([])
    }
  }

  const loadMetadata = async () => {
    try {
      const [collabRes, pvRes] = await Promise.all([
        api.get('/collaborateurs'),
        api.get('/points-de-vente')
      ])
      setCollaborateurs((collabRes.data?.data || collabRes.data || []).map((c: any) => ({
        id_collaborateur: c.id_collaborateur,
        nom: c.nom
      })))
      setPointsVente((pvRes.data?.data || pvRes.data || []).map((pv: any) => ({
        id: getPvId(pv),
        nom: pv.nom
      })))
    } catch {
      showToast('Erreur chargement des listes de métadonnées', 'info')
    }
  }

  useEffect(() => {
    void loadClients()
    void loadMetadata()
  }, [])

  useEffect(() => {
    if (initialized) return
    session.setMeta(prev => ({
      ...prev,
      date: todayIso(),
      id_pdv: fromPvId || prev.id_pdv,
    }))
    if (fromPvId) {
      void session.loadLots(fromPvId).then(loaded => {
        if (fromLotId) session.selectLotById(fromLotId, loaded)
      })
    }
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, fromPvId, fromLotId])

  const clientOptions = useMemo(
    () => clients.map(c => ({
      value: String(c.id_client),
      label: c.label || [c.prenom, c.nom].filter(Boolean).join(' ') || c.nom,
    })),
    [clients]
  )

  const collabOptions = useMemo(
    () => collaborateurs.map(c => ({ value: String(c.id_collaborateur), label: c.nom })),
    [collaborateurs]
  )

  const pvOptions = useMemo(
    () => pointsVente.map(pv => ({ value: pv.id, label: pv.nom })),
    [pointsVente]
  )

  const handleClientChange = (val: string) => {
    setClientAnonymous(false)
    session.setMeta(prev => ({ ...prev, id_client: val }))
  }

  const handleAnonymousToggle = () => {
    const next = !clientAnonymous
    setClientAnonymous(next)
    if (next) {
      session.setMeta(prev => ({ ...prev, id_client: ANONYMOUS_VALUE }))
    } else {
      session.setMeta(prev => ({ ...prev, id_client: '' }))
    }
  }

  const handleValidate = () => {
    logAction('NouvelleVente → Valider la vente', {
      pdv: session.meta.id_pdv,
      client: session.meta.id_client,
      nbLignes: session.selectedLines.length,
    })
    if (clientAnonymous) {
      const divers = clients.find(c => c.nom === 'Client' && c.prenom === 'Divers')
        || clients.find(c => c.nom.toLowerCase().includes('divers'))
      if (!divers) {
        showToast('Client anonyme introuvable. Créez un client ou sélectionnez-en un.', 'info')
        return
      }
      session.validateVente(divers.id_client)
      return
    }
    if (!session.meta.id_client || session.meta.id_client === ANONYMOUS_VALUE) {
      showToast('Sélectionnez un client ou cochez « Client anonyme »', 'info')
      return
    }
    session.validateVente(Number(session.meta.id_client))
  }

  const handleAddClient = async (form: { nom: string; prenom: string; email: string; telephone: string }) => {
    setAddClientLoading(true)
    try {
      const { data: res } = await api.post('/clients', form)
      const created = res.data as ClientOption
      await loadClients()
      setClientAnonymous(false)
      session.setMeta(prev => ({ ...prev, id_client: String(created.id_client) }))
      setAddClientOpen(false)
      showToast('Client créé', 'success')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur création client', 'info')
    } finally {
      setAddClientLoading(false)
    }
  }

  const clientDisplayOptions = clientAnonymous
    ? [{ value: ANONYMOUS_VALUE, label: 'Anonyme' }]
    : clientOptions

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between">
        <button
          onClick={() => router.push('/ventes')}
          className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-2"
        >
          ← Retour aux ventes
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium">Saisie Globale des Ventes</h2>
            <SyncStatusIndicator status={session.hasPendingSync() ? 'pending' : 'synced'} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
              logAction('NouvelleVente → Réinitialiser')
              setResetOpen(true)
            }}
              className="px-3 py-1.5 text-xs font-medium rounded border text-white"
              style={{ backgroundColor: '#EF4444', borderColor: '#DC2626' }}
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={handleValidate}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded border border-indigo-500"
            >
              Valider la vente
            </button>
          </div>
        </header>

        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0 items-start">
          <FormField label="Date de vente">
            <input
              type="date"
              value={session.meta.date}
              onChange={e => session.setMeta(prev => ({ ...prev, date: e.target.value }))}
              className={formInputClass}
            />
          </FormField>
          <div>
            <TypeaheadSelect
              label="Client"
              options={clientDisplayOptions}
              value={clientAnonymous ? ANONYMOUS_VALUE : session.meta.id_client}
              onChange={handleClientChange}
              placeholder="Sélectionner un client"
              showAddButton
              onAddClick={() => setAddClientOpen(true)}
              addAriaLabel="Ajouter un client"
              disabled={clientAnonymous}
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={clientAnonymous}
                onChange={handleAnonymousToggle}
                className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              Client anonyme
            </label>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => {
              logAction('NouvelleVente → Ajouter marchandises')
              setAjouterMarchandisesOpen(true)
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Ajouter marchandises
          </button>
        </div>

        <div className="border-t border-slate-700 bg-slate-800 flex-1 min-h-0 overflow-y-auto">
          {session.selectedLines.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Aucun article sélectionné — clique sur « Ajouter marchandises »
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {session.selectedLines.map(line => (
                <div key={line.id_lot} className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="flex-1 min-w-[140px]">
                    <p className="text-sm text-slate-100 truncate">{line.libelle_produit}</p>
                    <p className="text-xs text-slate-400">{line.collaborateur_nom}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">
                      Qté{line.unite_code && line.unite_code !== 'U' ? ` (${line.unite_code})` : ''}
                    </label>
                    <input
                      type="text"
                      inputMode={line.est_decimal ? 'decimal' : 'numeric'}
                      value={line.quantite}
                      onChange={e => session.updateLine(line.id_lot, 'quantite', e.target.value)}
                      className="w-20 px-2 py-1.5 text-xs border border-slate-600 rounded bg-slate-800 text-slate-200 text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Réduc.</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={line.reduction}
                      onChange={e => session.updateLine(line.id_lot, 'reduction', e.target.value)}
                      className="w-20 px-2 py-1.5 text-xs border border-slate-600 rounded bg-slate-800 text-slate-200 text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => session.removeLine(line.id_lot)}
                    className="p-1 text-slate-400 hover:text-red-400"
                    aria-label="Retirer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 flex flex-wrap items-center gap-4 text-xs shrink-0">
          <span className="text-slate-300">
            Total articles: <strong className="text-white">{session.metrics.totalArticles}</strong>
          </span>
          <span className="text-slate-300">
            Montant: <strong className="text-white">{formatAr(session.metrics.totalCost)} Ar</strong>
          </span>
          <span className="text-slate-300">
            Marge estimée: <strong className="text-green-400">{formatAr(session.metrics.totalProfit)} Ar</strong>
          </span>
        </div>
      </div>

      <ResetSessionModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          session.resetSession()
          setClientAnonymous(false)
          setResetOpen(false)
        }}
      />

      <QuickAddClientModal
        open={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        onSubmit={handleAddClient}
        loading={addClientLoading}
      />

      <AjouterMarchandisesModal
        open={ajouterMarchandisesOpen}
        onClose={() => setAjouterMarchandisesOpen(false)}
        lots={session.lots}
        loading={session.lotsLoading}
        selected={session.selected}
        sortField={session.sortField}
        sortDir={session.sortDir}
        onToggleSort={session.toggleSort}
        onToggleLot={session.toggleLot}
        searchQuery={session.searchQuery}
        onSearchChange={session.setSearchQuery}
        collaborateurs={collabOptions}
        filterCollaborateur={session.filterCollaborateur}
        onFilterCollaborateurChange={session.setFilterCollaborateur}
        pointsVente={pvOptions}
        selectedPdv={session.meta.id_pdv}
        onPdvChange={val => {
          session.setMeta(prev => ({ ...prev, id_pdv: val }))
          session.setFilterCollaborateur('')
        }}
      />
    </div>
  )
}

export default function NouvelleVentePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement...</div>}>
      <NouvelleVentePageContent />
    </Suspense>
  )
}
