# Checklist — embarcar matriz de fechamento

Use este fluxo **antes** de adicionar qualquer entrada ao `REGISTRY` em `src/lib/coveringDesign.ts`.
Nunca cole números “da internet” sem passar por validação exaustiva local.

## 1. Gerar candidato (offline)

```bash
# Preferir scripts nomeados (PowerShell engole args após --)
npm run fechamento:gerar:l10-quadra
npm run fechamento:gerar:l11-quina
npm run fechamento:gerar:l12-quina

# Ou chamar o node direto
node scripts/fechamento/gerar-matriz.mjs --size=12 --target=5 --anneal --ms=60000

# Fila prioritária
npm run fechamento:prioridades
```

No PowerShell, se passar args extras: `npm run fechamento:gerar --% --size=10 --target=4 --anneal`

Saída em `scripts/fechamento/candidatos/L{n}-t{t}-{jogos}j-ok.json` (ou `-FAIL.json`).

## 2. Revalidar o JSON

```bash
npm run fechamento:validar -- --file scripts/fechamento/candidatos/<arquivo>-ok.json
npm run fechamento:smoke   # regressão da L10 Quina embutida
```

Critério de aceite: `ok=true`, `uncovered=0`, `checked = C(n,6)`.

## 3. Comparar com o limite inferior fraco

No JSON: `lowerBoundFraco` e `jogos`.

- Se `jogos` ≫ LB: tente de novo com `--anneal --ms` maior / outra `--seed`.
- Se `jogos` ≈ LB: bom candidato a `melhor_conhecida` (não marque `otima: true` sem referência bibliográfica).

## 4. Embarcar no app (só se PASS)

Em `src/lib/coveringDesign.ts`, no `REGISTRY`:

1. Copiar `blocos` (índices **1..n**).
2. `label`: `L(n,6,6,t)`.
3. `garantia`: `quadra` (t=4) ou `quina` (t=5).
4. `status`: `verificada` (passou no validador local).
5. `otima`: `true` **somente** se houver fonte confiável de otimalidade; senão omitir/`false`.
6. `fonte`: citar o JSON + data + método (`greedy`/`anneal`) + comando usado.

Rodar de novo:

```bash
npm run fechamento:smoke
npx tsc --noEmit
```

## 5. UI / regressão manual

- [ ] Modo Fechamento → slider no `n` certo → garantia certa → “Matriz disponível”.
- [ ] Marcar exatamente `n` dezenas → lista de volantes = `jogos` do JSON.
- [ ] Outro `n` sem matriz continua “ainda não disponível”.
- [ ] L10 Quina (14 jogos) intacto.

## Prioridade sugerida

| Ordem | Alvo        | Status no repo                                      |
|------:|-------------|-----------------------------------------------------|
| 1     | L(10,6,6,4) | **Embarcada** (3 jogos)                             |
| 2     | L(11,6,6,5) | **Embarcada** (24 jogos; LB≥15)                     |
| 3     | L(12,6,6,5) | **Embarcada** (44 jogos; LB≥25 — gap alto)          |
| 4     | L(13–14,…)  | Próxima leva com `fechamento:busca:l11-l12` adaptado |

L12 tem gap grande vs LB: útil e verificada, mas vale nova busca longa antes de tratar como “boa”.

## O que **não** fazer

- Não gerar annealing no browser / runtime do app.
- Não marcar `otima` sem prova.
- Não commitar JSON `-FAIL`.
- Não inventar tabelas “11→21 jogos” etc. sem este checklist.
