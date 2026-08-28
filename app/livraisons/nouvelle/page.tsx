'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DynamicEntrySession from '@/components/DynamicEntry/DynamicEntrySession'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import type { ProductOption } from '@/lib/dynamicEntry/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export default function NouvelleLivraisonPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [collaborateurs, setCollaborateurs] = useState<AnyRecord[]>([])
  const [pointsVente, setPointsVente] = useState<AnyRecord[]>([])
  const [produitsCatalogue, setProduitsCatalogue] = useState<AnyRecord[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cRes, pvRes, pRes] = await Promise.all([
        api.get('/collaborateurs'),
        api.get('/points-de-vente'),
        api.get('/produits')
      ])
      setCollaborateurs(cRes.data?.data || cRes.data || [])
      setPointsVente(pvRes.data?.data || pvRes.data || [])
      setProduitsCatalogue(pRes.data?.data || pRes.data || [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur chargement des données', 'info')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const productOptions: ProductOption[] = useMemo(() => {
    return produitsCatalogue.map(p => ({
      value: String(p.id_produit),
      label: p.nom || `Produit #${p.id_produit}`,
      id_collaborateur: p.id_collaborateur,
    }))
  }, [produitsCatalogue])

  const collabOptions = useMemo(() => {
    return collaborateurs.map(c => ({
      id_collaborateur: c.id_collaborateur,
      nom: c.nom
    }))
  }, [collaborateurs])

  const pvOptions = useMemo(() => {
    return pointsVente.map(pv => ({
      id_pdv: pv.id_pdv,
      nom: pv.nom
    }))
  }, [pointsVente])

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        Chargement...
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between">
        <button
          onClick={() => router.push('/stock')}
          className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-2"
        >
          ← Retour au stock
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <DynamicEntrySession
          module="livraison"
          title="Saisie Globale des Livraisons"
          collaborateurs={collabOptions}
          pointsVente={pvOptions}
          produitsCatalogue={productOptions}
          onSyncSuccess={() => {
            showToast('Livraison synchronisée', 'success')
            router.push('/stock')
          }}
          onSyncError={(msg) => showToast(msg, 'info')}
        />
      </div>
    </div>
  )
}
