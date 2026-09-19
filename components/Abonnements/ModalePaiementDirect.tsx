import React, { useState, useEffect } from 'react'
import Modal from '@/components/Modal/Modal'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import { EcheanceItem } from './abonnementsTypes'
import { formatMontant, formatDate, EchBadge } from './abonnementsUtils'
import { Info, CreditCard } from 'lucide-react'

interface ModalePaiementDirectProps {
  echeance: EcheanceItem | null
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export default function ModalePaiementDirect({
  echeance,
  open,
  onClose,
  onSuccess,
}: ModalePaiementDirectProps) {
  const { showToast } = useToast()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [montant, setMontant] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && echeance) {
      setDate(new Date().toISOString().split('T')[0])
      setMontant(String(Math.max(0, echeance.reste || echeance.montant)))
    }
  }, [open, echeance])

  if (!echeance) return null

  const montantNum = parseFloat(montant) || 0
  const resteMax = echeance.reste > 0 ? echeance.reste : echeance.montant
  const payeActuel = echeance.montant_paye ?? (echeance.montant - (echeance.reste ?? 0))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!montantNum || montantNum <= 0) {
      showToast('Le montant doit être supérieur à 0 Ar', 'error')
      return
    }
    if (montantNum > resteMax) {
      showToast(
        `Le montant ne peut pas dépasser le reste à payer (${formatMontant(resteMax)})`,
        'error'
      )
      return
    }

    setLoading(true)
    try {
      await api.post('/paiements-abonnements', {
        lignes: [
          {
            id_echeance_abonnement: echeance.id_echeance_abonnement,
            montant: montantNum,
          },
        ],
        date_paiement: date || undefined,
      })
      showToast(`Paiement de ${formatMontant(montantNum)} enregistré avec succès`, 'success')
      onClose()
      await onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur paiement', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Enregistrer un paiement"
      size="default"
      zIndex={60}
      onClose={() => !loading && onClose()}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="form-paiement-direct"
            disabled={loading || montantNum <= 0 || montantNum > resteMax}
            className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            {loading ? 'Enregistrement...' : 'Valider le paiement'}
          </button>
        </div>
      }
    >
      <form id="form-paiement-direct" onSubmit={handleSubmit} className="space-y-4">
        {/* Résumé de l'échéance sélectionnée */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Échéance ciblée
            </span>
            <EchBadge statut={echeance.statut} />
          </div>

          <div className="text-sm font-medium text-slate-900 dark:text-white">
            Période : {formatDate(echeance.periode_debut)} → {formatDate(echeance.periode_fin)}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Total prévu</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatMontant(echeance.montant)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Déjà réglé</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatMontant(payeActuel)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Reste à payer</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {formatMontant(resteMax)}
              </span>
            </div>
          </div>
        </div>

        {/* Date du paiement */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Date du règlement <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={loading}
            required
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          />
        </div>

        {/* Montant à payer */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Montant versé (Ar) <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setMontant(String(resteMax))}
              className="text-xs text-primary hover:underline font-medium"
            >
              Régler la totalité ({formatMontant(resteMax)})
            </button>
          </div>
          <input
            type="number"
            min="1"
            max={resteMax}
            step="1"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder={`Ex: ${resteMax}`}
            disabled={loading}
            required
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 font-semibold"
          />
        </div>

        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Ce règlement est ciblé exclusivement sur cette échéance. Si le montant est inférieur au
            reste dû, l'échéance passera en statut partiel.
          </p>
        </div>
      </form>
    </Modal>
  )
}
