'use client'

import { useEffect, useState } from 'react'
import api from '@/services/api'
import Box from '@/components/Box/Box'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import TabBox from '@/components/TabBox/TabBox'
import Modal from '@/components/Modal/Modal'
import { useToast } from '@/components/Toast/ToastContainer'
import type { FilterState } from '@/components/ResponsiveDataTable/ColumnFilterDropdown'

export default function CollaborateursPage() {
  const { showToast } = useToast()

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 })
  const [sortConfig, setSortConfig] = useState({ field: 'nom', direction: 'asc' })
  const [filters, setFilters] = useState<Record<string, string>>({})

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ nom: '', telephone: '', email: '', adresse: '' })
  const [createLoading, setCreateLoading] = useState(false)

  const fetchCollaborateurs = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/collaborateurs')
      const rows = res?.data || []
      setData(rows)
      setPagination(prev => ({ ...prev, total: rows.length }))
    } catch (e: any) {
      showToast(e?.response?.data?.error || e?.message || 'Erreur chargement collaborateurs', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollaborateurs()
  }, [])

  const columns = [
    { field: 'nom', headerName: 'Nom', sortable: true, filterable: true, width: '150px', minWidth: '120px' },
    { field: 'telephone', headerName: 'Téléphone', sortable: true, filterable: true, width: '160px', minWidth: '140px' },
    { field: 'email', headerName: 'Email', sortable: true, filterable: true, width: '260px', minWidth: '220px' },
    {
      field: 'adresse',
      headerName: 'Adresse',
      sortable: false,
      filterable: true,
      width: '260px',
      minWidth: '200px',
      renderCell: (row: any) => (
        <span className="text-slate-700 dark:text-slate-200 truncate block max-w-[240px]" title={row.adresse || ''}>
          {row.adresse || '-'}
        </span>
      )
    },
    {
      field: 'statut',
      headerName: 'Statut',
      sortable: true,
      filterable: true,
      width: '100px',
      minWidth: '80px',
      renderCell: (row: any) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          row.statut === 'actif'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400'
        }`}>
          {row.statut || 'actif'}
        </span>
      )
    },
    {
      field: 'date_adhesion',
      headerName: "Date d'adhésion",
      sortable: true,
      filterable: true,
      width: '140px',
      minWidth: '120px'
    }
  ]

  const handleSort = ({ field, direction }: { field: string; direction: string }) => {
    setSortConfig({ field, direction })
  }

  const handleFiltersChange = (_newFilters: Record<string, FilterState>) => {
    // Collaborateurs are filtered client-side; column filters not yet wired to API params
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handlePageSizeChange = (perPage: number) => {
    setPagination(prev => ({ ...prev, perPage, page: 1 }))
  }

  const stats = [
    { label: 'Total', value: data.length, color: 'bg-primary' },
    { label: 'Actifs', value: data.filter(d => d.statut === 'actif').length, color: 'bg-green-500' },
    { label: 'Inactifs', value: data.filter(d => d.statut === 'inactif').length, color: 'bg-slate-500' },
    { label: 'Emails', value: data.filter(d => d.email).length, color: 'bg-purple-500' },
  ]

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.nom.trim()) {
      showToast('Le nom est requis', 'error')
      return
    }

    setCreateLoading(true)
    try {
      await api.post('/collaborateurs', {
        nom: createForm.nom.trim(),
        telephone: createForm.telephone.trim() || null,
        email: createForm.email.trim() || null,
        adresse: createForm.adresse.trim() || null
      })
      showToast('Collaborateur créé', 'success')
      setCreateOpen(false)
      setCreateForm({ nom: '', telephone: '', email: '', adresse: '' })
      await fetchCollaborateurs()
    } catch (e2: any) {
      showToast(e2?.response?.data?.error || e2?.message || 'Erreur création collaborateur', 'error')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {stats.map((stat, index) => (
          <Box key={index} padding="p-3 md:p-4" hover>
            <div className="flex items-center">
              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${stat.color} mr-2 md:mr-3`}></div>
              <div className="min-w-0 flex-1">
                <p className="text-lg md:text-2xl font-bold text-navy-dark dark:text-white truncate">{stat.value}</p>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">{stat.label}</p>
              </div>
            </div>
          </Box>
        ))}
      </div>

      <TabBox
        tabs={[
          {
            id: 'list',
            label: 'Liste des collaborateurs',
            content: (
              <div className="-mx-4 md:mx-0">
                <ResponsiveDataTable
                  columns={columns}
                  data={data}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  onSort={handleSort}
                  sortConfig={sortConfig}
                  onFiltersChange={handleFiltersChange}
                />
              </div>
            )
          },
          {
            id: 'activity',
            label: 'Activité',
            badge: 'Bientôt',
            content: (
              <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>Activité des collaborateurs</p>
                <p className="text-sm mt-2">Cette fonctionnalité sera bientôt disponible</p>
              </div>
            )
          },
          {
            id: 'permissions',
            label: 'Permissions',
            badge: 'Bientôt',
            content: (
              <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p>Gestion des permissions</p>
                <p className="text-sm mt-2">Cette fonctionnalité sera bientôt disponible</p>
              </div>
            )
          }
        ]}
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Ajouter un collaborateur
            </button>
          </div>
        }
      />

      <Modal
        open={createOpen}
        title="Ajouter un collaborateur"
        onClose={() => !createLoading && setCreateOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={createLoading}
              className="px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="create-collaborateur-form"
              disabled={createLoading}
              className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {createLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="create-collaborateur-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nom</label>
            <input
              value={createForm.nom}
              onChange={(e) => setCreateForm(prev => ({ ...prev, nom: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Ex: Rakoto Market"
              disabled={createLoading}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Téléphone</label>
              <input
                value={createForm.telephone}
                onChange={(e) => setCreateForm(prev => ({ ...prev, telephone: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Ex: +261 34 00 000 00"
                disabled={createLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Ex: contact@collab.com"
                disabled={createLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Adresse</label>
            <textarea
              value={createForm.adresse}
              onChange={(e) => setCreateForm(prev => ({ ...prev, adresse: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Adresse du collaborateur"
              disabled={createLoading}
            />
          </div>
        </form>
      </Modal>
    </>
  )
}
