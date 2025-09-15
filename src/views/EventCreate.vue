<template>
  <div class="event-create-page">
    <!-- Progress Header -->
    <div class="progress-header">
      <div class="progress-content">
        <h1 class="page-title">
          <i class="fas fa-plus-circle"></i>
          Create New Event
        </h1>
        <div class="progress-indicator">
          <div class="progress-steps">
            <div
              v-for="(step, index) in steps"
              :key="index"
              class="progress-step"
              :class="{
                active: currentStep === index,
                completed: currentStep > index
              }"
              @click="goToStep(index)"
            >
              <div class="step-circle">
                <i v-if="currentStep > index" class="fas fa-check"></i>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <span class="step-label">{{ step.title }}</span>
            </div>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${(currentStep / (steps.length - 1)) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Content -->
    <div class="form-container">
      <!-- Step 1: Basic Information -->
      <div v-if="currentStep === 0" class="form-step">
        <div class="step-header">
          <h2>Event Information</h2>
          <p>Tell us about your event</p>
        </div>

        <div class="form-grid">
          <div class="form-group full-width">
            <label class="required">Event Title</label>
            <input
              v-model="event.title"
              type="text"
              placeholder="Enter an engaging title for your event"
              class="form-input"
              required
            />
            <div class="input-help">Make it catchy and descriptive!</div>
          </div>

          <div class="form-group full-width">
            <label>Short Description</label>
            <input
              v-model="event.short_description"
              type="text"
              placeholder="A brief one-liner about your event"
              class="form-input"
              maxlength="500"
            />
            <div class="char-counter">{{ (event.short_description || '').length }}/500</div>
          </div>

          <div class="form-group full-width">
            <label class="required">Full Description</label>
            <textarea
              v-model="event.description"
              placeholder="Provide a detailed description of your event..."
              class="form-textarea"
              rows="6"
              required
            ></textarea>
            <div class="input-help">Include what attendees can expect, key highlights, and any special features.</div>
          </div>

          <div class="form-group">
            <label class="required">Category</label>
            <select v-model="event.category" class="form-select" required>
              <option value="">Select a category</option>
              <option v-for="category in categories" :key="category.id" :value="category.name">
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="required">Event Type</label>
            <div class="radio-group">
              <label class="radio-option">
                <input
                  v-model="event.type"
                  type="radio"
                  value="in_person"
                  name="event_type"
                />
                <div class="radio-content">
                  <i class="fas fa-users"></i>
                  <div>
                    <strong>In Person</strong>
                    <span>Physical venue</span>
                  </div>
                </div>
              </label>
              <label class="radio-option">
                <input
                  v-model="event.type"
                  type="radio"
                  value="online"
                  name="event_type"
                />
                <div class="radio-content">
                  <i class="fas fa-laptop"></i>
                  <div>
                    <strong>Online</strong>
                    <span>Virtual event</span>
                  </div>
                </div>
              </label>
              <label class="radio-option">
                <input
                  v-model="event.type"
                  type="radio"
                  value="hybrid"
                  name="event_type"
                />
                <div class="radio-content">
                  <i class="fas fa-globe"></i>
                  <div>
                    <strong>Hybrid</strong>
                    <span>Both online & in-person</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div class="form-group full-width">
            <label>Tags</label>
            <div class="tags-input">
              <div class="tags-list">
                <span
                  v-for="(tag, index) in eventTags"
                  :key="index"
                  class="tag"
                >
                  {{ tag }}
                  <button @click="removeTag(index)" class="tag-remove">
                    <i class="fas fa-times"></i>
                  </button>
                </span>
              </div>
              <input
                v-model="newTag"
                @keydown.enter.prevent="addTag"
                @keydown.comma.prevent="addTag"
                type="text"
                placeholder="Add tags (press Enter or comma to add)"
                class="tag-input"
              />
            </div>
            <div class="input-help">Add relevant tags to help people discover your event</div>
          </div>
        </div>
      </div>

      <!-- Step 2: Date & Time -->
      <div v-if="currentStep === 1" class="form-step">
        <div class="step-header">
          <h2>Date & Time</h2>
          <p>When is your event happening?</p>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="required">Start Date</label>
            <input
              v-model="event.start_date"
              type="datetime-local"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label class="required">End Date</label>
            <input
              v-model="event.end_date"
              type="datetime-local"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label>Timezone</label>
            <select v-model="event.timezone" class="form-select">
              <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
              <option value="Australia/Melbourne">Australia/Melbourne (AEDT)</option>
              <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
              <option value="Australia/Perth">Australia/Perth (AWST)</option>
              <option value="Australia/Adelaide">Australia/Adelaide (ACDT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div class="form-group">
            <label>Duration (minutes)</label>
            <input
              v-model.number="event.duration"
              type="number"
              placeholder="120"
              class="form-input"
              min="15"
              step="15"
            />
            <div class="input-help">{{ formatDuration(event.duration) }}</div>
          </div>

          <!-- Quick Duration Buttons -->
          <div class="form-group full-width">
            <label>Quick Duration</label>
            <div class="duration-buttons">
              <button
                v-for="duration in quickDurations"
                :key="duration.value"
                type="button"
                class="duration-btn"
                :class="{ active: event.duration === duration.value }"
                @click="event.duration = duration.value"
              >
                {{ duration.label }}
              </button>
            </div>
          </div>

          <!-- Event Schedule Preview -->
          <div class="form-group full-width">
            <div class="schedule-preview">
              <h4>Event Schedule Preview</h4>
              <div v-if="event.start_date && event.end_date" class="schedule-info">
                <div class="schedule-item">
                  <i class="fas fa-play"></i>
                  <span>Starts: {{ formatDateTime(event.start_date) }}</span>
                </div>
                <div class="schedule-item">
                  <i class="fas fa-stop"></i>
                  <span>Ends: {{ formatDateTime(event.end_date) }}</span>
                </div>
                <div class="schedule-item">
                  <i class="fas fa-clock"></i>
                  <span>Duration: {{ getEventDuration() }}</span>
                </div>
              </div>
              <div v-else class="schedule-placeholder">
                Set start and end dates to see schedule preview
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Location -->
      <div v-if="currentStep === 2" class="form-step">
        <div class="step-header">
          <h2>Location Details</h2>
          <p>Where will your event take place?</p>
        </div>

        <!-- In-Person Location -->
        <div v-if="event.type === 'in_person' || event.type === 'hybrid'" class="location-section">
          <h3>
            <i class="fas fa-map-marker-alt"></i>
            Physical Venue
          </h3>

          <div class="form-grid">
            <div class="form-group full-width">
              <label class="required">Venue Name</label>
              <input
                v-model="event.venue_name"
                type="text"
                placeholder="Enter venue name"
                class="form-input"
                required
              />
            </div>

            <div class="form-group full-width">
              <label class="required">Street Address</label>
              <input
                v-model="event.venue_address_street"
                type="text"
                placeholder="123 Main Street"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label class="required">City</label>
              <input
                v-model="event.venue_address_city"
                type="text"
                placeholder="Sydney"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label class="required">State</label>
              <select v-model="event.venue_address_state" class="form-select" required>
                <option value="">Select state</option>
                <option value="NSW">NSW</option>
                <option value="VIC">VIC</option>
                <option value="QLD">QLD</option>
                <option value="WA">WA</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="ACT">ACT</option>
                <option value="NT">NT</option>
              </select>
            </div>

            <div class="form-group">
              <label class="required">Postcode</label>
              <input
                v-model="event.venue_address_postcode"
                type="text"
                placeholder="2000"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label>Country</label>
              <input
                v-model="event.venue_address_country"
                type="text"
                value="Australia"
                class="form-input"
                readonly
              />
            </div>
          </div>
        </div>

        <!-- Online Location -->
        <div v-if="event.type === 'online' || event.type === 'hybrid'" class="location-section">
          <h3>
            <i class="fas fa-laptop"></i>
            Online Platform
          </h3>

          <div class="form-grid">
            <div class="form-group">
              <label class="required">Platform</label>
              <select v-model="event.online_platform" class="form-select" required>
                <option value="">Select platform</option>
                <option value="Zoom">Zoom</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Google Meet">Google Meet</option>
                <option value="WebEx">WebEx</option>
                <option value="YouTube Live">YouTube Live</option>
                <option value="Facebook Live">Facebook Live</option>
                <option value="Custom Platform">Custom Platform</option>
              </select>
            </div>

            <div class="form-group">
              <label>Meeting URL</label>
              <input
                v-model="event.online_url"
                type="url"
                placeholder="https://zoom.us/j/123456789"
                class="form-input"
              />
              <div class="input-help">This will be shared with registered attendees</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Tickets & Pricing -->
      <div v-if="currentStep === 3" class="form-step">
        <div class="step-header">
          <h2>Tickets & Pricing</h2>
          <p>Set up your ticket types and pricing</p>
        </div>

        <div class="pricing-options">
          <div class="pricing-toggle">
            <label class="toggle-option">
              <input
                v-model="event.is_free"
                type="radio"
                :value="true"
                name="pricing_type"
                @change="handlePricingChange"
              />
              <div class="toggle-content">
                <i class="fas fa-gift"></i>
                <div>
                  <strong>Free Event</strong>
                  <span>No charge for attendees</span>
                </div>
              </div>
            </label>
            <label class="toggle-option">
              <input
                v-model="event.is_free"
                type="radio"
                :value="false"
                name="pricing_type"
                @change="handlePricingChange"
              />
              <div class="toggle-content">
                <i class="fas fa-ticket-alt"></i>
                <div>
                  <strong>Paid Event</strong>
                  <span>Charge for tickets</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Free Event -->
        <div v-if="event.is_free" class="free-event-section">
          <div class="form-grid">
            <div class="form-group">
              <label>Maximum Capacity</label>
              <input
                v-model.number="event.max_capacity"
                type="number"
                placeholder="100"
                class="form-input"
                min="1"
              />
              <div class="input-help">Leave empty for unlimited capacity</div>
            </div>

            <div class="form-group">
              <label>Approval Required</label>
              <div class="toggle-switch">
                <input
                  v-model="event.requires_approval"
                  type="checkbox"
                  id="approval_required"
                  class="toggle-input"
                />
                <label for="approval_required" class="toggle-label">
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-text">
                  {{ event.requires_approval ? 'Manual approval required' : 'Automatic registration' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Paid Event -->
        <div v-if="!event.is_free" class="paid-event-section">
          <div class="ticket-types-header">
            <h3>Ticket Types</h3>
            <button type="button" class="btn btn-outline-primary" @click="addTicketType">
              <i class="fas fa-plus"></i>
              Add Ticket Type
            </button>
          </div>

          <div class="ticket-types-list">
            <div
              v-for="(ticket, index) in event.ticket_types"
              :key="index"
              class="ticket-type-card"
            >
              <div class="ticket-header">
                <h4>Ticket Type {{ index + 1 }}</h4>
                <button
                  v-if="event.ticket_types.length > 1"
                  type="button"
                  class="btn-remove"
                  @click="removeTicketType(index)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="required">Ticket Name</label>
                  <input
                    v-model="ticket.name"
                    type="text"
                    placeholder="General Admission"
                    class="form-input"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="required">Price (AUD)</label>
                  <div class="price-input">
                    <span class="currency">$</span>
                    <input
                      v-model.number="ticket.price"
                      type="number"
                      placeholder="0.00"
                      class="form-input"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="required">Quantity Available</label>
                  <input
                    v-model.number="ticket.quantity"
                    type="number"
                    placeholder="100"
                    class="form-input"
                    min="1"
                    required
                  />
                </div>

                <div class="form-group">
                  <label>Max Per Order</label>
                  <input
                    v-model.number="ticket.max_per_order"
                    type="number"
                    placeholder="10"
                    class="form-input"
                    min="1"
                    :max="ticket.quantity"
                  />
                </div>

                <div class="form-group full-width">
                  <label>Description</label>
                  <textarea
                    v-model="ticket.description"
                    placeholder="Describe what's included with this ticket type..."
                    class="form-textarea"
                    rows="3"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label>Sale Start Date</label>
                  <input
                    v-model="ticket.sale_start_date"
                    type="datetime-local"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label>Sale End Date</label>
                  <input
                    v-model="ticket.sale_end_date"
                    type="datetime-local"
                    class="form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Capacity Settings -->
          <div class="capacity-section">
            <h3>Capacity Settings</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Total Event Capacity</label>
                <input
                  v-model.number="event.max_capacity"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  class="form-input"
                  min="1"
                />
                <div class="input-help">
                  Total tickets available: {{ getTotalTickets() }}
                </div>
              </div>

              <div class="form-group">
                <label>Allow Waitlist</label>
                <div class="toggle-switch">
                  <input
                    v-model="event.allow_waitlist"
                    type="checkbox"
                    id="allow_waitlist"
                    class="toggle-input"
                  />
                  <label for="allow_waitlist" class="toggle-label">
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="toggle-text">
                    {{ event.allow_waitlist ? 'Waitlist enabled' : 'No waitlist' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: Media & Publishing -->
      <div v-if="currentStep === 4" class="form-step">
        <div class="step-header">
          <h2>Media & Publishing</h2>
          <p>Add images and set publishing options</p>
        </div>

        <div class="media-section">
          <h3>Event Images</h3>

          <div class="cover-image-section">
            <label>Cover Image</label>
            <div class="image-upload-area">
              <div v-if="event.cover_image_url" class="image-preview">
                <img :src="event.cover_image_url" alt="Cover image" />
                <button type="button" class="btn-remove-image" @click="removeCoverImage">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              <div v-else class="upload-placeholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Upload a cover image</p>
                <span>Recommended: 1200x630px, JPG or PNG</span>
                <button type="button" class="btn btn-primary">Choose File</button>
              </div>
            </div>
          </div>

          <div class="video-section">
            <div class="form-group">
              <label>Video URL (Optional)</label>
              <input
                v-model="event.video_url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                class="form-input"
              />
              <div class="input-help">Add a promotional video for your event</div>
            </div>
          </div>
        </div>

        <div class="publishing-section">
          <h3>Publishing Options</h3>

          <div class="form-grid">
            <div class="form-group">
              <label>Event Status</label>
              <select v-model="event.status" class="form-select">
                <option value="draft">Draft - Not visible to public</option>
                <option value="published">Published - Live and visible</option>
              </select>
            </div>

            <div class="form-group">
              <label>Visibility</label>
              <div class="toggle-switch">
                <input
                  v-model="event.is_public"
                  type="checkbox"
                  id="is_public"
                  class="toggle-input"
                />
                <label for="is_public" class="toggle-label">
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-text">
                  {{ event.is_public ? 'Public - Anyone can find this event' : 'Private - Only people with link can view' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Event Summary -->
        <div class="event-summary">
          <h3>Event Summary</h3>
          <div class="summary-card">
            <div class="summary-header">
              <h4>{{ event.title || 'Your Event Title' }}</h4>
              <div class="summary-badges">
                <span class="badge" :class="`badge-${event.type}`">{{ formatEventType(event.type) }}</span>
                <span class="badge" :class="`badge-${event.status}`">{{ formatStatus(event.status) }}</span>
              </div>
            </div>

            <div class="summary-details">
              <div class="summary-item">
                <i class="fas fa-calendar"></i>
                <span>{{ formatEventDate() }}</span>
              </div>
              <div class="summary-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>{{ getEventLocation() }}</span>
              </div>
              <div class="summary-item">
                <i class="fas fa-ticket-alt"></i>
                <span>{{ getEventPrice() }}</span>
              </div>
              <div v-if="event.max_capacity" class="summary-item">
                <i class="fas fa-users"></i>
                <span>Max {{ event.max_capacity }} attendees</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="form-navigation">
        <button
          v-if="currentStep > 0"
          type="button"
          class="btn btn-outline-secondary"
          @click="previousStep"
        >
          <i class="fas fa-arrow-left"></i>
          Previous
        </button>

        <div class="nav-spacer"></div>

        <button
          v-if="currentStep < steps.length - 1"
          type="button"
          class="btn btn-primary"
          @click="nextStep"
          :disabled="!isCurrentStepValid()"
        >
          Next
          <i class="fas fa-arrow-right"></i>
        </button>

        <button
          v-if="currentStep === steps.length - 1"
          type="button"
          class="btn btn-success"
          @click="createEvent"
          :disabled="creating || !isCurrentStepValid()"
        >
          <i v-if="creating" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-check"></i>
          {{ creating ? 'Creating...' : 'Create Event' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'EventCreate',
  setup() {
    const router = useRouter()

    // State
    const currentStep = ref(0)
    const creating = ref(false)
    const newTag = ref('')

    const steps = [
      { title: 'Basic Info', description: 'Event details' },
      { title: 'Date & Time', description: 'When it happens' },
      { title: 'Location', description: 'Where it happens' },
      { title: 'Tickets', description: 'Pricing & capacity' },
      { title: 'Publish', description: 'Media & settings' }
    ]

    const categories = ref([
      { id: 'cat_001', name: 'Technology', icon: 'fas fa-laptop', color: '#3b82f6' },
      { id: 'cat_002', name: 'Business', icon: 'fas fa-briefcase', color: '#059669' },
      { id: 'cat_003', name: 'Entertainment', icon: 'fas fa-music', color: '#dc2626' },
      { id: 'cat_004', name: 'Education', icon: 'fas fa-graduation-cap', color: '#7c3aed' },
      { id: 'cat_005', name: 'Health', icon: 'fas fa-heartbeat', color: '#ea580c' },
      { id: 'cat_006', name: 'Sports', icon: 'fas fa-futbol', color: '#16a34a' }
    ])

    const quickDurations = [
      { label: '30 min', value: 30 },
      { label: '1 hour', value: 60 },
      { label: '2 hours', value: 120 },
      { label: '4 hours', value: 240 },
      { label: '1 day', value: 480 },
      { label: '2 days', value: 960 }
    ]

    // Event data
    const event = ref({
      title: '',
      description: '',
      short_description: '',
      category: '',
      type: 'in_person',
      status: 'draft',
      start_date: '',
      end_date: '',
      timezone: 'Australia/Sydney',
      duration: 120,
      venue_name: '',
      venue_address_street: '',
      venue_address_city: '',
      venue_address_state: '',
      venue_address_postcode: '',
      venue_address_country: 'Australia',
      online_platform: '',
      online_url: '',
      is_free: true,
      base_price: 0,
      max_capacity: null,
      cover_image_url: '',
      video_url: '',
      is_public: true,
      requires_approval: false,
      allow_waitlist: false,
      tags: '',
      ticket_types: []
    })

    const eventTags = ref([])

    // Computed properties
    const isCurrentStepValid = () => {
      switch (currentStep.value) {
        case 0: // Basic Info
          return event.value.title && event.value.description && event.value.category && event.value.type
        case 1: // Date & Time
          return event.value.start_date && event.value.end_date
        case 2: // Location
          if (event.value.type === 'online') {
            return event.value.online_platform
          } else if (event.value.type === 'in_person') {
            return event.value.venue_name && event.value.venue_address_city && event.value.venue_address_state
          } else if (event.value.type === 'hybrid') {
            return event.value.venue_name && event.value.venue_address_city && event.value.venue_address_state && event.value.online_platform
          }
          return true
        case 3: // Tickets
          if (event.value.is_free) {
            return true
          } else {
            return event.value.ticket_types.length > 0 && event.value.ticket_types.every(ticket =>
              ticket.name && ticket.price >= 0 && ticket.quantity > 0
            )
          }
        case 4: // Publish
          return true
        default:
          return true
      }
    }

    // Methods
    const formatDuration = (minutes) => {
      if (!minutes) return ''
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours === 0) return `${mins} minutes`
      if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`
    }

    const formatDateTime = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const getEventDuration = () => {
      if (!event.value.start_date || !event.value.end_date) return ''
      const start = new Date(event.value.start_date)
      const end = new Date(event.value.end_date)
      const diffMs = end - start
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return formatDuration(diffMins)
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

    const formatEventDate = () => {
      if (!event.value.start_date) return 'Date TBA'
      return formatDateTime(event.value.start_date)
    }

    const getEventLocation = () => {
      if (event.value.type === 'online') {
        return event.value.online_platform || 'Online'
      } else if (event.value.type === 'hybrid') {
        return `${event.value.venue_name || 'TBA'} + Online`
      } else {
        return `${event.value.venue_name || 'TBA'}, ${event.value.venue_address_city || ''}`
      }
    }

    const getEventPrice = () => {
      if (event.value.is_free) {
        return 'Free'
      }

      if (event.value.ticket_types && event.value.ticket_types.length > 1) {
        const prices = event.value.ticket_types.map(t => t.price).sort((a, b) => a - b)
        return `$${prices[0]} - $${prices[prices.length - 1]}`
      }

      return `$${event.value.base_price || 0}`
    }

    const getTotalTickets = () => {
      return event.value.ticket_types.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0)
    }

    // Tag management
    const addTag = () => {
      const tag = newTag.value.trim()
      if (tag && !eventTags.value.includes(tag)) {
        eventTags.value.push(tag)
        newTag.value = ''
        updateTagsString()
      }
    }

    const removeTag = (index) => {
      eventTags.value.splice(index, 1)
      updateTagsString()
    }

    const updateTagsString = () => {
      event.value.tags = eventTags.value.join(', ')
    }

    // Pricing
    const handlePricingChange = () => {
      if (event.value.is_free) {
        event.value.ticket_types = []
        event.value.base_price = 0
      } else {
        if (event.value.ticket_types.length === 0) {
          addTicketType()
        }
      }
    }

    const addTicketType = () => {
      event.value.ticket_types.push({
        name: '',
        description: '',
        price: 0,
        quantity: 100,
        max_per_order: 10,
        sale_start_date: '',
        sale_end_date: ''
      })
    }

    const removeTicketType = (index) => {
      event.value.ticket_types.splice(index, 1)
    }

    // Media
    const removeCoverImage = () => {
      event.value.cover_image_url = ''
    }

    // Navigation
    const goToStep = (step) => {
      if (step >= 0 && step < steps.length) {
        currentStep.value = step
      }
    }

    const nextStep = () => {
      if (isCurrentStepValid() && currentStep.value < steps.length - 1) {
        currentStep.value++
      }
    }

    const previousStep = () => {
      if (currentStep.value > 0) {
        currentStep.value--
      }
    }

    // Create event
    const createEvent = async () => {
      if (!isCurrentStepValid()) return

      creating.value = true
      try {
        // TODO: API call to create event
        console.log('Creating event:', event.value)

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Redirect to events list or event detail
        router.push('/events')
      } catch (error) {
        console.error('Error creating event:', error)
      } finally {
        creating.value = false
      }
    }

    // Watch for auto-calculate end date
    watch(() => [event.value.start_date, event.value.duration], ([startDate, duration]) => {
      if (startDate && duration && !event.value.end_date) {
        const start = new Date(startDate)
        const end = new Date(start.getTime() + duration * 60000)
        event.value.end_date = end.toISOString().slice(0, 16)
      }
    })

    return {
      // State
      currentStep,
      creating,
      newTag,
      steps,
      categories,
      quickDurations,
      event,
      eventTags,

      // Methods
      formatDuration,
      formatDateTime,
      getEventDuration,
      formatEventType,
      formatStatus,
      formatEventDate,
      getEventLocation,
      getEventPrice,
      getTotalTickets,
      addTag,
      removeTag,
      updateTagsString,
      handlePricingChange,
      addTicketType,
      removeTicketType,
      removeCoverImage,
      goToStep,
      nextStep,
      previousStep,
      createEvent,
      isCurrentStepValid
    }
  }
}
</script>

<style scoped>
.event-create-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem;
}

.progress-header {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.progress-content {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 2rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.page-title i {
  color: #3b82f6;
}

.progress-indicator {
  position: relative;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  position: relative;
  z-index: 2;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.step-circle {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-bottom: 0.5rem;
}

.progress-step.active .step-circle {
  background: #3b82f6;
  color: white;
}

.progress-step.completed .step-circle {
  background: #10b981;
  color: white;
}

.step-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
}

.progress-step.active .step-label {
  color: #3b82f6;
}

.progress-step.completed .step-label {
  color: #10b981;
}

.progress-bar {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  right: 1.5rem;
  height: 2px;
  background: #e5e7eb;
  z-index: 1;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.5s ease;
}

.form-container {
  max-width: 800px;
  margin: 0 auto;
}

.form-step {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.step-header {
  text-align: center;
  margin-bottom: 2rem;
}

.step-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.step-header p {
  color: #64748b;
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-input,
.form-select,
.form-textarea {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.input-help {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.char-counter {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  text-align: right;
}

.radio-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.radio-option {
  cursor: pointer;
}

.radio-option input[type="radio"] {
  display: none;
}

.radio-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.radio-option input[type="radio"]:checked + .radio-content {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.radio-content i {
  font-size: 1.25rem;
  color: #6b7280;
}

.radio-option input[type="radio"]:checked + .radio-content i {
  color: #3b82f6;
}

.radio-content strong {
  display: block;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.radio-content span {
  font-size: 0.875rem;
  color: #6b7280;
}

.tags-input {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem;
  min-height: 2.5rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-input {
  flex: 1;
  border: none;
  outline: none;
  min-width: 120px;
}

.duration-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.duration-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.duration-btn:hover {
  border-color: #3b82f6;
}

.duration-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.schedule-preview {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1.5rem;
}

.schedule-preview h4 {
  margin: 0 0 1rem 0;
  color: #1e293b;
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.schedule-item i {
  width: 1rem;
  color: #3b82f6;
}

.schedule-placeholder {
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

.location-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 12px;
}

.location-section h3 {
  margin: 0 0 1.5rem 0;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pricing-options {
  margin-bottom: 2rem;
}

.pricing-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.toggle-option {
  cursor: pointer;
}

.toggle-option input[type="radio"] {
  display: none;
}

.toggle-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.toggle-option input[type="radio"]:checked + .toggle-content {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.toggle-content i {
  font-size: 1.5rem;
  color: #6b7280;
}

.toggle-option input[type="radio"]:checked + .toggle-content i {
  color: #3b82f6;
}

.toggle-content strong {
  display: block;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.toggle-content span {
  font-size: 0.875rem;
  color: #6b7280;
}

.ticket-types-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.ticket-types-header h3 {
  margin: 0;
  color: #1e293b;
}

.ticket-type-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.ticket-header h4 {
  margin: 0;
  color: #1e293b;
}

.btn-remove {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.price-input {
  position: relative;
}

.currency {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-weight: 600;
}

.price-input .form-input {
  padding-left: 2rem;
}

.capacity-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.capacity-section h3 {
  margin: 0 0 1.5rem 0;
  color: #1e293b;
}

.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-input {
  display: none;
}

.toggle-label {
  position: relative;
  width: 3rem;
  height: 1.5rem;
  background: #e5e7eb;
  border-radius: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.25rem;
  height: 1.25rem;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.toggle-input:checked + .toggle-label {
  background: #3b82f6;
}

.toggle-input:checked + .toggle-label .toggle-slider {
  transform: translateX(1.5rem);
}

.toggle-text {
  font-size: 0.875rem;
  color: #6b7280;
}

.media-section {
  margin-bottom: 2rem;
}

.media-section h3 {
  margin: 0 0 1.5rem 0;
  color: #1e293b;
}

.cover-image-section {
  margin-bottom: 1.5rem;
}

.cover-image-section label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.image-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.image-upload-area:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.image-preview {
  position: relative;
  max-width: 400px;
}

.image-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}

.btn-remove-image {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-placeholder {
  text-align: center;
  padding: 3rem;
}

.upload-placeholder i {
  font-size: 3rem;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.upload-placeholder p {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.upload-placeholder span {
  font-size: 0.875rem;
  color: #6b7280;
  display: block;
  margin-bottom: 1.5rem;
}

.publishing-section {
  margin-bottom: 2rem;
}

.publishing-section h3 {
  margin: 0 0 1.5rem 0;
  color: #1e293b;
}

.event-summary {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
}

.event-summary h3 {
  margin: 0 0 1rem 0;
  color: #1e293b;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}

.summary-header h4 {
  margin: 0;
  color: #1e293b;
  flex: 1;
}

.summary-badges {
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

.summary-details {
  display: grid;
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
}

.summary-item i {
  width: 1rem;
  color: #9ca3af;
}

.form-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.nav-spacer {
  flex: 1;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-outline-primary {
  background: transparent;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.btn-outline-primary:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
}

.btn-outline-secondary {
  background: transparent;
  color: #6b7280;
  border: 2px solid #d1d5db;
}

.btn-outline-secondary:hover:not(:disabled) {
  background: #f3f4f6;
}

/* Responsive Design */
@media (max-width: 768px) {
  .event-create-page {
    padding: 1rem;
  }

  .progress-steps {
    flex-direction: column;
    gap: 1rem;
  }

  .progress-bar {
    display: none;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .radio-group {
    grid-template-columns: 1fr;
  }

  .pricing-toggle {
    grid-template-columns: 1fr;
  }

  .summary-header {
    flex-direction: column;
    align-items: stretch;
  }

  .form-navigation {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-spacer {
    display: none;
  }
}

/* Animation for step transitions */
.form-step {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>