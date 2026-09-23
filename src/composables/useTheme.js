import { ref, computed } from 'vue'

const STORAGE_KEY = 'theme'
const theme = ref('light')
let initialised = false

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function apply(value) {
  const root = document.documentElement
  root.setAttribute('data-theme', value)
  root.setAttribute('data-bs-theme', value)
  document.body?.classList.remove('theme-light', 'theme-dark')
  document.body?.classList.add(`theme-${value}`)
}

export function initTheme() {
  if (initialised) return
  initialised = true
  let saved = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }
  theme.value = saved === 'dark' || saved === 'light' ? saved : systemPrefersDark() ? 'dark' : 'light'
  apply(theme.value)
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    let stored = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      stored = null
    }
    if (!stored) {
      theme.value = e.matches ? 'dark' : 'light'
      apply(theme.value)
    }
  })
}

export function useTheme() {
  const setTheme = (value) => {
    theme.value = value === 'dark' ? 'dark' : 'light'
    apply(theme.value)
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      /* private mode */
    }
  }
  return {
    theme: computed(() => theme.value),
    isDark: computed(() => theme.value === 'dark'),
    isLight: computed(() => theme.value === 'light'),
    setTheme,
    toggleTheme: () => setTheme(theme.value === 'dark' ? 'light' : 'dark'),
    initTheme
  }
}

export const globalTheme = useTheme()
