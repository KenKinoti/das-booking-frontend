<template>
  <div class="psp">
    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <template v-else-if="!data">
      <div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 38px; margin-bottom: 12px"></div>
    </template>
    <template v-else>
      <div class="psp-status" :class="data.ready ? 'is-ready' : 'is-off'" data-testid="pay-status">
        <span class="psp-status__icon"><i :class="data.ready ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-pause'"></i></span>
        <div class="psp-status__main">
          <div class="psp-status__title">
            <strong>{{ data.ready ? 'Clients can pay invoices online' : 'Online payments are off' }}</strong>
            <span class="ui-badge" :class="data.mode === 'live' ? 'ui-badge--success' : 'ui-badge--warning'" data-testid="pay-mode-badge">{{ data.mode === 'live' ? 'Live' : 'Test mode' }}</span>
          </div>
          <div class="muted small">
            Flutterwave hosted checkout — invoice emails get a <strong>Pay now</strong> button and the PDF a “Pay online” link. Clients see the cheapest method for their currency first.
          </div>
          <div v-if="data.last_test_at" class="small" :class="data.last_test_ok ? 'ok-text' : 'err-text'">
            <i :class="data.last_test_ok ? 'fa-solid fa-check' : 'fa-solid fa-xmark'"></i> Last test {{ formatDateTime(data.last_test_at) }}: {{ data.last_test_message }}
          </div>
        </div>
      </div>

      <form class="psp-form" novalidate @submit.prevent="save">
        <fieldset :disabled="!data.can_edit || saving" class="plain">
          <div class="psp-row">
            <label class="ui-switch"><input v-model="form.enabled" type="checkbox" data-testid="pay-enabled" /> Accept online payments with Flutterwave</label>
            <div class="seg" role="radiogroup" aria-label="Mode">
              <button v-for="m in ['test', 'live']" :key="m" type="button" role="radio" :aria-checked="form.mode === m" :class="{ 'is-active': form.mode === m }" :data-testid="`pay-mode-${m}`" @click="form.mode = m">{{ m === 'test' ? 'Test' : 'Live' }}</button>
            </div>
          </div>
          <span v-if="errors.mode" class="field-error">{{ errors.mode }}</span>

          <div class="psp-section">API keys <span class="muted">— Flutterwave dashboard → Settings → API keys ({{ form.mode === 'live' ? 'live' : 'test' }} keys)</span></div>
          <div class="psp-grid">
            <div class="ui-field span-2">
              <label for="pf-pub">Public key</label>
              <input id="pf-pub" v-model.trim="form.public_key" class="ui-input" :class="{ 'is-invalid': errors.public_key }" :placeholder="form.mode === 'live' ? 'FLWPUBK-…' : 'FLWPUBK_TEST-…'" autocomplete="off" spellcheck="false" />
              <span v-if="errors.public_key" class="field-error">{{ errors.public_key }}</span>
            </div>
            <div v-for="k in secretFields" :key="k.key" class="ui-field span-2">
              <label :for="`pf-${k.key}`">{{ k.label }}</label>
              <div class="secret">
                <input :id="`pf-${k.key}`" v-model="form[k.key]" class="ui-input" :class="{ 'is-invalid': errors[k.key] }" :type="reveal[k.key] ? 'text' : 'password'" autocomplete="new-password" spellcheck="false" :placeholder="placeholder(k)" :data-testid="`pay-${k.key}`" />
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" :aria-label="reveal[k.key] ? 'Hide' : 'Show'" @click="reveal[k.key] = !reveal[k.key]"><i :class="reveal[k.key] ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i></button>
              </div>
              <span v-if="errors[k.key]" class="field-error">{{ errors[k.key] }}</span>
              <span v-else class="ui-hint">{{ k.hint }}</span>
            </div>
          </div>

          <div class="psp-webhook">
            <div class="ui-field">
              <label for="pf-hook">Webhook URL <span class="muted small">— paste in Flutterwave → Settings → Webhooks, with the same secret hash as above</span></label>
              <div class="secret">
                <input id="pf-hook" class="ui-input mono" :value="data.webhook_url" readonly data-testid="pay-webhook-url" @focus="$event.target.select()" />
                <button type="button" class="ui-btn" @click="copy(data.webhook_url)"><i class="fa-regular fa-copy"></i> Copy</button>
              </div>
            </div>
            <button type="button" class="ui-btn" :disabled="testing || !data.can_edit" data-testid="pay-test" @click="test">
              <i :class="testing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plug-circle-check'"></i> Test connection
            </button>
          </div>

          <div class="psp-section">Payment methods offered</div>
          <div class="methods">
            <label v-for="m in data.available_methods" :key="m.key" class="method">
              <input v-model="form.methods" type="checkbox" :value="m.key" :data-testid="`pay-method-${m.key}`" />
              <i :class="m.icon"></i>
              <span>
                <strong>{{ m.label }}</strong>
                <small class="muted">{{ m.currencies?.length ? m.currencies.join(', ') : 'All currencies' }}</small>
              </span>
            </label>
          </div>
          <span v-if="errors.methods" class="field-error">{{ errors.methods }}</span>

          <div class="psp-section">Fees & amounts</div>
          <div class="psp-grid">
            <div class="ui-field span-2">
              <label>Who pays the processing fee?</label>
              <div class="seg seg--wide" role="radiogroup" aria-label="Who pays the fee">
                <button type="button" role="radio" :aria-checked="form.fee_bearer === 'business'" :class="{ 'is-active': form.fee_bearer === 'business' }" data-testid="pay-bearer-business" @click="form.fee_bearer = 'business'">My business absorbs it</button>
                <button type="button" role="radio" :aria-checked="form.fee_bearer === 'customer'" :class="{ 'is-active': form.fee_bearer === 'customer' }" data-testid="pay-bearer-customer" @click="form.fee_bearer = 'customer'">Add it for the client</button>
              </div>
              <span class="ui-hint">{{ form.fee_bearer === 'customer' ? 'A “processing fee” line is shown to the client before they pay; your business still receives the full invoice amount. Set Flutterwave’s own “who pays charges” to the merchant so the fee isn’t added twice.' : 'Fees Flutterwave charges show in Profit & loss as “Payment processing fees”.' }}</span>
            </div>
            <div class="ui-field">
              <label for="pf-tax">Tax on fees (%)</label>
              <input id="pf-tax" v-model.number="form.fee_tax_percent" type="number" min="0" max="50" step="0.1" class="ui-input" :class="{ 'is-invalid': errors.fee_tax_percent }" />
              <span class="ui-hint">E.g. 7.5 for Nigerian VAT on fees.</span>
            </div>
            <div class="ui-field">
              <label class="ui-switch"><input v-model="form.allow_partial" type="checkbox" data-testid="pay-partial" /> Allow part payments</label>
              <input v-if="form.allow_partial" v-model.number="form.min_partial" type="number" min="0" step="any" class="ui-input" aria-label="Minimum part payment" placeholder="Minimum amount" data-testid="pay-min-partial" />
              <span class="ui-hint">{{ form.allow_partial ? 'Smallest amount, in the invoice currency (0 = any).' : 'Clients pay the full balance.' }}</span>
            </div>
            <div class="ui-field">
              <label class="ui-switch"><input v-model="form.auto_receipt" type="checkbox" data-testid="pay-auto-receipt" /> Automatically email a receipt after an online payment</label>
              <span class="ui-hint">{{ form.auto_receipt ? 'The client gets the PDF receipt by email as soon as the payment is verified (uses your outgoing email and receipt template).' : 'Receipts for online payments are not emailed — send them from the invoice.' }}</span>
            </div>
          </div>

          <div class="psp-section psp-section--row">
            <span>Fee table <span class="muted">— used to recommend the lowest-fee method</span></span>
            <span class="ui-actions">
              <button type="button" class="ui-btn ui-btn--sm" data-testid="pay-fee-add" @click="addRow"><i class="fa-solid fa-plus"></i> Add row</button>
              <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="resetFees"><i class="fa-solid fa-rotate-left"></i> Reset to defaults</button>
            </span>
          </div>
          <div class="ui-alert ui-alert--warning small-alert">
            <i class="fa-solid fa-circle-info"></i>
            <span>Defaults are Flutterwave’s published prices checked on {{ data.pricing_checked_on }} (<a :href="pricingLink" target="_blank" rel="noopener">flutterwave.com pricing</a>). Rates differ by account and change — <strong>verify them against your Flutterwave dashboard</strong> and edit below.</span>
          </div>
          <div class="ui-table-wrap fee-wrap">
            <table class="ui-table fee-table" data-testid="pay-fee-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Currency</th>
                  <th>Card type</th>
                  <th class="num">%</th>
                  <th class="num">Fixed</th>
                  <th class="num">Cap</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in form.fees" :key="i">
                  <td>
                    <select v-model="r.method" class="ui-select sm" :aria-label="`Row ${i + 1} method`">
                      <option v-for="m in data.available_methods" :key="m.key" :value="m.key">{{ m.label }}</option>
                    </select>
                  </td>
                  <td><input v-model.trim="r.currency" class="ui-input sm cur" maxlength="3" :aria-label="`Row ${i + 1} currency`" placeholder="KES or *" @blur="r.currency = (r.currency || '').toUpperCase()" /></td>
                  <td>
                    <select v-if="r.method === 'card'" v-model="r.scope" class="ui-select sm" :aria-label="`Row ${i + 1} card type`">
                      <option value="local">Local</option>
                      <option value="international">International</option>
                      <option value="">Any</option>
                    </select>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="num"><input v-model.number="r.percent" type="number" min="0" max="20" step="0.01" class="ui-input sm n" :aria-label="`Row ${i + 1} percent`" /></td>
                  <td class="num"><input v-model.number="r.fixed" type="number" min="0" step="any" class="ui-input sm n" :aria-label="`Row ${i + 1} fixed fee`" /></td>
                  <td class="num"><input v-model.number="r.cap" type="number" min="0" step="any" class="ui-input sm n" :aria-label="`Row ${i + 1} cap`" placeholder="none" /></td>
                  <td><button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Remove row ${i + 1}`" @click="form.fees.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <span v-if="errors.fees" class="field-error">{{ errors.fees }}</span>

          <div class="psp-preview">
            <div class="psp-preview__head">
              <strong>Preview what a client sees</strong>
              <div class="psp-preview__inputs">
                <input v-model.number="preview.amount" type="number" min="1" step="any" class="ui-input sm" aria-label="Preview amount" />
                <select v-model="preview.currency" class="ui-select sm" aria-label="Preview currency">
                  <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                    <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }}</option>
                  </optgroup>
                </select>
              </div>
            </div>
            <ul v-if="previewOptions.length" class="opts" data-testid="pay-preview">
              <li v-for="o in previewOptions" :key="o.method" :class="{ best: o.recommended }">
                <span class="opt-name">{{ o.label }}<span v-if="o.recommended" class="ui-badge ui-badge--success">Lowest fee</span></span>
                <span class="muted small">{{ o.fee_known ? feeText(o, pm) : 'fee unknown' }}</span>
                <span class="num">{{ o.fee_known ? pm(o.fee) : '—' }}</span>
              </li>
            </ul>
            <p v-else class="muted small m0">No allowed method takes {{ preview.currency }}.</p>
          </div>
        </fieldset>

        <div class="psp-foot">
          <span v-if="dirty" class="muted small"><span class="dirty-dot"></span> Unsaved changes</span>
          <div class="ui-actions">
            <button type="button" class="ui-btn" :disabled="!dirty || saving" @click="reset">Discard</button>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="!data.can_edit || saving || !dirty" data-testid="pay-save"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save payment settings</button>
          </div>
        </div>
      </form>
    </template>
  </div>
</template>

<script>
import { paymentsApi, feeText } from '@/services/payments'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/format'
import { formatCurrency, currencyGroups } from '@/utils/currencies'
import { orgCurrency } from '@/utils/orgDefaults'
import { toast } from '@/composables/useToast'

const SECRETS = [
  { key: 'secret_key', label: 'Secret key', hint: 'Used by the server only; stored encrypted.', live: 'FLWSECK-…', test: 'FLWSECK_TEST-…' },
  { key: 'encryption_key', label: 'Encryption key', hint: 'Optional for hosted checkout; stored encrypted.', live: 'FLWSECK…', test: 'FLWSECK_TEST…' },
  { key: 'webhook_hash', label: 'Webhook secret hash', hint: 'Any long random text — enter the same in Flutterwave → Webhooks.', live: 'e.g. a long random phrase', test: 'e.g. a long random phrase' }
]

function blank() {
  return { enabled: false, mode: 'test', public_key: '', secret_key: '', encryption_key: '', webhook_hash: '', methods: [], fee_bearer: 'business', allow_partial: false, min_partial: 0, auto_receipt: true, fee_tax_percent: 0, fees: [] }
}

export default {
  name: 'PaymentSettingsPanel',
  data() {
    return {
      data: null,
      loadError: '',
      form: blank(),
      original: '',
      saving: false,
      testing: false,
      errors: {},
      reveal: { secret_key: false, encryption_key: false, webhook_hash: false },
      secretFields: SECRETS,
      preview: { amount: 10000, currency: 'KES' },
      previewOptions: [],
      previewTimer: null,
      currencyGroups: currencyGroups()
    }
  },
  computed: {
    snapshot() {
      return JSON.stringify(this.form)
    },
    dirty() {
      return !!this.data && this.snapshot !== this.original
    },
    pricingLink() {
      return (this.data?.pricing_source || '').split(' · ')[0] || 'https://flutterwave.com/ke/pricing'
    }
  },
  watch: {
    form: {
      deep: true,
      handler() {
        this.schedulePreview()
      }
    },
    preview: {
      deep: true,
      handler() {
        this.schedulePreview()
      }
    }
  },
  created() {
    this.preview.currency = orgCurrency() || 'KES'
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.previewTimer)
  },
  methods: {
    formatDateTime,
    feeText,
    pm(v) {
      return formatCurrency(v, this.preview.currency)
    },
    placeholder(k) {
      const m = this.data?.[k.key]
      if (m?.set) return `Saved (${m.hint || '••••'}) — leave blank to keep`
      return this.form.mode === 'live' ? k.live : k.test
    },
    apply(d) {
      this.data = d
      this.form = {
        enabled: !!d.enabled,
        mode: d.mode || 'test',
        public_key: d.public_key || '',
        secret_key: '',
        encryption_key: '',
        webhook_hash: '',
        methods: [...(d.methods || [])],
        fee_bearer: d.fee_bearer || 'business',
        allow_partial: !!d.allow_partial,
        min_partial: d.min_partial || 0,
        auto_receipt: d.auto_receipt !== false,
        fee_tax_percent: d.fee_tax_percent || 0,
        fees: (d.fees || []).map((r) => ({ method: r.method, currency: r.currency, scope: r.scope || '', percent: r.percent, fixed: r.fixed || 0, cap: r.cap || 0, note: r.note || '' }))
      }
      this.original = this.snapshot
      this.errors = {}
    },
    async load() {
      this.loadError = ''
      try {
        this.apply(await paymentsApi.settings())
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the payment settings')
      }
    },
    reset() {
      this.apply(this.data)
    },
    addRow() {
      this.form.fees.push({ method: 'card', currency: this.preview.currency, scope: 'local', percent: 0, fixed: 0, cap: 0, note: '' })
    },
    resetFees() {
      this.form.fees = []
      this.form.reset_fees = true
      this.save()
    },
    validate() {
      const e = {}
      const f = this.form
      const has = (k) => f[k] || this.data?.[k]?.set
      if (f.enabled) {
        if (!f.public_key) e.public_key = 'Enter the Flutterwave public key'
        if (!has('secret_key')) e.secret_key = 'Enter the Flutterwave secret key'
        if (!has('webhook_hash')) e.webhook_hash = 'Enter a webhook secret hash (and the same in the Flutterwave dashboard)'
        if (!f.methods.length) e.methods = 'Allow at least one payment method'
      }
      const key = f.secret_key || ''
      if (key && f.mode === 'live' && /_TEST/i.test(key)) e.mode = 'That secret key is a test key — switch to Test mode or use a live key.'
      if (key && f.mode === 'test' && /^FLWSECK-/i.test(key)) e.mode = 'That secret key is a live key — switch to Live mode or use a test key.'
      f.fees.forEach((r, i) => {
        if (!(r.currency === '*' || /^[A-Z]{3}$/.test((r.currency || '').toUpperCase()))) e.fees = `Row ${i + 1}: use a 3-letter currency code or *`
        if (!(Number(r.percent) >= 0 && Number(r.percent) <= 20)) e.fees = `Row ${i + 1}: the percentage must be between 0 and 20`
      })
      this.errors = e
      return !Object.keys(e).length
    },
    async save() {
      if (!this.validate()) {
        toast.error(Object.values(this.errors)[0])
        return
      }
      this.saving = true
      try {
        const body = { ...this.form, fees: this.form.fees.map((r) => ({ ...r, currency: (r.currency || '').toUpperCase(), percent: Number(r.percent) || 0, fixed: Number(r.fixed) || 0, cap: Number(r.cap) || 0 })) }
        const d = await paymentsApi.save(body)
        this.apply(d)
        toast.success(d.ready ? 'Online payments are on' : 'Payment settings saved')
      } catch (e) {
        const fields = e.response?.data?.error?.fields
        if (fields) this.errors = fields
        toast.error(apiErrorMessage(e, 'Could not save the payment settings'))
      } finally {
        delete this.form.reset_fees
        this.saving = false
      }
    },
    async test() {
      this.testing = true
      try {
        const r = await paymentsApi.test(this.form.secret_key ? { secret_key: this.form.secret_key } : {})
        toast.success(r.message || 'Connected to Flutterwave')
        if (!this.form.secret_key) {
          const d = await paymentsApi.settings()
          this.data = { ...this.data, last_test_at: d.last_test_at, last_test_ok: d.last_test_ok, last_test_message: d.last_test_message }
        }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not connect to Flutterwave'))
        if (!this.form.secret_key) {
          const d = await paymentsApi.settings().catch(() => null)
          if (d) this.data = { ...this.data, last_test_at: d.last_test_at, last_test_ok: d.last_test_ok, last_test_message: d.last_test_message }
        }
      } finally {
        this.testing = false
      }
    },
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Webhook URL copied')
      } catch {
        toast.info(text, { duration: 8000, title: 'Copy this URL' })
      }
    },
    schedulePreview() {
      clearTimeout(this.previewTimer)
      this.previewTimer = setTimeout(this.runPreview, 250)
    },
    async runPreview() {
      if (!this.data || !(Number(this.preview.amount) > 0)) return
      try {
        const f = this.form
        const r = await paymentsApi.estimate({
          amount: Number(this.preview.amount),
          currency: this.preview.currency,
          draft: { methods: f.methods, fee_bearer: f.fee_bearer, fee_tax_percent: Number(f.fee_tax_percent) || 0, fees: f.fees.map((x) => ({ ...x, currency: (x.currency || '').toUpperCase(), percent: Number(x.percent) || 0, fixed: Number(x.fixed) || 0, cap: Number(x.cap) || 0 })) }
        })
        this.previewOptions = r.options || []
      } catch {
        this.previewOptions = []
      }
    }
  }
}
</script>

<style scoped>
.plain {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.muted {
  color: var(--text-3);
}

.small {
  font-size: 12.5px;
}

.m0 {
  margin: 0;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
}

.ok-text {
  color: var(--success);
}

.err-text {
  color: var(--danger);
}

.psp-status {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.psp-status.is-ready {
  border-color: var(--success);
  background: var(--success-soft);
}

.psp-status__icon {
  font-size: 18px;
  line-height: 22px;
  color: var(--text-3);
}

.is-ready .psp-status__icon {
  color: var(--success);
}

.psp-status__main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 4px;
}

.psp-status__title {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.psp-form {
  margin-top: 18px;
}

.psp-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px 16px;
}

.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface);
}

.seg button {
  border: 0;
  background: transparent;
  color: var(--text-2);
  padding: 7px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.seg button + button {
  border-left: 1px solid var(--border);
}

.seg button.is-active {
  background: var(--accent-soft);
  color: var(--accent);
}

.seg--wide {
  display: flex;
}

.seg--wide button {
  flex: 1;
}

.psp-section {
  margin: 22px 0 10px;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
}

.psp-section .muted {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}

.psp-section--row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.psp-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 16px;
}

.psp-grid .span-2 {
  grid-column: span 2;
}

.secret {
  display: flex;
  gap: 4px;
  align-items: center;
}

.secret .ui-input {
  flex: 1;
  min-width: 0;
}

.field-error {
  font-size: 12.5px;
  color: var(--danger);
}

.psp-webhook {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.psp-webhook .ui-field {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.methods {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}

.method {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--surface);
}

.method i {
  color: var(--text-3);
  width: 16px;
  text-align: center;
}

.method span {
  display: grid;
  line-height: 1.3;
}

.small-alert {
  margin-bottom: 10px;
  font-size: 12.5px;
}

.psp {
  min-width: 0;
}

.fee-wrap {
  max-height: 360px;
  overflow: auto;
  max-width: 100%;
}

.fee-table td {
  padding-top: 6px;
  padding-bottom: 6px;
}

.sm {
  height: 32px;
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 13px;
}

.cur {
  width: 76px;
  text-transform: uppercase;
}

.n {
  width: 84px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.psp-preview {
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
}

.psp-preview__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.psp-preview__inputs {
  display: flex;
  gap: 6px;
}

.psp-preview__inputs .ui-input {
  width: 120px;
}

.opts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.opts li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 110px;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.opts li.best {
  border-color: var(--success);
  background: var(--success-soft);
}

.opt-name {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  flex-wrap: wrap;
}

.psp-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.psp-foot .ui-actions {
  margin-left: auto;
}

.dirty-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warning);
  margin-right: 4px;
  vertical-align: middle;
}

@media (max-width: 720px) {
  .psp-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .psp-grid .span-2 {
    grid-column: 1 / -1;
  }

  .psp-webhook {
    flex-direction: column;
    align-items: stretch;
  }

  .opts li {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .opts li .muted {
    display: none;
  }

  .psp-foot .ui-actions {
    width: 100%;
  }

  .psp-foot .ui-actions .ui-btn {
    flex: 1;
  }
}

@media (max-width: 640px) {
  [role='radio'] {
    min-height: 40px;
  }
}
</style>
