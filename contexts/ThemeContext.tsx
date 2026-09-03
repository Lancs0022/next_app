'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export type ColorTheme = 'soleil' | 'ocean'

export const COLOR_THEMES: { id: ColorTheme; label: string; colors: string[] }[] = [
  { id: 'soleil', label: 'Soleil', colors: ['#FFB116', '#FC9100', '#003051'] },
  { id: 'ocean', label: 'Océan', colors: ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'] },
]

// isDark est null pendant le rendu SSR et le premier render client (avant
// que useEffect ait lu le DOM). Les composants qui en dépendent doivent
// traiter null comme "non encore résolu" et rendre un placeholder neutre.
interface ThemeContextType {
  isDark: boolean | null
  toggleTheme: () => void
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme doit être utilisé dans un ThemeProvider')
  return context
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // null = pas encore résolu (SSR + premier render client)
  // Le script inline dans layout.tsx a déjà posé la classe sur <html> —
  // les styles Tailwind dark: sont corrects dès le premier paint.
  // isDark sert uniquement à l'UI réactive (icônes, boutons).
  const [isDark, setIsDark] = useState<boolean | null>(null)
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('soleil')

  // Lecture du DOM après montage — source de vérité = classe posée par le script inline
  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark')
    setIsDark(dark)
    const savedColor = localStorage.getItem('pejaa-color-theme') as ColorTheme | null
    if (savedColor && COLOR_THEMES.some(t => t.id === savedColor)) {
      setColorThemeState(savedColor)
    }
  }, [])

  // Applique le dark mode SEULEMENT si isDark est résolu (non-null)
  // — évite de retirer la classe 'dark' posée par le script inline
  //   pendant le tout premier render où isDark vaut encore false.
  useEffect(() => {
    if (isDark === null) return
    localStorage.setItem('pejaa-theme', isDark ? 'dark' : 'light')
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Applique le color theme
  useEffect(() => {
    localStorage.setItem('pejaa-color-theme', colorTheme)
    document.documentElement.setAttribute('data-color-theme', colorTheme)
  }, [colorTheme])

  const toggleTheme = () => setIsDark(prev => !prev)

  const setColorTheme = (theme: ColorTheme) => setColorThemeState(theme)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
