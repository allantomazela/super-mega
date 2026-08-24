import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import {
  pwaCanPrompt,
  pwaDismiss,
  pwaIsIos,
  pwaIsStandalone,
  pwaPromptInstall,
  pwaWasDismissed,
  subscribePwa,
} from '@/registerPwa'

interface InstalarPwaProps {
  variante: 'icone' | 'texto'
}

export function InstalarPwa({ variante }: InstalarPwaProps) {
  const [canPrompt, setCanPrompt] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [ios, setIos] = useState(false)
  const [dicaIos, setDicaIos] = useState(false)

  useEffect(() => {
    function sync() {
      setCanPrompt(pwaCanPrompt())
      setStandalone(pwaIsStandalone())
      setDismissed(pwaWasDismissed())
      setIos(pwaIsIos())
    }
    sync()
    return subscribePwa(sync)
  }, [])

  if (standalone || dismissed || !canPrompt) return null

  async function instalar() {
    if (canPrompt) {
      await pwaPromptInstall()
      return
    }
    setDicaIos((v) => !v)
  }

  const isText = variante === 'texto'
  const btnClass = isText
    ? 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-emerald-500/35 bg-emerald-950/40 text-emerald-200 text-sm font-semibold'
    : 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#161a1f] border border-[#262c34] text-emerald-300 hover:border-emerald-500/40'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void instalar()}
        className={btnClass}
        title="Instalar aplicativo"
        aria-label="Instalar aplicativo"
      >
        {ios && !canPrompt ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
        {isText ? <span>Instalar app</span> : null}
      </button>
      {dicaIos ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#262c34] bg-[#12161b] p-3 text-left shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              No iPhone: toque em <strong className="text-white">Compartilhar</strong> e depois em{' '}
              <strong className="text-white">Adicionar à Tela de Início</strong>.
            </p>
            <button
              type="button"
              className="text-zinc-500 hover:text-white"
              onClick={() => setDicaIos(false)}
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300"
            onClick={() => {
              pwaDismiss()
              setDicaIos(false)
            }}
          >
            Não mostrar de novo
          </button>
        </div>
      ) : null}
    </div>
  )
}
