'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface DbUser {
  id_utilisateur: number
  nom: string
  prenom: string
  email: string
  role: string
  tenant_id: number
}

interface AuthContextType {
  currentUser: DbUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<DbUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialiser la session depuis le cookie via /api/auth/me
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const { user } = await res.json()
          setCurrentUser(user)
        }
      } catch {
        // session invalide ou absente
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const login = async (email: string, password: string): Promise<DbUser> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Erreur de connexion')
    }
    const { user } = await res.json()
    setCurrentUser(user)
    return user
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setCurrentUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
