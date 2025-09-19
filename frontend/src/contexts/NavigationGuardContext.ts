// Navigation guard context definition

import { createContext } from 'react'

export interface NavigationGuardContextValue {
  navigateWithGuard: (to: string, options?: { force?: boolean }) => Promise<boolean>
  saveSession: () => void
  clearSession: () => void
}

export const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null)