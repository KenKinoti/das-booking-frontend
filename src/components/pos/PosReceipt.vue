<template>
  <div class="receipt">
    <header class="receipt__head">
      <img v-if="logoSrc" :src="logoSrc" :alt="orgName || 'Company logo'" class="receipt__logo" data-testid="receipt-logo" @error="logoFailed = true" />
      <strong class="receipt__org">{{ orgName || 'Receipt' }}</strong>
      <div v-if="addressLine">{{ addressLine }}</div>
      <div v-if="organization?.phone">{{ organization.phone }}</div>
      <div v-if="organization?.abn">ABN {{ organization.abn }}</div>
      <div class="receipt__title">{{ transaction.status === 'voided' ? 'VOIDED — ' : '' }}Tax invoice</div>
    </header>

    <dl class="receipt__meta">
      <div><dt>Receipt</dt><dd>{{ transaction.transaction_number }}</dd></div>
      <div><dt>Date</dt><dd>{{ dateTime(transaction.created_at) }}</dd></div>
      <div v-if="cashier"><dt>Served by</dt><dd>{{ cashier }}</dd></div>
      <div v-if="customer"><dt>Customer</dt><dd>{{ customer }}</dd></div>
    </dl>

    <table class="receipt__items">
      <tbody>
        <template v-for="it in transaction.items || []" :key="it.id">
          <tr>
            <td colspan="2" class="receipt__name">{{ it.item_name }}</td>
          </tr>
          <tr class="receipt__sub">
            <td>{{ it.quantity }} × {{ money(it.unit_price) }}<span v-if="it.discount_amount > 0"> (−{{ money(it.discount_amount) }})</span></td>
            <td class="r">{{ money(it.total_price) }}</td>
          </tr>
        </template>
      </tbody>
    </table>

    <table class="receipt__totals">
      <tbody>
        <tr><td>Subtotal</td><td class="r">{{ money(transaction.sub_total) }}</td></tr>
        <tr v-if="transaction.discount_amount > 0"><td>Discount</td><td class="r">−{{ money(transaction.discount_amount) }}</td></tr>
        <tr v-if="!transaction.tax_inclusive && transaction.tax_amount > 0"><td>Tax</td><td class="r">{{ money(transaction.tax_amount) }}</td></tr>
        <tr class="receipt__total"><td>Total</td><td class="r">{{ money(transaction.total_amount) }}</td></tr>
        <tr v-if="transaction.tax_inclusive && transaction.tax_amount > 0" class="receipt__muted"><td>Includes tax of</td><td class="r">{{ money(transaction.tax_amount) }}</td></tr>
      </tbody>
    </table>

    <table class="receipt__totals">
      <tbody>
        <tr v-for="p in transaction.payments || []" :key="p.id">
          <td>{{ label(p.method) }}<span v-if="p.reference" class="receipt__muted"> · {{ p.reference }}</span></td>
          <td class="r">{{ money(p.amount) }}</td>
        </tr>
        <tr v-if="transaction.change_amount > 0"><td>Change</td><td class="r">{{ money(transaction.change_amount) }}</td></tr>
      </tbody>
    </table>

    <p v-if="transaction.status === 'voided'" class="receipt__void">Voided {{ dateTime(transaction.voided_at) }}<br />{{ transaction.void_reason }}</p>
    <p v-if="transaction.notes" class="receipt__note">{{ transaction.notes }}</p>
    <footer class="receipt__foot">Thank you for your purchase</footer>
  </div>
</template>

<script>
import { formatMoney, formatDateTime } from '@/utils/format'
import { PAYMENT_LABELS, personName } from '@/services/posService'
import { useBranding } from '@/composables/useBranding'

export default {
  name: 'PosReceipt',
  props: {
    transaction: { type: Object, required: true },
    organization: { type: Object, default: null },
    currency: { type: String, default: 'AUD' }
  },
  setup() {
    return { branding: useBranding().branding }
  },
  data() {
    return { logoFailed: false }
  },
  computed: {
    // The company logo (Settings → Business details) of the signed-in organisation.
    logoSrc() {
      if (this.logoFailed) return ''
      if (this.branding.loaded) return this.branding.logoUrl
      return this.organization?.logo_url || this.branding.logoUrl || ''
    },
    orgName() {
      return this.organization?.name || this.branding.orgName || ''
    },
    cashier() {
      return personName(this.transaction.cashier)
    },
    customer() {
      return personName(this.transaction.customer)
    },
    addressLine() {
      const a = this.organization?.address
      if (!a) return ''
      return [a.street, a.suburb, a.state, a.postcode].filter(Boolean).join(', ')
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    dateTime: formatDateTime,
    label(m) {
      return PAYMENT_LABELS[m] || m
    }
  }
}
</script>

<style scoped>
.receipt {
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.receipt__head {
  text-align: center;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border-strong);
  color: var(--text-2);
}
.receipt__logo {
  display: block;
  margin: 0 auto 8px;
  max-width: 160px;
  max-height: 44px;
  width: auto;
  height: auto;
  object-fit: contain;
}
[data-theme='dark'] .receipt__logo {
  /* transparent logos stay legible on the dark receipt */
  background: #f4f5f9;
  border-radius: 6px;
  padding: 3px 6px;
}
@media print {
  .receipt__logo,
  [data-theme='dark'] .receipt__logo {
    background: none;
    padding: 0;
    filter: grayscale(1) contrast(1.15);
  }
}
.receipt__org {
  display: block;
  font-size: 15px;
  color: var(--text);
  font-family: var(--font-sans);
}
.receipt__title {
  margin-top: 6px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  color: var(--text);
}
.receipt__meta {
  margin: 10px 0;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border-strong);
}
.receipt__meta div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.receipt__meta dt {
  font-weight: 400;
  color: var(--text-3);
}
.receipt__meta dd {
  margin: 0;
  text-align: right;
}
table {
  width: 100%;
  border-collapse: collapse;
}
td {
  padding: 1px 0;
  vertical-align: top;
}
.r {
  text-align: right;
  white-space: nowrap;
}
.receipt__items {
  padding-bottom: 8px;
}
.receipt__name {
  padding-top: 5px;
}
.receipt__sub td {
  color: var(--text-2);
}
.receipt__totals {
  border-top: 1px dashed var(--border-strong);
  margin-top: 8px;
  padding-top: 6px;
}
.receipt__totals tr:first-child td {
  padding-top: 8px;
}
.receipt__total td {
  font-weight: 700;
  font-size: 14px;
  padding-top: 4px;
}
.receipt__muted {
  color: var(--text-3);
}
.receipt__void {
  margin: 10px 0 0;
  padding: 6px;
  border: 1px solid var(--danger);
  color: var(--danger);
  text-align: center;
  border-radius: 4px;
}
.receipt__note {
  margin: 10px 0 0;
  color: var(--text-2);
  white-space: pre-wrap;
}
.receipt__foot {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-strong);
  text-align: center;
  color: var(--text-2);
}
</style>
