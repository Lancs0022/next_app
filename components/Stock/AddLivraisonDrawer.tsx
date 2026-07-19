'use client'

import Drawer from '@/components/Drawer/Drawer'
import DynamicEntrySession from '@/components/DynamicEntry/DynamicEntrySession'
import type { ProductOption } from '@/lib/dynamicEntry/types'

interface Collaborateur {
  id_collaborateur: string | number
  nom: string
}

interface PointVente {
  id_pdv: string | number
  nom: string
}

interface ProduitCatalogue {
  value: string | number
  label: string
  id_collaborateur?: string | number
}

interface AddLivraisonDrawerProps {
  open: boolean
  onClose: () => void
  collaborateurs: Collaborateur[]
  pointsVente: PointVente[]
  produitsCatalogue: ProduitCatalogue[]
  onQuickAddClick?: () => void
  onSyncSuccess?: () => void
  onSyncError?: (msg: string) => void
}

const AddLivraisonDrawer = ({
  open,
  onClose,
  collaborateurs,
  pointsVente,
  produitsCatalogue,
  onQuickAddClick,
  onSyncSuccess,
  onSyncError,
}: AddLivraisonDrawerProps) => {
  const catalogueWithCollab: ProductOption[] = produitsCatalogue.map(p => ({
    value: p.value,
    label: p.label,
    id_collaborateur: p.id_collaborateur,
  }))

  return (
    <Drawer
      open={open}
      title="Saisie Globale des Livraisons"
      onClose={onClose}
      fullScreen
    >
      <div className="h-full -mx-4 md:-mx-6">
        <DynamicEntrySession
          module="livraison"
          title="Saisie Globale des Livraisons"
          collaborateurs={collaborateurs}
          pointsVente={pointsVente}
          produitsCatalogue={catalogueWithCollab}
          onQuickAddProduct={onQuickAddClick}
          onSyncSuccess={onSyncSuccess}
          onSyncError={onSyncError}
        />
      </div>
    </Drawer>
  )
}

export default AddLivraisonDrawer
