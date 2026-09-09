-- Histórico oficial da Lotofácil (fonte da verdade no Neon).
-- Aplicado automaticamente por scripts/sync-lotofacil-neon.mjs.
-- Não altera public.concursos (Mega-Sena).

CREATE TABLE IF NOT EXISTS public.concursos_lotofacil (
  numero integer PRIMARY KEY,
  data_sorteio date NOT NULL,
  dezenas smallint[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT concursos_lotofacil_dezenas_len CHECK (cardinality(dezenas) = 15)
);

CREATE INDEX IF NOT EXISTS concursos_lotofacil_data_sorteio_idx
  ON public.concursos_lotofacil (data_sorteio DESC);
