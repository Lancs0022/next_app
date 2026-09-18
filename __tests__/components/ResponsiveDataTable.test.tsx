// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import type { Column } from '@/components/ResponsiveDataTable/ResponsiveDataTable'

interface Item {
  id: number
  nom: string
  prix: number
  categorie: string
  periodes?: Array<{ id: number; nom: string; prix: number }>
}

const mockData: Item[] = [
  { id: 1, nom: 'Banane', prix: 1500, categorie: 'Fruits' },
  { id: 2, nom: 'Pomme', prix: 3000, categorie: 'Fruits' },
  { id: 3, nom: 'Carotte', prix: 800, categorie: 'Légumes' },
  { id: 4, nom: 'Avocat', prix: 2500, categorie: 'Fruits' },
  { id: 5, nom: 'Tomate', prix: 1200, categorie: 'Légumes' },
  { id: 6, nom: 'Ananas', prix: 4000, categorie: 'Fruits' },
]

const columns: Column<Item>[] = [
  { field: 'nom', headerName: 'Produit', sortable: true, filterable: true },
  { field: 'prix', headerName: 'Prix', sortable: true },
  { field: 'categorie', headerName: 'Catégorie', sortable: true },
]

describe('ResponsiveDataTable — Upgrade & Robustesse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. Tri à 3 états (asc -> desc -> neutre) ──────────────────────────────
  describe('Tri 3 états (asc ➔ desc ➔ neutre)', () => {
    it('cycle correctement entre ascendant, descendant et neutre sur clic header', () => {
      render(
        <ResponsiveDataTable
          columns={columns}
          data={mockData}
          pagination={{ page: 1, perPage: 10, total: mockData.length }}
        />
      )

      const headerProduit = screen.getByText('Produit')

      // État initial (neutre / ordre d'origine) : Banane, Pomme, Carotte...
      let cells = screen.getAllByRole('cell').map(c => c.textContent)
      expect(cells).toContain('Banane')

      // Clic 1 : ascendant (Ananas, Avocat, Banane, Carotte, Pomme, Tomate)
      fireEvent.click(headerProduit)
      let rows = screen.getAllByRole('row')
      // Première ligne de données (rows[1]) doit être Ananas
      expect(within(rows[1]).getByText('Ananas')).toBeDefined()

      // Clic 2 : descendant (Tomate, Pomme, Carotte, Banane, Avocat, Ananas)
      fireEvent.click(headerProduit)
      rows = screen.getAllByRole('row')
      expect(within(rows[1]).getByText('Tomate')).toBeDefined()

      // Clic 3 : neutre (redevient l'ordre original : Banane en premier)
      fireEvent.click(headerProduit)
      rows = screen.getAllByRole('row')
      expect(within(rows[1]).getByText('Banane')).toBeDefined()
    })

    it('trie correctement les nombres numériquement (pas alphabétiquement)', () => {
      render(
        <ResponsiveDataTable
          columns={columns}
          data={mockData}
          pagination={{ page: 1, perPage: 10, total: mockData.length }}
        />
      )

      const headerPrix = screen.getByText('Prix')
      // Clic 1 : ascendant (800, 1200, 1500, 2500, 3000, 4000)
      fireEvent.click(headerPrix)
      let rows = screen.getAllByRole('row')
      expect(within(rows[1]).getByText('Carotte')).toBeDefined() // Carotte = 800

      // Clic 2 : descendant (4000, 3000, 2500, 1500, 1200, 800)
      fireEvent.click(headerPrix)
      rows = screen.getAllByRole('row')
      expect(within(rows[1]).getByText('Ananas')).toBeDefined() // Ananas = 4000
    })
  })

  // ── 2. Pagination autonome client-side ────────────────────────────────────
  describe('Pagination autonome', () => {
    it('découpe automatiquement les données par tranche sans logique parent', () => {
      render(
        <ResponsiveDataTable
          columns={columns}
          data={mockData} // 6 items
          pagination={{ page: 1, perPage: 2, total: 6 }}
        />
      )

      // Sur la page 1 avec perPage=2 : seulement les 2 premiers items affichés
      expect(screen.getByText('Banane')).toBeDefined()
      expect(screen.getByText('Pomme')).toBeDefined()
      expect(screen.queryByText('Carotte')).toBeNull()

      // Footer indique "1–2 sur 6" et "(1 / 3)"
      expect(screen.getByText('1–2 sur 6', { exact: false })).toBeDefined()
      expect(screen.getByText('(1 / 3)')).toBeDefined()

      // Clic page suivante
      const nextBtn = screen.getByLabelText('Page suivante')
      fireEvent.click(nextBtn)

      // Page 2 : Carotte et Avocat
      expect(screen.getByText('Carotte')).toBeDefined()
      expect(screen.getByText('Avocat')).toBeDefined()
      expect(screen.queryByText('Banane')).toBeNull()
      expect(screen.getByText('3–4 sur 6', { exact: false })).toBeDefined()
      expect(screen.getByText('(2 / 3)')).toBeDefined()
    })
  })

  // ── 3. Isolation multi-instances sur une même page (Tabs) ────────────────
  describe('Isolation multi-instances', () => {
    it('deux tables distinctes ne polluent pas mutuellement leur tri et pagination', () => {
      const dataA = [
        { id: 10, nom: 'Alpha', prix: 100, categorie: 'A' },
        { id: 20, nom: 'Beta', prix: 200, categorie: 'A' },
      ]
      const dataB = [
        { id: 30, nom: 'Zeta', prix: 900, categorie: 'B' },
        { id: 40, nom: 'Omega', prix: 500, categorie: 'B' },
      ]

      render(
        <div>
          <div data-testid="container-a">
            <ResponsiveDataTable instanceId="table-a" columns={columns} data={dataA} />
          </div>
          <div data-testid="container-b">
            <ResponsiveDataTable instanceId="table-b" columns={columns} data={dataB} />
          </div>
        </div>
      )

      const containerA = screen.getByTestId('container-a')
      const containerB = screen.getByTestId('container-b')

      // Trier la table B par Nom asc (Omega, Zeta)
      const headerB = within(containerB).getByText('Produit')
      fireEvent.click(headerB)

      // Vérifier que B est triée
      const rowsB = within(containerB).getAllByRole('row')
      expect(within(rowsB[1]).getByText('Omega')).toBeDefined()

      // Vérifier que A n'a PAS été impactée (Alpha reste premier)
      const rowsA = within(containerA).getAllByRole('row')
      expect(within(rowsA[1]).getByText('Alpha')).toBeDefined()
    })
  })

  // ── 4. Agrégation et expansion (Group Rows & Sub-Rows) ───────────────────
  describe('Agrégation & Expansion (Group Rows)', () => {
    const groupData: Item[] = [
      {
        id: 100,
        nom: 'Abonnement Pro',
        prix: 8000,
        categorie: 'Souscription',
        periodes: [
          { id: 101, nom: 'Période 1 (Septembre)', prix: 8000 },
          { id: 102, nom: 'Période 2 (Octobre)', prix: 8000 },
        ],
      },
      {
        id: 200,
        nom: 'Abonnement Standard',
        prix: 5000,
        categorie: 'Souscription',
      },
    ]

    it('affiche un chevron pour la ligne de groupe et déplie les sous-lignes', () => {
      render(
        <ResponsiveDataTable
          columns={columns}
          data={groupData}
          childrenField="periodes"
        />
      )

      // Le parent est visible
      expect(screen.getByText('Abonnement Pro')).toBeDefined()
      expect(screen.getByText('Abonnement Standard')).toBeDefined()

      // Au départ, les sous-périodes ne sont pas dans le DOM
      expect(screen.queryByText('Période 1 (Septembre)')).toBeNull()

      // Trouver le bouton déplier (chevron)
      const expandBtn = screen.getByLabelText('Déplier')
      fireEvent.click(expandBtn)

      // Maintenant les sous-périodes sont visibles
      expect(screen.getByText('Période 1 (Septembre)')).toBeDefined()
      expect(screen.getByText('Période 2 (Octobre)')).toBeDefined()

      // Clic replier
      const collapseBtn = screen.getByLabelText('Replier')
      fireEvent.click(collapseBtn)

      // Les sous-périodes disparaissent à nouveau
      expect(screen.queryByText('Période 1 (Septembre)')).toBeNull()
    })

    it('supporte defaultExpandedAll={true}', () => {
      render(
        <ResponsiveDataTable
          columns={columns}
          data={groupData}
          childrenField="periodes"
          defaultExpandedAll={true}
        />
      )

      // Déplié immédiatement
      expect(screen.getByText('Période 1 (Septembre)')).toBeDefined()
    })
  })

  // ── 5. Mode Serveur (serverSide={true}) ──────────────────────────────────
  describe('Mode Serveur (serverSide={true})', () => {
    it('ne découpe pas les données lorsque serverSide est activé', () => {
      // Données partielles de 2 items reçus d'une API, total 100 en base
      const serverData = [
        { id: 1, nom: 'Item 1', prix: 10, categorie: 'X' },
        { id: 2, nom: 'Item 2', prix: 20, categorie: 'X' },
      ]

      render(
        <ResponsiveDataTable
          columns={columns}
          data={serverData}
          serverSide={true}
          pagination={{ page: 3, perPage: 2, total: 100 }}
        />
      )

      // Les données ne sont pas re-découpées client-side
      expect(screen.getByText('Item 1')).toBeDefined()
      expect(screen.getByText('Item 2')).toBeDefined()
      // Le footer affiche correctement la page 3 du serveur
      expect(screen.getByText('(3 / 50)')).toBeDefined()
      expect(screen.getByText('5–6 sur 100', { exact: false })).toBeDefined()
    })
  })

  // ── 6. Unicité des clés de lignes avec clés étrangères ────────────────────
  describe('Unicité des clés', () => {
    it('rend correctement sans clé en double lorsque plusieurs éléments partagent une même clé étrangère', () => {
      const payments = [
        { id_paiement_abonnement: 101, id_souscription_abonnement: 18, montant: 5000 },
        { id_paiement_abonnement: 102, id_souscription_abonnement: 18, montant: 5000 },
        { id_paiement_abonnement: 103, id_souscription_abonnement: 18, montant: 5000 },
      ]

      const paymentCols = [
        { field: 'id_paiement_abonnement', headerName: 'ID' },
        { field: 'montant', headerName: 'Montant' },
      ]

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <ResponsiveDataTable
          columns={paymentCols}
          data={payments}
        />
      )

      expect(screen.getByText('101')).toBeDefined()
      expect(screen.getByText('102')).toBeDefined()
      expect(screen.getByText('103')).toBeDefined()

      // Aucun avertissement de clé en double dans la console React
      const duplicateKeyWarnings = consoleSpy.mock.calls.filter(call =>
        typeof call[0] === 'string' && call[0].includes('Encountered two children with the same key')
      )
      expect(duplicateKeyWarnings).toHaveLength(0)

      consoleSpy.mockRestore()
    })
  })

  // ── 7. Arborescence multi-niveaux (Depth 0 ➔ Depth 1 ➔ Depth 2) ───────────
  describe('Arborescence multi-niveaux (jusqu’à 3 niveaux)', () => {
    interface TreeItem {
      id: string
      label: string
      valeur: string
      enfants?: TreeItem[]
    }

    const multiLevelData: TreeItem[] = [
      {
        id: 'collab_1',
        label: 'Jean Dupont (Collaborateur)',
        valeur: '2 abonnements',
        enfants: [
          {
            id: 'sub_1',
            label: 'Abonnement Gym Pro',
            valeur: '15 000 FCFA/mois',
            enfants: [
              { id: 'ech_1', label: 'Échéance Janvier 2026', valeur: 'Payée' },
              { id: 'ech_2', label: 'Échéance Février 2026', valeur: 'En attente' },
            ],
          },
        ],
      },
    ]

    const treeCols: Column<TreeItem>[] = [
      { field: 'label', headerName: 'Libellé' },
      { field: 'valeur', headerName: 'Détails' },
    ]

    it('déplie successivement le niveau 0 puis le niveau 1 pour révéler le niveau 2', () => {
      render(
        <ResponsiveDataTable
          columns={treeCols}
          data={multiLevelData}
          childrenField="enfants"
        />
      )

      // N0 visible
      expect(screen.getByText('Jean Dupont (Collaborateur)')).toBeDefined()
      // N1 et N2 non visibles
      expect(screen.queryByText('Abonnement Gym Pro')).toBeNull()
      expect(screen.queryByText('Échéance Janvier 2026')).toBeNull()

      // Déplier N0
      const expandButtons = screen.getAllByLabelText('Déplier')
      fireEvent.click(expandButtons[0])

      // N1 est maintenant visible
      expect(screen.getByText('Abonnement Gym Pro')).toBeDefined()
      // N2 toujours pas visible
      expect(screen.queryByText('Échéance Janvier 2026')).toBeNull()

      // Déplier N1 (le 2ème bouton déplier apparu)
      const subExpandButtons = screen.getAllByLabelText('Déplier')
      fireEvent.click(subExpandButtons[0]) // bouton du sous-niveau

      // N2 est maintenant visible
      expect(screen.getByText('Échéance Janvier 2026')).toBeDefined()
      expect(screen.getByText('Échéance Février 2026')).toBeDefined()
    })
  })
})

