'use client'

import { useEffect, useState, useCallback } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import { logAction } from '@/lib/logger'

interface UniteDeMesure {
  id_unite: number
  code: string
  label: string
  est_decimal: boolean
  precision: number
  actif: boolean
}

const emptyForm = (): Omit<UniteDeMesure, 'id_unite' | 'actif'> => ({
  code: '',
  label: '',
  est_decimal: false,
  precision: 0,
})

export default function UnitesPage() {
  const { showToast } = useToast()
  const [unites, setUnites] = useState<UniteDeMesure[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Modal état
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UniteDeMesure | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<UniteDeMesure | null>(null)

  const loadUnites = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/unites-de-mesure')
      setUnites(data.data || [])
    } catch {
      showToast('Erreur chargement des unités', 'info')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { void loadUnites() }, [loadUnites])

  const openCreate = () => {
    logAction('UnitesDeMesure → Créer une unité')
    setEditing(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (u: UniteDeMesure) => {
    logAction('UnitesDeMesure → Modifier une unité', { code: u.code })
    setEditing(u)
    setForm({ code: u.code, label: u.label, est_decimal: u.est_decimal, precision: u.precision })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing) {
        await api.put(`/unites-de-mesure/${editing.id_unite}`, form)
        showToast('Unité mise à jour', 'success')
      } else {
        await api.post('/unites-de-mesure', form)
        showToast('Unité créée', 'success')
      }
      setModalOpen(false)
      await loadUnites()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showToast(err?.response?.data?.error || 'Erreur', 'info')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await api.delete(`/unites-de-mesure/${deleteTarget.id_unite}`)
      showToast(`Unité "${deleteTarget.code}" désactivée`, 'success')
      setDeleteTarget(null)
      await loadUnites()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showToast(err?.response?.data?.error || 'Erreur suppression', 'info')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark dark:text-white">Unités de mesure</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gérez les unités utilisées dans le catalogue produits
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle unité
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Chargement…</div>
        ) : unites.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">Aucune unité de mesure définie</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Code</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Label</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Décimal</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Précision</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Statut</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {unites.map(u => (
                <tr key={u.id_unite} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!u.actif ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                      {u.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{u.label}</td>
                  <td className="px-4 py-3 text-center">
                    {u.est_decimal
                      ? <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Oui</span>
                      : <span className="text-slate-400 text-xs">Non</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                    {u.est_decimal ? `${u.precision} déc.` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.actif
                      ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">Actif</span>
                      : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500">Inactif</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Modifier"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {u.actif && (
                        <button
                          type="button"
                          onClick={() => { logAction('UnitesDeMesure → Supprimer', { code: u.code }); setDeleteTarget(u) }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Désactiver"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal créer / modifier */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {editing ? `Modifier « ${editing.code} »` : 'Nouvelle unité de mesure'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="KG"
                    required
                    maxLength={6}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    disabled={submitting}
                  />
                  <p className="mt-1 text-xs text-slate-400">Majuscules, max 6 car.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="Kilogramme"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg px-3">
                <input
                  id="est_decimal"
                  type="checkbox"
                  checked={form.est_decimal}
                  onChange={e => setForm(f => ({ ...f, est_decimal: e.target.checked, precision: e.target.checked ? (f.precision || 2) : 0 }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={submitting}
                />
                <label htmlFor="est_decimal" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Autoriser les valeurs décimales
                </label>
              </div>

              {form.est_decimal && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Précision (nombre de décimales)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={form.precision}
                    onChange={e => setForm(f => ({ ...f, precision: Math.max(0, Math.min(6, Number(e.target.value))) }))}
                    className="w-24 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    disabled={submitting}
                  />
                  <p className="mt-1 text-xs text-slate-400">Ex: 3 pour "1.500 KG", 2 pour "1.50 L"</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement…' : editing ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Désactiver l&apos;unité ?</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              L&apos;unité <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{deleteTarget.code}</span> sera désactivée.
              Les produits qui l&apos;utilisent ne seront pas affectés, mais elle ne sera plus disponible pour de nouveaux produits.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
              >
                {submitting ? 'Désactivation…' : 'Désactiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
