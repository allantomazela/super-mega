import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import {
  listarJogosLotofacil,
  marcarConferidoLotofacil,
  removerJogoLotofacil,
  salvarJogosLotofacil,
  type JogoLotofacilSalvo,
  type NovoJogoLotofacil,
} from '@/modules/lotofacil/services/historicoJogosNeon'
import { buscarUltimoResultadoLotofacil } from '@/modules/lotofacil/services/caixaLotofacil'

export function useHistoricoLotofacilNeon() {
  const { user } = useAuth()
  const [jogos, setJogos] = useState<JogoLotofacilSalvo[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!user?.id) {
      setJogos([])
      return
    }
    setCarregando(true)
    setErro(null)
    try {
      const lista = await listarJogosLotofacil()
      setJogos(lista)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar histórico.')
    } finally {
      setCarregando(false)
    }
  }, [user?.id])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const salvar = useCallback(
    async (novos: NovoJogoLotofacil[]) => {
      setSalvando(true)
      setErro(null)
      try {
        const salvos = await salvarJogosLotofacil(novos)
        setJogos((prev) => [...salvos, ...prev])
        return salvos
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao salvar.'
        setErro(msg)
        throw e
      } finally {
        setSalvando(false)
      }
    },
    [],
  )

  const remover = useCallback(async (id: string) => {
    setErro(null)
    try {
      await removerJogoLotofacil(id)
      setJogos((prev) => prev.filter((j) => j.id !== id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover.')
      throw e
    }
  }, [])

  /** Confere pendentes cujo concurso_alvo já saiu (ou o último oficial). */
  const conferirPendentes = useCallback(async () => {
    const [ultimo, lista] = await Promise.all([
      buscarUltimoResultadoLotofacil(),
      listarJogosLotofacil(),
    ])
    if (!ultimo) return { conferidos: 0 }
    const sorteio = new Set(ultimo.dezenas)
    let conferidos = 0
    const pendentes = lista.filter((j) => j.status === 'pendente')
    for (const j of pendentes) {
      if (j.concurso_alvo != null && j.concurso_alvo > ultimo.numero) continue
      const acertadas = j.dezenas.filter((d) => sorteio.has(d)).sort((a, b) => a - b)
      const atualizado = await marcarConferidoLotofacil(j.id, {
        concurso: ultimo.numero,
        dezenas: ultimo.dezenas,
        acertos: acertadas.length,
        acertadas,
      })
      setJogos((prev) => {
        const sem = prev.filter((x) => x.id !== j.id)
        return [atualizado, ...sem]
      })
      conferidos++
    }
    if (conferidos === 0) {
      setJogos(lista)
    } else {
      await recarregar()
    }
    return { conferidos, concurso: ultimo.numero }
  }, [recarregar])

  return {
    jogos,
    carregando,
    salvando,
    erro,
    recarregar,
    salvar,
    remover,
    conferirPendentes,
  }
}
