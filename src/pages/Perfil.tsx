import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import {
  User,
  History,
  Bookmark,
  Trash2,
  Trophy,
  Shield,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useHistoricoUsuario } from '@/hooks/useHistoricoUsuario'
import { labelPremio } from '@/lib/historicoUsuarioStorage'
import { formatGameString, formatTwoDigits } from '@/lib/megaEngine'
import { HistoricoConferencias } from '@/components/HistoricoConferencias'

function formatarData(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function Perfil() {
  const { user } = useAuth()
  const {
    conferencias,
    confirmados,
    limparConferencias,
    limparConfirmados,
    removerConfirmado,
  } = useHistoricoUsuario()
  const [aba, setAba] = useState<'confirmados' | 'conferencias'>('confirmados')

  const premiados = useMemo(
    () =>
      confirmados.filter(
        (c) => c.status === 'conferido' && (c.resultado?.melhorAcertos ?? 0) >= 4,
      ),
    [confirmados],
  )

  if (!user) return null

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="surface-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="w-16 h-16 rounded-2xl border border-emerald-500/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-8 h-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400/90 font-semibold">
              Perfil privado
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              {user.name ?? 'Apostador'}
            </h1>
            <p className="text-sm text-zinc-400 truncate">{user.email}</p>
            <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Histórico exclusivo desta conta Google — outros usuários não têm acesso.
            </p>
          </div>
          <Link
            to="/"
            className="h-9 px-4 rounded-lg border border-[#262c34] text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 inline-flex items-center justify-center"
          >
            Voltar ao app
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-5">
          <MiniStat label="Confirmados" value={String(confirmados.length)} />
          <MiniStat label="Conferências" value={String(conferencias.length)} />
          <MiniStat
            label="Premiados"
            value={String(premiados.length)}
            accent
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <TabButton
          ativa={aba === 'confirmados'}
          onClick={() => setAba('confirmados')}
          icon={<Bookmark className="w-3.5 h-3.5" />}
          label="Jogos confirmados"
        />
        <TabButton
          ativa={aba === 'conferencias'}
          onClick={() => setAba('conferencias')}
          icon={<History className="w-3.5 h-3.5" />}
          label="Conferências"
        />
      </div>

      {aba === 'confirmados' ? (
        <section className="surface-card rounded-2xl p-5 border border-[#262c34] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white">Jogos salvos para conferir</h2>
            {confirmados.length > 0 ? (
              <button
                type="button"
                onClick={limparConfirmados}
                className="text-xs text-red-300/90 hover:text-red-200 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
            ) : null}
          </div>
          {confirmados.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Ainda não há jogos confirmados. Gere um fechamento ou 5 jogos e clique em
              &quot;Confirmar no histórico&quot;.
            </p>
          ) : (
            <ul className="space-y-3">
              {confirmados.map((c) => {
                const premio =
                  c.resultado != null ? labelPremio(c.resultado.melhorAcertos) : null
                return (
                  <li
                    key={c.id}
                    className="rounded-xl border border-[#262c34] bg-[#161a1f] p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-white capitalize">
                          {c.modo.replace('-', ' ')}
                          {c.status === 'pendente' ? (
                            <span className="ml-2 text-[10px] uppercase text-amber-300">
                              Pendente
                            </span>
                          ) : (
                            <span className="ml-2 text-[10px] uppercase text-emerald-300">
                              Conferido
                            </span>
                          )}
                          {premio ? (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-amber-200">
                              <Trophy className="w-3 h-3" /> {premio}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-zinc-500">{formatarData(c.data)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerConfirmado(c.id)}
                        className="text-zinc-500 hover:text-red-300"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <ol className="space-y-1">
                      {c.jogos.map((jogo, idx) => (
                        <li key={idx} className="font-mono text-xs text-emerald-300/90">
                          {formatTwoDigits(idx + 1)}. {formatGameString(jogo)}
                          {c.resultado?.jogos[idx] != null ? (
                            <span className="text-zinc-500 ml-2">
                              · {c.resultado.jogos[idx].acertos} acertos
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : (
        <HistoricoConferencias historico={conferencias} onLimpar={limparConferencias} />
      )}
    </div>
  )
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-center ${
        accent ? 'border-amber-500/30 bg-amber-950/20' : 'border-[#262c34] bg-[#161a1f]'
      }`}
    >
      <div className="text-[10px] uppercase text-zinc-500">{label}</div>
      <div className={`text-lg font-extrabold ${accent ? 'text-amber-300' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}

function TabButton({
  ativa,
  onClick,
  icon,
  label,
}: {
  ativa: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[9.5rem] min-h-10 px-2 rounded-xl border text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
        ativa
          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
          : 'border-[#262c34] bg-[#161a1f] text-zinc-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
