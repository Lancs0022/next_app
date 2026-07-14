'use client'

import { useState } from 'react'
import api from '@/services/api'
import DateRangeFilter from '@/components/DateRangeFilter'

interface DateFilterValue {
  target?: string
  mode?: string
  offset?: string
  day?: string
  week?: string
  month?: string
  year?: string
  start?: string
  end?: string
  dateMin?: string | null
  dateMax?: string | null
}

export default function FinanceTransactionsPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null)
  const [form, setForm] = useState({
    type: 'IN',
    montant: '',
    categorie_nom: 'Vente',
    description: '',
    source_module: 'MANUEL',
    source_id: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setResult(null)

    const montantNum = Number(String(form.montant).replace(',', '.'))
    if (!Number.isFinite(montantNum) || montantNum <= 0) {
      setError("Le montant doit être un nombre > 0")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        type: form.type,
        montant: montantNum,
        categorie_nom: form.categorie_nom,
        description: form.description || null,
        source_module: form.source_module,
        source_id: form.source_id ? Number(form.source_id) : null
      }

      const { data: created } = await api.post('/finance', payload)
      setResult(created)
      setForm(prev => ({ ...prev, montant: '', description: '', source_id: '' }))
    } catch (e: any) {
      const message = e?.response?.data?.error || e?.message || 'Erreur lors de la création'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-dark dark:text-white">Finance - Transactions</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Saisie manuelle des flux IN/OUT. (La liste/filtrage arrive ensuite.)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-navy-dark dark:text-white">Nouvelle transaction</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Montant (Ar)</label>
              <input
                value={form.montant}
                onChange={(e) => setForm(prev => ({ ...prev, montant: e.target.value }))}
                className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                placeholder="Ex: 50000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Catégorie (nom)</label>
            <input
              value={form.categorie_nom}
              onChange={(e) => setForm(prev => ({ ...prev, categorie_nom: e.target.value }))}
              className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              placeholder="Ex: Vente"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Source module</label>
            <select
              value={form.source_module}
              onChange={(e) => setForm(prev => ({ ...prev, source_module: e.target.value }))}
              className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            >
              <option value="MANUEL">MANUEL</option>
              <option value="VENTE">VENTE</option>
              <option value="AJUSTEMENT_STOCK">AJUSTEMENT_STOCK</option>
              <option value="TRANSFERT">TRANSFERT</option>
              <option value="ABONNEMENT">ABONNEMENT</option>
              <option value="AUTRE">AUTRE</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Source id (optionnel)</label>
              <input
                value={form.source_id}
                onChange={(e) => setForm(prev => ({ ...prev, source_id: e.target.value }))}
                className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                placeholder="Ex: 123"
              />
            </div>

            <div>
              <DateRangeFilter
                label="Date (placeholder)"
                value={dateFilter}
                onChange={setDateFilter}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full min-h-[84px] p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              placeholder="Détails..."
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {result && (
            <div className="text-sm text-green-700 dark:text-green-400">
              Transaction créée: #{result.id_transaction_financiere}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full h-[42px] rounded-lg bg-primary hover:bg-primary-strong text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Création...' : 'Créer la transaction'}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-navy-dark dark:text-white">À venir</h2>
          <div className="text-sm text-slate-700 dark:text-slate-200 space-y-2">
            <p>
              La partie liste/filtrage nécessite un endpoint GET côté backend (ex: <code>/finance/transactions</code>).
            </p>
            <p>
              Dès que tu valides, j&apos;ajoute:
            </p>
            <ul className="list-disc pl-5">
              <li>GET /finance/transactions (paginé + filtres date/type/catégorie/source)</li>
              <li>Table UI avec filtres et export</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
