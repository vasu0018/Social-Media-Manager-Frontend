import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'

type Session = {
  email: string
  name: string
}

type AuthContextValue = {
  user: Session | null
  ready: boolean
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    api<{ user: Session | null }>('/api/auth/session')
      .then((data) => {
        if (active) setUser(data.user)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      login: async (email, password) => {
        try {
          const data = await api<{ user: Session }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          })
          setUser(data.user)
          return null
        } catch (error) {
          return error instanceof Error ? error.message : 'Email or password is incorrect.'
        }
      },
      logout: async () => {
        await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
        setUser(null)
      },
    }),
    [ready, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
