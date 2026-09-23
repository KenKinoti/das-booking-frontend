<template>
  <div class="professional-page">
    <!-- Page Header -->
    <div class="page-header-modern">
      <div class="header-left">
        <div class="header-icon">
          <i :class="headerIcon"></i>
        </div>
        <div class="header-content">
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-description" v-if="pageDescription">{{ pageDescription }}</p>
        </div>
      </div>
      <div class="header-actions" v-if="showAddButton || $slots.actions">
        <slot name="actions">
          <button v-if="showAddButton" @click="$emit('add-clicked')" class="btn-primary-modern">
            <i class="fas fa-plus"></i>
            <span>{{ addButtonText || 'Add New' }}</span>
          </button>
        </slot>
      </div>
    </div>

    <!-- Stats Cards -->
    <div v-if="statsCards && statsCards.length > 0" class="stats-section">
      <div class="stats-grid">
        <div
          v-for="(card, index) in statsCards"
          :key="index"
          class="stat-card-modern"
          :class="card.type || 'primary'"
        >
          <div class="stat-icon">
            <i :class="card.icon"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
            <div v-if="card.change" class="stat-change" :class="card.changeType">
              <i :class="card.changeType === 'positive' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
              {{ card.change }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div v-if="showFilters" class="filters-section-modern">
      <div class="filters-container">
        <div class="search-container">
          <div class="search-input-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input
              :value="searchQuery"
              @input="$emit('search-updated', $event.target.value)"
              type="text"
              placeholder="Search items..."
              class="search-input-modern"
            />
            <button v-if="searchQuery" @click="$emit('search-updated', '')" class="search-clear">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div class="filter-controls-modern">
          <select
            v-if="showStatusFilter"
            :value="statusFilter"
            @change="$emit('status-filter-updated', $event.target.value)"
            class="select-modern"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            v-if="showRoleFilter"
            :value="roleFilter"
            @change="$emit('role-filter-updated', $event.target.value)"
            class="select-modern"
          >
            <option value="">All Roles</option>
            <slot name="role-options"></slot>
          </select>

          <button @click="$emit('clear-filters')" class="btn-secondary-modern" v-if="hasActiveFilters">
            <i class="fas fa-filter-circle-xmark"></i>
            <span>Clear</span>
          </button>

          <!-- View Toggle -->
          <div v-if="showViewToggle" class="view-toggle-modern">
            <button
              @click="$emit('view-changed', 'list')"
              :class="['view-btn', { active: currentView === 'list' }]"
              title="List View"
            >
              <i class="fas fa-list"></i>
            </button>
            <button
              @click="$emit('view-changed', 'grid')"
              :class="['view-btn', { active: currentView === 'grid' }]"
              title="Grid View"
            >
              <i class="fas fa-th"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="content-section">
      <slot name="content">
        <!-- Loading State -->
        <div v-if="isLoading" class="state-container loading-state">
          <div class="state-content">
            <div class="loading-spinner-modern"></div>
            <h3>Loading...</h3>
            <p>Please wait while we fetch your data</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="showEmptyState" class="state-container empty-state">
          <div class="state-content">
            <div class="empty-icon">
              <i :class="headerIcon"></i>
            </div>
            <h3>{{ emptyStateTitle || 'No Data Found' }}</h3>
            <p>{{ emptyStateMessage || 'Get started by adding your first item' }}</p>
            <button v-if="showAddButton" @click="$emit('add-clicked')" class="btn-primary-modern">
              <i class="fas fa-plus"></i>
              <span>{{ addButtonText || 'Add First Item' }}</span>
            </button>
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageTemplate',
  props: {
    pageTitle: {
      type: String,
      required: true
    },
    pageDescription: {
      type: String,
      default: ''
    },
    headerIcon: {
      type: String,
      default: 'fas fa-home'
    },
    showAddButton: {
      type: Boolean,
      default: false
    },
    addButtonText: {
      type: String,
      default: 'Add New'
    },
    statsCards: {
      type: Array,
      default: () => []
    },
    showFilters: {
      type: Boolean,
      default: false
    },
    searchQuery: {
      type: String,
      default: ''
    },
    statusFilter: {
      type: String,
      default: ''
    },
    roleFilter: {
      type: String,
      default: ''
    },
    showStatusFilter: {
      type: Boolean,
      default: false
    },
    showRoleFilter: {
      type: Boolean,
      default: false
    },
    showViewToggle: {
      type: Boolean,
      default: false
    },
    currentView: {
      type: String,
      default: 'list'
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    showEmptyState: {
      type: Boolean,
      default: false
    },
    emptyStateTitle: {
      type: String,
      default: ''
    },
    emptyStateMessage: {
      type: String,
      default: ''
    }
  },
  computed: {
    hasActiveFilters() {
      return this.searchQuery || this.statusFilter || this.roleFilter
    }
  },
  emits: [
    'add-clicked',
    'search-updated',
    'status-filter-updated',
    'role-filter-updated',
    'clear-filters',
    'view-changed'
  ]
}
</script>

<style scoped>
/* Professional Modern Page Styles */
.professional-page {
  padding: 24px;
  background: #fafbfc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 100%;
  box-sizing: border-box;
}

/* Page Header */
.page-header-modern {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.page-description {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Modern Buttons */
.btn-primary-modern {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.25);
}

.btn-primary-modern:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.35);
}

.btn-secondary-modern {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f9fafb;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary-modern:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* Stats Section */
.stats-section {
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stat-card-modern {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.stat-card-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-card-modern {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.stat-card-modern.primary .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-card-modern.success .stat-icon {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.stat-card-modern.warning .stat-icon {
  background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
  color: white;
}

.stat-card-modern.danger .stat-icon {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.stat-change.positive {
  color: #059669;
}

.stat-change.negative {
  color: #dc2626;
}

/* Filters Section */
.filters-section-modern {
  margin-bottom: 24px;
}

.filters-container {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  min-width: 300px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  font-size: 16px;
  z-index: 1;
}

.search-input-modern {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
  transition: all 0.2s ease;
}

.search-input-modern:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-clear {
  position: absolute;
  right: 8px;
  padding: 4px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.search-clear:hover {
  color: #6b7280;
  background: #f3f4f6;
}

.filter-controls-modern {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.select-modern {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
}

.select-modern:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* View Toggle */
.view-toggle-modern {
  display: flex;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 4px;
}

.view-btn {
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.view-btn:hover {
  color: #374151;
  background: #e5e7eb;
}

.view-btn.active {
  background: #ffffff;
  color: #667eea;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Content Section */
.content-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* State Containers */
.state-container {
  padding: 80px 40px;
  text-align: center;
}

.state-content {
  max-width: 400px;
  margin: 0 auto;
}

/* Loading State */
.loading-spinner-modern {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.loading-state p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* Empty State */
.empty-icon {
  width: 80px;
  height: 80px;
  background: #f3f4f6;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #9ca3af;
  margin: 0 auto 24px;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.empty-state p {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
  line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .professional-page {
    padding: 16px;
  }

  .page-header-modern {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }

  .header-left {
    align-items: flex-start;
  }

  .page-title {
    font-size: 24px;
  }

  .filters-container {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .search-container {
    min-width: auto;
  }

  .filter-controls-modern {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .state-container {
    padding: 60px 24px;
  }
}

@media (max-width: 480px) {
  .professional-page {
    padding: 12px;
  }

  .page-header-modern {
    padding: 20px;
  }

  .header-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .page-title {
    font-size: 20px;
  }

  .filters-container {
    padding: 16px;
  }

  .stat-card-modern {
    padding: 20px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .stat-value {
    font-size: 28px;
  }
}

/* Dark Theme Support */
[data-bs-theme="dark"] .professional-page {
  background: #111827;
}

[data-bs-theme="dark"] .page-header-modern,
[data-bs-theme="dark"] .filters-container,
[data-bs-theme="dark"] .content-section,
[data-bs-theme="dark"] .stat-card-modern {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .page-title {
  color: #f9fafb;
}

[data-bs-theme="dark"] .page-description {
  color: #d1d5db;
}

[data-bs-theme="dark"] .stat-value {
  color: #f9fafb;
}

[data-bs-theme="dark"] .stat-label {
  color: #d1d5db;
}

[data-bs-theme="dark"] .search-input-modern,
[data-bs-theme="dark"] .select-modern {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .btn-secondary-modern {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .view-toggle-modern {
  background: #374151;
}

[data-bs-theme="dark"] .view-btn.active {
  background: #4b5563;
  color: #60a5fa;
}

[data-bs-theme="dark"] .empty-icon {
  background: #374151;
  color: #6b7280;
}

[data-bs-theme="dark"] .loading-state h3,
[data-bs-theme="dark"] .empty-state h3 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .loading-state p,
[data-bs-theme="dark"] .empty-state p {
  color: #d1d5db;
}
</style>