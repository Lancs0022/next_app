'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export type ColorTheme = 'soleil' | 'ocean'

export const COLOR_THEMES: { id: ColorTheme; label: string; colors: string[] }[] = [
  { id: 'soleil', label: 'Soleil', colors: ['#FFB116', '#FC9100', '#003051'] },
  { id: 'ocean', label: 'Océan', colors: ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'] },
]

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme doit être utilisé dans un ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false)
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('soleil')

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDark = localStorage.getItem('pejaa-theme')
      if (savedDark) {
        setIsDark(savedDark === 'dark')
      } else {
        setIsDark(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
      }
      const savedColor = localStorage.getItem('pejaa-color-theme') as ColorTheme | null
      if (savedColor && COLOR_THEMES.some(t => t.id === savedColor)) {
        setColorThemeState(savedColor)
      }
    }
  }, [])

  // Apply dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pejaa-theme', isDark ? 'dark' : 'light')
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [isDark])

  // Apply color theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pejaa-color-theme', colorTheme)
      document.documentElement.setAttribute('data-color-theme', colorTheme)
    }
  }, [colorTheme])

  const toggleTheme = () => setIsDark(!isDark)

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme)
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
