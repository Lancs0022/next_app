'use client'

import { useTheme, COLOR_THEMES } from '@/contexts/ThemeContext'

export default function ConfigPage() {
  const { isDark, toggleTheme, colorTheme, setColorTheme } = useTheme()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-dark dark:text-white">Paramètres avancés</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Configuration système et préférences globales
        </p>
      </div>

      <div className="grid gap-6">
        {/* Section Apparence */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-navy-dark dark:text-white mb-4">Apparence</h2>
          <div className="space-y-5">
            {/* Dark / Light mode */}
            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Mode d&apos;affichage</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Basculer entre le thème clair et sombre</p>
              </div>
              <button
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                {isDark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </button>
            </div>

            {/* Color theme selector */}
            <div className="py-3">
              <p className="font-medium text-slate-900 dark:text-white mb-1">Palette de couleurs</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Choisissez la palette de couleurs de l&apos;application</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COLOR_THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setColorTheme(theme.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      colorTheme === theme.id
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex -space-x-1">
                        {theme.colors.map((c, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-700 shadow-sm"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${colorTheme === theme.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                        {theme.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {theme.id === 'soleil' ? 'Doré, orange et bleu nuit' : 'Rouge, bleu foncé et tons chauds'}
                      </p>
                    </div>
                    {colorTheme === theme.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section Général */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-navy-dark dark:text-white mb-4">Général</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Nom de l&apos;application</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">PEJAA</p>
              </div>
              <button className="text-sm text-primary hover:text-primary-strong">Modifier</button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Version</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">1.0.0</p>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">À jour</span>
            </div>
          </div>
        </div>

        {/* Section Sécurité */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-navy-dark dark:text-white mb-4">Sécurité</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Politique de mots de passe</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">8 caractères minimum</p>
              </div>
              <button className="text-sm text-primary hover:text-primary-strong">Configurer</button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Session utilisateur</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">24 heures</p>
              </div>
              <button className="text-sm text-primary hover:text-primary-strong">Configurer</button>
            </div>
          </div>
        </div>

        {/* Section Sauvegarde */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-navy-dark dark:text-white mb-4">Sauvegarde</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Dernière sauvegarde</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Aucune sauvegarde automatique</p>
              </div>
              <button className="text-sm text-primary hover:text-primary-strong">Configurer</button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Export des données</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">CSV, JSON</p>
              </div>
              <button className="text-sm text-primary hover:text-primary-strong">Exporter</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
