import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/** Alterna tema claro / escuro (persiste em localStorage via next-themes). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', resolvedTheme === 'light' ? '#f4f7fb' : '#0d0f12')
    }
  }, [mounted, resolvedTheme])

  if (!mounted) {
    return (
      <span
        className="inline-flex h-9 w-9 rounded-full border border-border bg-card"
        aria-hidden
      />
    )
  }

  const isDark = resolvedTheme !== 'light'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/40 transition-colors"
      title={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
