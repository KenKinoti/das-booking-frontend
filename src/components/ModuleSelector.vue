<template>
  <div class="module-selector" v-if="isSuperAdmin">
    <div class="module-selector-trigger" @click="toggleSelector" :class="{ active: showSelector }">
      <div class="d-flex align-items-center">
        <i class="fas fa-th-large me-2"></i>
        <span class="module-text">
          {{ activeModuleCount === 1 && !isAllModulesActive ? getSingleModuleName() : 'Module View' }}
        </span>
        <span class="module-count badge bg-primary ms-2" v-if="!isAllModulesActive">
          {{ activeModuleCount }}
        </span>
      </div>
      <i class="fas fa-chevron-down toggle-icon" :class="{ rotate: showSelector }"></i>
    </div>

    <div class="module-selector-dropdown" v-if="showSelector" @click.stop>
      <div class="dropdown-header">
        <i class="fas fa-layer-group me-2"></i>
        <strong>Select Active Modules</strong>
        <small class="text-muted d-block">Choose which sections to display</small>
      </div>

      <div class="module-options">
        <div
          v-for="module in availableModules"
          :key="module.id"
          class="module-option"
          :class="{ active: isModuleActive(module.id) }"
          @click="toggleModule(module.id)"
        >
          <div class="module-option-content">
            <div class="module-icon" :style="{ backgroundColor: module.color + '20', color: module.color }">
              <i :class="module.icon"></i>
            </div>
            <div class="module-info">
              <div class="module-name">{{ module.name }}</div>
              <div class="module-description">{{ module.description }}</div>
            </div>
          </div>
          <div class="module-checkbox">
            <i v-if="isModuleActive(module.id)" class="fas fa-check-circle text-success"></i>
            <i v-else class="far fa-circle text-muted"></i>
          </div>
        </div>
      </div>

      <div class="dropdown-footer">
        <button class="btn btn-sm btn-outline-secondary me-2" @click="selectAllModules">
          <i class="fas fa-check-double me-1"></i>
          All Modules
        </button>
        <button class="btn btn-sm btn-primary" @click="showSelector = false">
          <i class="fas fa-check me-1"></i>
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { useModuleSelectorStore } from '../stores/moduleSelector'

export default {
  name: 'ModuleSelector',

  data() {
    return {
      showSelector: false
    }
  },

  computed: {
    authStore() {
      return useAuthStore()
    },

    moduleSelectorStore() {
      return useModuleSelectorStore()
    },

    isSuperAdmin() {
      return this.authStore.isSuperAdmin
    },

    availableModules() {
      return this.moduleSelectorStore.availableModules
    },

    activeModuleCount() {
      return this.moduleSelectorStore.activeModules.length
    },

    isAllModulesActive() {
      return this.moduleSelectorStore.activeModules.includes('all')
    }
  },

  methods: {
    toggleSelector() {
      this.showSelector = !this.showSelector
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

    getSingleModuleName() {
      if (this.activeModuleCount === 1) {
        const activeModule = this.availableModules.find(m =>
          this.moduleSelectorStore.activeModules.includes(m.id)
        )
        return activeModule?.name || 'Module View'
      }
      return 'Module View'
    }
  },

  mounted() {
    // Initialize from storage
    this.moduleSelectorStore.initializeFromStorage()

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.showSelector = false
      }
    })
  }
}
</script>

<style scoped>
.module-selector {
  position: relative;
  margin-right: 1rem;
}

.module-selector-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 180px;
  user-select: none;
}

.module-selector-trigger:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.module-selector-trigger.active {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.module-text {
  font-weight: 500;
  color: #1e293b;
  font-size: 0.875rem;
}

.module-count {
  font-size: 0.75rem;
  min-width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon {
  color: #64748b;
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.toggle-icon.rotate {
  transform: rotate(180deg);
}

.module-selector-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  min-width: 400px;
  max-height: 500px;
  overflow-y: auto;
}

.dropdown-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px 12px 0 0;
}

.dropdown-header strong {
  color: #1e293b;
  font-size: 0.875rem;
}

.dropdown-header small {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.module-options {
  padding: 0.5rem;
  max-height: 320px;
  overflow-y: auto;
}

.module-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
}

.module-option:hover {
  background: #f8fafc;
}

.module-option.active {
  background: #eff6ff;
  border: 1px solid #dbeafe;
}

.module-option-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.module-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-size: 1.125rem;
}

.module-info {
  flex: 1;
}

.module-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
}

.module-description {
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.3;
}

.module-checkbox {
  font-size: 1.125rem;
  margin-left: 0.5rem;
}

.dropdown-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
  border-radius: 0 0 12px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Dark theme support */
[data-bs-theme="dark"] .module-selector-trigger {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .module-selector-trigger:hover {
  background: #4b5563;
  border-color: #6b7280;
}

[data-bs-theme="dark"] .module-text {
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-selector-dropdown {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .dropdown-header {
  background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
  border-bottom-color: #4b5563;
}

[data-bs-theme="dark"] .dropdown-header strong {
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-option:hover {
  background: #374151;
}

[data-bs-theme="dark"] .module-option.active {
  background: #1e3a8a;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .module-name {
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-description {
  color: #d1d5db;
}

[data-bs-theme="dark"] .dropdown-footer {
  background: #374151;
  border-top-color: #4b5563;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .module-selector-trigger {
    min-width: 120px;
    padding: 0.375rem 0.75rem;
  }

  .module-text {
    font-size: 0.75rem;
  }

  .module-selector-dropdown {
    min-width: 350px;
    left: -100px;
  }
}

@media (max-width: 480px) {
  .module-selector-dropdown {
    min-width: 300px;
    left: -150px;
  }
}
</style>