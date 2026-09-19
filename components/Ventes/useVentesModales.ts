import { useCallback, useState } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import type { LigneVente } from '@/components/Ventes/VenteAnnulationModal'
import type { AnyRecord, ModeAffichage, ProduitModalState } from './ventesTypes'

export function useVentesModales() {
  const { showToast } = useToast()

  // ─── Tiroir de détail ─────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<AnyRecord | null>(null)
  const [selectedRow, setSelectedRow] = useState<AnyRecord | null>(null)

  const openDetail = useCallback(
    async (row: AnyRecord, mode: ModeAffichage) => {
      setSelectedRow(row)
      setDetailOpen(true)
      if (mode === 'aggrege') {
        setDetailLoading(true)
        try {
          const { data: res } = await api.get(`/ventes/${row.id_vente}`)
          setDetailData(res.data || res || null)
        } catch (e: unknown) {
          const err = e as { response?: { data?: { error?: string } }; message?: string }
          showToast(
            err?.response?.data?.error ||
              err?.message ||
              'Erreur chargement du détail de la vente',
            'info'
          )
          setDetailOpen(false)
        } finally {
          setDetailLoading(false)
        }
      } else {
        setDetailData(row)
      }
    },
    [showToast]
  )

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    setSelectedRow(null)
    setDetailData(null)
  }, [])

  // ─── Modale d'annulation ──────────────────────────────────────────────────
  const [annulationOpen, setAnnulationOpen] = useState(false)
  const [annulationLignes, setAnnulationLignes] = useState<LigneVente[]>([])
  const [annulationDefaultAll, setAnnulationDefaultAll] = useState(false)
  const [annulationLocked, setAnnulationLocked] = useState(false)
  const [annulationVenteId, setAnnulationVenteId] = useState<number | undefined>()

  const openAnnulationVente = useCallback(
    async (venteId: number, opts: { defaultAll: boolean; lock: boolean }) => {
      try {
        const { data: res } = await api.get(`/ventes/${venteId}`)
        const detail = res.data || res
        const lignesRaw: LigneVente[] = (detail.lignes ?? [])
          .map((l: AnyRecord) => {
            const qVendue = Number(l.quantite_vendue)
            const qRetournee = Number(l.quantite_retournee ?? 0)
            const qAnnulable = qVendue - qRetournee
            return {
              id_ligne: l.id,
              id_vente: venteId,
              date_vente: detail.date_vente,
              statut_vente: detail.statut,
              point_vente_nom: detail.point_vente_nom ?? '',
              libelle_produit: l.libelle_produit ?? `Lot #${l.id_lot}`,
              collaborateur_nom: l.collaborateur_nom ?? '-',
              quantite_vendue: qVendue,
              quantite_retournee: qRetournee,
              quantite_annulable: qAnnulable,
              prix_initial: Number(
                l.prix_initial ?? (l.montant_ht / Math.max(1, qVendue))
              ),
              marge: 0,
              montant_ht: Number(l.montant_ht ?? 0),
              raison_suppression: l.raison_suppression ?? null,
              unite_code: l.unite_code ?? null,
              est_decimal: l.est_decimal ?? false,
              precision: l.precision ?? 0,
            }
          })
          .filter((l: LigneVente) => l.quantite_annulable > 0)

        if (lignesRaw.length === 0) {
          showToast('Toutes les lignes de cette vente ont déjà été annulées', 'info')
          return
        }
        setAnnulationVenteId(venteId)
        setAnnulationLignes(lignesRaw)
        setAnnulationDefaultAll(opts.defaultAll)
        setAnnulationLocked(opts.lock)
        setAnnulationOpen(true)
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(
          err?.response?.data?.error || err?.message || 'Erreur chargement de la vente',
          'info'
        )
      }
    },
    [showToast]
  )

  const openAnnulationLigne = useCallback(
    (row: AnyRecord) => {
      const ligneUnique: LigneVente = {
        id_ligne: row.id_vente_article,
        id_vente: row.id_vente,
        date_vente: row.date_vente,
        statut_vente: row.statut,
        point_vente_nom: row.point_vente_nom ?? `PV #${row.id_point_vente}`,
        libelle_produit: row.libelle_produit ?? `Lot #${row.id_lot}`,
        collaborateur_nom: row.collaborateur_nom ?? '-',
        quantite_vendue: Number(row.quantite_vendue),
        quantite_retournee: Number(row.quantite_retournee ?? 0),
        quantite_annulable:
          Number(row.quantite_vendue) - Number(row.quantite_retournee ?? 0),
        prix_initial: Number(
          row.prix_initial ?? (row.montant_ht / Math.max(1, row.quantite_vendue))
        ),
        marge: 0,
        montant_ht: Number(row.montant_ht ?? 0),
        unite_code: row.unite_code ?? null,
        est_decimal: row.est_decimal ?? false,
        precision: row.precision ?? 0,
      }
      if (ligneUnique.quantite_annulable <= 0) {
        showToast('Cette ligne a déjà été entièrement annulée', 'info')
        return
      }
      setAnnulationVenteId(row.id_vente)
      setAnnulationLignes([ligneUnique])
      setAnnulationDefaultAll(true)
      setAnnulationLocked(true)
      setAnnulationOpen(true)
    },
    [showToast]
  )

  const closeAnnulation = useCallback(() => {
    setAnnulationOpen(false)
    setAnnulationLignes([])
  }, [])

  // ─── Mini-modal Produit ───────────────────────────────────────────────────
  const [produitModal, setProduitModal] = useState<ProduitModalState>({ open: false })

  const openProduitModal = useCallback((idLot?: number, libelle?: string) => {
    setProduitModal({ open: true, idLot, libelle })
  }, [])

  const closeProduitModal = useCallback(() => {
    setProduitModal({ open: false })
  }, [])

  return {
    detailOpen,
    detailLoading,
    detailData,
    selectedRow,
    openDetail,
    closeDetail,

    annulationOpen,
    annulationLignes,
    annulationDefaultAll,
    annulationLocked,
    annulationVenteId,
    openAnnulationVente,
    openAnnulationLigne,
    closeAnnulation,

    produitModal,
    openProduitModal,
    closeProduitModal,
  }
}
