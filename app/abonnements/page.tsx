'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Box from '@/components/Box/Box'
import TabBox from '@/components/TabBox/TabBox'
import Modal from '@/components/Modal/Modal'
import { useToast } from '@/components/Toast/ToastContainer'
import { useAbonnementsData } from '@/components/Abonnements/useAbonnementsData'
import TabOffres from '@/components/Abonnements/TabOffres'
import TabSouscriptions from '@/components/Abonnements/TabSouscriptions'
import TabPaiements from '@/components/Abonnements/TabPaiements'
import { Offre, ConfirmDialog } from '@/components/Abonnements/abonnementsTypes'

// Imports dynamiques pour optimiser le bundle initial (bundle-dynamic-imports)
const DrawerSouscription = dynamic(() => import('@/components/Abonnements/DrawerSouscription'), {
  ssr: false,
})
const DrawerOffre = dynamic(() => import('@/components/Abonnements/DrawerOffre'), {
  ssr: false,
})
const ModaleOffre = dynamic(() => import('@/components/Abonnements/ModaleOffre'), {
  ssr: false,
})
const ModaleSouscription = dynamic(() => import('@/components/Abonnements/ModaleSouscription'), {
  ssr: false,
})

const CONFIRM_CLOSED: ConfirmDialog = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmer',
  confirmVariant: 'primary',
  onConfirm: async () => {},
}

export default function AbonnementsPage() {
  const { showToast } = useToast()
  const data = useAbonnementsData()

  // ── Tiroirs & Modales ────────────────────────────────────────────────────────
  const [drawerSousId, setDrawerSousId] = useState<number | null>(null)
  const [drawerSousOpen, setDrawerSousOpen] = useState(false)

  const [drawerOffreId, setDrawerOffreId] = useState<number | null>(null)
  const [drawerOffreOpen, setDrawerOffreOpen] = useState(false)

  const [createOffreOpen, setCreateOffreOpen] = useState(false)
  const [souscrireOpen, setSouscrireOpen] = useState(false)
  const [preselectedOffre, setPreselectedOffre] = useState<Pick<
    Offre,
    'id_abonnement' | 'nom' | 'montant' | 'periodicite'
  > | null>(null)

  // ── Modale de confirmation générique ─────────────────────────────────────────
  const [confirm, setConfirm] = useState<ConfirmDialog>(CONFIRM_CLOSED)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const runConfirm = async () => {
    setConfirmLoading(true)
    try {
      await confirm.onConfirm()
      setConfirm(CONFIRM_CLOSED)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur', 'error')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleSouscrire = (
    offre?: Pick<Offre, 'id_abonnement' | 'nom' | 'montant' | 'periodicite'>
  ) => {
    setPreselectedOffre(offre ?? null)
    setSouscrireOpen(true)
  }

  const confirmDesactiver = (offre: Offre) => {
    setConfirm({
      open: true,
      title: "Désactiver l'offre",
      message: `"${offre.nom}" ne pourra plus recevoir de nouvelles souscriptions. Les ${offre.nb_souscriptions_actives} souscription(s) existante(s) continueront normalement.`,
      confirmLabel: 'Désactiver',
      confirmVariant: 'warning',
      onConfirm: async () => data.patchStatut(offre.id_abonnement, 'INACTIVE'),
    })
  }

  const confirmReactiver = (offre: Offre) => {
    setConfirm({
      open: true,
      title: "Réactiver l'offre",
      message: `"${offre.nom}" sera à nouveau ouverte aux nouvelles souscriptions.`,
      confirmLabel: 'Réactiver',
      confirmVariant: 'primary',
      onConfirm: async () => data.patchStatut(offre.id_abonnement, 'ACTIVE'),
    })
  }

  const confirmArchiver = (offre: Offre) => {
    if (offre.nb_souscriptions_actives > 0) {
      showToast(
        `Impossible d'archiver : ${offre.nb_souscriptions_actives} souscription(s) active(s). Terminez-les d'abord.`,
        'error'
      )
      return
    }
    setConfirm({
      open: true,
      title: "Archiver l'offre",
      message: `"${offre.nom}" sera archivée. Elle restera visible dans l'historique mais ne pourra plus recevoir de souscriptions.`,
      confirmLabel: 'Archiver',
      confirmVariant: 'warning',
      onConfirm: async () => data.patchStatut(offre.id_abonnement, 'ARCHIVED'),
    })
  }

  const confirmSupprimer = (offre: Offre) => {
    if (offre.nb_souscriptions > 0) {
      showToast(
        `Suppression impossible : cette offre a ${offre.nb_souscriptions} souscription(s). Utilisez l'archivage.`,
        'error'
      )
      return
    }
    setConfirm({
      open: true,
      title: 'Supprimer définitivement',
      message: `"${offre.nom}" n'a aucune souscription et sera supprimée définitivement. Cette opération est irréversible.`,
      confirmLabel: 'Supprimer définitivement',
      confirmVariant: 'danger',
      onConfirm: async () => data.deleteOffre(offre.id_abonnement),
    })
  }

  return (
    <>
      {/* ── Cartes de statistiques globales ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {data.stats.map((stat) => (
          <Box key={stat.label} padding="p-3 md:p-4" hover>
            <div className="flex items-center">
              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${stat.color} mr-2 md:mr-3 shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="text-lg md:text-2xl font-bold text-navy-dark dark:text-white truncate">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          </Box>
        ))}
      </div>

      {/* ── Structure par onglets TabBox ────────────────────────────────────── */}
      <TabBox
        tabs={[
          {
            id: 'offres',
            label: 'Offres',
            badge: data.offres.filter((o) => o.statut === 'ACTIVE').length || undefined,
            content: (
              <TabOffres
                offres={data.offres}
                loading={data.offresLoading}
                paginatedOffres={data.paginatedOffres}
                totalCount={data.totalOffresCount}
                page={data.offresPage}
                perPage={data.offresPerPage}
                sortConfig={data.offresSortConfig}
                onPageChange={data.setOffresPage}
                onPageSizeChange={(sz) => {
                  data.setOffresPerPage(sz)
                  data.setOffresPage(1)
                }}
                onSort={(cfg) => {
                  data.setOffresSortConfig(cfg)
                  data.setOffresPage(1)
                }}
                onOpenCreate={() => setCreateOffreOpen(true)}
                onOpenDrawer={(id) => {
                  setDrawerOffreId(id)
                  setDrawerOffreOpen(true)
                }}
                onSouscrire={handleSouscrire}
                onDesactiver={confirmDesactiver}
                onReactiver={confirmReactiver}
                onArchiver={confirmArchiver}
                onSupprimer={confirmSupprimer}
              />
            ),
          },
          {
            id: 'souscriptions',
            label: 'Souscriptions',
            badge: data.souscriptions.filter((s) => s.statut === 'ACTIVE').length || undefined,
            content: (
              <TabSouscriptions
                souscriptions={data.souscriptions}
                souscriptionsLoading={data.souscriptionsLoading}
                displayData={data.souscriptionsDisplayData}
                totalCount={data.totalSouscriptionsCount}
                page={data.sousPage}
                perPage={data.sousPerPage}
                sortConfig={data.sousSortConfig}
                filtreActif={data.filtreActif}
                showSousFilters={data.showSousFilters}
                filtreCollabInput={data.filtreCollabInput}
                filtreOffreInput={data.filtreOffreInput}
                filtreDateDebut={data.filtreDateDebut}
                groupByCollab={data.groupByCollab}
                onPageChange={data.setSousPage}
                onPageSizeChange={(sz) => {
                  data.setSousPerPage(sz)
                  data.setSousPage(1)
                }}
                onSort={(cfg) => {
                  data.setSousSortConfig(cfg)
                  data.setSousPage(1)
                }}
                onSetFiltreActif={data.setFiltreActif}
                onToggleShowSousFilters={() => data.setShowSousFilters((p) => !p)}
                onSetFiltreCollabInput={data.setFiltreCollabInput}
                onSetFiltreOffreInput={data.setFiltreOffreInput}
                onSetFiltreDateDebut={data.setFiltreDateDebut}
                onSetGroupByCollab={data.setGroupByCollab}
                onFetchEcheancesForSouscription={data.fetchEcheancesForSouscription}
                onToggleShowAllEcheances={data.toggleShowAllEcheances}
                onOpenSouscrire={() => handleSouscrire()}
                onOpenDrawerSouscription={(id) => {
                  setDrawerSousId(id)
                  setDrawerSousOpen(true)
                }}
              />
            ),
          },
          {
            id: 'paiements',
            label: 'Paiements',
            badge: data.paiements.filter((p) => !p.canceled_at).length || undefined,
            content: (
              <TabPaiements
                paiements={data.paiements}
                loading={data.paiementsLoading}
                filtrePaiements={data.filtrePaiements}
                setFiltrePaiements={data.setFiltrePaiements}
              />
            ),
          },
        ]}
        actions={
          <button
            onClick={() => setCreateOffreOpen(true)}
            className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Nouvelle offre
          </button>
        }
      />

      {/* ── Modales et Tiroirs ───────────────────────────────────────────────── */}
      <ModaleOffre
        open={createOffreOpen}
        onClose={() => setCreateOffreOpen(false)}
        onSuccess={data.refreshAll}
      />

      <ModaleSouscription
        open={souscrireOpen}
        onClose={() => setSouscrireOpen(false)}
        onSuccess={data.refreshAll}
        collaborateurs={data.collaborateurs}
        offres={data.offres}
        preselectedOffre={preselectedOffre}
      />

      <DrawerSouscription
        idSouscription={drawerSousId}
        open={drawerSousOpen}
        onClose={() => setDrawerSousOpen(false)}
        onMutated={data.refreshAll}
      />

      <DrawerOffre
        idOffre={drawerOffreId}
        open={drawerOffreOpen}
        onClose={() => setDrawerOffreOpen(false)}
        onMutated={data.refreshAll}
        onSouscrire={(offre) => handleSouscrire(offre)}
      />

      <Modal
        open={confirm.open}
        title={confirm.title}
        onClose={() => !confirmLoading && setConfirm(CONFIRM_CLOSED)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirm(CONFIRM_CLOSED)}
              disabled={confirmLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={runConfirm}
              disabled={confirmLoading}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                confirm.confirmVariant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : confirm.confirmVariant === 'warning'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-primary hover:bg-primary-strong'
              }`}
            >
              {confirmLoading ? 'En cours...' : confirm.confirmLabel}
            </button>
          </div>
        }
      >
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{confirm.message}</p>
      </Modal>
    </>
  )
}
