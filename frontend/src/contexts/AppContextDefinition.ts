import { createContext } from 'react'
import type { Domain } from '../types/api-types'

interface AppContextState {
  selectedDomain: Domain | null
  setSelectedDomain: (domain: Domain | null) => void
}

export const AppContext = createContext<AppContextState | undefined>(undefined)