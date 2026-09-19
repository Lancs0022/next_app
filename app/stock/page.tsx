'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'
import TabBox from '@/components/TabBox/TabBox'
import Drawer from '@/components/Drawer/Drawer'
import { useToast } from '@/components/Toast/ToastContainer'
import type { LigneVente } from '@/components/Ventes/VenteAnnulationModal'
import type { AnyRecord } from '@/components/Stock/stockTypes'
import { toProduitCatalogue, toLotActif } from '@/components/Stock/stockUtils'
import { useStockData } from '@/components/Stock/useStockData'
import { useStockModales } from '@/components/Stock/useStockModales'
import TabLotsDisponibles from '@/components/Stock/TabLotsDisponibles'
import TabCatalogueStock from '@/components/Stock/TabCatalogueStock'
import TabLivraisons from '@/components/Stock/TabLivraisons'
import DrawerStockDetail from '@/components/Stock/DrawerStockDetail'
import ModalEditSeuil from '@/components/Stock/ModalEditSeuil'

// Dynamic imports pour modales lourdes
const AddCatalogueDrawer = dynamic(() => import('@/components/Stock/AddCatalogueDrawer'), {
  ssr: false,
})
const QuickAddProduitModal = dynamic(() => import('@/components/Stock/QuickAddProduitModal'), {
  ssr: false,
})
const StockAdjustModal = dynamic(() => import('@/components/Stock/StockAdjustModal'), {
  ssr: false,
})
const VenteAnnulationModal = dynamic(() => import('@/components/Ventes/VenteAnnulationModal'), {
  ssr: false,
})
const LotExplorer = dynamic(
  () => import('@/components/Stock/LotExplorer').then((m) => m.LotExplorer),
  { ssr: false }
)

export default function StockPage() {
  const { showToast } = useToast()

  // ─── Custom Hooks ──────────────────────────────────────────────────────────
  const stockData = useStockData()
  const modales = useStockModales()

  const toProd = useCallback(
    (row: AnyRecord) => toProduitCatalogue(row, stockData.produitsCatalogue),
    [stockData.produitsCatalogue]
  )

  return (
    <>
      <TabBox
        tabs={[
          {
            id: 'lots-disponibles',
            label: 'Lots disponibles',
            content: (
              <TabLotsDisponibles
                lotsDisponibles={stockData.lotsDisponibles}
                lotsLoading={stockData.lotsLoading}
                lotsPage={stockData.lotsPage}
                lotsLimit={stockData.lotsLimit}
                lotsTotal={stockData.lotsTotal}
                lotsSortConfig={stockData.lotsSortConfig}
                lotsFilters={stockData.lotsFilters}
                showLotsAdvancedFilters={stockData.showLotsAdvancedFilters}
                pointsDeVente={stockData.pointsDeVente}
                collaborateurs={stockData.collaborateurs}
                onSetLotsFilters={stockData.setLotsFilters}
                onSetShowLotsAdvancedFilters={stockData.setShowLotsAdvancedFilters}
                onSetLotsSortConfig={stockData.setLotsSortConfig}
                onFetchLots={stockData.fetchLots}
                onOpenDetail={modales.openDetail}
                onOpenMouvements={modales.openMouvements}
                onOpenAjustement={modales.openAjustement}
                onCatalogueLotAction={(actionId, lot) =>
                  modales.handleCatalogueLotAction(actionId, lot, {
                    pointsDeVente: stockData.pointsDeVente,
                    refreshStockTables: stockData.refreshStockTables,
                    fetchLots: stockData.fetchLots,
                    toProduitCatalogue: toProd,
                    toLotActif,
                  })
                }
                toProduitCatalogue={toProd}
                toLotActif={toLotActif}
                showToast={showToast}
              />
            ),
          },
          {
            id: 'livraisons',
            label: 'Livraisons',
            content: (
              <TabLivraisons
                livraisonsState={stockData.livraisonsState}
                livraisonsSortConfig={stockData.livraisonsSortConfig}
                onSetLivraisonsSortConfig={stockData.setLivraisonsSortConfig}
                onFetchLivraisonsList={stockData.fetchLivraisonsList}
                onOpenDetail={modales.openDetail}
              />
            ),
          },
          {
            id: 'catalogue',
            label: 'Catalogue',
            content: (
              <TabCatalogueStock
                catalogueRows={stockData.catalogueRows}
                catalogueStockLoading={stockData.catalogueStockLoading}
                catalogueFilterCollab={stockData.catalogueFilterCollab}
                catalogueSearch={stockData.catalogueSearch}
                showCatalogueFilters={stockData.showCatalogueFilters}
                collaborateurs={stockData.collaborateurs}
                onSetCatalogueFilterCollab={stockData.setCatalogueFilterCollab}
                onSetCatalogueSearch={stockData.setCatalogueSearch}
                onSetShowCatalogueFilters={stockData.setShowCatalogueFilters}
                onOpenCatalogueDrawer={() => modales.setCatalogueOpen(true)}
                onOpenCatalogueExplorer={(row) =>
                  modales.openCatalogueExplorer(row, toProd, toLotActif)
                }
                onOpenDetail={modales.openDetail}
                onOpenEditSeuil={modales.openEditSeuil}
              />
            ),
          },
        ]}
      />

      {/* ── Modales et Tiroirs ──────────────────────────────────────────────── */}
      <AddCatalogueDrawer
        open={modales.catalogueOpen}
        onClose={modales.handleCloseCatalogueDrawer}
        collaborateurs={
          stockData.collaborateurs as { id_collaborateur: string | number; nom: string }[]
        }
        pointsVente={stockData.pointsDeVente as { id_pdv: string | number; nom: string }[]}
        categories={stockData.produitCategories}
        unites={
          stockData.unitesDeMesure as { id_unite: number; code: string; label: string }[]
        }
        onSubmit={(form) =>
          modales.handleCreateProduitCatalogue(form, async () => {
            await Promise.all([stockData.refreshLists(), stockData.refreshStockTables()])
          })
        }
        loading={modales.catalogueLoading}
        draft={modales.catalogueDraft as never}
      />

      <QuickAddProduitModal
        open={modales.quickAddOpen}
        onClose={() => modales.setQuickAddOpen(false)}
        collaborateurs={
          stockData.collaborateurs as { id_collaborateur: string | number; nom: string }[]
        }
        categories={stockData.produitCategories}
        unites={
          stockData.unitesDeMesure as { id_unite: number; code: string; label: string }[]
        }
        onSubmit={(form) =>
          modales.handleQuickAddProduit(form, (created) => {
            stockData.setProduitsCatalogue((prev) => [created, ...prev])
          })
        }
        loading={modales.quickAddLoading}
        initialCollab={modales.quickAddInitialCollab}
      />

      <StockAdjustModal
        open={modales.ajustOpen && !!modales.ajustLot}
        onClose={modales.closeAjustement}
        lot={modales.ajustLot as never}
        onSubmit={(form) =>
          modales.handleSubmitAjustement(form, () => stockData.fetchLots({ page: 1 }))
        }
        loading={modales.ajustLoading}
      />

      {modales.annulationOpen && (
        <VenteAnnulationModal
          open={modales.annulationOpen}
          onClose={() => {
            modales.setAnnulationOpen(false)
            modales.setAnnulationLignes([])
          }}
          lignes={modales.annulationLignes as LigneVente[]}
          defaultCheckAll={false}
          onSuccess={() => {
            showToast('Annulation enregistrée', 'success')
            stockData.fetchLots({ page: 1 })
            stockData.refreshStockTables()
            if (modales.catalogueExplorerProduit) {
              modales.openCatalogueExplorer(modales.catalogueExplorerProduit, toProd, toLotActif)
            }
          }}
        />
      )}

      <Drawer
        open={Boolean(modales.catalogueExplorerProduit)}
        onClose={modales.closeCatalogueExplorer}
        fullScreen
        title={
          modales.catalogueExplorerProduit
            ? `Lots • ${modales.catalogueExplorerProduit.nom}`
            : 'Lots'
        }
      >
        {modales.catalogueExplorerProduit && (
          <LotExplorer
            produit={modales.catalogueExplorerProduit}
            onClose={modales.closeCatalogueExplorer}
            collaborateurs={stockData.collaborateursById}
            pointsDeVente={stockData.pointsDeVenteById}
            lots={modales.catalogueExplorerLoading ? [] : modales.catalogueExplorerLots}
            onLotAction={(actionId, lot) =>
              modales.handleCatalogueLotAction(actionId, lot, {
                pointsDeVente: stockData.pointsDeVente,
                refreshStockTables: stockData.refreshStockTables,
                fetchLots: stockData.fetchLots,
                toProduitCatalogue: toProd,
                toLotActif,
              })
            }
          />
        )}
      </Drawer>

      <ModalEditSeuil
        open={modales.editSeuilOpen}
        loading={modales.editSeuilLoading}
        produit={modales.editSeuilProduit}
        value={modales.editSeuilValue}
        onChange={modales.setEditSeuilValue}
        onClose={modales.closeEditSeuil}
        onSave={() =>
          modales.handleSaveSeuil(async () => {
            await Promise.all([stockData.refreshLists(), stockData.refreshStockTables()])
          })
        }
      />

      <DrawerStockDetail
        open={modales.detailOpen}
        detailType={modales.detailType}
        detailData={modales.detailData}
        onClose={modales.closeDetail}
      />
    </>
  )
}
