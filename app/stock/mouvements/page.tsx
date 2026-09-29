'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import api from '@/services/api'
import ResponsiveDataTable, { Column } from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import { useToast } from '@/components/Toast/ToastContainer'
import JournalFilterBar from '@/components/Stock/Journal/JournalFilterBar'
import JournalExpandedRow from '@/components/Stock/Journal/JournalExpandedRow'
import JournalMiniTableModal from '@/components/Stock/Journal/JournalMiniTableModal'
import JournalDrawerDetail from '@/components/Stock/Journal/JournalDrawerDetail'
import { buildStockEvents, getEventTypeBadge } from '@/components/Stock/Journal/journalUtils'
import type {
  EnrichedStockMouvement,
  StockEvent,
  JournalFiltersState,
} from '@/components/Stock/Journal/journalTypes'

export default function StockEventsJournalPage() {
  const { showToast } = useToast()

  // ─── États des données ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [rawMovements, setRawMovements] = useState<EnrichedStockMouvement[]>([])
  const [pointsDeVente, setPointsDeVente] = useState<Array<{ id_pdv: number; nom: string }>>([])
  const [collaborateurs, setCollaborateurs] = useState<Array<{ id_utilisateur?: number; id_collaborateur?: number; nom: string; prenom?: string }>>([])

  // ─── États de pagination & tri ──────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [sortConfig, setSortConfig] = useState({ field: 'eventDate', direction: 'desc' })

  // ─── États des filtres ──────────────────────────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filters, setFilters] = useState<JournalFiltersState>({
    q: '',
    type: '',
    source_type: '',
    id_pdv: '',
    id_utilisateur: '',
    date: null,
    statut: '',
  })

  // ─── Modales & Drawer ───────────────────────────────────────────────────────
  const [selectedEvent, setSelectedEvent] = useState<StockEvent | null>(null)
  const [miniTableEvent, setMiniTableEvent] = useState<StockEvent | null>(null)

  // ─── Chargement initial des référentiels ────────────────────────────────────
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [pvRes, colRes] = await Promise.all([
          api.get('/points-de-vente'),
          api.get('/collaborateurs'),
        ])
        setPointsDeVente(pvRes.data?.data || pvRes.data || [])
        setCollaborateurs(colRes.data?.data || colRes.data || [])
      } catch {
        // Silencieux, l'utilisateur pourra toujours consulter le journal
      }
    }
    fetchReferences()
  }, [])

  // ─── Chargement des mouvements de stock enrichis ────────────────────────────
  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        limit: 1000, // Récupère le volume du journal pour agrégation en mémoire
      }
      if (filters.id_pdv) params.id_pdv = filters.id_pdv
      if (filters.id_utilisateur) params.id_utilisateur = filters.id_utilisateur
      if (filters.source_type) params.source_type = filters.source_type
      if (filters.date?.dateMin) params.dateMin = filters.date.dateMin
      if (filters.date?.dateMax) params.dateMax = filters.date.dateMax
      if (filters.q) params.q = filters.q

      const res = await api.get('/stock/mouvements', { params })
      const list: EnrichedStockMouvement[] = res.data?.data || []
      setRawMovements(list)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string }
      showToast(e?.response?.data?.error || e?.message || 'Erreur lors du chargement des mouvements de stock', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters.id_pdv, filters.id_utilisateur, filters.source_type, filters.date, filters.q, showToast])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  // ─── Dérivation des Événements Métier (StockEvent[]) ─────────────────────────
  const allEvents = useMemo(() => {
    return buildStockEvents(rawMovements)
  }, [rawMovements])

  // ─── Filtrage côté client sur les événements métier ─────────────────────────
  const filteredEvents = useMemo(() => {
    let list = allEvents

    // Filtre Type
    if (filters.type) {
      list = list.filter((evt) => evt.type === filters.type)
    }

    // Filtre Statut
    if (filters.statut) {
      const st = filters.statut.toLowerCase()
      list = list.filter((evt) => evt.status.toLowerCase().includes(st))
    }

    // Tri
    if (sortConfig.field && sortConfig.direction) {
      const dir = sortConfig.direction === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        let va: string | number = ''
        let vb: string | number = ''

        if (sortConfig.field === 'eventDate') {
          va = new Date(a.eventDate).getTime()
          vb = new Date(b.eventDate).getTime()
        } else if (sortConfig.field === 'type') {
          va = a.type
          vb = b.type
        } else if (sortConfig.field === 'operator') {
          va = a.operator
          vb = b.operator
        } else {
          va = (a as unknown as Record<string, unknown>)[sortConfig.field] as string | number ?? ''
          vb = (b as unknown as Record<string, unknown>)[sortConfig.field] as string | number ?? ''
        }

        if (va < vb) return -1 * dir
        if (va > vb) return 1 * dir
        return 0
      })
    }

    return list
  }, [allEvents, filters.type, filters.statut, sortConfig])

  // ─── Pagination Cas A : sur les StockEvent affichés ─────────────────────────
  const totalEventsCount = filteredEvents.length
  const paginatedEvents = useMemo(() => {
    const startIdx = (page - 1) * perPage
    return filteredEvents.slice(startIdx, startIdx + perPage)
  }, [filteredEvents, page, perPage])

  const handleResetFilters = () => {
    setFilters({
      q: '',
      type: '',
      source_type: '',
      id_pdv: '',
      id_utilisateur: '',
      date: null,
      statut: '',
    })
    setPage(1)
  }

  // ─── Définition des 4 Colonnes Principales ───────────────────────────────────
  const columns = useMemo<Column<StockEvent>[]>(
    () => [
      // 1. Colonne Événement
      {
        field: 'eventDate',
        headerName: 'Événement',
        width: '260px',
        minWidth: '220px',
        sortable: true,
        renderCell: (evt: StockEvent) => {
          const badgeInfo = getEventTypeBadge(evt.type)
          return (
            <div className="flex flex-col gap-1 text-xs leading-snug">
              {/* Ligne 1 : Date & heure */}
              <div className="font-medium text-slate-700 dark:text-slate-300">
                {evt.colEvent.line1Date}
              </div>

              {/* Ligne 2 : Badge plein du type */}
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${badgeInfo.fullBadge}`}>
                  {badgeInfo.label}
                </span>
              </div>

              {/* Ligne 3 : Référence métier */}
              <div className="font-semibold text-slate-900 dark:text-white truncate" title={evt.colEvent.line3Ref}>
                {evt.colEvent.line3Ref}
              </div>
            </div>
          )
        },
        renderMobilePrimary: (evt: StockEvent) => {
          const badgeInfo = getEventTypeBadge(evt.type)
          return (
            <div className="space-y-2 text-xs">
              {/* Entête Carte : Date + Type + Réf */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {evt.colEvent.line1Date}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeInfo.fullBadge}`}>
                    {badgeInfo.label}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {evt.reference}
                </span>
              </div>

              {/* Produit / Lot */}
              <div>
                <div className="font-bold text-slate-900 dark:text-white truncate">
                  {evt.colArticle.line1Product}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {evt.colArticle.line3LotAndUnit}
                  {evt.colArticle.badgeSoftUnit && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 font-mono">
                      {evt.colArticle.badgeSoftUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* Mouvement */}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between">
                <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                  {evt.colMovement.line1Location}
                </div>
                <div className={evt.colMovement.isPositive ? 'text-emerald-600 font-bold' : evt.colMovement.isNeutral ? 'text-blue-600 font-bold' : 'text-rose-600 font-bold'}>
                  {evt.colMovement.line2Delta}
                </div>
              </div>

              {/* Opérateur & création */}
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span>{evt.operator}</span>
                <span>{evt.colOperator.line2CreatedAt}</span>
              </div>
            </div>
          )
        },
      },

      // 2. Colonne Article / Lot
      {
        field: 'merchandise',
        headerName: 'Article / Lot',
        width: '280px',
        minWidth: '220px',
        renderCell: (evt: StockEvent) => {
          return (
            <div className="flex flex-col gap-0.5 text-xs leading-snug">
              {/* Ligne 1 : Produit */}
              <div
                className="font-semibold text-slate-900 dark:text-white truncate"
                title={evt.colArticle.line1Product}
              >
                {evt.colArticle.line1Product}
              </div>

              {/* Ligne 2 : Référence SKU (si présente) */}
              {evt.colArticle.line2Sku && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {evt.colArticle.line2Sku}
                </div>
              )}

              {/* Ligne 3 : Lot et unité */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <span>{evt.colArticle.line3LotAndUnit}</span>
                {evt.colArticle.badgeSoftUnit && (
                  <span className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    {evt.colArticle.badgeSoftUnit}
                  </span>
                )}
              </div>
            </div>
          )
        },
      },

      // 3. Colonne Mouvement (sans soldes avant/après dans la table)
      {
        field: 'movement',
        headerName: 'Mouvement',
        width: '280px',
        minWidth: '220px',
        renderCell: (evt: StockEvent) => {
          const deltaColor = evt.colMovement.isPositive
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : evt.colMovement.isNeutral
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-rose-600 dark:text-rose-400 font-bold'

          return (
            <div className="flex flex-col gap-0.5 text-xs leading-snug">
              {/* Ligne 1 : Lieu */}
              <div
                className="font-medium text-slate-800 dark:text-slate-200 truncate"
                title={evt.colMovement.line1Location}
              >
                {evt.colMovement.line1Location}
              </div>

              {/* Ligne 2 : Delta avec couleur sémantique */}
              <div className={deltaColor}>
                {evt.colMovement.line2Delta}
              </div>

              {/* Ligne 3 : Destination métier ou motif */}
              {evt.colMovement.line3DestinationOrNote && (
                <div
                  className="text-[11px] text-slate-500 dark:text-slate-400 truncate"
                  title={evt.colMovement.line3DestinationOrNote}
                >
                  {evt.colMovement.line3DestinationOrNote}
                </div>
              )}
            </div>
          )
        },
      },

      // 4. Colonne Opérateur
      {
        field: 'operator',
        headerName: 'Opérateur',
        width: '200px',
        minWidth: '160px',
        sortable: true,
        renderCell: (evt: StockEvent) => {
          return (
            <div className="flex flex-col gap-0.5 text-xs leading-snug">
              {/* Ligne 1 : Qui ? */}
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                <span className="truncate" title={evt.colOperator.line1Name}>
                  {evt.colOperator.line1Name}
                </span>
              </div>

              {/* Ligne 2 : Quand créé ? */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {evt.colOperator.line2CreatedAt}
              </div>
            </div>
          )
        },
      },

      // 5. Actions contextuelles
      {
        field: 'actions',
        headerName: '',
        width: '70px',
        minWidth: '60px',
        getActions: (evt: StockEvent) => {
          const acts = [
            {
              label: 'Voir détails',
              onClick: () => setSelectedEvent(evt),
            },
          ]

          if (evt.isGrouped) {
            acts.push({
              label: `Voir les ${evt.movementCount} mouvements…`,
              onClick: () => setMiniTableEvent(evt),
            })
          }

          return acts
        },
      },
    ],
    []
  )

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* ── Entête de Page ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
            Journal des événements de stock
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Vue métier agrégée des entrées, sorties, transferts et ajustements d'inventaire
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchMovements()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Barre de filtres (UX conforme à TabLotsDisponibles) ── */}
      <JournalFilterBar
        filters={filters}
        onSetFilters={setFilters}
        pointsDeVente={pointsDeVente}
        collaborateurs={collaborateurs}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((p) => !p)}
        onReset={handleResetFilters}
      />

      {/* ── Tableau Principal (ResponsiveDataTable) ── */}
      <ResponsiveDataTable
        columns={columns}
        data={paginatedEvents}
        loading={loading}
        pagination={{
          page,
          perPage,
          total: totalEventsCount,
        }}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(sz) => {
          setPerPage(sz)
          setPage(1)
        }}
        onSort={(cfg) => setSortConfig(cfg)}
        sortConfig={sortConfig}
        serverSide={true}
        expandOnRowClick={false}
        canExpandRow={(row: StockEvent) => row.isGrouped}
        renderExpandedRow={(row: StockEvent) => (
          <JournalExpandedRow
            event={row}
            onOpenMiniTable={(evt) => setMiniTableEvent(evt)}
          />
        )}
        onRowClick={(row: StockEvent) => setSelectedEvent(row)}
      />

      {/* ── Drawer de Détail Contextuel ── */}
      <JournalDrawerDetail
        open={Boolean(selectedEvent)}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onOpenMiniTable={(evt) => setMiniTableEvent(evt)}
        onRefreshAfterAction={fetchMovements}
        showToast={showToast}
      />

      {/* ── Mini-Tableau / Modal des Mouvements Atomiques ── */}
      <JournalMiniTableModal
        open={Boolean(miniTableEvent)}
        event={miniTableEvent}
        onClose={() => setMiniTableEvent(null)}
      />
    </div>
  )
}
