import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authClient, appCallbackUrl } from '@/lib/authClient'

export interface AuthUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type SessionPayload = {
  user?: AuthUser
  session?: { id: string }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    void (async () => {
      try {
        const result = (await authClient.getSession({ query: {} })) as {
          data: SessionPayload | null
        }
        if (!ativo) return
        setUser(result.data?.user ?? null)
      } finally {
        if (ativo) setLoading(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  async function signInGoogle() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: appCallbackUrl(),
    })
  }

  async function signOut() {
    await authClient.signOut({})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
