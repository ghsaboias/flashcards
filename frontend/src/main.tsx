import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { GlobalSessionProvider } from './providers/GlobalSessionProvider'
import { NavigationGuardProvider } from './components/NavigationGuard'
import { router } from './router'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <GlobalSessionProvider>
        <NavigationGuardProvider>
          <RouterProvider router={router} />
        </NavigationGuardProvider>
      </GlobalSessionProvider>
    </AppProvider>
  </StrictMode>,
)
