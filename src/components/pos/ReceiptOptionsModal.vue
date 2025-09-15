<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-printer me-2"></i>
            Receipt Options
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-12">
              <h6>Receipt Delivery Options</h6>
              <div class="d-grid gap-2 mb-4">
                <button class="btn btn-outline-primary" @click="printReceipt">
                  <i class="bi bi-printer me-2"></i>
                  Print Receipt
                </button>
                <button class="btn btn-outline-info" @click="emailReceipt">
                  <i class="bi bi-envelope me-2"></i>
                  Email Receipt
                </button>
                <button class="btn btn-outline-success" @click="smsReceipt">
                  <i class="bi bi-phone me-2"></i>
                  SMS Receipt
                </button>
                <button class="btn btn-outline-secondary" @click="downloadReceipt">
                  <i class="bi bi-download me-2"></i>
                  Download PDF
                </button>
              </div>

              <!-- Email Options -->
              <div v-if="showEmailForm" class="mb-3">
                <label class="form-label">Email Address</label>
                <div class="input-group">
                  <input
                    type="email"
                    class="form-control"
                    v-model="emailAddress"
                    placeholder="customer@example.com"
                  >
                  <button class="btn btn-primary" @click="sendEmailReceipt" :disabled="!emailAddress">
                    Send
                  </button>
                </div>
              </div>

              <!-- SMS Options -->
              <div v-if="showSmsForm" class="mb-3">
                <label class="form-label">Phone Number</label>
                <div class="input-group">
                  <input
                    type="tel"
                    class="form-control"
                    v-model="phoneNumber"
                    placeholder="+61 4XX XXX XXX"
                  >
                  <button class="btn btn-primary" @click="sendSmsReceipt" :disabled="!phoneNumber">
                    Send
                  </button>
                </div>
              </div>

              <!-- Receipt Template Options -->
              <div class="mt-4">
                <h6>Receipt Template</h6>
                <div class="row">
                  <div class="col-6">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="receiptTemplate"
                        id="standard"
                        value="standard"
                        v-model="receiptTemplate"
                      >
                      <label class="form-check-label" for="standard">
                        Standard Receipt
                      </label>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="receiptTemplate"
                        id="detailed"
                        value="detailed"
                        v-model="receiptTemplate"
                      >
                      <label class="form-check-label" for="detailed">
                        Detailed Receipt
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Receipt Options -->
              <div class="mt-3">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="includeItemDetails"
                    v-model="includeItemDetails"
                  >
                  <label class="form-check-label" for="includeItemDetails">
                    Include item details and descriptions
                  </label>
                </div>
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="includePromotions"
                    v-model="includePromotions"
                  >
                  <label class="form-check-label" for="includePromotions">
                    Include promotional messages
                  </label>
                </div>
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="includeSurveyLink"
                    v-model="includeSurveyLink"
                  >
                  <label class="form-check-label" for="includeSurveyLink">
                    Include customer feedback link
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" @click="printWithOptions">
            <i class="bi bi-printer me-2"></i>
            Print with Options
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReceiptOptionsModal',
  props: {
    transactionId: {
      type: String,
      required: true
    }
  },
  emits: ['close'],
  data() {
    return {
      showEmailForm: false,
      showSmsForm: false,
      emailAddress: '',
      phoneNumber: '',
      receiptTemplate: 'standard',
      includeItemDetails: true,
      includePromotions: false,
      includeSurveyLink: false
    }
  },
  methods: {
    printReceipt() {
      this.generateReceipt('print')
    },

    emailReceipt() {
      this.showEmailForm = true
      this.showSmsForm = false
    },

    smsReceipt() {
      this.showSmsForm = true
      this.showEmailForm = false
    },

    downloadReceipt() {
      this.generateReceipt('download')
    },

    sendEmailReceipt() {
      if (!this.emailAddress) return

      this.generateReceipt('email', { email: this.emailAddress })
      this.showEmailForm = false
      this.emailAddress = ''
    },

    sendSmsReceipt() {
      if (!this.phoneNumber) return

      this.generateReceipt('sms', { phone: this.phoneNumber })
      this.showSmsForm = false
      this.phoneNumber = ''
    },

    printWithOptions() {
      this.generateReceipt('print')
    },

    async generateReceipt(method, contact = null) {
      try {
        const receiptOptions = {
          template: this.receiptTemplate,
          includeItemDetails: this.includeItemDetails,
          includePromotions: this.includePromotions,
          includeSurveyLink: this.includeSurveyLink,
          method,
          contact
        }

        // Generate receipt content
        const receiptContent = this.buildReceiptContent()

        switch (method) {
          case 'print':
            this.printToDevice(receiptContent)
            break
          case 'email':
            await this.emailReceiptToCustomer(receiptContent, contact.email)
            break
          case 'sms':
            await this.smsReceiptToCustomer(receiptContent, contact.phone)
            break
          case 'download':
            this.downloadReceiptPDF(receiptContent)
            break
        }

        this.$toast?.success(`Receipt ${method === 'download' ? 'downloaded' : method === 'print' ? 'printed' : 'sent'} successfully`)
        this.$emit('close')

      } catch (error) {
        console.error('Error generating receipt:', error)
        this.$toast?.error('Failed to generate receipt')
      }
    },

    buildReceiptContent() {
      // Mock receipt content - in real implementation, fetch transaction details
      return {
        transactionId: this.transactionId,
        timestamp: new Date(),
        items: [
          { name: 'Engine Oil 5W-30', quantity: 2, price: 35.00 },
          { name: 'Brake Pads Front', quantity: 1, price: 120.00 }
        ],
        subtotal: 190.00,
        tax: 19.00,
        total: 209.00,
        paymentMethod: 'Card',
        receiptNumber: `R-${Date.now()}`
      }
    },

    printToDevice(content) {
      // Create printable HTML
      const printContent = this.formatReceiptForPrint(content)

      // Open print dialog
      const printWindow = window.open('', '_blank')
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
      printWindow.close()
    },

    async emailReceiptToCustomer(content, email) {
      // Mock email sending
      console.log('Sending email receipt to:', email)

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      return { success: true }
    },

    async smsReceiptToCustomer(content, phone) {
      // Mock SMS sending
      console.log('Sending SMS receipt to:', phone)

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      return { success: true }
    },

    downloadReceiptPDF(content) {
      // Create downloadable PDF content
      const pdfContent = this.formatReceiptForPDF(content)

      // Create download link
      const blob = new Blob([pdfContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `receipt-${this.transactionId}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    },

    formatReceiptForPrint(content) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 20px; }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>DASYIN AUTO SERVICES</h2>
              <p>Receipt #${content.receiptNumber}</p>
              <p>${content.timestamp.toLocaleString()}</p>
            </div>
            ${content.items.map(item => `
              <div class="item">
                <span>${item.quantity}x ${item.name}</span>
                <span>$${item.price.toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="total">
              <div class="item">
                <span>Subtotal:</span>
                <span>$${content.subtotal.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>Tax:</span>
                <span>$${content.tax.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>Total:</span>
                <span>$${content.total.toFixed(2)}</span>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for your business!</p>
              ${this.includeSurveyLink ? '<p>Rate us: www.example.com/feedback</p>' : ''}
            </div>
          </div>
        </body>
        </html>
      `
    },

    formatReceiptForPDF(content) {
      return this.formatReceiptForPrint(content)
    }
  }
}
</script>

<style scoped>
.btn-group .btn {
  margin-bottom: 0.5rem;
}

.form-check {
  margin-bottom: 0.5rem;
}

.input-group {
  margin-bottom: 1rem;
}
</style>