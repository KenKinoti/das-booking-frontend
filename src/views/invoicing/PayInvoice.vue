<template>
  <div class="pay">
    <div class="pay__wrap">
      <header class="pay__brand">
        <img v-if="logo" :src="logo" :alt="biz || 'Logo'" class="pay__logo" @error="logoFailed = true" />
        <strong v-else-if="biz" class="pay__biz">{{ biz }}</strong>
        <span v-if="page && page.settings.mode === 'test'" class="ui-badge ui-badge--warning" data-testid="pay-test-mode">Test mode</span>
      </header>

      <div v-if="error" class="ui-card pay__state" data-testid="pay-error">
        <div class="pay__icon is-bad"><i class="fa-solid fa-link-slash"></i></div>
        <h1>Payment link unavailable</h1>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="!page" class="ui-card pay__state">
        <i class="fa-solid fa-circle-notch spin big"></i>
      </div>

      <!-- Back from Flutterwave -->
      <div v-else-if="returning" class="ui-card pay__state" data-testid="pay-result" :data-status="result?.status || 'checking'">
        <template v-if="!result">
          <i class="fa-solid fa-circle-notch spin big"></i>
          <h1>Confirming your payment…</h1>
          <p>We’re checking with Flutterwave. This takes a few seconds.</p>
        </template>
        <template v-else-if="result.status === 'successful'">
          <div class="pay__icon is-ok"><i class="fa-solid fa-check"></i></div>
          <h1>Payment received</h1>
          <p class="pay__big">{{ money(result.amount, result.currency) }}</p>
          <p>
            Thank you — {{ biz || 'the business' }} has been notified.
            <template v-if="result.balance_due > 0"> Balance still due on {{ result.invoice_number }}: <strong>{{ money(result.balance_due, result.currency) }}</strong>.</template>
            <template v-else> Invoice {{ result.invoice_number }} is fully paid.</template>
          </p>
          <dl class="pay__receipt">
            <div><dt>Method</dt><dd>{{ result.method }}</dd></div>
            <div><dt>Reference</dt><dd class="mono">{{ result.reference }}</dd></div>
            <div v-if="result.surcharge > 0"><dt>Includes processing fee</dt><dd>{{ money(result.surcharge, result.currency) }}</dd></div>
          </dl>
          <div class="pay__actions">
            <a v-if="result.receipt_path" class="ui-btn ui-btn--primary" :href="apiURL(result.receipt_path + '?download=1')" data-testid="pay-receipt"><i class="fa-solid fa-receipt"></i> Download receipt</a>
            <router-link class="ui-btn" :to="`/i/${token}`"><i class="fa-regular fa-file-lines"></i> View invoice</router-link>
            <router-link v-if="result.balance_due > 0" class="ui-btn" :to="`/pay/${token}`">Pay the rest</router-link>
          </div>
        </template>
        <template v-else-if="result.status === 'pending'">
          <div class="pay__icon is-wait"><i class="fa-regular fa-clock"></i></div>
          <h1>Payment not confirmed yet</h1>
          <p>{{ result.reason || 'Flutterwave hasn’t confirmed this payment yet.' }} If money left your account it will be recorded automatically.</p>
          <div class="pay__actions">
            <button class="ui-btn ui-btn--primary" :disabled="busy" @click="verify"><i class="fa-solid fa-rotate"></i> Check again</button>
            <router-link class="ui-btn" :to="`/pay/${token}`">Back to payment</router-link>
          </div>
        </template>
        <template v-else>
          <div class="pay__icon is-bad"><i class="fa-solid fa-xmark"></i></div>
          <h1>{{ result.status === 'cancelled' ? 'Payment cancelled' : 'Payment failed' }}</h1>
          <p>{{ result.status === 'cancelled' ? 'No money was taken.' : result.reason || 'The payment didn’t go through.' }}</p>
          <div class="pay__actions">
            <router-link class="ui-btn ui-btn--primary" :to="`/pay/${token}`" data-testid="pay-retry"><i class="fa-solid fa-rotate-left"></i> Try again</router-link>
            <router-link class="ui-btn" :to="`/i/${token}`">View invoice</router-link>
          </div>
        </template>
      </div>

      <template v-else>
        <section class="ui-card pay__summary">
          <div class="pay__sum-head">
            <div>
              <div class="muted small">Invoice {{ inv.number }}{{ inv.title ? ' · ' + inv.title : '' }}</div>
              <div class="pay__due-lbl">Balance due</div>
              <div class="pay__big" data-testid="pay-balance">{{ money(inv.balance_due) }}</div>
              <div class="muted small">For {{ inv.client_name }} · due {{ date(inv.due_date) }}</div>
            </div>
            <div class="pay__links">
              <router-link class="ui-btn ui-btn--sm" :to="`/i/${token}`"><i class="fa-regular fa-file-lines"></i> View invoice</router-link>
              <a class="ui-btn ui-btn--sm" :href="pdfURL"><i class="fa-solid fa-file-pdf"></i> PDF</a>
            </div>
          </div>
          <dl v-if="inv.amount_paid > 0" class="pay__mini">
            <div><dt>Total</dt><dd>{{ money(inv.total) }}</dd></div>
            <div><dt>Paid</dt><dd>{{ money(inv.amount_paid) }}</dd></div>
          </dl>
        </section>

        <div v-if="!page.payable" class="ui-card pay__state" data-testid="pay-unavailable">
          <div class="pay__icon" :class="inv.balance_due <= 0 ? 'is-ok' : 'is-wait'"><i :class="inv.balance_due <= 0 ? 'fa-solid fa-check' : 'fa-solid fa-circle-info'"></i></div>
          <p>{{ page.reason }}</p>
        </div>

        <form v-else class="ui-card pay__form" @submit.prevent="pay">
          <div v-if="page.settings.allow_partial" class="ui-field">
            <label for="pay-amount">Amount to pay ({{ inv.currency }})</label>
            <div class="amount-row">
              <input id="pay-amount" v-model.number="amount" type="number" :step="step" :min="page.settings.min_partial || step" :max="inv.balance_due" class="ui-input" data-testid="pay-amount" @input="onAmount" />
              <button type="button" class="ui-btn ui-btn--sm" @click="setFull">Full balance</button>
            </div>
            <span class="ui-hint">You can pay part now{{ page.settings.min_partial > 0 ? ` (at least ${money(page.settings.min_partial)})` : '' }}.</span>
            <span v-if="amountError" class="field-error" data-testid="pay-amount-error">{{ amountError }}</span>
          </div>

          <fieldset class="plain">
            <legend class="pay__legend">Choose how to pay</legend>
            <div class="opts" role="radiogroup">
              <label v-for="o in options" :key="o.method" class="opt" :class="{ 'is-on': method === o.method }" :data-testid="`pay-opt-${o.method}`">
                <input v-model="method" type="radio" name="method" :value="o.method" />
                <span class="opt__icon"><i :class="o.icon"></i></span>
                <span class="opt__main">
                  <strong>{{ o.label }}</strong>
                  <span v-if="o.recommended" class="ui-badge ui-badge--success" data-testid="pay-recommended">Recommended — lowest fee</span>
                  <small class="muted">{{ feeLine(o) }}</small>
                </span>
                <span class="opt__amt">{{ money(o.total) }}</span>
              </label>
            </div>
          </fieldset>

          <dl v-if="chosen" class="pay__totals">
            <div><dt>Invoice payment</dt><dd>{{ money(page.amount) }}</dd></div>
            <div v-if="chosen.surcharge > 0" data-testid="pay-surcharge"><dt>Processing fee ({{ chosen.label }})</dt><dd>{{ money(chosen.surcharge) }}</dd></div>
            <div class="grand"><dt>You pay</dt><dd data-testid="pay-total">{{ money(chosen.total) }}</dd></div>
          </dl>

          <div v-if="payError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ payError }}</span></div>

          <button type="submit" class="ui-btn ui-btn--primary pay__btn" :disabled="busy || !chosen || !!amountError" data-testid="pay-submit">
            <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-lock'"></i> Pay {{ chosen ? money(chosen.total) : '' }}
          </button>
          <p class="muted small center">You’ll finish on Flutterwave’s secure checkout, then come back here.</p>
        </form>
      </template>

      <p class="pay__foot">Payments by Flutterwave · Powered by DASYIN</p>
    </div>
  </div>
</template>

<script>
import { paymentsApi, feeText, apiURL } from '@/services/payments'
import { apiErrorMessage } from '@/services/api'
import { formatDate } from '@/utils/format'
import { formatCurrency, currencyStep } from '@/utils/currencies'

export default {
  name: 'PayInvoice',
  props: {
    token: { type: String, required: true },
    returning: { type: Boolean, default: false }
  },
  data() {
    return { page: null, error: '', amount: null, method: '', busy: false, payError: '', amountError: '', result: null, logoFailed: false, timer: null }
  },
  computed: {
    inv() {
      return this.page?.invoice || {}
    },
    biz() {
      return this.page?.business?.name || ''
    },
    logo() {
      return !this.logoFailed && this.page?.business?.logo_url ? this.page.business.logo_url : ''
    },
    options() {
      return this.page?.options || []
    },
    chosen() {
      return this.options.find((o) => o.method === this.method) || null
    },
    step() {
      return currencyStep(this.inv.currency)
    },
    pdfURL() {
      return apiURL(`/api/v1/public/invoices/${this.token}/pdf?download=1`)
    }
  },
  watch: {
    token() {
      this.init()
    },
    returning() {
      this.init()
    }
  },
  created() {
    this.init()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    apiURL,
    date: formatDate,
    money(v, cur) {
      return formatCurrency(v, cur || this.inv.currency)
    },
    feeLine(o) {
      if (!o.fee_known) return 'Fee not listed'
      const who = this.page.settings.fee_bearer === 'customer' ? 'added to your total' : `paid by ${this.biz || 'the business'}`
      return `Est. fee ${this.money(this.page.settings.fee_bearer === 'customer' ? o.surcharge : o.fee)} (${feeText(o, (v) => this.money(v))}) · ${who}`
    },
    async init() {
      this.error = ''
      this.result = null
      await this.load()
      if (this.returning && this.page) await this.verify()
    },
    async load(amount) {
      try {
        const p = await paymentsApi.payPage(this.token, amount)
        this.page = p
        if (this.amount === null || amount === undefined) this.amount = p.amount
        this.amountError = p.amount_error || ''
        const keep = this.options.find((o) => o.method === this.method)
        if (!keep) this.method = (this.options.find((o) => o.recommended) || this.options[0] || {}).method || ''
        document.title = `Pay ${p.invoice.number}${this.biz ? ' · ' + this.biz : ''}`
      } catch (e) {
        this.error = e.response?.status === 404 ? 'This payment link is invalid or has been replaced. Ask the sender for a new one.' : apiErrorMessage(e, 'Could not load this invoice')
      }
    },
    setFull() {
      this.amount = this.inv.balance_due
      this.onAmount()
    },
    onAmount() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        const a = Number(this.amount)
        if (!(a > 0)) {
          this.amountError = 'Enter the amount to pay'
          return
        }
        this.load(a)
      }, 350)
    },
    async pay() {
      if (!this.chosen) return
      this.busy = true
      this.payError = ''
      try {
        const r = await paymentsApi.checkout(this.token, { amount: this.page.amount, method: this.method })
        window.location.assign(r.link)
      } catch (e) {
        this.payError = apiErrorMessage(e, 'Could not start the payment')
        this.busy = false
      }
    },
    async verify() {
      const q = this.$route.query
      if (!q.tx_ref) {
        this.result = { status: 'failed', reason: 'The payment reference is missing.' }
        return
      }
      this.busy = true
      try {
        this.result = await paymentsApi.verify(this.token, { tx_ref: q.tx_ref, transaction_id: q.transaction_id ? String(q.transaction_id) : '', status: q.status || '' })
      } catch (e) {
        this.result = { status: 'pending', reason: apiErrorMessage(e, 'We couldn’t confirm the payment yet.') }
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.pay {
  min-height: 100vh;
  background: var(--bg);
  padding: 28px 16px 40px;
}

.pay__wrap {
  max-width: 560px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.pay__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
}

.pay__logo {
  max-height: 48px;
  max-width: 200px;
  object-fit: contain;
}

.pay__biz {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.plain {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.muted {
  color: var(--text-3);
}

.small {
  font-size: 12.5px;
}

.center {
  text-align: center;
  margin: 0;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  overflow-wrap: anywhere;
}

.big {
  font-size: 28px;
  color: var(--text-3);
}

.pay__state {
  padding: 32px 24px;
  text-align: center;
  display: grid;
  gap: 8px;
  justify-items: center;
}

.pay__state h1 {
  font-size: 21px;
  margin: 4px 0 0;
}

.pay__state p {
  margin: 0;
  color: var(--text-2);
  max-width: 440px;
}

.pay__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 24px;
  background: var(--surface-2);
  color: var(--text-3);
}

.pay__icon.is-ok {
  background: var(--success-soft);
  color: var(--success);
}

.pay__icon.is-bad {
  background: var(--danger-soft);
  color: var(--danger);
}

.pay__icon.is-wait {
  background: var(--warning-soft);
  color: var(--warning);
}

.pay__big {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.pay__summary {
  padding: 20px;
}

.pay__sum-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.pay__due-lbl {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
}

.pay__links {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.pay__mini,
.pay__receipt,
.pay__totals {
  margin: 14px 0 0;
  display: grid;
  gap: 6px;
}

.pay__mini div,
.pay__receipt div,
.pay__totals div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-variant-numeric: tabular-nums;
}

.pay__receipt {
  width: 100%;
  max-width: 400px;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

dt {
  color: var(--text-3);
}

dd {
  margin: 0;
  text-align: right;
}

.pay__form {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.amount-row {
  display: flex;
  gap: 8px;
}

.amount-row .ui-input {
  flex: 1;
  min-width: 0;
}

.field-error {
  font-size: 12.5px;
  color: var(--danger);
}

.pay__legend {
  font-size: 15px;
  font-weight: 650;
  margin-bottom: 8px;
  padding: 0;
}

.opts {
  display: grid;
  gap: 8px;
}

.opt {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  background: var(--surface);
}

.opt.is-on {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
  background: var(--accent-soft);
}

.opt input {
  accent-color: var(--accent);
}

.opt__icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-2);
}

.opt__main {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: center;
  min-width: 0;
}

.opt__main small {
  flex-basis: 100%;
}

.opt__main .ui-badge {
  white-space: normal;
  max-width: 100%;
}

.opt__amt {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.pay__totals {
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.pay__totals .grand {
  font-weight: 750;
  font-size: 16px;
}

.pay__totals .grand dt {
  color: var(--text);
}

.pay__btn {
  width: 100%;
  justify-content: center;
  height: 46px;
  font-size: 15.5px;
}

.pay__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}

.pay__foot {
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
  margin: 8px 0 0;
}

@media (max-width: 480px) {
  .opt {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .opt__icon {
    display: none;
  }

  .pay__big {
    font-size: 28px;
  }
}
</style>
