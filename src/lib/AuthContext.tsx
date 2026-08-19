import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authClient, appCallbackUrl, limparVerifierGuardado } from '@/lib/authClient'

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

async function buscarSessao(): Promise<AuthUser | null> {
  try {
    const result = (await authClient.getSession({ query: {} })) as {
      data: SessionPayload | null
    }
    return result.data?.user ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    void (async () => {
      try {
        for (let i = 0; i < 4; i++) {
          const atual = await buscarSessao()
          if (!ativo) return
          setUser(atual)
          if (atual) {
            limparVerifierGuardado()
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 400))
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
    try {
      await authClient.signOut({})
    } catch {
      /* sessão já encerrada */
    }
    limparVerifierGuardado()
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
