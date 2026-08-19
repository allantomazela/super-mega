import { Ticket } from 'lucide-react'
import { formatGameCsv, formatTwoDigits } from '@/lib/megaEngine'
import { PRECO_SIMPLES_CAIXA } from '@/lib/caixaOficial'
import { useConcursos } from '@/hooks/useConcursos'

interface VolanteOficialProps {
  jogos: number[][]
  label?: string
}

const TREVO = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
  <path fill="#005CA9" d="M12 4c1.8-2.2 5.2-1.6 6 1.2.6 2.2-.8 3.6-2.6 4.2 1.8.6 3.2 2 2.6 4.2-.8 2.8-4.2 3.4-6 1.2-1.8 2.2-5.2 1.6-6-1.2-.6-2.2.8-3.6 2.6-4.2-1.8-.6-3.2-2-2.6-4.2C6.8 2.4 10.2 1.8 12 4z"/>
  <path fill="#F39200" d="M11.2 12.2 12 22l.8-9.8z"/>
</svg>`

function grade(marcadas: number[]): string {
  const set = new Set(marcadas)
  let html = '<div class="grade">'
  for (let linha = 0; linha < 6; linha++) {
    html += '<div class="linha">'
    for (let col = 1; col <= 10; col++) {
      const n = linha * 10 + col
      html += `<span class="cel${set.has(n) ? ' on' : ''}">[${formatTwoDigits(n)}]</span>`
    }
    html += '</div>'
  }
  return `${html}</div>`
}

function blocoJogo(letra: string, jogo: number[] | undefined): string {
  if (!jogo) {
    return `<section class="bloco vazio"><div class="letra">${letra}</div><p class="vazio-txt">Sem jogo neste campo</p></section>`
  }
  const nums = [...jogo].sort((a, b) => a - b)
  return `<section class="bloco">
    <div class="letra">${letra}</div>
    ${grade(nums)}
    <p class="csv">Bilhete Nº — ${formatGameCsv(nums)}</p>
  </section>`
}

export function VolanteOficial({ jogos, label = 'Volantes oficiais' }: VolanteOficialProps) {
  const { concursos } = useConcursos()
  const ultimo = concursos[0]
  const proximo = ultimo ? ultimo.numero + 1 : '____'

  function imprimir() {
    const folhas: string[] = []
    for (let i = 0; i < jogos.length; i += 2) {
      const a = jogos[i]
      const b = jogos[i + 1]
      const nFolha = Math.floor(i / 2) + 1
      const totalFolhas = Math.ceil(jogos.length / 2)
      folhas.push(`<article class="volante">
        <div class="marcas"><i></i><i></i><i></i></div>
        <div class="topo">
          <div class="marca">${TREVO}<span>Loterias <b>CAIXA</b></span></div>
          <div class="faixa">MEGA-SENA</div>
          <p class="aviso">MODELO PARA MARCAÇÃO — não substitui o volante oficial da Caixa</p>
          <div class="meta">
            <span>Concurso ${proximo} · 6 números</span>
            <span>Valor: R$ ${PRECO_SIMPLES_CAIXA.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
        ${blocoJogo('A', a)}
        ${blocoJogo('B', b)}
        <div class="meio">
          <p>Marque de 6 a 20 números · Sorteios: terça, quinta e sábado</p>
          <p><b>VALOR DE CADA APOSTA SIMPLES DE 6 NÚMEROS: R$ ${PRECO_SIMPLES_CAIXA.toFixed(2).replace('.', ',')}</b></p>
          <p>Folha ${nFolha} de ${totalFolhas}</p>
        </div>
        <div class="barra" aria-hidden="true"></div>
        <p class="rodape">NÃO RASURE ESTA ÁREA · VÁLIDO COMO GABARITO DE PREENCHIMENTO<br/>Loterias da Caixa Econômica Federal — registre o jogo na lotérica ou em Loterias Online</p>
      </article>`)
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><title>Volante Mega-Sena</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;background:#e8e8e8;color:#111}
  .folha{padding:8mm}
  .volante{width:100%;max-width:190mm;margin:0 auto 10mm;background:#fff;border:1px solid #bbb;padding:8mm 10mm 7mm;position:relative;page-break-after:always}
  .marcas{position:absolute;left:2mm;top:18mm;bottom:22mm;display:flex;flex-direction:column;justify-content:space-between}
  .marcas i{display:block;width:5mm;height:1.6mm;background:#111}
  .marca{display:flex;align-items:center;gap:6px;color:#005CA9;font-size:13px}
  .marca b{letter-spacing:.04em}
  .faixa{margin:8px 0 4px;background:#008142;color:#fff;font-weight:800;letter-spacing:.18em;text-align:center;padding:7px 8px;font-size:20px}
  .aviso{font-size:9px;color:#666;text-align:center;margin-bottom:6px}
  .meta{display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:8px}
  .bloco{background:#FFF9C4;border:1px solid #e6d98a;padding:6px 6px 8px;margin-bottom:8px;position:relative}
  .letra{position:absolute;left:-7mm;top:8px;color:#E30613;font-weight:800;font-size:18px}
  .bloco.vazio{min-height:28mm;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px}
  .grade{display:flex;flex-direction:column;gap:3px}
  .linha{display:grid;grid-template-columns:repeat(10,1fr);gap:2px}
  .cel{text-align:center;font-size:10px;font-weight:700;color:#E30613;padding:3px 0}
  .cel.on{background:#005CA9;color:#fff;border-radius:2px;text-decoration:line-through}
  .csv{margin-top:5px;font-size:11px;font-family:Consolas,monospace;font-weight:700;color:#111}
  .meio{text-align:center;font-size:10px;line-height:1.45;margin:8px 0}
  .barra{height:22mm;margin:6px 18mm 4px;background:repeating-linear-gradient(90deg,#111 0 1.2px,#111 1.2px,#fff 1.2px 2.4px)}
  .rodape{text-align:center;font-size:8px;color:#444;line-height:1.4}
  @media print{body{background:#fff}@page{size:A4 portrait;margin:8mm}.volante{border:0;max-width:none;margin:0 0 6mm;page-break-after:always}}
</style></head>
<body><div class="folha">${folhas.join('')}</div>
<script>setTimeout(function(){window.print()},450)</script></body></html>`

    const win = window.open('', '_blank', 'width=820,height=980')
    if (!win) {
      alert('Permita pop-ups para imprimir os volantes.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  if (jogos.length === 0) return null

  return (
    <button
      type="button"
      onClick={imprimir}
      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#008142] text-white text-xs font-bold hover:bg-[#006e38]"
      title="Imprimir modelo no visual do volante Mega-Sena da Caixa (apenas gabarito)"
    >
      <Ticket className="w-4 h-4" />
      {label}
    </button>
  )
}
