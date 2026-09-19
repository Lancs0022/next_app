import Drawer from '@/components/Drawer/Drawer'
import type { AnyRecord, DetailType } from './stockTypes'

interface DrawerStockDetailProps {
  open: boolean
  detailType: DetailType
  detailData: AnyRecord | null
  onClose: () => void
}

export default function DrawerStockDetail({
  open,
  detailType,
  detailData,
  onClose,
}: DrawerStockDetailProps) {
  const title =
    detailType === 'lot'
      ? detailData?.libelle_produit || 'Détails du lot'
      : detailType === 'livraison'
      ? `Livraison #${detailData?.id_livraison || ''}`
      : detailType === 'catalogue'
      ? detailData?.libelle || 'Détails du produit'
      : detailType === 'mouvements'
      ? `Mouvements du lot #${detailData?.lot?.id_lot || ''}`
      : 'Détails'

  return (
    <Drawer open={open && !!detailType && !!detailData} onClose={onClose} title={title}>
      {/* ── DETAIL LOT ──────────────────────────────────────────────────────── */}
      {detailType === 'lot' && detailData && (
        <div className="space-y-1 text-sm">
          {/* Section Produit */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Produit
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40">
              <div className="col-span-2">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Nom
                </p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {detailData.libelle_produit || 'Sans nom'}
                </p>
              </div>
              {detailData.categorie_produit && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                    Catégorie
                  </p>
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                    {detailData.categorie_produit}
                  </span>
                </div>
              )}
              {detailData.unite_code && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                    Unité
                  </p>
                  <span
                    title={`${detailData.unite_label || detailData.unite_code}${
                      detailData.est_decimal ? ' — décimal' : ''
                    }`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${
                      detailData.est_decimal
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                    }`}
                  >
                    {detailData.unite_code}
                    {detailData.est_decimal && (
                      <span className="text-[9px] opacity-60 font-sans">dec</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Section Lot & Logistique */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Lot & Logistique
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Lot
                </p>
                <p className="font-mono text-slate-900 dark:text-slate-100">#{detailData.id_lot}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Livraison
                </p>
                <p className="font-mono text-slate-900 dark:text-slate-100">
                  {detailData.id_livraison ? `#${detailData.id_livraison}` : '—'}
                </p>
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
                  Point de vente
                </p>
                <p className="text-slate-900 dark:text-slate-100">
                  {detailData.point_vente_nom ||
                    (detailData.id_point_vente ? `PV #${detailData.id_point_vente}` : '—')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Date livraison
                </p>
                <p className="text-slate-900 dark:text-slate-100">
                  {detailData.date_livraison
                    ? new Date(detailData.date_livraison).toLocaleDateString('fr-FR')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Créé le
                </p>
                <p className="text-slate-900 dark:text-slate-100">
                  {detailData.date_creation
                    ? new Date(detailData.date_creation).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '—'}
                </p>
              </div>
              {detailData.created_by_nom && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                    Créé par
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">{detailData.created_by_nom}</p>
                </div>
              )}
            </div>
          </section>

          {/* Section Stock & Finances */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Stock & Finances
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40">
              {/* Quantités */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Stock restant
                </p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {Number(detailData.quantite_disponible ?? 0).toLocaleString('fr-FR')}
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    {' '}
                    / {Number(detailData.quantite_initiale ?? 0).toLocaleString('fr-FR')}
                  </span>
                  {detailData.unite_code ? (
                    <span className="text-xs text-slate-500 ml-1">{detailData.unite_code}</span>
                  ) : (
                    ''
                  )}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Déjà vendu
                </p>
                <p className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  {Number(detailData.quantite_vendue ?? 0).toLocaleString('fr-FR')}
                  {detailData.unite_code ? (
                    <span className="text-xs ml-1">{detailData.unite_code}</span>
                  ) : (
                    ''
                  )}
                </p>
              </div>
              {/* Prix */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Prix de vente unitaire
                </p>
                <p className="font-mono text-slate-900 dark:text-slate-100">
                  {detailData.prix_initial
                    ? `${(
                        Number(detailData.prix_initial) + Number(detailData.marge ?? 0)
                      ).toLocaleString('fr-FR')} Ar`
                    : '—'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  dont marge :{' '}
                  {detailData.marge ? `${Number(detailData.marge).toLocaleString('fr-FR')} Ar` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Prix initial (fournisseur)
                </p>
                <p className="font-mono text-slate-600 dark:text-slate-400">
                  {detailData.prix_initial
                    ? `${Number(detailData.prix_initial).toLocaleString('fr-FR')} Ar`
                    : '—'}
                </p>
              </div>

              {/* Bénéfice dégagé */}
              <div className="col-span-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 px-4 py-3 mt-1">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                  💰 Bénéfice dégagé jusqu&apos;ici
                </p>
                <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {(() => {
                    const vendu = Number(detailData.quantite_vendue ?? 0)
                    const marge = Number(detailData.marge ?? 0)
                    return vendu > 0 ? `${(vendu * marge).toLocaleString('fr-FR')} Ar` : '0 Ar'
                  })()}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {Number(detailData.quantite_vendue ?? 0).toLocaleString('fr-FR')} vendu
                  {Number(detailData.quantite_vendue ?? 0) > 1 ? 's' : ''} ×{' '}
                  {Number(detailData.marge ?? 0).toLocaleString('fr-FR')} Ar de marge
                </p>
              </div>

              {/* Gain potentiel restant */}
              <div className="col-span-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-4 py-3">
                <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">
                  📈 Gain potentiel si tout le reste est vendu
                </p>
                <p className="font-mono text-lg font-bold text-blue-700 dark:text-blue-300">
                  {(() => {
                    const restant = Number(detailData.quantite_disponible ?? 0)
                    const marge = Number(detailData.marge ?? 0)
                    return restant > 0 ? `${(restant * marge).toLocaleString('fr-FR')} Ar` : '0 Ar'
                  })()}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {Number(detailData.quantite_disponible ?? 0).toLocaleString('fr-FR')} restant
                  {Number(detailData.quantite_disponible ?? 0) > 1 ? 's' : ''} ×{' '}
                  {Number(detailData.marge ?? 0).toLocaleString('fr-FR')} Ar de marge
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── DETAIL MOUVEMENTS ───────────────────────────────────────────────── */}
      {detailType === 'mouvements' && detailData && (
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Mouvements du lot #{detailData?.lot?.id_lot}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {detailData?.lot?.libelle_produit || 'Produit -'}
            </p>
          </div>
          {detailData.loading && (
            <div className="text-slate-600 dark:text-slate-300">Chargement...</div>
          )}
          {!detailData.loading && detailData.error && (
            <div className="text-red-600 dark:text-red-400">{detailData.error}</div>
          )}
          {!detailData.loading && !detailData.error && (
            <div className="space-y-2">
              {(detailData.mouvements || []).length === 0 ? (
                <div className="text-slate-600 dark:text-slate-300">Aucun mouvement</div>
              ) : (
                <div className="space-y-2">
                  {(detailData.mouvements || []).map((m: AnyRecord) => (
                    <div
                      key={m.id_stock_mouvement}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {String(m.type || '').toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {m.date_mouvement
                            ? new Date(m.date_mouvement).toLocaleString('fr-FR')
                            : '-'}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Qté: {Number(m.quantite || 0).toLocaleString('fr-FR')} · Avant:{' '}
                        {m.before_qty ?? '-'} · Après: {m.after_qty ?? '-'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Source: {m.source_type || '-'}
                        {m.source_id != null ? ` #${m.source_id}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL LIVRAISON ───────────────────────────────────────────────── */}
      {detailType === 'livraison' && detailData && (
        <div className="space-y-1 text-sm">
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Livraison #{detailData.id_livraison}
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Collaborateur
                </p>
                <p className="text-slate-900 dark:text-slate-100 font-medium">
                  {detailData.collaborateur_nom || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Point de vente
                </p>
                <p className="text-slate-900 dark:text-slate-100">
                  {detailData.point_vente_nom ||
                    (detailData.id_point_vente ? `PV #${detailData.id_point_vente}` : '—')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Date
                </p>
                <p className="text-slate-900 dark:text-slate-100">
                  {detailData.date_livraison
                    ? new Date(detailData.date_livraison).toLocaleDateString('fr-FR')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Référence
                </p>
                <p className="font-mono text-slate-900 dark:text-slate-100">
                  {detailData.reference || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Nb lots
                </p>
                <p className="font-mono text-slate-900 dark:text-slate-100">
                  {detailData.nb_lots ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Quantité totale
                </p>
                <p className="font-mono text-slate-900 dark:text-slate-100">
                  {detailData.quantite_totale != null
                    ? Number(detailData.quantite_totale).toLocaleString('fr-FR')
                    : '—'}
                </p>
              </div>
              {detailData.commentaire && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                    Commentaire
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {detailData.commentaire}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── DETAIL CATALOGUE ───────────────────────────────────────────────── */}
      {detailType === 'catalogue' && detailData && (
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {detailData.libelle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Catégorie : {detailData.categorie || 'Sans catégorie'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Collaborateur : {detailData.collaborateur_nom || 'Collaborateur -'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stock</p>
              <p className="text-slate-900 dark:text-white">
                {Number(detailData.quantite_en_stock ?? 0).toLocaleString('fr-FR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Seuil d&apos;alerte</p>
              <p className="text-slate-900 dark:text-white">
                {detailData.seuil_alerte != null ? detailData.seuil_alerte : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Statut</p>
              <p className="text-slate-900 dark:text-white">{detailData.statut}</p>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
