'use client'

import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-navy-dark dark:text-white mt-4">
            Page non trouvée
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            La page que vous recherchez n&apos;existe pas ou n&apos;est pas encore disponible.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-navy-dark dark:text-white rounded-lg transition-colors font-medium cursor-pointer"
          >
            Retour
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-primary hover:bg-primary-strong text-white rounded-lg transition-colors font-medium cursor-pointer"
          >
            Aller au Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
