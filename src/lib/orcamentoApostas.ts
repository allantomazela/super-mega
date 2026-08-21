/**
 * Compara estratégias de aposta dado um orçamento (R$).
 * Não aumenta chance de Sena — só organiza custo × garantia × transparência.
 */

import { PRECO_SIMPLES_CAIXA, combinacoesSimples, precoOficialCaixa } from '@/lib/caixaOficial'
import {
  GARANTIA_LABEL,
  listarMatrizesDisponiveis,
  type GarantiaFechamento,
} from '@/lib/coveringDesign'
import type { AppMode } from '@/lib/MegaContext'

export interface OpcaoOrcamento {
  id: string
  titulo: string
  modo: AppMode
  custo: number
  jogos: number
  cabeNoOrcamento: boolean
  /** Ex.: "Quina se as 6 estiverem no grupo de 10" */
  garantia: string | null
  detalhe: string
  /** P(Sena | 6 no grupo) ≈ jogos/C(n,6) só para fechamento */
  pSenaSe6NoGrupo: number | null
  fechamentoN?: number
  fechamentoGarantia?: GarantiaFechamento
  /** Maior = melhor dentro do orçamento (garantia > eficiência) */
  score: number
  recomendada: boolean
}

function custoJogosSimples(qtd: number): number {
  return qtd * PRECO_SIMPLES_CAIXA
}

export function listarOpcoesOrcamento(orcamento: number): OpcaoOrcamento[] {
  const budget = Number.isFinite(orcamento) ? Math.max(0, orcamento) : 0
  const opcoes: OpcaoOrcamento[] = []

  for (const m of listarMatrizesDisponiveis()) {
    const jogos = m.blocos.length
    const custo = custoJogosSimples(jogos)
    const totalCombos = combinacoesSimples(m.n, 6)
    const pSena = jogos / totalCombos
    const garantiaForte = m.garantia === 'quina' ? 2 : 1
    const cabe = custo <= budget
    opcoes.push({
      id: `fech-${m.n}-${m.garantia}`,
      titulo: `Fechamento L(${m.n}) · ${GARANTIA_LABEL[m.garantia]}`,
      modo: 'fechamento',
      custo,
      jogos,
      cabeNoOrcamento: cabe,
      garantia: `${GARANTIA_LABEL[m.garantia]} se as 6 sorteadas estiverem nas ${m.n}`,
      detalhe: `${jogos} volantes de 6 no lugar de ${totalCombos.toLocaleString('pt-BR')} (C(${m.n},6)). ${m.otima ? 'Ótima conhecida.' : 'Construção verificada (não necessariamente ótima).'}`,
      pSenaSe6NoGrupo: pSena,
      fechamentoN: m.n,
      fechamentoGarantia: m.garantia,
      score: cabe ? 1000 + garantiaForte * 100 + m.n * 2 - custo / 10 : -custo,
      recomendada: false,
    })
  }

  // 5 jogos simples de 6
  const cincoCusto = custoJogosSimples(5)
  opcoes.push({
    id: 'cinco-6',
    titulo: '5 Jogos · apostas simples',
    modo: 'cinco-jogos',
    custo: cincoCusto,
    jogos: 5,
    cabeNoOrcamento: cincoCusto <= budget,
    garantia: null,
    detalhe:
      '5 bilhetes de 6 dezenas. Sem garantia combinatória — otimiza cobertura do grupo escolhido.',
    pSenaSe6NoGrupo: null,
    score: cincoCusto <= budget ? 400 - cincoCusto / 10 : -cincoCusto,
    recomendada: false,
  })

  // Desdobramento Caixa: maior n cujo preço cabe no orçamento (6–15 prático)
  let melhorN = 0
  let melhorPreco = 0
  for (let n = 6; n <= 15; n++) {
    const preco = precoOficialCaixa(n)
    if (preco <= budget && (melhorN === 0 || n > melhorN)) {
      melhorN = n
      melhorPreco = preco
    }
  }
  if (melhorN > 0) {
    const combos = combinacoesSimples(melhorN, 6)
    opcoes.push({
      id: `desdob-${melhorN}`,
      titulo: `Desdobramento Caixa · ${melhorN} dezenas`,
      modo: 'desdobramento',
      custo: melhorPreco,
      jogos: combos,
      cabeNoOrcamento: true,
      garantia: 'Sena se as 6 estiverem nas dezenas (volante completo)',
      detalhe: `Todas as ${combos.toLocaleString('pt-BR')} combinações de 6 — preço oficial da Caixa. Custo alto; garantia máxima no grupo.`,
      pSenaSe6NoGrupo: 1,
      score: 600 + melhorN - melhorPreco / 50,
      recomendada: false,
    })
  } else {
    // Mostra o mais barato (6) mesmo fora do orçamento
    const preco6 = precoOficialCaixa(6)
    opcoes.push({
      id: 'desdob-6',
      titulo: 'Desdobramento Caixa · 6 dezenas',
      modo: 'desdobramento',
      custo: preco6,
      jogos: 1,
      cabeNoOrcamento: preco6 <= budget,
      garantia: null,
      detalhe: 'Aposta simples (1 jogo). Orçamento abaixo do desdobramento múltiplo.',
      pSenaSe6NoGrupo: null,
      score: preco6 <= budget ? 200 : -preco6,
      recomendada: false,
    })
  }

  // Quantos jogos simples cabem no orçamento (modo 5 jogos com mais bilhetes conceitual)
  const maxSimples = Math.floor(budget / PRECO_SIMPLES_CAIXA)
  if (maxSimples >= 1 && maxSimples !== 5) {
    const q = Math.min(maxSimples, 20)
    const c = custoJogosSimples(q)
    opcoes.push({
      id: `simples-${q}`,
      titulo: `Até ${q} apostas simples`,
      modo: 'cinco-jogos',
      custo: c,
      jogos: q,
      cabeNoOrcamento: true,
      garantia: null,
      detalhe: `Teto do orçamento em bilhetes de 6 (R$ ${PRECO_SIMPLES_CAIXA} cada). Use o Modo 5 Jogos ou monte manualmente.`,
      pSenaSe6NoGrupo: null,
      score: 300 + q - c / 20,
      recomendada: false,
    })
  }

  const dentro = opcoes.filter((o) => o.cabeNoOrcamento)
  if (dentro.length > 0) {
    const melhor = [...dentro].sort((a, b) => b.score - a.score)[0]
    for (const o of opcoes) {
      o.recomendada = o.id === melhor.id
    }
  }

  return opcoes.sort((a, b) => {
    if (a.cabeNoOrcamento !== b.cabeNoOrcamento) return a.cabeNoOrcamento ? -1 : 1
    return b.score - a.score
  })
}

export function formatOrcamentoBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
