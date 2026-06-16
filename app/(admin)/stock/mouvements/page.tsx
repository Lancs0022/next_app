'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/services/api'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'

interface Filters {
  id_lot: string
  type: string
  dateMin: string
  dateMax: string
}

export default function StockMouvementsPage() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [sortConfig, setSortConfig] = useState({ field: 'date_mouvement', direction: 'desc' })
  const [filters, setFilters] = useState<Filters>({
    id_lot: '',
    type: '',
    dateMin: '',
    dateMax: ''
  })

  const tableRows = useMemo(() => rows.map(r => ({ ...r, id: r.id_stock_mouvement })), [rows])

  const fetchData = async (patch: Record<string, unknown> = {}) => {
    const next = { ...filters, ...(patch.filters as Partial<Filters> || {}) }
    const nextPage = (patch.page as number) ?? page
    const nextLimit = (patch.limit as number) ?? limit

    setLoading(true)
    try {
      const { data: res } = await api.get('/stock/mouvements', {
        params: { ...next, page: nextPage, limit: nextLimit }
      })
      setRows(res?.data || [])
      setTotal(res?.total || 0)
      setPage(res?.page || nextPage)
      setLimit(res?.limit || nextLimit)
      setFilters(next)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const applyFilters = () => {
    fetchData({ page: 1, filters })
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Historique des mouvements de stock</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Ledger: stock_mouvement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Lot</label>
          <input
            value={filters.id_lot}
            onChange={(e) => handleFiltersChange({ id_lot: e.target.value })}
            placeholder="ex: 123"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFiltersChange({ type: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          >
            <option value="">Tous</option>
            <option value="entree">Entrée</option>
            <option value="sortie">Sortie</option>
            <option value="reservation">Réservation</option>
            <option value="ajustement">Ajustement</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Date min</label>
          <input
            type="date"
            value={filters.dateMin}
            onChange={(e) => handleFiltersChange({ dateMin: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Date max</label>
          <input
            type="date"
            value={filters.dateMax}
            onChange={(e) => handleFiltersChange({ dateMax: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={applyFilters}
          className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors"
        >
          Filtrer
        </button>
      </div>

      <ResponsiveDataTable
        columns={[
          { field: 'id_stock_mouvement', headerName: 'ID', width: '90px', minWidth: '70px', filterable: false, sortable: true },
          { field: 'id_lot', headerName: 'Lot', width: '90px', minWidth: '70px', filterable: false, sortable: true },
          {
            field: 'type',
            headerName: 'Type',
            width: '120px',
            minWidth: '100px',
            filterable: false,
            sortable: true,
            renderCell: (row: any) => (
              <span className="text-xs font-semibold text-slate-900 dark:text-white">{String(row.type || '').toUpperCase()}</span>
            )
          },
          {
            field: 'quantite',
            headerName: 'Qté',
            width: '120px',
            minWidth: '100px',
            filterable: false,
            sortable: true,
            renderCell: (row: any) => Number(row.quantite || 0).toLocaleString('fr-FR')
          },
          {
            field: 'before_after',
            headerName: 'Avant/Après',
            width: '160px',
            minWidth: '140px',
            filterable: false,
            sortable: false,
            renderCell: (row: any) => `${row.before_qty ?? '-'} → ${row.after_qty ?? '-'}`
          },
          {
            field: 'source',
            headerName: 'Source',
            width: '200px',
            minWidth: '160px',
            filterable: false,
            sortable: false,
            renderCell: (row: any) => `${row.source_type || '-'}${row.source_id != null ? ` #${row.source_id}` : ''}`
          },
          {
            field: 'date_mouvement',
            headerName: 'Date',
            width: '190px',
            minWidth: '160px',
            filterable: false,
            sortable: true,
            renderCell: (row: any) => (row.date_mouvement ? new Date(row.date_mouvement).toLocaleString('fr-FR') : '-')
          }
        ]}
        data={tableRows}
        loading={loading}
        pagination={{
          page,
          perPage: limit,
          total
        }}
        onPageChange={(p: number) => fetchData({ page: p })}
        onPageSizeChange={(perPage: number) => fetchData({ page: 1, limit: perPage })}
        onSort={(nextSort: any) => setSortConfig(nextSort)}
        sortConfig={sortConfig}
        onFiltersChange={() => {}}
        onRowClick={() => {}}
      />
    </div>
  )
}
