import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { GlobalSessionProvider } from './providers/GlobalSessionProvider'
import { router } from './router'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <GlobalSessionProvider>
        <RouterProvider router={router} />
      </GlobalSessionProvider>
    </AppProvider>
  </StrictMode>,
)
