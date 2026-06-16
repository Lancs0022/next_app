import { PlusIcon } from '@/components/icons/Icons'

const PageHeader = ({ 
  title, 
  onCreateClick,
  createButtonText = 'Créer',
  showCreateButton = true 
}: {
  title?: React.ReactNode
  onCreateClick?: () => void
  createButtonText?: string
  showCreateButton?: boolean
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-navy-dark">{title}</h1>
      
      {showCreateButton && (
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-strong text-white rounded-lg transition-colors font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          {createButtonText}
        </button>
      )}
    </div>
  )
}

export default PageHeader
