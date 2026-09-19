'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useToast } from '@/components/Toast/ToastContainer'
import { useVentesData } from '@/components/Ventes/useVentesData'
import { useVentesModales } from '@/components/Ventes/useVentesModales'
import VentesFilterBar from '@/components/Ventes/VentesFilterBar'
import VentesTable from '@/components/Ventes/VentesTable'
import DrawerVenteDetail from '@/components/Ventes/DrawerVenteDetail'

// Dynamic imports pour les modales
const VenteAnnulationModal = dynamic(
  () => import('@/components/Ventes/VenteAnnulationModal'),
  { ssr: false }
)
const ProduitMiniModal = dynamic(
  () => import('@/components/Ventes/ProduitMiniModal'),
  { ssr: false }
)

function VentesPageContent() {
  const { showToast } = useToast()
  const data = useVentesData()
  const modales = useVentesModales()

  return (
    <div className="space-y-4">
      {/* ── Barre de filtres et bascule de mode ────────────────────────────── */}
      <VentesFilterBar
        mode={data.mode}
        onSetMode={data.setMode}
        filters={data.filters}
        onSetFilters={data.setFilters}
        pointsDeVente={data.pointsDeVente}
        collaborateurs={data.collaborateurs}
        columnFilters={data.columnFilters}
        onClearColumnFilter={data.clearColumnFilter}
      />

      {/* ── Tableau de données réactif (atomique / agrégé) ─────────────────── */}
      <VentesTable
        mode={data.mode}
        ventes={data.ventes}
        ventesLoading={data.ventesLoading}
        ventesPage={data.ventesPage}
        ventesLimit={data.ventesLimit}
        ventesTotal={data.ventesTotal}
        onPageChange={(page) => data.fetchVentes({ page })}
        onPageSizeChange={(limit) => data.fetchVentes({ page: 1, limit })}
        onRowClick={(row) => modales.openDetail(row, data.mode)}
        onFiltersChange={data.handleColumnFiltersChange}
        onAnnulerVente={(venteId) =>
          modales.openAnnulationVente(venteId, { defaultAll: true, lock: false })
        }
        onAnnulerLigne={modales.openAnnulationLigne}
      />

      {/* ── Tiroir latéral de détail unifié ────────────────────────────────── */}
      {modales.detailOpen && (
        <DrawerVenteDetail
          open={modales.detailOpen}
          mode={data.mode}
          detailLoading={modales.detailLoading}
          detailData={modales.detailData}
          selectedRow={modales.selectedRow}
          onClose={modales.closeDetail}
          onOpenProduitModal={modales.openProduitModal}
        />
      )}

      {/* ── Modale d'annulation de vente / ligne ────────────────────────────── */}
      {modales.annulationOpen && (
        <VenteAnnulationModal
          open={modales.annulationOpen}
          onClose={modales.closeAnnulation}
          lignes={modales.annulationLignes}
          idVente={modales.annulationVenteId}
          defaultCheckAll={modales.annulationDefaultAll}
          lockSelection={modales.annulationLocked}
          onSuccess={() => {
            showToast('Annulation enregistrée', 'success')
            data.fetchVentes({ page: 1 })
          }}
        />
      )}

      {/* ── Mini-modale d'information produit ──────────────────────────────── */}
      <ProduitMiniModal
        open={modales.produitModal.open}
        onClose={modales.closeProduitModal}
        idLot={modales.produitModal.idLot}
        libelleProduit={modales.produitModal.libelle}
      />
    </div>
  )
}

export default function VentesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">Chargement des ventes...</div>
      }
    >
      <VentesPageContent />
    </Suspense>
  )
}
