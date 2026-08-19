import { PostAuthRedirect } from '@/components/PostAuthRedirect'

/** Mantido por compatibilidade: o 404 do app redireciona para home ou login. */
export default function NotFound() {
  return <PostAuthRedirect />
}
