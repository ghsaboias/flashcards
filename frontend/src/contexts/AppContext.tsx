import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Domain } from '../types/api-types'
import { AppContext } from './AppContextDefinition'

interface AppContextState {
  selectedDomain: Domain | null
  setSelectedDomain: (domain: Domain | null) => void
}

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)

  // Memoize context value to prevent unnecessary re-renders
  const value: AppContextState = useMemo(() => ({
    selectedDomain,
    setSelectedDomain
  }), [selectedDomain])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// Export component as default to satisfy eslint react-refresh rule
export default AppProvider