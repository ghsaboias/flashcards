// Hook for accessing navigation guard context

import { useContext } from 'react'
import { NavigationGuardContext, type NavigationGuardContextValue } from '../contexts/NavigationGuardContext'

export function useNavigationGuardContext(): NavigationGuardContextValue {
  const context = useContext(NavigationGuardContext)
  if (!context) {
    throw new Error('useNavigationGuardContext must be used within NavigationGuardProvider')
  }
  return context
}