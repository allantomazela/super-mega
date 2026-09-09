-- Histórico de jogos Lotofácil por usuário (Neon Data API + RLS).
-- Aplicar no branch de produção; o app acessa via VITE_NEON_DATA_API_URL.

CREATE TABLE IF NOT EXISTS public.jogos_lotofacil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT auth.user_id(),
  dezenas smallint[] NOT NULL,
  modo text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pendente',
  concurso_alvo integer,
  afinidade_previsao numeric(5,2),
  score_filtros numeric(5,2),
  perfil_previsao text,
  previsao_dezenas smallint[],
  retrospectiva jsonb,
  nota text,
  resultado_concurso integer,
  resultado_dezenas smallint[],
  resultado_acertos smallint,
  resultado_acertadas smallint[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jogos_lotofacil_dezenas_len CHECK (cardinality(dezenas) = 15),
  CONSTRAINT jogos_lotofacil_status_chk CHECK (status = ANY (ARRAY['pendente'::text, 'conferido'::text]))
);

CREATE INDEX IF NOT EXISTS jogos_lotofacil_user_created_idx
  ON public.jogos_lotofacil (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS jogos_lotofacil_user_status_idx
  ON public.jogos_lotofacil (user_id, status);

ALTER TABLE public.jogos_lotofacil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jogos_lotofacil_own ON public.jogos_lotofacil;

CREATE POLICY jogos_lotofacil_own ON public.jogos_lotofacil
  FOR ALL TO authenticated
  USING (auth.user_id() = user_id)
  WITH CHECK (auth.user_id() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jogos_lotofacil TO authenticated;
