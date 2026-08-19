import React from 'react'
import { Printer } from 'lucide-react'
import { formatTwoDigits, calculateGameScore } from '@/lib/megaEngine'

/* ============================================================
 * PrintableVersion — botão reutilizável que abre uma nova janela
 * com um HTML otimizado para impressão em lotérica.
 *
 * Layout limpo: fundo branco, texto preto, sem elementos de UI.
 * CSS @media print: A4, margens de 15mm, page-break-inside: avoid.
 * A janela já abre com window.print() após 500ms.
 * ============================================================ */

interface PrintableGame {
  /** Dezenas do jogo (ordenadas). */
  dezenas: number[]
  /** Score (0-100) opcional — exibido ao final da linha. */
  score?: number
}

interface PrintableVersionProps {
  /** Jogos a imprimir. */
  jogos: PrintableGame[]
  /** Modo usado (exibe no subtítulo). */
  modo: string
  /** Label opcional do botão. */
  label?: string
  /** className extra para o botão. */
  className?: string
}

function formatarDataAtual(): string {
  const now = new Date()
  const dia = String(now.getDate()).padStart(2, '0')
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const ano = now.getFullYear()
  return `${dia}/${mes}/${ano}`
}

export const PrintableVersion: React.FC<PrintableVersionProps> = ({
  jogos,
  modo,
  label = 'Versão Impressa',
  className = '',
}) => {
  const handlePrint = () => {
    const data = formatarDataAtual()
    const total = jogos.length

    const linhas = jogos
      .map((jogo, idx) => {
        const num = String(idx + 1).padStart(2, '0')
        const dezenasStr = jogo.dezenas.map(formatTwoDigits).join(' - ')
        const scoreStr = jogo.score !== undefined ? ` — Score: ${jogo.score}%` : ''
        return `<div class="jogo"><span class="num">Jogo ${num}:</span> ${dezenasStr}${scoreStr}</div>`
      })
      .join('\n')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Jogos Mega-Sena — ${data}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: #ffffff;
    color: #000000;
    font-family: 'Inter', Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pagina {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px 20px;
  }
  header.cabecalho {
    border-bottom: 2px solid #000;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  header.cabecalho h1 {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  header.cabecalho p {
    font-size: 13px;
    color: #333;
    margin-top: 4px;
  }
  .lista-jogos .jogo {
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 6px;
    margin-bottom: 8px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .lista-jogos .jogo .num {
    display: inline-block;
    min-width: 70px;
    font-weight: 800;
  }
  footer.rodape {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #ccc;
    font-size: 11px;
    color: #555;
    text-align: center;
  }
  @media print {
    @page {
      size: A4;
      margin: 15mm;
    }
    html, body { background: #fff; }
    .pagina { padding: 0; max-width: none; }
    .jogo { page-break-inside: avoid; break-inside: avoid; }
  }
  @media screen {
    body { background: #f2f2f2; }
    .pagina { background: #fff; margin-top: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 8px; }
  }
</style>
</head>
<body>
  <div class="pagina">
    <header class="cabecalho">
      <h1>Jogos Mega-Sena — ${data}</h1>
      <p>${total} ${total === 1 ? 'jogo' : 'jogos'} · ${modo}</p>
    </header>
    <div class="lista-jogos">
      ${linhas}
    </div>
    <footer class="rodape">
      Gerado por Otimizador Estratégico Mega-Sena
    </footer>
  </div>
  <script>
    setTimeout(function () { window.print(); }, 500);
  </script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=820,height=900')
    if (!win) {
      alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.')
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={`inline-flex items-center justify-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl bg-[#1a1f2b] text-zinc-200 border border-[#262c34] hover:text-white hover:border-emerald-500/50 hover:bg-[#202735] active:scale-[0.98] transition-all ${className}`}
      title="Abrir versão para impressão em lotérica"
    >
      <Printer className="w-4 h-4 text-emerald-400" />
      <span>🖨️ {label}</span>
    </button>
  )
}

/** Helper para montar jogos com score a partir de number[][. */
export function jogosComScore(jogos: number[][]): PrintableGame[] {
  return jogos.map((dezenas) => ({ dezenas, score: calculateGameScore(dezenas) }))
}
