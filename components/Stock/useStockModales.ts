import { useCallback, useState } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import type { ActionMenuId } from '@/components/Stock/ActionMenu'
import type { LotActif, ProduitCatalogue } from '@/components/Stock/types'
import type { AnyRecord, DetailType } from './stockTypes'

export function useStockModales() {
  const { showToast } = useToast()

  // ─── Tiroir de détail unifié ──────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailType, setDetailType] = useState<DetailType>(null)
  const [detailData, setDetailData] = useState<AnyRecord | null>(null)

  const openDetail = useCallback((type: DetailType, row: AnyRecord) => {
    setDetailType(type)
    setDetailData(row)
    setDetailOpen(true)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    setDetailType(null)
    setDetailData(null)
  }, [])

  const openMouvements = useCallback(async (lot: AnyRecord) => {
    if (!lot?.id_lot) return
    setDetailType('mouvements')
    setDetailData({ lot, loading: true, mouvements: [] })
    setDetailOpen(true)
    try {
      const { data: res } = await api.get('/stock/mouvements', {
        params: { id_lot: lot.id_lot, limit: 200 },
      })
      setDetailData({ lot, loading: false, mouvements: res.data || [] })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setDetailData({
        lot,
        loading: false,
        mouvements: [],
        error: err?.response?.data?.error || err?.message || 'Erreur chargement mouvements',
      })
    }
  }, [])

  // ─── Modal Seuil d'alerte ─────────────────────────────────────────────────
  const [editSeuilOpen, setEditSeuilOpen] = useState(false)
  const [editSeuilLoading, setEditSeuilLoading] = useState(false)
  const [editSeuilProduit, setEditSeuilProduit] = useState<AnyRecord | null>(null)
  const [editSeuilValue, setEditSeuilValue] = useState('')

  const openEditSeuil = useCallback((produit: AnyRecord) => {
    setEditSeuilProduit(produit)
    setEditSeuilValue(produit?.seuil_alerte != null ? String(produit.seuil_alerte) : '')
    setEditSeuilOpen(true)
  }, [])

  const closeEditSeuil = useCallback(() => {
    if (!editSeuilLoading) {
      setEditSeuilOpen(false)
      setEditSeuilProduit(null)
      setEditSeuilValue('')
    }
  }, [editSeuilLoading])

  const handleSaveSeuil = useCallback(
    async (onSuccess?: () => Promise<void> | void) => {
      if (!editSeuilProduit?.id) return
      setEditSeuilLoading(true)
      try {
        await api.patch(`/produits/${editSeuilProduit.id}`, {
          seuil_alerte: editSeuilValue === '' ? null : Number(editSeuilValue),
        })
        showToast('Seuil mis à jour', 'success')
        setEditSeuilOpen(false)
        setEditSeuilProduit(null)
        setEditSeuilValue('')
        if (onSuccess) await onSuccess()
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string }
        showToast(
          err?.response?.data?.error || err?.message || 'Erreur lors de la mise à jour du seuil',
          'error'
        )
      } finally {
        setEditSeuilLoading(false)
      }
    },
    [editSeuilProduit, editSeuilValue, showToast]
  )

  // ─── Modal Ajustement ─────────────────────────────────────────────────────
  const [ajustOpen, setAjustOpen] = useState(false)
  const [ajustLoading, setAjustLoading] = useState(false)
  const [ajustLot, setAjustLot] = useState<AnyRecord | null>(null)

  const openAjustement = useCallback((lot: AnyRecord) => {
    setAjustLot(lot)
    setAjustOpen(true)
  }, [])

  const closeAjustement = useCallback(() => {
    if (!ajustLoading) {
      setAjustOpen(false)
      setAjustLot(null)
    }
  }, [ajustLoading])

  const handleSubmitAjustement = useCallback(
    async (form: AnyRecord, onSuccess?: () => Promise<void> | void) => {
      if (!ajustLot) return
      setAjustLoading(true)
      try {
        await api.post('/stock/ajustements', {
          id_lot: ajustLot.id_lot,
          type: form.type,
          delta: form.delta,
          motif: form.motif || null,
          date_ajustement: form.date_ajustement || null,
        })
        showToast('Ajustement de stock enregistré', 'success')
        setAjustOpen(false)
        setAjustLot(null)
        if (onSuccess) await onSuccess()
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string }
        showToast(
          err?.response?.data?.error || "Erreur lors de l'ajustement de stock",
          'error'
        )
      } finally {
        setAjustLoading(false)
      }
    },
    [ajustLot, showToast]
  )

  // ─── Modal Annulation Vente ───────────────────────────────────────────────
  const [annulationOpen, setAnnulationOpen] = useState(false)
  const [annulationLignes, setAnnulationLignes] = useState<AnyRecord[]>([])

  // ─── Drawer Catalogue & Quick Add ─────────────────────────────────────────
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [catalogueDraft, setCatalogueDraft] = useState<AnyRecord | null>(null)

  const handleCloseCatalogueDrawer = useCallback((draft?: AnyRecord) => {
    setCatalogueOpen(false)
    if (draft) setCatalogueDraft(draft)
  }, [])

  const handleCreateProduitCatalogue = useCallback(
    async (form: AnyRecord, onSuccess?: () => Promise<void> | void) => {
      if (!form.id_collaborateur) {
        showToast('Sélectionne un collaborateur', 'info')
        return
      }
      if (!form.nom?.trim() && !form.libelle?.trim()) {
        showToast('Le nom du produit est requis', 'info')
        return
      }
      setCatalogueLoading(true)
      try {
        await api.post('/produits', {
          id_collaborateur: Number(form.id_collaborateur),
          nom: (form.nom || form.libelle || '').trim(),
          categorie: form.categorie?.trim() || null,
          description: form.description?.trim() || null,
          id_unite: form.id_unite ? Number(form.id_unite) : null,
          seuil_alerte:
            form.seuil_alerte != null && form.seuil_alerte !== ''
              ? Number(form.seuil_alerte)
              : null,
        })
        showToast('Produit ajouté au catalogue', 'success')
        setCatalogueOpen(false)
        if (onSuccess) await onSuccess()
      } catch (e2: unknown) {
        const err = e2 as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error || err?.message || 'Erreur création produit', 'info')
      } finally {
        setCatalogueLoading(false)
      }
    },
    [showToast]
  )

  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [quickAddInitialCollab, setQuickAddInitialCollab] = useState('')

  const handleQuickAddClick = useCallback(() => {
    setQuickAddInitialCollab('')
    setQuickAddOpen(true)
  }, [])

  const handleQuickAddProduit = useCallback(
    async (
      form: AnyRecord,
      onSuccess?: (created: AnyRecord) => void
    ) => {
      if (!form.id_collaborateur) {
        showToast('Sélectionne un collaborateur pour le produit', 'info')
        return
      }
      if (!form.nom.trim()) {
        showToast('Le nom du produit est requis', 'info')
        return
      }
      setQuickAddLoading(true)
      try {
        const payload = {
          id_collaborateur: Number(form.id_collaborateur),
          nom: form.nom.trim(),
          categorie: form.categorie?.trim() || null,
          id_unite: form.id_unite ? Number(form.id_unite) : null,
          seuil_alerte: form.seuil_alerte ? Number(form.seuil_alerte) : null,
          description: null,
        }
        const { data: created } = await api.post('/produits', payload)
        const createdProduit = {
          id_produit: created.id_produit,
          id_collaborateur: created.id_collaborateur,
          nom: created.nom,
          description: created.description,
          categorie: created.categorie,
          unite: created.unite,
          statut: created.statut,
          date_creation: created.date_creation,
          date_update: created.date_update,
        }
        showToast('Produit catalogue créé', 'success')
        setQuickAddOpen(false)
        if (onSuccess) onSuccess(createdProduit)
      } catch {
        showToast('Erreur lors de la création du produit', 'error')
      } finally {
        setQuickAddLoading(false)
      }
    },
    [showToast]
  )

  // ─── Lot Explorer ─────────────────────────────────────────────────────────
  const [catalogueExplorerProduit, setCatalogueExplorerProduit] = useState<ProduitCatalogue | null>(
    null
  )
  const [catalogueExplorerLots, setCatalogueExplorerLots] = useState<LotActif[]>([])
  const [catalogueExplorerLoading, setCatalogueExplorerLoading] = useState(false)

  const openCatalogueExplorer = useCallback(
    async (
      row: AnyRecord,
      toProduitCatalogue: (r: AnyRecord) => ProduitCatalogue,
      toLotActif: (r: AnyRecord, p: ProduitCatalogue) => LotActif
    ) => {
      const produit = toProduitCatalogue(row)
      setCatalogueExplorerProduit(produit)
      setCatalogueExplorerLots([])
      setCatalogueExplorerLoading(true)
      try {
        const { data: res } = await api.get('/stock/lots', {
          params: { id_produit: produit.id_produit, limit: 500, statut: 'tous' },
        })
        const rows = res?.data || []
        setCatalogueExplorerLots(rows.map((lot: AnyRecord) => toLotActif(lot, produit)))
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(
          err?.response?.data?.error ||
            err?.message ||
            'Erreur chargement des lots du produit',
          'info'
        )
        setCatalogueExplorerProduit(null)
      } finally {
        setCatalogueExplorerLoading(false)
      }
    },
    [showToast]
  )

  const closeCatalogueExplorer = useCallback(() => {
    setCatalogueExplorerProduit(null)
    setCatalogueExplorerLots([])
  }, [])

  // ─── Actions sur les lots ─────────────────────────────────────────────────
  const handleCatalogueLotAction = useCallback(
    async (
      actionId: ActionMenuId,
      lot: LotActif,
      context: {
        pointsDeVente: AnyRecord[]
        refreshStockTables: () => Promise<void>
        fetchLots: (args?: { page?: number; limit?: number }) => Promise<void>
        toProduitCatalogue?: (r: AnyRecord) => ProduitCatalogue
        toLotActif?: (r: AnyRecord, p: ProduitCatalogue) => LotActif
      }
    ) => {
      if (actionId === 'annuler') {
        try {
          const { data: res } = await api.get(`/ventes/lot/${lot.id}`)
          const lignes = res.data || []
          if (lignes.length === 0) {
            showToast('Aucune vente enregistrée pour ce lot', 'info')
          } else {
            setAnnulationLignes(lignes)
            setAnnulationOpen(true)
          }
        } catch (e: unknown) {
          const err = e as { response?: { data?: { error?: string } }; message?: string }
          showToast(
            err?.response?.data?.error || err?.message || 'Erreur chargement des ventes',
            'info'
          )
        }
        return
      }

      if (actionId === 'vendre') {
        window.location.href = `/ventes/nouvelle?from_lot=${encodeURIComponent(
          lot.id
        )}&from_pv=${encodeURIComponent(lot.pdvId)}`
        return
      }

      if (actionId === 'ajuster') {
        openAjustement({
          id_lot: lot.id,
          id_point_vente: lot.pdvId,
          libelle_produit: lot.produitNom,
          point_vente_nom: lot.pdvNom,
          quantite_disponible: lot.quantiteActuelle,
          quantite_initiale: lot.quantiteInitiale,
        })
        return
      }

      if (actionId === 'transfert') {
        const destination = window.prompt(
          `ID du point de vente destination pour le lot #${lot.id}\nPV actuel: ${
            lot.pdvNom || lot.pdvId
          }\n\nPV disponibles: ${context.pointsDeVente
            .map((p) => `${p.id_pdv}=${p.nom}`)
            .join(', ')}`
        )
        if (!destination) return
        const quantite = window.prompt(
          `Quantité à transférer (stock actuel: ${lot.quantiteActuelle})`,
          String(lot.quantiteActuelle)
        )
        if (!quantite) return
        const commentaire =
          window.prompt('Commentaire de transfert (optionnel)', '') || null
        try {
          await api.post('/stock/transferts', {
            id_lot: Number(lot.id),
            id_point_vente_source: Number(lot.pdvId),
            id_point_vente_destination: Number(destination),
            quantite,
            commentaire,
          })
          showToast('Transfert de stock enregistré', 'success')
          await Promise.all([context.fetchLots({ page: 1 }), context.refreshStockTables()])
          if (catalogueExplorerProduit && context.toProduitCatalogue && context.toLotActif) {
            await openCatalogueExplorer(
              catalogueExplorerProduit,
              context.toProduitCatalogue,
              context.toLotActif
            )
          }
        } catch (e: unknown) {
          const err = e as { response?: { data?: { error?: string } }; message?: string }
          showToast(
            err?.response?.data?.error || err?.message || 'Erreur transfert de stock',
            'error'
          )
        }
        return
      }

      if (actionId === 'prix') {
        const prixInitial = window.prompt('Nouveau prix initial', String(lot.prixInitial))
        if (prixInitial == null) return
        const marge = window.prompt('Nouvelle marge', String(lot.marge))
        if (marge == null) return
        try {
          await api.patch(`/stock/lots/${lot.id}/prix`, {
            prix_initial: prixInitial,
            marge,
          })
          showToast('Prix et marge du lot mis à jour', 'success')
          await Promise.all([context.fetchLots({ page: 1 }), context.refreshStockTables()])
          if (catalogueExplorerProduit && context.toProduitCatalogue && context.toLotActif) {
            await openCatalogueExplorer(
              catalogueExplorerProduit,
              context.toProduitCatalogue,
              context.toLotActif
            )
          }
        } catch (e: unknown) {
          const err = e as { response?: { data?: { error?: string } }; message?: string }
          showToast(
            err?.response?.data?.error || err?.message || 'Erreur mise à jour prix/marge',
            'error'
          )
        }
      }
    },
    [
      catalogueExplorerProduit,
      openAjustement,
      openCatalogueExplorer,
      showToast,
    ]
  )

  return {
    // Détail drawer
    detailOpen,
    detailType,
    detailData,
    openDetail,
    closeDetail,
    openMouvements,

    // Seuil
    editSeuilOpen,
    editSeuilLoading,
    editSeuilProduit,
    editSeuilValue,
    setEditSeuilValue,
    openEditSeuil,
    closeEditSeuil,
    handleSaveSeuil,

    // Ajustement
    ajustOpen,
    ajustLoading,
    ajustLot,
    openAjustement,
    closeAjustement,
    handleSubmitAjustement,

    // Annulation
    annulationOpen,
    annulationLignes,
    setAnnulationOpen,
    setAnnulationLignes,

    // Catalogue drawer
    catalogueOpen,
    setCatalogueOpen,
    catalogueLoading,
    catalogueDraft,
    handleCloseCatalogueDrawer,
    handleCreateProduitCatalogue,

    // Quick add
    quickAddOpen,
    setQuickAddOpen,
    quickAddLoading,
    quickAddInitialCollab,
    handleQuickAddClick,
    handleQuickAddProduit,

    // Explorer
    catalogueExplorerProduit,
    catalogueExplorerLots,
    catalogueExplorerLoading,
    openCatalogueExplorer,
    closeCatalogueExplorer,

    // Lot action
    handleCatalogueLotAction,
  }
}
