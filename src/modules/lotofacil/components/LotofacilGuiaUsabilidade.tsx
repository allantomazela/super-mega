import { BookOpen, Filter, Grid3x3, Lightbulb, ListOrdered } from 'lucide-react'

type LotofacilMode = 'filtros' | 'fechamento'

const MODOS: {
  key: LotofacilMode
  label: string
  hint: string
  icon: typeof Filter
  how: string
  when: string
}[] = [
  {
    key: 'filtros',
    label: 'Filtros + jogos',
    hint: 'Quantidade à escolha + scores',
    icon: Filter,
    how: 'Você monta um grupo (15–20 dezenas). O app amostra combinações de 15, aplica as faixas (moldura, ímpares, soma, repetência…) e devolve os bilhetes com melhor score de adequação. Use isso para explorar candidatos alinhados ao padrão histórico.',
    when: 'Ideal quando quer escolher quantos jogos gerar, ranquear por score e depois combinar os melhores em um novo pool.',
  },
  {
    key: 'fechamento',
    label: 'Fechamento 15 pts',
    hint: 'Cobertura do grupo inteiro',
    icon: Grid3x3,
    how: 'Gera o conjunto de volantes de 15 que cobre todas as combinações de 15 do seu grupo. Se as 15 sorteadas estiverem dentro do pool, algum bilhete acerta os 15. Com pool grande o custo explode (é o desdobramento completo).',
    when: 'Use com grupo enxuto (15–17) quando a prioridade for garantia combinatória de 15 pontos, não quantidade pequena de jogos.',
  },
]

const PASSOS = [
  {
    n: '1',
    title: 'Monte o grupo',
    text: 'Toque nas dezenas ou use Surpresa / Aplicar previsão. Comece com 15–18 números: menos volume, mais controle.',
  },
  {
    n: '2',
    title: 'Leia o histórico',
    text: 'Veja quentes, frias e médias (moldura, ímpares, soma). Inclua ou remova dezenas com base nisso — não no “achismo”.',
  },
  {
    n: '3',
    title: 'Gere com o modo certo',
    text: 'Filtros = escolha a quantidade e ranqueie por score. Fechamento = cobertura total do grupo para alvo 15.',
  },
  {
    n: '4',
    title: 'Compare nos Resultados',
    text: 'Priorize score alto e afinidade. Marque Top 3/5/10, combine o pool e gere uma nova leva — ou salve só o que for jogar.',
  },
  {
    n: '5',
    title: 'Salve só o que for jogar',
    text: 'Marque e salve na nuvem. Depois do sorteio o app confere e alerta se houver 15 pontos.',
  },
]

const DICAS = [
  'Afinidade alta ≠ garantia de 15: a chance matemática de um volante simples é sempre a mesma (1 em ~3,26 milhões). O sistema melhora a qualidade da escolha, não a loteria.',
  'Combine previsão “Equilibrado” + filtros padrão + retrospectiva: jogos que batem nos três tendem a ser os melhores candidatos do lote.',
  'Se nenhum jogo passar nos filtros, afrouxe moldura/soma/repetência um pouco — faixas rígidas demais zerão a lista.',
  'No fechamento 15, cada dezena a mais no pool multiplica o custo. Prefira qualidade do grupo a quantidade.',
]

interface LotofacilGuiaUsabilidadeProps {
  mode: LotofacilMode
  onChangeMode: (m: LotofacilMode) => void
}

export function LotofacilGuiaUsabilidade({ mode, onChangeMode }: LotofacilGuiaUsabilidadeProps) {
  const active = MODOS.find((m) => m.key === mode) ?? MODOS[0]!
  const Icon = active.icon

  return (
    <div className="space-y-3">
      <section className="surface-card rounded-2xl p-4 sm:p-5 border border-violet-500/20 space-y-3">
        <h2 className="text-sm font-bold text-white inline-flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-400" />
          Como usar a Lotofácil neste app
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Fluxo recomendado para tirar melhor proveito das ferramentas estatísticas e aumentar a{' '}
          <strong className="text-zinc-300">aderência</strong> dos jogos que você decide jogar
          (score, previsão e histórico) — sem prometer prêmio.
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {PASSOS.map((p) => (
            <li
              key={p.n}
              className="rounded-xl border border-[#262c34] bg-[#12161b] px-3 py-2.5 space-y-1"
            >
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                <ListOrdered className="w-3 h-3" />
                Passo {p.n}
              </div>
              <div className="text-xs font-bold text-white leading-snug">{p.title}</div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="surface-card rounded-2xl p-2 shadow-lg grid grid-cols-1 min-[480px]:grid-cols-2 gap-2 max-w-2xl">
        {MODOS.map((opt) => {
          const selected = mode === opt.key
          const OptIcon = opt.icon
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChangeMode(opt.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left min-h-[3.25rem] ${
                selected
                  ? 'bg-violet-600 text-white border border-violet-300/40 shadow-[0_0_18px_rgba(139,92,246,0.35)]'
                  : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-300 hover:text-white hover:border-zinc-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selected ? 'bg-white/15' : 'bg-[#161a1f] border border-[#262c34] text-violet-400'
                }`}
              >
                <OptIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight truncate">{opt.label}</div>
                <div
                  className={`text-[11px] mt-0.5 leading-snug ${
                    selected ? 'text-violet-50/85' : 'text-zinc-500'
                  }`}
                >
                  {opt.hint}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-[#262c34] bg-[#12161b] px-4 py-3 sm:px-5 space-y-2">
        <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold uppercase tracking-wide">
          <Icon className="w-3.5 h-3.5" />
          Como funciona: {active.label}
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{active.how}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{active.when}</p>
      </div>

      <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/15 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-fuchsia-300 text-xs font-semibold uppercase tracking-wide">
          <Lightbulb className="w-3.5 h-3.5" />
          Dicas para melhorar a aderência
        </div>
        <ul className="space-y-1.5">
          {DICAS.map((d) => (
            <li key={d.slice(0, 24)} className="text-[11px] text-zinc-400 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-fuchsia-400">
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
