'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/Toast/ToastContainer'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { showToast, dismissToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const toastId = showToast('Connexion en cours...', 'loading')
    try {
      await login(email, password)
      dismissToast(toastId)
      showToast('Connexion réussie ! Redirection...', 'success')
      // Navigation complète pour que le cookie httpOnly soit bien pris en compte par le proxy
      window.location.assign('/dashboard')
    } catch (err) {
      const e = err as Error
      dismissToast(toastId)
      showToast(e.message || 'Erreur de connexion', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-dark via-navy-dark to-navy p-4 md:p-6">
      {/* Card */}
      <div className="w-full max-w-[460px] rounded-2xl shadow-2xl overflow-hidden bg-slate-800">

        {/* Header */}
        <div className="flex flex-col items-center pt-8 md:pt-12 px-4 md:px-10">
          {/* Logo */}
          <div className="w-[72px] h-[72px] rounded-xl flex items-center justify-center shadow-lg bg-primary mb-6">
            <span className="font-extrabold leading-none text-4xl text-navy-dark">P</span>
          </div>

          <h1 className="font-bold tracking-tight text-2xl text-slate-100 mb-2">
            PEJAA Admin
          </h1>
          <p className="text-sm text-slate-400">
            Connectez-vous pour continuer
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} method="post" className="mt-8 px-4 md:px-10">

          {/* Email field */}
          <div className="mb-5">
            <label className="block font-semibold text-[13px] text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input w-full h-11 rounded-lg px-5 text-sm bg-slate-900 border border-slate-700 text-slate-100 outline-none transition-shadow"
              placeholder="admin@pejaa.com"
              disabled={loading}
            />
          </div>

          {/* Password field */}
          <div className="mb-7">
            <label className="block font-semibold text-[13px] text-slate-300 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input w-full h-11 rounded-lg pl-5 pr-12 text-sm bg-slate-900 border border-slate-700 text-slate-100 outline-none transition-shadow"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center justify-center w-6 h-6 text-slate-500 transition-colors"
                disabled={loading}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="login-btn w-full h-12 rounded-lg font-semibold text-sm bg-primary text-navy-dark mb-8 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connexion...
              </span>
            ) : 'Se connecter'}
          </button>
        </form>

        {/* Test accounts footer */}
        <div className="border-t border-slate-700 bg-slate-800/50 px-4 md:px-10 py-5 md:py-6">
          <p className="text-center font-medium uppercase tracking-wider text-[11px] text-slate-500 mb-3">
            Comptes de test
          </p>
          <div className="flex flex-col items-center gap-1.5">
            <p className="font-mono text-xs text-slate-400">
              admin@pejaa.com <span className="text-slate-600">/</span> Pejaa2026
            </p>
            <p className="font-mono text-xs text-slate-400">
              employe@pejaa.com <span className="text-slate-600">/</span> Pejaa2026
            </p>
            <p className="font-mono text-xs text-slate-400">
              Lancs0022@gmail.com <span className="text-slate-600">/</span> Lancs0022
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
