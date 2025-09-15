<template>
  <div class="invoice-preview" :class="template?.style">
    <div class="invoice-container" :style="templateStyles">
      <!-- Modern Blue Template -->
      <div v-if="template?.id === 'modern-blue'" class="invoice-template modern-blue">
        <div class="invoice-header">
          <div class="company-info">
            <div class="company-logo">
              <div v-if="!invoice.company.logo" class="logo-placeholder">
                {{ invoice.company.name.charAt(0) }}
              </div>
              <img v-else :src="invoice.company.logo" alt="Company Logo" />
            </div>
            <div class="company-details">
              <h2 class="company-name">{{ invoice.company.name }}</h2>
              <div class="contact-info">
                <p>{{ invoice.company.email }}</p>
                <p>{{ invoice.company.phone }}</p>
              </div>
            </div>
          </div>
          <div class="invoice-title-section">
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-meta">
              <p><strong>Invoice #:</strong> {{ invoice.invoice_number }}</p>
              <p><strong>Date:</strong> {{ formatDate(invoice.issue_date) }}</p>
              <p><strong>Due Date:</strong> {{ formatDate(invoice.due_date) }}</p>
            </div>
          </div>
        </div>

        <div class="billing-section">
          <div class="bill-to">
            <h3>Bill To:</h3>
            <div class="customer-info">
              <p class="customer-name">{{ invoice.customer.name }}</p>
              <p>{{ invoice.customer.email }}</p>
              <div class="address" v-html="formatAddress(invoice.customer.address)"></div>
            </div>
          </div>
          <div class="bill-from">
            <h3>From:</h3>
            <div class="company-address" v-html="formatAddress(invoice.company.address)"></div>
          </div>
        </div>

        <div class="invoice-items">
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoice.items" :key="item.id || item.description">
                <td>{{ item.description }}</td>
                <td class="text-center">{{ item.quantity }}</td>
                <td class="text-right">{{ formatCurrency(item.rate) }}</td>
                <td class="text-right">{{ formatCurrency(item.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="invoice-totals">
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>{{ formatCurrency(invoice.subtotal) }}</span>
            </div>
            <div class="total-row" v-if="invoice.tax_rate > 0">
              <span>Tax ({{ invoice.tax_rate }}%):</span>
              <span>{{ formatCurrency(invoice.tax_amount) }}</span>
            </div>
            <div class="total-row final">
              <span>Total:</span>
              <span>{{ formatCurrency(invoice.total) }}</span>
            </div>
          </div>
        </div>

        <div class="invoice-footer">
          <div class="notes-section" v-if="invoice.notes">
            <h4>Notes:</h4>
            <p>{{ invoice.notes }}</p>
          </div>
          <div class="terms-section" v-if="invoice.terms">
            <h4>Terms & Conditions:</h4>
            <p>{{ invoice.terms }}</p>
          </div>
        </div>
      </div>

      <!-- Elegant Purple Template -->
      <div v-else-if="template?.id === 'elegant-purple'" class="invoice-template elegant-purple">
        <div class="elegant-header">
          <div class="header-decoration"></div>
          <div class="header-content">
            <div class="brand-section">
              <div class="elegant-logo">{{ invoice.company.name.charAt(0) }}</div>
              <h2 class="elegant-company-name">{{ invoice.company.name }}</h2>
            </div>
            <div class="invoice-details">
              <h1 class="elegant-title">Invoice</h1>
              <div class="elegant-meta">
                <div>{{ invoice.invoice_number }}</div>
                <div>{{ formatDate(invoice.issue_date) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="elegant-body">
          <div class="elegant-billing">
            <div class="elegant-customer">
              <h3>Invoiced To</h3>
              <div class="customer-details">
                <p class="customer-name">{{ invoice.customer.name }}</p>
                <p class="customer-email">{{ invoice.customer.email }}</p>
                <div class="customer-address" v-html="formatAddress(invoice.customer.address)"></div>
              </div>
            </div>
            <div class="elegant-due">
              <div class="due-badge">
                <span>Due Date</span>
                <strong>{{ formatDate(invoice.due_date) }}</strong>
              </div>
            </div>
          </div>

          <div class="elegant-items">
            <div class="items-header">
              <h3>Services & Products</h3>
            </div>
            <div class="elegant-table">
              <div class="table-header">
                <div class="col-desc">Description</div>
                <div class="col-qty">Qty</div>
                <div class="col-rate">Rate</div>
                <div class="col-amount">Amount</div>
              </div>
              <div class="table-body">
                <div v-for="item in invoice.items" :key="item.id || item.description" class="table-row">
                  <div class="col-desc">{{ item.description }}</div>
                  <div class="col-qty">{{ item.quantity }}</div>
                  <div class="col-rate">{{ formatCurrency(item.rate) }}</div>
                  <div class="col-amount">{{ formatCurrency(item.amount) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="elegant-totals">
            <div class="totals-wrapper">
              <div class="total-item">
                <span>Subtotal</span>
                <span>{{ formatCurrency(invoice.subtotal) }}</span>
              </div>
              <div class="total-item" v-if="invoice.tax_rate > 0">
                <span>Tax ({{ invoice.tax_rate }}%)</span>
                <span>{{ formatCurrency(invoice.tax_amount) }}</span>
              </div>
              <div class="total-item final">
                <span>Total Amount</span>
                <span>{{ formatCurrency(invoice.total) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="elegant-footer">
          <div class="footer-content">
            <div class="footer-notes" v-if="invoice.notes">
              <h4>Thank You!</h4>
              <p>{{ invoice.notes }}</p>
            </div>
            <div class="footer-contact">
              <p>{{ invoice.company.email }} • {{ invoice.company.phone }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Add other templates here (Minimal Green, Corporate Navy, etc.) -->
      <div v-else class="invoice-template default">
        <!-- Default/fallback template -->
        <div class="simple-header">
          <h1>INVOICE</h1>
          <div class="invoice-info">
            <p>{{ invoice.invoice_number }}</p>
            <p>{{ formatDate(invoice.issue_date) }}</p>
          </div>
        </div>

        <div class="simple-content">
          <div class="simple-billing">
            <div class="bill-to">
              <h3>Bill To:</h3>
              <p>{{ invoice.customer.name }}</p>
              <p>{{ invoice.customer.email }}</p>
            </div>
          </div>

          <table class="simple-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoice.items" :key="item.id || item.description">
                <td>{{ item.description }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ formatCurrency(item.rate) }}</td>
                <td>{{ formatCurrency(item.amount) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="simple-total">
            <p>Total: {{ formatCurrency(invoice.total) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InvoicePreview',
  props: {
    template: {
      type: Object,
      required: true
    },
    invoice: {
      type: Object,
      required: true
    }
  },
  computed: {
    templateStyles() {
      if (!this.template?.colors) return {}
      return {
        '--template-primary': this.template.colors.primary,
        '--template-secondary': this.template.colors.secondary,
        '--template-accent': this.template.colors.accent
      }
    }
  },
  methods: {
    formatDate(date) {
      if (!date) return ''
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },

    formatCurrency(amount) {
      if (!amount) return '$0.00'
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    },

    formatAddress(address) {
      if (!address) return ''
      return address.replace(/\n/g, '<br>')
    }
  }
}
</script>

<style scoped>
.invoice-preview {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1a1a1a;
}

.invoice-container {
  background: white;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

/* Modern Blue Template */
.modern-blue {
  font-family: 'Inter', sans-serif;
}

.modern-blue .invoice-header {
  background: linear-gradient(135deg, var(--template-primary) 0%, var(--template-accent) 100%);
  color: white;
  padding: 2.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.modern-blue .company-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.modern-blue .company-logo .logo-placeholder {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  backdrop-filter: blur(10px);
}

.modern-blue .company-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.modern-blue .contact-info p {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.9;
}

.modern-blue .invoice-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  text-align: right;
}

.modern-blue .invoice-meta p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  text-align: right;
}

.modern-blue .billing-section {
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.modern-blue .bill-to h3,
.modern-blue .bill-from h3 {
  color: var(--template-primary);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 1rem;
}

.modern-blue .customer-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
}

.modern-blue .items-table {
  width: 100%;
  margin: 2rem;
  border-collapse: collapse;
}

.modern-blue .items-table th {
  background: var(--template-secondary);
  color: var(--template-primary);
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1rem;
  text-align: left;
}

.modern-blue .items-table td {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.modern-blue .items-table tbody tr:hover {
  background: #fafbfc;
}

.modern-blue .invoice-totals {
  padding: 2rem;
  display: flex;
  justify-content: flex-end;
}

.modern-blue .totals-section {
  min-width: 300px;
}

.modern-blue .total-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.modern-blue .total-row.final {
  border-top: 2px solid var(--template-primary);
  margin-top: 1rem;
  padding-top: 1rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--template-primary);
}

.modern-blue .invoice-footer {
  padding: 2rem;
  background: #fafbfc;
  border-top: 1px solid #e5e7eb;
}

.modern-blue .notes-section h4,
.modern-blue .terms-section h4 {
  color: var(--template-primary);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
}

.modern-blue .notes-section p,
.modern-blue .terms-section p {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #6b7280;
  margin-bottom: 1rem;
}

/* Elegant Purple Template */
.elegant-purple {
  font-family: 'Georgia', serif;
  color: #2d1b69;
}

.elegant-purple .elegant-header {
  position: relative;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  padding: 3rem 2rem 2rem;
  overflow: hidden;
}

.elegant-purple .header-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, var(--template-primary), var(--template-accent));
  border-radius: 50%;
  transform: translate(50%, -50%);
  opacity: 0.1;
}

.elegant-purple .header-content {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.elegant-purple .brand-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.elegant-purple .elegant-logo {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, var(--template-primary), var(--template-accent));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: bold;
  font-family: 'Inter', sans-serif;
}

.elegant-purple .elegant-company-name {
  font-size: 1.75rem;
  font-weight: 400;
  margin: 0;
  color: var(--template-primary);
}

.elegant-purple .elegant-title {
  font-size: 3rem;
  font-weight: 300;
  margin: 0;
  color: var(--template-primary);
  font-style: italic;
}

.elegant-purple .elegant-meta div {
  font-size: 0.875rem;
  color: var(--template-accent);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.elegant-purple .elegant-body {
  padding: 2rem;
}

.elegant-purple .elegant-billing {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e0e7ff;
}

.elegant-purple .elegant-customer h3 {
  font-size: 0.875rem;
  color: var(--template-primary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1.25rem;
  font-weight: 600;
}

.elegant-purple .customer-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.elegant-purple .due-badge {
  background: linear-gradient(135deg, var(--template-primary), var(--template-accent));
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  text-align: center;
  min-width: 150px;
}

.elegant-purple .due-badge span {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
  opacity: 0.8;
}

.elegant-purple .due-badge strong {
  font-size: 1rem;
  font-weight: 600;
}

.elegant-purple .items-header h3 {
  font-size: 1.25rem;
  color: var(--template-primary);
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.elegant-purple .elegant-table {
  border: 1px solid #e0e7ff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 2rem;
}

.elegant-purple .table-header {
  background: linear-gradient(135deg, var(--template-primary), var(--template-accent));
  color: white;
  display: grid;
  grid-template-columns: 2fr 80px 120px 120px;
  padding: 1.25rem 1.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.elegant-purple .table-row {
  display: grid;
  grid-template-columns: 2fr 80px 120px 120px;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f4ff;
}

.elegant-purple .table-row:last-child {
  border-bottom: none;
}

.elegant-purple .table-row:hover {
  background: #faf9ff;
}

.elegant-purple .col-qty,
.elegant-purple .col-rate,
.elegant-purple .col-amount {
  text-align: right;
}

.elegant-purple .elegant-totals {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2rem;
}

.elegant-purple .totals-wrapper {
  min-width: 300px;
  background: #faf9ff;
  border: 1px solid #e0e7ff;
  border-radius: 12px;
  padding: 1.5rem;
}

.elegant-purple .total-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e7ff;
}

.elegant-purple .total-item:last-child {
  border-bottom: none;
}

.elegant-purple .total-item.final {
  background: linear-gradient(135deg, var(--template-primary), var(--template-accent));
  color: white;
  margin: 1rem -1.5rem -1.5rem;
  padding: 1.25rem 1.5rem;
  border-radius: 0 0 12px 12px;
  font-weight: 700;
  font-size: 1.125rem;
}

.elegant-purple .elegant-footer {
  background: #faf9ff;
  padding: 2rem;
  border-top: 1px solid #e0e7ff;
}

.elegant-purple .footer-content {
  text-align: center;
}

.elegant-purple .footer-notes h4 {
  font-size: 1.25rem;
  color: var(--template-primary);
  margin-bottom: 1rem;
  font-weight: 600;
}

.elegant-purple .footer-contact {
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

/* Default/Simple Template */
.default .simple-header {
  padding: 2rem;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.default .simple-content {
  padding: 2rem;
}

.default .simple-billing {
  margin-bottom: 2rem;
}

.default .simple-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
}

.default .simple-table th,
.default .simple-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.default .simple-table th {
  background: #f9fafb;
  font-weight: 600;
}

.default .simple-total {
  text-align: right;
  font-size: 1.25rem;
  font-weight: 700;
}

/* Utility Classes */
.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

/* Responsive */
@media (max-width: 768px) {
  .invoice-container {
    margin: 0;
    border-radius: 0;
  }

  .modern-blue .invoice-header {
    flex-direction: column;
    gap: 1.5rem;
    text-align: left;
  }

  .modern-blue .invoice-title {
    text-align: left;
  }

  .modern-blue .invoice-meta p {
    text-align: left;
  }

  .modern-blue .billing-section {
    grid-template-columns: 1fr;
  }

  .elegant-purple .header-content {
    flex-direction: column;
    gap: 1.5rem;
  }

  .elegant-purple .elegant-billing {
    grid-template-columns: 1fr;
  }

  .elegant-purple .table-header,
  .elegant-purple .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .elegant-purple .col-qty,
  .elegant-purple .col-rate,
  .elegant-purple .col-amount {
    text-align: left;
  }
}

/* Print Styles */
@media print {
  .invoice-container {
    box-shadow: none;
    border-radius: 0;
  }

  .invoice-preview {
    max-width: none;
  }
}
</style>