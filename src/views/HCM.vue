<template>
  <div class="hcm-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-primary" @click="showEmployeeModal = true">
        <i class="fas fa-user-plus me-2"></i>
        Add Employee
      </button>
    </div>

    <div class="stats-overview">
      <div class="row g-4">
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-primary">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">247</h3>
              <p class="stat-label">Total Employees</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-success">
              <i class="fas fa-user-check"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">234</h3>
              <p class="stat-label">Active</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-warning">
              <i class="fas fa-calendar-times"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">18</h3>
              <p class="stat-label">On Leave</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-info">
              <i class="fas fa-dollar-sign"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">$892K</h3>
              <p class="stat-label">Monthly Payroll</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">
                <i class="fas fa-address-book me-2"></i>
                Employee Directory
              </h5>
              <div class="search-box">
                <input
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Search employees..."
                  v-model="searchTerm"
                >
              </div>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>Salary</th>
                      <th>Hire Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="employee in filteredEmployees" :key="employee.id">
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="avatar me-3">{{ getInitials(employee.name) }}</div>
                          <div>
                            <div class="fw-semibold">{{ employee.name }}</div>
                            <small class="text-muted">{{ employee.email }}</small>
                          </div>
                        </div>
                      </td>
                      <td>{{ employee.department }}</td>
                      <td>{{ employee.position }}</td>
                      <td>
                        <span class="badge" :class="getStatusClass(employee.status)">
                          {{ employee.status }}
                        </span>
                      </td>
                      <td>{{ formatCurrency(employee.salary) }}</td>
                      <td>{{ formatDate(employee.hireDate) }}</td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary" @click="viewEmployee(employee)">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-outline-success" @click="editEmployee(employee)">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-outline-info" @click="processPayroll(employee)">
                            <i class="fas fa-dollar-sign"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-chart-pie me-2"></i>
                Department Distribution
              </h5>
            </div>
            <div class="card-body">
              <div class="department-item" v-for="dept in departmentStats" :key="dept.name">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="fw-medium">{{ dept.name }}</span>
                  <span class="badge bg-primary">{{ dept.count }}</span>
                </div>
                <div class="progress mb-3" style="height: 8px;">
                  <div
                    class="progress-bar"
                    :class="dept.color"
                    :style="{ width: (dept.count / totalEmployees * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card mt-4">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-calendar-alt me-2"></i>
                Leave Requests
              </h5>
            </div>
            <div class="card-body">
              <div class="leave-item" v-for="leave in leaveRequests" :key="leave.id">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div class="fw-semibold">{{ leave.employee }}</div>
                    <small class="text-muted">{{ leave.type }} - {{ leave.duration }}</small>
                  </div>
                  <span class="badge" :class="getLeaveStatusClass(leave.status)">
                    {{ leave.status }}
                  </span>
                </div>
                <p class="text-muted small mb-2">{{ leave.reason }}</p>
                <div class="d-flex gap-2" v-if="leave.status === 'Pending'">
                  <button class="btn btn-success btn-sm" @click="approveLeave(leave)">
                    <i class="fas fa-check me-1"></i>Approve
                  </button>
                  <button class="btn btn-danger btn-sm" @click="rejectLeave(leave)">
                    <i class="fas fa-times me-1"></i>Reject
                  </button>
                </div>
                <hr v-if="leave !== leaveRequests[leaveRequests.length - 1]">
              </div>
            </div>
          </div>

          <div class="card mt-4">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-birthday-cake me-2"></i>
                Upcoming Events
              </h5>
            </div>
            <div class="card-body">
              <div class="event-item" v-for="event in upcomingEvents" :key="event.id">
                <div class="event-date">
                  <div class="date-day">{{ getDay(event.date) }}</div>
                  <div class="date-month">{{ getMonth(event.date) }}</div>
                </div>
                <div class="event-content">
                  <h6 class="mb-1">{{ event.title }}</h6>
                  <p class="text-muted mb-0 small">{{ event.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Employee Modal -->
    <div class="modal fade" :class="{ show: showEmployeeModal }" :style="{ display: showEmployeeModal ? 'block' : 'none' }" v-if="showEmployeeModal" @click.self="showEmployeeModal = false">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add New Employee</h5>
            <button type="button" class="btn-close" @click="showEmployeeModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createEmployee">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Full Name</label>
                  <input type="text" class="form-control" v-model="newEmployee.name" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" v-model="newEmployee.email" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Phone</label>
                  <input type="tel" class="form-control" v-model="newEmployee.phone" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Employee ID</label>
                  <input type="text" class="form-control" v-model="newEmployee.employeeId" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Department</label>
                  <select class="form-select" v-model="newEmployee.department" required>
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">Human Resources</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Position</label>
                  <input type="text" class="form-control" v-model="newEmployee.position" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Salary</label>
                  <input type="number" class="form-control" v-model="newEmployee.salary" min="0" step="0.01" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Hire Date</label>
                  <input type="date" class="form-control" v-model="newEmployee.hireDate" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Manager</label>
                  <select class="form-select" v-model="newEmployee.manager">
                    <option value="">Select Manager</option>
                    <option value="John Smith">John Smith</option>
                    <option value="Sarah Johnson">Sarah Johnson</option>
                    <option value="Mike Davis">Mike Davis</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Employment Type</label>
                  <select class="form-select" v-model="newEmployee.type">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showEmployeeModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="createEmployee">
              <i class="fas fa-save me-2"></i>
              Add Employee
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="showEmployeeModal"></div>
  </div>
</template>

<script>
export default {
  name: 'HCM',
  data() {
    return {
      searchTerm: '',
      showEmployeeModal: false,
      newEmployee: {
        name: '',
        email: '',
        phone: '',
        employeeId: '',
        department: '',
        position: '',
        salary: 0,
        hireDate: '',
        manager: '',
        type: 'Full-time'
      },
      employees: [
        {
          id: 1,
          name: 'John Smith',
          email: 'john.smith@company.com',
          department: 'Engineering',
          position: 'Senior Developer',
          status: 'Active',
          salary: 85000,
          hireDate: '2022-03-15'
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah.johnson@company.com',
          department: 'Sales',
          position: 'Sales Manager',
          status: 'Active',
          salary: 75000,
          hireDate: '2021-08-22'
        },
        {
          id: 3,
          name: 'Mike Davis',
          email: 'mike.davis@company.com',
          department: 'Marketing',
          position: 'Marketing Specialist',
          status: 'On Leave',
          salary: 58000,
          hireDate: '2023-01-10'
        }
      ],
      departmentStats: [
        { name: 'Engineering', count: 45, color: 'bg-primary' },
        { name: 'Sales', count: 32, color: 'bg-success' },
        { name: 'Marketing', count: 28, color: 'bg-info' },
        { name: 'HR', count: 15, color: 'bg-warning' },
        { name: 'Finance', count: 12, color: 'bg-danger' }
      ],
      leaveRequests: [
        {
          id: 1,
          employee: 'Alice Cooper',
          type: 'Vacation',
          duration: '5 days',
          reason: 'Family vacation to Europe',
          status: 'Pending'
        },
        {
          id: 2,
          employee: 'Bob Wilson',
          type: 'Sick Leave',
          duration: '2 days',
          reason: 'Medical appointment and recovery',
          status: 'Approved'
        }
      ],
      upcomingEvents: [
        {
          id: 1,
          title: 'Team Building Event',
          description: 'Annual company retreat',
          date: '2025-02-20'
        },
        {
          id: 2,
          title: 'Performance Reviews',
          description: 'Q1 performance evaluation period',
          date: '2025-03-01'
        }
      ]
    }
  },
  computed: {
    filteredEmployees() {
      if (!this.searchTerm) return this.employees
      return this.employees.filter(employee =>
        employee.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        employee.department.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(this.searchTerm.toLowerCase())
      )
    },
    totalEmployees() {
      return this.departmentStats.reduce((sum, dept) => sum + dept.count, 0)
    }
  },
  methods: {
    getStatusClass(status) {
      const statusClasses = {
        'Active': 'bg-success',
        'Inactive': 'bg-secondary',
        'On Leave': 'bg-warning',
        'Terminated': 'bg-danger'
      }
      return statusClasses[status] || 'bg-secondary'
    },
    getLeaveStatusClass(status) {
      const statusClasses = {
        'Pending': 'bg-warning',
        'Approved': 'bg-success',
        'Rejected': 'bg-danger'
      }
      return statusClasses[status] || 'bg-secondary'
    },
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString()
    },
    getDay(dateString) {
      return new Date(dateString).getDate()
    },
    getMonth(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short' })
    },
    viewEmployee(employee) {
      console.log('Viewing employee:', employee)
    },
    editEmployee(employee) {
      console.log('Editing employee:', employee)
    },
    processPayroll(employee) {
      console.log('Processing payroll for:', employee)
    },
    approveLeave(leave) {
      leave.status = 'Approved'
      console.log('Leave approved:', leave)
    },
    rejectLeave(leave) {
      leave.status = 'Rejected'
      console.log('Leave rejected:', leave)
    },
    createEmployee() {
      console.log('Creating employee:', this.newEmployee)
      // Reset form
      this.newEmployee = {
        name: '',
        email: '',
        phone: '',
        employeeId: '',
        department: '',
        position: '',
        salary: 0,
        hireDate: '',
        manager: '',
        type: 'Full-time'
      }
      this.showEmployeeModal = false
    }
  }
}
</script>

<style scoped>
.search-box {
  width: 250px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.department-item:last-child .progress {
  margin-bottom: 0 !important;
}

.leave-item {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
}

.leave-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
}

.event-item {
  display: flex;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.event-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.event-date {
  text-align: center;
  margin-right: 1rem;
  flex-shrink: 0;
}

.date-day {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
  line-height: 1;
}

.date-month {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
}

.event-content {
  flex: 1;
}
</style>