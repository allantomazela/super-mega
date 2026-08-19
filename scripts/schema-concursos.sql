-- Histórico oficial da Mega-Sena (fonte da verdade no Neon).
-- Aplicado automaticamente por scripts/sync-concursos-neon.mjs.

CREATE TABLE IF NOT EXISTS public.concursos (
  numero integer PRIMARY KEY,
  data_sorteio date NOT NULL,
  dezenas smallint[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT concursos_dezenas_len CHECK (cardinality(dezenas) = 6)
);

CREATE INDEX IF NOT EXISTS concursos_data_sorteio_idx
  ON public.concursos (data_sorteio DESC);
