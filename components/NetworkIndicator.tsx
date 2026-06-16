'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const NetworkIndicator = () => {
  const isOnline = useOnlineStatus()

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs text-slate-600 dark:text-slate-400">
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </span>
    </div>
  )
}

export default NetworkIndicator
