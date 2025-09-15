<template>
  <div class="invoice-wizard">
    <div class="wizard-container">
      <!-- Wizard Header -->
      <div class="wizard-header">
        <h2 class="wizard-title">
          <i class="bi bi-magic"></i>
          Create Amazing Invoice
        </h2>
        <div class="wizard-progress">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="progress-step"
            :class="{
              'active': currentStep === index,
              'completed': currentStep > index,
              'disabled': currentStep < index
            }"
            @click="goToStep(index)"
          >
            <div class="step-indicator">
              <i v-if="currentStep > index" class="bi bi-check-lg"></i>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ step.title }}</span>
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="wizard-content">
        <!-- Step 1: Template Selection -->
        <div v-if="currentStep === 0" class="step-content">
          <div class="step-header">
            <h3>Choose Your Perfect Template</h3>
            <p>Select from our professionally designed templates that look amazing in emails</p>
          </div>
          <InvoiceTemplates
            :selected-template="invoiceData.template"
            @template-selected="onTemplateSelected"
          />
        </div>

        <!-- Step 2: Business Information -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-header">
            <h3>Your Business Details</h3>
            <p>Customize your business information and branding</p>
          </div>

          <div class="business-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="companyName" class="form-label">Business Name *</label>
                <input
                  id="companyName"
                  v-model="invoiceData.company.name"
                  type="text"
                  class="form-control"
                  placeholder="Your Business Name"
                  required
                />
              </div>

              <div class="form-group">
                <label for="companyEmail" class="form-label">Business Email *</label>
                <input
                  id="companyEmail"
                  v-model="invoiceData.company.email"
                  type="email"
                  class="form-control"
                  placeholder="hello@yourbusiness.com"
                  required
                />
              </div>

              <div class="form-group">
                <label for="companyPhone" class="form-label">Phone Number</label>
                <input
                  id="companyPhone"
                  v-model="invoiceData.company.phone"
                  type="tel"
                  class="form-control"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div class="form-group full-width">
                <label for="companyAddress" class="form-label">Business Address</label>
                <textarea
                  id="companyAddress"
                  v-model="invoiceData.company.address"
                  class="form-control"
                  rows="3"
                  placeholder="123 Business Street&#10;Suite 100&#10;City, State 12345"
                ></textarea>
              </div>

              <div class="form-group full-width">
                <label class="form-label">Business Logo</label>
                <div class="logo-upload">
                  <div v-if="!invoiceData.company.logo" class="upload-area" @click="triggerFileUpload">
                    <i class="bi bi-cloud-upload"></i>
                    <p>Click to upload your logo</p>
                    <small>PNG, JPG, SVG up to 2MB</small>
                  </div>
                  <div v-else class="logo-preview">
                    <img :src="invoiceData.company.logo" alt="Company Logo" />
                    <button @click="removeLogo" class="remove-logo">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    @change="handleFileUpload"
                    style="display: none;"
                  />
                </div>
              </div>
            </div>

            <!-- Brand Colors -->
            <div class="brand-colors">
              <h4>Brand Colors</h4>
              <div class="color-grid">
                <div class="color-input">
                  <label>Primary Color</label>
                  <input
                    v-model="invoiceData.branding.primaryColor"
                    type="color"
                    class="color-picker"
                  />
                  <span>{{ invoiceData.branding.primaryColor }}</span>
                </div>
                <div class="color-input">
                  <label>Accent Color</label>
                  <input
                    v-model="invoiceData.branding.accentColor"
                    type="color"
                    class="color-picker"
                  />
                  <span>{{ invoiceData.branding.accentColor }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Customer Information -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <h3>Customer Information</h3>
            <p>Who are you invoicing?</p>
          </div>

          <div class="customer-form">
            <div class="customer-selector">
              <div class="selector-options">
                <button
                  class="option-btn"
                  :class="{ 'active': customerMode === 'existing' }"
                  @click="customerMode = 'existing'"
                >
                  <i class="bi bi-people"></i>
                  Existing Customer
                </button>
                <button
                  class="option-btn"
                  :class="{ 'active': customerMode === 'new' }"
                  @click="customerMode = 'new'"
                >
                  <i class="bi bi-person-plus"></i>
                  New Customer
                </button>
              </div>
            </div>

            <!-- Existing Customer -->
            <div v-if="customerMode === 'existing'" class="existing-customer">
              <div class="form-group">
                <label class="form-label">Search Customers</label>
                <div class="customer-search">
                  <input
                    v-model="customerSearch"
                    type="text"
                    class="form-control"
                    placeholder="Search by name or email..."
                    @input="searchCustomers"
                  />
                  <i class="bi bi-search search-icon"></i>
                </div>
                <div v-if="searchResults.length" class="search-results">
                  <div
                    v-for="customer in searchResults"
                    :key="customer.id"
                    class="customer-result"
                    @click="selectCustomer(customer)"
                  >
                    <div class="customer-info">
                      <h5>{{ customer.name }}</h5>
                      <p>{{ customer.email }}</p>
                    </div>
                    <i class="bi bi-chevron-right"></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- New Customer -->
            <div v-if="customerMode === 'new'" class="new-customer">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Customer Name *</label>
                  <input
                    v-model="invoiceData.customer.name"
                    type="text"
                    class="form-control"
                    placeholder="Customer or Company Name"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Email Address *</label>
                  <input
                    v-model="invoiceData.customer.email"
                    type="email"
                    class="form-control"
                    placeholder="customer@email.com"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Phone Number</label>
                  <input
                    v-model="invoiceData.customer.phone"
                    type="tel"
                    class="form-control"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div class="form-group full-width">
                  <label class="form-label">Billing Address</label>
                  <textarea
                    v-model="invoiceData.customer.address"
                    class="form-control"
                    rows="3"
                    placeholder="123 Customer Street&#10;City, State 12345"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Invoice Details -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-header">
            <h3>Invoice Details</h3>
            <p>Set up your invoice information and line items</p>
          </div>

          <div class="invoice-details-form">
            <!-- Invoice Meta -->
            <div class="invoice-meta-form">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Invoice Number *</label>
                  <div class="input-group">
                    <input
                      v-model="invoiceData.invoice_number"
                      type="text"
                      class="form-control"
                      placeholder="INV-001"
                      required
                    />
                    <button class="btn btn-outline-secondary" @click="generateInvoiceNumber">
                      <i class="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Issue Date *</label>
                  <input
                    v-model="invoiceData.issue_date"
                    type="date"
                    class="form-control"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Due Date *</label>
                  <input
                    v-model="invoiceData.due_date"
                    type="date"
                    class="form-control"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Payment Terms</label>
                  <select v-model="invoiceData.payment_terms" class="form-control">
                    <option value="net30">Net 30 days</option>
                    <option value="net15">Net 15 days</option>
                    <option value="net7">Net 7 days</option>
                    <option value="due_on_receipt">Due on Receipt</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Line Items -->
            <div class="line-items-section">
              <div class="section-header">
                <h4>Line Items</h4>
                <button class="btn btn-primary" @click="addLineItem">
                  <i class="bi bi-plus-lg"></i>
                  Add Item
                </button>
              </div>

              <div class="line-items-table">
                <div class="table-header">
                  <div class="col-description">Description</div>
                  <div class="col-quantity">Qty</div>
                  <div class="col-rate">Rate</div>
                  <div class="col-amount">Amount</div>
                  <div class="col-actions">Actions</div>
                </div>

                <div
                  v-for="(item, index) in invoiceData.items"
                  :key="item.id || index"
                  class="table-row"
                >
                  <div class="col-description">
                    <input
                      v-model="item.description"
                      type="text"
                      class="form-control"
                      placeholder="Description of service or product"
                      @input="calculateItemAmount(index)"
                    />
                  </div>
                  <div class="col-quantity">
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      class="form-control"
                      min="0"
                      step="0.01"
                      @input="calculateItemAmount(index)"
                    />
                  </div>
                  <div class="col-rate">
                    <div class="input-group">
                      <span class="input-group-text">$</span>
                      <input
                        v-model.number="item.rate"
                        type="number"
                        class="form-control"
                        min="0"
                        step="0.01"
                        @input="calculateItemAmount(index)"
                      />
                    </div>
                  </div>
                  <div class="col-amount">
                    <span class="amount-display">{{ formatCurrency(item.amount || 0) }}</span>
                  </div>
                  <div class="col-actions">
                    <button
                      class="btn btn-outline-danger btn-sm"
                      @click="removeLineItem(index)"
                      :disabled="invoiceData.items.length === 1"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Totals Section -->
            <div class="totals-section">
              <div class="totals-form">
                <div class="total-row">
                  <label>Subtotal:</label>
                  <span class="total-value">{{ formatCurrency(calculatedSubtotal) }}</span>
                </div>

                <div class="total-row">
                  <label for="taxRate">Tax Rate (%):</label>
                  <div class="tax-input">
                    <input
                      id="taxRate"
                      v-model.number="invoiceData.tax_rate"
                      type="number"
                      class="form-control"
                      min="0"
                      max="100"
                      step="0.01"
                      @input="calculateTotals"
                    />
                    <span class="tax-amount">{{ formatCurrency(calculatedTax) }}</span>
                  </div>
                </div>

                <div class="total-row final-total">
                  <label>Total:</label>
                  <span class="total-value">{{ formatCurrency(calculatedTotal) }}</span>
                </div>
              </div>
            </div>

            <!-- Notes & Terms -->
            <div class="notes-terms-section">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="invoiceData.notes"
                    class="form-control"
                    rows="3"
                    placeholder="Thank you for your business!"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label class="form-label">Terms & Conditions</label>
                  <textarea
                    v-model="invoiceData.terms"
                    class="form-control"
                    rows="3"
                    placeholder="Payment terms and conditions..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 5: Preview & Send -->
        <div v-if="currentStep === 4" class="step-content">
          <div class="step-header">
            <h3>Preview & Send</h3>
            <p>Review your invoice and choose how to deliver it</p>
          </div>

          <div class="preview-section">
            <div class="preview-container">
              <div class="preview-header">
                <h4>Invoice Preview</h4>
                <div class="preview-actions">
                  <button class="btn btn-outline-primary" @click="downloadPDF">
                    <i class="bi bi-download"></i>
                    Download PDF
                  </button>
                  <button class="btn btn-outline-secondary" @click="printInvoice">
                    <i class="bi bi-printer"></i>
                    Print
                  </button>
                </div>
              </div>

              <div class="invoice-preview-wrapper">
                <InvoicePreview :template="invoiceData.template" :invoice="finalInvoiceData" />
              </div>
            </div>

            <!-- Delivery Options -->
            <div class="delivery-section">
              <h4>How would you like to send this invoice?</h4>
              <div class="delivery-options">
                <div class="delivery-option" :class="{ 'selected': deliveryMethod === 'email' }" @click="deliveryMethod = 'email'">
                  <i class="bi bi-envelope"></i>
                  <div class="option-info">
                    <h5>Email Invoice</h5>
                    <p>Send a beautifully formatted email with PDF attachment</p>
                  </div>
                </div>
                <div class="delivery-option" :class="{ 'selected': deliveryMethod === 'link' }" @click="deliveryMethod = 'link'">
                  <i class="bi bi-link-45deg"></i>
                  <div class="option-info">
                    <h5>Share Link</h5>
                    <p>Generate a secure link your customer can view online</p>
                  </div>
                </div>
                <div class="delivery-option" :class="{ 'selected': deliveryMethod === 'save' }" @click="deliveryMethod = 'save'">
                  <i class="bi bi-save"></i>
                  <div class="option-info">
                    <h5>Save Draft</h5>
                    <p>Save as draft and send later</p>
                  </div>
                </div>
              </div>

              <!-- Email Options -->
              <div v-if="deliveryMethod === 'email'" class="email-options">
                <div class="form-group">
                  <label class="form-label">Email Subject</label>
                  <input
                    v-model="emailSubject"
                    type="text"
                    class="form-control"
                    :placeholder="`Invoice ${invoiceData.invoice_number} from ${invoiceData.company.name}`"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Email Message</label>
                  <textarea
                    v-model="emailMessage"
                    class="form-control"
                    rows="4"
                    placeholder="Hi [Customer Name],&#10;&#10;Please find attached invoice [Invoice Number]. Payment is due by [Due Date].&#10;&#10;Thank you for your business!"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Wizard Navigation -->
      <div class="wizard-navigation">
        <button
          v-if="currentStep > 0"
          class="btn btn-outline-secondary"
          @click="previousStep"
        >
          <i class="bi bi-arrow-left"></i>
          Previous
        </button>

        <div class="nav-spacer"></div>

        <button
          v-if="currentStep < steps.length - 1"
          class="btn btn-primary"
          @click="nextStep"
          :disabled="!canProceed"
        >
          Next
          <i class="bi bi-arrow-right"></i>
        </button>

        <button
          v-if="currentStep === steps.length - 1"
          class="btn btn-success"
          @click="sendInvoice"
          :disabled="!canSend"
        >
          <i class="bi bi-send"></i>
          {{ deliveryMethod === 'save' ? 'Save Invoice' : deliveryMethod === 'email' ? 'Send Invoice' : 'Create Link' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import InvoiceTemplates from './InvoiceTemplates.vue'
import InvoicePreview from './InvoicePreview.vue'

export default {
  name: 'InvoiceWizard',
  components: {
    InvoiceTemplates,
    InvoicePreview
  },
  emits: ['invoice-created', 'close'],
  data() {
    return {
      currentStep: 0,
      customerMode: 'new',
      customerSearch: '',
      searchResults: [],
      deliveryMethod: 'email',
      emailSubject: '',
      emailMessage: '',

      steps: [
        { id: 'template', title: 'Template' },
        { id: 'business', title: 'Business' },
        { id: 'customer', title: 'Customer' },
        { id: 'details', title: 'Details' },
        { id: 'preview', title: 'Preview & Send' }
      ],

      invoiceData: {
        template: null,
        invoice_number: (() => {
          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
          return `INV-${year}-${month}-${random}`
        })(),
        issue_date: new Date().toISOString().split('T')[0],
        due_date: (() => {
          const date = new Date()
          date.setDate(date.getDate() + 30)
          return date.toISOString().split('T')[0]
        })(),
        payment_terms: 'net30',
        company: {
          name: '',
          email: '',
          phone: '',
          address: '',
          logo: null
        },
        customer: {
          name: '',
          email: '',
          phone: '',
          address: ''
        },
        items: [
          {
            description: '',
            quantity: 1,
            rate: 0,
            amount: 0
          }
        ],
        subtotal: 0,
        tax_rate: 0,
        tax_amount: 0,
        total: 0,
        notes: 'Thank you for your business!',
        terms: 'Payment is due within 30 days.',
        branding: {
          primaryColor: '#3b82f6',
          accentColor: '#1e40af'
        }
      }
    }
  },

  computed: {
    canProceed() {
      switch (this.currentStep) {
        case 0: // Template
          return !!this.invoiceData.template
        case 1: // Business
          return this.invoiceData.company.name && this.invoiceData.company.email
        case 2: // Customer
          return this.invoiceData.customer.name && this.invoiceData.customer.email
        case 3: // Details
          return this.invoiceData.invoice_number &&
                 this.invoiceData.issue_date &&
                 this.invoiceData.due_date &&
                 this.invoiceData.items.some(item => item.description && item.quantity > 0 && item.rate > 0)
        default:
          return true
      }
    },

    canSend() {
      return this.canProceed && !!this.deliveryMethod
    },

    calculatedSubtotal() {
      return this.invoiceData.items.reduce((sum, item) => sum + (item.amount || 0), 0)
    },

    calculatedTax() {
      return this.calculatedSubtotal * (this.invoiceData.tax_rate / 100)
    },

    calculatedTotal() {
      return this.calculatedSubtotal + this.calculatedTax
    },

    finalInvoiceData() {
      return {
        ...this.invoiceData,
        subtotal: this.calculatedSubtotal,
        tax_amount: this.calculatedTax,
        total: this.calculatedTotal
      }
    }
  },

  watch: {
    calculatedSubtotal() {
      this.calculateTotals()
    }
  },

  methods: {
    // Navigation
    nextStep() {
      if (this.canProceed && this.currentStep < this.steps.length - 1) {
        this.currentStep++
      }
    },

    previousStep() {
      if (this.currentStep > 0) {
        this.currentStep--
      }
    },

    goToStep(stepIndex) {
      if (stepIndex <= this.currentStep || stepIndex === this.currentStep + 1) {
        this.currentStep = stepIndex
      }
    },

    // Template Selection
    onTemplateSelected(template) {
      this.invoiceData.template = template
      // Update branding colors based on template
      if (template.colors) {
        this.invoiceData.branding.primaryColor = template.colors.primary
        this.invoiceData.branding.accentColor = template.colors.accent
      }
    },

    // File Upload
    triggerFileUpload() {
      this.$refs.fileInput.click()
    },

    handleFileUpload(event) {
      const file = event.target.files[0]
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.invoiceData.company.logo = e.target.result
        }
        reader.readAsDataURL(file)
      }
    },

    removeLogo() {
      this.invoiceData.company.logo = null
    },

    // Customer Management
    async searchCustomers() {
      if (this.customerSearch.length < 2) {
        this.searchResults = []
        return
      }

      // Simulate API call
      // In real implementation, call your API
      this.searchResults = [
        {
          id: 1,
          name: 'Acme Corporation',
          email: 'billing@acme.com',
          phone: '+1 (555) 123-4567',
          address: '123 Business Ave\nSuite 100\nNew York, NY 10001'
        },
        {
          id: 2,
          name: 'Tech Solutions Inc',
          email: 'accounts@techsolutions.com',
          phone: '+1 (555) 987-6543',
          address: '456 Tech Park\nBuilding B\nSan Francisco, CA 94105'
        }
      ].filter(customer =>
        customer.name.toLowerCase().includes(this.customerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(this.customerSearch.toLowerCase())
      )
    },

    selectCustomer(customer) {
      this.invoiceData.customer = { ...customer }
      this.searchResults = []
      this.customerSearch = customer.name
    },

    // Line Items
    addLineItem() {
      this.invoiceData.items.push({
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      })
    },

    removeLineItem(index) {
      if (this.invoiceData.items.length > 1) {
        this.invoiceData.items.splice(index, 1)
        this.calculateTotals()
      }
    },

    calculateItemAmount(index) {
      const item = this.invoiceData.items[index]
      item.amount = (item.quantity || 0) * (item.rate || 0)
      this.calculateTotals()
    },

    calculateTotals() {
      this.invoiceData.subtotal = this.calculatedSubtotal
      this.invoiceData.tax_amount = this.calculatedTax
      this.invoiceData.total = this.calculatedTotal
    },

    // Utility Functions
    generateInvoiceNumber() {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      return `INV-${year}-${month}-${random}`
    },

    getDefaultDueDate() {
      const date = new Date()
      date.setDate(date.getDate() + 30)
      return date.toISOString().split('T')[0]
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount || 0)
    },

    // Actions
    downloadPDF() {
      // Implement PDF generation
      console.log('Downloading PDF...', this.finalInvoiceData)
    },

    printInvoice() {
      window.print()
    },

    async sendInvoice() {
      try {
        const invoicePayload = {
          ...this.finalInvoiceData,
          delivery_method: this.deliveryMethod,
          email_subject: this.emailSubject,
          email_message: this.emailMessage
        }

        // Simulate API call
        console.log('Sending invoice...', invoicePayload)

        // Emit success
        this.$emit('invoice-created', invoicePayload)

        // Show success message or close wizard
        alert('Invoice created successfully!')

      } catch (error) {
        console.error('Error sending invoice:', error)
        alert('Error creating invoice. Please try again.')
      }
    },

    formatDate(date) {
      if (!date) return ''
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  },

  mounted() {
    // Set default email content
    this.emailSubject = `Invoice ${this.invoiceData.invoice_number} from ${this.invoiceData.company.name || 'Your Business'}`
    this.emailMessage = `Hi ${this.invoiceData.customer.name || '[Customer Name]'},

Please find attached invoice ${this.invoiceData.invoice_number}. Payment is due by ${this.invoiceData.due_date}.

Thank you for your business!

Best regards,
${this.invoiceData.company.name || 'Your Business Name'}`
  }
}
</script>

<style scoped>
.invoice-wizard {
  height: 100vh;
  overflow: auto;
  background: var(--bs-body-bg);
}

.wizard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Wizard Header */
.wizard-header {
  margin-bottom: 3rem;
}

.wizard-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.wizard-title i {
  color: var(--bs-primary);
  font-size: 1.75rem;
}

.wizard-progress {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 1rem;
  border-radius: var(--bs-border-radius-lg);
  position: relative;
}

.progress-step:hover:not(.disabled) {
  background: var(--bs-gray-100);
}

.progress-step.active {
  color: var(--bs-primary);
}

.progress-step.completed {
  color: var(--bs-success);
}

.progress-step.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-indicator {
  width: 40px;
  height: 40px;
  border: 2px solid var(--bs-gray-300);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
}

.progress-step.active .step-indicator {
  border-color: var(--bs-primary);
  background: var(--bs-primary);
  color: white;
}

.progress-step.completed .step-indicator {
  border-color: var(--bs-success);
  background: var(--bs-success);
  color: white;
}

.step-label {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

/* Step Content */
.wizard-content {
  flex: 1;
  margin-bottom: 2rem;
}

.step-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-header {
  text-align: center;
  margin-bottom: 3rem;
}

.step-header h3 {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 1rem;
}

.step-header p {
  font-size: 1.1rem;
  color: var(--bs-gray-600);
}

/* Form Styles */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--bs-body-color);
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  font-size: 1rem;
  line-height: 1.5;
  color: var(--bs-body-color);
  background: var(--bs-body-bg);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: var(--bs-primary);
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

.input-group {
  display: flex;
  width: 100%;
}

.input-group .form-control {
  border-radius: 0 var(--bs-border-radius) var(--bs-border-radius) 0;
  border-left: none;
}

.input-group-text {
  padding: 0.75rem 1rem;
  background: var(--bs-gray-100);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius) 0 0 var(--bs-border-radius);
  border-right: none;
  font-weight: 500;
  color: var(--bs-gray-600);
}

/* Logo Upload */
.logo-upload {
  border: 2px dashed var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logo-upload:hover {
  border-color: var(--bs-primary);
  background: var(--bs-gray-50);
}

.upload-area i {
  font-size: 2rem;
  color: var(--bs-gray-400);
  margin-bottom: 1rem;
}

.upload-area p {
  font-weight: 500;
  color: var(--bs-gray-600);
  margin-bottom: 0.5rem;
}

.upload-area small {
  color: var(--bs-gray-500);
}

.logo-preview {
  position: relative;
  display: inline-block;
}

.logo-preview img {
  max-width: 150px;
  max-height: 80px;
  border-radius: var(--bs-border-radius);
}

.remove-logo {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--bs-danger);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

/* Brand Colors */
.brand-colors {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--bs-gray-50);
  border-radius: var(--bs-border-radius-lg);
}

.brand-colors h4 {
  margin-bottom: 1rem;
  color: var(--bs-body-color);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.color-input {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-picker {
  width: 40px;
  height: 40px;
  border: 2px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  cursor: pointer;
}

.color-input span {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--bs-gray-600);
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--bs-border-radius-sm);
  border: 1px solid var(--bs-border-color);
}

/* Customer Section */
.customer-selector {
  margin-bottom: 2rem;
}

.selector-options {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border: 2px solid var(--bs-border-color);
  background: var(--bs-body-bg);
  border-radius: var(--bs-border-radius-lg);
  color: var(--bs-body-color);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.option-btn:hover {
  border-color: var(--bs-primary);
  background: var(--bs-gray-50);
}

.option-btn.active {
  border-color: var(--bs-primary);
  background: var(--bs-primary);
  color: white;
}

/* Customer Search */
.customer-search {
  position: relative;
}

.search-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--bs-gray-400);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--bs-border-color);
  border-top: none;
  border-radius: 0 0 var(--bs-border-radius) var(--bs-border-radius);
  box-shadow: var(--bs-box-shadow);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
}

.customer-result {
  padding: 1rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--bs-border-color);
  transition: background 0.2s ease;
}

.customer-result:hover {
  background: var(--bs-gray-50);
}

.customer-result:last-child {
  border-bottom: none;
}

.customer-info h5 {
  margin: 0;
  font-weight: 600;
}

.customer-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--bs-gray-600);
}

/* Line Items */
.line-items-section {
  margin: 2rem 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h4 {
  margin: 0;
  color: var(--bs-body-color);
}

.line-items-table {
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 80px 120px 120px 60px;
  gap: 1rem;
  background: var(--bs-gray-100);
  padding: 1rem;
  font-weight: 600;
  color: var(--bs-body-color);
  border-bottom: 1px solid var(--bs-border-color);
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 80px 120px 120px 60px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--bs-border-color);
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.amount-display {
  font-weight: 600;
  color: var(--bs-success);
}

/* Totals */
.totals-section {
  display: flex;
  justify-content: flex-end;
  margin: 2rem 0;
}

.totals-form {
  min-width: 300px;
  background: var(--bs-gray-50);
  padding: 1.5rem;
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--bs-border-color);
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--bs-border-color);
}

.total-row:last-child {
  border-bottom: none;
}

.total-row.final-total {
  border-top: 2px solid var(--bs-primary);
  margin-top: 0.75rem;
  padding-top: 1rem;
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--bs-primary);
}

.tax-input {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tax-input .form-control {
  width: 80px;
}

.tax-amount {
  font-weight: 500;
  color: var(--bs-gray-600);
}

.total-value {
  font-weight: 600;
  color: var(--bs-success);
}

/* Preview Section */
.preview-container {
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--bs-border-color);
}

.preview-actions {
  display: flex;
  gap: 0.75rem;
}

.invoice-preview-wrapper {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: var(--bs-border-radius);
  overflow: auto;
}

/* Delivery Options */
.delivery-section {
  margin-top: 2rem;
}

.delivery-section h4 {
  margin-bottom: 1.5rem;
  color: var(--bs-body-color);
}

.delivery-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.delivery-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  cursor: pointer;
  transition: all 0.3s ease;
}

.delivery-option:hover {
  border-color: var(--bs-primary);
  background: var(--bs-gray-50);
}

.delivery-option.selected {
  border-color: var(--bs-primary);
  background: rgba(var(--bs-primary-rgb), 0.1);
}

.delivery-option i {
  font-size: 1.5rem;
  color: var(--bs-primary);
}

.option-info h5 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: var(--bs-body-color);
}

.option-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--bs-gray-600);
}

.email-options {
  background: var(--bs-gray-50);
  padding: 1.5rem;
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--bs-border-color);
}

/* Navigation */
.wizard-navigation {
  display: flex;
  align-items: center;
  padding: 1.5rem 0;
  border-top: 1px solid var(--bs-border-color);
}

.nav-spacer {
  flex: 1;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: var(--bs-border-radius);
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--bs-primary);
  border-color: var(--bs-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--bs-primary) 85%, black);
  border-color: color-mix(in srgb, var(--bs-primary) 85%, black);
}

.btn-success {
  background: var(--bs-success);
  border-color: var(--bs-success);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: color-mix(in srgb, var(--bs-success) 85%, black);
  border-color: color-mix(in srgb, var(--bs-success) 85%, black);
}

.btn-outline-secondary {
  border-color: var(--bs-border-color);
  color: var(--bs-gray-600);
  background: var(--bs-body-bg);
}

.btn-outline-secondary:hover:not(:disabled) {
  background: var(--bs-gray-100);
  border-color: var(--bs-gray-300);
}

.btn-outline-primary {
  border-color: var(--bs-primary);
  color: var(--bs-primary);
  background: transparent;
}

.btn-outline-primary:hover:not(:disabled) {
  background: var(--bs-primary);
  color: white;
}

.btn-outline-danger {
  border-color: var(--bs-danger);
  color: var(--bs-danger);
  background: transparent;
}

.btn-outline-danger:hover:not(:disabled) {
  background: var(--bs-danger);
  color: white;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .wizard-container {
    padding: 1rem;
  }

  .wizard-progress {
    flex-direction: column;
    gap: 0.5rem;
  }

  .progress-step {
    flex-direction: row;
    padding: 0.75rem;
  }

  .step-indicator {
    margin-bottom: 0;
    margin-right: 0.75rem;
    width: 32px;
    height: 32px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .selector-options {
    flex-direction: column;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .delivery-options {
    grid-template-columns: 1fr;
  }

  .preview-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .preview-actions {
    justify-content: center;
  }
}

/* Dark theme support */
[data-theme="dark"] .logo-upload {
  background: var(--bs-gray-800);
  border-color: var(--bs-gray-600);
}

[data-theme="dark"] .logo-upload:hover {
  background: var(--bs-gray-700);
}

[data-theme="dark"] .brand-colors {
  background: var(--bs-gray-800);
}

[data-theme="dark"] .color-input span {
  background: var(--bs-gray-700);
  border-color: var(--bs-gray-600);
}

[data-theme="dark"] .search-results {
  background: var(--bs-gray-800);
  border-color: var(--bs-gray-600);
}

[data-theme="dark"] .customer-result:hover {
  background: var(--bs-gray-700);
}

[data-theme="dark"] .table-header {
  background: var(--bs-gray-800);
}

[data-theme="dark"] .totals-form {
  background: var(--bs-gray-800);
  border-color: var(--bs-gray-600);
}

[data-theme="dark"] .preview-container {
  background: var(--bs-gray-800);
  border-color: var(--bs-gray-600);
}

[data-theme="dark"] .email-options {
  background: var(--bs-gray-800);
  border-color: var(--bs-gray-600);
}
</style>