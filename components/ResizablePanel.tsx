'use client'

import { useResizableHeight } from '@/hooks/useResizableHeight'

interface ResizablePanelProps {
  storageKey: string
  defaultHeight?: number
  minHeight?: number
  maxHeight?: number
  children: React.ReactNode
  className?: string
}

export default function ResizablePanel({
  storageKey,
  defaultHeight = 320,
  minHeight = 200,
  maxHeight = 720,
  children,
  className = '',
}: ResizablePanelProps) {
  const { height, startResize, isDragging } = useResizableHeight(
    storageKey,
    defaultHeight,
    minHeight,
    maxHeight
  )

  return (
    <div
      className={`flex flex-col min-h-0 overflow-hidden ${className}`}
      style={{ height }}
    >
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {children}
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Redimensionner la zone"
        onMouseDown={(e) => startResize(e.clientY)}
        className={`h-2 shrink-0 cursor-row-resize border-t border-slate-600 transition-colors ${
          isDragging ? 'bg-indigo-500/50' : 'bg-slate-700 hover:bg-slate-600'
        }`}
      />
    </div>
  )
}
