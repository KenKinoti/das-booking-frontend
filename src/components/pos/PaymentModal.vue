<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i :class="getPaymentIcon(paymentMethod)"></i>
            {{ getPaymentTitle(paymentMethod) }}
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-md-6">
              <!-- Payment Amount -->
              <div class="mb-3">
                <label class="form-label">Payment Amount</label>
                <div class="input-group">
                  <span class="input-group-text">$</span>
                  <input
                    type="number"
                    class="form-control form-control-lg"
                    v-model.number="amount"
                    :max="remainingAmount"
                    min="0.01"
                    step="0.01"
                    ref="amountInput"
                  >
                </div>
                <small class="text-muted">
                  Remaining: ${{ formatCurrency(remainingAmount) }}
                </small>
              </div>

              <!-- Payment Method Specific Fields -->
              <div v-if="paymentMethod === 'cash'">
                <div class="mb-3">
                  <label class="form-label">Cash Received</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input
                      type="number"
                      class="form-control"
                      v-model.number="cashReceived"
                      :min="amount"
                      step="0.01"
                    >
                  </div>
                  <div v-if="cashReceived > amount" class="mt-2">
                    <span class="badge bg-success">
                      Change: ${{ formatCurrency(cashReceived - amount) }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-else-if="paymentMethod === 'card'">
                <div class="mb-3">
                  <label class="form-label">Card Type</label>
                  <select class="form-select" v-model="cardType">
                    <option value="credit">Credit Card</option>
                    <option value="debit">Debit Card</option>
                    <option value="eftpos">EFTPOS</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Last 4 Digits</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="cardLast4"
                    maxlength="4"
                    placeholder="1234"
                  >
                </div>
                <div class="mb-3">
                  <label class="form-label">Authorization Code</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="authCode"
                    placeholder="AUTH123456"
                  >
                </div>
              </div>

              <div v-else-if="paymentMethod === 'gift_card'">
                <div class="mb-3">
                  <label class="form-label">Gift Card Number</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="giftCardNumber"
                    placeholder="Enter gift card number"
                  >
                </div>
                <div class="mb-3">
                  <label class="form-label">Gift Card Balance</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input
                      type="number"
                      class="form-control"
                      v-model.number="giftCardBalance"
                      min="0"
                      step="0.01"
                      readonly
                    >
                    <button class="btn btn-outline-secondary" @click="checkGiftCardBalance">
                      Check Balance
                    </button>
                  </div>
                </div>
              </div>

              <div v-else-if="paymentMethod === 'mobile_wallet'">
                <div class="mb-3">
                  <label class="form-label">Wallet Type</label>
                  <select class="form-select" v-model="walletType">
                    <option value="apple_pay">Apple Pay</option>
                    <option value="google_pay">Google Pay</option>
                    <option value="samsung_pay">Samsung Pay</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Transaction ID</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="walletTransactionId"
                    placeholder="Transaction ID from device"
                  >
                </div>
              </div>

              <div v-else-if="paymentMethod === 'layby'">
                <div class="alert alert-info">
                  <i class="bi bi-info-circle me-2"></i>
                  This will create a layby order. Customer can make partial payments over time.
                </div>
                <div class="mb-3">
                  <label class="form-label">Initial Deposit</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input
                      type="number"
                      class="form-control"
                      v-model.number="laybyDeposit"
                      :min="remainingAmount * 0.1"
                      :max="remainingAmount"
                      step="0.01"
                    >
                  </div>
                  <small class="text-muted">
                    Minimum 10%: ${{ formatCurrency(remainingAmount * 0.1) }}
                  </small>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <!-- Quick Amount Buttons -->
              <div class="mb-3">
                <label class="form-label">Quick Amounts</label>
                <div class="d-grid gap-2">
                  <button
                    v-for="quickAmount in quickAmounts"
                    :key="quickAmount"
                    class="btn btn-outline-primary"
                    @click="amount = quickAmount"
                    :disabled="quickAmount > remainingAmount"
                  >
                    ${{ quickAmount }}
                  </button>
                  <button
                    class="btn btn-outline-success"
                    @click="amount = remainingAmount"
                  >
                    Exact Amount (${{ formatCurrency(remainingAmount) }})
                  </button>
                </div>
              </div>

              <!-- Payment Summary -->
              <div class="card">
                <div class="card-header">
                  <h6 class="card-title mb-0">Payment Summary</h6>
                </div>
                <div class="card-body">
                  <div class="d-flex justify-content-between mb-2">
                    <span>Amount:</span>
                    <span class="fw-bold">${{ formatCurrency(amount) }}</span>
                  </div>
                  <div v-if="paymentMethod === 'cash' && cashReceived > amount" class="d-flex justify-content-between mb-2">
                    <span>Cash Received:</span>
                    <span>${{ formatCurrency(cashReceived) }}</span>
                  </div>
                  <div v-if="paymentMethod === 'cash' && cashReceived > amount" class="d-flex justify-content-between mb-2">
                    <span>Change:</span>
                    <span class="text-success">${{ formatCurrency(cashReceived - amount) }}</span>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between">
                    <span>After Payment:</span>
                    <span class="fw-bold">${{ formatCurrency(remainingAmount - amount) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="processPayment"
            :disabled="!canProcessPayment"
          >
            <i class="bi bi-check-circle me-2"></i>
            Add Payment
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaymentModal',
  props: {
    paymentMethod: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    remainingAmount: {
      type: Number,
      required: true
    }
  },
  emits: ['close', 'payment-added'],
  data() {
    return {
      // Payment amount
      amount: this.amount || this.remainingAmount,

      // Cash payment
      cashReceived: 0,

      // Card payment
      cardType: 'credit',
      cardLast4: '',
      authCode: '',

      // Gift card
      giftCardNumber: '',
      giftCardBalance: 0,

      // Mobile wallet
      walletType: 'apple_pay',
      walletTransactionId: '',

      // Layby
      laybyDeposit: 0,

      // Quick amounts
      quickAmounts: [5, 10, 20, 50, 100]
    }
  },
  computed: {
    canProcessPayment() {
      if (this.amount <= 0 || this.amount > this.remainingAmount) return false

      switch (this.paymentMethod) {
        case 'cash':
          return this.cashReceived >= this.amount
        case 'card':
          return this.cardLast4.length === 4 && this.authCode.length > 0
        case 'gift_card':
          return this.giftCardNumber.length > 0 && this.giftCardBalance >= this.amount
        case 'mobile_wallet':
          return this.walletTransactionId.length > 0
        case 'layby':
          return this.laybyDeposit >= this.remainingAmount * 0.1
        default:
          return true
      }
    }
  },
  mounted() {
    this.$refs.amountInput?.focus()

    // Set initial values
    this.cashReceived = this.amount
    this.laybyDeposit = Math.max(this.remainingAmount * 0.1, 10)
  },
  methods: {
    getPaymentIcon(method) {
      const icons = {
        cash: 'bi bi-cash-stack text-success',
        card: 'bi bi-credit-card text-primary',
        eftpos: 'bi bi-phone text-info',
        gift_card: 'bi bi-gift text-warning',
        mobile_wallet: 'bi bi-wallet2 text-secondary',
        layby: 'bi bi-clock text-dark'
      }
      return icons[method] || 'bi bi-currency-dollar'
    },

    getPaymentTitle(method) {
      const titles = {
        cash: 'Cash Payment',
        card: 'Card Payment',
        eftpos: 'EFTPOS Payment',
        gift_card: 'Gift Card Payment',
        mobile_wallet: 'Mobile Wallet Payment',
        layby: 'Layby Payment'
      }
      return titles[method] || 'Payment'
    },

    async checkGiftCardBalance() {
      try {
        // Simulate gift card balance check
        this.giftCardBalance = Math.random() * 500
        this.$toast.success(`Gift card balance: $${this.formatCurrency(this.giftCardBalance)}`)
      } catch (error) {
        this.$toast.error('Failed to check gift card balance')
      }
    },

    processPayment() {
      if (!this.canProcessPayment) return

      const payment = {
        method: this.paymentMethod,
        amount: this.amount
      }

      // Add method-specific data
      switch (this.paymentMethod) {
        case 'cash':
          payment.cash_received = this.cashReceived
          payment.change_amount = this.cashReceived - this.amount
          break
        case 'card':
          payment.card_type = this.cardType
          payment.card_last4 = this.cardLast4
          payment.auth_code = this.authCode
          break
        case 'gift_card':
          payment.gift_card_number = this.giftCardNumber
          payment.gift_card_balance = this.giftCardBalance
          break
        case 'mobile_wallet':
          payment.wallet_type = this.walletType
          payment.transaction_id = this.walletTransactionId
          break
        case 'layby':
          payment.deposit_amount = this.laybyDeposit
          payment.total_amount = this.remainingAmount
          break
      }

      this.$emit('payment-added', payment)
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    }
  }
}
</script>

<style scoped>
.modal-dialog {
  max-width: 800px;
}

.form-control-lg {
  font-size: 1.5rem;
  font-weight: bold;
}

.quick-amounts .btn {
  margin-bottom: 0.5rem;
}

.card {
  border: 1px solid #dee2e6;
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}
</style>