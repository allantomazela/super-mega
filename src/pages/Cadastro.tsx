import { AuthGoogleScreen } from '@/components/AuthGoogleScreen'

/** Cadastro via Google (Neon Auth). Primeiro acesso cria o perfil automaticamente. */
export default function Cadastro() {
  return <AuthGoogleScreen modo="cadastro" />
}
