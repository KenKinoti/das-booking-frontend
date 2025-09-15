<template>
  <div class="module-management-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-primary" @click="saveAllChanges" :disabled="!hasChanges">
        <i class="bi bi-check-circle me-2"></i>Save All Changes
      </button>
    </div>

    <!-- Stats Overview -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="text-primary mb-2">
              <i class="bi bi-building fs-1"></i>
            </div>
            <h4 class="card-title">{{ organizations.length }}</h4>
            <p class="card-text text-muted">Total Organizations</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="text-success mb-2">
              <i class="bi bi-box-seam fs-1"></i>
            </div>
            <h4 class="card-title">{{ inventoryEnabledCount }}</h4>
            <p class="card-text text-muted">Inventory Enabled</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="text-info mb-2">
              <i class="bi bi-cash-stack fs-1"></i>
            </div>
            <h4 class="card-title">{{ posEnabledCount }}</h4>
            <p class="card-text text-muted">POS Enabled</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="text-warning mb-2">
              <i class="bi bi-people fs-1"></i>
            </div>
            <h4 class="card-title">{{ crmEnabledCount }}</h4>
            <p class="card-text text-muted">CRM Enabled</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Organizations Table -->
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">Organization Module Configuration</h5>
      </div>
      <div class="card-body p-0">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <!-- Table -->
        <div v-else class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Organization</th>
                <th>Business Type</th>
                <th class="text-center">Inventory</th>
                <th class="text-center">Suppliers</th>
                <th class="text-center">Purchase Orders</th>
                <th class="text-center">POS System</th>
                <th class="text-center">CRM</th>
                <th class="text-center">Reports</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="org in organizations" :key="org.id">
                <td>
                  <div>
                    <div class="fw-bold">{{ org.name }}</div>
                    <small class="text-muted">{{ org.email }}</small>
                  </div>
                </td>
                <td>
                  <span class="badge bg-light text-dark">{{ org.business_type }}</span>
                </td>

                <!-- Inventory Module -->
                <td class="text-center">
                  <div class="form-check form-switch d-flex justify-content-center">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="'inventory-' + org.id"
                      v-model="org.modules.inventory_enabled"
                      @change="markAsChanged(org.id)"
                    >
                  </div>
                </td>

                <!-- Suppliers Module -->
                <td class="text-center">
                  <div class="form-check form-switch d-flex justify-content-center">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="'supplier-' + org.id"
                      v-model="org.modules.supplier_enabled"
                      @change="markAsChanged(org.id)"
                    >
                  </div>
                </td>

                <!-- Purchase Orders Module -->
                <td class="text-center">
                  <div class="form-check form-switch d-flex justify-content-center">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="'po-' + org.id"
                      v-model="org.modules.purchase_order_enabled"
                      @change="markAsChanged(org.id)"
                    >
                  </div>
                </td>

                <!-- POS Module -->
                <td class="text-center">
                  <div class="form-check form-switch d-flex justify-content-center">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="'pos-' + org.id"
                      v-model="org.modules.pos_enabled"
                      @change="markAsChanged(org.id)"
                    >
                  </div>
                </td>

                <!-- CRM Module -->
                <td class="text-center">
                  <div class="form-check form-switch d-flex justify-content-center">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="'crm-' + org.id"
                      v-model="org.modules.crm_enabled"
                      @change="markAsChanged(org.id)"
                    >
                  </div>
                </td>

                <!-- Reports Module -->
                <td class="text-center">
                  <div class="form-check form-switch d-flex justify-content-center">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="'reports-' + org.id"
                      v-model="org.modules.reports_enabled"
                      @change="markAsChanged(org.id)"
                    >
                  </div>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div class="btn-group btn-group-sm">
                    <button
                      class="btn btn-outline-primary"
                      @click="saveOrganizationModules(org)"
                      :disabled="!changedOrganizations.has(org.id)"
                      title="Save Changes"
                    >
                      <i class="bi bi-check"></i>
                    </button>
                    <button
                      class="btn btn-outline-secondary"
                      @click="resetOrganizationModules(org)"
                      :disabled="!changedOrganizations.has(org.id)"
                      title="Reset Changes"
                    >
                      <i class="bi bi-arrow-clockwise"></i>
                    </button>
                    <button
                      class="btn btn-outline-success"
                      @click="enableAllModules(org)"
                      title="Enable All"
                    >
                      <i class="bi bi-check-all"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger"
                      @click="disableAllModules(org)"
                      title="Disable All"
                    >
                      <i class="bi bi-x-square"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && organizations.length === 0" class="text-center py-5">
          <i class="bi bi-building text-muted" style="font-size: 4rem;"></i>
          <h5 class="mt-3 text-muted">No organizations found</h5>
          <p class="text-muted">Create an organization first to configure modules.</p>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div class="card mt-4">
      <div class="card-header">
        <h5 class="card-title mb-0">Bulk Module Actions</h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <div class="d-grid">
              <button class="btn btn-success" @click="enableModuleForAll('inventory')">
                <i class="bi bi-box-seam me-2"></i>Enable Inventory for All
              </button>
            </div>
          </div>
          <div class="col-md-4">
            <div class="d-grid">
              <button class="btn btn-info" @click="enableModuleForAll('pos')">
                <i class="bi bi-cash-stack me-2"></i>Enable POS for All
              </button>
            </div>
          </div>
          <div class="col-md-4">
            <div class="d-grid">
              <button class="btn btn-warning" @click="enableModuleForAll('crm')">
                <i class="bi bi-people me-2"></i>Enable CRM for All
              </button>
            </div>
          </div>
        </div>

        <hr>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="d-grid">
              <button class="btn btn-success" @click="enableAllModulesForAll">
                <i class="bi bi-check-all me-2"></i>Enable All Modules for All Organizations
              </button>
            </div>
          </div>
          <div class="col-md-6">
            <div class="d-grid">
              <button class="btn btn-outline-danger" @click="disableAllModulesForAll">
                <i class="bi bi-x-square me-2"></i>Disable All Modules for All Organizations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { moduleService } from '@/services/moduleService'
import { organizationService } from '@/services/organizationService'

export default {
  name: 'ModuleManagementPage',
  data() {
    return {
      loading: false,
      organizations: [],
      originalModules: new Map(),
      changedOrganizations: new Set()
    }
  },
  computed: {
    inventoryEnabledCount() {
      return this.organizations.filter(org => org.modules.inventory_enabled).length
    },

    posEnabledCount() {
      return this.organizations.filter(org => org.modules.pos_enabled).length
    },

    crmEnabledCount() {
      return this.organizations.filter(org => org.modules.crm_enabled).length
    },

    hasChanges() {
      return this.changedOrganizations.size > 0
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        // Fetch organizations and their modules
        const [orgsResponse, modulesResponse] = await Promise.all([
          organizationService.getAllOrganizations(),
          moduleService.getAllOrganizationModules()
        ])

        this.organizations = orgsResponse.data.organizations.map(org => {
          const modules = modulesResponse.data.modules.find(m => m.organization_id === org.id) || {
            inventory_enabled: false,
            supplier_enabled: false,
            purchase_order_enabled: false,
            pos_enabled: false,
            crm_enabled: false,
            reports_enabled: false
          }

          // Store original state
          this.originalModules.set(org.id, { ...modules })

          return {
            ...org,
            modules
          }
        })

      } catch (error) {
        console.error('Error fetching data:', error)
        this.$toast.error('Failed to fetch organization data')
      } finally {
        this.loading = false
      }
    },

    markAsChanged(orgId) {
      this.changedOrganizations.add(orgId)
    },

    async saveOrganizationModules(organization) {
      try {
        await moduleService.updateOrganizationModules(organization.id, organization.modules)

        // Update original state
        this.originalModules.set(organization.id, { ...organization.modules })
        this.changedOrganizations.delete(organization.id)

        this.$toast.success(`Modules updated for ${organization.name}`)
      } catch (error) {
        console.error('Error saving modules:', error)
        this.$toast.error('Failed to save module configuration')
      }
    },

    resetOrganizationModules(organization) {
      const original = this.originalModules.get(organization.id)
      if (original) {
        organization.modules = { ...original }
        this.changedOrganizations.delete(organization.id)
      }
    },

    enableAllModules(organization) {
      organization.modules.inventory_enabled = true
      organization.modules.supplier_enabled = true
      organization.modules.purchase_order_enabled = true
      organization.modules.pos_enabled = true
      organization.modules.crm_enabled = true
      organization.modules.reports_enabled = true
      this.markAsChanged(organization.id)
    },

    disableAllModules(organization) {
      organization.modules.inventory_enabled = false
      organization.modules.supplier_enabled = false
      organization.modules.purchase_order_enabled = false
      organization.modules.pos_enabled = false
      organization.modules.crm_enabled = false
      organization.modules.reports_enabled = false
      this.markAsChanged(organization.id)
    },

    async saveAllChanges() {
      const savePromises = []

      for (const orgId of this.changedOrganizations) {
        const org = this.organizations.find(o => o.id === orgId)
        if (org) {
          savePromises.push(this.saveOrganizationModules(org))
        }
      }

      try {
        await Promise.all(savePromises)
        this.$toast.success('All changes saved successfully')
      } catch (error) {
        this.$toast.error('Some changes failed to save')
      }
    },

    enableModuleForAll(moduleType) {
      this.organizations.forEach(org => {
        switch (moduleType) {
          case 'inventory':
            org.modules.inventory_enabled = true
            break
          case 'pos':
            org.modules.pos_enabled = true
            break
          case 'crm':
            org.modules.crm_enabled = true
            break
        }
        this.markAsChanged(org.id)
      })
    },

    enableAllModulesForAll() {
      this.organizations.forEach(org => {
        this.enableAllModules(org)
      })
    },

    disableAllModulesForAll() {
      if (!confirm('Are you sure you want to disable all modules for all organizations?')) {
        return
      }

      this.organizations.forEach(org => {
        this.disableAllModules(org)
      })
    }
  }
}
</script>

<style scoped>
.module-management-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 2rem;
}

.card {
  border: none;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.table th {
  font-weight: 600;
  border-top: none;
}

.form-check-input:checked {
  background-color: var(--bs-success);
  border-color: var(--bs-success);
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
}

.table td {
  vertical-align: middle;
}
</style>