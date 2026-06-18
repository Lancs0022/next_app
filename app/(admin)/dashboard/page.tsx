'use client'

import { useState } from 'react'

interface StatCard {
  ventesJour: { value: string; change: string }
  stockCritique: { value: string; change: string }
  abonnementsActifs: { value: string; change: string }
  connectivite: { value: string; status: string }
}

interface Vente {
  id: string
  produit: string
  quantite: number
  montant: string
  date: string
}

const STAT_CONFIG = [
  { key: 'ventesJour', label: 'Ventes du jour', accent: 'border-l-primary', badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
  { key: 'stockCritique', label: 'Stock critique', accent: 'border-l-amber-500', badge: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' },
  { key: 'abonnementsActifs', label: 'Abonnements actifs', accent: 'border-l-emerald-500', badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
  { key: 'connectivite', label: 'Connectivité', accent: 'border-l-accent', badge: null },
] as const

export default function DashboardPage() {
  const [stats] = useState<StatCard>({
    ventesJour: { value: '12 450 Ar', change: '+12%' },
    stockCritique: { value: '8 produits', change: '-3' },
    abonnementsActifs: { value: '24', change: '+2' },
    connectivite: { value: 'En ligne', status: 'online' }
  })

  const ventesData: Vente[] = [
    { id: 'V001', produit: 'Panier artisanal', quantite: 2, montant: '5 000 Ar', date: '24/01/2026 14:30' },
    { id: 'V002', produit: 'Épices locales', quantite: 1, montant: '2 500 Ar', date: '24/01/2026 13:15' },
    { id: 'V003', produit: 'Panier artisanal', quantite: 3, montant: '7 500 Ar', date: '24/01/2026 11:45' }
  ]

  return (
    <>
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {/* Ventes du jour */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">Ventes du jour</h3>
            <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
              {stats.ventesJour.change}
            </span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-navy-dark dark:text-white">{stats.ventesJour.value}</p>
        </div>

        {/* Stock critique */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">Stock critique</h3>
            <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
              {stats.stockCritique.change}
            </span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-navy-dark dark:text-white">{stats.stockCritique.value}</p>
        </div>

        {/* Abonnements actifs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">Abonnements actifs</h3>
            <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
              {stats.abonnementsActifs.change}
            </span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-navy-dark dark:text-white">{stats.abonnementsActifs.value}</p>
        </div>

        {/* Connectivité */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">Connectivité</h3>
            <span className={`w-3 h-3 rounded-full ${stats.connectivite.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-navy-dark dark:text-white">{stats.connectivite.value}</p>
        </div>
      </div>

      {/* Tableau MOC */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-navy-dark dark:text-white">Dernières ventes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {ventesData.map((vente, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-navy-dark dark:text-white">
                    {vente.id}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">
                    {vente.produit}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">
                    {vente.quantite}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-semibold text-navy-dark dark:text-white">
                    {vente.montant}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                    {vente.date}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button className="text-slate-400 hover:text-navy-dark dark:hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
