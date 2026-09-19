import Drawer from '@/components/Drawer/Drawer'
import type { AnyRecord, ModeAffichage } from './ventesTypes'
import { formatStatut, getStatutBadgeClass } from './ventesUtils'

interface DrawerVenteDetailProps {
  open: boolean
  mode: ModeAffichage
  detailLoading: boolean
  detailData: AnyRecord | null
  selectedRow: AnyRecord | null
  onClose: () => void
  onOpenProduitModal: (idLot?: number, libelle?: string) => void
}

export default function DrawerVenteDetail({
  open,
  mode,
  detailLoading,
  detailData,
  selectedRow,
  onClose,
  onOpenProduitModal,
}: DrawerVenteDetailProps) {
  const title =
    mode === 'atomique'
      ? 'Détail de la transaction'
      : `Détail vente #${detailData?.id_vente || selectedRow?.id_vente || ''}`

  return (
    <Drawer open={open} title={title} onClose={onClose}>
      {detailLoading ? (
        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Chargement du détail...
        </div>
      ) : (
        <>
          {/* ── MODE AGRÉGÉ ─────────────────────────────────────────────────── */}
          {mode === 'aggrege' && detailData && (
            <div className="space-y-4">
              {/* En-tête vente */}
              <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                    Vente #{detailData.id_vente}
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Date
                    </p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {detailData.date_vente
                        ? new Date(detailData.date_vente).toLocaleString('fr-FR')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Statut
                    </p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatutBadgeClass(
                        detailData.statut
                      )}`}
                    >
                      {formatStatut(detailData.statut)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Point de vente
                    </p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {detailData.point_vente_nom || `PV #${detailData.id_point_vente}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Client
                    </p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {detailData.client_nom || 'Client anonyme'}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-0.5">
                          Total
                        </p>
                        <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
                          {detailData.montant_total
                            ? `${Number(detailData.montant_total).toLocaleString('fr-FR')} Ar`
                            : '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                          Marge
                        </p>
                        <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {detailData.montant_marge
                            ? `${Number(detailData.montant_marge).toLocaleString('fr-FR')} Ar`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Lignes */}
              {Array.isArray(detailData.lignes) && detailData.lignes.length > 0 && (
                <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                    <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                      Lignes ({detailData.lignes.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs divide-y divide-slate-100 dark:divide-slate-700">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">
                            Produit
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">
                            Collaborateur
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">
                            Vendu
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">
                            Retourné
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">
                            Montant
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">
                            Marge
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900/40">
                        {detailData.lignes.map((ligne: AnyRecord) => {
                          const unite = ligne.unite_code ? ` ${ligne.unite_code}` : ''
                          const retourne = Number(ligne.quantite_retournee ?? 0)
                          return (
                            <tr
                              key={ligne.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                              onClick={() =>
                                onOpenProduitModal(ligne.id_lot, ligne.libelle_produit)
                              }
                              title="Cliquer pour voir le détail du produit"
                            >
                              <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">
                                <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                  {ligne.libelle_produit || `Lot #${ligne.id_lot}`}
                                </span>
                                {ligne.unite_code && (
                                  <span
                                    className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                      ligne.est_decimal
                                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                                    }`}
                                  >
                                    {ligne.unite_code}
                                  </span>
                                )}
                                {retourne > 0 && (
                                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                    Retourné : {retourne.toLocaleString('fr-FR')}
                                    {unite}
                                    {ligne.raison_suppression
                                      ? ` — ${ligne.raison_suppression}`
                                      : ''}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                {ligne.collaborateur_nom || '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-slate-200">
                                {Number(ligne.quantite_vendue).toLocaleString('fr-FR')}
                                {unite}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {retourne > 0 ? (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    {retourne.toLocaleString('fr-FR')}
                                    {unite}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-slate-200">
                                {ligne.montant_ht
                                  ? `${Number(ligne.montant_ht).toLocaleString('fr-FR')} Ar`
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                {ligne.montant_marge
                                  ? `${Number(ligne.montant_marge).toLocaleString('fr-FR')} Ar`
                                  : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── MODE ATOMIQUE ────────────────────────────────────────────────── */}
          {mode === 'atomique' && detailData && (
            <div className="space-y-4">
              <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                    Vente #{detailData.id_vente}
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Date
                    </p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {detailData.date_vente
                        ? new Date(detailData.date_vente).toLocaleString('fr-FR')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Statut
                    </p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatutBadgeClass(
                        detailData.statut
                      )}`}
                    >
                      {formatStatut(detailData.statut)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Point de vente
                    </p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {detailData.point_vente_nom || `PV #${detailData.id_point_vente}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Client
                    </p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {detailData.client_nom || 'Client anonyme'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                    Transaction
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40 text-sm">
                  <div className="col-span-2">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Produit
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenProduitModal(detailData.id_lot, detailData.libelle_produit)
                      }
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left underline-offset-2 hover:underline transition-colors"
                      title="Voir le détail du produit"
                    >
                      {detailData.libelle_produit || `Lot #${detailData.id_lot}`}
                    </button>
                    {detailData.unite_code && (
                      <span
                        className={`ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                          detailData.est_decimal
                            ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                        }`}
                      >
                        {detailData.unite_code}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Collaborateur
                    </p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {detailData.collaborateur_nom || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Quantité vendue
                    </p>
                    <p className="font-mono text-slate-900 dark:text-slate-100">
                      {Number(detailData.quantite_vendue).toLocaleString('fr-FR')}
                      {detailData.unite_code ? ` ${detailData.unite_code}` : ''}
                    </p>
                  </div>
                  {Number(detailData.quantite_retournee ?? 0) > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                        Retourné
                      </p>
                      <p className="font-mono text-amber-600 dark:text-amber-400">
                        {Number(detailData.quantite_retournee).toLocaleString('fr-FR')}
                        {detailData.unite_code ? ` ${detailData.unite_code}` : ''}
                      </p>
                      {detailData.raison_suppression && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Motif : {detailData.raison_suppression}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Montant
                    </p>
                    <p className="font-mono text-slate-900 dark:text-slate-100">
                      {detailData.montant_ht
                        ? `${Number(detailData.montant_ht).toLocaleString('fr-FR')} Ar`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                      Marge
                    </p>
                    <p className="font-mono text-emerald-600 dark:text-emerald-400">
                      {detailData.montant_marge
                        ? `${Number(detailData.montant_marge).toLocaleString('fr-FR')} Ar`
                        : '—'}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </Drawer>
  )
}
