'use client'
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    const stored = localStorage.getItem('keept-theme') as Theme | null
    if (stored) setThemeState(stored)
    applyTheme(stored || 'system')
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('keept-theme', t)
    applyTheme(t)
  }

  return { theme, setTheme }
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'dark') {
    root.classList.add('dark')
  } else if (t === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}
