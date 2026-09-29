interface PaginationDesktopProps {
  internalPerPage: number
  rowsPerPageOptions: number[]
  onPageSizeChange: (size: number) => void
  safePage: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function PaginationDesktop({
  internalPerPage,
  rowsPerPageOptions,
  onPageSizeChange,
  safePage,
  totalPages,
  totalCount,
  onPageChange,
}: PaginationDesktopProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">Lignes par page:</span>
        <select
          value={internalPerPage}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          {rowsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {totalCount > 0 ? (safePage - 1) * internalPerPage + 1 : 0}–
          {Math.min(safePage * internalPerPage, totalCount)} sur {totalCount}
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
            ({safePage} / {totalPages})
          </span>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Page précédente"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5 text-slate-600 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Page suivante"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5 text-slate-600 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

interface PaginationMobileProps {
  internalPerPage: number
  rowsPerPageOptions: number[]
  onPageSizeChange: (size: number) => void
  safePage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PaginationMobile({
  internalPerPage,
  rowsPerPageOptions,
  onPageSizeChange,
  safePage,
  totalPages,
  onPageChange,
}: PaginationMobileProps) {
  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <select
          value={internalPerPage}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          {rowsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Page précédente"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4 text-slate-600 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Page suivante"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4 text-slate-600 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
