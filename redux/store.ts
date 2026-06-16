import { configureStore } from '@reduxjs/toolkit'
import livraisonsReducer from './livraisonsSlice'

export const store = configureStore({
  reducer: {
    livraisons: livraisonsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
