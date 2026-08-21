import React, { useState } from 'react'
import {
  History,
  Trash2,
  ChevronDown,
  ChevronRight,
  Trophy,
  Calendar,
  Ticket,
  Hash,
} from 'lucide-react'
import { formatTwoDigits, formatGameString } from '@/lib/megaEngine'
import { useHistoricoConferencias, ConferenciaRealizada } from '@/hooks/useHistoricoConferencias'

/* ============================================================
 * HistoricoConferencias — lista de conferências passadas
 * salvas no localStorage, com opção de expandir para ver
 * detalhes e botão "Limpar Histórico".
 * ============================================================ */

interface HistoricoConferenciasProps {
  /** Hook já inicializado (compartilhado com a página). */
  historico: ConferenciaRealizada[]
  onLimpar: () => void
}

function formatarData(iso: string): string {
  try {
    const d = new Date(iso)
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ano = d.getFullYear()
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${ano} às ${h}:${m}`
  } catch {
    return iso
  }
}

export const HistoricoConferencias: React.FC<HistoricoConferenciasProps> = ({
  historico,
  onLimpar,
}) => {
  const [expandido, setExpandido] = useState<string | null>(null)

  const toggle = (id: string) => {
    setExpandido((prev) => (prev === id ? null : id))
  }

  const modoLabel: Record<string, string> = {
    desdobramento: 'Desdobramento',
    'cinco-jogos': '5 Jogos',
    torneio: 'Torneio',
  }

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-[#262c34] shadow-lg space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 border-b border-[#262c34] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              📋 Histórico de Conferências
            </h3>
            <p className="text-xs text-zinc-400">
              {historico.length > 0
                ? `${historico.length} conferência${historico.length > 1 ? 's' : ''} salva${historico.length > 1 ? 's' : ''} localmente`
                : 'Nenhuma conferência salva ainda'}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Dados só desta conta (perfil privado)
            </p>
          </div>
        </div>

        {historico.length > 0 && (
          <button
            type="button"
            onClick={onLimpar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-xs font-semibold text-red-300 hover:text-white hover:bg-red-900/50 hover:border-red-400 transition-colors"
            title="Limpar todo o histórico de conferências"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Histórico</span>
          </button>
        )}
      </div>

      {/* Lista */}
      {historico.length === 0 ? (
        <div className="text-center py-8 text-sm text-zinc-500">
          <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Realize uma conferência com um sorteio para vê-la aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {historico.map((conf) => {
            const isOpen = expandido === conf.id
            const maxAcertos = Math.max(0, ...conf.jogos.map((j) => j.acertos))
            const comQuatroMais = conf.jogos.filter((j) => j.acertos >= 4).length
            return (
              <div
                key={conf.id}
                className="rounded-xl border border-[#262c34] bg-[#161a1f] overflow-hidden transition-colors hover:border-[#333a44]"
              >
                {/* Linha de resumo (clicável) */}
                <button
                  type="button"
                  onClick={() => toggle(conf.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#1a1f2b] transition-colors"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">
                        {modoLabel[conf.modo] ?? conf.modo}
                      </span>
                      {conf.grupo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-semibold">
                          {conf.grupo}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatarData(conf.data)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {conf.dezenasSorteadas.map((n) => (
                        <span
                          key={n}
                          className="px-1.5 py-0.5 rounded bg-[#1a1f2b] border border-[#262c34] text-zinc-300 font-mono text-[10px] font-bold"
                        >
                          {formatTwoDigits(n)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Ticket className="w-3 h-3" />
                      {conf.jogos.length} jogo{conf.jogos.length > 1 ? 's' : ''}
                    </span>
                    {maxAcertos > 0 && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          maxAcertos >= 4
                            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                            : 'bg-[#1a1f2b] border-[#262c34] text-zinc-400'
                        }`}
                      >
                        <Trophy className="w-3 h-3" />
                        {maxAcertos} máx
                      </span>
                    )}
                    {comQuatroMais > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                        {comQuatroMais}≥4
                      </span>
                    )}
                  </div>
                </button>

                {/* Detalhes expandidos */}
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-[#262c34] animate-fade-in space-y-2">
                    {conf.jogos.map((j, idx) => {
                      const isMelhor = j.acertos === maxAcertos && maxAcertos > 0
                      const setAcertadas = new Set(j.acertadas)
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg p-2.5 border ${
                            isMelhor
                              ? 'bg-emerald-950/30 border-emerald-500/50'
                              : 'bg-[#12161b] border-[#262c34]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                              <Hash className="w-3 h-3 text-emerald-400" />
                              Jogo #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                j.acertos >= 4
                                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                                  : j.acertos === 3
                                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                                    : 'bg-[#1a1f2b] border-[#262c34] text-zinc-400'
                              }`}
                            >
                              {j.acertos} {j.acertos === 1 ? 'acerto' : 'acertos'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {j.jogo.map((n) => {
                              const acertou = setAcertadas.has(n)
                              return (
                                <span
                                  key={n}
                                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                    acertou
                                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                      : 'bg-[#1a1f2b] border-[#262c34] text-zinc-500'
                                  }`}
                                >
                                  {formatTwoDigits(n)}
                                </span>
                              )
                            })}
                          </div>
                          <div className="mt-1.5 text-[9px] text-zinc-500 font-mono">
                            {formatGameString(j.jogo)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
