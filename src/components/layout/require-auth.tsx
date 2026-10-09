import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'

export function RequireAuth() {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function GuestOnly() {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
