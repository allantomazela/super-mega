# Candidatos de matriz (não embarcados)

Arquivos gerados por `npm run fechamento:gerar` / `fechamento:prioridades`.

- `*-ok.json` — passou na validação exaustiva; candidato a entrar no REGISTRY.
- `*-FAIL.json` — não cobriu todos os sextetos; descartar ou regenerar.

Não importe estes JSON no bundle do Vite. O app só consome o que estiver em `src/lib/coveringDesign.ts` após o CHECKLIST.
