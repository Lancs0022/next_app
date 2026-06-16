import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Envoie les cookies automatiquement (same-origin)
})

// Intercepteur de réponse : rediriger vers /login si 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isLoginPage = window.location.pathname.startsWith('/login')
      if (!isLoginPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
