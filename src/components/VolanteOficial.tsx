import { Ticket } from 'lucide-react'
import { formatGameCsv, formatTwoDigits } from '@/lib/megaEngine'

interface VolanteOficialProps {
  jogos: number[][]
  label?: string
}

function gradeVolante(marcadas: number[]): string {
  const set = new Set(marcadas)
  let html = '<div class="grade">'
  for (let linha = 0; linha < 6; linha++) {
    html += '<div class="linha">'
    for (let col = 1; col <= 10; col++) {
      const n = linha * 10 + col
      const on = set.has(n)
      html += `<span class="cel ${on ? 'on' : ''}">${formatTwoDigits(n)}</span>`
    }
    html += '</div>'
  }
  html += '</div>'
  return html
}

export function VolanteOficial({ jogos, label = 'Volantes oficiais' }: VolanteOficialProps) {
  function imprimir() {
    const cartoes = jogos
      .map((jogo, i) => {
        const nums = [...jogo].sort((a, b) => a - b)
        return `<article class="cartao">
          <header>
            <strong>MEGA-SENA</strong>
            <span>CAIXA · Jogo ${formatTwoDigits(i + 1)} de ${formatTwoDigits(jogos.length)}</span>
          </header>
          ${gradeVolante(nums)}
          <p class="linha-txt">${formatGameCsv(nums)}</p>
          <p class="dica">Aposta simples — 6 dezenas. Marque estes números no volante da lotérica ou em Loterias Online Caixa.</p>
        </article>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Volantes Mega-Sena</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; }
  .pagina { padding: 12mm; }
  .cartao {
    border: 2px solid #111;
    border-radius: 8px;
    padding: 10px 12px 12px;
    margin-bottom: 10mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; font-size: 12px; }
  header strong { font-size: 16px; letter-spacing: 0.08em; }
  .grade { display: flex; flex-direction: column; gap: 4px; }
  .linha { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
  .cel {
    display: flex; align-items: center; justify-content: center;
    aspect-ratio: 1; border: 1px solid #999; border-radius: 50%;
    font-size: 11px; font-weight: 700;
  }
  .cel.on { background: #111; color: #fff; border-color: #111; }
  .linha-txt { margin-top: 8px; font-family: Consolas, monospace; font-size: 13px; font-weight: 700; }
  .dica { margin-top: 4px; font-size: 10px; color: #444; }
  @media print { @page { size: A4; margin: 10mm; } .cartao { margin-bottom: 8mm; } }
</style>
</head>
<body>
  <div class="pagina">${cartoes}</div>
  <script>setTimeout(function(){window.print()}, 400)</script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=820,height=900')
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
      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600"
      title="Imprimir grades no padrão do volante Mega-Sena para marcar na lotérica"
    >
      <Ticket className="w-4 h-4" />
      {label}
    </button>
  )
}
