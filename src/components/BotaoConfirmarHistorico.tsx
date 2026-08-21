import { useState } from 'react'
import { BookmarkPlus, Check } from 'lucide-react'
import { useHistoricoUsuario } from '@/hooks/useHistoricoUsuario'
import { toast } from 'sonner'

interface BotaoConfirmarHistoricoProps {
  modo: string
  jogos: number[][]
  concursoAlvo?: number
}

/** Salva volantes gerados no histórico pessoal (pendente de conferência). */
export function BotaoConfirmarHistorico({
  modo,
  jogos,
  concursoAlvo,
}: BotaoConfirmarHistoricoProps) {
  const { userId, confirmarJogos } = useHistoricoUsuario()
  const [ok, setOk] = useState(false)

  if (!userId || jogos.length === 0) return null

  function salvar() {
    const id = confirmarJogos({
      modo,
      jogos,
      concursoNumero: concursoAlvo,
    })
    if (!id) return
    setOk(true)
    toast.success('Jogos salvos no seu histórico', {
      description: `${jogos.length} volante${jogos.length === 1 ? '' : 's'} · só você vê no perfil.`,
    })
    window.setTimeout(() => setOk(false), 2500)
  }

  return (
    <button
      type="button"
      onClick={salvar}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-emerald-500/40 bg-emerald-950/40 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 hover:text-white transition-colors"
    >
      {ok ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
      {ok ? 'Salvo no histórico' : 'Confirmar no histórico'}
    </button>
  )
}
