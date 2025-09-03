<template>
  <PageTemplate
    page-title="Booking Management"
    page-description="Manage appointments and scheduling for your automotive & beauty services"
    header-icon="fas fa-calendar-check"
    :stats-cards="statsCards"
    :show-filters="true"
    :show-status-filter="true"
    :show-add-button="true"
    :show-view-toggle="true"
    add-button-text="New Booking"
    :search-query="searchQuery"
    :status-filter="statusFilter"
    :current-view="currentView"
    @add-clicked="showAddModal = true"
    @search-updated="searchQuery = $event"
    @status-filter-updated="statusFilter = $event"
    @clear-filters="clearFilters"
    @view-changed="currentView = $event"
  >
    <template #content>

    <!-- Additional Filters for Bookings -->
    <div class="additional-filters">
      <select v-model="dateFilter" @change="filterBookings" class="form-select">
        <option value="">All Dates</option>
        <option value="today">📅 Today</option>
        <option value="tomorrow">📅 Tomorrow</option>
        <option value="this_week">📅 This Week</option>
        <option value="next_week">📅 Next Week</option>
      </select>
      
      <button @click="testConnection" class="btn btn-outline-elegant" title="Test API connection">
        <i class="fas fa-bug"></i>
        Test API
      </button>
    </div>

    <!-- Bookings Content -->
    <div class="content-card">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading bookings...</p>
      </div>

      <div v-else-if="filteredBookings.length === 0 && !searchQuery" class="empty-state">
        <i class="fas fa-calendar-check"></i>
        <h3>No Bookings Yet</h3>
        <p>Get started by creating your first booking</p>
        <button @click="showAddModal = true" class="btn btn-primary">
          <i class="fas fa-plus"></i>
          Create First Booking
        </button>
      </div>

      <div v-else-if="filteredBookings.length === 0 && searchQuery" class="empty-state">
        <i class="fas fa-search"></i>
        <h3>No Results Found</h3>
        <p>Try adjusting your search criteria</p>
      </div>

      <!-- List View -->
      <div v-else-if="currentView === 'list'" class="bookings-list">
        <div class="bookings-table">
          <div class="table-header" :class="{ 'no-vehicle': !hasVehicleData }">
            <div class="header-cell">Time</div>
            <div class="header-cell">Customer</div>
            <div class="header-cell">Service</div>
            <div v-if="hasVehicleData" class="header-cell">Vehicle</div>
            <div class="header-cell">Staff</div>
            <div class="header-cell">Status</div>
            <div class="header-cell">Price</div>
            <div class="header-cell">Actions</div>
          </div>
          
          <div 
            v-for="booking in paginatedBookings" 
            :key="booking.id" 
            class="table-row"
            :class="{ 
              'urgent': isUrgent(booking), 
              'no-vehicle': !hasVehicleData,
              'status-confirmed': booking.status === 'confirmed',
              'status-completed': booking.status === 'completed',
              'status-cancelled': booking.status === 'cancelled',
              'status-in-progress': booking.status === 'in_progress'
            }"
          >
            <div class="table-cell">
              <div class="booking-time">
                <div class="date">{{ formatDate(booking.start_time) }}</div>
                <div class="time">{{ formatTime(booking.start_time) }} - {{ formatTime(booking.end_time) }}</div>
              </div>
            </div>
            
            <div class="table-cell">
              <div class="customer-info">
                <div class="name">{{ booking.customer?.first_name }} {{ booking.customer?.last_name }}</div>
                <div class="contact">{{ booking.customer?.phone }}</div>
              </div>
            </div>
            
            <div class="table-cell">
              <div class="services-list">
                <span 
                  v-for="service in booking.services" 
                  :key="service.id" 
                  class="service-tag"
                >
                  {{ service.name }}
                </span>
              </div>
            </div>
            
            <div v-if="hasVehicleData" class="table-cell">
              <div v-if="booking.vehicle" class="vehicle-info">
                <div class="vehicle-name">{{ booking.vehicle.make }} {{ booking.vehicle.model }}</div>
                <div class="license-plate">{{ booking.vehicle.license_plate }}</div>
              </div>
              <div v-else class="no-vehicle">No vehicle</div>
            </div>
            
            <div class="table-cell">
              <div v-if="booking.staff" class="staff-info">
                {{ booking.staff.first_name }} {{ booking.staff.last_name }}
              </div>
              <div v-else class="unassigned">Unassigned</div>
            </div>
            
            <div class="table-cell">
              <span class="status-badge" :class="booking.status">
                {{ formatStatus(booking.status) }}
              </span>
            </div>
            
            <div class="table-cell">
              <div class="price">${{ booking.total_price?.toFixed(2) || '0.00' }}</div>
            </div>
            
            <div class="table-cell">
              <div class="action-buttons">
                <button 
                  @click="viewBookingDetails(booking)" 
                  class="btn-icon btn-view"
                  title="View booking details"
                >
                  <i class="fas fa-eye"></i>
                </button>
                <button 
                  @click="editBooking(booking)" 
                  class="btn-icon btn-edit"
                  title="Edit booking"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button 
                  @click="updateBookingStatus(booking)" 
                  class="btn-icon btn-status"
                  :title="getStatusActionTitle(booking.status)"
                >
                  <i :class="getStatusActionIcon(booking.status)"></i>
                </button>
                <button 
                  @click="deleteBooking(booking)" 
                  class="btn-icon btn-delete"
                  title="Cancel booking"
                  v-if="booking.status !== 'completed'"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Pagination Controls -->
        <div v-if="totalCount > 0" class="pagination-container">
          <div class="pagination-info">
            Showing {{ Math.max(1, (currentPage - 1) * itemsPerPage + 1) }} - {{ Math.min(currentPage * itemsPerPage, totalCount || 0) }} of {{ totalCount || 0 }} bookings
          </div>
          
          <div class="pagination-controls">
            <button 
              @click="currentPage = 1; loadBookings()" 
              :disabled="currentPage === 1"
              class="btn-pagination"
            >
              <i class="fas fa-angle-double-left"></i>
            </button>
            
            <button 
              @click="currentPage--; loadBookings()" 
              :disabled="currentPage === 1"
              class="btn-pagination"
            >
              <i class="fas fa-angle-left"></i>
            </button>
            
            <span class="page-numbers">
              <button 
                v-for="page in visiblePages" 
                :key="page"
                @click="currentPage = page; loadBookings()"
                :class="{ active: page === currentPage }"
                class="btn-page"
              >
                {{ page }}
              </button>
            </span>
            
            <button 
              @click="currentPage++; loadBookings()" 
              :disabled="currentPage === totalPages"
              class="btn-pagination"
            >
              <i class="fas fa-angle-right"></i>
            </button>
            
            <button 
              @click="currentPage = totalPages; loadBookings()" 
              :disabled="currentPage === totalPages"
              class="btn-pagination"
            >
              <i class="fas fa-angle-double-right"></i>
            </button>
          </div>
          
          <div class="page-size-selector">
            <label>Show:</label>
            <select v-model="itemsPerPage" @change="currentPage = 1; loadBookings()">
              <option :value="8">8</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="1000">Show All</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Calendar View -->
      <div v-else-if="currentView === 'calendar'" class="calendar-view">
        <div class="calendar-header">
          <button @click="previousMonth" class="btn btn-outline-elegant">
            <i class="fas fa-chevron-left"></i>
          </button>
          <h3>{{ formatMonth(currentMonthStart) }}</h3>
          <button @click="nextMonth" class="btn btn-outline-elegant">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div class="month-calendar">
          <!-- Days of week header -->
          <div class="calendar-weekdays">
            <div class="weekday-header">Sun</div>
            <div class="weekday-header">Mon</div>
            <div class="weekday-header">Tue</div>
            <div class="weekday-header">Wed</div>
            <div class="weekday-header">Thu</div>
            <div class="weekday-header">Fri</div>
            <div class="weekday-header">Sat</div>
          </div>
          
          <!-- Calendar days -->
          <div class="calendar-days">
            <div 
              v-for="day in monthDays" 
              :key="day.date.toISOString()"
              class="calendar-day"
              :class="{ 
                'other-month': !day.isCurrentMonth,
                'today': day.isToday
              }"
              @click="quickBook(day.date)"
            >
              <div class="day-number">{{ day.date.getDate() }}</div>
              <div class="day-bookings">
                <div 
                  v-for="booking in getBookingsForDay(day.date)" 
                  :key="booking.id" 
                  class="booking-item"
                  :class="booking.status"
                  @click.stop="viewBookingDetails(booking)"
                  :title="`${booking.customer?.first_name} ${booking.customer?.last_name} - ${formatTime(booking.start_time)}`"
                >
                  <span class="booking-time">{{ formatTime(booking.start_time) }}</span>
                  <span class="booking-customer">{{ booking.customer?.first_name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Add/Edit Booking Modal -->
    <BookingModal
      v-if="showAddModal || showEditModal"
      :show="showAddModal || showEditModal"
      :booking="editingBooking"
      :customers="customers"
      :services="services"
      :staff="staff"
      @close="closeModals"
      @save="saveBooking"
    />

    <!-- Cancel Confirmation Modal -->
    <div v-if="showCancelModal" class="modal-overlay cancel-modal-overlay">
      <div class="modal-container cancel-confirmation-modal">
        <div class="modal-header">
          <div class="warning-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3>Cancel Booking</h3>
        </div>
        
        <div class="modal-body">
          <p>Are you sure you want to cancel this booking?</p>
          <div v-if="bookingToCancel" class="booking-details">
            <div class="detail-row">
              <span class="label">Customer:</span>
              <span class="value">{{ bookingToCancel.customer?.first_name }} {{ bookingToCancel.customer?.last_name }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Service:</span>
              <span class="value">{{ getServiceName(bookingToCancel.service_id) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date:</span>
              <span class="value">{{ formatDate(bookingToCancel.start_time) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Time:</span>
              <span class="value">{{ formatTime(bookingToCancel.start_time) }}</span>
            </div>
          </div>
          <p class="warning-text">This action cannot be undone.</p>
        </div>
        
        <div class="modal-footer">
          <button @click="showCancelModal = false" class="btn btn-secondary">
            <i class="fas fa-times"></i>
            Keep Booking
          </button>
          <button @click="confirmCancelBooking" class="btn btn-danger">
            <i class="fas fa-trash"></i>
            Cancel Booking
          </button>
        </div>
      </div>
    </div>

    <!-- Booking Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay details-modal-overlay">
      <div class="modal-container booking-details-modal">
        <div class="modal-header">
          <div class="info-icon">
            <i class="fas fa-info-circle"></i>
          </div>
          <h3>Booking Details</h3>
          <button @click="showDetailsModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body" v-if="selectedBooking">
          <div class="details-container">
            <!-- Customer Information -->
            <div class="detail-section">
              <h4><i class="fas fa-user"></i> Customer Information</h4>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="label">Name:</span>
                  <span class="value">{{ selectedBooking.customer?.first_name }} {{ selectedBooking.customer?.last_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Phone:</span>
                  <span class="value">{{ selectedBooking.customer?.phone || 'Not provided' }}</span>
                </div>
                <div class="detail-row" v-if="selectedBooking.customer?.email">
                  <span class="label">Email:</span>
                  <span class="value">{{ selectedBooking.customer?.email }}</span>
                </div>
              </div>
            </div>

            <!-- Booking Information -->
            <div class="detail-section">
              <h4><i class="fas fa-calendar-alt"></i> Booking Information</h4>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="label">Booking ID:</span>
                  <span class="value">#{{ selectedBooking.id }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Date:</span>
                  <span class="value">{{ formatDate(selectedBooking.start_time) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Time:</span>
                  <span class="value">{{ formatTime(selectedBooking.start_time) }} - {{ formatTime(selectedBooking.end_time) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Duration:</span>
                  <span class="value">{{ selectedBooking.duration }} minutes</span>
                </div>
                <div class="detail-row">
                  <span class="label">Status:</span>
                  <span class="value">
                    <span class="status-badge" :class="selectedBooking.status">
                      {{ formatStatus(selectedBooking.status) }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Service Information -->
            <div class="detail-section">
              <h4><i class="fas fa-wrench"></i> Service Information</h4>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">{{ getServiceName(selectedBooking.service_id) || 'Service not found' }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Total Price:</span>
                  <span class="value price-highlight">${{ selectedBooking.total_price?.toFixed(2) || '0.00' }}</span>
                </div>
              </div>
            </div>

            <!-- Staff Information -->
            <div class="detail-section" v-if="selectedBooking.staff">
              <h4><i class="fas fa-user-tie"></i> Staff Information</h4>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="label">Assigned Staff:</span>
                  <span class="value">{{ selectedBooking.staff.first_name }} {{ selectedBooking.staff.last_name }}</span>
                </div>
              </div>
            </div>

            <!-- Vehicle Information -->
            <div class="detail-section" v-if="selectedBooking.vehicle_info">
              <h4><i class="fas fa-car"></i> Vehicle Information</h4>
              <div class="detail-grid">
                <div class="detail-row" v-if="selectedBooking.vehicle">
                  <span class="label">Vehicle:</span>
                  <span class="value">{{ selectedBooking.vehicle.make }} {{ selectedBooking.vehicle.model }}</span>
                </div>
                <div class="detail-row" v-if="selectedBooking.vehicle?.license_plate">
                  <span class="label">License Plate:</span>
                  <span class="value">{{ selectedBooking.vehicle.license_plate }}</span>
                </div>
                <div class="detail-row" v-if="selectedBooking.vehicle_info">
                  <span class="label">Vehicle Info:</span>
                  <span class="value">{{ selectedBooking.vehicle_info }}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="detail-section" v-if="selectedBooking.notes">
              <h4><i class="fas fa-sticky-note"></i> Notes</h4>
              <div class="notes-content">
                {{ selectedBooking.notes }}
              </div>
            </div>

            <!-- Created/Updated Information -->
            <div class="detail-section">
              <h4><i class="fas fa-clock"></i> Timestamps</h4>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="label">Created:</span>
                  <span class="value">{{ formatDate(selectedBooking.created_at) }} {{ formatTime(selectedBooking.created_at) }}</span>
                </div>
                <div class="detail-row" v-if="selectedBooking.updated_at !== selectedBooking.created_at">
                  <span class="label">Last Updated:</span>
                  <span class="value">{{ formatDate(selectedBooking.updated_at) }} {{ formatTime(selectedBooking.updated_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="editBooking(selectedBooking)" class="btn btn-primary">
            <i class="fas fa-edit"></i>
            Edit Booking
          </button>
          <button @click="showDetailsModal = false" class="btn btn-secondary">
            <i class="fas fa-times"></i>
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Database Error Modal -->
    <div v-if="showErrorModal" class="modal-overlay error-modal-overlay">
      <div class="modal-container error-modal">
        <div class="modal-header">
          <div class="error-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2>Database Connection Error</h2>
          <button @click="showErrorModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="error-message">
            <h3>{{ errorTitle }}</h3>
            <p>{{ errorMessage }}</p>
          </div>
          
          <div class="error-details" v-if="errorDetails">
            <details>
              <summary>Technical Details</summary>
              <pre>{{ errorDetails }}</pre>
            </details>
          </div>
          
          <div class="error-suggestions">
            <h4>What you can do:</h4>
            <ul>
              <li>Check if the backend server is running on <code>localhost:8080</code></li>
              <li>Verify database connection is established</li>
              <li>Try refreshing the page</li>
              <li>Contact system administrator if problem persists</li>
            </ul>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="testConnection" class="btn btn-info">
            <i class="fas fa-bug"></i>
            Test API
          </button>
          <button @click="retryConnection" class="btn btn-primary">
            <i class="fas fa-redo"></i>
            Retry Connection
          </button>
          <button @click="showErrorModal = false" class="btn btn-secondary">
            <i class="fas fa-times"></i>
            Close
          </button>
        </div>
      </div>
    </div>
    </template>
  </PageTemplate>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import PageTemplate from '@/components/PageTemplate.vue'
import BookingModal from '@/components/BookingModal.vue'
import { useOrganizationContextStore } from '../stores/organizationContext'

export default {
  name: 'Bookings',
  components: {
    PageTemplate,
    BookingModal
  },
  setup() {
    // Reactive data
    const bookings = ref([])
    const customers = ref([])
    const services = ref([])
    const staff = ref([])
    const isLoading = ref(false)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const dateFilter = ref('')
    const currentView = ref('list')
    const currentPage = ref(1)
    const itemsPerPage = ref(10)
    const totalCount = ref(0)
    const totalPages = ref(1)
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const editingBooking = ref(null)
    const currentWeekStart = ref(new Date())
    const currentMonthStart = ref(new Date())
    const isWordPressEmbed = ref(false)
    
    // Organization context
    const orgContextStore = useOrganizationContextStore()
    
    // Error modal data
    const showErrorModal = ref(false)
    const errorTitle = ref('')
    const errorMessage = ref('')
    
    // Cancel confirmation modal data
    const showCancelModal = ref(false)
    const bookingToCancel = ref(null)
    const errorDetails = ref('')
    
    // View details modal data
    const showDetailsModal = ref(false)
    const selectedBooking = ref(null)

    // Helper functions to resolve booking data
    const getCustomerById = (customerId) => {
      return customers.value.find(c => c.id === customerId) || null
    }

    const getServiceName = (serviceId) => {
      const service = services.value.find(s => s.id === serviceId)
      return service ? service.name : 'Unknown Service'
    }
    
    const getServiceById = (serviceId) => {
      return services.value.find(s => s.id === serviceId) || null
    }
    
    const getStaffById = (staffId) => {
      return staff.value.find(s => s.id === staffId) || null
    }

    // Computed properties to enrich booking data
    const enrichedBookings = computed(() => {
      console.log('🔄 Enriching bookings...')
      console.log('📊 Raw bookings:', bookings.value.length)
      console.log('👥 Available customers:', customers.value.length) 
      console.log('🔧 Available services:', services.value.length)
      console.log('👨‍💼 Available staff:', staff.value.length)
      
      if (bookings.value.length === 0) {
        console.log('⚠️ No bookings to enrich')
        return []
      }
      
      const enriched = bookings.value.map((booking, index) => {
        console.log(`📋 Enriching booking ${index + 1}:`, booking)
        
        // Customer data is already embedded in the booking response
        const customer = booking.customer || getCustomerById(booking.customer_id)
        console.log(`👤 Customer data:`, customer)
        
        // Find the service by service_id
        let service = null
        let services = []
        const availableServices = services.value || []
        
        if (booking.service_id && booking.service_id > 0) {
          // Use the actual service_id from the booking
          service = availableServices.find(s => s.id === booking.service_id)
          if (service) {
            services = [service]
            console.log(`🔧 Found service by ID ${booking.service_id}:`, service.name)
          }
        } else {
          // Fallback: infer service from price (for old bookings without service_id)
          if (availableServices.length > 0 && booking.total_price === 85) {
            service = availableServices.find(s => s.price === 85) // Oil Change
          } else if (availableServices.length > 0 && booking.total_price === 180) {
            service = availableServices.find(s => s.price === 180) // Brake Service  
          } else if (availableServices.length > 0 && booking.total_price === 120) {
            service = availableServices.find(s => s.price === 120) // Tire Rotation
          } else if (availableServices.length > 0 && booking.total_price === 65) {
            service = availableServices.find(s => s.price === 65) // Hair Cut
          } else if (availableServices.length > 0 && booking.total_price === 95) {
            service = availableServices.find(s => s.price === 95) // Facial Treatment
          }
          
          if (service) {
            services = [service]
            console.log(`🔧 Inferred service from price ${booking.total_price}:`, service.name)
          } else {
            console.log(`🔧 Could not infer service for price: ${booking.total_price}`)
          }
        }
        
        // Find the assigned staff member by staff_id
        const availableStaff = staff.value || []
        let assignedStaff = null
        
        if (booking.staff_id && booking.staff_id > 0) {
          // Use the actual staff_id from the booking
          assignedStaff = availableStaff.find(s => s.id === booking.staff_id)
          console.log(`👨‍💼 Found staff by ID ${booking.staff_id}:`, assignedStaff)
        } else {
          // Fallback: assign a staff member based on booking ID (for old bookings without staff_id)
          assignedStaff = availableStaff.length > 0 ? availableStaff[booking.id % availableStaff.length] : null
          console.log(`👨‍💼 Fallback assigned staff:`, assignedStaff)
        }
        
        // Return enriched booking
        const enrichedBooking = {
          ...booking,
          customer: customer,
          services: services,
          staff: assignedStaff,
          // Keep vehicle data if it exists
          vehicle: booking.vehicle_info ? {
            make: 'Unknown',
            model: 'Vehicle',
            license_plate: booking.vehicle_info
          } : null
        }
        
        console.log('✅ Enriched booking:', enrichedBooking)
        return enrichedBooking
      })
      
      // Sort by start_time in ascending order (earliest dates first)
      enriched.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      
      console.log('🎉 Final enriched bookings count:', enriched.length)
      return enriched
    })

    // Check if any booking has vehicle data to show/hide vehicle column
    const hasVehicleData = computed(() => {
      return enrichedBookings.value.some(booking => booking.vehicle || booking.vehicle_info)
    })

    const filteredBookings = computed(() => {
      console.log('🔍 Filtering bookings...')
      console.log('📊 Raw bookings count:', bookings.value.length)
      console.log('📊 Enriched bookings count:', enrichedBookings.value.length)
      
      let filtered = enrichedBookings.value

      // Filter by search query
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(booking => 
          booking.customer?.first_name?.toLowerCase().includes(query) ||
          booking.customer?.last_name?.toLowerCase().includes(query) ||
          booking.customer?.phone?.includes(query) ||
          booking.services?.some(service => service.name.toLowerCase().includes(query)) ||
          booking.vehicle?.license_plate?.toLowerCase().includes(query)
        )
      }

      // Filter by status
      if (statusFilter.value) {
        filtered = filtered.filter(booking => booking.status === statusFilter.value)
      }

      // Filter by date
      if (dateFilter.value) {
        const now = new Date()
        filtered = filtered.filter(booking => {
          const bookingDate = new Date(booking.start_time)
          switch (dateFilter.value) {
            case 'today':
              return isSameDay(bookingDate, now)
            case 'tomorrow':
              const tomorrow = new Date(now)
              tomorrow.setDate(now.getDate() + 1)
              return isSameDay(bookingDate, tomorrow)
            case 'this_week':
              return isSameWeek(bookingDate, now)
            case 'next_week':
              const nextWeek = new Date(now)
              nextWeek.setDate(now.getDate() + 7)
              return isSameWeek(bookingDate, nextWeek)
            default:
              return true
          }
        })
      }

      console.log('📊 Filtered bookings count:', filtered.length)
      if (filtered.length > 0) {
        console.log('📋 First filtered booking:', filtered[0])
      }
      
      return filtered
    })

    const paginatedBookings = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredBookings.value.slice(start, end)
    })

    // totalPages is now set from server response in loadBookings()

    const visiblePages = computed(() => {
      const pages = []
      const total = totalPages.value
      const current = currentPage.value
      
      for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        pages.push(i)
      }
      
      return pages
    })

    const activeBookings = computed(() => {
      return bookings.value.filter(b => b.status !== 'cancelled').length
    })

    const completedBookings = computed(() => {
      return bookings.value.filter(b => b.status === 'completed').length
    })

    const pendingBookings = computed(() => {
      return bookings.value.filter(b => ['scheduled', 'confirmed', 'in_progress'].includes(b.status)).length
    })

    const todayBookings = computed(() => {
      const today = new Date()
      return bookings.value.filter(b => 
        isSameDay(new Date(b.start_time), today) && b.status !== 'cancelled'
      ).length
    })

    const statsCards = computed(() => [
      {
        value: activeBookings.value || 0,
        label: 'Active Bookings',
        icon: 'fas fa-calendar-check',
        type: 'info'
      },
      {
        value: completedBookings.value || 0,
        label: 'Completed',
        icon: 'fas fa-check-circle',
        type: 'success'
      },
      {
        value: pendingBookings.value || 0,
        label: 'Pending',
        icon: 'fas fa-clock',
        type: 'warning'
      },
      {
        value: todayBookings.value || 0,
        label: 'Today\'s Bookings',
        icon: 'fas fa-calendar-day',
        type: 'info'
      }
    ])

    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
      dateFilter.value = ''
      filterBookings()
    }

    const businessHours = computed(() => {
      const hours = []
      for (let i = 8; i <= 18; i++) {
        hours.push(i)
      }
      return hours
    })

    const weekDays = computed(() => {
      const days = []
      const start = new Date(currentWeekStart.value)
      for (let i = 0; i < 7; i++) {
        const day = new Date(start)
        day.setDate(start.getDate() + i)
        days.push(day)
      }
      return days
    })

    // Clear any localStorage data to ensure database-only operation
    const clearLocalStorageData = () => {
      localStorage.removeItem('bookings')
      localStorage.removeItem('customers') 
      localStorage.removeItem('services')
      localStorage.removeItem('staff')
      console.log('Cleared localStorage data - using database only')
    }

    // Error modal functions
    const showError = (title, message, details = '') => {
      errorTitle.value = title
      errorMessage.value = message
      errorDetails.value = details
      showErrorModal.value = true
    }

    const retryConnection = async () => {
      showErrorModal.value = false
      await loadBookings()
    }

    // Debug function to test API connection
    const testConnection = async () => {
      console.log('🧪 Testing API connection...')
      
      try {
        // Test basic connectivity
        const response = await fetch('http://localhost:8080/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        console.log('🏥 Health check response:', response.status, response.statusText)
        
        if (response.ok) {
          const data = await response.json()
          console.log('🏥 Health check data:', data)
        } else {
          console.log('🏥 Health check failed')
        }
      } catch (error) {
        console.log('🏥 Health check error:', error.message)
      }
      
      // Test bookings endpoint specifically
      try {
        const response = await fetch('http://localhost:8080/api/bookings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        console.log('📋 Bookings endpoint response:', response.status, response.statusText)
        console.log('📋 Response headers:', [...response.headers.entries()])
        
        const textData = await response.text()
        console.log('📋 Raw response body:', textData)
        
        try {
          const jsonData = JSON.parse(textData)
          console.log('📋 Parsed JSON:', jsonData)
        } catch (parseError) {
          console.log('📋 Failed to parse JSON:', parseError.message)
        }
        
      } catch (error) {
        console.log('📋 Bookings endpoint error:', error.message)
      }
    }

    // Methods
    const loadCustomers = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/customers', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'mock-token'}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            customers.value = data.data.customers || data.data || []
            console.log(`👥 Loaded ${customers.value.length} customers separately`)
          }
        }
      } catch (error) {
        console.error('Failed to load customers:', error.message)
      }
    }

    const loadServices = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/services', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'mock-token'}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            services.value = data.data.services || data.data || []
            console.log(`🔧 Loaded ${services.value.length} services separately`)
          }
        }
      } catch (error) {
        console.error('Failed to load services:', error.message)
      }
    }

    const loadStaff = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/staff', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'mock-token'}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            staff.value = data.data.staff || data.data || []
            console.log(`👨‍💼 Loaded ${staff.value.length} staff separately`)
          }
        }
      } catch (error) {
        console.error('Failed to load staff:', error.message)
      }
    }

    const loadBookings = async () => {
      isLoading.value = true
      console.log('🔄 Starting to load bookings from database...')
      
      try {
        // Check if we can reach the API endpoint
        const queryParams = new URLSearchParams({
          page: currentPage.value,
          pageSize: itemsPerPage.value
        })
        
        // Add organization filter if selected (for non-super-admin or when org is selected)
        if (orgContextStore.currentOrgId) {
          queryParams.append('organization_id', orgContextStore.currentOrgId)
        }
        
        const url = `http://localhost:8080/api/bookings?${queryParams}`
        console.log('📡 Making request to:', url)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'mock-token'}`
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        console.log(`📋 Response received: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          const contentType = response.headers.get('content-type')
          console.log('📄 Content-Type:', contentType)
          
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json()
            console.log('📦 Raw response data:', data)
            
            if (data.success && data.data && data.data.bookings) {
              bookings.value = data.data.bookings
              
              // Handle pagination data if present
              if (data.data.pagination) {
                totalCount.value = data.data.pagination.totalCount
                totalPages.value = data.data.pagination.totalPages
                console.log(`📄 Pagination: Page ${data.data.pagination.page} of ${data.data.pagination.totalPages}, Total: ${data.data.pagination.totalCount} bookings`)
              }
              
              console.log(`✅ Successfully loaded ${data.data.bookings.length} bookings from database`)
              
              // DEBUG: Show the actual booking structure
              console.log('📋 Sample booking structure:')
              if (data.data.bookings.length > 0) {
                console.log('First booking:', JSON.stringify(data.data.bookings[0], null, 2))
              }
              
              // Always load services and staff separately since they're needed for enrichment
              console.log('🔧 Loading services separately...')
              await loadServices()
              
              console.log('👨‍💼 Loading staff separately...')
              await loadStaff()
              
              // Load customers if not embedded (though they seem to be embedded already)
              if (!data.data.bookings[0]?.customer) {
                console.log('👥 Customers not embedded, loading separately...')
                await loadCustomers()
              } else {
                console.log('👥 Customer data is embedded in bookings')
              }
              
            } else {
              console.warn('⚠️ Invalid API response format:', data)
              bookings.value = []
              
              showError(
                'Invalid Response Format',
                'The server returned an unexpected response format. The API may be misconfigured.',
                `Expected: { success: true, data: { bookings: [...] } }\nReceived: ${JSON.stringify(data, null, 2)}`
              )
            }
          } else {
            throw new Error(`Server returned non-JSON response. Content-Type: ${contentType}`)
          }
        } else {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`
          let errorDetails = `URL: ${response.url}\nStatus: ${response.status}\nStatusText: ${response.statusText}`
          
          try {
            const errorData = await response.json()
            if (errorData.message) {
              errorMessage = errorData.message
            }
            errorDetails += `\nServer Response: ${JSON.stringify(errorData, null, 2)}`
          } catch (parseError) {
            const textData = await response.text()
            errorDetails += `\nResponse Body: ${textData}`
          }
          
          throw new Error(errorMessage)
        }
      } catch (error) {
        console.error('❌ Failed to load bookings from database:', error)
        bookings.value = []
        
        let errorTitle = 'Failed to Load Bookings'
        let errorMessage = 'Unable to retrieve bookings from the database.'
        let errorDetails = error.message
        
        if (error.name === 'AbortError') {
          errorTitle = 'Connection Timeout'
          errorMessage = 'The database request timed out after 10 seconds. The server may be slow or unresponsive.'
          errorDetails = 'Request was aborted due to timeout'
        } else if (error.message.includes('fetch')) {
          errorTitle = 'Network Connection Error'
          errorMessage = 'Cannot connect to the backend server. Please ensure the server is running on localhost:8080.'
          errorDetails = `${error.message}\n\nCommon causes:\n- Backend server not running\n- Wrong port (should be 8080)\n- CORS issues\n- Firewall blocking connection`
        } else if (error.message.includes('JSON')) {
          errorTitle = 'Data Format Error'
          errorMessage = 'The server returned data in an unexpected format.'
        }
        
        showError(errorTitle, errorMessage, errorDetails)
      } finally {
        isLoading.value = false
        console.log('🔄 Finished loading bookings')
      }
    }

    const filterBookings = () => {
      currentPage.value = 1
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-AU')
    }

    const formatTime = (dateString) => {
      return new Date(dateString).toLocaleTimeString('en-AU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    const formatStatus = (status) => {
      const statusMap = {
        scheduled: 'Scheduled',
        confirmed: 'Confirmed',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        no_show: 'No Show'
      }
      return statusMap[status] || status
    }

    const isUrgent = (booking) => {
      const now = new Date()
      const bookingTime = new Date(booking.start_time)
      const timeDiff = bookingTime - now
      return timeDiff > 0 && timeDiff < 60 * 60 * 1000 // 1 hour
    }

    const isSameDay = (date1, date2) => {
      return date1.toDateString() === date2.toDateString()
    }

    const isSameWeek = (date1, date2) => {
      const startOfWeek1 = new Date(date1)
      startOfWeek1.setDate(date1.getDate() - date1.getDay())
      
      const startOfWeek2 = new Date(date2)
      startOfWeek2.setDate(date2.getDate() - date2.getDay())
      
      return startOfWeek1.toDateString() === startOfWeek2.toDateString()
    }

    const getStatusActionTitle = (status) => {
      switch (status) {
        case 'scheduled': return 'Mark as confirmed'
        case 'confirmed': return 'Start service'
        case 'in_progress': return 'Complete service'
        default: return 'Update status'
      }
    }

    const getStatusActionIcon = (status) => {
      switch (status) {
        case 'scheduled': return 'fas fa-check'
        case 'confirmed': return 'fas fa-play'
        case 'in_progress': return 'fas fa-check-circle'
        default: return 'fas fa-edit'
      }
    }

    const editBooking = (booking) => {
      editingBooking.value = booking
      showEditModal.value = true
      // Close details modal if it's open
      showDetailsModal.value = false
    }

    const deleteBooking = (booking) => {
      bookingToCancel.value = booking
      showCancelModal.value = true
    }
    
    const viewBookingDetails = (booking) => {
      selectedBooking.value = booking
      showDetailsModal.value = true
    }

    const confirmCancelBooking = async () => {
      if (bookingToCancel.value) {
        try {
          console.log('Canceling booking in database:', bookingToCancel.value.id)
          
          const response = await fetch(`http://localhost:8080/api/bookings/${bookingToCancel.value.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'mock-token'}`
            }
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              console.log('Booking canceled successfully in database:', result)
              showCancelModal.value = false
              bookingToCancel.value = null
              await loadBookings() // Reload to show updated list
            } else {
              throw new Error('Failed to cancel booking: ' + result.message)
            }
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
            throw new Error(`API error ${response.status}: ${errorData.message}`)
          }
        } catch (error) {
          console.error('Failed to cancel booking:', error.message)
          showCancelModal.value = false
          bookingToCancel.value = null
          showError(
            'Failed to Cancel Booking',
            'Unable to cancel the booking. Please check your connection and try again.',
            error.message
          )
        }
      }
    }

    const updateBookingStatus = async (booking) => {
      try {
        // Determine next status based on current status
        let newStatus
        switch (booking.status) {
          case 'scheduled':
            newStatus = 'in_progress'
            break
          case 'in_progress':
            newStatus = 'completed'
            break
          case 'completed':
            return // Already completed, no action needed
          default:
            newStatus = 'scheduled'
        }
        
        console.log(`Updating booking ${booking.id} status from ${booking.status} to ${newStatus} in database`)
        
        const response = await fetch(`http://localhost:8080/api/bookings/${booking.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'mock-token'}`
          },
          body: JSON.stringify({
            ...booking,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            console.log('Booking status updated successfully in database:', result)
            await loadBookings() // Reload to show updated status
          } else {
            throw new Error('Failed to update booking status: ' + result.message)
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(`API error ${response.status}: ${errorData.message}`)
        }
      } catch (error) {
        console.error('Failed to update booking status:', error.message)
        showError(
          'Failed to Update Booking Status',
          'Unable to update the booking status. Please check your connection and try again.',
          error.message
        )
      }
    }

    const closeModals = () => {
      console.log('🔒 Closing modals')
      showAddModal.value = false
      showEditModal.value = false
      editingBooking.value = null
    }

    const saveBooking = async (booking) => {
      try {
        const isEditing = !!booking.id
        console.log(`💾 ${isEditing ? 'Updating' : 'Creating'} booking in database:`, booking)
        
        // DEBUG: Store current booking count for comparison
        const beforeCount = bookings.value.length
        const beforeIds = bookings.value.map(b => b.id).sort()
        console.log(`📊 Before save: ${beforeCount} bookings with IDs: [${beforeIds.join(', ')}]`)
        
        // Determine HTTP method and URL
        const method = isEditing ? 'PUT' : 'POST'
        const url = isEditing 
          ? `http://localhost:8080/api/bookings/${booking.id}`
          : 'http://localhost:8080/api/bookings'
        
        console.log(`📡 Making ${method} request to: ${url}`)
        
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'mock-token'}`
          },
          body: JSON.stringify(booking)
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            console.log(`✅ Booking ${isEditing ? 'updated' : 'saved'} successfully in database:`, result)
            
            // DEBUG: Show what was actually saved
            if (result.data && result.data.booking) {
              console.log('📝 Booking details:')
              console.log(`  ID: ${result.data.booking.id}`)
              console.log(`  Service: ${result.data.booking.service_id}`)
              console.log(`  Customer: ${result.data.booking.customer_id}`)
              console.log(`  Time: ${result.data.booking.start_time}`)
              console.log(`  ${isEditing ? 'Updated' : 'Created'}: ${result.data.booking.updated_at || result.data.booking.created_at}`)
            }
            
            closeModals()
            console.log(`🔄 Reloading bookings to show ${isEditing ? 'updated' : 'new'} entry...`)
            await loadBookings() // Reload to show the changes
            
            // DEBUG: Compare booking counts after reload
            const afterCount = bookings.value.length
            const afterIds = bookings.value.map(b => b.id).sort()
            console.log(`📊 After reload: ${afterCount} bookings with IDs: [${afterIds.join(', ')}]`)
            
            if (isEditing) {
              console.log('✅ SUCCESS: Booking updated!')
            } else if (afterCount > beforeCount) {
              console.log('✅ SUCCESS: New booking appeared in the list!')
            } else if (afterCount === beforeCount) {
              console.log('❌ ISSUE: Booking was saved but not appearing in list (same count)')
            } else {
              console.log('⚠️ WEIRD: Booking count decreased?!')
            }
          } else {
            throw new Error(`Failed to ${isEditing ? 'update' : 'save'} booking: ` + result.message)
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(`API error ${response.status}: ${errorData.message}`)
        }
      } catch (error) {
        const isEditing = !!booking.id
        console.error(`Failed to ${isEditing ? 'update' : 'save'} booking:`, error.message)
        showError(
          `Failed to ${isEditing ? 'Update' : 'Save'} Booking`,
          `Unable to ${isEditing ? 'update' : 'save'} the booking. Please check your connection and try again.`,
          error.message
        )
      }
    }

    const previousWeek = () => {
      const newStart = new Date(currentWeekStart.value)
      newStart.setDate(newStart.getDate() - 7)
      currentWeekStart.value = newStart
    }

    const nextWeek = () => {
      const newStart = new Date(currentWeekStart.value)
      newStart.setDate(newStart.getDate() + 7)
      currentWeekStart.value = newStart
    }

    const formatWeek = (startDate) => {
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      return `${startDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }

    const formatDayName = (date) => {
      return date.toLocaleDateString('en-AU', { weekday: 'short' })
    }

    const formatDayDate = (date) => {
      return date.getDate()
    }

    const formatHour = (hour) => {
      return `${hour}:00`
    }

    const getBookingsForSlot = (day, hour) => {
      return bookings.value.filter(booking => {
        const bookingStart = new Date(booking.start_time)
        return isSameDay(bookingStart, day) && bookingStart.getHours() === hour
      })
    }

    const quickBook = (day, hour) => {
      // Quick booking implementation
      console.log('Quick book for:', day, hour)
      showAddModal.value = true
    }

    // Watch for organization changes and reload data
    watch(
      () => orgContextStore.currentOrgId,
      (newOrgId, oldOrgId) => {
        if (newOrgId !== oldOrgId) {
          console.log('🏢 Organization changed in header, reloading bookings data...', { newOrgId, oldOrgId })
          currentPage.value = 1 // Reset pagination
          loadBookings()
          loadCustomers()
          loadServices()
          loadStaff()
        }
      }
    )

    // Lifecycle
    onMounted(async () => {
      console.log('🚀 BOOKINGS PAGE MOUNTED')
      console.log('📍 Current URL:', window.location.href)
      
      // Clear localStorage data to ensure database-only operation
      clearLocalStorageData()
      
      // Check if running in WordPress/iframe
      if (window.parent !== window) {
        isWordPressEmbed.value = true
      }
      
      // Check for WordPress query parameter
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('wp_embed') === 'true') {
        isWordPressEmbed.value = true
      }
      
      // Test direct fetch to verify CORS
      console.log('🧪 Testing direct fetch to backend...')
      try {
        const testResponse = await fetch('http://localhost:8080/api/health')
        console.log('🏥 Health test response:', testResponse.status, testResponse.statusText)
        if (testResponse.ok) {
          const healthData = await testResponse.json()
          console.log('🏥 Health data:', healthData)
        }
      } catch (error) {
        console.error('🏥 Health test failed:', error)
      }
      
      loadBookings()
      // Set current week start to Monday
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - today.getDay() + 1)
      currentWeekStart.value = monday
    })

    return {
      // Data
      bookings,
      customers,
      services,
      staff,
      orgContextStore,
      isLoading,
      searchQuery,
      statusFilter,
      dateFilter,
      currentView,
      currentPage,
      itemsPerPage,
      showAddModal,
      showEditModal,
      editingBooking,
      currentWeekStart,
      isWordPressEmbed,
      showErrorModal,
      errorTitle,
      errorMessage,
      errorDetails,
      showCancelModal,
      bookingToCancel,
      showDetailsModal,
      selectedBooking,
      
      // Computed
      enrichedBookings,
      filteredBookings,
      paginatedBookings,
      totalCount,
      totalPages,
      visiblePages,
      activeBookings,
      completedBookings,
      pendingBookings,
      todayBookings,
      businessHours,
      weekDays,
      hasVehicleData,
      statsCards,
      
      // Methods
      showError,
      retryConnection,
      testConnection,
      loadBookings,
      loadCustomers,
      loadServices,
      loadStaff,
      filterBookings,
      clearFilters,
      formatDate,
      formatTime,
      formatStatus,
      getServiceName,
      isUrgent,
      getStatusActionTitle,
      getStatusActionIcon,
      editBooking,
      deleteBooking,
      viewBookingDetails,
      confirmCancelBooking,
      updateBookingStatus,
      closeModals,
      saveBooking,
      previousWeek,
      nextWeek,
      formatWeek,
      formatDayName,
      formatDayDate,
      formatHour,
      getBookingsForSlot,
      quickBook
    }
  }
}
</script>

<style scoped>
/* Additional Filters */
.additional-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  padding: 1rem;
  background: rgba(248, 250, 252, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

[data-theme="dark"] .additional-filters {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(31, 41, 55, 0.85) 100%);
  border: 1px solid rgba(75, 85, 99, 0.3);
}

/* WordPress Embed Support */
.bookings-page.wp-embedded {
  padding: 1rem;
  background: transparent;
  min-height: auto;
}

.wp-embedded .page-header {
  margin-bottom: 1rem;
  padding: 1.5rem;
}

.wp-embedded .stats-grid {
  margin-bottom: 1rem;
}

/* Header Styles */
.page-header {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  box-shadow: var(--bs-box-shadow-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.page-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.5), transparent);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0 0 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

.title-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.title-icon:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.35);
}

.title-icon i {
  font-size: 1.1rem;
  color: white;
}

.page-description {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin: 0;
  line-height: 1.4;
  max-width: 640px;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.stat-card {
  background: var(--card-bg);
  padding: 0.75rem;
  border-radius: 8px;
  box-shadow: var(--stat-card-shadow);
  border: 1px solid var(--card-border);
  border-left: 3px solid;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
}

.stat-card:nth-child(1) { border-left-color: #667eea; }
.stat-card:nth-child(2) { border-left-color: #43e97b; }
.stat-card:nth-child(3) { border-left-color: #fa709a; }
.stat-card:nth-child(4) { border-left-color: #4facfe; }

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
}

.stat-icon.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-icon.completed { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.stat-icon.pending { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.stat-icon.today { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.stat-content h3 {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: var(--bs-body-color);
}

.stat-content p {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin: 0.25rem 0;
}

.stat-change {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.stat-change.positive { 
  color: #28a745; 
  background: rgba(40, 167, 69, 0.1);
}
.stat-change.neutral { 
  color: var(--bs-secondary); 
  background: rgba(108, 117, 125, 0.1);
}

/* Filters Section */
.filters-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  box-shadow: var(--stat-card-shadow);
}

.filters-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
  max-width: 400px;
}

.search-box i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--bs-secondary);
  z-index: 2;
  font-size: 0.8rem;
}

.search-input {
  width: 100%;
  padding: 0.3rem 0.5rem 0.3rem 1.6rem;
  border: 1px solid var(--card-border);
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: nowrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select-compact {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 0.85rem;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.filter-select-compact:focus {
  outline: none;
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.btn-clear {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--card-border);
  background: transparent;
  color: var(--bs-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.btn-clear:hover {
  background: #f8f9fa;
  border-color: #dc3545;
  color: #dc3545;
  transform: scale(1.05);
}

[data-bs-theme="dark"] .btn-clear:hover {
  background: #495057;
  color: #f8f9fa;
}

.btn-secondary {
  background: var(--bs-tertiary-bg);
  color: var(--bs-secondary);
  border: 2px solid var(--card-border);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #e9ecef;
  color: #495057;
}

[data-bs-theme="dark"] .btn-secondary {
  background: #495057;
  color: #f8f9fa;
  border-color: #6c757d;
}

[data-bs-theme="dark"] .btn-secondary:hover {
  background: #6c757d;
  color: #ffffff;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
  background: var(--bs-tertiary-bg);
  padding: 0.25rem;
  border-radius: 8px;
}

.view-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--bs-secondary);
}

.view-btn.active {
  background: var(--card-bg);
  color: #667eea;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Content Card */
.content-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  box-shadow: var(--stat-card-shadow);
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--bs-secondary);
}

.empty-state i {
  font-size: 4rem;
  color: #cbd5e1;
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  font-size: 1rem;
  margin: 0 0 2rem 0;
}


.pagination-info {
  color: var(--bs-secondary);
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--bs-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.page-number.active {
  background: var(--bs-primary);
  color: white;
}

.page-number:hover:not(.active) {
  background: var(--bs-table-hover-bg);
  color: var(--bs-body-color);
}

.btn.btn-outline-elegant {
  background: transparent;
  border: 1px solid var(--card-border);
  color: var(--bs-secondary);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn.btn-outline-elegant:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: var(--bs-body-color);
}

.btn.btn-outline-elegant:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 768px) {
  .bookings-page {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .filter-controls {
    justify-content: stretch;
    gap: 0.75rem;
  }
  
  .filter-select {
    min-width: auto;
  }
  
  .btn-secondary {
    white-space: nowrap;
    flex-shrink: 0;
  }
}

.bookings-table {
  width: 100%;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.table-header {
  display: grid;
  grid-template-columns: 140px 180px 200px 160px 140px 120px 100px 120px;
  background: var(--gradient-primary);
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
}

.table-header.no-vehicle {
  grid-template-columns: 140px 200px 220px 160px 120px 100px 120px;
}

.header-cell {
  padding: 0.4rem;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.header-cell:last-child {
  border-right: none;
}

.table-row {
  display: grid;
  grid-template-columns: 140px 180px 200px 160px 140px 120px 100px 120px;
  border-bottom: 1px solid var(--card-border);
  transition: all 0.2s ease;
  background: var(--card-bg);
}

.table-row.no-vehicle {
  grid-template-columns: 140px 200px 220px 160px 120px 100px 120px;
}

.table-row:hover {
  background: var(--bs-table-hover-bg);
  transform: translateX(4px);
}

.table-row.urgent {
  border-left: 4px solid var(--danger);
  background: rgba(239, 68, 68, 0.05);
}

/* Status-based row colors */
.table-row.status-confirmed {
  border-left: 4px solid #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.table-row.status-confirmed:hover {
  background: rgba(34, 197, 94, 0.12);
}

.table-row.status-completed {
  border-left: 4px solid #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.table-row.status-completed:hover {
  background: rgba(59, 130, 246, 0.12);
}

.table-row.status-cancelled {
  border-left: 4px solid #ef4444;
  background: rgba(239, 68, 68, 0.08);
  opacity: 0.75;
}

.table-row.status-cancelled:hover {
  background: rgba(239, 68, 68, 0.12);
}

.table-row.status-in-progress {
  border-left: 4px solid #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.table-row.status-in-progress:hover {
  background: rgba(239, 68, 68, 0.12);
}

.table-cell {
  padding: 0.4rem;
  display: flex;
  align-items: center;
  border-right: 1px solid var(--card-border);
}

.table-cell:last-child {
  border-right: none;
}

.booking-time .date {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.booking-time .time {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-top: 2px;
}

.customer-info .name {
  font-weight: 600;
  color: var(--text-primary);
}

.customer-info .contact {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 2px;
}

.services-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.service-tag {
  background: var(--gradient-primary);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.vehicle-info .vehicle-name {
  font-weight: 600;
  color: var(--text-primary);
}

.vehicle-info .license-plate {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 2px;
  font-family: monospace;
}

.no-vehicle, .unassigned {
  color: var(--text-muted);
  font-style: italic;
}

.staff-info {
  font-weight: 500;
  color: var(--text-primary);
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.scheduled {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.status-badge.confirmed {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-badge.in_progress {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.status-badge.completed {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-badge.cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.price {
  font-weight: 700;
  color: var(--success);
  font-size: 1rem;
}

.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  min-width: 140px;
  flex-wrap: nowrap;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.btn-view {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.btn-view:hover {
  background: #6366f1;
  color: white;
  transform: scale(1.1);
}

.btn-edit {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.btn-edit:hover {
  background: #3b82f6;
  color: white;
  transform: scale(1.1);
}

.btn-status {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.btn-status:hover {
  background: #10b981;
  color: white;
  transform: scale(1.1);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-delete:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.1);
}

/* Calendar View */
.calendar-view {
  background: var(--card-bg);
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  background: var(--gradient-primary);
  color: white;
}

.calendar-header h3 {
  margin: 0;
  font-weight: 600;
}

.calendar-grid {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  min-height: 600px;
}

.time-column {
  background: var(--bg-secondary);
  border-right: 2px solid var(--border-color);
}

.time-header {
  height: 60px;
  border-bottom: 1px solid var(--border-color);
}

.time-slot {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.day-column {
  border-right: 1px solid var(--border-color);
}

.day-column:last-child {
  border-right: none;
}

.day-header {
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.day-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.8rem;
}

.day-date {
  color: var(--text-secondary);
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 2px;
}

.day-slots {
  height: 100%;
}

.hour-slot {
  height: 60px;
  border-bottom: 1px solid var(--border-color);
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
}

.hour-slot:hover {
  background: var(--hover-bg);
}

.booking-block {
  position: absolute;
  left: 2px;
  right: 2px;
  top: 2px;
  bottom: 2px;
  border-radius: 4px;
  padding: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1;
}

.booking-block:hover {
  transform: scale(1.02);
  z-index: 2;
}

.booking-block.scheduled {
  background: rgba(59, 130, 246, 0.8);
  color: white;
}

.booking-block.confirmed {
  background: rgba(16, 185, 129, 0.8);
  color: white;
}

.booking-block.in_progress {
  background: rgba(245, 158, 11, 0.8);
  color: white;
}

.booking-block.completed {
  background: rgba(34, 197, 94, 0.8);
  color: white;
}

.booking-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.booking-service {
  font-size: 0.6rem;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.booking-time {
  font-size: 0.6rem;
  opacity: 0.8;
}

@media (max-width: 1200px) {
  .table-header,
  .table-row {
    grid-template-columns: 120px 160px 180px 140px 120px 100px 80px 100px;
  }
  
  .table-header.no-vehicle,
  .table-row.no-vehicle {
    grid-template-columns: 120px 180px 200px 160px 100px 80px 100px;
  }
}

@media (max-width: 900px) {
  .calendar-grid {
    grid-template-columns: 60px repeat(7, 1fr);
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  
  .table-row {
    padding: var(--spacing-md);
    display: block;
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    box-shadow: var(--shadow-soft);
  }
  
  .table-cell {
    padding: var(--spacing-sm) 0;
    border: none;
    display: block;
  }
}

/* Loading Styles */
.loading-container {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--bs-secondary);
}

.loading-spinner {
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container p {
  font-size: 1.125rem;
  font-weight: 500;
  margin: 0;
}

/* Error Modal Styles */
.error-modal-overlay {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

.error-modal {
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: errorModalSlideIn 0.3s ease-out;
}

[data-bs-theme="dark"] .error-modal {
  background: #1f2937;
  border: 1px solid #374151;
}

@keyframes errorModalSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.error-modal .modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}

[data-bs-theme="dark"] .error-modal .modal-header {
  border-bottom-color: #374151;
}

.error-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.error-icon i {
  font-size: 24px;
  color: white;
}

.error-modal .modal-header h2 {
  margin: 0;
  flex: 1;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 700;
}

[data-bs-theme="dark"] .error-modal .modal-header h2 {
  color: #f9fafb;
}

.modal-close {
  position: absolute;
  top: 24px;
  right: 24px;
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #1f2937;
}

[data-bs-theme="dark"] .modal-close:hover {
  background: #374151;
  color: #f9fafb;
}

.error-modal .modal-body {
  padding: 20px 24px;
}

.error-message h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
}

[data-bs-theme="dark"] .error-message h3 {
  color: #f9fafb;
}

.error-message p {
  margin: 0 0 20px 0;
  color: #6b7280;
  line-height: 1.6;
}

[data-bs-theme="dark"] .error-message p {
  color: #9ca3af;
}

.error-details {
  margin: 20px 0;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

[data-bs-theme="dark"] .error-details {
  background: #374151;
  border-color: #4b5563;
}

.error-details summary {
  cursor: pointer;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
}

[data-bs-theme="dark"] .error-details summary {
  color: #9ca3af;
}

.error-details pre {
  margin: 8px 0 0 0;
  padding: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  color: #ef4444;
  overflow-x: auto;
  white-space: pre-wrap;
}

[data-bs-theme="dark"] .error-details pre {
  background: #1f2937;
  border-color: #374151;
  color: #fca5a5;
}

.error-suggestions h4 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
}

[data-bs-theme="dark"] .error-suggestions h4 {
  color: #f9fafb;
}

.error-suggestions ul {
  margin: 0;
  padding-left: 20px;
  color: #4b5563;
}

[data-bs-theme="dark"] .error-suggestions ul {
  color: #9ca3af;
}

.error-suggestions li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.error-suggestions code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #059669;
}

[data-bs-theme="dark"] .error-suggestions code {
  background: #374151;
  color: #10b981;
}

.error-modal .modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px 24px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

[data-bs-theme="dark"] .error-modal .modal-footer {
  border-top-color: #374151;
}

.error-modal .btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}

.error-modal .btn-primary {
  background: #3b82f6;
  color: white;
}

.error-modal .btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.error-modal .btn-secondary {
  background: #6b7280;
  color: white;
}

.error-modal .btn-secondary:hover {
  background: #4b5563;
}

.error-modal .btn-info {
  background: #0ea5e9;
  color: white;
}

.error-modal .btn-info:hover {
  background: #0284c7;
}

/* Responsive */
@media (max-width: 768px) {
  .error-modal {
    margin: 20px;
    max-height: calc(100vh - 40px);
  }
  
  .error-modal .modal-header {
    padding: 20px 20px 12px 20px;
  }
  
  .error-modal .modal-body {
    padding: 16px 20px;
  }
  
  .error-modal .modal-footer {
    padding: 12px 20px 20px 20px;
    flex-direction: column;
  }
}

/* Pagination Styles */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--card-bg);
  border-top: 1px solid var(--card-border);
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pagination-info {
  color: var(--bs-secondary);
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-pagination {
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--bs-body-color);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background: var(--bs-primary);
  color: white;
  border-color: var(--bs-primary);
}

.btn-pagination:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.btn-page {
  min-width: 2.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--bs-body-color);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-page:hover {
  background: var(--bs-primary);
  color: white;
  border-color: var(--bs-primary);
}

.btn-page.active {
  background: var(--bs-primary);
  color: white;
  border-color: var(--bs-primary);
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-size-selector label {
  color: var(--bs-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.page-size-selector select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--bs-body-color);
  cursor: pointer;
}

@media (max-width: 768px) {
  .pagination-container {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  
  .pagination-controls {
    justify-content: center;
  }
  
  .page-size-selector {
    justify-content: center;
  }
}

/* Cancel Confirmation Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-container {
  margin: 20px;
}

.cancel-confirmation-modal {
  max-width: 500px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

[data-bs-theme="dark"] .cancel-confirmation-modal {
  background: #343a40;
}

.cancel-confirmation-modal .modal-header {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 24px 28px;
  border-bottom: none;
  text-align: center;
}

.warning-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px auto;
  font-size: 24px;
}

.cancel-confirmation-modal h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.cancel-confirmation-modal .modal-body {
  padding: 28px;
  text-align: center;
}

.cancel-confirmation-modal .modal-body > p:first-child {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 20px;
}

[data-bs-theme="dark"] .cancel-confirmation-modal .modal-body > p:first-child {
  color: #9ca3af;
}

.booking-details {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  text-align: left;
}

[data-bs-theme="dark"] .booking-details {
  background: #374151;
  border-color: #4b5563;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-row .label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

[data-bs-theme="dark"] .detail-row .label {
  color: #d1d5db;
}

.detail-row .value {
  font-weight: 500;
  color: #1f2937;
  font-size: 14px;
}

[data-bs-theme="dark"] .detail-row .value {
  color: #f3f4f6;
}

.warning-text {
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  margin: 16px 0 0 0;
}

[data-bs-theme="dark"] .warning-text {
  color: #f87171;
}

.cancel-confirmation-modal .modal-footer {
  padding: 20px 28px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

[data-bs-theme="dark"] .cancel-confirmation-modal .modal-footer {
  background: #374151;
  border-top-color: #4b5563;
}

.btn-danger {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

.btn-danger:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);
}

[data-bs-theme="dark"] .btn-danger {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

[data-bs-theme="dark"] .btn-danger:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
}

/* Booking Details Modal */
.booking-details-modal .modal-content {
  max-width: 800px;
  margin: 0 auto;
}

.booking-details-modal .modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: none;
  padding: 1.5rem 2rem;
}

.booking-details-modal .modal-header h3 {
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.booking-details-modal .modal-body {
  padding: 2rem;
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #667eea;
  transition: all 0.3s ease;
}

.detail-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

[data-bs-theme="dark"] .detail-section {
  background: #343a40;
  border-left-color: #667eea;
}

.detail-section h6 {
  color: #495057;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-bs-theme="dark"] .detail-section h6 {
  color: #e9ecef;
}

.detail-section h6 i {
  color: #667eea;
  font-size: 1.1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  min-height: 3rem;
}

.detail-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.25px;
}

[data-bs-theme="dark"] .detail-label {
  color: #adb5bd;
}

.detail-value {
  font-weight: 600;
  color: #212529;
  font-size: 1rem;
  line-height: 1.4;
}

[data-bs-theme="dark"] .detail-value {
  color: #f8f9fa;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
}

.status-confirmed {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.status-scheduled {
  background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
  color: white;
}

.status-pending {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
}

.status-cancelled {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.status-in_progress {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
  color: white;
}

.status-completed {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.price-display {
  font-size: 1.5rem;
  font-weight: 700;
  color: #28a745;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.notes-display {
  background: #fff;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  font-style: italic;
  color: #495057;
  min-height: 3rem;
  display: flex;
  align-items: center;
}

[data-bs-theme="dark"] .notes-display {
  background: #495057;
  border-color: #6c757d;
  color: #e9ecef;
}

.no-notes {
  color: #adb5bd;
  font-style: italic;
}

[data-bs-theme="dark"] .no-notes {
  color: #6c757d;
}

.booking-details-modal .modal-footer {
  padding: 1.5rem 2rem;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

[data-bs-theme="dark"] .booking-details-modal .modal-footer {
  background: #343a40;
  border-top-color: #495057;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .booking-details-modal .modal-body {
    padding: 1rem;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-section {
    padding: 1rem;
  }
  
  .booking-details-modal .modal-footer {
    padding: 1rem;
    flex-direction: column;
  }
}
</style>