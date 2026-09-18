import React, { useState, useEffect } from 'react'
import Modal from '@/components/Modal/Modal'
import TypeaheadSelect from '@/components/TypeaheadSelect'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import { Offre, CollaborateurOption } from './abonnementsTypes'
import { formatMontant, PERIODICITE_LABELS } from './abonnementsUtils'
import { AlertCircle, Info } from 'lucide-react'

interface ModaleSouscriptionProps {
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
  collaborateurs: CollaborateurOption[]
  offres: Offre[]
  preselectedOffre?: Pick<Offre, 'id_abonnement' | 'nom' | 'montant' | 'periodicite'> | null
}

export default function ModaleSouscription({
  open,
  onClose,
  onSuccess,
  collaborateurs,
  offres,
  preselectedOffre,
}: ModaleSouscriptionProps) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    id_collaborateur: '',
    id_abonnement: '',
    montant: '',
    date_debut: new Date().toISOString().split('T')[0],
    renouvellement_auto: true,
  })
  const [loading, setLoading] = useState(false)
  const [offreSelectionnee, setOffreSelectionnee] = useState<Pick<
    Offre,
    'id_abonnement' | 'nom' | 'montant' | 'periodicite'
  > | null>(null)

  useEffect(() => {
    if (open) {
      if (preselectedOffre) {
        setForm({
          id_collaborateur: '',
          id_abonnement: String(preselectedOffre.id_abonnement),
          montant: String(preselectedOffre.montant),
          date_debut: new Date().toISOString().split('T')[0],
          renouvellement_auto: true,
        })
        setOffreSelectionnee(preselectedOffre)
      } else {
        setForm({
          id_collaborateur: '',
          id_abonnement: '',
          montant: '',
          date_debut: new Date().toISOString().split('T')[0],
          renouvellement_auto: true,
        })
        setOffreSelectionnee(null)
      }
    }
  }, [open, preselectedOffre])

  const optionsCollabs = collaborateurs.map((c) => ({
    value: String(c.id_collaborateur),
    label: `${c.nom}${c.prenom ? ` ${c.prenom}` : ''}`,
  }))

  const optionsOffresActives = offres
    .filter((o) => o.statut === 'ACTIVE')
    .map((o) => ({
      value: String(o.id_abonnement),
      label: `${o.nom} — ${formatMontant(o.montant)} / ${
        PERIODICITE_LABELS[o.periodicite] ?? o.periodicite
      }`,
    }))

  const handleOffreChange = (val: string) => {
    setForm((p) => ({ ...p, id_abonnement: val }))
    const offre = offres.find((o) => String(o.id_abonnement) === val) ?? null
    setOffreSelectionnee(offre)
    if (offre && !form.montant) {
      setForm((p) => ({ ...p, montant: String(offre.montant) }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montant = parseFloat(form.montant)
    if (!form.id_collaborateur) {
      showToast('Sélectionnez un collaborateur', 'error')
      return
    }
    if (!form.id_abonnement) {
      showToast('Sélectionnez une offre', 'error')
      return
    }
    if (!montant || montant <= 0) {
      showToast('Le tarif applicable doit être > 0', 'error')
      return
    }
    if (!form.date_debut) {
      showToast('La date de début est requise', 'error')
      return
    }

    setLoading(true)
    try {
      await api.post('/souscriptions-abonnements', {
        id_collaborateur: Number(form.id_collaborateur),
        id_abonnement: Number(form.id_abonnement),
        montant,
        date_debut: form.date_debut,
        renouvellement_auto: form.renouvellement_auto,
      })
      showToast('Souscription créée', 'success')
      onClose()
      await onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur création souscription', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Nouvelle souscription"
      size="large"
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
            form="form-create-souscription"
            disabled={loading}
            className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Souscrire'}
          </button>
        </div>
      }
    >
      <form id="form-create-souscription" onSubmit={handleSubmit} className="space-y-5">
        {/* Collaborateur */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Collaborateur <span className="text-red-500">*</span>
          </label>
          <TypeaheadSelect
            options={optionsCollabs}
            value={form.id_collaborateur}
            onChange={(val) => setForm((p) => ({ ...p, id_collaborateur: val }))}
            placeholder="Rechercher un collaborateur…"
            disabled={loading}
          />
        </div>

        {/* Offre */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Offre <span className="text-red-500">*</span>
          </label>
          <TypeaheadSelect
            options={optionsOffresActives}
            value={form.id_abonnement}
            onChange={handleOffreChange}
            placeholder="Rechercher une offre active…"
            disabled={loading}
          />
          {optionsOffresActives.length === 0 && (
            <p className="mt-1 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Aucune offre active. Créez ou réactivez une offre d'abord.
            </p>
          )}
        </div>

        {/* Tarif applicable */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Tarif applicable (Ar) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.montant}
            onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))}
            placeholder="Ex: 8000"
            disabled={loading}
            required
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          />
          {offreSelectionnee &&
            form.montant &&
            parseFloat(form.montant) !== offreSelectionnee.montant && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Tarif catalogue : {formatMontant(offreSelectionnee.montant)}. Ce collaborateur bénéficie
                d'un tarif personnalisé.
              </p>
            )}
          {offreSelectionnee &&
            form.montant &&
            parseFloat(form.montant) === offreSelectionnee.montant && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Correspond au prix catalogue. Modifiez si un tarif personnalisé s'applique.
              </p>
            )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Date de début */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Date de début <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date_debut}
              onChange={(e) => setForm((p) => ({ ...p, date_debut: e.target.value }))}
              disabled={loading}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
            />
          </div>

          {/* Renouvellement auto */}
          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.renouvellement_auto}
                onChange={(e) => setForm((p) => ({ ...p, renouvellement_auto: e.target.checked }))}
                disabled={loading}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Renouvellement automatique
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Génère automatiquement les prochaines échéances
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Rappel règle métier */}
        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Le tarif applicable à ce collaborateur est indépendant du prix catalogue. Les futures
            modifications du catalogue n'affecteront pas cette souscription.
          </p>
        </div>
      </form>
    </Modal>
  )
}
