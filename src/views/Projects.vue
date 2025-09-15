<template>
  <div class="projects-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-primary" @click="showProjectModal = true">
        <i class="fas fa-plus me-2"></i>
        New Project
      </button>
    </div>

    <div class="stats-overview">
      <div class="row g-4">
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-primary">
              <i class="fas fa-folder-open"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">12</h3>
              <p class="stat-label">Active Projects</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-success">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">87</h3>
              <p class="stat-label">Completed Tasks</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-warning">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">23</h3>
              <p class="stat-label">Overdue</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-info">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">45</h3>
              <p class="stat-label">Team Members</p>
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
                <i class="fas fa-tasks me-2"></i>
                Projects Overview
              </h5>
              <div class="btn-group btn-group-sm">
                <button class="btn" :class="{ 'btn-primary': viewMode === 'list', 'btn-outline-primary': viewMode !== 'list' }" @click="viewMode = 'list'">
                  <i class="fas fa-list"></i>
                </button>
                <button class="btn" :class="{ 'btn-primary': viewMode === 'kanban', 'btn-outline-primary': viewMode !== 'kanban' }" @click="viewMode = 'kanban'">
                  <i class="fas fa-columns"></i>
                </button>
              </div>
            </div>
            <div class="card-body">
              <!-- List View -->
              <div v-if="viewMode === 'list'" class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Due Date</th>
                      <th>Team</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="project in projects" :key="project.id">
                      <td>
                        <div class="fw-semibold">{{ project.name }}</div>
                        <small class="text-muted">{{ project.description }}</small>
                      </td>
                      <td>{{ project.client }}</td>
                      <td>
                        <span class="badge" :class="getStatusClass(project.status)">
                          {{ project.status }}
                        </span>
                      </td>
                      <td>
                        <div class="progress" style="height: 20px; width: 100px;">
                          <div
                            class="progress-bar"
                            :class="getProgressClass(project.progress)"
                            :style="{ width: project.progress + '%' }"
                          >
                            {{ project.progress }}%
                          </div>
                        </div>
                      </td>
                      <td>{{ formatDate(project.dueDate) }}</td>
                      <td>
                        <div class="avatar-group">
                          <span
                            v-for="member in project.team.slice(0, 3)"
                            :key="member"
                            class="avatar avatar-sm"
                            :title="member"
                          >
                            {{ getInitials(member) }}
                          </span>
                          <span v-if="project.team.length > 3" class="avatar avatar-sm text-muted">
                            +{{ project.team.length - 3 }}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary" @click="viewProject(project)">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-outline-success" @click="editProject(project)">
                            <i class="fas fa-edit"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Kanban View -->
              <div v-else class="kanban-board">
                <div class="row g-3">
                  <div class="col-md-4" v-for="status in projectStatuses" :key="status">
                    <div class="kanban-column">
                      <div class="kanban-header">
                        <h6 class="mb-0">{{ status }}</h6>
                        <span class="badge bg-secondary">{{ getProjectsByStatus(status).length }}</span>
                      </div>
                      <div class="kanban-cards">
                        <div
                          v-for="project in getProjectsByStatus(status)"
                          :key="project.id"
                          class="kanban-card"
                        >
                          <div class="card-title">{{ project.name }}</div>
                          <div class="card-client text-muted small">{{ project.client }}</div>
                          <div class="card-progress">
                            <div class="progress" style="height: 6px;">
                              <div
                                class="progress-bar bg-primary"
                                :style="{ width: project.progress + '%' }"
                              ></div>
                            </div>
                            <small class="text-muted">{{ project.progress }}% complete</small>
                          </div>
                          <div class="card-footer">
                            <div class="avatar-group">
                              <span
                                v-for="member in project.team.slice(0, 2)"
                                :key="member"
                                class="avatar avatar-xs"
                                :title="member"
                              >
                                {{ getInitials(member) }}
                              </span>
                            </div>
                            <small class="text-muted">{{ formatDate(project.dueDate) }}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-calendar-alt me-2"></i>
                Upcoming Deadlines
              </h5>
            </div>
            <div class="card-body">
              <div class="deadline-item" v-for="deadline in upcomingDeadlines" :key="deadline.id">
                <div class="deadline-date">
                  <div class="date-day">{{ getDay(deadline.date) }}</div>
                  <div class="date-month">{{ getMonth(deadline.date) }}</div>
                </div>
                <div class="deadline-content">
                  <h6 class="mb-1">{{ deadline.project }}</h6>
                  <p class="text-muted mb-0 small">{{ deadline.task }}</p>
                  <span class="badge badge-sm" :class="getUrgencyClass(deadline.urgency)">
                    {{ deadline.urgency }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="card mt-4">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-chart-pie me-2"></i>
                Project Statistics
              </h5>
            </div>
            <div class="card-body">
              <div class="stat-item">
                <div class="stat-label">On Track</div>
                <div class="stat-value text-success">68%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">At Risk</div>
                <div class="stat-value text-warning">23%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Delayed</div>
                <div class="stat-value text-danger">9%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Project Modal -->
    <div class="modal fade" :class="{ show: showProjectModal }" :style="{ display: showProjectModal ? 'block' : 'none' }" v-if="showProjectModal" @click.self="showProjectModal = false">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New Project</h5>
            <button type="button" class="btn-close" @click="showProjectModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createProject">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Project Name</label>
                  <input type="text" class="form-control" v-model="newProject.name" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Client</label>
                  <input type="text" class="form-control" v-model="newProject.client" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Start Date</label>
                  <input type="date" class="form-control" v-model="newProject.startDate" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Due Date</label>
                  <input type="date" class="form-control" v-model="newProject.dueDate" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Priority</label>
                  <select class="form-select" v-model="newProject.priority">
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Budget</label>
                  <input type="number" class="form-control" v-model="newProject.budget" min="0" step="0.01">
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" v-model="newProject.description" rows="3"></textarea>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showProjectModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="createProject">
              <i class="fas fa-save me-2"></i>
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="showProjectModal"></div>
  </div>
</template>

<script>
export default {
  name: 'Projects',
  data() {
    return {
      viewMode: 'list', // 'list' or 'kanban'
      showProjectModal: false,
      projectStatuses: ['Planning', 'In Progress', 'Completed'],
      newProject: {
        name: '',
        client: '',
        startDate: '',
        dueDate: '',
        priority: 'Normal',
        budget: 0,
        description: ''
      },
      projects: [
        {
          id: 1,
          name: 'Website Redesign',
          client: 'ABC Corp',
          status: 'In Progress',
          progress: 75,
          dueDate: '2025-02-15',
          team: ['John Doe', 'Jane Smith', 'Mike Johnson']
        },
        {
          id: 2,
          name: 'Mobile App Development',
          client: 'XYZ Ltd',
          status: 'Planning',
          progress: 25,
          dueDate: '2025-03-01',
          team: ['Sarah Wilson', 'Tom Brown']
        },
        {
          id: 3,
          name: 'Database Migration',
          client: 'Tech Solutions',
          status: 'Completed',
          progress: 100,
          dueDate: '2025-01-10',
          team: ['Alex Chen', 'Lisa Davis', 'Mark Taylor', 'Emma Wilson']
        }
      ],
      upcomingDeadlines: [
        {
          id: 1,
          project: 'Website Redesign',
          task: 'Final review and testing',
          date: '2025-02-15',
          urgency: 'High'
        },
        {
          id: 2,
          project: 'Mobile App',
          task: 'Design mockups approval',
          date: '2025-02-20',
          urgency: 'Medium'
        }
      ]
    }
  },
  methods: {
    getStatusClass(status) {
      const statusClasses = {
        'Planning': 'bg-info',
        'In Progress': 'bg-warning',
        'Completed': 'bg-success',
        'On Hold': 'bg-secondary'
      }
      return statusClasses[status] || 'bg-secondary'
    },
    getProgressClass(progress) {
      if (progress >= 80) return 'bg-success'
      if (progress >= 50) return 'bg-warning'
      return 'bg-danger'
    },
    getUrgencyClass(urgency) {
      const urgencyClasses = {
        'Low': 'bg-secondary',
        'Medium': 'bg-warning',
        'High': 'bg-danger',
        'Critical': 'bg-dark'
      }
      return urgencyClasses[urgency] || 'bg-secondary'
    },
    getProjectsByStatus(status) {
      return this.projects.filter(project => project.status === status)
    },
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
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
    viewProject(project) {
      console.log('Viewing project:', project)
    },
    editProject(project) {
      console.log('Editing project:', project)
    },
    createProject() {
      console.log('Creating project:', this.newProject)
      // Reset form
      this.newProject = {
        name: '',
        client: '',
        startDate: '',
        dueDate: '',
        priority: 'Normal',
        budget: 0,
        description: ''
      }
      this.showProjectModal = false
    }
  }
}
</script>

<style scoped>
.kanban-board {
  min-height: 600px;
}

.kanban-column {
  background: var(--card-background);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  height: fit-content;
}

.kanban-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: between;
  align-items: center;
}

.kanban-cards {
  padding: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.kanban-card {
  background: var(--body-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  padding: 1rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: var(--transition-fast);
}

.kanban-card:hover {
  box-shadow: var(--shadow-medium);
  transform: translateY(-2px);
}

.kanban-card:last-child {
  margin-bottom: 0;
}

.card-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card-progress {
  margin: 1rem 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.deadline-item {
  display: flex;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.deadline-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.deadline-date {
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

.deadline-content {
  flex: 1;
}

.avatar-group {
  display: flex;
  gap: 0.25rem;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

.avatar.avatar-sm {
  width: 28px;
  height: 28px;
  font-size: 0.7rem;
}

.avatar.avatar-xs {
  width: 24px;
  height: 24px;
  font-size: 0.65rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  font-weight: 500;
}

.stat-value {
  font-weight: 600;
  font-size: 1.1rem;
}
</style>