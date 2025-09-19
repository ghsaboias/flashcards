// Navigation guard component that enhances the router with session protection

import { type ReactNode } from 'react'
import { useNavigationGuard } from '../hooks/useNavigationGuard'
import { useNavigationGuardContext } from '../hooks/useNavigationGuardContext'
import { NavigationGuardContext } from '../contexts/NavigationGuardContext'
import type { NavigationGuardContextValue } from '../contexts/NavigationGuardContext'

interface NavigationGuardProviderProps {
  children: ReactNode
  enabled?: boolean
  autoSave?: boolean
}

export function NavigationGuardProvider({
  children,
  enabled = true,
  autoSave = true
}: NavigationGuardProviderProps) {
  const { promptNavigation, saveSessionState, clearSessionState } = useNavigationGuard({
    enabled,
    autoSave
  })

  const contextValue: NavigationGuardContextValue = {
    navigateWithGuard: promptNavigation,
    saveSession: saveSessionState,
    clearSession: clearSessionState
  }

  return (
    <NavigationGuardContext.Provider value={contextValue}>
      {children}
    </NavigationGuardContext.Provider>
  )
}


// Enhanced navigation button component with guard protection
interface GuardedNavigationButtonProps {
  to: string
  force?: boolean
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}

export function GuardedNavigationButton({
  to,
  force = false,
  children,
  className = '',
  disabled = false,
  onClick
}: GuardedNavigationButtonProps) {
  const { navigateWithGuard } = useNavigationGuardContext()

  const handleClick = async () => {
    if (onClick) {
      onClick()
    }

    await navigateWithGuard(to, { force })
  }

  return (
    <button
      className={className}
      disabled={disabled}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

// Enhanced navigation link component with guard protection
interface GuardedNavigationLinkProps {
  to: string
  force?: boolean
  children: ReactNode
  className?: string
}

export function GuardedNavigationLink({
  to,
  force = false,
  children,
  className = ''
}: GuardedNavigationLinkProps) {
  const { navigateWithGuard } = useNavigationGuardContext()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    await navigateWithGuard(to, { force })
  }

  return (
    <a href={to} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}