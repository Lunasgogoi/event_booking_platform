import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'

function AccessCheck() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-slate-500">Checking access...</p>
    </main>
  )
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <AccessCheck />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export function AdminRoute({ children }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth()

  if (isBootstrapping) {
    return <AccessCheck />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/events" replace />
  }

  return children
}

export function OrganizerRoute({ children }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth()

  if (isBootstrapping) {
    return <AccessCheck />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'organizer') {
    return <Navigate to="/settings" replace />
  }

  return children
}
