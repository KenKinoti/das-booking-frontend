<template>
  <div class="events-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <i class="fas fa-calendar-alt"></i>
            Event Management
          </h1>
          <p class="page-subtitle">Create, manage, and track your events like a pro</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline-primary" @click="showFilters = !showFilters">
            <i class="fas fa-filter"></i>
            Filters
          </button>
          <button class="btn btn-primary" @click="createNewEvent">
            <i class="fas fa-plus"></i>
            Create Event
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-overview">
      <div class="stat-card primary">
        <div class="stat-icon">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.totalEvents }}</div>
          <div class="stat-label">Total Events</div>
          <div class="stat-change positive">
            <i class="fas fa-arrow-up"></i>
            12% this month
          </div>
        </div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.totalRegistrations }}</div>
          <div class="stat-label">Total Registrations</div>
          <div class="stat-change positive">
            <i class="fas fa-arrow-up"></i>
            24% this month
          </div>
        </div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">${{ formatMoney(stats.totalRevenue) }}</div>
          <div class="stat-label">Total Revenue</div>
          <div class="stat-change positive">
            <i class="fas fa-arrow-up"></i>
            18% this month
          </div>
        </div>
      </div>
      <div class="stat-card info">
        <div class="stat-icon">
          <i class="fas fa-eye"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.upcomingEvents }}</div>
          <div class="stat-label">Upcoming Events</div>
          <div class="stat-change neutral">
            <i class="fas fa-calendar"></i>
            Next 30 days
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced Filters -->
    <div v-if="showFilters" class="filters-panel">
      <div class="filters-grid">
        <div class="filter-group">
          <label>Search Events</label>
          <div class="search-input-group">
            <i class="fas fa-search"></i>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search by title, description, or tags..."
              @input="debouncedSearch"
            />
          </div>
        </div>
        <div class="filter-group">
          <label>Category</label>
          <select v-model="filters.category">
            <option value="">All Categories</option>
            <option v-for="category in categories" :key="category.id" :value="category.name">
              {{ category.name }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>Event Type</label>
          <select v-model="filters.type">
            <option value="">All Types</option>
            <option value="in_person">In Person</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select v-model="filters.status">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Date Range</label>
          <div class="date-range">
            <input v-model="filters.startDate" type="date" />
            <span>to</span>
            <input v-model="filters.endDate" type="date" />
          </div>
        </div>
        <div class="filter-group">
          <label>Price Range</label>
          <div class="price-range">
            <input v-model="filters.minPrice" type="number" placeholder="Min" />
            <span>-</span>
            <input v-model="filters.maxPrice" type="number" placeholder="Max" />
          </div>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-outline-secondary" @click="clearFilters">
          <i class="fas fa-times"></i>
          Clear Filters
        </button>
        <button class="btn btn-primary" @click="applyFilters">
          <i class="fas fa-search"></i>
          Apply Filters
        </button>
      </div>
    </div>

    <!-- Events Grid/List Toggle -->
    <div class="view-controls">
      <div class="view-toggle">
        <button
          class="view-btn"
          :class="{ active: viewMode === 'grid' }"
          @click="viewMode = 'grid'"
        >
          <i class="fas fa-th-large"></i>
          Grid
        </button>
        <button
          class="view-btn"
          :class="{ active: viewMode === 'list' }"
          @click="viewMode = 'list'"
        >
          <i class="fas fa-list"></i>
          List
        </button>
      </div>
      <div class="sort-controls">
        <select v-model="sortBy" @change="sortEvents">
          <option value="start_date">Sort by Date</option>
          <option value="title">Sort by Title</option>
          <option value="created_at">Sort by Created</option>
          <option value="registrations">Sort by Popularity</option>
        </select>
        <button class="sort-direction" @click="toggleSortDirection">
          <i :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
        </button>
      </div>
    </div>

    <!-- Events Content -->
    <div class="events-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading events...</p>
      </div>

      <div v-else-if="filteredEvents.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-calendar-times"></i>
        </div>
        <h3>No Events Found</h3>
        <p>{{ filters.search || hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'Create your first event to get started!' }}</p>
        <button v-if="!hasActiveFilters" class="btn btn-primary" @click="createNewEvent">
          <i class="fas fa-plus"></i>
          Create Your First Event
        </button>
      </div>

      <!-- Grid View -->
      <div v-else-if="viewMode === 'grid'" class="events-grid">
        <div v-for="event in paginatedEvents" :key="event.id" class="event-card">
          <div class="event-image">
            <img :src="event.cover_image_url || '/api/placeholder/400/200'" :alt="event.title" />
            <div class="event-badges">
              <span class="badge" :class="`badge-${event.type}`">{{ formatEventType(event.type) }}</span>
              <span class="badge" :class="`badge-${event.status}`">{{ formatStatus(event.status) }}</span>
            </div>
            <div class="event-actions">
              <button class="action-btn" @click="viewEvent(event)" title="View Details">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn" @click="editEvent(event)" title="Edit Event">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn" @click="duplicateEvent(event)" title="Duplicate">
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>
          <div class="event-content">
            <div class="event-header">
              <h3 class="event-title">{{ event.title }}</h3>
              <div class="event-category">{{ event.category }}</div>
            </div>
            <p class="event-description">{{ truncateText(event.short_description || event.description, 100) }}</p>
            <div class="event-details">
              <div class="event-date">
                <i class="fas fa-calendar"></i>
                {{ formatEventDate(event) }}
              </div>
              <div class="event-location">
                <i class="fas fa-map-marker-alt"></i>
                {{ getEventLocation(event) }}
              </div>
              <div class="event-price">
                <i class="fas fa-ticket-alt"></i>
                {{ getEventPrice(event) }}
              </div>
            </div>
            <div class="event-stats">
              <div class="stat">
                <i class="fas fa-users"></i>
                {{ event.registrations?.length || 0 }} registered
              </div>
              <div class="stat">
                <i class="fas fa-dollar-sign"></i>
                ${{ formatMoney(calculateEventRevenue(event)) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="events-list">
        <div v-for="event in paginatedEvents" :key="event.id" class="event-list-item">
          <div class="event-list-image">
            <img :src="event.cover_image_url || '/api/placeholder/100/100'" :alt="event.title" />
          </div>
          <div class="event-list-content">
            <div class="event-list-header">
              <h3 class="event-title">{{ event.title }}</h3>
              <div class="event-badges">
                <span class="badge" :class="`badge-${event.type}`">{{ formatEventType(event.type) }}</span>
                <span class="badge" :class="`badge-${event.status}`">{{ formatStatus(event.status) }}</span>
              </div>
            </div>
            <p class="event-description">{{ truncateText(event.description, 150) }}</p>
            <div class="event-meta">
              <span class="meta-item">
                <i class="fas fa-calendar"></i>
                {{ formatEventDate(event) }}
              </span>
              <span class="meta-item">
                <i class="fas fa-map-marker-alt"></i>
                {{ getEventLocation(event) }}
              </span>
              <span class="meta-item">
                <i class="fas fa-users"></i>
                {{ event.registrations?.length || 0 }} registered
              </span>
              <span class="meta-item">
                <i class="fas fa-dollar-sign"></i>
                ${{ formatMoney(calculateEventRevenue(event)) }}
              </span>
            </div>
          </div>
          <div class="event-list-actions">
            <button class="btn btn-outline-primary btn-sm" @click="viewEvent(event)">
              <i class="fas fa-eye"></i>
              View
            </button>
            <button class="btn btn-primary btn-sm" @click="editEvent(event)">
              <i class="fas fa-edit"></i>
              Edit
            </button>
            <div class="dropdown">
              <button class="btn btn-outline-secondary btn-sm dropdown-toggle">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <div class="dropdown-menu">
                <a @click="duplicateEvent(event)">
                  <i class="fas fa-copy"></i>
                  Duplicate
                </a>
                <a @click="viewAnalytics(event)">
                  <i class="fas fa-chart-bar"></i>
                  Analytics
                </a>
                <a @click="exportRegistrations(event)">
                  <i class="fas fa-download"></i>
                  Export
                </a>
                <div class="dropdown-divider"></div>
                <a @click="deleteEvent(event)" class="text-danger">
                  <i class="fas fa-trash"></i>
                  Delete
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination-container">
      <div class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          <i class="fas fa-chevron-left"></i>
          Previous
        </button>

        <div class="page-numbers">
          <button
            v-for="page in visiblePages"
            :key="page"
            class="page-number"
            :class="{ active: page === currentPage }"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
        </div>

        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          Next
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      <div class="pagination-info">
        Showing {{ startIndex + 1 }}-{{ endIndex }} of {{ filteredEvents.length }} events
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'Events',
  setup() {
    const router = useRouter()

    // State
    const loading = ref(false)
    const showFilters = ref(false)
    const viewMode = ref('grid') // 'grid' or 'list'
    const sortBy = ref('start_date')
    const sortDirection = ref('asc')
    const currentPage = ref(1)
    const pageSize = ref(12)

    // Mock data
    const events = ref([
      {
        id: 'evt_001',
        title: 'Tech Conference 2024',
        description: 'Join us for the biggest tech conference of the year featuring industry leaders and innovative technologies.',
        short_description: 'The biggest tech conference featuring industry leaders and innovations.',
        category: 'Technology',
        type: 'in_person',
        status: 'published',
        start_date: '2024-10-15T09:00:00Z',
        end_date: '2024-10-17T18:00:00Z',
        venue_name: 'Sydney Convention Centre',
        venue_address_city: 'Sydney',
        venue_address_state: 'NSW',
        is_free: false,
        base_price: 299.00,
        max_capacity: 1000,
        cover_image_url: '/api/placeholder/400/200',
        registrations: Array(450).fill({}),
        ticket_types: [
          { id: 'tkt_001', name: 'Early Bird', price: 199.00, sold_quantity: 150 },
          { id: 'tkt_002', name: 'Regular', price: 299.00, sold_quantity: 300 }
        ]
      },
      {
        id: 'evt_002',
        title: 'Online Marketing Masterclass',
        description: 'Learn the latest digital marketing strategies from experts in the field.',
        short_description: 'Master digital marketing with industry experts.',
        category: 'Business',
        type: 'online',
        status: 'published',
        start_date: '2024-09-28T10:00:00Z',
        end_date: '2024-09-28T16:00:00Z',
        online_platform: 'Zoom',
        is_free: false,
        base_price: 149.00,
        max_capacity: 500,
        cover_image_url: '/api/placeholder/400/200',
        registrations: Array(320).fill({}),
        ticket_types: [
          { id: 'tkt_003', name: 'Standard', price: 149.00, sold_quantity: 320 }
        ]
      },
      {
        id: 'evt_003',
        title: 'Music Festival 2024',
        description: 'A weekend of amazing music with top artists from around the world.',
        short_description: 'Weekend music festival with international artists.',
        category: 'Entertainment',
        type: 'in_person',
        status: 'published',
        start_date: '2024-11-02T16:00:00Z',
        end_date: '2024-11-03T23:00:00Z',
        venue_name: 'Central Park',
        venue_address_city: 'Melbourne',
        venue_address_state: 'VIC',
        is_free: false,
        base_price: 89.00,
        max_capacity: 5000,
        cover_image_url: '/api/placeholder/400/200',
        registrations: Array(2800).fill({}),
        ticket_types: [
          { id: 'tkt_004', name: 'General Admission', price: 89.00, sold_quantity: 2000 },
          { id: 'tkt_005', name: 'VIP', price: 199.00, sold_quantity: 800 }
        ]
      },
      {
        id: 'evt_004',
        title: 'Startup Pitch Night',
        description: 'Watch innovative startups pitch their ideas to investors.',
        short_description: 'Startups pitch to investors in this exciting event.',
        category: 'Business',
        type: 'hybrid',
        status: 'published',
        start_date: '2024-09-30T18:00:00Z',
        end_date: '2024-09-30T21:00:00Z',
        venue_name: 'Innovation Hub',
        venue_address_city: 'Brisbane',
        venue_address_state: 'QLD',
        online_platform: 'YouTube Live',
        is_free: true,
        base_price: 0.00,
        max_capacity: 200,
        cover_image_url: '/api/placeholder/400/200',
        registrations: Array(180).fill({}),
        ticket_types: [
          { id: 'tkt_006', name: 'Free Ticket', price: 0.00, sold_quantity: 180 }
        ]
      },
      {
        id: 'evt_005',
        title: 'Cooking Workshop',
        description: 'Learn to cook delicious Italian cuisine with our expert chef.',
        short_description: 'Italian cooking workshop with expert chef.',
        category: 'Education',
        type: 'in_person',
        status: 'draft',
        start_date: '2024-10-05T14:00:00Z',
        end_date: '2024-10-05T17:00:00Z',
        venue_name: 'Culinary Institute',
        venue_address_city: 'Adelaide',
        venue_address_state: 'SA',
        is_free: false,
        base_price: 79.00,
        max_capacity: 20,
        cover_image_url: '/api/placeholder/400/200',
        registrations: [],
        ticket_types: [
          { id: 'tkt_007', name: 'Workshop Ticket', price: 79.00, sold_quantity: 0 }
        ]
      }
    ])

    const categories = ref([
      { id: 'cat_001', name: 'Technology', icon: 'fas fa-laptop', color: '#3b82f6' },
      { id: 'cat_002', name: 'Business', icon: 'fas fa-briefcase', color: '#059669' },
      { id: 'cat_003', name: 'Entertainment', icon: 'fas fa-music', color: '#dc2626' },
      { id: 'cat_004', name: 'Education', icon: 'fas fa-graduation-cap', color: '#7c3aed' },
      { id: 'cat_005', name: 'Health', icon: 'fas fa-heartbeat', color: '#ea580c' },
      { id: 'cat_006', name: 'Sports', icon: 'fas fa-futbol', color: '#16a34a' }
    ])

    // Filters
    const filters = ref({
      search: '',
      category: '',
      type: '',
      status: '',
      startDate: '',
      endDate: '',
      minPrice: '',
      maxPrice: ''
    })

    // Computed properties
    const stats = computed(() => ({
      totalEvents: events.value.length,
      totalRegistrations: events.value.reduce((sum, event) => sum + (event.registrations?.length || 0), 0),
      totalRevenue: events.value.reduce((sum, event) => sum + calculateEventRevenue(event), 0),
      upcomingEvents: events.value.filter(event => new Date(event.start_date) > new Date()).length
    }))

    const hasActiveFilters = computed(() => {
      return Object.values(filters.value).some(value => value !== '')
    })

    const filteredEvents = computed(() => {
      let filtered = [...events.value]

      // Apply search filter
      if (filters.value.search) {
        const searchTerm = filters.value.search.toLowerCase()
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(searchTerm) ||
          event.description.toLowerCase().includes(searchTerm) ||
          event.category.toLowerCase().includes(searchTerm)
        )
      }

      // Apply category filter
      if (filters.value.category) {
        filtered = filtered.filter(event => event.category === filters.value.category)
      }

      // Apply type filter
      if (filters.value.type) {
        filtered = filtered.filter(event => event.type === filters.value.type)
      }

      // Apply status filter
      if (filters.value.status) {
        filtered = filtered.filter(event => event.status === filters.value.status)
      }

      // Apply date range filter
      if (filters.value.startDate) {
        filtered = filtered.filter(event => new Date(event.start_date) >= new Date(filters.value.startDate))
      }
      if (filters.value.endDate) {
        filtered = filtered.filter(event => new Date(event.start_date) <= new Date(filters.value.endDate))
      }

      // Apply price range filter
      if (filters.value.minPrice !== '') {
        filtered = filtered.filter(event => event.base_price >= parseFloat(filters.value.minPrice))
      }
      if (filters.value.maxPrice !== '') {
        filtered = filtered.filter(event => event.base_price <= parseFloat(filters.value.maxPrice))
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aValue = a[sortBy.value]
        let bValue = b[sortBy.value]

        if (sortBy.value === 'registrations') {
          aValue = a.registrations?.length || 0
          bValue = b.registrations?.length || 0
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }

        if (sortDirection.value === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })

      return filtered
    })

    const totalPages = computed(() => Math.ceil(filteredEvents.value.length / pageSize.value))

    const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)
    const endIndex = computed(() => Math.min(startIndex.value + pageSize.value, filteredEvents.value.length))

    const paginatedEvents = computed(() => {
      return filteredEvents.value.slice(startIndex.value, endIndex.value)
    })

    const visiblePages = computed(() => {
      const pages = []
      const maxVisible = 5
      let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
      let end = Math.min(totalPages.value, start + maxVisible - 1)

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      return pages
    })

    // Methods
    const formatMoney = (amount) => {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    }

    const formatEventType = (type) => {
      const types = {
        'in_person': 'In Person',
        'online': 'Online',
        'hybrid': 'Hybrid'
      }
      return types[type] || type
    }

    const formatStatus = (status) => {
      return status.charAt(0).toUpperCase() + status.slice(1)
    }

    const formatEventDate = (event) => {
      const start = new Date(event.start_date)
      const end = new Date(event.end_date)

      if (start.toDateString() === end.toDateString()) {
        return start.toLocaleDateString('en-AU', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      } else {
        return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`
      }
    }

    const getEventLocation = (event) => {
      if (event.type === 'online') {
        return event.online_platform || 'Online'
      } else if (event.type === 'hybrid') {
        return `${event.venue_name || 'TBA'} + Online`
      } else {
        return `${event.venue_name || 'TBA'}, ${event.venue_address_city || ''}`
      }
    }

    const getEventPrice = (event) => {
      if (event.is_free) {
        return 'Free'
      }

      if (event.ticket_types && event.ticket_types.length > 1) {
        const prices = event.ticket_types.map(t => t.price).sort((a, b) => a - b)
        return `$${formatMoney(prices[0])} - $${formatMoney(prices[prices.length - 1])}`
      }

      return `$${formatMoney(event.base_price)}`
    }

    const calculateEventRevenue = (event) => {
      if (!event.ticket_types) return 0
      return event.ticket_types.reduce((sum, ticket) => {
        return sum + (ticket.price * ticket.sold_quantity)
      }, 0)
    }

    const truncateText = (text, length) => {
      if (!text) return ''
      return text.length > length ? text.substring(0, length) + '...' : text
    }

    const debouncedSearch = debounce(() => {
      currentPage.value = 1
    }, 300)

    const clearFilters = () => {
      filters.value = {
        search: '',
        category: '',
        type: '',
        status: '',
        startDate: '',
        endDate: '',
        minPrice: '',
        maxPrice: ''
      }
      currentPage.value = 1
    }

    const applyFilters = () => {
      currentPage.value = 1
      showFilters.value = false
    }

    const sortEvents = () => {
      currentPage.value = 1
    }

    const toggleSortDirection = () => {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      currentPage.value = 1
    }

    const changePage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
      }
    }

    // Event actions
    const createNewEvent = () => {
      router.push('/events/create')
    }

    const viewEvent = (event) => {
      router.push(`/events/${event.id}`)
    }

    const editEvent = (event) => {
      router.push(`/events/${event.id}/edit`)
    }

    const duplicateEvent = (event) => {
      router.push(`/events/${event.id}/duplicate`)
    }

    const viewAnalytics = (event) => {
      router.push(`/events/${event.id}/analytics`)
    }

    const exportRegistrations = (event) => {
      // TODO: Implement export functionality
      console.log('Exporting registrations for:', event.title)
    }

    const deleteEvent = (event) => {
      if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
        const index = events.value.findIndex(e => e.id === event.id)
        if (index > -1) {
          events.value.splice(index, 1)
        }
      }
    }

    // Utility function
    function debounce(func, wait) {
      let timeout
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout)
          func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
      }
    }

    // Watch for filter changes
    watch(filters, () => {
      currentPage.value = 1
    }, { deep: true })

    onMounted(() => {
      // Load events data
      // TODO: Implement API call
    })

    return {
      // State
      loading,
      showFilters,
      viewMode,
      sortBy,
      sortDirection,
      currentPage,
      events,
      categories,
      filters,

      // Computed
      stats,
      hasActiveFilters,
      filteredEvents,
      totalPages,
      startIndex,
      endIndex,
      paginatedEvents,
      visiblePages,

      // Methods
      formatMoney,
      formatEventType,
      formatStatus,
      formatEventDate,
      getEventLocation,
      getEventPrice,
      calculateEventRevenue,
      truncateText,
      debouncedSearch,
      clearFilters,
      applyFilters,
      sortEvents,
      toggleSortDirection,
      changePage,
      createNewEvent,
      viewEvent,
      editEvent,
      duplicateEvent,
      viewAnalytics,
      exportRegistrations,
      deleteEvent
    }
  }
}
</script>

<style scoped>
.events-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem;
}

.page-header {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-title i {
  color: #3b82f6;
}

.page-subtitle {
  color: #64748b;
  margin: 0;
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-outline-primary {
  background: transparent;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.btn-outline-primary:hover {
  background: #3b82f6;
  color: white;
}

.btn-outline-secondary {
  background: transparent;
  color: #6b7280;
  border: 2px solid #d1d5db;
}

.btn-outline-secondary:hover {
  background: #f3f4f6;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

/* Stats Overview */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.stat-card.primary::before { background: #3b82f6; }
.stat-card.success::before { background: #10b981; }
.stat-card.warning::before { background: #f59e0b; }
.stat-card.info::before { background: #06b6d4; }

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.stat-card.primary .stat-icon { background: #3b82f6; }
.stat-card.success .stat-icon { background: #10b981; }
.stat-card.warning .stat-icon { background: #f59e0b; }
.stat-card.info .stat-icon { background: #06b6d4; }

.stat-number {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.stat-change {
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-change.positive { color: #10b981; }
.stat-change.negative { color: #ef4444; }
.stat-change.neutral { color: #6b7280; }

/* Filters Panel */
.filters-panel {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.filter-group label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.search-input-group {
  position: relative;
}

.search-input-group i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-input-group input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
}

.filter-group input,
.filter-group select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
}

.date-range,
.price-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-range input,
.price-range input {
  flex: 1;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* View Controls */
.view-controls {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-toggle {
  display: flex;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 0.25rem;
}

.view-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.view-btn.active {
  background: white;
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-controls select {
  padding: 0.5rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

.sort-direction {
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  color: #6b7280;
}

/* Events Content */
.events-content {
  margin-bottom: 2rem;
}

.loading-state,
.empty-state {
  background: white;
  border-radius: 16px;
  padding: 4rem 2rem;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #374151;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
  margin-bottom: 2rem;
}

/* Events Grid */
.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.event-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.event-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.event-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.event-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-badges {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  gap: 0.5rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge-in_person { background: #dbeafe; color: #1e40af; }
.badge-online { background: #d1fae5; color: #065f46; }
.badge-hybrid { background: #fef3c7; color: #92400e; }
.badge-published { background: #d1fae5; color: #065f46; }
.badge-draft { background: #f3f4f6; color: #374151; }
.badge-cancelled { background: #fee2e2; color: #991b1b; }
.badge-completed { background: #e0e7ff; color: #3730a3; }

.event-actions {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.event-card:hover .event-actions {
  opacity: 1;
}

.action-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: white;
  transform: scale(1.1);
}

.event-content {
  padding: 1.5rem;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.event-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.3;
}

.event-category {
  background: #f1f5f9;
  color: #475569;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.event-description {
  color: #64748b;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.event-details {
  margin-bottom: 1rem;
}

.event-details > div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.event-details i {
  width: 1rem;
  color: #9ca3af;
}

.event-stats {
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.event-stats .stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

/* Events List */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-list-item {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.event-list-image {
  width: 120px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.event-list-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-list-content {
  flex: 1;
}

.event-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.event-list-header .event-title {
  font-size: 1.125rem;
  margin: 0;
}

.event-meta {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #64748b;
}

.meta-item i {
  width: 1rem;
  color: #9ca3af;
}

.event-list-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-shrink: 0;
}

/* Dropdown */
.dropdown {
  position: relative;
}

.dropdown-toggle {
  border: 2px solid #e5e7eb !important;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 0.5rem 0;
  min-width: 160px;
  z-index: 1000;
  display: none;
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-menu a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: #374151;
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
}

.dropdown-menu a:hover {
  background: #f3f4f6;
}

.dropdown-menu a.text-danger {
  color: #dc2626;
}

.dropdown-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0.5rem 0;
}

/* Pagination */
.pagination-container {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
  margin: 0 1rem;
}

.page-number {
  width: 2.5rem;
  height: 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-number:hover {
  background: #f3f4f6;
}

.page-number.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.pagination-info {
  color: #64748b;
  font-size: 0.875rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .events-page {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .stats-overview {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .view-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .events-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .event-list-item {
    flex-direction: column;
    align-items: stretch;
  }

  .event-list-actions {
    justify-content: center;
  }

  .pagination-container {
    flex-direction: column;
    gap: 1rem;
  }

  .page-numbers {
    margin: 0;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>