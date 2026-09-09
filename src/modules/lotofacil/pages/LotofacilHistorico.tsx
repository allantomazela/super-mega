import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft,
  CloudOff,
  History,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useHistoricoLotofacilNeon } from '@/modules/lotofacil/hooks/useHistoricoLotofacilNeon'
import { formatTwoDigits } from '@/modules/lotofacil/utils/math/combinacoes'
import { labelPremioLotofacil } from '@/modules/lotofacil/utils/math/probabilidade'
import type { JogoLotofacilSalvo } from '@/modules/lotofacil/services/historicoJogosNeon'

export default function LotofacilHistorico() {
  const { jogos, carregando, erro, recarregar, remover, conferirPendentes } =
    useHistoricoLotofacilNeon()
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'conferido'>('todos')
  const [conferindo, setConferindo] = useState(false)

  const lista =
    filtro === 'todos' ? jogos : jogos.filter((j) => j.status === filtro)

  const pendentes = jogos.filter((j) => j.status === 'pendente').length

  async function onConferir() {
    setConferindo(true)
    try {
      const r = await conferirPendentes()
      if (r.conferidos === 0) {
        toast.message('Nenhum pendente elegível para conferir agora.')
      } else {
        toast.success(`${r.conferidos} jogo(s) conferidos no concurso ${r.concurso}.`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na conferência.')
    } finally {
      setConferindo(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <section className="surface-card rounded-2xl p-4 sm:p-5 border border-violet-500/20 space-y-3">
        <Link
          to="/lotofacil"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 text-violet-400" />
          Voltar à Lotofácil
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white inline-flex items-center gap-2">
              <History className="w-5 h-5 text-violet-400" />
              Meu histórico Lotofácil
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Jogos salvos na nuvem (Neon), isolados por sua conta Google. Pendentes são conferidos
              automaticamente ao abrir a Lotofácil após o sorteio; use “Conferir pendentes” se
              quiser forçar agora. Premiação do app: somente 15 pontos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void recarregar()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#262c34] text-xs text-zinc-300 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
            <button
              type="button"
              disabled={conferindo || pendentes === 0}
              onClick={() => void onConferir()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold"
            >
              {conferindo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              Conferir pendentes ({pendentes})
            </button>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-[#0f1318] border border-[#262c34] w-fit">
          {([
            ['todos', 'Todos'],
            ['pendente', 'Pendentes'],
            ['conferido', 'Conferidos'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold ${
                filtro === id
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {erro ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200 inline-flex items-start gap-2">
          <CloudOff className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      ) : null}

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando da Neon…
        </div>
      ) : lista.length === 0 ? (
        <div className="surface-card rounded-2xl p-6 border border-[#262c34] text-center space-y-2">
          <p className="text-zinc-300 text-sm">Nenhum jogo neste filtro.</p>
          <p className="text-xs text-zinc-500">
            Gere volantes em Resultados, marque os que quiser e salve na nuvem.
          </p>
          <Link
            to="/lotofacil"
            className="inline-flex mt-2 text-sm font-bold text-violet-300 hover:text-violet-200"
          >
            Ir para Lotofácil
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((j) => (
            <JogoCard key={j.id} jogo={j} onRemover={remover} />
          ))}
        </div>
      )}
    </div>
  )
}

function JogoCard({
  jogo,
  onRemover,
}: {
  jogo: JogoLotofacilSalvo
  onRemover: (id: string) => Promise<void>
}) {
  const [removendo, setRemovendo] = useState(false)
  const premio =
    jogo.resultado_acertos != null ? labelPremioLotofacil(jogo.resultado_acertos) : null

  return (
    <article className="surface-card rounded-xl p-3.5 border border-[#262c34] space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`px-2 py-0.5 rounded-md font-bold ${
                jogo.status === 'pendente'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-300'
              }`}
            >
              {jogo.status}
            </span>
            {jogo.concurso_alvo != null ? (
              <span className="text-zinc-500">Alvo #{jogo.concurso_alvo}</span>
            ) : null}
            {jogo.afinidade_previsao != null ? (
              <span className="text-fuchsia-300 font-bold">
                {Number(jogo.afinidade_previsao).toFixed(0)}% afinidade
              </span>
            ) : null}
            {jogo.score_filtros != null ? (
              <span className="text-zinc-500">Score {Number(jogo.score_filtros).toFixed(0)}%</span>
            ) : null}
          </div>
          <p className="text-[10px] text-zinc-500">
            {new Date(jogo.created_at).toLocaleString('pt-BR')} · {jogo.modo}
          </p>
        </div>
        <button
          type="button"
          disabled={removendo}
          onClick={() => {
            void (async () => {
              setRemovendo(true)
              try {
                await onRemover(jogo.id)
                toast.success('Removido.')
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Erro ao remover')
              } finally {
                setRemovendo(false)
              }
            })()
          }}
          className="text-zinc-500 hover:text-red-400"
          title="Remover"
        >
          {removendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {jogo.dezenas.map((n) => {
          const hit = jogo.resultado_acertadas?.includes(n)
          return (
            <span
              key={n}
              className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center ${
                hit
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-950/60 border border-violet-500/30 text-violet-200'
              }`}
            >
              {formatTwoDigits(n)}
            </span>
          )
        })}
      </div>

      {jogo.status === 'conferido' ? (
        <p className="text-xs text-zinc-300">
          Concurso {jogo.resultado_concurso}:{' '}
          <strong className="text-white">{jogo.resultado_acertos} acertos</strong>
          {premio ? <span className="text-emerald-400"> · {premio}</span> : null}
        </p>
      ) : jogo.retrospectiva ? (
        <p className="text-[10px] text-zinc-500">
          Retrospectiva ({jogo.retrospectiva.janela}): melhor {jogo.retrospectiva.melhor} · 15 pts
          em {jogo.retrospectiva.vezesPremio}×
        </p>
      ) : null}
    </article>
  )
}
