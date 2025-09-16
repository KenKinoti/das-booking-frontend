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
  gap: 6px;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 20px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6366f1;
  font-weight: 500;
  font-size: 12px;
  height: auto;
  min-height: auto;
}

.theme-toggle:hover {
  border-color: #6366f1;
  background: rgba(102, 126, 234, 0.15);
  transform: none;
  box-shadow: none;
}

.theme-toggle.dark {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: #8b5cf6;
}

.theme-toggle.dark:hover {
  background: rgba(139, 92, 246, 0.15);
  border-color: #8b5cf6;
  box-shadow: none;
}

.toggle-track {
  position: relative;
  width: 32px;
  height: 18px;
  background: #e5e7eb;
  border-radius: 50px;
  transition: all 0.2s ease;
}

.theme-toggle.dark .toggle-track {
  background: #6366f1;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.theme-toggle.dark .toggle-thumb {
  transform: translateX(14px);
  background: #1e293b;
}

.toggle-thumb i {
  font-size: 8px;
  color: #6366f1;
}

.theme-toggle.dark .toggle-thumb i {
  color: #fbbf24;
}

.theme-label {
  font-weight: 500;
  min-width: 30px;
  text-align: left;
  font-size: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .theme-label {
    display: none;
  }

  .theme-toggle {
    padding: 3px 6px;
    gap: 0;
  }

  .toggle-track {
    width: 28px;
    height: 16px;
  }

  .toggle-thumb {
    width: 12px;
    height: 12px;
  }

  .theme-toggle.dark .toggle-thumb {
    transform: translateX(12px);
  }

  .toggle-thumb i {
    font-size: 7px;
  }
}

@media (max-width: 480px) {
  .toggle-track {
    width: 24px;
    height: 14px;
  }

  .toggle-thumb {
    width: 10px;
    height: 10px;
  }

  .theme-toggle.dark .toggle-thumb {
    transform: translateX(10px);
  }

  .toggle-thumb i {
    font-size: 6px;
  }
}
</style>