<template>
  <div class="ui-page ui-page--narrow">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Sales & Invoicing</div>
        <h1>Invoice settings</h1>
        <p>Your business details, numbering, taxes and defaults for new invoices and quotes.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn ui-btn--primary" :disabled="saving || !s" @click="save">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save settings
        </button>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    <div v-if="!s && !error" class="ui-card ui-card__body"><div class="ui-skeleton" style="height: 300px"></div></div>

    <template v-if="s">
      <section class="ui-card mb">
        <div class="ui-card__head"><h2>Business details</h2><span class="muted small">Shown on every document</span></div>
        <div class="ui-card__body ui-grid-2">
          <div class="ui-field">
            <label for="bn">Business name</label>
            <input id="bn" v-model="s.business_name" class="ui-input" placeholder="Your company" />
          </div>
          <div class="ui-field">
            <label for="be">Email</label>
            <input id="be" v-model="s.email" type="email" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="bp">Phone</label>
            <input id="bp" v-model="s.phone" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="bw">Website</label>
            <input id="bw" v-model="s.website" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="ba">Address</label>
            <textarea id="ba" v-model="s.address" class="ui-textarea" rows="3"></textarea>
          </div>
          <div class="ui-field">
            <label>Tax registration</label>
            <div class="row2">
              <input v-model="s.tax_number_label" class="ui-input label-in" aria-label="Tax number label" placeholder="ABN" />
              <input v-model="s.tax_number" class="ui-input" aria-label="Tax number" placeholder="12 345 678 901" />
            </div>
            <span class="ui-hint">With a tax number your invoices are titled “Tax invoice”.</span>
          </div>
          <div class="ui-field">
            <label>Logo</label>
            <div class="logo-row">
              <div class="logo-box">
                <img v-if="s.logo_url" :src="s.logo_url" alt="Logo preview" />
                <i v-else class="fa-regular fa-image"></i>
              </div>
              <div class="ui-actions">
                <label class="ui-btn ui-btn--sm"><i class="fa-solid fa-upload"></i> Upload<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden @change="onLogo" /></label>
                <button v-if="s.logo_url" class="ui-btn ui-btn--sm ui-btn--ghost" @click="s.logo_url = ''">Remove</button>
              </div>
            </div>
            <span class="ui-hint">PNG, JPG or SVG, up to 400 KB.</span>
          </div>
          <div class="ui-field">
            <label for="ac">Accent colour</label>
            <div class="row2">
              <input id="ac" v-model="s.accent_color" type="color" class="color" />
              <div class="swatches">
                <button v-for="c in swatches" :key="c" type="button" class="swatch" :style="{ background: c }" :class="{ on: s.accent_color === c }" @click="s.accent_color = c" :aria-label="`Use ${c}`"></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="ui-card mb">
        <div class="ui-card__head"><h2>Numbering & defaults</h2></div>
        <div class="ui-card__body ui-grid-3">
          <div class="ui-field">
            <label for="ip">Invoice prefix</label>
            <input id="ip" v-model="s.invoice_prefix" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="in">Next invoice number</label>
            <input id="in" v-model.number="s.next_invoice_number" type="number" min="1" class="ui-input" />
          </div>
          <div class="ui-field">
            <label>Preview</label>
            <div class="preview">{{ preview(s.invoice_prefix, s.next_invoice_number) }}</div>
          </div>
          <div class="ui-field">
            <label for="qp">Quote prefix</label>
            <input id="qp" v-model="s.quote_prefix" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="qn">Next quote number</label>
            <input id="qn" v-model.number="s.next_quote_number" type="number" min="1" class="ui-input" />
          </div>
          <div class="ui-field">
            <label>Preview</label>
            <div class="preview">{{ preview(s.quote_prefix, s.next_quote_number) }}</div>
          </div>
          <div class="ui-field">
            <label for="cur">Default currency</label>
            <select id="cur" v-model="s.currency" class="ui-select">
              <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region"><option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option></optgroup>
            </select>
          </div>
          <div class="ui-field">
            <label for="dd">Payment due (days)</label>
            <input id="dd" v-model.number="s.default_due_days" type="number" min="0" max="365" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="qv">Quotes valid for (days)</label>
            <input id="qv" v-model.number="s.quote_valid_days" type="number" min="0" max="365" class="ui-input" />
          </div>
          <div class="ui-field span-all">
            <label class="ui-switch"><input type="checkbox" v-model="s.prices_include_tax" /> Prices I enter already include tax</label>
          </div>
        </div>
      </section>

      <section class="ui-card mb">
        <div class="ui-card__head">
          <h2>Tax rates</h2>
          <button class="ui-btn ui-btn--sm" @click="addRate"><i class="fa-solid fa-plus"></i> Add rate</button>
        </div>
        <div class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr><th>Name</th><th class="num">Rate %</th><th>Default</th><th style="width: 120px"></th></tr>
            </thead>
            <tbody>
              <tr v-for="r in rates" :key="r.id || r._tmp">
                <td><input v-model="r.name" class="ui-input" aria-label="Tax name" /></td>
                <td class="num"><input v-model.number="r.rate" type="number" min="0" max="100" step="any" class="ui-input r rate-in" aria-label="Rate" /></td>
                <td><input type="radio" name="defrate" :checked="r.is_default" @change="setDefault(r)" aria-label="Default tax rate" /></td>
                <td class="num">
                  <button class="ui-btn ui-btn--sm" :disabled="r._saving" @click="saveRate(r)">Save</button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" @click="deleteRate(r)" aria-label="Delete tax rate"><i class="fa-regular fa-trash-can"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ui-card mb">
        <div class="ui-card__head"><h2>Document text</h2></div>
        <div class="ui-card__body ui-grid-2">
          <div class="ui-field">
            <label for="dn">Default notes</label>
            <textarea id="dn" v-model="s.default_notes" class="ui-textarea" rows="4" placeholder="Thank you for your business!"></textarea>
          </div>
          <div class="ui-field">
            <label for="dt">Default terms</label>
            <textarea id="dt" v-model="s.default_terms" class="ui-textarea" rows="4"></textarea>
          </div>
          <div class="ui-field span-all">
            <label for="pi">Payment instructions</label>
            <textarea id="pi" v-model="s.payment_instructions" class="ui-textarea" rows="3" placeholder="Bank: …  BSB: …  Account: …"></textarea>
            <span class="ui-hint">Printed on invoices under “How to pay”.</span>
          </div>
        </div>
      </section>

      <section class="ui-card mb">
        <div class="ui-card__head">
          <h2>Email template</h2>
          <span class="ui-badge" :class="emailEnabled ? 'ui-badge--success' : 'ui-badge--draft'">{{ emailEnabled ? 'Email sending on' : 'Opens your email app' }}</span>
        </div>
        <div class="ui-card__body">
          <div class="ui-field mb-s">
            <label for="es">Subject</label>
            <input id="es" v-model="s.email_subject" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="em">Message</label>
            <textarea id="em" v-model="s.email_message" class="ui-textarea" rows="7"></textarea>
            <span class="ui-hint">
              Placeholders: <code v-for="p in placeholders" :key="p" v-text="ph(p)"></code>
            </span>
          </div>
          <p v-if="!emailEnabled" class="ui-hint mt">To send directly from the app, set <code>SMTP_HOST</code>, <code>SMTP_USERNAME</code>, <code>SMTP_PASSWORD</code> and <code>SMTP_FROM</code> on the backend.</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import { currencyGroups } from '@/utils/currencies'
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

let tmp = 0

export default {
  name: 'InvoiceSettings',
  data() {
    return {
      s: null,
      rates: [],
      emailEnabled: false,
      saving: false,
      error: null,
      currencyGroups: currencyGroups(),
      swatches: ['#5b4cf0', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#111827'],
      placeholders: ['client', 'number', 'type', 'type_lower', 'total', 'due_date', 'business', 'link']
    }
  },
  async created() {
    try {
      const [res, rates] = await Promise.all([invoicingApi.getSettings(), invoicingApi.taxRates()])
      this.s = res.settings
      this.emailEnabled = res.email_enabled
      this.rates = rates
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load settings')
    }
  },
  methods: {
    ph(p) {
      return '{' + '{' + p + '}' + '}'
    },
    preview(prefix, n) {
      const pad = this.s.number_padding || 4
      return `${prefix || ''}${String(n || 1).padStart(pad, '0')}`
    },
    onLogo(e) {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (!f) return
      if (f.size > 400 * 1024) return toast.error('Logo must be 400 KB or smaller')
      const reader = new FileReader()
      reader.onload = () => (this.s.logo_url = reader.result)
      reader.readAsDataURL(f)
    },
    async save() {
      this.error = null
      if (!/^[A-Za-z]{3}$/.test(this.s.currency || '')) return (this.error = 'Choose a currency.')
      if (!(this.s.next_invoice_number >= 1) || !(this.s.next_quote_number >= 1)) return (this.error = 'Next numbers must be 1 or more.')
      this.saving = true
      try {
        const res = await invoicingApi.saveSettings(this.s)
        this.s = res.settings
        toast.success('Settings saved')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save settings')
      } finally {
        this.saving = false
      }
    },
    addRate() {
      this.rates.push({ _tmp: ++tmp, name: '', rate: 0, is_default: false })
    },
    setDefault(r) {
      this.rates.forEach((x) => (x.is_default = x === r))
      this.saveRate(r)
    },
    async saveRate(r) {
      if (!r.name?.trim()) return toast.error('Give the tax rate a name')
      if (!(r.rate >= 0 && r.rate <= 100)) return toast.error('Rate must be between 0 and 100')
      r._saving = true
      try {
        const saved = r.id ? await invoicingApi.updateTaxRate(r.id, r) : await invoicingApi.createTaxRate(r)
        Object.assign(r, saved, { _tmp: undefined })
        if (saved.is_default) {
          this.rates.forEach((x) => (x.is_default = x === r))
          this.s.default_tax_rate = saved.rate
          this.s.tax_label = saved.name
        }
        toast.success('Tax rate saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save tax rate'))
      } finally {
        r._saving = false
      }
    },
    async deleteRate(r) {
      if (r.id) {
        const ok = await confirmDialog({ title: `Delete ${r.name}?`, message: 'Existing documents keep their tax amounts.', confirmText: 'Delete', danger: true })
        if (!ok) return
        try {
          await invoicingApi.deleteTaxRate(r.id)
        } catch (e) {
          return toast.error(apiErrorMessage(e, 'Could not delete'))
        }
      }
      this.rates = this.rates.filter((x) => x !== r)
    }
  }
}
</script>

<style scoped>
.mb { margin-bottom: 16px; }
.mb-s { margin-bottom: 12px; }
.mt { margin-top: 12px; }
.muted { color: var(--text-3); }
.small { font-size: 12.5px; }
.r { text-align: right; }

.row2 {
  display: flex;
  gap: 8px;
  align-items: center;
}

.label-in {
  width: 90px;
  flex-shrink: 0;
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-box {
  width: 84px;
  height: 56px;
  border-radius: 10px;
  border: 1px dashed var(--border-strong);
  display: grid;
  place-items: center;
  color: var(--text-3);
  overflow: hidden;
  background: var(--surface-2);
}

.logo-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.color {
  width: 44px;
  height: 38px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
}

.swatches {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px var(--border-strong);
  cursor: pointer;
}

.swatch.on {
  box-shadow: 0 0 0 2px var(--text);
}

.preview {
  height: 38px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px dashed var(--border-strong);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.span-all {
  grid-column: 1 / -1;
}

.rate-in {
  width: 100px;
  margin-left: auto;
}

code {
  font-size: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0 5px;
  margin: 0 3px;
  color: var(--text-2);
}
</style>
