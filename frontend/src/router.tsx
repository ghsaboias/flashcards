import { createBrowserRouter } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PracticePage from './pages/PracticePage'
import SessionPage from './pages/SessionPage'
import CompletePage from './pages/CompletePage'
import StatsPage from './pages/StatsPage'
import BrowsePage from './pages/BrowsePage'
import DrawingPage from './pages/DrawingPage'
import ErrorPage from './pages/ErrorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
    errorElement: <ErrorPage />
  },
  {
    path: '/practice',
    element: <PracticePage />,
    errorElement: <ErrorPage />
  },
  {
    path: '/session/:id',
    element: <SessionPage />,
    errorElement: <ErrorPage />
  },
  {
    path: '/complete/:id',
    element: <CompletePage />,
    errorElement: <ErrorPage />
  },
  {
    path: '/stats',
    element: <StatsPage />,
    errorElement: <ErrorPage />
  },
  {
    path: '/browse/:set',
    element: <BrowsePage />,
    errorElement: <ErrorPage />
  },
  {
    path: '/drawing/:set',
    element: <DrawingPage />,
    errorElement: <ErrorPage />
  },
  {
    path: '*',
    element: <ErrorPage />
  }
])