<template>
  <div class="pub">
    <div class="pub__wrap">
      <div v-if="error" class="pub__state">
        <div class="ui-empty__icon"><i class="fa-solid fa-link-slash"></i></div>
        <h1>Link unavailable</h1>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="!doc" class="pub__state">
        <i class="fa-solid fa-circle-notch spin big"></i>
      </div>

      <template v-else>
        <div class="pub__bar">
          <div>
            <div class="pub__from">{{ business.business_name || 'Invoice' }}</div>
            <div class="pub__sum">
              <span class="amount">{{ money(isQuote ? doc.total : doc.balance_due) }}</span>
              <span class="ui-badge" :class="`ui-badge--${doc.display_status}`">{{ label }}</span>
            </div>
            <div class="pub__sub" v-if="!isQuote && doc.balance_due > 0">Due {{ date(doc.due_date) }}</div>
            <div class="pub__sub" v-else-if="isQuote">Valid until {{ date(doc.due_date) }}</div>
          </div>
          <div class="ui-actions">
            <button v-if="canAccept" class="ui-btn ui-btn--success" :disabled="busy" @click="accept"><i class="fa-solid fa-check"></i> Accept quote</button>
            <button class="ui-btn" @click="print"><i class="fa-solid fa-download"></i> Download PDF</button>
          </div>
        </div>
        <div v-if="accepted" class="ui-alert ui-alert--success mb"><i class="fa-solid fa-circle-check"></i><span>Thanks! You've accepted this quote — {{ business.business_name || 'the sender' }} will see it right away.</span></div>
        <InvoiceDocument :doc="doc" :business="business" />
        <p class="pub__foot">Powered by DASYIN</p>
      </template>
    </div>
  </div>
</template>

<script>
import InvoiceDocument from '@/components/invoicing/InvoiceDocument.vue'
import { invoicingApi, STATUS_LABELS } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate } from '@/utils/format'

export default {
  name: 'PublicInvoice',
  components: { InvoiceDocument },
  props: { token: { type: String, required: true } },
  data() {
    return { doc: null, business: {}, error: null, busy: false, accepted: false }
  },
  computed: {
    isQuote() {
      return this.doc?.doc_type === 'quote'
    },
    label() {
      return STATUS_LABELS[this.doc.display_status] || this.doc.display_status
    },
    canAccept() {
      return this.isQuote && this.doc.status === 'sent' && this.doc.display_status !== 'expired' && !this.accepted
    }
  },
  async created() {
    try {
      const res = await invoicingApi.publicView(this.token)
      this.doc = res.invoice
      this.business = res.business || {}
      document.title = `${this.isQuote ? 'Quote' : 'Invoice'} ${this.doc.number}${this.business.business_name ? ' · ' + this.business.business_name : ''}`
    } catch (e) {
      this.error = e.response?.status === 404 ? 'This link is invalid or has been replaced. Ask the sender for a new one.' : apiErrorMessage(e)
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.doc.currency)
    },
    date: formatDate,
    print() {
      window.print()
    },
    async accept() {
      this.busy = true
      try {
        await invoicingApi.publicAccept(this.token)
        this.accepted = true
        this.doc.status = 'accepted'
        this.doc.display_status = 'accepted'
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not accept the quote')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.pub {
  min-height: 100vh;
  background: var(--bg);
  padding: 32px 16px 48px;
}

.pub__wrap {
  max-width: 880px;
  margin: 0 auto;
}

.pub__state {
  text-align: center;
  padding: 120px 20px;
  color: var(--text-3);
}

.pub__state h1 {
  font-size: 22px;
}

.big {
  font-size: 28px;
}

.pub__bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.pub__from {
  color: var(--text-3);
  font-weight: 600;
}

.pub__sum {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}

.amount {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.pub__sub {
  color: var(--text-3);
  font-size: 13.5px;
}

.mb {
  margin-bottom: 16px;
}

.pub__foot {
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
  margin-top: 24px;
}

@media print {
  .pub {
    padding: 0;
    background: #fff;
  }
  .pub__bar,
  .pub__foot,
  .ui-alert {
    display: none !important;
  }
}
</style>
