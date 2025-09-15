<template>
  <div class="users-admin">

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="Search users..." 
          v-model="searchTerm"
          @input="filterUsers"
        >
      </div>
      <div class="filter-controls">
        <select v-model="selectedOrg" @change="filterUsers" class="filter-select">
          <option value="">All Organizations</option>
          <option v-for="org in organizations" :key="org.id" :value="org.id">
            {{ org.name }}
          </option>
        </select>
        <select v-model="selectedRole" @change="filterUsers" class="filter-select">
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
        <select v-model="selectedStatus" @change="filterUsers" class="filter-select">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
    </div>

    <!-- Users Table -->
    <div class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Organization</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>
              <div class="user-info">
                <div class="user-avatar">
                  <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="org-name">{{ user.organization }}</span>
            </td>
            <td>
              <span class="role-badge" :class="user.role">
                {{ formatRole(user.role) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="user.status">
                {{ user.status }}
              </span>
            </td>
            <td>
              <span class="last-login">{{ formatDate(user.lastLogin) }}</span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="action-btn edit" @click="editUser(user)" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn suspend" @click="suspendUser(user)" title="Suspend">
                  <i class="fas fa-ban"></i>
                </button>
                <button class="action-btn delete" @click="deleteUser(user)" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- User Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Edit User</h3>
          <button class="close-btn" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-content">
          <div class="form-group">
            <label>Name</label>
            <input type="text" v-model="editingUser.name">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" v-model="editingUser.email">
          </div>
          <div class="form-group">
            <label>Role</label>
            <select v-model="editingUser.role">
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select v-model="editingUser.status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="closeModal">Cancel</button>
          <button class="btn primary" @click="saveUser">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UsersAdmin',
  data() {
    return {
      searchTerm: '',
      selectedOrg: '',
      selectedRole: '',
      selectedStatus: '',
      showEditModal: false,
      editingUser: {},
      users: [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          organization: 'AutoCare Plus',
          role: 'admin',
          status: 'active',
          lastLogin: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@salon.com',
          organization: 'Elegant Salon',
          role: 'manager',
          status: 'active',
          lastLogin: '2024-01-14T15:45:00Z'
        },
        {
          id: 3,
          name: 'Mike Johnson',
          email: 'mike@garage.com',
          organization: 'Quick Fix Garage',
          role: 'staff',
          status: 'inactive',
          lastLogin: '2024-01-10T09:20:00Z'
        }
      ],
      organizations: [
        { id: 1, name: 'AutoCare Plus' },
        { id: 2, name: 'Elegant Salon' },
        { id: 3, name: 'Quick Fix Garage' }
      ],
      filteredUsers: []
    }
  },
  mounted() {
    this.filteredUsers = [...this.users]
  },
  methods: {
    filterUsers() {
      this.filteredUsers = this.users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(this.searchTerm.toLowerCase())
        const matchesOrg = !this.selectedOrg || user.organization === this.organizations.find(o => o.id == this.selectedOrg)?.name
        const matchesRole = !this.selectedRole || user.role === this.selectedRole
        const matchesStatus = !this.selectedStatus || user.status === this.selectedStatus
        
        return matchesSearch && matchesOrg && matchesRole && matchesStatus
      })
    },
    editUser(user) {
      this.editingUser = { ...user }
      this.showEditModal = true
    },
    suspendUser(user) {
      if (confirm(`Suspend user ${user.name}?`)) {
        const userIndex = this.users.findIndex(u => u.id === user.id)
        if (userIndex !== -1) {
          this.users[userIndex].status = 'suspended'
          this.filterUsers()
        }
      }
    },
    deleteUser(user) {
      if (confirm(`Delete user ${user.name}? This action cannot be undone.`)) {
        this.users = this.users.filter(u => u.id !== user.id)
        this.filterUsers()
      }
    },
    closeModal() {
      this.showEditModal = false
      this.editingUser = {}
    },
    saveUser() {
      const userIndex = this.users.findIndex(u => u.id === this.editingUser.id)
      if (userIndex !== -1) {
        this.users[userIndex] = { ...this.editingUser }
        this.filterUsers()
      }
      this.closeModal()
    },
    formatRole(role) {
      return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.users-admin {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.page-title i {
  color: #667eea;
  margin-right: 0.75rem;
}

.page-subtitle {
  color: var(--bs-secondary);
  font-size: 1.1rem;
}

.filters-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-box i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--bs-secondary);
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
  min-width: 150px;
}

.table-container {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: var(--bs-tertiary-bg);
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--bs-body-color);
  border-bottom: 2px solid #e9ecef;
}

.users-table td {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-name {
  font-weight: 600;
  color: var(--bs-body-color);
}

.user-email {
  color: var(--bs-secondary);
  font-size: 0.9rem;
}

.role-badge, .status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.role-badge.super_admin { background: #e3d5ff; color: #7c3aed; }
.role-badge.admin { background: #dbeafe; color: #2563eb; }
.role-badge.manager { background: #dcfce7; color: #16a34a; }
.role-badge.staff { background: #fef3c7; color: #d97706; }

.status-badge.active { background: #dcfce7; color: #16a34a; }
.status-badge.inactive { background: #f3f4f6; color: #6b7280; }
.status-badge.suspended { background: #fee2e2; color: #dc2626; }

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.edit { background: #e3f2fd; color: #1976d2; }
.action-btn.suspend { background: #fff3e0; color: #f57c00; }
.action-btn.delete { background: #ffebee; color: #d32f2f; }

.action-btn:hover {
  transform: scale(1.1);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-content {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

.form-group input, .form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: #667eea;
  color: white;
}

.btn.secondary {
  background: var(--bs-tertiary-bg);
  color: var(--bs-secondary);
  border: 2px solid var(--card-border);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--bs-secondary);
}

@media (max-width: 768px) {
  .users-admin {
    padding: 1rem;
  }
  
  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .users-table {
    font-size: 0.9rem;
  }
  
  .users-table th, .users-table td {
    padding: 0.75rem 0.5rem;
  }
}
</style>