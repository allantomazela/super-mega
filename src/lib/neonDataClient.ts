import { createClient } from '@neondatabase/neon-js'
import { authClient } from '@/lib/authClient'

/** PostgREST / Neon Data API (público; proteção via JWT + RLS). */
export const NEON_DATA_API_URL =
  import.meta.env.VITE_NEON_DATA_API_URL ??
  'https://ep-small-paper-acm07pmb.apirest.sa-east-1.aws.neon.tech/neondb/rest/v1'

type AuthWithJwt = typeof authClient & {
  getJWTToken?: () => Promise<string | null | undefined>
}

/**
 * Cliente Data API. Reusa o JWT da sessão Neon Auth já aberta no app.
 * Não expõe DATABASE_URL no browser.
 */
export const neonData = createClient({
  dataApi: {
    url: NEON_DATA_API_URL,
    getToken: async () => {
      const token = await (authClient as AuthWithJwt).getJWTToken?.()
      return token ?? null
    },
  },
})
