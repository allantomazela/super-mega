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
        for (let i = 0; i < 4; i++) {
          const result = (await authClient.getSession({ query: {} })) as {
            data: SessionPayload | null
          }
          if (!ativo) return
          const atual = result.data?.user ?? null
          setUser(atual)
          if (atual) break
          await new Promise((resolve) => setTimeout(resolve, 250))
        }
      } finally {
        if (ativo) setLoading(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  async function signInGoogle() {
    const callbackURL = appCallbackUrl()
    await authClient.signIn.social({
      provider: 'google',
      callbackURL,
      errorCallbackURL: callbackURL,
      newUserCallbackURL: callbackURL,
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
