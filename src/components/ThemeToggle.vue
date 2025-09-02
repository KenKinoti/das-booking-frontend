<template>
  <button 
    @click="toggleTheme" 
    class="theme-toggle"
    :class="{ 'dark': isDark }"
    :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
  >
    <div class="toggle-track">
      <div class="toggle-thumb">
        <i :class="isDark ? 'fas fa-moon' : 'fas fa-sun'"></i>
      </div>
    </div>
    <span class="theme-label">{{ isDark ? 'Dark' : 'Light' }}</span>
  </button>
</template>

<script>
import { globalTheme } from '../composables/useTheme'

export default {
  name: 'ThemeToggle',
  setup() {
    const { theme, toggleTheme, isDark } = globalTheme
    
    return {
      theme,
      toggleTheme,
      isDark
    }
  }
}
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: rgba(102, 126, 234, 0.1);
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-radius: 50px;
  padding: var(--spacing-xs) var(--spacing-sm);
  cursor: pointer;
  transition: all var(--transition-smooth);
  color: var(--primary-color);
  font-weight: var(--font-weight-semibold);
  font-size: 0.875rem;
}

.theme-toggle:hover {
  border-color: var(--primary-color);
  background: rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.theme-toggle.dark {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: #8b5cf6;
}

.theme-toggle.dark:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
}

.toggle-track {
  position: relative;
  width: 36px;
  height: 20px;
  background: var(--background-muted);
  border-radius: 50px;
  transition: all var(--transition-smooth);
}

.theme-toggle.dark .toggle-track {
  background: var(--primary-color);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-smooth);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.theme-toggle.dark .toggle-thumb {
  transform: translateX(16px);
  background: #1e293b;
}

.toggle-thumb i {
  font-size: 0.6rem;
  color: var(--primary-color);
}

.theme-toggle.dark .toggle-thumb i {
  color: #fbbf24;
}

.theme-label {
  font-weight: var(--font-weight-semibold);
  min-width: 35px;
  text-align: left;
}

/* Responsive */
@media (max-width: 768px) {
  .theme-label {
    display: none;
  }
  
  .theme-toggle {
    padding: var(--spacing-xs);
  }
}
</style>