<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <!-- Modal Header -->
      <div class="modal-header">
        <h2>{{ isEditing ? 'Edit Booking' : 'New Booking' }}</h2>
        <button @click="closeModal" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="modal-content">
        <!-- Left Sidebar - Step Navigation -->
        <div class="sidebar-nav">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            :class="['nav-step', { 
              active: currentStep === index + 1, 
              completed: currentStep > index + 1,
              disabled: currentStep < index + 1
            }]"
            @click="goToStep(index + 1)"
          >
            <div class="step-icon">
              <i v-if="currentStep > index + 1" class="fas fa-check"></i>
              <i v-else :class="step.icon"></i>
            </div>
            <span class="step-title">{{ step.title }}</span>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content">
          <!-- Step 1: Organization Selection -->
          <div v-if="currentStep === 1" class="step-content" key="step-1">
            <div class="content-header">
              <h3>Select Organization</h3>
              <p>Choose which organization this booking belongs to</p>
            </div>

            <div class="organization-grid">
              <div 
                v-for="org in availableOrganizations" 
                :key="org.id"
                :class="['organization-card', { selected: selectedOrganization?.id === org.id }]"
                @click="selectOrganization(org)"
              >
                <div class="org-icon">
                  <i class="fas fa-building"></i>
                </div>
                <div class="org-info">
                  <h4>{{ org.name }}</h4>
                  <p>{{ org.email }}</p>
                  <div v-if="org.status === 'pending'" class="org-status pending">
                    <i class="fas fa-clock"></i>
                    Pending Approval
                  </div>
                  <div v-else class="org-status active">
                    <i class="fas fa-check-circle"></i>
                    Active
                  </div>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <button @click="closeModal" class="btn-secondary">
                <i class="fas fa-times"></i>
              </button>
              <button @click="nextStep" :disabled="!selectedOrganization" class="btn-primary">
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>

          <!-- Step 2: Service Selection -->
          <div v-if="currentStep === 2" class="step-content"
               key="step-2">
            <div class="content-header">
              <h3>Select Service</h3>
              <p>Choose from our available services</p>
            </div>

            <!-- Category Filter -->
            <div class="category-filter">
              <h4>Select Category</h4>
              <div class="filter-buttons">
                <button 
                  v-for="category in categories" 
                  :key="category.key"
                  :class="['filter-btn', { active: selectedCategory === category.key }]"
                  @click="selectedCategory = category.key"
                >
                  {{ category.label }}
                  <i v-if="selectedCategory === category.key" class="fas fa-check"></i>
                </button>
              </div>
            </div>

            <!-- Service Selection -->
            <div class="service-selection">
              <h4>Select Service</h4>
              <div class="services-grid">
                <div 
                  v-for="service in filteredServices" 
                  :key="service.id"
                  :class="['service-card', { selected: selectedService?.id === service.id }]"
                  @click="selectService(service)"
                >
                  <div class="service-icon">
                    <i :class="service.icon"></i>
                  </div>
                  <div class="service-info">
                    <h5>{{ service.name }}</h5>
                    <div class="service-details">
                      <span class="duration">
                        <i class="fas fa-clock"></i>
                        Duration: {{ service.duration }}m
                      </span>
                      <span class="price">
                        Price: ${{ service.price.toFixed(2) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Staff Selection -->
          <div v-if="currentStep === 3" class="step-content"
               key="step-3">
            <div class="content-header">
              <h3>Select Staff</h3>
              <p>Choose your preferred staff member</p>
            </div>

            <div class="staff-grid">
              <div 
                v-for="member in availableStaff" 
                :key="member.id"
                :class="['staff-card', { selected: selectedStaff?.id === member.id }]"
                @click="selectStaff(member)"
              >
                <div class="staff-avatar">
                  <img v-if="member.avatar" :src="member.avatar" :alt="member.name" />
                  <div v-else class="avatar-placeholder">
                    {{ member.first_name?.[0] }}{{ member.last_name?.[0] }}
                  </div>
                </div>
                <div class="staff-info">
                  <h5>{{ member.first_name }} {{ member.last_name }}</h5>
                  <p>{{ member.title || 'Professional' }}</p>
                  <div class="staff-rating">
                    <div class="stars">
                      <i v-for="star in 5" :key="star" 
                         :class="['fas fa-star', { filled: star <= (member.rating || 5) }]">
                      </i>
                    </div>
                    <span>({{ member.reviews || 0 }} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Date & Time Selection -->
          <div v-if="currentStep === 4" class="step-content"
               key="step-4">
            <div class="content-header">
              <h3>Date & Time</h3>
              <p>Select your preferred date and time</p>
            </div>

            <div class="datetime-container">
              <!-- Calendar -->
              <div class="calendar-section">
                <div class="calendar-header">
                  <button @click="previousMonth" class="nav-btn">
                    <i class="fas fa-chevron-left"></i>
                  </button>
                  <h4>{{ currentMonthYear }}</h4>
                  <button @click="nextMonth" class="nav-btn">
                    <i class="fas fa-chevron-right"></i>
                  </button>
                </div>

                <div class="calendar-grid">
                  <div class="calendar-weekdays">
                    <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
                  </div>
                  <div class="calendar-days">
                    <div 
                      v-for="date in calendarDays" 
                      :key="date.key"
                      :class="['calendar-day', {
                        'other-month': !date.isCurrentMonth,
                        'selected': selectedDate && isSameDay(selectedDate, date.date),
                        'today': isToday(date.date),
                        'disabled': !isDateAvailable(date.date)
                      }]"
                      @click="selectDate(date.date)"
                    >
                      {{ date.day }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Time Slots -->
              <div v-if="hasAvailableTimeSlots()" class="time-section">
                <h4>Available Times</h4>
                <div class="time-slots" :key="timeSlotsKey">
                  <button 
                    v-for="time in getAvailableTimeSlots()" 
                    :key="time.value"
                    :class="['time-slot', { 
                      selected: selectedTime === time.value,
                      unavailable: !time.available 
                    }]"
                    @click="selectTime(time.value)"
                    :disabled="!time.available"
                  >
                    <div class="time-slot-time">
                      {{ time.startTime }} - {{ time.endTime }}
                    </div>
                    <div class="time-slot-info" v-if="time.available">
                      {{ time.slotsLeft }} slot{{ time.slotsLeft !== 1 ? 's' : '' }} left
                    </div>
                    <div class="time-slot-info" v-else>
                      Unavailable
                    </div>
                  </button>
                </div>
              </div>
              
              <!-- No Time Slots Available -->
              <div v-else-if="selectedDate" class="time-section">
                <h4>Available Times</h4>
                <div class="no-slots-message">
                  <i class="fas fa-clock"></i>
                  <p>No available time slots for this date.</p>
                  <p class="hint">Please select a future date or try tomorrow.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Basic Details -->
          <div v-if="currentStep === 5" class="step-content"
               key="step-5">
            <div class="content-header">
              <h3>Basic Details</h3>
              <p>Provide additional information for your booking</p>
            </div>

            <div class="form-container">
              <div class="form-section-header">
                <i class="fas fa-user-edit"></i>
                <h4>Booking Information</h4>
                <p>Please provide the required details to complete your booking</p>
              </div>

              <div class="form-group">
                <div class="customer-section">
                  <label>
                    <i class="fas fa-user"></i>
                    Customer *
                  </label>
                  
                  <div class="customer-options">
                    <button 
                      type="button" 
                      class="btn btn-outline-primary customer-toggle"
                      :class="{ active: !showNewCustomerForm }"
                      @click="showNewCustomerForm = false"
                    >
                      <i class="fas fa-search"></i>
                      Select Existing
                    </button>
                    <button 
                      type="button" 
                      class="btn btn-outline-primary customer-toggle"
                      :class="{ active: showNewCustomerForm }"
                      @click="toggleNewCustomerForm"
                    >
                      <i class="fas fa-plus"></i>
                      Add New
                    </button>
                  </div>

                  <!-- Existing Customer Selection -->
                  <div v-if="!showNewCustomerForm" class="existing-customer">
                    <select 
                      v-model="formData.customer_id" 
                      class="form-select"
                      required
                    >
                      <option value="">Select a customer</option>
                      <option 
                        v-for="customer in customersWithMockData" 
                        :key="customer.id" 
                        :value="customer.id"
                      >
                        {{ customer.first_name }} {{ customer.last_name }} - {{ customer.phone }}
                      </option>
                    </select>
                  </div>

                  <!-- New Customer Form -->
                  <div v-if="showNewCustomerForm" class="new-customer-form">
                    <div class="row">
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="firstName">
                            <i class="fas fa-user"></i>
                            First Name *
                          </label>
                          <input 
                            type="text" 
                            id="firstName"
                            v-model="newCustomer.first_name" 
                            class="form-input"
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="lastName">
                            <i class="fas fa-user"></i>
                            Last Name *
                          </label>
                          <input 
                            type="text" 
                            id="lastName"
                            v-model="newCustomer.last_name" 
                            class="form-input"
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div class="row">
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="email">
                            <i class="fas fa-envelope"></i>
                            Email
                          </label>
                          <input 
                            type="email" 
                            id="email"
                            v-model="newCustomer.email" 
                            class="form-input"
                            placeholder="Enter email address"
                          />
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="phone">
                            <i class="fas fa-phone"></i>
                            Phone *
                          </label>
                          <input 
                            type="tel" 
                            id="phone"
                            v-model="newCustomer.phone" 
                            class="form-input"
                            placeholder="Enter phone number"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div class="customer-actions">
                      <button 
                        type="button" 
                        class="btn btn-success" 
                        @click="createNewCustomer"
                        :disabled="!newCustomer.first_name || !newCustomer.last_name || !newCustomer.phone"
                      >
                        <i class="fas fa-check"></i>
                        Create Customer
                      </button>
                      <button 
                        type="button" 
                        class="btn btn-secondary" 
                        @click="showNewCustomerForm = false"
                      >
                        <i class="fas fa-times"></i>
                        Cancel
                      </button>
                    </div>
                  </div>

                  <!-- Selected New Customer Display -->
                  <div v-if="newCustomerData && newCustomerData.id === formData.customer_id" class="selected-new-customer">
                    <div class="customer-preview">
                      <i class="fas fa-user-check text-success"></i>
                      <div class="customer-info">
                        <strong>{{ newCustomerData.first_name }} {{ newCustomerData.last_name }}</strong>
                        <span>{{ newCustomerData.phone }}</span>
                        <span v-if="newCustomerData.email">{{ newCustomerData.email }}</span>
                      </div>
                      <button 
                        type="button" 
                        class="btn btn-sm btn-outline-secondary" 
                        @click="showNewCustomerForm = true"
                      >
                        <i class="fas fa-edit"></i>
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="notes">
                  <i class="fas fa-sticky-note"></i>
                  Special Notes
                </label>
                <textarea 
                  id="notes"
                  v-model="formData.notes" 
                  class="form-textarea"
                  rows="4"
                  placeholder="Any special requests, preferences, or important details..."
                ></textarea>
              </div>

              <div v-if="selectedService?.category === 'automotive'" class="form-group vehicle-group">
                <label for="vehicle">
                  <i class="fas fa-car"></i>
                  Vehicle Information
                </label>
                <input 
                  type="text" 
                  id="vehicle"
                  v-model="formData.vehicle_info" 
                  class="form-input"
                  placeholder="e.g., Toyota Camry 2020, License: ABC-123"
                />
                <div class="field-help">
                  <i class="fas fa-info-circle"></i>
                  Please include vehicle make, model, year, and license plate if available
                </div>
              </div>
            </div>
          </div>

          <!-- Step 5: Summary -->
          <div v-if="currentStep === 6" class="step-content summary-step"
               key="step-6">
            <!-- Summary Header -->
            <div class="summary-header">
              <div class="summary-icon">
                <i class="fas fa-clipboard-check"></i>
              </div>
              <h2>Summary</h2>
              <p>Your appointment booking summary</p>
            </div>

            <div class="summary-scrollable">
              <div class="summary-container">
                <!-- Customer Info -->
                <div class="summary-customer-card">
                <div class="customer-avatar">
                  <i class="fas fa-user"></i>
                </div>
                <div class="customer-details">
                  <div class="customer-label">Customer</div>
                  <div class="customer-name">{{ selectedCustomerName || 'Walk-in Customer' }}</div>
                </div>
              </div>

              <!-- Organization Card -->
              <div class="summary-detail-card org-card">
                <div class="card-icon org-icon">
                  <i class="fas fa-building"></i>
                </div>
                <div class="card-content">
                  <div class="detail-label">Organization</div>
                  <div class="detail-value">{{ selectedOrganization?.name || 'Not selected' }}</div>
                  <div v-if="selectedOrganization?.email" class="detail-extra">{{ selectedOrganization.email }}</div>
                </div>
              </div>

              <!-- Main Details Grid -->
              <div class="summary-main-grid">
                <!-- Service & Staff Card -->
                <div class="summary-detail-card service-staff-card">
                  <div class="card-icon service-icon">
                    <i class="fas fa-wrench"></i>
                  </div>
                  <div class="card-content">
                    <div class="detail-label">Service & Provider</div>
                    <div class="detail-value">{{ selectedService?.name || 'Service Selected' }}</div>
                    <div class="detail-extra" v-if="selectedStaff">
                      <i class="fas fa-user-tie"></i>
                      {{ selectedStaff.first_name }} {{ selectedStaff.last_name }}
                    </div>
                  </div>
                </div>

                <!-- Date & Time Card -->
                <div class="summary-detail-card datetime-card">
                  <div class="card-icon datetime-icon">
                    <i class="fas fa-calendar-alt"></i>
                  </div>
                  <div class="card-content">
                    <div class="detail-label">Appointment</div>
                    <div class="detail-value">{{ formatSummaryDateTime }}</div>
                    <div class="detail-extra" v-if="selectedService?.duration">
                      <i class="fas fa-clock"></i>
                      {{ selectedService.duration }} minutes
                    </div>
                  </div>
                </div>
              </div>

              <!-- Additional Information Grid -->
              <div class="summary-additional-grid" v-if="formData.notes || formData.vehicle_info">
                <!-- Vehicle Info -->
                <div v-if="formData.vehicle_info" class="summary-info-card vehicle-card">
                  <div class="card-icon vehicle-icon">
                    <i class="fas fa-car"></i>
                  </div>
                  <div class="card-content">
                    <div class="detail-label">Vehicle Information</div>
                    <div class="detail-value">{{ formData.vehicle_info }}</div>
                  </div>
                </div>

                <!-- Special Notes -->
                <div v-if="formData.notes" class="summary-info-card notes-card">
                  <div class="card-icon notes-icon">
                    <i class="fas fa-sticky-note"></i>
                  </div>
                  <div class="card-content">
                    <div class="detail-label">Special Notes</div>
                    <div class="detail-value">{{ formData.notes }}</div>
                  </div>
                </div>
              </div>

              <!-- Pricing Summary -->
              <div class="summary-pricing">
                <div class="pricing-header">
                  <i class="fas fa-receipt"></i>
                  <span>Pricing Details</span>
                </div>
                <div class="pricing-content">
                  <div class="pricing-row subtotal">
                    <span>Service Fee</span>
                    <span>${{ selectedService?.price?.toFixed(2) || '0.00' }}</span>
                  </div>
                  
                  <div class="pricing-divider"></div>
                  
                  <div class="pricing-row total">
                    <span>Total Amount</span>
                    <span>${{ selectedService?.price?.toFixed(2) || '0.00' }}</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button 
          v-if="currentStep > 1" 
          @click="previousStep" 
          class="btn btn-secondary"
        >
          <i class="fas fa-arrow-left"></i>
          Previous
        </button>
        
        <div class="footer-spacer"></div>
        
        <button 
          v-if="currentStep < steps.length" 
          @click="nextStep" 
          class="btn btn-primary"
          :disabled="!canProceedToNext"
        >
          Next
          <i class="fas fa-arrow-right"></i>
        </button>
        
        <button 
          v-if="currentStep === steps.length" 
          @click="submitBooking" 
          class="btn btn-primary"
          :disabled="!canSubmit"
        >
          <i class="fas fa-check"></i>
          Confirm Booking
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { useOrganizationContextStore } from '../stores/organizationContext'

export default {
  name: 'BookingModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    booking: {
      type: Object,
      default: null
    },
    customers: {
      type: Array,
      default: () => []
    },
    services: {
      type: Array,
      default: () => []
    },
    staff: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      currentStep: 1,
      selectedCategory: 'ALL',
      selectedOrganization: null,
      selectedService: null,
      selectedStaff: null,
      selectedDate: new Date(),
      selectedTime: null,
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear(),
      timeSlotsKey: 0,
      formData: {
        customer_id: '',
        notes: '',
        vehicle_info: ''
      },
      
      showNewCustomerForm: false,
      newCustomer: {
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
      },
      newCustomerData: null,
      
      steps: [
        { title: 'Organization', icon: 'fas fa-building' },
        { title: 'Service', icon: 'fas fa-concierge-bell' },
        { title: 'Staff', icon: 'fas fa-user-tie' },
        { title: 'Date & Time', icon: 'fas fa-calendar-alt' },
        { title: 'Basic Details', icon: 'fas fa-edit' },
        { title: 'Summary', icon: 'fas fa-check-circle' }
      ],
      
      categories: [
        { key: 'ALL', label: 'ALL' },
        { key: 'automotive', label: 'Automotive' },
        { key: 'beauty', label: 'Beauty' },
        { key: 'wellness', label: 'Wellness' }
      ],
      
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    }
  },
  
  watch: {
    booking: {
      handler(newBooking, oldBooking) {
        console.log('👁️ Booking watcher triggered:', { newBooking, oldBooking, isEditing: this.isEditing })
        
        if (newBooking && this.isEditing) {
          console.log('🔧 Initializing edit mode for booking:', newBooking.id)
          this.initializeEditMode(newBooking)
        } else if (!newBooking && oldBooking) {
          console.log('🔄 Booking cleared, will reset form when appropriate')
        }
      },
      immediate: true
    },
    
    show(newShow) {
      console.log('👁️ Show watcher triggered:', newShow, 'isEditing:', this.isEditing)
      if (newShow && !this.isEditing) {
        console.log('🔄 Resetting form for new booking')
        this.resetForm()
      }
    }
  },
  
  computed: {
    isEditing() {
      return !!this.booking
    },
    
    servicesWithMockData() {
      if (this.services && this.services.length > 0) {
        return this.services
      }
      return [
        {
          id: '1',
          name: 'Oil Change',
          category: 'automotive',
          duration: 30,
          price: 49.99,
          icon: 'fas fa-oil-can',
          requiresVehicle: true
        },
        {
          id: '2',
          name: 'Tire Rotation',
          category: 'automotive',
          duration: 45,
          price: 29.99,
          icon: 'fas fa-circle-notch',
          requiresVehicle: true
        },
        {
          id: '3',
          name: 'Haircut & Style',
          category: 'beauty',
          duration: 60,
          price: 65.00,
          icon: 'fas fa-cut'
        },
        {
          id: '4',
          name: 'Facial Treatment',
          category: 'beauty',
          duration: 90,
          price: 120.00,
          icon: 'fas fa-spa'
        },
        {
          id: '5',
          name: 'Massage Therapy',
          category: 'wellness',
          duration: 60,
          price: 85.00,
          icon: 'fas fa-hands'
        }
      ]
    },
    
    staffWithMockData() {
      if (this.staff && this.staff.length > 0) {
        return this.staff
      }
      return [
        {
          id: '1',
          first_name: 'Sarah',
          last_name: 'Johnson',
          title: 'Senior Stylist',
          rating: 5,
          reviews: 127,
          skills: ['beauty']
        },
        {
          id: '2',
          first_name: 'Mike',
          last_name: 'Wilson',
          title: 'Auto Technician',
          rating: 4,
          reviews: 89,
          skills: ['automotive']
        },
        {
          id: '3',
          first_name: 'Emma',
          last_name: 'Davis',
          title: 'Wellness Coach',
          rating: 5,
          reviews: 156,
          skills: ['wellness']
        }
      ]
    },
    
    customersWithMockData() {
      let customerList = []
      
      if (this.customers && this.customers.length > 0) {
        customerList = [...this.customers]
      } else {
        customerList = [
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            phone: '(555) 123-4567',
            email: 'john.doe@example.com'
          },
          {
            id: '2',
            first_name: 'Jane',
            last_name: 'Smith',
            phone: '(555) 987-6543',
            email: 'jane.smith@example.com'
          }
        ]
      }
      
      // Add new customer to the list if it exists and isn't already in the list
      if (this.newCustomerData && !customerList.find(c => c.id === this.newCustomerData.id)) {
        customerList.unshift(this.newCustomerData)
      }
      
      return customerList
    },
    
    filteredServices() {
      if (this.selectedCategory === 'ALL') {
        return this.servicesWithMockData
      }
      return this.servicesWithMockData.filter(service => 
        service.category === this.selectedCategory
      )
    },
    
    availableStaff() {
      // Always return staff for now - we can add filtering later
      return this.staffWithMockData
    },
    
    currentMonthYear() {
      const date = new Date(this.currentYear, this.currentMonth)
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    },
    
    calendarDays() {
      const firstDay = new Date(this.currentYear, this.currentMonth, 1)
      // const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0) // unused variable
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())
      
      const days = []
      const current = new Date(startDate)
      
      for (let i = 0; i < 42; i++) {
        days.push({
          date: new Date(current),
          day: current.getDate(),
          isCurrentMonth: current.getMonth() === this.currentMonth,
          key: current.toISOString().split('T')[0]
        })
        current.setDate(current.getDate() + 1)
      }
      
      return days
    },
    
    
    formatSelectedDateTime() {
      if (!this.selectedDate || !this.selectedTime) return ''
      return `${this.selectedDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })} at ${this.selectedTime}`
    },

    formatSummaryDateTime() {
      if (!this.selectedDate || !this.selectedTime) return 'Date & Time to be confirmed'
      
      const dateStr = this.selectedDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric'
      })
      
      // Convert selectedTime (24-hour) to 12-hour format
      const [hours, minutes] = this.selectedTime.split(':')
      const startTime = new Date()
      startTime.setHours(parseInt(hours), parseInt(minutes))
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + (this.selectedService?.duration || 90))
      
      const startTimeStr = startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
      const endTimeStr = endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
      
      return `${dateStr}, ${startTimeStr} - ${endTimeStr}`
    },
    
    selectedCustomerName() {
      // Check if it's a new customer first
      if (this.newCustomerData && this.newCustomerData.id === this.formData.customer_id) {
        return `${this.newCustomerData.first_name} ${this.newCustomerData.last_name}`
      }
      
      // Otherwise, find in existing customers
      const customer = this.customersWithMockData.find(c => c.id === this.formData.customer_id)
      return customer ? `${customer.first_name} ${customer.last_name}` : ''
    },
    
    canProceedToNext() {
      switch (this.currentStep) {
        case 1: return !!this.selectedOrganization
        case 2: return !!this.selectedService
        case 3: return !!this.selectedStaff
        case 4: return !!this.selectedDate && !!this.selectedTime
        case 5: return !!this.formData.customer_id
        default: return true
      }
    },
    
    canSubmit() {
      if (!this.selectedOrganization || !this.selectedService || !this.selectedStaff || !this.selectedDate || !this.selectedTime || !this.formData.customer_id) {
        return false
      }
      
      // For new bookings, prevent submitting if time is in the past
      if (!this.isEditing) {
        const startDateTime = new Date(
          this.selectedDate.getFullYear(),
          this.selectedDate.getMonth(),
          this.selectedDate.getDate(),
          parseInt(this.selectedTime.split(':')[0]),
          parseInt(this.selectedTime.split(':')[1])
        )
        const now = new Date()
        if (startDateTime <= now) {
          return false
        }
      }
      
      return true
    },
    
    availableOrganizations() {
      const authStore = useAuthStore()
      const orgContextStore = useOrganizationContextStore()
      
      if (authStore.isSuperAdmin) {
        return orgContextStore.organizations
      }
      
      // Non-super admin users only see their own organization
      return orgContextStore.organizations.filter(org => org.id === authStore.user?.organization_id)
    }
  },
  
  methods: {
    getAvailableTimeSlots() {
      const slots = []
      const startHour = 9
      const endHour = 17
      const serviceDuration = this.selectedService?.duration || 90 // Default 90 minutes
      
      // If no date is selected, return empty array
      if (!this.selectedDate) {
        return slots
      }
      
      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60000) // 1 hour minimum
      const twoHoursFromNow = new Date(now.getTime() + 120 * 60000) // 2 hours for active slots
      
      // Check if selected date is today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selectedDateOnly = new Date(this.selectedDate)
      selectedDateOnly.setHours(0, 0, 0, 0)
      const isToday = today.getTime() === selectedDateOnly.getTime()
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          // Create the actual booking time for this slot
          const bookingDateTime = new Date(this.selectedDate)
          bookingDateTime.setHours(hour, minute, 0, 0)
          
          // Skip if booking time is in the past (with 1 hour buffer)
          if (isToday && bookingDateTime < oneHourFromNow) {
            continue
          }
          
          const endTime = new Date(bookingDateTime)
          endTime.setMinutes(endTime.getMinutes() + serviceDuration)
          
          // Don't show slots that would end after business hours
          if (endTime.getHours() >= endHour && endTime.getMinutes() > 0) continue
          
          const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          
          // Determine if slot is available (active) - within 2 hours for today
          let isAvailable = true
          if (isToday && bookingDateTime > twoHoursFromNow) {
            isAvailable = false // Make inactive if more than 2 hours away on today
          }
          
          slots.push({
            value: timeValue,
            startTime: bookingDateTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            endTime: endTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            available: isAvailable,
            slotsLeft: isAvailable ? 3 : 0
          })
        }
      }
      
      return slots
    },

    hasAvailableTimeSlots() {
      const slots = this.getAvailableTimeSlots()
      return slots.length > 0
    },

    closeModal() {
      this.$emit('close')
      // Only reset form if not editing to preserve form state during edit process
      if (!this.isEditing) {
        this.resetForm()
      }
    },
    
    resetForm() {
      this.currentStep = 1
      this.selectedCategory = 'ALL'
      this.selectedOrganization = null
      this.selectedService = null
      this.selectedStaff = null
      this.selectedDate = null
      this.selectedTime = null
      this.formData = {
        customer_id: '',
        notes: '',
        vehicle_info: ''
      }
      this.showNewCustomerForm = false
      this.newCustomer = {
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
      }
      this.newCustomerData = null
    },
    
    goToStep(step) {
      if (step <= this.currentStep || this.canProceedToStep(step)) {
        this.currentStep = step
      }
    },
    
    canProceedToStep(step) {
      // Allow going back or if previous steps are completed
      return step <= this.currentStep
    },
    
    nextStep() {
      if (this.canProceedToNext && this.currentStep < this.steps.length) {
        this.currentStep++
      }
    },
    
    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--
      }
    },
    
    selectOrganization(org) {
      this.selectedOrganization = org
      console.log('🏢 Organization selected:', org)
    },
    
    selectService(service) {
      this.selectedService = service
    },
    
    selectStaff(staff) {
      this.selectedStaff = staff
    },
    
    selectDate(date) {
      if (this.isDateAvailable(date)) {
        this.selectedDate = date
        this.timeSlotsKey++ // Force re-render of time slots
        console.log('📅 Date selected:', date.toLocaleDateString(), 'Key:', this.timeSlotsKey)
      }
    },
    
    selectTime(time) {
      this.selectedTime = time
    },
    
    previousMonth() {
      if (this.currentMonth === 0) {
        this.currentMonth = 11
        this.currentYear--
      } else {
        this.currentMonth--
      }
    },
    
    nextMonth() {
      if (this.currentMonth === 11) {
        this.currentMonth = 0
        this.currentYear++
      } else {
        this.currentMonth++
      }
    },
    
    isToday(date) {
      const today = new Date()
      return this.isSameDay(date, today)
    },
    
    isSameDay(date1, date2) {
      return date1.toDateString() === date2.toDateString()
    },
    
    isDateAvailable(date) {
      // Don't allow past dates
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
    },
    
    toggleNewCustomerForm() {
      this.showNewCustomerForm = !this.showNewCustomerForm
      if (this.showNewCustomerForm) {
        this.formData.customer_id = ''
      }
    },
    
    createNewCustomer() {
      // Basic validation
      if (!this.newCustomer.first_name || !this.newCustomer.last_name || !this.newCustomer.phone) {
        alert('Please fill in all required fields (First Name, Last Name, Phone)')
        return
      }
      
      // Generate a temporary ID for new customer
      const tempId = `new_${Date.now()}`
      
      // Create customer object
      const customer = {
        id: tempId,
        first_name: this.newCustomer.first_name,
        last_name: this.newCustomer.last_name,
        email: this.newCustomer.email,
        phone: this.newCustomer.phone
      }
      
      // Set as selected customer
      this.formData.customer_id = tempId
      
      // Store new customer data for booking submission
      this.newCustomerData = customer
      
      // Hide form
      this.showNewCustomerForm = false
      
      // Clear form
      this.newCustomer = {
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
      }
    },
    
    initializeEditMode(booking) {
      console.log('🔧 Initializing edit mode with booking:', booking)
      
      // Set selected service - try multiple approaches to find the right service
      if (booking.services && booking.services.length > 0) {
        const service = booking.services[0]
        this.selectedService = this.servicesWithMockData.find(s => 
          s.id == service.id || s.name === service.name
        ) || service
        console.log('📋 Selected service:', this.selectedService)
      } else {
        // Fallback: try to infer service from price if services not available
        const availableServices = this.servicesWithMockData
        let inferredService = null
        
        if (booking.total_price === 85) {
          inferredService = availableServices.find(s => s.price === 85) // Oil Change
        } else if (booking.total_price === 180) {
          inferredService = availableServices.find(s => s.price === 180) // Brake Service  
        } else if (booking.total_price === 120) {
          inferredService = availableServices.find(s => s.price === 120) // Tire Rotation
        } else if (booking.total_price === 65) {
          inferredService = availableServices.find(s => s.price === 65) // Hair Cut
        } else if (booking.total_price === 95) {
          inferredService = availableServices.find(s => s.price === 95) // Facial Treatment
        }
        
        if (inferredService) {
          this.selectedService = inferredService
          console.log('📋 Inferred service from price:', this.selectedService)
        } else {
          console.log('⚠️ Could not determine service for booking')
        }
      }
      
      // Set selected staff
      if (booking.staff) {
        this.selectedStaff = this.staffWithMockData.find(s => 
          s.id == booking.staff.id || 
          (s.first_name === booking.staff.first_name && s.last_name === booking.staff.last_name)
        ) || booking.staff
        console.log('👨‍💼 Selected staff:', this.selectedStaff)
      }
      
      // Set date and time
      if (booking.start_time) {
        const startDate = new Date(booking.start_time)
        this.selectedDate = startDate
        this.selectedTime = startDate.toTimeString().slice(0, 5) // HH:MM format
        console.log('📅 Selected date:', this.selectedDate)
        console.log('⏰ Selected time:', this.selectedTime)
      }
      
      // Set customer - ensure we get a valid customer_id
      let customerId = null
      if (booking.customer && booking.customer.id) {
        customerId = booking.customer.id
        console.log('👤 Found customer object:', booking.customer)
      } else if (booking.customer_id) {
        customerId = booking.customer_id
        console.log('👤 Found customer_id directly:', booking.customer_id)
      } else {
        console.log('⚠️ No customer or customer_id found in booking:', booking)
      }
      
      if (customerId) {
        this.formData.customer_id = customerId
        console.log('👤 Set formData.customer_id to:', this.formData.customer_id, typeof this.formData.customer_id)
      }
      
      // Set form data
      this.formData.notes = booking.notes || ''
      this.formData.vehicle_info = booking.vehicle_info || ''
      
      // Set appropriate step based on completed data
      if (this.selectedService && this.selectedStaff && this.selectedDate && this.selectedTime) {
        this.currentStep = 5 // Go to summary step
      } else if (this.selectedService && this.selectedStaff && this.selectedDate) {
        this.currentStep = 4 // Go to basic details
      } else if (this.selectedService && this.selectedStaff) {
        this.currentStep = 3 // Go to date & time
      } else if (this.selectedService) {
        this.currentStep = 2 // Go to staff selection
      } else {
        this.currentStep = 1 // Start from service selection
      }
      
      console.log('📊 Set current step to:', this.currentStep)
    },
    
    submitBooking() {
      console.log('🚀 Starting submitBooking()')
      console.log('📋 Current formData:', this.formData)
      console.log('👤 formData.customer_id:', this.formData.customer_id, typeof this.formData.customer_id)
      
      // Create the start time as a local date
      const startDateTime = new Date(
        this.selectedDate.getFullYear(),
        this.selectedDate.getMonth(),
        this.selectedDate.getDate(),
        parseInt(this.selectedTime.split(':')[0]),
        parseInt(this.selectedTime.split(':')[1])
      )
      
      // Prevent booking appointments in the past
      const now = new Date()
      if (!this.isEditing && startDateTime <= now) {
        alert('Cannot create appointments for past times. Please select a future time.')
        return
      }
      
      // Format as ISO string but preserve local time
      const year = startDateTime.getFullYear()
      const month = String(startDateTime.getMonth() + 1).padStart(2, '0')
      const day = String(startDateTime.getDate()).padStart(2, '0')
      const hours = String(startDateTime.getHours()).padStart(2, '0')
      const minutes = String(startDateTime.getMinutes()).padStart(2, '0')
      const localISOString = `${year}-${month}-${day}T${hours}:${minutes}:00`
      
      console.log('📅 Local time selected:', this.selectedTime)
      console.log('📅 DateTime object:', startDateTime)
      console.log('📅 Local ISO string:', localISOString)
      
      const bookingData = {
        organization_id: this.selectedOrganization.id,
        service_id: this.selectedService.id,
        staff_id: this.selectedStaff.id,
        customer_id: parseInt(this.formData.customer_id) || this.formData.customer_id,
        start_time: localISOString,
        duration: this.selectedService.duration,
        total_price: this.selectedService.price,
        notes: this.formData.notes,
        vehicle_info: this.formData.vehicle_info,
        status: this.isEditing ? this.booking.status : 'scheduled'
      }
      
      // Include booking ID for editing
      if (this.isEditing) {
        bookingData.id = this.booking.id
      }
      
      // Include new customer data if creating a new customer
      if (this.newCustomerData && this.newCustomerData.id === this.formData.customer_id) {
        bookingData.new_customer = this.newCustomerData
      }
      
      console.log('💾 Submitting booking data:', bookingData)
      this.$emit('save', bookingData)
      this.closeModal()
    }
  }
}
</script>

<style scoped>
/* Simple, reliable modal structure */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
  overflow: hidden;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 98vw;
  max-width: 1700px;
  height: 92vh;
  max-height: 92vh;
  min-height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  position: relative;
}

[data-bs-theme="dark"] .modal-container {
  background: #212529;
}

/* Header */
.modal-header {
  padding: 24px;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

[data-bs-theme="dark"] .modal-header {
  background: #343a40;
  border-bottom-color: #495057;
}

.modal-header h2 {
  margin: 0;
  color: #212529;
  font-size: 1.5rem;
  font-weight: 600;
}

[data-bs-theme="dark"] .modal-header h2 {
  color: white;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #6c757d;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
}

.btn-close:hover {
  color: #212529;
  background: rgba(0, 0, 0, 0.05);
}

[data-bs-theme="dark"] .btn-close:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* Content area - seamless connection, no gaps */
.modal-content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  min-height: 0;
  width: 100% !important;
  max-width: none !important;
  overflow: hidden;
  position: relative;
  margin: 0 !important;
  padding: 0 !important;
  border: none;
  gap: 0 !important;
}

/* Sidebar - perfectly aligned, no gaps */
.sidebar-nav {
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  background: #f8f9fa;
  border-right: 1px solid #dee2e6;
  padding: 20px 16px;
  overflow-y: auto;
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 !important;
  border-radius: 0 !important;
}

[data-bs-theme="dark"] .sidebar-nav {
  background: #343a40;
  border-right-color: #495057;
}

.nav-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  color: #6c757d;
  transition: all 0.2s;
  flex-shrink: 0;
}

[data-bs-theme="dark"] .nav-step {
  color: #adb5bd;
}

.nav-step.active {
  background: #0d6efd;
  color: white;
}

.nav-step.completed {
  color: #198754;
}

.nav-step:hover:not(.active) {
  background: rgba(0, 0, 0, 0.05);
}

[data-bs-theme="dark"] .nav-step:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
}

.step-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.nav-step.active .step-icon {
  background: rgba(255, 255, 255, 0.3);
}

.nav-step.completed .step-icon {
  background: rgba(25, 135, 84, 0.1);
  color: #198754;
}

.step-title {
  font-weight: 500;
  font-size: 14px;
}

/* Main content area - perfectly flush with sidebar */
.main-content {
  flex: 1 1 auto;
  min-width: 0;
  width: 100% !important;
  max-width: none !important;
  background: white;
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 0 !important;
}

[data-bs-theme="dark"] .main-content {
  background: #212529;
}

.step-content {
  flex: 1;
  width: 100% !important;
  max-width: none !important;
  padding: 20px 28px 40px 28px;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative;
  min-height: 0;
  margin: 0 !important;
  scroll-behavior: smooth;
  border-radius: 0 !important;
}

.summary-step {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}


/* Content styles - force full width and ensure visibility */
.step-content > * {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  box-sizing: border-box;
  margin-left: 0 !important;
  margin-right: 0 !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.content-header {
  margin-bottom: 20px;
  display: block;
  flex-shrink: 0;
}

.content-header h3 {
  margin: 0 0 8px 0;
  color: #212529;
  font-size: 1.5rem;
  font-weight: 600;
}

[data-bs-theme="dark"] .content-header h3 {
  color: white;
}

.content-header p {
  margin: 0;
  color: #6c757d;
  font-size: 0.95rem;
}

[data-bs-theme="dark"] .content-header p {
  color: #adb5bd;
}

/* Category Filter */
.category-filter {
  margin-bottom: 32px;
  width: 100% !important;
  max-width: none !important;
}

.category-filter h4 {
  margin: 0 0 16px 0;
  color: #212529;
  font-size: 1.1rem;
  font-weight: 600;
}

[data-bs-theme="dark"] .category-filter h4 {
  color: white;
}

.filter-buttons {
  display: flex !important;
  gap: 12px;
  flex-wrap: wrap;
  width: 100% !important;
  max-width: none !important;
  justify-content: flex-start;
}

.filter-btn {
  padding: 10px 16px;
  border: 1px solid #dee2e6;
  background: white;
  color: #495057;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s;
}

[data-bs-theme="dark"] .filter-btn {
  background: #343a40;
  border-color: #495057;
  color: #adb5bd;
}

.filter-btn.active {
  background: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

.filter-btn:hover:not(.active) {
  border-color: #0d6efd;
  background: #f8f9ff;
}

[data-bs-theme="dark"] .filter-btn:hover:not(.active) {
  background: rgba(13, 110, 253, 0.1);
}

/* Service Selection */
.service-selection {
  margin-bottom: 32px;
  width: 100% !important;
  max-width: none !important;
}

.service-selection h4 {
  margin: 0 0 20px 0;
  color: #212529;
  font-size: 1.1rem;
  font-weight: 600;
}

[data-bs-theme="dark"] .service-selection h4 {
  color: white;
}

.services-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
  gap: 24px;
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

.service-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

[data-bs-theme="dark"] .service-card {
  background: #343a40;
  border-color: #495057;
}

.service-card:hover {
  border-color: #0d6efd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.service-card.selected {
  border-color: #0d6efd;
  background: #f8f9ff;
}

[data-bs-theme="dark"] .service-card.selected {
  background: rgba(13, 110, 253, 0.1);
}

/* Organization Cards */
.organization-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.organization-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 16px;
}

[data-bs-theme="dark"] .organization-card {
  background: #343a40;
  border-color: #495057;
}

.organization-card:hover {
  border-color: #0d6efd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.organization-card.selected {
  border-color: #0d6efd;
  background: #f8f9ff;
}

[data-bs-theme="dark"] .organization-card.selected {
  background: rgba(13, 110, 253, 0.1);
}

.org-icon {
  width: 48px;
  height: 48px;
  background: #0d6efd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
}

.org-info {
  flex: 1;
}

.org-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

[data-bs-theme="dark"] .org-info h4 {
  color: #f8f9fa;
}

.org-info p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

[data-bs-theme="dark"] .org-info p {
  color: #adb5bd;
}

.org-status {
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.org-status.pending {
  background: #fff3cd;
  color: #664d03;
  border: 1px solid #ffecb5;
}

[data-bs-theme="dark"] .org-status.pending {
  background: #332701;
  color: #ffda6a;
  border-color: #664d03;
}

.service-icon {
  width: 48px;
  height: 48px;
  background: #0d6efd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  margin-bottom: 16px;
}

.service-info h5 {
  margin: 0 0 8px 0;
  color: #212529;
  font-size: 1.1rem;
  font-weight: 600;
}

[data-bs-theme="dark"] .service-info h5 {
  color: white;
}

.service-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #6c757d;
  font-size: 14px;
}

[data-bs-theme="dark"] .service-details {
  color: #adb5bd;
}

.service-details i {
  margin-right: 6px;
  color: #0d6efd;
}

.price {
  font-weight: 600;
  color: #198754;
  font-size: 16px;
}

/* Staff Grid - Enhanced Design */
.staff-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
  gap: 20px;
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
}

.staff-card {
  border: 2px solid #e9ecef;
  border-radius: 16px;
  padding: 28px 24px;
  cursor: pointer;
  background: white;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.staff-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #0d6efd, #6f42c1);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

[data-bs-theme="dark"] .staff-card {
  background: #343a40;
  border-color: #495057;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.staff-card:hover {
  border-color: #0d6efd;
  box-shadow: 0 8px 25px rgba(13, 110, 253, 0.15);
  transform: translateY(-4px);
}

.staff-card:hover::before {
  transform: scaleX(1);
}

.staff-card.selected {
  border-color: #0d6efd;
  background: linear-gradient(145deg, #f8f9ff 0%, #e7f3ff 100%);
  box-shadow: 0 8px 25px rgba(13, 110, 253, 0.2);
  transform: translateY(-2px);
}

.staff-card.selected::before {
  transform: scaleX(1);
}

[data-bs-theme="dark"] .staff-card.selected {
  background: linear-gradient(145deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%);
}

.staff-avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px auto;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  border: 3px solid #e9ecef;
  transition: all 0.3s ease;
}

.staff-card:hover .staff-avatar {
  border-color: #0d6efd;
  transform: scale(1.05);
}

.staff-card.selected .staff-avatar {
  border-color: #0d6efd;
  box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.2);
}

.staff-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0d6efd 0%, #6f42c1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: 700;
  border-radius: 50%;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.staff-info h5 {
  margin: 0 0 6px 0;
  color: #212529;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

[data-bs-theme="dark"] .staff-info h5 {
  color: white;
}

.staff-info p {
  margin: 0 0 18px 0;
  color: #6c757d;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-bs-theme="dark"] .staff-info p {
  color: #adb5bd;
}

.staff-rating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 13px;
  color: #6c757d;
  font-weight: 500;
}

[data-bs-theme="dark"] .staff-rating {
  color: #adb5bd;
}

.stars {
  display: flex;
  gap: 3px;
  padding: 4px 8px;
  background: rgba(255, 193, 7, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 193, 7, 0.2);
}

.stars i {
  color: #dee2e6;
  font-size: 14px;
  transition: all 0.2s ease;
}

[data-bs-theme="dark"] .stars i {
  color: #495057;
}

.stars i.filled {
  color: #ffc107;
  text-shadow: 0 1px 2px rgba(255, 193, 7, 0.3);
}

.staff-card:hover .stars {
  background: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.3);
}

/* Calendar & Time - Clean Minimalist Design */
.datetime-container {
  display: flex !important;
  gap: 20px;
  margin-bottom: 0;
  width: 100% !important;
  padding: 0;
  align-items: stretch;
  height: calc(100vh - 308px);
  min-height: 424px;
  max-height: 581px;
}

.calendar-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  position: relative;
  flex: 0 0 80%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

[data-bs-theme="dark"] .calendar-section {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.time-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

[data-bs-theme="dark"] .time-section {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.calendar-section h4 {
  margin: 0 0 12px 0;
  color: #111827;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.time-section h4 {
  margin: 0 0 16px 0;
  color: #111827;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  text-align: center;
}

[data-bs-theme="dark"] .calendar-section h4,
[data-bs-theme="dark"] .time-section h4 {
  color: #f9fafb;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.calendar-header h4 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: -0.025em;
}

[data-bs-theme="dark"] .calendar-header h4 {
  color: #9ca3af;
}

.nav-btn {
  background: #f8faff;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
  cursor: pointer;
  color: #64748b;
  font-weight: 500;
  transition: all 0.2s ease;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

[data-bs-theme="dark"] .nav-btn {
  background: #374151;
  border-color: #4b5563;
  color: #9ca3af;
}

.nav-btn:hover {
  color: #3b82f6;
  background: #ffffff;
  border-color: #3b82f6;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

[data-bs-theme="dark"] .nav-btn:hover {
  color: #60a5fa;
  background: #1f2937;
  border-color: #60a5fa;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.2);
}

.calendar-grid {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.calendar-days {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: #d1d5db #f3f4f6;
}

.calendar-days::-webkit-scrollbar {
  width: 4px;
}

.calendar-days::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 2px;
}

.calendar-days::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.calendar-days::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

[data-bs-theme="dark"] .calendar-grid {
  border-color: #374151;
  background: #1f2937;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

[data-bs-theme="dark"] .calendar-weekdays {
  background: #374151;
  border-bottom-color: #4b5563;
}

.weekday {
  padding: 6px 4px;
  text-align: center;
  font-weight: 500;
  color: #6b7280;
  font-size: 11px;
  text-transform: capitalize;
  letter-spacing: 0;
}

[data-bs-theme="dark"] .weekday {
  color: #9ca3af;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #374151;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s ease;
  position: relative;
  border-radius: 8px;
  margin: 2px;
}

[data-bs-theme="dark"] .calendar-day {
  color: #e5e7eb;
}

.calendar-day:hover:not(.disabled):not(.selected) {
  background: #f0f7ff;
  color: #1e40af;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

[data-bs-theme="dark"] .calendar-day:hover:not(.disabled):not(.selected) {
  background: #1e3a8a;
  color: #bfdbfe;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.2);
}

.calendar-day.selected {
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  font-weight: 700;
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
  border: 2px solid #ffffff;
}

.calendar-day.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: #9ca3af;
}

.calendar-day.other-month {
  color: #d1d5db;
  opacity: 0.7;
}

[data-bs-theme="dark"] .calendar-day.other-month {
  color: #6b7280;
}

.calendar-day.today {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 500;
}

[data-bs-theme="dark"] .calendar-day.today {
  background: #1e3a8a;
  color: #93c5fd;
}

.calendar-day.today.selected {
  background: #3b82f6;
  color: white;
}

.time-slots {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.time-slot {
  padding: 16px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  text-align: center;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  position: relative;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 80px;
  justify-content: center;
}

[data-bs-theme="dark"] .time-slot {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

.time-slot:hover:not(:disabled):not(.selected) {
  border-color: #3b82f6;
  background: #f8faff;
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

[data-bs-theme="dark"] .time-slot:hover:not(:disabled):not(.selected) {
  border-color: #3b82f6;
  background: #1e3a8a;
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.time-slot.selected {
  border-color: #3b82f6;
  background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1d4ed8;
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

[data-bs-theme="dark"] .time-slot.selected {
  border-color: #60a5fa;
  background: linear-gradient(145deg, #1e3a8a 0%, #1e40af 100%);
  color: #93c5fd;
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(96, 165, 250, 0.4);
}

.time-slot-time {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-bs-theme="dark"] .time-slot-time {
  color: #f9fafb;
}

.time-slot.selected .time-slot-time {
  color: #1d4ed8;
}

[data-bs-theme="dark"] .time-slot.selected .time-slot-time {
  color: #93c5fd;
}

.time-slot-info {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-bs-theme="dark"] .time-slot-info {
  color: #9ca3af;
}

.time-slot.selected .time-slot-info {
  color: #3730a3;
}

[data-bs-theme="dark"] .time-slot.selected .time-slot-info {
  color: #bfdbfe;
}

.time-slot.unavailable,
.time-slot:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9fafb;
  border-color: #f3f4f6;
}

[data-bs-theme="dark"] .time-slot.unavailable,
[data-bs-theme="dark"] .time-slot:disabled {
  background: #374151;
  border-color: #4b5563;
}

.time-slots::-webkit-scrollbar {
  width: 4px;
}

.time-slots::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 2px;
}

.time-slots::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.time-slots::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.no-slots-message {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.no-slots-message i {
  font-size: 2rem;
  margin-bottom: 16px;
  color: #d1d5db;
}

.no-slots-message p {
  margin: 8px 0;
  font-size: 14px;
}

.no-slots-message .hint {
  font-size: 12px;
  opacity: 0.8;
}

[data-bs-theme="dark"] .no-slots-message {
  color: #9ca3af;
}

[data-bs-theme="dark"] .no-slots-message i {
  color: #4b5563;
}

/* Forms - Enhanced Design */
.form-container {
  margin-bottom: 40px;
  width: 100% !important;
  max-width: 900px;
  background: #f8f9fa;
  border-radius: 20px;
  padding: 40px 36px 50px 36px;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  min-height: auto;
}

[data-bs-theme="dark"] .form-container {
  background: #2d3748;
  border-color: #4a5568;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.form-group {
  margin-bottom: 28px;
  position: relative;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #2d3748;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.01em;
}

.form-group label::before {
  content: '';
  width: 4px;
  height: 4px;
  background: #0d6efd;
  border-radius: 50%;
  flex-shrink: 0;
}

[data-bs-theme="dark"] .form-group label {
  color: #e2e8f0;
}

.form-select,
.form-input,
.form-textarea {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  color: #2d3748;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

[data-bs-theme="dark"] .form-select,
[data-bs-theme="dark"] .form-input,
[data-bs-theme="dark"] .form-textarea {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.form-select:hover,
.form-input:hover,
.form-textarea:hover {
  border-color: #cbd5e0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1), 0 4px 12px rgba(13, 110, 253, 0.15);
  transform: translateY(-1px);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #a0aec0;
  font-weight: 400;
}

[data-bs-theme="dark"] .form-input::placeholder,
[data-bs-theme="dark"] .form-textarea::placeholder {
  color: #718096;
}

/* Form Section Header */
.form-section-header {
  text-align: center;
  margin-bottom: 36px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e2e8f0;
  position: relative;
}

.form-section-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, #0d6efd, #6f42c1);
}

[data-bs-theme="dark"] .form-section-header {
  border-bottom-color: #4a5568;
}

.form-section-header i {
  font-size: 32px;
  color: #0d6efd;
  margin-bottom: 12px;
  display: block;
}

.form-section-header h4 {
  margin: 0 0 8px 0;
  color: #2d3748;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

[data-bs-theme="dark"] .form-section-header h4 {
  color: #e2e8f0;
}

.form-section-header p {
  margin: 0;
  color: #718096;
  font-size: 14px;
  line-height: 1.5;
}

[data-bs-theme="dark"] .form-section-header p {
  color: #a0aec0;
}

/* Enhanced Label Icons */
.form-group label {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: #2d3748;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.01em;
}

.form-group label i {
  font-size: 16px;
  color: #0d6efd;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.form-group label::before {
  display: none;
}

/* Vehicle Group Special Styling */
.vehicle-group {
  background: linear-gradient(145deg, #f7fafc 0%, #edf2f7 100%);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  margin: 20px 0 30px 0;
  position: relative;
  animation: slideInFromBottom 0.3s ease-out;
}

[data-bs-theme="dark"] .vehicle-group {
  background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%);
  border-color: #4a5568;
}

.vehicle-group::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  border-radius: 16px 16px 0 0;
}

.field-help {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 12px 16px;
  background: rgba(13, 110, 253, 0.05);
  border: 1px solid rgba(13, 110, 253, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #4c6ef5;
  line-height: 1.4;
}

[data-bs-theme="dark"] .field-help {
  background: rgba(13, 110, 253, 0.1);
  border-color: rgba(13, 110, 253, 0.2);
  color: #74c0fc;
}

.field-help i {
  font-size: 12px;
  color: #4c6ef5;
  flex-shrink: 0;
}

[data-bs-theme="dark"] .field-help i {
  color: #74c0fc;
}

/* Animation for vehicle group appearance */
@keyframes slideInFromBottom {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Customer Section Styles */
.customer-section {
  margin-bottom: 24px;
}

.customer-options {
  display: flex;
  gap: 12px;
  margin: 16px 0 20px 0;
}

.customer-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.customer-toggle:hover {
  border-color: #0d6efd;
  color: #0d6efd;
  background: #f8f9ff;
}

.customer-toggle.active {
  border-color: #0d6efd;
  background: #0d6efd;
  color: white;
}

[data-bs-theme="dark"] .customer-toggle {
  border-color: #4a5568;
  background: #2d3748;
  color: #a0aec0;
}

[data-bs-theme="dark"] .customer-toggle:hover {
  border-color: #0d6efd;
  color: #0d6efd;
  background: #1a202c;
}

[data-bs-theme="dark"] .customer-toggle.active {
  border-color: #0d6efd;
  background: #0d6efd;
  color: white;
}

.existing-customer {
  animation: fadeIn 0.3s ease-out;
}

.new-customer-form {
  background: linear-gradient(145deg, #f8faff 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  animation: slideInFromBottom 0.3s ease-out;
}

[data-bs-theme="dark"] .new-customer-form {
  background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%);
  border-color: #4a5568;
}

.new-customer-form .row {
  margin-bottom: 16px;
}

.new-customer-form .row:last-of-type {
  margin-bottom: 24px;
}

.customer-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
  margin-top: 20px;
}

[data-bs-theme="dark"] .customer-actions {
  border-top-color: #4a5568;
}

.selected-new-customer {
  margin-top: 16px;
  animation: fadeIn 0.3s ease-out;
}

.customer-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #bbf7d0;
  border-radius: 12px;
}

[data-bs-theme="dark"] .customer-preview {
  background: linear-gradient(145deg, #064e3b 0%, #022c22 100%);
  border-color: #059669;
}

.customer-preview i {
  font-size: 24px;
  color: #059669;
}

.customer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-info strong {
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

[data-bs-theme="dark"] .customer-info strong {
  color: #f9fafb;
}

.customer-info span {
  color: #6b7280;
  font-size: 14px;
}

[data-bs-theme="dark"] .customer-info span {
  color: #9ca3af;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

/* Professional Summary Page Styles */
.summary-step {
  padding: 20px 32px 60px 32px !important;
}

.summary-header {
  text-align: center;
  margin-bottom: 20px;
  padding-top: 4px;
  flex-shrink: 0;
}

.summary-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 10px auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.6s ease-out;
}

.summary-icon i {
  font-size: 22px;
  color: white;
}

[data-bs-theme="dark"] .summary-icon {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
}

.summary-header h2 {
  margin: 0 0 4px 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.02em;
}

[data-bs-theme="dark"] .summary-header h2 {
  color: #f9fafb;
}

.summary-header p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  font-weight: 400;
}

[data-bs-theme="dark"] .summary-header p {
  color: #9ca3af;
}

.summary-scrollable {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.summary-container {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 32px;
}

.summary-customer-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.summary-customer-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-bs-theme="dark"] .summary-customer-card {
  background: linear-gradient(145deg, #374151 0%, #1f2937 100%);
  border-color: #4b5563;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

[data-bs-theme="dark"] .summary-customer-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.customer-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.customer-avatar i {
  font-size: 20px;
  color: white;
}

.customer-details {
  flex: 1;
  text-align: left;
}

.customer-label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

[data-bs-theme="dark"] .customer-label {
  color: #9ca3af;
}

.customer-name {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

[data-bs-theme="dark"] .customer-name {
  color: #f9fafb;
}

.summary-main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.summary-additional-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.summary-detail-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  background: linear-gradient(145deg, #ffffff 0%, #fefefe 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.summary-detail-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
}

.summary-detail-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

[data-bs-theme="dark"] .summary-detail-card {
  background: linear-gradient(145deg, #374151 0%, #2d3748 100%);
  border-color: #4b5563;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

[data-bs-theme="dark"] .summary-detail-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  color: white;
}

.service-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.datetime-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.vehicle-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.notes-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.card-content {
  flex: 1;
  min-width: 0;
}

.detail-label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

[data-bs-theme="dark"] .detail-label {
  color: #9ca3af;
}

.detail-value {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 6px;
  line-height: 1.3;
  word-wrap: break-word;
}

[data-bs-theme="dark"] .detail-value {
  color: #f9fafb;
}

.detail-extra {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-extra i {
  font-size: 12px;
  opacity: 0.8;
}

[data-bs-theme="dark"] .detail-extra {
  color: #9ca3af;
}

.summary-info-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  background: linear-gradient(145deg, #ffffff 0%, #fefefe 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.summary-info-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

[data-bs-theme="dark"] .summary-info-card {
  background: linear-gradient(145deg, #374151 0%, #2d3748 100%);
  border-color: #4b5563;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
}

[data-bs-theme="dark"] .summary-info-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.summary-pricing {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.summary-pricing:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

[data-bs-theme="dark"] .summary-pricing {
  background: linear-gradient(145deg, #374151 0%, #1f2937 100%);
  border-color: #4b5563;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

[data-bs-theme="dark"] .summary-pricing:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.pricing-header {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.01em;
}

.pricing-header i {
  font-size: 18px;
  opacity: 0.9;
}

.pricing-content {
  padding: 20px;
}

.pricing-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e5e7eb 20%, #e5e7eb 80%, transparent 100%);
  margin: 20px 0;
}

[data-bs-theme="dark"] .pricing-divider {
  background: linear-gradient(90deg, transparent 0%, #4b5563 20%, #4b5563 80%, transparent 100%);
}

.pricing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.pricing-row:last-child {
  margin-bottom: 0;
}

.pricing-row.subtotal {
  font-size: 15px;
  color: #6b7280;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

[data-bs-theme="dark"] .pricing-row.subtotal {
  color: #9ca3af;
  border-bottom-color: #4b5563;
}

.pricing-row.total {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

[data-bs-theme="dark"] .pricing-row.total {
  color: #f9fafb;
}

.pricing-row.total span:last-child {
  color: #059669;
  font-size: 20px;
}

[data-bs-theme="dark"] .pricing-row.total span:last-child {
  color: #10b981;
}

/* Responsive Summary */
@media (max-width: 768px) {
  .summary-main-grid, .summary-additional-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  
  .summary-container {
    gap: 18px;
    max-width: 100%;
    padding-bottom: 24px;
  }
  
  .summary-header {
    margin-bottom: 18px;
    padding-top: 2px;
  }
  
  .summary-scrollable {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  
  .summary-icon {
    width: 44px;
    height: 44px;
    margin-bottom: 10px;
  }
  
  .summary-icon i {
    font-size: 20px;
  }
  
  .summary-header h2 {
    font-size: 1.3rem;
  }
  
  .summary-customer-card {
    padding: 16px 20px;
    gap: 12px;
  }
  
  .customer-avatar {
    width: 40px;
    height: 40px;
  }
  
  .customer-avatar i {
    font-size: 18px;
  }
  
  .customer-name {
    font-size: 18px;
  }
  
  .summary-detail-card, .summary-info-card {
    padding: 16px;
    gap: 12px;
  }
  
  .card-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .detail-value {
    font-size: 14px;
  }
  
  .detail-extra {
    font-size: 12px;
  }
  
  .pricing-header {
    padding: 14px 18px;
    font-size: 14px;
  }
  
  .pricing-content {
    padding: 18px;
  }
  
  .summary-step {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .step-content {
    flex: 1;
    min-height: 0;
    padding: 16px 20px 30px 20px;
    overflow-y: auto;
  }
}

/* Remove any gaps and ensure seamless sidebar connection */
.modal-content {
  gap: 0 !important;
  border-spacing: 0 !important;
}

.modal-content > * {
  margin: 0 !important;
  border-radius: 0 !important;
}

.sidebar-nav,
.main-content {
  margin: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  border-radius: 0 !important;
}

.sidebar-nav {
  padding: 20px 16px !important;
}

.main-content {
  padding: 0 !important;
}

.step-content::-webkit-scrollbar {
  width: 6px;
}

.step-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.step-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.step-content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Summary */
.summary-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 32px;
  width: 100%;
  max-width: 900px;
}

[data-bs-theme="dark"] .summary-card {
  background: #343a40;
  border-color: #495057;
}

.summary-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #dee2e6;
}

[data-bs-theme="dark"] .summary-section {
  border-bottom-color: #495057;
}

.summary-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.summary-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  color: #212529;
  font-size: 1rem;
  font-weight: 600;
}

[data-bs-theme="dark"] .summary-section h4 {
  color: white;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #212529;
  font-size: 14px;
}

[data-bs-theme="dark"] .summary-item {
  color: white;
}

.summary-total {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid #dee2e6;
}

[data-bs-theme="dark"] .summary-total {
  border-top-color: #495057;
}

.total-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.2rem;
  font-weight: 600;
  color: #212529;
}

[data-bs-theme="dark"] .total-line {
  color: white;
}

.total-line span:last-child {
  color: #198754;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #dee2e6;
  background: #f8f9fa;
  flex-shrink: 0;
  flex-grow: 0;
  min-height: 80px;
}

[data-bs-theme="dark"] .modal-footer {
  background: #343a40;
  border-top-color: #495057;
}

.footer-spacer {
  flex: 1;
}

/* Responsive */
@media (max-width: 1400px) {
  .modal-container {
    width: 94vw;
    max-width: 1300px;
  }
  
  .services-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
  
  .staff-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 1024px) {
  .modal-container {
    width: 92vw;
    height: 88vh;
  }
  
  .datetime-container {
    grid-template-columns: 3fr 1fr;
    gap: 20px;
  }
  
  .services-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
  
  .staff-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  
  .step-content {
    padding: 24px 28px;
  }
}

@media (max-width: 768px) {
  .modal-container {
    width: 98vw;
    height: 95vh;
  }
  
  .modal-content {
    flex-direction: column;
  }
  
  .sidebar-nav {
    width: 100%;
    min-width: auto;
    max-width: none;
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid #dee2e6;
    padding: 16px;
  }
  
  .main-content {
    width: 100%;
  }
  
  .nav-step {
    min-width: 120px;
    flex-direction: column;
    text-align: center;
    padding: 12px;
  }
  
  .step-content {
    padding: 20px;
  }
  
  .services-grid,
  .staff-grid {
    grid-template-columns: 1fr;
  }
  
  .time-slots {
    grid-template-columns: 1fr;
  }
}

/* Button Styles - Improved Visibility */
.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  outline: none;
}

.btn-primary {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Dark theme button styles */
[data-bs-theme="dark"] .btn-primary {
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
  color: white;
  border: 2px solid #333333;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

[data-bs-theme="dark"] .btn-primary:hover {
  background: linear-gradient(135deg, #333333 0%, #1a1a1a 100%);
  border-color: #555555;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

[data-bs-theme="dark"] .btn-primary:active {
  background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
  transform: translateY(0);
}

[data-bs-theme="dark"] .btn-primary:disabled {
  background: #444444;
  border-color: #333333;
  color: #666666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.btn-secondary:hover {
  background: #e9ecef;
  color: #495057;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-bs-theme="dark"] .btn-secondary {
  background: #495057;
  color: #f8f9fa;
  border: 1px solid #6c757d;
}

[data-bs-theme="dark"] .btn-secondary:hover {
  background: #6c757d;
  color: white;
  border-color: #adb5bd;
}

/* Modal Footer Button Spacing */
.modal-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid #dee2e6;
  background: #f8f9fa;
}

[data-bs-theme="dark"] .modal-footer {
  border-top-color: #495057;
  background: #343a40;
}

.footer-spacer {
  flex: 1;
}
</style>