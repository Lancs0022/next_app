import axios from 'axios'
import { logApi } from '@/lib/logger'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Envoie les cookies automatiquement (same-origin)
})

// ─── Intercepteur de requête : horodatage pour mesurer la durée ──────────────
api.interceptors.request.use((config) => {
  // Stocke le timestamp de départ sur l'objet config pour le calculer en réponse
  ;(config as typeof config & { _startAt?: number })._startAt = Date.now()
  logApi(config.method ?? 'GET', config.url ?? '')
  return config
})

// ─── Intercepteur de réponse ─────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    const cfg = response.config as typeof response.config & { _startAt?: number }
    const duration = cfg._startAt !== undefined ? Date.now() - cfg._startAt : undefined
    logApi(
      response.config.method ?? 'GET',
      response.config.url ?? '',
      response.status,
      duration
    )
    return response
  },
  (error) => {
    const cfg = error.config as (typeof error.config & { _startAt?: number }) | undefined
    const duration = cfg?._startAt !== undefined ? Date.now() - cfg._startAt : undefined
    logApi(
      error.config?.method ?? 'GET',
      error.config?.url ?? '',
      error.response?.status,
      duration
    )

    // Redirection vers /login sur 401 (session expirée)
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api
