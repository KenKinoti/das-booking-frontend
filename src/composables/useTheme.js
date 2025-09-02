import { ref, watch, onMounted, computed } from 'vue'

const theme = ref('light')

export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  const setTheme = (newTheme) => {
    theme.value = newTheme
  }

  const applyTheme = (themeValue) => {
    // Apply custom theme attribute for custom CSS variables
    document.documentElement.setAttribute('data-theme', themeValue)
    
    // Apply Bootstrap 5.3 dark mode support
    document.documentElement.setAttribute('data-bs-theme', themeValue)
    
    // Store preference in localStorage
    localStorage.setItem('theme', themeValue)
    
    // Update body class for additional styling hooks
    document.body.classList.remove('theme-light', 'theme-dark')
    document.body.classList.add(`theme-${themeValue}`)
    
    console.log(`🎨 Theme applied: ${themeValue}`)
  }

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      theme.value = savedTheme
    } else {
      // Auto-detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }
    applyTheme(theme.value)
  }

  // Watch for theme changes
  watch(theme, (newTheme) => {
    applyTheme(newTheme)
  }, { immediate: false })

  // Listen for system theme changes
  onMounted(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        theme.value = e.matches ? 'dark' : 'light'
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    // Initialize theme
    initTheme()
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  })

  return {
    theme: computed(() => theme.value),
    toggleTheme,
    setTheme,
    initTheme,
    isDark: computed(() => theme.value === 'dark'),
    isLight: computed(() => theme.value === 'light')
  }
}

// Create a global instance for consistency across the app
export const globalTheme = useTheme()