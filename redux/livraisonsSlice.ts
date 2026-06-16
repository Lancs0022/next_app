import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '@/services/api'

export const fetchLivraisons = createAsyncThunk(
  'livraisons/fetchLivraisons',
  async (params: Record<string, unknown> | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/livraisons', { params })
      return data
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      return rejectWithValue(err?.response?.data?.error || err?.message || 'Erreur chargement livraisons')
    }
  }
)

interface LivraisonsState {
  items: unknown[]
  page: number
  limit: number
  total: number
  totalPages: number
  loading: boolean
  error: string | null
  lastParams: Record<string, unknown> | null
}

const initialState: LivraisonsState = {
  items: [],
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  loading: false,
  error: null,
  lastParams: null,
}

const livraisonsSlice = createSlice({
  name: 'livraisons',
  initialState,
  reducers: {
    setLivraisonsParams: (state, action) => {
      state.lastParams = action.payload || null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLivraisons.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchLivraisons.fulfilled, (state, action) => {
        const payload = (action.payload as LivraisonsState) || {}
        state.items = payload.items || []
        state.page = payload.page || 1
        state.limit = payload.limit || 20
        state.total = payload.total || 0
        state.totalPages = payload.totalPages || 0
        state.loading = false
      })
      .addCase(fetchLivraisons.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || action.error?.message || 'Erreur chargement livraisons'
      })
  },
})

export const { setLivraisonsParams } = livraisonsSlice.actions
export default livraisonsSlice.reducer
