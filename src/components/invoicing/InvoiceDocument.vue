<template>
  <article class="idoc" :style="{ '--doc-accent': accent }">
    <header class="idoc__top">
      <div class="idoc__from">
        <img v-if="business.logo_url" :src="business.logo_url" alt="" class="idoc__logo" />
        <div v-else class="idoc__mark">{{ (business.business_name || 'D')[0] }}</div>
        <div class="idoc__biz">
          <strong>{{ business.business_name || 'Your business' }}</strong>
          <span v-if="business.address" class="pre">{{ business.address }}</span>
          <span v-if="business.email">{{ business.email }}</span>
          <span v-if="business.phone">{{ business.phone }}</span>
          <span v-if="business.tax_number">{{ business.tax_number_label || 'Tax no.' }} {{ business.tax_number }}</span>
        </div>
      </div>
      <div class="idoc__title">
        <h2>{{ docTitle }}</h2>
        <div class="idoc__num">{{ doc.number }}</div>
        <span v-if="stamp" class="idoc__stamp" :class="`is-${stamp}`">{{ stampLabel }}</span>
      </div>
    </header>

    <section class="idoc__meta">
      <div>
        <div class="lbl">Bill to</div>
        <strong>{{ doc.client_name }}</strong>
        <div v-if="doc.client_address" class="pre">{{ doc.client_address }}</div>
        <div v-if="doc.client_email">{{ doc.client_email }}</div>
        <div v-if="doc.client_phone">{{ doc.client_phone }}</div>
        <div v-if="doc.client_tax_number">{{ business.tax_number_label || 'Tax no.' }} {{ doc.client_tax_number }}</div>
      </div>
      <dl class="idoc__dates">
        <div><dt>Issue date</dt><dd>{{ date(doc.issue_date) }}</dd></div>
        <div><dt>{{ isQuote ? 'Valid until' : 'Due date' }}</dt><dd>{{ date(doc.due_date) }}</dd></div>
        <div v-if="doc.reference"><dt>Reference</dt><dd>{{ doc.reference }}</dd></div>
        <div class="idoc__due">
          <dt>{{ isQuote ? 'Total' : 'Amount due' }}</dt>
          <dd>{{ money(isQuote ? doc.total : doc.balance_due) }}</dd>
        </div>
      </dl>
    </section>

    <h3 v-if="doc.title" class="idoc__subject">{{ doc.title }}</h3>

    <table class="idoc__items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="n">Qty</th>
          <th class="n">Price</th>
          <th v-if="hasDiscounts" class="n">Disc.</th>
          <th v-if="hasTax" class="n">Tax</th>
          <th class="n">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in doc.items" :key="it.id || it.position">
          <td class="pre">{{ it.description }}</td>
          <td class="n">{{ qty(it.quantity) }}{{ it.unit ? ' ' + it.unit : '' }}</td>
          <td class="n">{{ money(it.unit_price) }}</td>
          <td v-if="hasDiscounts" class="n">{{ it.discount_percent ? it.discount_percent + '%' : '—' }}</td>
          <td v-if="hasTax" class="n">{{ it.tax_rate ? it.tax_rate + '%' : '—' }}</td>
          <td class="n">{{ money(it.line_total) }}</td>
        </tr>
      </tbody>
    </table>

    <section class="idoc__bottom">
      <div class="idoc__notes">
        <div v-if="doc.notes">
          <div class="lbl">Notes</div>
          <p class="pre">{{ doc.notes }}</p>
        </div>
        <div v-if="!isQuote && business.payment_instructions">
          <div class="lbl">How to pay</div>
          <p class="pre">{{ business.payment_instructions }}</p>
        </div>
      </div>
      <dl class="idoc__totals">
        <div><dt>Subtotal</dt><dd>{{ money(doc.subtotal) }}</dd></div>
        <div v-if="doc.discount_total > 0"><dt>Discount</dt><dd>−{{ money(doc.discount_total) }}</dd></div>
        <div v-if="doc.shipping_amount > 0"><dt>Shipping</dt><dd>{{ money(doc.shipping_amount) }}</dd></div>
        <div v-if="doc.tax_total > 0 || hasTax"><dt>{{ taxLabel }}{{ doc.prices_include_tax ? ' (included)' : '' }}</dt><dd>{{ money(doc.tax_total) }}</dd></div>
        <div class="grand"><dt>Total {{ doc.currency }}</dt><dd>{{ money(doc.total) }}</dd></div>
        <template v-if="!isQuote && doc.amount_paid > 0">
          <div><dt>Paid</dt><dd>−{{ money(doc.amount_paid) }}</dd></div>
          <div class="grand due"><dt>Balance due</dt><dd>{{ money(doc.balance_due) }}</dd></div>
        </template>
      </dl>
    </section>

    <footer v-if="doc.terms" class="idoc__terms">
      <div class="lbl">Terms</div>
      <p class="pre">{{ doc.terms }}</p>
    </footer>
  </article>
</template>

<script>
import { formatDate } from '@/utils/format'
import { formatCurrency } from '@/utils/currencies'
import { STATUS_LABELS } from '@/services/invoicing'

export default {
  name: 'InvoiceDocument',
  props: {
    doc: { type: Object, required: true },
    business: { type: Object, default: () => ({}) }
  },
  computed: {
    isQuote() {
      return this.doc.doc_type === 'quote'
    },
    docTitle() {
      if (this.isQuote) return 'Quote'
      return this.business.tax_number ? 'Tax invoice' : 'Invoice'
    },
    accent() {
      return this.business.accent_color || '#5b4cf0'
    },
    hasDiscounts() {
      return (this.doc.items || []).some((i) => Number(i.discount_percent) > 0)
    },
    hasTax() {
      return (this.doc.items || []).some((i) => Number(i.tax_rate) > 0)
    },
    taxLabel() {
      const names = [...new Set((this.doc.items || []).filter((i) => Number(i.tax_rate) > 0).map((i) => i.tax_name).filter(Boolean))]
      return names.length === 1 ? names[0] : this.business.tax_label || 'Tax'
    },
    stamp() {
      const s = this.doc.display_status || this.doc.status
      return ['paid', 'overdue', 'void', 'accepted', 'draft'].includes(s) ? s : null
    },
    stampLabel() {
      return STATUS_LABELS[this.stamp]
    }
  },
  methods: {
    money(v) {
      return formatCurrency(v, this.doc.currency)
    },
    date: formatDate,
    qty(q) {
      const n = Number(q) || 0
      return Number.isInteger(n) ? n : n.toFixed(2).replace(/0+$/, '')
    }
  }
}
</script>

<style scoped>
.idoc {
  --doc-accent: #5b4cf0;
  background: #fff;
  color: #1a1d2e;
  border-radius: 16px;
  padding: 48px 52px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  font-size: 13.5px;
  line-height: 1.55;
  position: relative;
  overflow: hidden;
}

.idoc::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 6px;
  background: var(--doc-accent);
}

.pre {
  white-space: pre-line;
}

.lbl {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #7b839a;
  margin-bottom: 6px;
}

.idoc__top {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
}

.idoc__from {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.idoc__logo {
  max-width: 120px;
  max-height: 64px;
  object-fit: contain;
}

.idoc__mark {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  background: var(--doc-accent);
}

.idoc__biz {
  display: flex;
  flex-direction: column;
  color: #475067;
  font-size: 12.5px;
}

.idoc__biz strong {
  color: #1a1d2e;
  font-size: 15px;
  margin-bottom: 2px;
}

.idoc__title {
  text-align: right;
}

.idoc__title h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #1a1d2e;
  text-transform: uppercase;
}

.idoc__num {
  color: #475067;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.idoc__stamp {
  display: inline-block;
  margin-top: 10px;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1.5px solid currentColor;
}

.is-paid,
.is-accepted { color: #12a150; }
.is-overdue { color: #e5484d; }
.is-void,
.is-draft { color: #7b839a; }

.idoc__meta {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-top: 40px;
  padding: 20px 22px;
  border-radius: 12px;
  background: #f6f7fb;
}

.idoc__meta strong {
  font-size: 14.5px;
}

.idoc__dates {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 10px 32px;
  margin: 0;
  align-content: start;
}

.idoc__dates dt {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #7b839a;
}

.idoc__dates dd {
  margin: 0;
  font-weight: 600;
}

.idoc__due dd {
  font-size: 18px;
  color: var(--doc-accent);
  font-weight: 800;
}

.idoc__subject {
  margin: 28px 0 0;
  font-size: 16px;
  color: #1a1d2e;
}

.idoc__items {
  width: 100%;
  border-collapse: collapse;
  margin-top: 24px;
}

.idoc__items th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7b839a;
  font-weight: 700;
  text-align: left;
  padding: 10px 8px;
  border-bottom: 2px solid #1a1d2e;
}

.idoc__items td {
  padding: 14px 8px;
  border-bottom: 1px solid #e6e8ef;
  vertical-align: top;
}

.n {
  text-align: right !important;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.idoc__bottom {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  margin-top: 24px;
}

.idoc__notes {
  flex: 1;
  color: #475067;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.idoc__notes p {
  margin: 0;
}

.idoc__totals {
  width: 290px;
  margin: 0;
  display: grid;
  gap: 8px;
}

.idoc__totals > div {
  display: flex;
  justify-content: space-between;
}

.idoc__totals dt {
  font-weight: 500;
  color: #475067;
}

.idoc__totals dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.idoc__totals .grand {
  border-top: 1px solid #d5d9e3;
  padding-top: 10px;
  font-size: 16px;
  font-weight: 800;
}

.idoc__totals .grand dt {
  color: #1a1d2e;
  font-weight: 700;
}

.idoc__totals .due dd {
  color: var(--doc-accent);
}

.idoc__terms {
  margin-top: 32px;
  padding-top: 18px;
  border-top: 1px solid #e6e8ef;
  color: #475067;
  font-size: 12px;
}

.idoc__terms p {
  margin: 0;
}

@media (max-width: 720px) {
  .idoc {
    padding: 28px 20px;
  }
  .idoc__top,
  .idoc__meta,
  .idoc__bottom {
    flex-direction: column;
  }
  .idoc__title {
    text-align: left;
  }
  .idoc__totals {
    width: 100%;
  }
  .idoc__items {
    font-size: 12.5px;
  }
}

@media (max-width: 480px) {
  /* Phone: keep the paper inside the screen; very wide line tables scroll inside it */
  .idoc {
    padding: 22px 14px;
    overflow-x: auto;
  }
  .idoc__items th,
  .idoc__items td {
    padding-left: 5px;
    padding-right: 5px;
  }
  .idoc__items th:first-child,
  .idoc__items td:first-child {
    padding-left: 0;
  }
  .idoc__items th:last-child,
  .idoc__items td:last-child {
    padding-right: 0;
  }
}

@media print {
  .idoc {
    box-shadow: none;
    border: 0;
    border-radius: 0;
    padding: 0;
  }
  .idoc::before {
    display: none;
  }
  .idoc__meta {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
