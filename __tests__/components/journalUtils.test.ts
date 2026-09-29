import { describe, it, expect } from 'vitest'
import { buildStockEvents, formatQuantity } from '@/components/Stock/Journal/journalUtils'
import type { EnrichedStockMouvement } from '@/components/Stock/Journal/journalTypes'

describe('journalUtils — Normalisation & Agrégation Métier', () => {
  it('regroupe les deux jambes d’un transfert sous un seul StockEvent', () => {
    const movements: EnrichedStockMouvement[] = [
      {
        id_stock_mouvement: 101,
        tenant_id: 1,
        id_lot: 12,
        type: 'transfert',
        quantite: 20,
        before_qty: 240,
        after_qty: 220,
        source_type: 'TRANSFERT',
        source_id: 18,
        date_mouvement: '2026-09-08T11:14:00Z',
        created_at: '2026-09-08T11:16:00Z',
        created_by: 1,
        created_by_nom: 'Alice',
        libelle_produit: 'Riz blanc 5 kg',
        sku_produit: 'REF-RIZ-005',
        categorie_produit: 'Céréales',
        unite_code: 'kg',
        unite_label: 'Kilogramme',
        est_decimal: true,
        statut_lot: 'en_stock',
        id_pdv: 1,
        nom_pdv: 'Dépôt central',
        client_nom: null,
        reference_livraison: null,
        source_statut: null,
        source_date: '2026-09-08T11:14:00Z',
        pdv_source_nom: 'Dépôt central',
        pdv_dest_nom: 'Boutique A',
        transfert_commentaire: 'Réappro boutique',
        ajustement_type: null,
        ajustement_motif: null,
      },
      {
        id_stock_mouvement: 102,
        tenant_id: 1,
        id_lot: 12,
        type: 'transfert',
        quantite: 20,
        before_qty: 65,
        after_qty: 85,
        source_type: 'TRANSFERT',
        source_id: 18,
        date_mouvement: '2026-09-08T11:14:00Z',
        created_at: '2026-09-08T11:16:00Z',
        created_by: 1,
        created_by_nom: 'Alice',
        libelle_produit: 'Riz blanc 5 kg',
        sku_produit: 'REF-RIZ-005',
        categorie_produit: 'Céréales',
        unite_code: 'kg',
        unite_label: 'Kilogramme',
        est_decimal: true,
        statut_lot: 'en_stock',
        id_pdv: 2,
        nom_pdv: 'Boutique A',
        client_nom: null,
        reference_livraison: null,
        source_statut: null,
        source_date: '2026-09-08T11:14:00Z',
        pdv_source_nom: 'Dépôt central',
        pdv_dest_nom: 'Boutique A',
        transfert_commentaire: 'Réappro boutique',
        ajustement_type: null,
        ajustement_motif: null,
      },
    ]

    const events = buildStockEvents(movements)
    expect(events.length).toBe(1)
    const evt = events[0]
    expect(evt.type).toBe('TRANSFERT')
    expect(evt.reference).toBe('Transfert #18')
    expect(evt.isGrouped).toBe(true)
    expect(evt.movementCount).toBe(2)
    expect(evt.movements.length).toBe(2)
    expect(evt.operator).toBe('Alice')
    expect(evt.colMovement.line1Location).toContain('Dépôt central → Boutique A')
  })

  it('sépare strictement une vente et son annulation ultérieure en deux StockEvents distincts', () => {
    const movements: EnrichedStockMouvement[] = [
      // Vente originale #384
      {
        id_stock_mouvement: 201,
        tenant_id: 1,
        id_lot: 25,
        type: 'sortie',
        quantite: 3,
        before_qty: 10,
        after_qty: 7,
        source_type: 'VENTE',
        source_id: 384,
        date_mouvement: '2026-09-07T10:00:00Z',
        created_at: '2026-09-07T10:00:00Z',
        created_by: 2,
        created_by_nom: 'Bob',
        libelle_produit: 'Huile tournesol 1L',
        sku_produit: 'HUILE-01',
        categorie_produit: 'Alimentation',
        unite_code: 'L',
        unite_label: 'Litre',
        est_decimal: false,
        statut_lot: 'en_stock',
        id_pdv: 1,
        nom_pdv: 'Boutique Principale',
        client_nom: 'Client Dupont',
        reference_livraison: null,
        source_statut: 'payee',
        source_date: '2026-09-07T10:00:00Z',
        pdv_source_nom: null,
        pdv_dest_nom: null,
        transfert_commentaire: null,
        ajustement_type: null,
        ajustement_motif: null,
      },
      // Annulation compensatoire de Vente #384
      {
        id_stock_mouvement: 202,
        tenant_id: 1,
        id_lot: 25,
        type: 'annulation_vente',
        quantite: 3,
        before_qty: 7,
        after_qty: 10,
        source_type: 'VENTE',
        source_id: 384,
        date_mouvement: '2026-09-08T15:30:00Z',
        created_at: '2026-09-08T15:30:00Z',
        created_by: 1,
        created_by_nom: 'Alice',
        libelle_produit: 'Huile tournesol 1L',
        sku_produit: 'HUILE-01',
        categorie_produit: 'Alimentation',
        unite_code: 'L',
        unite_label: 'Litre',
        est_decimal: false,
        statut_lot: 'en_stock',
        id_pdv: 1,
        nom_pdv: 'Boutique Principale',
        client_nom: 'Client Dupont',
        reference_livraison: null,
        source_statut: 'annulee',
        source_date: '2026-09-08T15:30:00Z',
        pdv_source_nom: null,
        pdv_dest_nom: null,
        transfert_commentaire: null,
        ajustement_type: null,
        ajustement_motif: null,
      },
    ]

    const events = buildStockEvents(movements)
    expect(events.length).toBe(2)

    const annulationEvt = events.find((e) => e.type === 'ANNULATION')
    const venteEvt = events.find((e) => e.type === 'SORTIE')

    expect(annulationEvt).toBeDefined()
    expect(venteEvt).toBeDefined()
    expect(annulationEvt!.reference).toBe('Annulation Vente #384')
    expect(venteEvt!.reference).toBe('Vente #384')
  })

  it('gère les événements simples à 1 mouvement sans pluralité inutile', () => {
    const movements: EnrichedStockMouvement[] = [
      {
        id_stock_mouvement: 301,
        tenant_id: 1,
        id_lot: 50,
        type: 'ajustement',
        quantite: -5,
        before_qty: 50,
        after_qty: 45,
        source_type: 'AJUSTEMENT',
        source_id: 91,
        date_mouvement: '2026-09-09T08:00:00Z',
        created_at: '2026-09-09T08:00:00Z',
        created_by: 1,
        created_by_nom: 'Alice',
        libelle_produit: 'Farine 1kg',
        sku_produit: 'FAR-01',
        categorie_produit: 'Épicerie',
        unite_code: 'kg',
        unite_label: 'Kilogramme',
        est_decimal: false,
        statut_lot: 'en_stock',
        id_pdv: 1,
        nom_pdv: 'Dépôt',
        client_nom: null,
        reference_livraison: null,
        source_statut: 'valide',
        source_date: '2026-09-09T08:00:00Z',
        pdv_source_nom: null,
        pdv_dest_nom: null,
        transfert_commentaire: null,
        ajustement_type: 'perte',
        ajustement_motif: 'Sac percé',
      },
    ]

    const events = buildStockEvents(movements)
    expect(events.length).toBe(1)
    expect(events[0].isGrouped).toBe(false)
    expect(events[0].colEvent.line3Ref).toBe('Ajustement #91')
    expect(events[0].colEvent.line3Ref).not.toContain('mouvements')
  })
})
