<template>
  <div class="page-container">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-title-section">
          <h1 class="page-title">
            <i class="fas fa-building"></i>
            Organizations Management
          </h1>
          <p class="page-subtitle">Manage all organizations, subscriptions, and user access in your system</p>
        </div>
        <div class="page-actions">
          <button @click="openCreateModal" class="btn btn-primary btn-create">
            <i class="fas fa-plus"></i>
            <span>Create Organization</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="filters-container">
        <div class="search-container">
          <div class="search-input-wrapper">
            <i class="fas fa-search"></i>
            <input
              v-model="searchQuery"
              @input="debouncedSearch"
              placeholder="Search organizations..."
              class="search-input"
              type="text"
            />
            <div v-if="searchQuery && searchResults.length > 0" class="search-dropdown">
              <div v-for="result in searchResults.slice(0, 5)" :key="result.id" class="search-result-item" @click="selectOrganization(result)">
                <div class="result-content">
                  <div class="result-header">
                    <span class="result-name">{{ result.name }}</span>
                    <span class="result-plan">{{ result.subscription?.plan_name || 'No Plan' }}</span>
                  </div>
                  <div class="result-details">
                    <span v-if="result.email" class="result-email">{{ result.email }}</span>
                    <span v-if="result.abn" class="result-abn">ABN: {{ result.abn }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="filter-controls">
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select v-model="statusFilter" @change="handleSearch" class="filter-select">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Plan</label>
            <select v-model="planFilter" @change="handleSearch" class="filter-select">
              <option value="">All Plans</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <button @click="clearFilters" class="clear-filters-btn">
            <i class="fas fa-times"></i>
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Organizations List -->
    <div class="content-card">

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading organizations...</p>
        </div>

        <div v-else-if="organizations.length === 0" class="empty-state">
          <i class="fas fa-building"></i>
          <p>No organizations found</p>
        </div>

        <div v-else class="organizations-table">
          <div class="organizations-grid">
            <div v-for="org in organizations" :key="org.id" class="organization-card">
              <div class="org-header">
                <div class="org-avatar">
                  <i class="fas fa-building"></i>
                </div>
                <div class="org-basic-info">
                  <h3 class="org-name">{{ org.name }}</h3>
                  <div class="org-details">
                    <span v-if="org.abn" class="detail-item">
                      <i class="fas fa-file-alt"></i>
                      ABN: {{ org.abn }}
                    </span>
                    <span v-if="org.website" class="detail-item">
                      <i class="fas fa-globe"></i>
                      {{ org.website }}
                    </span>
                  </div>
                </div>
                <div class="org-status">
                  <span class="status-badge" :class="`status-${getSubscriptionStatus(org).toLowerCase()}`">
                    {{ formatStatus(getSubscriptionStatus(org)) }}
                  </span>
                </div>
              </div>

              <div class="org-stats">
                <div class="stat-item">
                  <div class="stat-icon users">
                    <i class="fas fa-users"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ org.users?.length || 0 }}</div>
                    <div class="stat-label">Users</div>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon participants">
                    <i class="fas fa-user-friends"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ org.participants?.length || 0 }}</div>
                    <div class="stat-label">Participants</div>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon subscription">
                    <i class="fas fa-credit-card"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ getSubscriptionPlan(org) }}</div>
                    <div class="stat-label">Plan</div>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon storage">
                    <i class="fas fa-hdd"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ org.subscription?.max_storage_gb || 0 }}GB</div>
                    <div class="stat-label">Storage</div>
                  </div>
                </div>
              </div>

              <div class="org-contact">
                <div v-if="org.email" class="contact-item">
                  <i class="fas fa-envelope"></i>
                  <span>{{ org.email }}</span>
                </div>
                <div v-if="org.phone" class="contact-item">
                  <i class="fas fa-phone"></i>
                  <span>{{ org.phone }}</span>
                </div>
                <div class="contact-item">
                  <i class="fas fa-calendar-alt"></i>
                  <span>Created {{ formatDate(org.created_at) }}</span>
                </div>
              </div>

              <div class="org-actions">
                <button @click="viewOrganization(org)" class="btn-action btn-view" title="View Organization">
                  <i class="fas fa-eye"></i>
                  <span>View</span>
                </button>
                <button @click="editOrganization(org)" class="btn-action btn-edit" title="Edit Organization">
                  <i class="fas fa-edit"></i>
                  <span>Edit</span>
                </button>
                <button @click="manageModules(org)" class="btn-action btn-modules" title="Manage Modules">
                  <i class="fas fa-th-large"></i>
                  <span>Modules</span>
                </button>
                <button @click="editStatus(org)" class="btn-action btn-status" title="Edit Status">
                  <i class="fas fa-toggle-on"></i>
                  <span>Status</span>
                </button>
                <button @click="loginAsOrganization(org)" class="btn-action btn-login" title="Login As Organization">
                  <i class="fas fa-sign-in-alt"></i>
                  <span>Login As</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.total_pages > 1" class="pagination">
          <button 
            @click="changePage(pagination.page - 1)" 
            :disabled="pagination.page === 1"
            class="btn btn-sm"
          >
            Previous
          </button>
          
          <span class="page-info">
            Page {{ pagination.page }} of {{ pagination.total_pages }}
            ({{ pagination.total }} total)
          </span>

          <button 
            @click="changePage(pagination.page + 1)" 
            :disabled="pagination.page === pagination.total_pages"
            class="btn btn-sm"
          >
            Next
          </button>
        </div>
    </div>

    <!-- Create Organization Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content modern-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-section">
            <h2 class="modal-title">
              <i class="fas fa-building"></i>
              {{ isEditMode ? 'Edit Organization' : 'Create New Organization' }}
            </h2>
            <p class="modal-subtitle">{{ isEditMode ? 'Update organization information' : 'Set up a new organization with admin user and subscription plan' }}</p>
          </div>
          <button @click="closeCreateModal" class="btn-close-modern">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Step Progress Indicator -->
        <div class="step-progress" v-if="!isEditMode">
          <div class="step-indicator">
            <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
              <div class="step-circle">1</div>
              <span class="step-label">Organization Details</span>
            </div>
            <div class="step-line" :class="{ completed: currentStep > 1 }"></div>
            <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
              <div class="step-circle">2</div>
              <span class="step-label">Admin User</span>
            </div>
            <div class="step-line" :class="{ completed: currentStep > 2 }"></div>
            <div class="step" :class="{ active: currentStep === 3, completed: currentStep > 3 }">
              <div class="step-circle">3</div>
              <span class="step-label">Business Modules</span>
            </div>
            <div class="step-line" :class="{ completed: currentStep > 3 }"></div>
            <div class="step" :class="{ active: currentStep === 4, completed: currentStep > 4 }">
              <div class="step-circle">4</div>
              <span class="step-label">Subscription Plan</span>
            </div>
          </div>
        </div>

        <div class="modal-body">
          <form @submit.prevent="createOrganization">
            <!-- Step 1: Organization Details -->
            <div v-if="currentStep === 1 || isEditMode" class="form-step">
              <div class="step-header" v-if="!isEditMode">
                <h3 class="step-title">
                  <i class="fas fa-building"></i>
                  Organization Information
                </h3>
                <p class="step-description">Enter the basic details for the organization</p>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Organization Name *</label>
                  <input v-model="newOrganization.name" type="text" class="form-input" placeholder="e.g. ACME Corporation" required>
                </div>
                <div class="form-group">
                  <label class="form-label">ABN (Optional)</label>
                  <input v-model="newOrganization.abn" type="text" class="form-input" placeholder="e.g. 12 345 678 901">
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Email Address *</label>
                  <input v-model="newOrganization.email" type="email" class="form-input" placeholder="e.g. info@acme.com" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number</label>
                  <input v-model="newOrganization.phone" type="tel" class="form-input" placeholder="e.g. +61 2 8765 4321">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Website</label>
                <input v-model="newOrganization.website" type="url" class="form-input" placeholder="e.g. https://www.acme.com">
              </div>
            </div>

            <!-- Step 2: Admin User -->
            <div v-if="currentStep === 2 && !isEditMode" class="form-step">
              <div class="step-header">
                <h3 class="step-title">
                  <i class="fas fa-user-shield"></i>
                  Admin User Setup
                </h3>
                <p class="step-description">Create the admin user account for this organization</p>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">First Name *</label>
                  <input v-model="newOrganization.admin_user.first_name" type="text" class="form-input" placeholder="e.g. John" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name *</label>
                  <input v-model="newOrganization.admin_user.last_name" type="text" class="form-input" placeholder="e.g. Smith" required>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Admin Email *</label>
                  <input v-model="newOrganization.admin_user.email" type="email" class="form-input" placeholder="e.g. john.smith@acme.com" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Admin Phone</label>
                  <input v-model="newOrganization.admin_user.phone" type="tel" class="form-input" placeholder="e.g. +61 400 123 456">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Temporary Password *</label>
                <input v-model="newOrganization.admin_user.password" type="password" class="form-input" placeholder="Minimum 8 characters" required>
                <small class="form-hint">Admin user will be asked to change this password on first login</small>
              </div>
            </div>

            <!-- Step 3: Business Modules -->
            <div v-if="currentStep === 3 && !isEditMode" class="form-step modules-step">
              <div class="step-header">
                <h3 class="step-title">
                  <i class="fas fa-th-large"></i>
                  Choose Your Business Modules
                </h3>
                <p class="step-description">Select the features that perfectly match your organization's needs</p>
              </div>

              <!-- Modules Layout with Sidebar -->
              <div class="modules-layout">
                <!-- Left Sidebar - Categories Menu -->
                <div class="modules-sidebar">
                  <div class="sidebar-header">
                    <h4>
                      <i class="fas fa-layer-group"></i>
                      Categories
                    </h4>
                  </div>
                  <nav class="categories-menu">
                    <button
                      v-for="category in moduleCategories"
                      :key="category.id"
                      @click="activeModuleCategory = category.id"
                      :class="['category-menu-item', { active: activeModuleCategory === category.id }]"
                      type="button"
                    >
                      <div class="menu-item-content">
                        <i :class="category.icon" class="menu-icon"></i>
                        <span class="menu-text">{{ category.name }}</span>
                        <div class="selected-badge" v-if="getSelectedModulesInCategory(category.id) > 0">
                          {{ getSelectedModulesInCategory(category.id) }}
                        </div>
                      </div>
                    </button>
                  </nav>

                  <!-- Quick Summary in Sidebar -->
                  <div class="sidebar-summary">
                    <div class="summary-item">
                      <span class="summary-label">Selected Modules</span>
                      <span class="summary-value">{{ getSelectedModulesCount }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">Monthly Total</span>
                      <span class="summary-value">${{ calculateMonthlyTotal() }}</span>
                    </div>
                  </div>
                </div>

                <!-- Right Content - Modules Grid -->
                <div class="modules-content">
                  <div class="content-header">
                    <h4 class="category-title">
                      <i :class="moduleCategories.find(c => c.id === activeModuleCategory)?.icon"></i>
                      {{ moduleCategories.find(c => c.id === activeModuleCategory)?.name }}
                    </h4>
                    <div class="content-stats">
                      <span class="modules-count">{{ getModulesByCategory(activeModuleCategory).length }} modules available</span>
                    </div>
                  </div>

                  <!-- Modules Grid -->
                  <div class="modules-grid">
                    <div
                      v-for="module in getModulesByCategory(activeModuleCategory)"
                      :key="module.id"
                      @click="toggleModule(module.id)"
                      :class="['module-card', { selected: isModuleSelected(module.id) }]"
                    >
                      <!-- Selection Checkbox -->
                      <div class="module-checkbox">
                        <i class="fas fa-check"></i>
                      </div>

                      <!-- Module Icon -->
                      <div class="module-icon">
                        <i :class="module.icon"></i>
                      </div>

                      <!-- Module Details -->
                      <div class="module-info">
                        <h4 class="module-title">{{ module.name }}</h4>
                        <p class="module-description">{{ module.description }}</p>
                      </div>

                      <!-- Pricing -->
                      <div class="module-price">
                        <div class="price-amount">${{ module.monthlyPrice }}</div>
                        <div class="price-period">/month</div>
                      </div>

                      <!-- Badges -->
                      <div class="module-badges" v-if="module.essential || module.popular || module.tier === 'premium'">
                        <span v-if="module.essential" class="module-badge badge-essential">Essential</span>
                        <span v-if="module.popular" class="module-badge badge-popular">Popular</span>
                        <span v-if="module.tier === 'premium'" class="module-badge badge-premium">Premium</span>
                      </div>

                      <!-- Features -->
                      <ul class="module-features">
                        <li v-for="feature in module.features" :key="feature">{{ feature }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bottom Pricing Summary -->
              <div class="pricing-summary-bottom">
                <div class="pricing-card">
                  <div class="pricing-header">
                    <h4>
                      <i class="fas fa-calculator"></i>
                      Pricing Summary
                    </h4>
                    <div class="selected-count">{{ getSelectedModulesCount }} modules selected</div>
                  </div>
                  <div class="pricing-totals">
                    <div class="total-row">
                      <span class="total-label">Monthly Total:</span>
                      <span class="total-amount">${{ calculateMonthlyTotal() }}</span>
                    </div>
                    <div class="total-row annual">
                      <span class="total-label">Annual Total (10% off):</span>
                      <span class="total-amount">${{ calculateAnnualTotal() }}</span>
                      <span class="savings" v-if="calculateAnnualSavings() > 0">
                        Save ${{ calculateAnnualSavings() }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 4: Subscription Plan & Payment -->
            <div v-if="currentStep === 4 && !isEditMode" class="form-step subscription-step">
              <div class="step-header">
                <h3 class="step-title">
                  <i class="fas fa-credit-card"></i>
                  Review & Subscribe
                </h3>
                <p class="step-description">Review your selections and complete your subscription</p>
              </div>

              <div class="subscription-layout">
                <!-- Left Side - Organization & Module Summary -->
                <div class="subscription-summary">
                  <div class="summary-section organization-summary">
                    <h4 class="summary-title">
                      <i class="fas fa-building"></i>
                      Organization Details
                    </h4>
                    <div class="summary-content">
                      <div class="summary-item">
                        <span class="item-label">Organization Name:</span>
                        <span class="item-value">{{ newOrganization.name || 'Not specified' }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="item-label">ABN:</span>
                        <span class="item-value">{{ newOrganization.abn || 'Not provided' }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="item-label">Admin User:</span>
                        <span class="item-value">{{ newOrganization.admin_user.first_name }} {{ newOrganization.admin_user.last_name }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="item-label">Email:</span>
                        <span class="item-value">{{ newOrganization.admin_user.email }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="summary-section modules-summary">
                    <h4 class="summary-title">
                      <i class="fas fa-th-large"></i>
                      Selected Modules ({{ getSelectedModulesCount }})
                    </h4>
                    <div class="summary-content">
                      <div v-if="getSelectedModulesCount === 0" class="no-modules">
                        <i class="fas fa-info-circle"></i>
                        No additional modules selected
                      </div>
                      <div v-else class="selected-modules-list">
                        <div v-for="module in getSelectedModuleDetails()" :key="module.id" class="module-summary-item">
                          <div class="module-summary-info">
                            <i :class="module.icon" class="module-summary-icon"></i>
                            <div class="module-summary-details">
                              <span class="module-summary-name">{{ module.name }}</span>
                              <span class="module-summary-category">{{ moduleCategories.find(c => c.id === module.category)?.name }}</span>
                            </div>
                          </div>
                          <span class="module-summary-price">${{ module.monthlyPrice }}/mo</span>
                        </div>
                      </div>

                      <div class="modules-total">
                        <div class="total-line">
                          <span>Monthly Modules Total:</span>
                          <span class="total-amount">${{ calculateMonthlyTotal() }}</span>
                        </div>
                        <div class="total-line annual">
                          <span>Annual Modules Total (10% off):</span>
                          <span class="total-amount">${{ calculateAnnualTotal() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right Side - Plan Selection & Payment -->
                <div class="subscription-plan">
                  <div class="plan-section">
                    <h4 class="section-title">
                      <i class="fas fa-layer-group"></i>
                      Base Subscription Plan
                    </h4>

                    <!-- Compact Plan Selection -->
                    <div class="plan-selection-compact">
                      <div class="plan-option"
                           :class="{ selected: newOrganization.subscription.plan_name === 'starter' }"
                           @click="selectPlan('starter')">
                        <div class="plan-info">
                          <div class="plan-name">Starter</div>
                          <div class="plan-description">Perfect for small teams</div>
                        </div>
                        <div class="plan-specs">
                          <div class="spec">5 users</div>
                          <div class="spec">50 participants</div>
                          <div class="spec">10GB storage</div>
                        </div>
                        <div class="plan-price">$29/mo</div>
                      </div>

                      <div class="plan-option"
                           :class="{ selected: newOrganization.subscription.plan_name === 'professional' }"
                           @click="selectPlan('professional')">
                        <div class="plan-info">
                          <div class="plan-name">Professional</div>
                          <div class="plan-description">Growing businesses</div>
                        </div>
                        <div class="plan-specs">
                          <div class="spec">25 users</div>
                          <div class="spec">250 participants</div>
                          <div class="spec">50GB storage</div>
                        </div>
                        <div class="plan-price">$99/mo</div>
                      </div>

                      <div class="plan-option"
                           :class="{ selected: newOrganization.subscription.plan_name === 'enterprise' }"
                           @click="selectPlan('enterprise')">
                        <div class="plan-info">
                          <div class="plan-name">Enterprise</div>
                          <div class="plan-description">Large organizations</div>
                        </div>
                        <div class="plan-specs">
                          <div class="spec">100 users</div>
                          <div class="spec">1000 participants</div>
                          <div class="spec">100GB storage</div>
                        </div>
                        <div class="plan-price">$299/mo</div>
                      </div>
                    </div>
                  </div>

                  <!-- Billing Configuration -->
                  <div class="billing-section">
                    <h4 class="section-title">
                      <i class="fas fa-receipt"></i>
                      Billing Configuration
                    </h4>

                    <div class="billing-form">
                      <div class="form-group">
                        <label class="form-label">Billing Email *</label>
                        <input v-model="newOrganization.subscription.billing_email"
                               type="email"
                               class="form-input"
                               placeholder="billing@yourcompany.com"
                               required>
                      </div>

                      <div class="form-group">
                        <label class="form-label">Billing Cycle *</label>
                        <div class="billing-cycle-options">
                          <label class="cycle-option" :class="{ selected: newOrganization.subscription.billing_cycle === 'monthly' }">
                            <input type="radio" v-model="newOrganization.subscription.billing_cycle" value="monthly">
                            <div class="cycle-content">
                              <span class="cycle-name">Monthly</span>
                              <span class="cycle-description">Pay monthly</span>
                            </div>
                            <div class="cycle-price">Standard rate</div>
                          </label>

                          <label class="cycle-option" :class="{ selected: newOrganization.subscription.billing_cycle === 'yearly' }">
                            <input type="radio" v-model="newOrganization.subscription.billing_cycle" value="yearly">
                            <div class="cycle-content">
                              <span class="cycle-name">Annual</span>
                              <span class="cycle-description">Save 20%</span>
                            </div>
                            <div class="cycle-price">
                              <span class="original-price">Regular price</span>
                              <span class="discount-price">20% off</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Final Pricing Summary -->
                  <div class="final-summary">
                    <h4 class="section-title">
                      <i class="fas fa-calculator"></i>
                      Total Subscription Cost
                    </h4>

                    <div class="pricing-breakdown">
                      <div class="pricing-item">
                        <span>Base Plan ({{ newOrganization.subscription.plan_name || 'Not selected' }}):</span>
                        <span class="price">${{ getSelectedPlanPrice() }}/mo</span>
                      </div>
                      <div class="pricing-item">
                        <span>Additional Modules:</span>
                        <span class="price">${{ calculateMonthlyTotal() }}/mo</span>
                      </div>
                      <div class="pricing-divider"></div>
                      <div class="pricing-item total">
                        <span>Monthly Total:</span>
                        <span class="price">${{ getSelectedPlanPrice() + calculateMonthlyTotal() }}</span>
                      </div>
                      <div class="pricing-item annual-total">
                        <span>Annual Total (with discounts):</span>
                        <span class="price">${{ calculateFinalAnnualTotal() }}</span>
                      </div>
                      <div v-if="getTotalAnnualSavings() > 0" class="savings-note">
                        <i class="fas fa-tag"></i>
                        Save ${{ getTotalAnnualSavings() }} per year with annual billing
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
              <div class="actions-left">
                <button type="button" @click="closeCreateModal" class="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" v-if="currentStep > 1 && !isEditMode" @click="previousStep" class="btn btn-outline">
                  <i class="fas fa-arrow-left"></i>
                  Previous
                </button>
              </div>
              <div class="actions-right">
                <button type="button" v-if="currentStep < 4 && !isEditMode" @click="nextStep" class="btn btn-primary">
                  Next
                  <i class="fas fa-arrow-right"></i>
                </button>
                <button type="submit" v-if="currentStep === 4 || isEditMode" :disabled="createLoading" class="btn btn-success">
                  <i v-if="createLoading" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-check"></i>
                  {{ isEditMode ? 'Update Organization' : 'Create Organization' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Status Edit Modal -->
    <div v-if="showStatusModal" class="modal-overlay" @click="showStatusModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Update Organization Status</h3>
          <button @click="showStatusModal = false" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="updateOrganizationStatus">
            <div class="form-group">
              <label>Organization</label>
              <input :value="selectedOrg?.name" type="text" readonly>
            </div>

            <div class="form-group">
              <label>Status *</label>
              <select v-model="statusUpdate.status" required>
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div class="form-group">
              <label>Reason</label>
              <textarea v-model="statusUpdate.reason" rows="3" placeholder="Optional reason for status change"></textarea>
            </div>

            <div class="form-actions">
              <button type="button" @click="showStatusModal = false" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" :disabled="statusLoading" class="btn btn-primary">
                <i v-if="statusLoading" class="fas fa-spinner fa-spin"></i>
                Update Status
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Organization Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="showDetailsModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Organization Details</h3>
          <button @click="showDetailsModal = false" class="btn-close">×</button>
        </div>

        <div class="modal-body" v-if="orgDetails">
          <div class="details-grid">
            <div class="detail-section">
              <h4>Organization Info</h4>
              <div class="detail-item">
                <label>Name:</label>
                <span>{{ orgDetails.organization.name }}</span>
              </div>
              <div class="detail-item" v-if="orgDetails.organization.abn">
                <label>ABN:</label>
                <span>{{ orgDetails.organization.abn }}</span>
              </div>
              <div class="detail-item" v-if="orgDetails.organization.email">
                <label>Email:</label>
                <span>{{ orgDetails.organization.email }}</span>
              </div>
              <div class="detail-item" v-if="orgDetails.organization.phone">
                <label>Phone:</label>
                <span>{{ orgDetails.organization.phone }}</span>
              </div>
              <div class="detail-item" v-if="orgDetails.organization.website">
                <label>Website:</label>
                <span>{{ orgDetails.organization.website }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4>Subscription</h4>
              <div class="detail-item">
                <label>Plan:</label>
                <span>{{ orgDetails.subscription.plan_name }}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge" :class="`status-${orgDetails.subscription.status}`">
                  {{ orgDetails.subscription.status }}
                </span>
              </div>
              <div class="detail-item">
                <label>Monthly Rate:</label>
                <span>${{ orgDetails.subscription.monthly_rate }}</span>
              </div>
              <div class="detail-item">
                <label>Max Users:</label>
                <span>{{ orgDetails.subscription.max_users }}</span>
              </div>
              <div class="detail-item">
                <label>Max Participants:</label>
                <span>{{ orgDetails.subscription.max_participants }}</span>
              </div>
              <div class="detail-item">
                <label>Max Storage:</label>
                <span>{{ orgDetails.subscription.max_storage_gb }} GB</span>
              </div>
            </div>

            <div class="detail-section">
              <h4>Users ({{ orgDetails.organization.users?.length || 0 }})</h4>
              <div class="user-list" v-if="orgDetails.organization.users?.length">
                <div v-for="user in orgDetails.organization.users" :key="user.id" class="user-item">
                  <span class="user-name">{{ user.first_name }} {{ user.last_name }}</span>
                  <span class="user-email">{{ user.email }}</span>
                  <span class="user-role">{{ user.role }}</span>
                </div>
              </div>
              <div v-else class="empty-state">No users found</div>
            </div>

            <div class="detail-section">
              <h4>Participants ({{ orgDetails.organization.participants?.length || 0 }})</h4>
              <div class="participant-list" v-if="orgDetails.organization.participants?.length">
                <div v-for="participant in orgDetails.organization.participants" :key="participant.id" class="participant-item">
                  <span class="participant-name">{{ participant.first_name }} {{ participant.last_name }}</span>
                  <span class="participant-ndis">{{ participant.ndis_number }}</span>
                </div>
              </div>
              <div v-else class="empty-state">No participants found</div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-actions">
            <button @click="showDetailsModal = false" class="btn btn-secondary">
              <i class="fas fa-times"></i>
              Close
            </button>
            <button @click="confirmDeleteOrganization(orgDetails.organization)" class="btn btn-danger">
              <i class="fas fa-trash"></i>
              Delete Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteModal && selectedOrg" class="modal-overlay" @click="showDeleteModal = false">
    <div class="modal-content delete-modal" @click.stop>
      <div class="modal-header">
        <h3>Confirm Delete Organization</h3>
        <button @click="showDeleteModal = false" class="btn-close">×</button>
      </div>
      
      <div class="modal-body">
        <div class="delete-confirmation">
          <div class="delete-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h4>Are you sure you want to delete this organization?</h4>
          <div class="org-summary">
            <p><strong>Organization:</strong> {{ selectedOrg.name }}</p>
            <p v-if="selectedOrg.email"><strong>Email:</strong> {{ selectedOrg.email }}</p>
            <p v-if="selectedOrg.abn"><strong>ABN:</strong> {{ selectedOrg.abn }}</p>
            <p><strong>Users:</strong> {{ selectedOrg.users?.length || 0 }}</p>
            <p><strong>Participants:</strong> {{ selectedOrg.participants?.length || 0 }}</p>
          </div>
          <p class="warning-text">
            <i class="fas fa-exclamation-circle"></i>
            This action cannot be undone. All data associated with this organization will be permanently deleted.
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn btn-view">
            <i class="fas fa-times"></i>
            Cancel
          </button>
          <button @click="confirmDelete" class="btn btn-delete">
            <i class="fas fa-trash"></i>
            Delete Organization
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modules Management Modal -->
  <div v-if="showModulesModal" class="modal-overlay" @click="closeModulesModal">
      <div class="modal-content modules-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-section">
            <h2 class="modal-title">
              <i class="fas fa-th-large"></i>
              Manage Modules for {{ selectedOrgForModules?.name }}
            </h2>
            <p class="modal-subtitle">Configure which modules are available for this organization</p>
          </div>
          <button @click="closeModulesModal" class="btn-close-modern">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="modules-grid">
            <div
              v-for="module in availableModules"
              :key="module.id"
              class="module-item"
              :class="{
                'enabled': isModuleEnabled(module.id),
                'disabled': !isModuleEnabled(module.id),
                'required': module.required
              }"
            >
              <div class="module-header">
                <div class="module-info">
                  <div class="module-icon">
                    <i :class="module.icon"></i>
                  </div>
                  <div class="module-details">
                    <div class="module-name">{{ module.name }}</div>
                    <div class="module-description">{{ module.description }}</div>
                    <div v-if="module.required" class="required-badge">Required</div>
                  </div>
                </div>
                <div class="module-toggle">
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      :checked="isModuleEnabled(module.id)"
                      :disabled="module.required"
                      @change="!module.required && toggleModuleForOrg(module.id)"
                    >
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modules-footer">
          <div class="modules-count">
            <strong>{{ enabledModulesCount }}</strong> of {{ availableModules.length }} modules enabled
          </div>
          <div class="modules-actions">
            <button @click="closeModulesModal" class="btn btn-secondary">
              <i class="fas fa-times"></i>
              Cancel
            </button>
            <button @click="saveModulesConfig" :disabled="modulesLoading" class="btn btn-primary btn-modules">
              <i v-if="modulesLoading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ modulesLoading ? 'Saving...' : 'Save Configuration' }}
            </button>
          </div>
        </div>
      </div>
    </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { useOrganizationContext } from '@/composables/useOrganizationContext'
import { adminAPI } from '../services/api'
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast } from '../utils/errorHandler'

export default {
  name: 'SuperAdmin',
  setup() {
    const { setOrganizationContext } = useOrganizationContext()

    const showNotification = (message, type = 'info') => {
      switch (type) {
        case 'success':
          return showSuccessToast(message)
        case 'error':
          return showErrorToast(message)
        case 'warning':
          return showWarningToast(message)
        case 'info':
        default:
          return showInfoToast(message)
      }
    }

    // Reactive state
    const organizations = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const planFilter = ref('')
    const pagination = ref({
      page: 1,
      limit: 20,
      total: 0,
      total_pages: 0
    })

    // Modals
    const showCreateModal = ref(false)
    const showStatusModal = ref(false)
    const showDetailsModal = ref(false)
    const showDeleteModal = ref(false)
    const createLoading = ref(false)
    const statusLoading = ref(false)

    // Multi-step form
    const currentStep = ref(1)
    const isEditMode = ref(false)
    
    // Selected items
    const selectedOrg = ref(null)
    const orgDetails = ref(null)

    // Form data
    const newOrganization = reactive({
      name: '',
      abn: '',
      email: '',
      phone: '',
      website: '',
      address: {
        street: '',
        suburb: '',
        state: '',
        postcode: '',
        country: 'Australia'
      },
      ndis_registration: {
        registration_number: '',
        registration_status: '',
        expiry_date: null
      },
      admin_user: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: ''
      },
      subscription: {
        plan_name: '',
        billing_email: '',
        max_users: 5,
        max_participants: 10,
        max_storage_gb: 5,
        billing_cycle: 'monthly'
      }
    })

    const statusUpdate = reactive({
      status: '',
      reason: ''
    })

    // Business Modules State
    const selectedModules = ref([])
    const activeModuleCategory = ref('core')
    const showPricingBreakdown = ref(false)

    // Initialize with some essential modules selected by default
    selectedModules.value = ['organization'] // Organization Management is essential

    // Business Module Categories
    const moduleCategories = ref([
      {
        id: 'core',
        name: 'Core Business',
        icon: 'fas fa-building'
      },
      {
        id: 'booking',
        name: 'Booking & Scheduling',
        icon: 'fas fa-calendar-alt'
      },
      {
        id: 'customer',
        name: 'Customer Management',
        icon: 'fas fa-users'
      },
      {
        id: 'financial',
        name: 'Finance & Billing',
        icon: 'fas fa-dollar-sign'
      },
      {
        id: 'marketing',
        name: 'Marketing & Sales',
        icon: 'fas fa-bullhorn'
      },
      {
        id: 'advanced',
        name: 'Advanced Features',
        icon: 'fas fa-cogs'
      }
    ])

    // Business Modules Data
    const businessModules = ref([
      // Core Business Modules
      {
        id: 'organization',
        name: 'Organization Management',
        description: 'Manage organization settings, users, and basic configuration',
        category: 'core',
        icon: 'fas fa-building',
        monthlyPrice: 0,
        essential: true,
        features: [
          'Multi-user access',
          'Basic user roles',
          'Organization settings',
          'Basic reporting'
        ]
      },
      {
        id: 'dashboard',
        name: 'Business Dashboard',
        description: 'Real-time analytics and KPI tracking for your business',
        category: 'core',
        icon: 'fas fa-chart-line',
        monthlyPrice: 18,
        popular: true,
        features: [
          'Real-time analytics',
          'Custom KPI tracking',
          'Performance metrics',
          'Visual reports'
        ]
      },

      // Booking & Scheduling
      {
        id: 'booking_basic',
        name: 'Basic Booking System',
        description: 'Simple appointment booking and scheduling',
        category: 'booking',
        icon: 'fas fa-calendar-check',
        monthlyPrice: 25,
        essential: true,
        features: [
          'Online booking',
          'Calendar integration',
          'Email notifications',
          'Basic scheduling'
        ]
      },
      {
        id: 'booking_advanced',
        name: 'Advanced Scheduling',
        description: 'Multi-resource scheduling with staff management',
        category: 'booking',
        icon: 'fas fa-calendar-plus',
        monthlyPrice: 46,
        tier: 'premium',
        features: [
          'Multi-resource booking',
          'Staff scheduling',
          'Resource management',
          'Advanced conflicts detection'
        ]
      },
      {
        id: 'booking_mobile',
        name: 'Mobile Booking App',
        description: 'Native mobile app for bookings (iOS & Android)',
        category: 'booking',
        icon: 'fas fa-mobile-alt',
        monthlyPrice: 62,
        tier: 'premium',
        features: [
          'iOS & Android apps',
          'Push notifications',
          'Offline capabilities',
          'Custom branding'
        ]
      },

      // Customer Management
      {
        id: 'crm_basic',
        name: 'Customer Database',
        description: 'Basic customer information and contact management',
        category: 'customer',
        icon: 'fas fa-address-book',
        monthlyPrice: 20,
        features: [
          'Customer profiles',
          'Contact history',
          'Basic segmentation',
          'Export capabilities'
        ]
      },
      {
        id: 'crm_advanced',
        name: 'Advanced CRM',
        description: 'Full CRM with sales pipeline and automation',
        category: 'customer',
        icon: 'fas fa-users-cog',
        monthlyPrice: 53,
        tier: 'premium',
        popular: true,
        features: [
          'Sales pipeline',
          'Marketing automation',
          'Lead scoring',
          'Advanced segmentation'
        ]
      },
      {
        id: 'loyalty',
        name: 'Loyalty Program',
        description: 'Reward points and customer loyalty management',
        category: 'customer',
        icon: 'fas fa-star',
        monthlyPrice: 32,
        features: [
          'Points system',
          'Reward tiers',
          'Automated rewards',
          'Loyalty analytics'
        ]
      },

      // Finance & Billing
      {
        id: 'billing_basic',
        name: 'Basic Invoicing',
        description: 'Create and send invoices with payment tracking',
        category: 'financial',
        icon: 'fas fa-file-invoice',
        monthlyPrice: 27,
        features: [
          'Invoice creation',
          'Payment tracking',
          'Tax calculations',
          'Basic reports'
        ]
      },
      {
        id: 'billing_advanced',
        name: 'Advanced Billing',
        description: 'Recurring billing, subscriptions, and payment automation',
        category: 'financial',
        icon: 'fas fa-credit-card',
        monthlyPrice: 55,
        tier: 'premium',
        features: [
          'Recurring billing',
          'Subscription management',
          'Payment automation',
          'Financial reporting'
        ]
      },
      {
        id: 'pos',
        name: 'Point of Sale',
        description: 'Complete POS system for retail and service businesses',
        category: 'financial',
        icon: 'fas fa-cash-register',
        monthlyPrice: 69,
        tier: 'premium',
        features: [
          'POS interface',
          'Inventory tracking',
          'Payment processing',
          'Receipt printing'
        ]
      },

      // Marketing & Sales
      {
        id: 'email_marketing',
        name: 'Email Marketing',
        description: 'Email campaigns and automated marketing',
        category: 'marketing',
        icon: 'fas fa-envelope',
        monthlyPrice: 34,
        features: [
          'Email campaigns',
          'Automated sequences',
          'Template library',
          'Campaign analytics'
        ]
      },
      {
        id: 'sms_marketing',
        name: 'SMS Marketing',
        description: 'SMS campaigns and appointment reminders',
        category: 'marketing',
        icon: 'fas fa-sms',
        monthlyPrice: 25,
        features: [
          'SMS campaigns',
          'Automated reminders',
          'Two-way messaging',
          'Delivery tracking'
        ]
      },
      {
        id: 'social_media',
        name: 'Social Media Integration',
        description: 'Social media scheduling and management',
        category: 'marketing',
        icon: 'fas fa-share-alt',
        monthlyPrice: 39,
        features: [
          'Post scheduling',
          'Multi-platform support',
          'Social analytics',
          'Content calendar'
        ]
      },

      // Advanced Features
      {
        id: 'ai_assistant',
        name: 'AI Assistant',
        description: 'AI-powered business insights and automation',
        category: 'advanced',
        icon: 'fas fa-robot',
        monthlyPrice: 104,
        tier: 'premium',
        features: [
          'AI business insights',
          'Predictive analytics',
          'Smart automation',
          'Natural language queries'
        ]
      },
      {
        id: 'api_access',
        name: 'API & Integrations',
        description: 'Developer API access and third-party integrations',
        category: 'advanced',
        icon: 'fas fa-plug',
        monthlyPrice: 62,
        tier: 'premium',
        features: [
          'Full API access',
          'Webhook support',
          'Custom integrations',
          'Developer documentation'
        ]
      },
      {
        id: 'white_label',
        name: 'White Label Solution',
        description: 'Complete white-label branding and customization',
        category: 'advanced',
        icon: 'fas fa-paint-brush',
        monthlyPrice: 209,
        tier: 'premium',
        features: [
          'Custom branding',
          'Domain customization',
          'UI customization',
          'Priority support'
        ]
      }
    ])

    const searchResults = ref([])
    const searchTimeout = ref(null)

    // API calls
    const fetchOrganizations = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.value.page,
          limit: pagination.value.limit,
          search: searchQuery.value,
          status: statusFilter.value
        }

        const response = await adminAPI.getAllOrganizations(params)

        if (response.data && (response.data.success || response.data.data)) {
          let orgsData = response.data.data?.organizations || response.data.organizations || []

          // Apply client-side plan filter if specified
          if (planFilter.value) {
            orgsData = orgsData.filter(org =>
              org.subscription?.plan_name?.toLowerCase() === planFilter.value.toLowerCase()
            )
          }

          organizations.value = orgsData
          const responseData = response.data.data || response.data
          pagination.value = {
            page: responseData.current_page || 1,
            limit: responseData.per_page || 20,
            total: responseData.total || orgsData.length,
            total_pages: responseData.last_page || Math.ceil(orgsData.length / 20)
          }
        } else {
          showNotification('Failed to fetch organizations', 'error')
          organizations.value = []
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error.message)
        // This should not happen now since we handle errors in the API interceptor
        showNotification('Using temporary organization data - backend unavailable', 'info')
        organizations.value = []
      } finally {
        loading.value = false
      }
    }


    const fetchOrganizationDetails = async (orgId) => {
      try {
        const response = await adminAPI.getOrganizationById(orgId)
        if (response.success) {
          orgDetails.value = response.data
        } else {
          showNotification('Failed to fetch organization details', 'error')
        }
      } catch (error) {
        showNotification('Error fetching organization details: ' + error.message, 'error')
        console.error('Error fetching organization details:', error)
      }
    }

    const createOrganization = async () => {
      createLoading.value = true
      try {
        let response
        if (isEditMode.value && selectedOrg.value) {
          // For editing, we'll use the updateOrganizationStatus as a placeholder
          // In a real implementation, you would create an updateOrganization API method
          const basicData = {
            name: newOrganization.name,
            abn: newOrganization.abn,
            email: newOrganization.email,
            phone: newOrganization.phone,
            website: newOrganization.website
          }
          // Note: This is a simplified approach. In a real implementation,
          // you would have a separate updateOrganization method in the API service
          response = { success: true, data: basicData }
          showNotification('Organization updated successfully (simulated)', 'info')
        } else {
          // Create new organization with selected modules
          const organizationData = {
            ...newOrganization,
            selectedModules: selectedModules.value,
            totalMonthlyPrice: getSelectedPlanPrice() + calculateMonthlyTotal(),
            totalAnnualPrice: calculateFinalAnnualTotal()
          }

          response = await adminAPI.createOrganization(organizationData)
          if (response.success) {
            showNotification('Organization created successfully', 'success')
          }
        }

        if (response.success) {
          closeCreateModal()
          fetchOrganizations()
        }
      } catch (error) {
        const action = isEditMode.value ? 'updating' : 'creating'
        showNotification(`Error ${action} organization: ` + error.message, 'error')
      } finally {
        createLoading.value = false
      }
    }

    const updateOrganizationStatus = async () => {
      statusLoading.value = true
      try {
        const response = await adminAPI.updateOrganizationStatus(
          selectedOrg.value.id, 
          statusUpdate.status
        )
        
        if (response.success) {
          showNotification('Organization status updated successfully', 'success')
          showStatusModal.value = false
          fetchOrganizations()
        }
      } catch (error) {
        showNotification('Error updating organization status: ' + error.message, 'error')
      } finally {
        statusLoading.value = false
      }
    }

    const confirmDeleteOrganization = (org) => {
      selectedOrg.value = org
      showDeleteModal.value = true
    }

    const confirmDelete = async () => {
      if (!selectedOrg.value) return
      
      try {
        const response = await adminAPI.deleteOrganization(selectedOrg.value.id)
        
        if (response.success) {
          showNotification('Organization deleted successfully', 'success')
          showDetailsModal.value = false
          showDeleteModal.value = false
          await fetchOrganizations()
        }
      } catch (error) {
        showNotification('Error deleting organization: ' + error.message, 'error')
      }
    }

    const deleteOrganization = async (org) => {
      if (!confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
        return
      }

      try {
        const response = await adminAPI.deleteOrganization(org.id)
        
        if (response.success) {
          showNotification('Organization deleted successfully', 'success')
          showDetailsModal.value = false
          fetchOrganizations()
        }
      } catch (error) {
        showNotification('Error deleting organization: ' + error.message, 'error')
      }
    }

    // Helper functions
    const debouncedSearch = () => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
      }

      searchTimeout.value = setTimeout(() => {
        handleSearch()
      }, 500)
    }

    const handleSearch = async () => {
      // Update search results for dropdown
      if (searchQuery.value) {
        try {
          const response = await adminAPI.getAllOrganizations({
            page: 1, // First page for search results
            limit: 10,  // Increased limit for better search results
            search: searchQuery.value
          })

          if (response.data && (response.data.success || response.data.data)) {
            let results = response.data.data?.organizations || response.data.organizations || []

            // Apply filters to search results
            if (statusFilter.value) {
              results = results.filter(org =>
                org.subscription?.status?.toLowerCase() === statusFilter.value.toLowerCase()
              )
            }
            if (planFilter.value) {
              results = results.filter(org =>
                org.subscription?.plan_name?.toLowerCase() === planFilter.value.toLowerCase()
              )
            }

            searchResults.value = results.slice(0, 5) // Limit dropdown to 5 items
          } else {
            searchResults.value = []
          }
        } catch {
          // For search dropdown, just clear results if API is not available
          searchResults.value = []
          console.warn('Search API not available')
        }
      } else {
        searchResults.value = []
      }

      // Reset pagination and fetch
      pagination.value.page = 1
      fetchOrganizations()
    }

    const selectOrganization = (org) => {
      searchQuery.value = org.name
      searchResults.value = []
      pagination.value.page = 1
      fetchOrganizations()
    }

    const changePage = (page) => {
      if (page >= 1 && page <= pagination.value.total_pages) {
        pagination.value.page = page
        fetchOrganizations()
      }
    }

    const resetCreateForm = () => {
      Object.assign(newOrganization, {
        name: '',
        abn: '',
        email: '',
        phone: '',
        website: '',
        address: {
          street: '',
          suburb: '',
          state: '',
          postcode: '',
          country: 'Australia'
        },
        ndis_registration: {
          registration_number: '',
          registration_status: '',
          expiry_date: null
        },
        admin_user: {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          password: ''
        },
        subscription: {
          plan_name: '',
          billing_email: '',
          max_users: 5,
          max_participants: 10,
          max_storage_gb: 5,
          billing_cycle: 'monthly'
        }
      })
    }

    const openCreateModal = () => {
      isEditMode.value = false
      selectedOrg.value = null
      resetCreateForm()
      showCreateModal.value = true
    }

    const closeCreateModal = () => {
      showCreateModal.value = false
      isEditMode.value = false
      selectedOrg.value = null
      currentStep.value = 1
      resetCreateForm()
    }

    // Multi-step navigation
    const nextStep = () => {
      if (currentStep.value < 4) {
        currentStep.value++
      }
    }
    const previousStep = () => {
      if (currentStep.value > 1) {
        currentStep.value--
      }
    }

    // Business Modules Methods
    const toggleModule = (moduleId) => {
      const index = selectedModules.value.indexOf(moduleId)
      if (index > -1) {
        selectedModules.value.splice(index, 1)
      } else {
        selectedModules.value.push(moduleId)
      }
    }

    const isModuleSelected = (moduleId) => {
      return selectedModules.value.includes(moduleId)
    }

    const getModulesByCategory = (categoryId) => {
      return businessModules.value.filter(module => module.category === categoryId)
    }

    const calculateMonthlyTotal = () => {
      return selectedModules.value.reduce((total, moduleId) => {
        const module = businessModules.value.find(m => m.id === moduleId)
        return total + (module ? module.monthlyPrice : 0)
      }, 0)
    }

    const calculateAnnualTotal = () => {
      const monthlyTotal = calculateMonthlyTotal()
      return Math.round(monthlyTotal * 12 * 0.9) // 10% discount for annual billing
    }

    const calculateAnnualSavings = () => {
      const monthlyTotal = calculateMonthlyTotal()
      return Math.round(monthlyTotal * 12 * 0.1) // 10% savings
    }

    const getSelectedModulesCount = computed(() => {
      return selectedModules.value.length
    })

    const getSelectedModulesInCategory = (categoryId) => {
      return selectedModules.value.filter(moduleId => {
        const module = businessModules.value.find(m => m.id === moduleId)
        return module && module.category === categoryId
      }).length
    }

    const getSelectedModuleDetails = () => {
      return selectedModules.value.map(moduleId => {
        return businessModules.value.find(m => m.id === moduleId)
      }).filter(Boolean)
    }

    const getSelectedPlanPrice = () => {
      const planPrices = {
        'starter': 29,
        'professional': 99,
        'enterprise': 299
      }
      return planPrices[newOrganization.subscription.plan_name] || 0
    }

    const calculateFinalAnnualTotal = () => {
      const planPrice = getSelectedPlanPrice()
      const modulesPrice = calculateMonthlyTotal()
      const monthlyTotal = planPrice + modulesPrice

      if (newOrganization.subscription.billing_cycle === 'yearly') {
        // 20% discount on base plan, 10% on modules for annual billing
        const planAnnual = Math.round(planPrice * 12 * 0.8)
        const modulesAnnual = calculateAnnualTotal()
        return planAnnual + modulesAnnual
      }

      return monthlyTotal * 12
    }

    const getTotalAnnualSavings = () => {
      if (newOrganization.subscription.billing_cycle !== 'yearly') return 0

      const planPrice = getSelectedPlanPrice()
      const modulesPrice = calculateMonthlyTotal()
      const monthlyTotal = planPrice + modulesPrice
      const regularAnnual = monthlyTotal * 12
      const discountedAnnual = calculateFinalAnnualTotal()

      return Math.round(regularAnnual - discountedAnnual)
    }

    const selectPlan = (planName) => {
      newOrganization.subscription.plan_name = planName
      // Set plan defaults based on selection
      switch (planName) {
        case 'starter':
          newOrganization.subscription.max_users = 5
          newOrganization.subscription.max_participants = 50
          newOrganization.subscription.max_storage_gb = 10
          newOrganization.subscription.monthly_rate = 29
          break
        case 'professional':
          newOrganization.subscription.max_users = 25
          newOrganization.subscription.max_participants = 250
          newOrganization.subscription.max_storage_gb = 50
          newOrganization.subscription.monthly_rate = 99
          break
        case 'enterprise':
          newOrganization.subscription.max_users = 100
          newOrganization.subscription.max_participants = 1000
          newOrganization.subscription.max_storage_gb = 100
          newOrganization.subscription.monthly_rate = 299
          break
      }
    }

    const viewOrganization = async (org) => {
      selectedOrg.value = org
      await fetchOrganizationDetails(org.id)
      showDetailsModal.value = true
    }

    const editStatus = (org) => {
      selectedOrg.value = org
      statusUpdate.status = getSubscriptionStatus(org)
      statusUpdate.reason = ''
      showStatusModal.value = true
    }

    const editOrganization = async (org) => {
      selectedOrg.value = org

      // Populate the edit form with current organization data
      Object.assign(newOrganization, {
        name: org.name || '',
        abn: org.abn || '',
        email: org.email || '',
        phone: org.phone || '',
        website: org.website || '',
        address: {
          street: org.address?.street || '',
          suburb: org.address?.suburb || '',
          state: org.address?.state || '',
          postcode: org.address?.postcode || '',
          country: org.address?.country || 'Australia'
        },
        ndis_registration: {
          registration_number: org.ndis_registration?.registration_number || '',
          registration_status: org.ndis_registration?.registration_status || '',
          expiry_date: org.ndis_registration?.expiry_date || null
        },
        admin_user: {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          password: ''
        },
        subscription: {
          plan_name: org.subscription?.plan_name || '',
          billing_email: org.subscription?.billing_email || '',
          max_users: org.subscription?.max_users || 5,
          max_participants: org.subscription?.max_participants || 10,
          max_storage_gb: org.subscription?.max_storage_gb || 5,
          billing_cycle: org.subscription?.billing_cycle || 'monthly'
        }
      })

      // Show create modal in edit mode
      isEditMode.value = true
      showCreateModal.value = true
    }

    const loginAsOrganization = async (org) => {
      try {
        // Show confirmation dialog first
        const confirmed = window.confirm(
          `Are you sure you want to log in as "${org.name}"?\n\n` +
          `This will switch your current session to manage this organization.`
        )

        if (!confirmed) {
          return
        }

        // Show loading toast
        showNotification('Switching to organization...', 'info')

        // In a real implementation, this would:
        // 1. Make API call to get organization access token
        // 2. Store organization context
        // 3. Update user permissions/role
        // 4. Redirect to organization dashboard

        // For now, simulate the process
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Store organization context using the composable
        const success = setOrganizationContext(org)

        if (!success) {
          throw new Error('Failed to set organization context')
        }

        // Show success and redirect
        showNotification(
          `Successfully logged in as "${org.name}". Redirecting to organization dashboard...`,
          'success'
        )

        // Redirect to the main dashboard with organization context
        setTimeout(() => {
          // Update the URL to indicate organization context
          window.location.href = `/dashboard?org=${org.id}&name=${encodeURIComponent(org.name)}`
        }, 1500)

      } catch (error) {
        showNotification('Failed to switch to organization: ' + error.message, 'error')
        console.error('Error switching to organization:', error)
      }
    }

    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
      planFilter.value = ''
      searchResults.value = []
      pagination.value.page = 1
      fetchOrganizations()
    }


    const getSubscriptionPlan = (org) => {
      return org.subscription?.plan_name || 'Unknown'
    }

    const getSubscriptionStatus = (org) => {
      return org.subscription?.status || 'active'
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString()
    }

    const formatStatus = (status) => {
      if (!status) return 'Active'
      return status.charAt(0).toUpperCase() + status.slice(1)
    }

    // Lifecycle
    onMounted(() => {
      fetchOrganizations()

      // Auto-refresh data when window gains focus to prevent stale data
      const handleFocus = () => {
        fetchOrganizations()
      }

      window.addEventListener('focus', handleFocus)

      // Cleanup on unmount
      return () => {
        window.removeEventListener('focus', handleFocus)
      }
    })

    // Modules Management
    const showModulesModal = ref(false)
    const modulesLoading = ref(false)
    const selectedOrgForModules = ref(null)
    const orgModules = ref({})

    // Available modules configuration
    const availableModules = ref([
      {
        id: 'booking',
        name: 'Booking System',
        description: 'Schedule and manage appointments',
        icon: 'fas fa-calendar-alt',
        required: true,
        category: 'core'
      },
      {
        id: 'customers',
        name: 'Customer Management',
        description: 'Manage customer profiles and history',
        icon: 'fas fa-users',
        required: true,
        category: 'core'
      },
      {
        id: 'staff',
        name: 'Staff Management',
        description: 'Manage staff profiles and schedules',
        icon: 'fas fa-user-tie',
        required: false,
        category: 'core'
      },
      {
        id: 'services',
        name: 'Service Catalog',
        description: 'Define services and pricing',
        icon: 'fas fa-concierge-bell',
        required: false,
        category: 'core'
      },
      {
        id: 'inventory',
        name: 'Inventory Management',
        description: 'Track stock and equipment',
        icon: 'fas fa-boxes',
        required: false,
        category: 'advanced'
      },
      {
        id: 'finance',
        name: 'Financial Management',
        description: 'Invoicing and payment tracking',
        icon: 'fas fa-dollar-sign',
        required: false,
        category: 'advanced'
      },
      {
        id: 'reports',
        name: 'Analytics & Reports',
        description: 'Business insights and reporting',
        icon: 'fas fa-chart-bar',
        required: false,
        category: 'advanced'
      },
      {
        id: 'integration',
        name: 'API Integration',
        description: 'Third-party integrations',
        icon: 'fas fa-plug',
        required: false,
        category: 'enterprise'
      }
    ])

    // Modules management methods
    const manageModules = (org) => {
      selectedOrgForModules.value = org
      // Initialize with current modules or defaults
      const defaultModules = {
        booking: true,
        customers: true,
        staff: org.enabled_modules?.includes('staff') || false,
        services: org.enabled_modules?.includes('services') || false,
        inventory: org.enabled_modules?.includes('inventory') || false,
        finance: org.enabled_modules?.includes('finance') || false,
        reports: org.enabled_modules?.includes('reports') || false,
        integration: org.enabled_modules?.includes('integration') || false,
      }

      // Safely merge with modules_config if it exists
      orgModules.value = {
        ...defaultModules,
        ...(org.modules_config || {})
      }

      showModulesModal.value = true
    }

    const closeModulesModal = () => {
      showModulesModal.value = false
      selectedOrgForModules.value = null
      orgModules.value = {}
    }

    const toggleModuleForOrg = (moduleId) => {
      const module = availableModules.value.find(m => m.id === moduleId)
      if (module && !module.required) {
        orgModules.value[moduleId] = !orgModules.value[moduleId]
      }
    }

    const saveModulesConfig = async () => {
      if (!selectedOrgForModules.value) return

      modulesLoading.value = true
      try {
        const enabledModules = Object.keys(orgModules.value).filter(key => orgModules.value[key])

        const response = await adminAPI.updateOrganizationModules(
          selectedOrgForModules.value.id,
          {
            enabled_modules: enabledModules,
            modules_config: orgModules.value
          }
        )

        if (response.success) {
          showNotification('Modules configuration updated successfully', 'success')

          // Update local organization data
          const orgIndex = organizations.value.findIndex(org => org.id === selectedOrgForModules.value.id)
          if (orgIndex !== -1) {
            organizations.value[orgIndex].enabled_modules = enabledModules
            organizations.value[orgIndex].modules_config = orgModules.value
          }

          closeModulesModal()
        } else {
          showNotification('Failed to update modules configuration', 'error')
        }
      } catch (error) {
        console.error('Error updating modules:', error)
        showNotification('Error updating modules configuration', 'error')
      } finally {
        modulesLoading.value = false
      }
    }

    // Computed properties for modules
    const enabledModulesCount = computed(() => {
      return Object.values(orgModules.value).filter(Boolean).length
    })

    const isModuleEnabled = (moduleId) => {
      return orgModules.value[moduleId] || false
    }

    return {
      // State
      organizations,
      loading,
      searchQuery,
      statusFilter,
      planFilter,
      pagination,
      showCreateModal,
      showStatusModal,
      showDetailsModal,
      showDeleteModal,
      createLoading,
      statusLoading,
      isEditMode,
      selectedOrg,
      orgDetails,
      newOrganization,
      statusUpdate,
      searchResults,

      // Business Modules State
      selectedModules,
      activeModuleCategory,
      showPricingBreakdown,
      moduleCategories,
      businessModules,
      getSelectedModulesCount,

      // Modules Management
      showModulesModal,
      modulesLoading,
      selectedOrgForModules,
      orgModules,
      availableModules,
      enabledModulesCount,

      // Methods
      fetchOrganizations,
      createOrganization,
      updateOrganizationStatus,
      confirmDeleteOrganization,
      confirmDelete,
      deleteOrganization,
      handleSearch,
      debouncedSearch,
      selectOrganization,
      changePage,
      viewOrganization,
      editStatus,
      editOrganization,
      loginAsOrganization,
      clearFilters,
      openCreateModal,
      closeCreateModal,
      nextStep,
      previousStep,
      selectPlan,

      // Business Modules Methods
      toggleModule,
      isModuleSelected,
      getModulesByCategory,
      calculateMonthlyTotal,
      calculateAnnualTotal,
      calculateAnnualSavings,
      getSelectedModulesInCategory,
      getSelectedModuleDetails,
      getSelectedPlanPrice,
      calculateFinalAnnualTotal,
      getTotalAnnualSavings,
      currentStep,
      getSubscriptionPlan,
      getSubscriptionStatus,
      formatDate,
      formatStatus,

      // Module Management Methods
      manageModules,
      closeModulesModal,
      toggleModuleForOrg,
      saveModulesConfig,
      isModuleEnabled
    }
  }
}
</script>

<style scoped>
/* Professional Organizations Page - Improved Layout */

/* Page Container */
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* Page Header */
.page-header {
  margin-bottom: 28px;
}

.page-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.page-actions {
  flex-shrink: 0;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-weight: 500;
  font-size: 13px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title i {
  color: #3b82f6;
  font-size: 16px;
}

.page-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

/* Action Buttons */
.page-actions {
  margin-bottom: 20px;
}

.btn.btn-primary {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: white;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn.btn-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
  transform: translateY(-1px);
}

/* Improved Search and Filters */
.filters-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filters-container {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  min-width: 300px;
  max-width: 450px;
}

.search-input-wrapper {
  position: relative;
}

.search-input-wrapper i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 14px;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #f9fafb;
  transition: all 0.2s ease;
  color: #374151;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #ffffff;
}

.filter-controls {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin: 0;
}

.filter-select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #f9fafb;
  color: #374151;
  min-width: 120px;
  transition: all 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #ffffff;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.clear-filters-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

/* Enhanced Search Dropdown */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 2px;
}

.search-result-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-result-item:hover {
  background: #f9fafb;
}

.search-result-item:last-child {
  border-bottom: none;
}

.result-content {
  width: 100%;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.result-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.result-plan {
  font-size: 11px;
  padding: 2px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.result-details {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6b7280;
}

/* Organizations Grid - Higher Density */
.organizations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

/* Compact Professional Organization Cards */
.organization-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}

.organization-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.organization-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

/* Compact Organization Header */
.org-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.org-avatar {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.2);
}

.org-basic-info {
  flex: 1;
  min-width: 0;
}

.org-name {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px 0;
  line-height: 1.2;
  word-break: break-word;
  letter-spacing: 0;
}

.org-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #64748b;
  line-height: 1.2;
  font-weight: 400;
}

.detail-item i {
  width: 8px;
  color: #3b82f6;
  text-align: center;
  font-size: 8px;
  flex-shrink: 0;
}

.org-status {
  flex-shrink: 0;
}

/* Compact Status Badges */
.status-badge {
  padding: 3px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1;
}

.status-badge.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.status-suspended {
  background: #fed7aa;
  color: #c2410c;
}

.status-badge.status-cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge.status-inactive {
  background: #f3f4f6;
  color: #6b7280;
}

/* Ultra-Compact Organization Stats */
.org-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 8px 0 6px 0;
  padding: 10px;
  background: #f8fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 3px;
  padding: 3px;
}

.organization-card .org-stats .stat-item .stat-icon {
  width: 20px !important;
  height: 20px !important;
  border-radius: 3px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 10px !important;
  color: white !important;
  flex-shrink: 0 !important;
}

.stat-icon.users {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.stat-icon.participants {
  background: linear-gradient(135deg, #10b981, #059669);
}

.stat-icon.subscription {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.stat-icon.storage {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.organization-card .org-stats .stat-item .stat-content .stat-number {
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #1f2937 !important;
  line-height: 1.2 !important;
  font-feature-settings: 'tnum' !important;
  text-align: center !important;
  min-height: 18px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.organization-card .org-stats .stat-item .stat-content .stat-label {
  font-size: 10px !important;
  color: #64748b !important;
  text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
  font-weight: 600 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 100% !important;
  text-align: center !important;
  min-height: 12px !important;
}

/* Force Small Text Sizes for Stat Content - Override Any Bootstrap/Global CSS */
.organization-card .stat-content .stat-number {
  font-size: 15px !important;
}

.organization-card .stat-content .stat-label {
  font-size: 10px !important;
}

.organization-card .stat-item .stat-content > div {
  font-size: inherit !important;
}

/* Ultra-Compact Contact Info */
.org-contact {
  margin: 10px 0;
  padding: 8px 0;
  border-top: 1px solid #f3f4f6;
  border-bottom: 1px solid #f3f4f6;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 3px 0;
  font-size: 11px;
  color: #6b7280;
  line-height: 1.3;
}

.contact-item i {
  width: 10px;
  color: #3b82f6;
  text-align: center;
  font-size: 9px;
}

/* Ultra-Compact Action Buttons */
.org-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 10px;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #ffffff;
  color: #374151;
  font-size: 11px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-view {
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-view:hover {
  background: #3b82f6;
  color: white;
}

.btn-edit {
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-edit:hover {
  background: #f59e0b;
  color: white;
}

.btn-status {
  border-color: #10b981;
  color: #10b981;
}

.btn-status:hover {
  background: #10b981;
  color: white;
}

.btn-login {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.btn-login:hover {
  background: #8b5cf6;
  color: white;
}

/* Loading and Empty States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
  gap: 12px;
}

.empty-state i {
  font-size: 48px;
  color: #d1d5db;
}

/* Content Card */
.content-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #3b82f6;
  color: #3b82f6;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #6b7280;
  margin: 0 16px;
}

/* Dark Theme Support */
[data-bs-theme="dark"] .page-container {
  background: #111827;
  color: #f9fafb;
}

[data-bs-theme="dark"] .page-title {
  color: #f9fafb;
}

[data-bs-theme="dark"] .page-subtitle {
  color: #9ca3af;
}

[data-bs-theme="dark"] .btn.btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .btn.btn-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

[data-bs-theme="dark"] .filters-section {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .search-input {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .search-input:focus {
  background: #374151;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .search-input::placeholder {
  color: #9ca3af;
}

[data-bs-theme="dark"] .filter-select {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .filter-select:focus {
  background: #374151;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .filter-label {
  color: #d1d5db;
}

[data-bs-theme="dark"] .clear-filters-btn {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .clear-filters-btn:hover {
  background: #4b5563;
  border-color: #6b7280;
}

[data-bs-theme="dark"] .search-dropdown {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .search-result-item:hover {
  background: #374151;
}

[data-bs-theme="dark"] .result-name {
  color: #f9fafb;
}

[data-bs-theme="dark"] .result-details {
  color: #9ca3af;
}

[data-bs-theme="dark"] .content-card {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .organization-card {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .organization-card:hover {
  border-color: #4b5563;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-bs-theme="dark"] .org-name {
  color: #f9fafb;
}

[data-bs-theme="dark"] .detail-item {
  color: #9ca3af;
}

[data-bs-theme="dark"] .org-stats {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .stat-number {
  color: #f9fafb !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

[data-bs-theme="dark"] .stat-label {
  color: #d1d5db !important;
}

[data-bs-theme="dark"] .organization-card .org-stats .stat-item .stat-content .stat-number {
  color: #f9fafb !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

[data-bs-theme="dark"] .organization-card .org-stats .stat-item .stat-content .stat-label {
  color: #d1d5db !important;
}

[data-bs-theme="dark"] .contact-item {
  color: #9ca3af;
}

[data-bs-theme="dark"] .btn-action {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .btn-action:hover {
  background: #4b5563;
}

[data-bs-theme="dark"] .btn-view:hover {
  background: #3b82f6;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .btn-edit:hover {
  background: #f59e0b;
  border-color: #f59e0b;
}

[data-bs-theme="dark"] .btn-status:hover {
  background: #10b981;
  border-color: #10b981;
}

[data-bs-theme="dark"] .btn-login:hover {
  background: #8b5cf6;
  border-color: #8b5cf6;
}

[data-bs-theme="dark"] .loading-state {
  color: #9ca3af;
}

[data-bs-theme="dark"] .loading-spinner {
  border-color: #4b5563;
  border-top-color: #3b82f6;
}

[data-bs-theme="dark"] .empty-state {
  color: #9ca3af;
}

[data-bs-theme="dark"] .empty-state i {
  color: #6b7280;
}

[data-bs-theme="dark"] .pagination {
  border-color: #374151;
}

[data-bs-theme="dark"] .pagination button {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .pagination button:hover:not(:disabled) {
  background: #4b5563;
  border-color: #3b82f6;
  color: #3b82f6;
}

[data-bs-theme="dark"] .page-info {
  color: #9ca3af;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .organizations-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }

  .organizations-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .org-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .org-actions {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .organization-card {
    padding: 14px;
  }

  .filters-container {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .search-container {
    min-width: unset;
    max-width: unset;
  }

  .filter-controls {
    justify-content: stretch;
  }

  .filter-group {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .org-stats {
    grid-template-columns: 1fr;
  }

  .stat-item {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
    gap: 8px;
  }

  .organizations-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .organization-card {
    padding: 12px;
  }
}

/* Modern Modal Styles */
.modern-modal {
  max-width: 800px;
  width: 90vw;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  border: none;
}

.modal-title-section {
  flex: 1;
}

.modal-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-title i {
  color: #3b82f6;
  font-size: 24px;
}

.modal-subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
}

.btn-close-modern {
  width: 40px;
  height: 40px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  color: #6b7280;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-close-modern:hover {
  background: #e5e7eb;
  color: #374151;
}

/* Step Progress Indicator */
.step-progress {
  padding: 24px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 500px;
  margin: 0 auto;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  text-align: center;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
}

.step.active .step-circle {
  background: #3b82f6;
  color: #ffffff;
}

.step.completed .step-circle {
  background: #10b981;
  color: #ffffff;
}

.step-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.step.active .step-label {
  color: #3b82f6;
  font-weight: 600;
}

.step.completed .step-label {
  color: #10b981;
  font-weight: 600;
}

.step-line {
  height: 2px;
  background: #e5e7eb;
  margin: 16px 8px 0 8px;
  transition: all 0.3s ease;
  flex: 1;
}

.step-line.completed {
  background: #10b981;
}

/* Form Steps */
.form-step {
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.step-header {
  margin-bottom: 32px;
  text-align: center;
  padding-bottom: 24px;
  border-bottom: 1px solid #f3f4f6;
}

.step-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.step-title i {
  color: #3b82f6;
  font-size: 18px;
}

.step-description {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

/* Modern Form Styles */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
  color: #1f2937;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-hint {
  color: #6b7280;
  font-size: 12px;
  margin-top: 6px;
  font-style: italic;
}

/* Plan Selection */
.plan-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.plan-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.plan-card:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

.plan-card.selected {
  border-color: #3b82f6;
  background: #f0f9ff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.plan-header {
  text-align: center;
  margin-bottom: 16px;
}

.plan-header h4 {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.plan-price {
  font-size: 24px;
  font-weight: 800;
  color: #3b82f6;
}

.plan-price span {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.plan-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature {
  font-size: 14px;
  color: #374151;
  display: flex;
  align-items: center;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0 0 0;
  border-top: 1px solid #f3f4f6;
  margin-top: auto;
}

.actions-left,
.actions-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  border: 2px solid;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.btn-secondary {
  background: #ffffff;
  border-color: #e5e7eb;
  color: #6b7280;
}

.btn-secondary:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.btn-outline {
  background: #ffffff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-outline:hover {
  background: #3b82f6;
  color: #ffffff;
}

.btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.btn-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-success {
  background: #10b981;
  border-color: #10b981;
  color: #ffffff;
}

.btn-success:hover {
  background: #059669;
  border-color: #059669;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Dark Theme Support for Modal */
[data-bs-theme="dark"] .modern-modal {
  background: #1f2937;
}

[data-bs-theme="dark"] .modal-title {
  color: #f9fafb;
}

[data-bs-theme="dark"] .modal-subtitle {
  color: #9ca3af;
}

[data-bs-theme="dark"] .btn-close-modern {
  background: #374151;
  color: #9ca3af;
}

[data-bs-theme="dark"] .btn-close-modern:hover {
  background: #4b5563;
  color: #f3f4f6;
}

[data-bs-theme="dark"] .step-progress {
  background: #111827;
  border-color: #374151;
}

[data-bs-theme="dark"] .step-header {
  border-color: #374151;
}

[data-bs-theme="dark"] .step-title {
  color: #f9fafb;
}

[data-bs-theme="dark"] .step-description {
  color: #9ca3af;
}

[data-bs-theme="dark"] .form-label {
  color: #f3f4f6;
}

[data-bs-theme="dark"] .form-input,
[data-bs-theme="dark"] .form-select {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .form-input:focus,
[data-bs-theme="dark"] .form-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

[data-bs-theme="dark"] .plan-card {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .plan-card.selected {
  background: #1e3a8a;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .plan-header h4 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .feature {
  color: #d1d5db;
}

[data-bs-theme="dark"] .form-actions {
  border-color: #374151;
}

[data-bs-theme="dark"] .btn-secondary {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

[data-bs-theme="dark"] .btn-secondary:hover {
  background: #4b5563;
  border-color: #6b7280;
}

[data-bs-theme="dark"] .btn-outline {
  background: #1f2937;
  border-color: #3b82f6;
  color: #3b82f6;
}

/* Responsive Modal */
@media (max-width: 768px) {
  .modern-modal {
    width: 95vw;
    margin: 20px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .plan-selection {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
    gap: 16px;
  }

  .actions-left,
  .actions-right {
    width: 100%;
    justify-content: center;
  }
}

/* Modules Management Modal Styles */
.modules-modal {
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.module-item {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.module-item.enabled {
  border-color: #10b981;
  background: #f0fdf4;
}

.module-item.disabled {
  border-color: #e5e7eb;
  background: #f9fafb;
}

.module-item.required {
  border-color: #3b82f6;
  background: #eff6ff;
  opacity: 0.8;
}

.module-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.module-info {
  flex: 1;
}

.module-icon {
  font-size: 24px;
  margin-bottom: 8px;
  color: #6b7280;
}

.module-item.enabled .module-icon {
  color: #10b981;
}

.module-item.required .module-icon {
  color: #3b82f6;
}

.module-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.module-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.module-toggle {
  margin-left: 12px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .toggle-slider {
  background-color: #10b981;
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

input:disabled + .toggle-slider {
  cursor: not-allowed;
  opacity: 0.6;
}

.required-badge {
  display: inline-block;
  background: #3b82f6;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 8px;
}

.modules-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0 0 0;
  border-top: 1px solid #e5e7eb;
  margin-top: 20px;
}

.modules-count {
  font-size: 14px;
  color: #6b7280;
}

.modules-count strong {
  color: #1f2937;
  font-weight: 600;
}

.modules-actions {
  display: flex;
  gap: 12px;
}

.btn-modules {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.btn-modules:hover {
  background: #8b5cf6;
  color: white;
}

/* Responsive design for modules modal */
@media (max-width: 768px) {
  .modules-modal {
    width: 95%;
    max-height: 85vh;
  }

  .modules-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .module-item {
    padding: 12px;
  }

  .modules-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .modules-actions {
    justify-content: center;
  }
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

/* Enhanced Modules Modal Content */
.modules-modal .modal-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  border: none;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  overflow: hidden;
}

.modules-modal .modal-header {
  padding: 24px 32px 20px 32px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modules-modal .modal-body {
  padding: 24px 32px;
  max-height: 60vh;
  overflow-y: auto;
}

.modules-modal .modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.modules-modal .module-item {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.modules-modal .module-item.enabled {
  border-color: #10b981;
  background: #f0fdf4;
}

.modules-modal .module-item.required {
  border-color: #3b82f6;
  background: #eff6ff;
  opacity: 0.9;
}

.modules-modal .module-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.modules-modal .module-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.modules-modal .module-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #6b7280;
  background: #ffffff;
  border: 1px solid #d1d5db;
  flex-shrink: 0;
}

.modules-modal .module-item.enabled .module-icon {
  color: #10b981;
  background: #ecfdf5;
  border-color: #10b981;
}

.modules-modal .module-item.required .module-icon {
  color: #3b82f6;
  background: #dbeafe;
  border-color: #3b82f6;
}

.modules-modal .module-details {
  flex: 1;
}

.modules-modal .module-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1.3;
}

.modules-modal .module-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
  margin-bottom: 8px;
}

.modules-modal .required-badge {
  display: inline-block;
  background: #3b82f6;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modules-modal .module-toggle {
  margin-left: 16px;
  flex-shrink: 0;
}

/* Professional Toggle Switch */
.modules-modal .toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.modules-modal .toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.modules-modal .toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 26px;
  transition: 0.3s;
}

.modules-modal .toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.modules-modal input:checked + .toggle-slider {
  background-color: #10b981;
}

.modules-modal input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.modules-modal input:disabled + .toggle-slider {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Modal Footer */
.modules-modal .modules-footer {
  padding: 20px 32px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modules-modal .modules-count {
  font-size: 14px;
  color: #6b7280;
}

.modules-modal .modules-count strong {
  color: #1f2937;
  font-weight: 600;
}

.modules-modal .modules-actions {
  display: flex;
  gap: 12px;
}

/* Dark Theme Support for Modal */
[data-bs-theme="dark"] .modules-modal .modal-content {
  background: #1f2937;
}

[data-bs-theme="dark"] .modules-modal .modal-header {
  border-color: #374151;
}

[data-bs-theme="dark"] .modules-modal .modal-body {
  background: #1f2937;
}

[data-bs-theme="dark"] .modules-modal .module-item {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .modules-modal .module-item.enabled {
  background: #064e3b;
  border-color: #10b981;
}

[data-bs-theme="dark"] .modules-modal .module-item.required {
  background: #1e3a8a;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .modules-modal .module-icon {
  background: #4b5563;
  border-color: #6b7280;
  color: #9ca3af;
}

[data-bs-theme="dark"] .modules-modal .module-item.enabled .module-icon {
  background: #065f46;
  border-color: #10b981;
  color: #10b981;
}

[data-bs-theme="dark"] .modules-modal .module-item.required .module-icon {
  background: #1e40af;
  border-color: #3b82f6;
  color: #3b82f6;
}

[data-bs-theme="dark"] .modules-modal .module-name {
  color: #f9fafb;
}

[data-bs-theme="dark"] .modules-modal .module-description {
  color: #9ca3af;
}

[data-bs-theme="dark"] .modules-modal .modules-footer {
  background: #111827;
  border-color: #374151;
}

[data-bs-theme="dark"] .modules-modal .modules-count {
  color: #9ca3af;
}

[data-bs-theme="dark"] .modules-modal .modules-count strong {
  color: #f9fafb;
}

/* Responsive design for modules modal */
@media (max-width: 768px) {
  .modules-modal .modal-content {
    width: 95%;
    margin: 20px;
    max-height: 90vh;
  }

  .modules-modal .modal-header {
    padding: 20px 24px 16px 24px;
  }

  .modules-modal .modal-body {
    padding: 20px 24px;
    max-height: 65vh;
  }

  .modules-modal .modules-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .modules-modal .module-item {
    padding: 14px;
  }

  .modules-modal .module-info {
    gap: 10px;
  }

  .modules-modal .module-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .modules-modal .modules-footer {
    padding: 16px 24px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .modules-modal .modules-actions {
    justify-content: center;
  }
}

/* Business Modules Step Styles - Sidebar Layout Design */
.modules-step {
  padding: 0;
}

/* Main Layout Container */
.modules-layout {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  min-height: 500px;
}

/* Left Sidebar - Categories Menu */
.modules-sidebar {
  width: 280px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-header {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-header i {
  font-size: 14px;
}

/* Categories Menu Navigation */
.categories-menu {
  padding: 8px 0;
}

.category-menu-item {
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0;
}

.category-menu-item:hover {
  background: rgba(59, 130, 246, 0.08);
}

.category-menu-item.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
  border-right: 3px solid #3b82f6;
}

.menu-item-content {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  gap: 12px;
}

.menu-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #6b7280;
  flex-shrink: 0;
}

.category-menu-item.active .menu-icon {
  color: #3b82f6;
}

.menu-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.category-menu-item.active .menu-text {
  color: #1f2937;
  font-weight: 600;
}

.selected-badge {
  background: #10b981;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Sidebar Summary */
.sidebar-summary {
  border-top: 1px solid #e2e8f0;
  padding: 16px 20px;
  background: white;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.summary-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

/* Right Content Area */
.modules-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.category-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-title i {
  color: #3b82f6;
  font-size: 16px;
}

.content-stats {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

/* Dense Module Grid */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  flex: 1;
}

/* Compact Module Cards */
.module-card {
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  min-height: 180px;
}

.module-card:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

.module-card.selected {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.05));
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

/* Compact Module Header */
.module-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 12px;
}

.module-icon i {
  font-size: 16px;
  color: white;
}

.module-card.selected .module-icon {
  background: linear-gradient(135deg, #10b981, #059669);
}

/* Compact Module Info */
.module-info {
  margin-bottom: 12px;
}

.module-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
  line-height: 1.2;
}

.module-description {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Inline Price & Badges */
.module-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.price-amount {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.price-period {
  color: #6b7280;
  font-size: 11px;
}

.module-badges {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.module-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-essential {
  background: #fef3c7;
  color: #92400e;
}

.badge-popular {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-premium {
  background: #f3e8ff;
  color: #7c3aed;
}

/* Compact Features */
.module-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.module-features li {
  color: #374151;
  font-size: 11px;
  margin-bottom: 4px;
  padding-left: 14px;
  position: relative;
  line-height: 1.3;
}

.module-features li:before {
  content: '•';
  color: #10b981;
  font-weight: bold;
  position: absolute;
  left: 0;
  font-size: 12px;
}

/* Enhanced Selection Checkbox */
.module-checkbox {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  background: white;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.module-card.selected .module-checkbox {
  background: #10b981;
  border-color: #10b981;
  transform: scale(1.1);
}

.module-checkbox i {
  color: white;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.module-card.selected .module-checkbox i {
  opacity: 1;
}

/* Bottom Pricing Summary */
.pricing-summary-bottom {
  margin-top: 24px;
  border-top: 1px solid #e2e8f0;
  padding-top: 24px;
}

.pricing-card {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  border-radius: 12px;
  padding: 20px;
  border: 1.5px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.pricing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.pricing-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pricing-header i {
  font-size: 14px;
  color: #3b82f6;
}

.selected-count {
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
}

.pricing-totals {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.total-row.annual {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.1));
  border: 1px solid #10b981;
}

.total-label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.total-amount {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.annual .total-amount {
  color: #059669;
}

.savings {
  font-size: 10px;
  color: #059669;
  font-weight: 600;
  background: #d1fae5;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

/* Mobile Responsive */
@media (max-width: 1024px) {
  .modules-layout {
    flex-direction: column;
    gap: 16px;
  }

  .modules-sidebar {
    width: 100%;
    max-height: 200px;
  }

  .categories-menu {
    display: flex;
    flex-wrap: wrap;
    padding: 12px;
    gap: 8px;
  }

  .category-menu-item {
    flex: 1;
    min-width: 120px;
    border-radius: 8px;
    background: white;
    border: 1px solid #e2e8f0;
  }

  .category-menu-item.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
  }

  .category-menu-item.active .menu-text,
  .category-menu-item.active .menu-icon {
    color: white;
  }

  .menu-item-content {
    padding: 8px 12px;
    justify-content: center;
    text-align: center;
    flex-direction: column;
    gap: 4px;
  }

  .menu-text {
    font-size: 12px;
  }

  .sidebar-summary {
    display: none;
  }

  .content-header {
    margin-bottom: 16px;
  }
}

@media (max-width: 768px) {
  .modules-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }

  .module-card {
    padding: 14px;
    min-height: 160px;
  }

  .pricing-card {
    padding: 16px;
  }

  .total-amount {
    font-size: 16px;
  }

  .category-menu-item {
    min-width: 100px;
  }

  .menu-text {
    font-size: 11px;
  }

  .menu-icon {
    font-size: 12px;
  }
}

@media (max-width: 640px) {
  .modules-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .module-features li {
    font-size: 10px;
  }

  .content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .category-title {
    font-size: 16px;
  }

  .pricing-totals {
    gap: 8px;
  }

  .total-row {
    padding: 10px 12px;
  }

  .modules-sidebar {
    max-height: none;
  }

  .categories-menu {
    flex-direction: column;
    gap: 6px;
  }

  .category-menu-item {
    min-width: auto;
  }
}

/* Subscription Step Styles */
.subscription-step {
  padding: 0;
}

.subscription-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 24px;
}

/* Left Side - Summary */
.subscription-summary {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.summary-title {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  padding: 16px 20px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-title i {
  color: #3b82f6;
  font-size: 14px;
}

.summary-content {
  padding: 20px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.summary-item:last-child {
  border-bottom: none;
}

.item-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.item-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

/* Modules Summary */
.no-modules {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.selected-modules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.module-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.module-summary-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.module-summary-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.module-summary-details {
  display: flex;
  flex-direction: column;
}

.module-summary-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.module-summary-category {
  font-size: 12px;
  color: #6b7280;
}

.module-summary-price {
  font-size: 14px;
  font-weight: 700;
  color: #059669;
}

.modules-total {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
  margin-top: 16px;
}

.total-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.total-line:last-child {
  margin-bottom: 0;
}

.total-line.annual {
  color: #059669;
  font-weight: 600;
}

.total-amount {
  font-weight: 700;
}

/* Right Side - Plan & Payment */
.subscription-plan {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.plan-section,
.billing-section,
.final-summary {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.section-title {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  padding: 16px 20px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title i {
  color: #3b82f6;
  font-size: 14px;
}

/* Compact Plan Selection */
.plan-selection-compact {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8fafc;
}

.plan-option:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.plan-option.selected {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
}

.plan-info {
  flex: 1;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.plan-description {
  font-size: 12px;
  color: #6b7280;
}

.plan-specs {
  display: flex;
  gap: 12px;
  margin: 0 16px;
}

.spec {
  font-size: 11px;
  color: #374151;
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.plan-price {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
  margin-left: 16px;
}

/* Billing Form */
.billing-form {
  padding: 20px;
}

.billing-cycle-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.cycle-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8fafc;
}

.cycle-option:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.cycle-option.selected {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
}

.cycle-option input[type="radio"] {
  margin-right: 12px;
}

.cycle-content {
  flex: 1;
}

.cycle-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  display: block;
  margin-bottom: 4px;
}

.cycle-description {
  font-size: 12px;
  color: #6b7280;
}

.cycle-price {
  text-align: right;
  font-size: 14px;
}

.original-price {
  display: block;
  color: #6b7280;
  text-decoration: line-through;
  font-size: 12px;
}

.discount-price {
  display: block;
  color: #059669;
  font-weight: 600;
  font-size: 14px;
}

/* Final Summary */
.pricing-breakdown {
  padding: 20px;
}

.pricing-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.pricing-item.total {
  border-top: 1px solid #e2e8f0;
  margin-top: 12px;
  padding-top: 12px;
  font-weight: 600;
  font-size: 16px;
}

.pricing-item.annual-total {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.1));
  margin: 12px -20px 0;
  padding: 12px 20px;
  border-top: 1px solid #10b981;
  color: #059669;
  font-weight: 600;
}

.pricing-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 12px 0;
}

.price {
  font-weight: 700;
  color: #1f2937;
}

.annual-total .price {
  color: #059669;
}

.savings-note {
  background: #d1fae5;
  color: #059669;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .subscription-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .plan-specs {
    flex-direction: column;
    gap: 6px;
  }

  .plan-option {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .plan-price {
    margin-left: 0;
    align-self: flex-end;
  }

  .billing-cycle-options {
    gap: 8px;
  }

  .cycle-option {
    padding: 12px;
  }
}

/* Dark Theme Support for Create Organization Modal */
[data-theme="dark"] .modal-overlay {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

[data-theme="dark"] .modal-content {
  background: #1f2937;
  border: 1px solid #374151;
  color: #f9fafb;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
}

[data-theme="dark"] .modal-header {
  background: #111827;
  border-bottom-color: #374151;
  color: #f9fafb;
}

[data-theme="dark"] .modal-body {
  background: #1f2937;
}

[data-theme="dark"] .modal-title {
  color: #f9fafb;
}

[data-theme="dark"] .btn-close-modern {
  background: #374151;
  color: #9ca3af;
  border: 1px solid #4b5563;
}

[data-theme="dark"] .btn-close-modern:hover {
  background: #4b5563;
  color: #f9fafb;
}

/* Dark Theme - Form Elements */
[data-theme="dark"] .form-input,
[data-theme="dark"] .form-select,
[data-theme="dark"] .form-textarea {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-theme="dark"] .form-input:focus,
[data-theme="dark"] .form-select:focus,
[data-theme="dark"] .form-textarea:focus {
  background: #4b5563;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

[data-theme="dark"] .form-label {
  color: #d1d5db;
}

[data-theme="dark"] .form-hint {
  color: #9ca3af;
}

[data-theme="dark"] .step-header {
  border-bottom-color: #374151;
}

[data-theme="dark"] .step-title {
  color: #f9fafb;
}

[data-theme="dark"] .step-description {
  color: #d1d5db;
}

/* Dark Theme - Step Progress */
[data-theme="dark"] .form-progress {
  background: #374151;
  border: 1px solid #4b5563;
}

[data-theme="dark"] .step-circle {
  background: #4b5563;
  color: #9ca3af;
  border-color: #6b7280;
}

[data-theme="dark"] .step.active .step-circle {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

[data-theme="dark"] .step.completed .step-circle {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

[data-theme="dark"] .step-line {
  background: #4b5563;
}

[data-theme="dark"] .step-line.completed {
  background: #10b981;
}

[data-theme="dark"] .step-label {
  color: #9ca3af;
}

[data-theme="dark"] .step.active .step-label {
  color: #60a5fa;
}

[data-theme="dark"] .step.completed .step-label {
  color: #34d399;
}

/* Dark Theme - Business Modules Sidebar */
[data-theme="dark"] .modules-sidebar {
  background: #111827;
  border-color: #374151;
}

[data-theme="dark"] .sidebar-header {
  background: linear-gradient(135deg, #1e40af, #1d4ed8);
}

[data-theme="dark"] .categories-menu {
  background: #111827;
}

[data-theme="dark"] .category-menu-item {
  color: #d1d5db;
}

[data-theme="dark"] .category-menu-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

[data-theme="dark"] .category-menu-item.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2));
  border-right-color: #60a5fa;
}

[data-theme="dark"] .category-menu-item.active .menu-text,
[data-theme="dark"] .category-menu-item.active .menu-icon {
  color: #60a5fa;
}

[data-theme="dark"] .sidebar-summary {
  background: #1f2937;
  border-top-color: #374151;
}

[data-theme="dark"] .summary-label {
  color: #9ca3af;
}

[data-theme="dark"] .summary-value {
  color: #f9fafb;
}

/* Dark Theme - Module Cards */
[data-theme="dark"] .module-card {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-theme="dark"] .module-card:hover {
  border-color: #60a5fa;
  background: #4b5563;
}

[data-theme="dark"] .module-card.selected {
  border-color: #34d399;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(16, 185, 129, 0.1));
}

[data-theme="dark"] .module-title {
  color: #f9fafb;
}

[data-theme="dark"] .module-description {
  color: #d1d5db;
}

[data-theme="dark"] .module-checkbox {
  background: #4b5563;
  border-color: #6b7280;
}

[data-theme="dark"] .module-card.selected .module-checkbox {
  background: #10b981;
  border-color: #10b981;
}

[data-theme="dark"] .module-features li {
  color: #d1d5db;
}

/* Dark Theme - Pricing Summary */
[data-theme="dark"] .pricing-summary-bottom {
  border-top-color: #374151;
}

[data-theme="dark"] .pricing-card {
  background: linear-gradient(135deg, #374151, #4b5563);
  border-color: #4b5563;
}

[data-theme="dark"] .total-row {
  background: #4b5563;
  border-color: #6b7280;
}

[data-theme="dark"] .total-label {
  color: #d1d5db;
}

[data-theme="dark"] .total-amount {
  color: #f9fafb;
}

/* Dark Theme - Subscription Summary */
[data-theme="dark"] .summary-section {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .summary-title {
  background: linear-gradient(135deg, #4b5563, #6b7280);
  color: #f9fafb;
  border-bottom-color: #4b5563;
}

[data-theme="dark"] .item-label {
  color: #9ca3af;
}

[data-theme="dark"] .item-value {
  color: #f9fafb;
}

[data-theme="dark"] .module-summary-item {
  background: #4b5563;
  border-color: #6b7280;
}

[data-theme="dark"] .module-summary-name {
  color: #f9fafb;
}

[data-theme="dark"] .module-summary-category {
  color: #9ca3af;
}

[data-theme="dark"] .no-modules {
  color: #9ca3af;
}

/* Dark Theme - Plan Selection */
[data-theme="dark"] .plan-section,
[data-theme="dark"] .billing-section,
[data-theme="dark"] .final-summary {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .section-title {
  background: linear-gradient(135deg, #4b5563, #6b7280);
  color: #f9fafb;
  border-bottom-color: #4b5563;
}

[data-theme="dark"] .plan-option,
[data-theme="dark"] .cycle-option {
  background: #4b5563;
  border-color: #6b7280;
  color: #f9fafb;
}

[data-theme="dark"] .plan-option:hover,
[data-theme="dark"] .cycle-option:hover {
  border-color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
}

[data-theme="dark"] .plan-option.selected,
[data-theme="dark"] .cycle-option.selected {
  border-color: #60a5fa;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2));
}

[data-theme="dark"] .plan-name,
[data-theme="dark"] .cycle-name {
  color: #f9fafb;
}

[data-theme="dark"] .plan-description,
[data-theme="dark"] .cycle-description {
  color: #d1d5db;
}

[data-theme="dark"] .spec {
  background: #6b7280;
  border-color: #9ca3af;
  color: #f9fafb;
}

/* Dark Theme - Buttons */
[data-theme="dark"] .btn {
  border: 1px solid transparent;
}

[data-theme="dark"] .btn-primary {
  background: #3b82f6;
  color: white;
}

[data-theme="dark"] .btn-primary:hover {
  background: #2563eb;
}

[data-theme="dark"] .btn-secondary {
  background: #6b7280;
  color: #f9fafb;
}

[data-theme="dark"] .btn-secondary:hover {
  background: #4b5563;
}

[data-theme="dark"] .btn-success {
  background: #10b981;
  color: white;
}

[data-theme="dark"] .btn-success:hover {
  background: #059669;
}

[data-theme="dark"] .btn-outline {
  background: transparent;
  border-color: #6b7280;
  color: #d1d5db;
}

[data-theme="dark"] .btn-outline:hover {
  background: #4b5563;
  border-color: #9ca3af;
  color: #f9fafb;
}

/* Enhanced Mobile Responsiveness */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
    align-items: flex-start;
  }

  .modal-content {
    max-height: calc(100vh - 20px);
    margin-top: 10px;
    border-radius: 8px;
    width: 100%;
  }

  .create-org-modal {
    width: 100%;
    max-width: none;
  }

  .modal-header {
    padding: 16px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .modal-body {
    padding: 20px;
    max-height: calc(100vh - 160px);
  }

  .form-progress {
    margin-bottom: 20px;
  }

  .form-step {
    padding: 0;
  }

  .step-header {
    margin-bottom: 20px;
  }

  .step-title {
    font-size: 20px;
  }

  .step-description {
    font-size: 14px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-actions {
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
  }

  .actions-left,
  .actions-right {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .actions-left {
    order: 2;
  }

  .actions-right {
    order: 1;
  }

  /* Mobile - Business Modules */
  .modules-layout {
    flex-direction: column;
    gap: 16px;
  }

  .modules-sidebar {
    width: 100%;
    max-height: none;
  }

  .categories-menu {
    display: flex;
    flex-wrap: wrap;
    padding: 12px;
    gap: 6px;
  }

  .category-menu-item {
    flex: 1;
    min-width: calc(50% - 3px);
    border-radius: 6px;
    background: white;
    border: 1px solid #e2e8f0;
  }

  [data-theme="dark"] .category-menu-item {
    background: #4b5563;
    border-color: #6b7280;
  }

  .menu-item-content {
    padding: 8px;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }

  .menu-icon {
    font-size: 16px;
  }

  .menu-text {
    font-size: 11px;
    line-height: 1.2;
  }

  .content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .modules-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* Mobile - Subscription Layout */
  .subscription-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .plan-specs {
    flex-wrap: wrap;
    gap: 4px;
  }

  .spec {
    font-size: 10px;
    padding: 2px 6px;
  }

  .plan-option {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .plan-price {
    align-self: flex-end;
    margin-left: 0;
    font-size: 16px;
  }

  .pricing-item {
    font-size: 12px;
  }

  .pricing-item.total {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-content {
    border-radius: 0;
    height: 100vh;
    max-height: 100vh;
    margin-top: 0;
  }

  .modal-header {
    padding: 12px 16px;
    position: sticky;
    top: 0;
    z-index: 10;
    background: inherit;
    border-bottom: 1px solid #e5e7eb;
  }

  [data-theme="dark"] .modal-header {
    border-bottom-color: #374151;
  }

  .modal-body {
    padding: 16px;
    max-height: calc(100vh - 120px);
  }

  .form-actions {
    padding: 12px 16px;
    position: sticky;
    bottom: 0;
    background: inherit;
    border-top: 1px solid #e5e7eb;
  }

  [data-theme="dark"] .form-actions {
    border-top-color: #374151;
  }

  .step-title {
    font-size: 18px;
  }

  .category-menu-item {
    min-width: 100%;
  }

  .menu-text {
    font-size: 12px;
  }
}

/* Theme Toggle Button */
.btn-theme {
  margin-right: 12px;
}

.btn-theme i {
  margin-right: 6px;
}

[data-theme="dark"] .btn-theme {
  background: #374151;
  color: #d1d5db;
  border-color: #4b5563;
}

[data-theme="dark"] .btn-theme:hover {
  background: #4b5563;
  border-color: #6b7280;
}

/* Dark Theme Page Styles */
[data-theme="dark"] body {
  background: #111827;
  color: #f9fafb;
}

[data-theme="dark"] .page-container {
  background: #111827;
}

[data-theme="dark"] .page-header {
  background: #1f2937;
  border-bottom-color: #374151;
}

[data-theme="dark"] .page-title {
  color: #f9fafb;
}

[data-theme="dark"] .page-subtitle {
  color: #d1d5db;
}

[data-theme="dark"] .search-filters {
  background: #1f2937;
  border-color: #374151;
}

[data-theme="dark"] .organizations-grid {
  background: #1f2937;
}

[data-theme="dark"] .org-card {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .org-card:hover {
  background: #4b5563;
  border-color: #6b7280;
}

[data-theme="dark"] .org-name {
  color: #f9fafb;
}

[data-theme="dark"] .org-details {
  color: #d1d5db;
}

[data-theme="dark"] .org-stats {
  background: #4b5563;
}

[data-theme="dark"] .stat-value {
  color: #f9fafb;
}

[data-theme="dark"] .stat-label {
  color: #9ca3af;
}
</style>