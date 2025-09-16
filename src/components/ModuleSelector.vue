<template>
  <div class="module-selector" v-if="isSuperAdmin">
    <div class="module-selector-trigger" @click="toggleSelector" :class="{ active: showSelector }">
      <div class="d-flex align-items-center">
        <div class="trigger-icon">
          <i class="fas fa-th-large"></i>
        </div>
        <div class="trigger-content">
          <span class="module-text">
            {{ activeModuleCount === 1 && !isAllModulesActive ? getSingleModuleName() : 'Module View' }}
          </span>
          <span class="module-count" v-if="!isAllModulesActive">
            {{ activeModuleCount }} selected
          </span>
        </div>
      </div>
      <i class="fas fa-chevron-down toggle-icon" :class="{ rotate: showSelector }"></i>
    </div>

    <div class="module-selector-dropdown" v-if="showSelector" @click.stop>
      <div class="dropdown-header">
        <div class="header-content">
          <div class="header-icon">
            <i class="fas fa-layer-group"></i>
          </div>
          <div class="header-text">
            <h6 class="header-title">Module Selection</h6>
            <p class="header-subtitle">Choose which modules to display in your workspace</p>
          </div>
        </div>
      </div>

      <div class="module-options">
        <div class="search-container">
          <div class="search-input-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input
              type="text"
              class="search-input"
              placeholder="Search modules..."
              v-model="searchQuery"
            >
          </div>
        </div>

        <div class="modules-grid">
          <div
            v-for="module in filteredModules"
            :key="module.id"
            class="module-option"
            :class="{ active: isModuleActive(module.id), special: module.id === 'all' }"
            @click="toggleModule(module.id)"
          >
            <div class="module-card">
              <div class="module-icon" :style="{ backgroundColor: module.color + '15', color: module.color }">
                <i :class="module.icon"></i>
              </div>
              <div class="module-info">
                <div class="module-name">{{ module.name }}</div>
                <div class="module-description">{{ module.description }}</div>
              </div>
              <div class="module-status">
                <div class="status-indicator" :class="{ active: isModuleActive(module.id) }">
                  <i v-if="isModuleActive(module.id)" class="fas fa-check"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dropdown-footer">
        <div class="footer-stats">
          <span class="selected-count">{{ activeModuleCount }} of {{ availableModules.length - 1 }} modules selected</span>
        </div>
        <div class="footer-actions">
          <button class="btn btn-outline-secondary" @click="selectAllModules">
            <i class="fas fa-check-double me-1"></i>
            Select All
          </button>
          <button class="btn btn-primary" @click="applySelection">
            <i class="fas fa-check me-1"></i>
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { useModuleSelectorStore } from '../stores/moduleSelector'
import { useSystemModulesStore } from '../stores/systemModules'

export default {
  name: 'ModuleSelector',

  data() {
    return {
      showSelector: false,
      searchQuery: ''
    }
  },

  computed: {
    authStore() {
      return useAuthStore()
    },

    moduleSelectorStore() {
      return useModuleSelectorStore()
    },

    systemModulesStore() {
      return useSystemModulesStore()
    },

    isSuperAdmin() {
      return this.authStore.isSuperAdmin
    },

    availableModules() {
      // Filter modules to only show those enabled at system level
      return this.moduleSelectorStore.availableModules.filter(module => {
        if (module.id === 'all') return true // Always show "All Modules" option
        return this.systemModulesStore.isModuleEnabled(module.id)
      })
    },

    filteredModules() {
      if (!this.searchQuery) {
        return this.availableModules
      }
      return this.availableModules.filter(module =>
        module.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        module.description.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
    },

    activeModuleCount() {
      return this.isAllModulesActive ? this.availableModules.length - 1 :
             this.moduleSelectorStore.activeModules.filter(id => id !== 'all').length
    },

    isAllModulesActive() {
      return this.moduleSelectorStore.activeModules.includes('all')
    }
  },

  methods: {
    toggleSelector() {
      this.showSelector = !this.showSelector
      if (this.showSelector) {
        this.searchQuery = ''
        this.$nextTick(() => {
          const searchInput = this.$el.querySelector('.search-input')
          if (searchInput) {
            searchInput.focus()
          }
        })
      }
    },

    isModuleActive(moduleId) {
      return this.moduleSelectorStore.isModuleActive(moduleId)
    },

    toggleModule(moduleId) {
      this.moduleSelectorStore.toggleModule(moduleId)
    },

    selectAllModules() {
      this.moduleSelectorStore.setActiveModules(['all'])
    },

    applySelection() {
      this.showSelector = false
      this.searchQuery = ''
      // Emit event for parent components to react to module changes
      this.$emit('modules-changed', this.moduleSelectorStore.activeModules)
    },

    getSingleModuleName() {
      if (this.activeModuleCount === 1 && !this.isAllModulesActive) {
        const activeModule = this.availableModules.find(m =>
          this.moduleSelectorStore.activeModules.includes(m.id) && m.id !== 'all'
        )
        return activeModule?.name || 'Module View'
      }
      return 'Module View'
    },

    handleClickOutside(e) {
      if (!this.$el.contains(e.target)) {
        this.showSelector = false
        this.searchQuery = ''
      }
    }
  },

  mounted() {
    // Initialize from storage
    this.moduleSelectorStore.initializeFromStorage()
    this.systemModulesStore.initializeFromStorage()

    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleClickOutside)
  },

  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  }
}
</script>

<style scoped>
.module-selector {
  position: relative;
  margin-right: 1rem;
}

/* Trigger Button */
.module-selector-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 180px;
  user-select: none;
  height: 40px;
}

.module-selector-trigger:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.module-selector-trigger.active {
  background: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.trigger-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
  font-size: 14px;
  margin-right: 8px;
  flex-shrink: 0;
}

.trigger-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.module-text {
  font-weight: 500;
  color: #111827;
  font-size: 14px;
  line-height: 1.2;
}

.module-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
  margin-top: 1px;
}

.toggle-icon {
  color: #9ca3af;
  font-size: 12px;
  transition: transform 0.3s ease;
  margin-left: 8px;
}

.toggle-icon.rotate {
  transform: rotate(180deg);
}

/* Dropdown */
.module-selector-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  min-width: 480px;
  max-height: 600px;
  overflow: hidden;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
.dropdown-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 14px 14px 0 0;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-size: 1.25rem;
}

.header-text {
  flex: 1;
}

.header-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: white;
}

.header-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 0.25rem;
}

/* Search */
.search-container {
  padding: 1rem 1.5rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.875rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.875rem;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Module Options */
.module-options {
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.modules-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.module-option {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.module-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.module-option.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.module-option.special {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.module-option.special .module-name,
.module-option.special .module-description {
  color: white !important;
}

.module-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.module-option.active .module-card {
  background: #eff6ff;
}

.module-option.special .module-card {
  background: rgba(255, 255, 255, 0.1);
}

.module-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-size: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.module-info {
  flex: 1;
}

.module-name {
  font-weight: 700;
  color: #1e293b;
  font-size: 0.925rem;
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.module-description {
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.4;
  font-weight: 500;
}

.module-status {
  margin-left: 1rem;
}

.status-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: white;
}

.status-indicator.active {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.module-option.special .status-indicator {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
}

.module-option.special .status-indicator.active {
  background: white;
  color: #667eea;
}

/* Footer */
.dropdown-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
  border-radius: 0 0 14px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-stats {
  flex: 1;
}

.selected-count {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.btn-outline-secondary {
  background: white;
  color: #64748b;
  border-color: #e2e8f0;
}

.btn-outline-secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

/* Dark Theme */
[data-bs-theme="dark"] .module-selector-trigger {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-selector-trigger:hover {
  background: #4b5563;
  border-color: #6b7280;
}

[data-bs-theme="dark"] .module-selector-trigger.active {
  background: #374151;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

[data-bs-theme="dark"] .module-text {
  color: #f9fafb;
}

[data-bs-theme="dark"] .trigger-icon {
  color: #a855f7;
}

[data-bs-theme="dark"] .module-count {
  color: #d1d5db;
}

[data-bs-theme="dark"] .toggle-icon {
  color: #d1d5db;
}

[data-bs-theme="dark"] .module-selector-dropdown {
  background: #111827;
  border-color: #374151;
}

[data-bs-theme="dark"] .search-container {
  border-bottom-color: #374151;
}

[data-bs-theme="dark"] .search-input {
  background: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

[data-bs-theme="dark"] .search-input:focus {
  background: #1f2937;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .search-input::placeholder {
  color: #9ca3af;
}

[data-bs-theme="dark"] .module-card {
  background: #1f2937;
}

[data-bs-theme="dark"] .module-option.active .module-card {
  background: #1e3a8a;
}

[data-bs-theme="dark"] .module-name {
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-description {
  color: #d1d5db;
}

[data-bs-theme="dark"] .status-indicator {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .dropdown-footer {
  background: #1f2937;
  border-top-color: #374151;
}

[data-bs-theme="dark"] .selected-count {
  color: #d1d5db;
}

[data-bs-theme="dark"] .btn-outline-secondary {
  background: #374151;
  color: #d1d5db;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .btn-outline-secondary:hover {
  background: #4b5563;
  border-color: #6b7280;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .module-selector-trigger {
    min-width: 160px;
    padding: 6px 10px;
    height: 36px;
  }

  .trigger-icon {
    width: 18px;
    height: 18px;
    margin-right: 6px;
    font-size: 13px;
  }

  .module-text {
    font-size: 13px;
  }

  .module-count {
    font-size: 11px;
  }

  .toggle-icon {
    font-size: 10px;
  }

  .module-selector-dropdown {
    min-width: 380px;
    left: -80px;
  }

  .dropdown-header {
    padding: 1.25rem;
  }

  .header-icon {
    width: 40px;
    height: 40px;
    margin-right: 0.75rem;
  }

  .modules-grid {
    gap: 0.5rem;
  }

  .module-card {
    padding: 0.875rem;
  }

  .module-icon {
    width: 40px;
    height: 40px;
    margin-right: 0.75rem;
    font-size: 1.125rem;
  }
}

@media (max-width: 480px) {
  .module-selector-trigger {
    min-width: 140px;
    padding: 4px 8px;
    height: 32px;
  }

  .trigger-icon {
    width: 16px;
    height: 16px;
    margin-right: 4px;
    font-size: 12px;
  }

  .module-text {
    font-size: 12px;
  }

  .module-count {
    font-size: 10px;
  }

  .toggle-icon {
    font-size: 9px;
    margin-left: 4px;
  }

  .module-selector-dropdown {
    min-width: 340px;
    left: -120px;
  }

  .footer-actions {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .dropdown-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
}

/* Scrollbar styling */
.module-options::-webkit-scrollbar {
  width: 6px;
}

.module-options::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.module-options::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.module-options::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

[data-bs-theme="dark"] .module-options::-webkit-scrollbar-track {
  background: #374151;
}

[data-bs-theme="dark"] .module-options::-webkit-scrollbar-thumb {
  background: #4b5563;
}

[data-bs-theme="dark"] .module-options::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>