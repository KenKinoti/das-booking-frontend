<template>
  <div class="event-detail-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading event details...</span>
      </div>
      <p class="loading-text">Loading event details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      <i class="fas fa-exclamation-triangle me-2"></i>
      {{ error }}
      <button @click="fetchEvent" class="btn btn-outline-danger btn-sm ms-3">
        <i class="fas fa-redo me-1"></i>Try Again
      </button>
    </div>

    <!-- Event Detail Content -->
    <div v-else-if="event" class="event-content">
      <!-- Back Navigation -->
      <div class="navigation-header">
        <button @click="$router.back()" class="btn btn-outline-secondary btn-sm">
          <i class="fas fa-arrow-left me-2"></i>Back to Events
        </button>
        <div class="event-actions" v-if="canManageEvent">
          <button @click="editEvent" class="btn btn-primary btn-sm">
            <i class="fas fa-edit me-2"></i>Edit Event
          </button>
          <div class="dropdown">
            <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" @click="duplicateEvent"><i class="fas fa-copy me-2"></i>Duplicate</a></li>
              <li><a class="dropdown-item" @click="exportRegistrations"><i class="fas fa-download me-2"></i>Export Registrations</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" @click="deleteEvent"><i class="fas fa-trash me-2"></i>Delete Event</a></li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Event Header -->
      <div class="event-header">
        <div class="row">
          <div class="col-lg-8">
            <div class="event-info">
              <!-- Status Badge -->
              <div class="event-status mb-3">
                <span :class="`badge badge-${event.status}`">
                  {{ eventUtils.formatEventStatus(event.status) }}
                </span>
                <span :class="`badge badge-${event.type} ms-2`">
                  {{ eventUtils.formatEventType(event.type) }}
                </span>
                <span v-if="event.is_free" class="badge bg-success ms-2">Free</span>
              </div>

              <!-- Event Title and Category -->
              <h1 class="event-title">{{ event.title }}</h1>
              <p class="event-category text-muted mb-4">
                <i class="fas fa-tag me-2"></i>{{ event.category }}
              </p>

              <!-- Event Description -->
              <div class="event-description">
                <p>{{ event.description }}</p>
              </div>

              <!-- Event Details Grid -->
              <div class="event-details-grid">
                <div class="detail-item">
                  <div class="detail-label">
                    <i class="fas fa-calendar me-2"></i>Date & Time
                  </div>
                  <div class="detail-value">
                    <div>{{ eventUtils.formatEventDate(event.start_date, event.end_date) }}</div>
                    <div class="text-muted">{{ eventUtils.formatEventTime(event.start_date, event.end_date) }}</div>
                    <div class="text-muted small">{{ eventUtils.calculateEventDuration(event.start_date, event.end_date) }}</div>
                  </div>
                </div>

                <div class="detail-item">
                  <div class="detail-label">
                    <i class="fas fa-map-marker-alt me-2"></i>Location
                  </div>
                  <div class="detail-value">
                    {{ eventUtils.getEventLocation(event) }}
                  </div>
                </div>

                <div class="detail-item" v-if="event.organizer_name">
                  <div class="detail-label">
                    <i class="fas fa-user me-2"></i>Organizer
                  </div>
                  <div class="detail-value">
                    {{ event.organizer_name }}
                  </div>
                </div>

                <div class="detail-item">
                  <div class="detail-label">
                    <i class="fas fa-ticket-alt me-2"></i>Pricing
                  </div>
                  <div class="detail-value">
                    {{ eventUtils.getEventPrice(event) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Event Stats Sidebar -->
          <div class="col-lg-4">
            <div class="event-stats-card">
              <h5 class="card-title">Event Statistics</h5>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-number text-primary">{{ event.total_registrations || 0 }}</div>
                  <div class="stat-label">Registered</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number text-success">{{ event.total_checked_in || 0 }}</div>
                  <div class="stat-label">Checked In</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number text-info">{{ event.total_capacity || '∞' }}</div>
                  <div class="stat-label">Capacity</div>
                </div>
                <div class="stat-item" v-if="!event.is_free">
                  <div class="stat-number text-warning">${{ eventUtils.calculateEventRevenue(event).toFixed(2) }}</div>
                  <div class="stat-label">Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Event Images Gallery -->
      <div v-if="event.images && event.images.length" class="event-images-section">
        <h5>Event Images</h5>
        <div class="images-gallery">
          <div v-for="image in event.images" :key="image.id" class="image-item">
            <img :src="image.url" :alt="image.alt_text || event.title" class="gallery-image" @click="openImageModal(image)">
          </div>
        </div>
      </div>

      <!-- Ticket Types Section -->
      <div v-if="ticketTypes.length" class="ticket-types-section">
        <h5>Ticket Types</h5>
        <div class="ticket-types-grid">
          <div v-for="ticket in ticketTypes" :key="ticket.id" class="ticket-type-card">
            <div class="ticket-header">
              <h6 class="ticket-name">{{ ticket.name }}</h6>
              <div class="ticket-price">
                <span v-if="ticket.price === 0" class="badge bg-success">Free</span>
                <span v-else class="price-amount">${{ ticket.price }}</span>
              </div>
            </div>
            <p class="ticket-description">{{ ticket.description }}</p>
            <div class="ticket-availability">
              <div class="availability-info">
                <span class="available">{{ eventUtils.getTicketAvailability(ticket) }}</span>
                <span class="total">/ {{ ticket.quantity || '∞' }}</span>
                available
              </div>
              <div v-if="!eventUtils.isTicketSaleActive(ticket)" class="text-muted small">
                Sale period ended
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Event Sessions -->
      <div v-if="event.sessions && event.sessions.length" class="sessions-section">
        <h5>Event Sessions</h5>
        <div class="sessions-list">
          <div v-for="session in event.sessions" :key="session.id" class="session-card">
            <div class="session-time">
              <div class="time-range">
                {{ new Date(session.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) }} -
                {{ new Date(session.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>
            <div class="session-info">
              <h6 class="session-title">{{ session.title }}</h6>
              <p class="session-description">{{ session.description }}</p>
              <div v-if="session.speaker_name" class="session-speaker">
                <i class="fas fa-user-tie me-2"></i>{{ session.speaker_name }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Panel -->
      <div v-if="canManageEvent" class="quick-actions-panel">
        <h5>Quick Actions</h5>
        <div class="actions-grid">
          <button @click="viewRegistrations" class="action-btn">
            <i class="fas fa-users"></i>
            <span>View Registrations</span>
            <small>{{ event.total_registrations || 0 }} registered</small>
          </button>
          <button @click="viewAnalytics" class="action-btn">
            <i class="fas fa-chart-bar"></i>
            <span>Analytics</span>
            <small>View detailed reports</small>
          </button>
          <button @click="checkInMode" class="action-btn">
            <i class="fas fa-qrcode"></i>
            <span>Check-in Mode</span>
            <small>Scan QR codes</small>
          </button>
        </div>
      </div>

      <!-- Reviews Section -->
      <div v-if="event.reviews && event.reviews.length" class="reviews-section">
        <h5>Event Reviews</h5>
        <div class="reviews-list">
          <div v-for="review in event.reviews" :key="review.id" class="review-card">
            <div class="review-header">
              <div class="reviewer-info">
                <strong>{{ review.reviewer_name }}</strong>
                <div class="review-rating">
                  <i v-for="star in 5" :key="star" :class="star <= review.rating ? 'fas fa-star text-warning' : 'far fa-star text-muted'"></i>
                </div>
              </div>
              <div class="review-date text-muted">
                {{ new Date(review.created_at).toLocaleDateString('en-AU') }}
              </div>
            </div>
            <p class="review-comment">{{ review.comment }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Image Modal -->
    <div class="modal fade" id="imageModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body p-0">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-3" data-bs-dismiss="modal" style="z-index: 1000;"></button>
            <img v-if="selectedImage" :src="selectedImage.url" :alt="selectedImage.alt_text" class="img-fluid w-100">
          </div>
        </div>
      </div>
    </div>

    <!-- Check-in Modal -->
    <div class="modal fade" id="checkinModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Event Check-in</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="qr-scanner-container">
              <p class="text-center">Scan attendee QR code to check them in</p>
              <div class="scanner-placeholder">
                <i class="fas fa-qrcode fa-3x text-muted"></i>
                <p>QR Code Scanner</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { eventsService, eventUtils } from '../services/events'

export default {
  name: 'EventDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()

    // State
    const loading = ref(true)
    const error = ref('')
    const event = ref(null)
    const ticketTypes = ref([])
    const selectedImage = ref(null)

    // Computed
    const canManageEvent = computed(() => {
      return authStore.isSuperAdmin ||
             (event.value && event.value.organization_id === authStore.user?.organization_id)
    })

    // Methods
    const fetchEvent = async () => {
      try {
        loading.value = true
        error.value = ''

        const eventId = route.params.id
        const [eventResponse, ticketsResponse] = await Promise.all([
          eventsService.getEventById(eventId),
          eventsService.getTicketTypes(eventId)
        ])

        event.value = eventResponse.data
        ticketTypes.value = ticketsResponse.data || []

      } catch (err) {
        console.error('Error fetching event:', err)
        error.value = err.response?.data?.message || 'Failed to load event details'
      } finally {
        loading.value = false
      }
    }

    const editEvent = () => {
      router.push(`/events/${event.value.id}/edit`)
    }

    const duplicateEvent = async () => {
      try {
        const response = await eventsService.duplicateEvent(event.value.id)
        router.push(`/events/${response.data.id}/edit`)
      } catch (err) {
        console.error('Error duplicating event:', err)
        // Show error notification
      }
    }

    const deleteEvent = async () => {
      if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return
      }

      try {
        await eventsService.deleteEvent(event.value.id)
        router.push('/events')
      } catch (err) {
        console.error('Error deleting event:', err)
        // Show error notification
      }
    }

    const exportRegistrations = async () => {
      try {
        await eventsService.exportRegistrations(event.value.id, 'csv')
      } catch (err) {
        console.error('Error exporting registrations:', err)
        // Show error notification
      }
    }

    const viewRegistrations = () => {
      router.push(`/events/${event.value.id}/registrations`)
    }

    const viewAnalytics = () => {
      router.push(`/events/${event.value.id}/analytics`)
    }

    const checkInMode = () => {
      // Show check-in modal
      const modal = new bootstrap.Modal(document.getElementById('checkinModal'))
      modal.show()
    }

    const openImageModal = (image) => {
      selectedImage.value = image
      const modal = new bootstrap.Modal(document.getElementById('imageModal'))
      modal.show()
    }

    // Lifecycle
    onMounted(() => {
      fetchEvent()
    })

    watch(() => route.params.id, () => {
      if (route.params.id) {
        fetchEvent()
      }
    })

    return {
      loading,
      error,
      event,
      ticketTypes,
      selectedImage,
      canManageEvent,
      eventUtils,
      fetchEvent,
      editEvent,
      duplicateEvent,
      deleteEvent,
      exportRegistrations,
      viewRegistrations,
      viewAnalytics,
      checkInMode,
      openImageModal
    }
  }
}
</script>

<style scoped>
.event-detail-page {
  padding: 2rem 0;
}

.loading-container {
  text-align: center;
  padding: 4rem 0;
}

.loading-text {
  margin-top: 1rem;
  color: var(--bs-secondary);
}

.navigation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--bs-border-color);
}

.event-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.event-header {
  margin-bottom: 3rem;
}

.event-status {
  margin-bottom: 1rem;
}

.event-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--bs-primary);
}

.event-category {
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.event-description {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.event-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.detail-item {
  display: flex;
  gap: 1rem;
}

.detail-label {
  font-weight: 600;
  color: var(--bs-secondary);
  min-width: 120px;
  display: flex;
  align-items: center;
}

.detail-value {
  flex: 1;
}

.event-stats-card {
  background: white;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 2rem;
  height: fit-content;
  position: sticky;
  top: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin-top: 0.25rem;
}

.event-images-section,
.ticket-types-section,
.sessions-section,
.reviews-section,
.quick-actions-panel {
  margin-bottom: 3rem;
  padding: 2rem 0;
  border-top: 1px solid var(--bs-border-color);
}

.event-images-section h5,
.ticket-types-section h5,
.sessions-section h5,
.reviews-section h5,
.quick-actions-panel h5 {
  margin-bottom: 1.5rem;
  color: var(--bs-primary);
}

.images-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.gallery-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: var(--bs-border-radius);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.gallery-image:hover {
  transform: scale(1.05);
}

.ticket-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.ticket-type-card {
  background: white;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 1.5rem;
}

.ticket-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
}

.ticket-name {
  margin: 0;
  color: var(--bs-primary);
}

.price-amount {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--bs-success);
}

.ticket-description {
  color: var(--bs-secondary);
  margin-bottom: 1rem;
}

.availability-info .available {
  font-weight: 600;
  color: var(--bs-primary);
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-card {
  background: white;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 1.5rem;
  display: flex;
  gap: 2rem;
}

.session-time {
  min-width: 150px;
}

.time-range {
  font-weight: 600;
  color: var(--bs-primary);
}

.session-title {
  margin-bottom: 0.5rem;
  color: var(--bs-dark);
}

.session-description {
  color: var(--bs-secondary);
  margin-bottom: 1rem;
}

.session-speaker {
  color: var(--bs-info);
  font-weight: 500;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.action-btn {
  background: white;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--bs-dark);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bs-light);
  border-color: var(--bs-primary);
  transform: translateY(-2px);
}

.action-btn i {
  font-size: 1.5rem;
  color: var(--bs-primary);
}

.action-btn span {
  font-weight: 600;
}

.action-btn small {
  color: var(--bs-secondary);
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-card {
  background: white;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 1.5rem;
}

.review-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
}

.review-rating {
  margin-top: 0.25rem;
}

.review-comment {
  color: var(--bs-secondary);
  line-height: 1.6;
  margin: 0;
}

.qr-scanner-container {
  text-align: center;
  padding: 2rem;
}

.scanner-placeholder {
  background: var(--bs-light);
  border: 2px dashed var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 3rem;
  margin-top: 1rem;
}

.scanner-placeholder i {
  margin-bottom: 1rem;
}

/* Badge Styles */
.badge-draft { background-color: #6c757d; }
.badge-published { background-color: #28a745; }
.badge-cancelled { background-color: #dc3545; }
.badge-postponed { background-color: #ffc107; color: #000; }
.badge-completed { background-color: #17a2b8; }

.badge-in_person { background-color: #007bff; }
.badge-online { background-color: #6f42c1; }
.badge-hybrid { background-color: #fd7e14; }

/* Responsive Design */
@media (max-width: 768px) {
  .navigation-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .event-actions {
    justify-content: center;
  }

  .event-title {
    font-size: 2rem;
  }

  .event-details-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .detail-item {
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-label {
    min-width: auto;
  }

  .session-card {
    flex-direction: column;
    gap: 1rem;
  }

  .session-time {
    min-width: auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }
}
</style>