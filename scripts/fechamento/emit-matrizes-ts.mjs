import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

async function emit(jsonPath, constName, outFile, comment) {
  const raw = JSON.parse(await readFile(jsonPath, 'utf8'))
  const rows = raw.blocos.map((b) => `  [${b.join(', ')}],`).join('\n')
  const body = `/**\n * ${comment}\n */\nexport const ${constName}: number[][] = [\n${rows}\n]\n`
  await mkdir(path.dirname(outFile), { recursive: true })
  await writeFile(outFile, body, 'utf8')
  console.log(outFile, raw.blocos.length)
}

await emit(
  'scripts/fechamento/candidatos/L11-t5-24j-busca-ok.json',
  'MATRIZ_L11_QUINA',
  'src/lib/fechamento/matrizes/l11-quina.ts',
  'L(11,6,6,5) — 24 jogos, garantia Quina. Busca offline 8 seeds; validada 462/462. Não ótima (LB fraco ≥15).',
)

await emit(
  'scripts/fechamento/candidatos/L12-t5-44j-busca-ok.json',
  'MATRIZ_L12_QUINA',
  'src/lib/fechamento/matrizes/l12-quina.ts',
  'L(12,6,6,5) — 44 jogos, garantia Quina. Busca offline 8 seeds; validada 924/924. Não ótima (LB fraco ≥25).',
)
