const Box = ({ 
  children, 
  title, 
  subtitle, 
  actions,
  className = '',
  padding = 'p-6',
  border = true,
  shadow = true,
  hover = false
}: {
  children?: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  padding?: string
  border?: boolean
  shadow?: boolean
  hover?: boolean
}) => {
  const baseClasses = `
    bg-white dark:bg-slate-800
    ${border ? 'border border-slate-200 dark:border-slate-700' : ''}
    ${shadow ? 'shadow-sm' : ''}
    ${hover ? 'hover:shadow-md transition-shadow' : ''}
    rounded-lg
    ${padding}
    ${className}
  `

  return (
    <div className={baseClasses}>
      {/* Header */}
      {(title || subtitle || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-navy-dark dark:text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

export default Box
