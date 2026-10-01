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
    <CountryDefaultsNotice />

    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    <div v-if="!s && !error" class="ui-card ui-card__body"><div class="ui-skeleton" style="height: 300px"></div></div>

    <template v-if="s">
      <section class="ui-card mb">
        <div class="ui-card__head"><h2>Business details</h2><span class="muted small">Shown on every document</span></div>
        <div class="ui-card__body ui-grid-2">
          <div class="ui-field span-all">
            <label>Logo</label>
            <OrgLogoUploader compact hint="This is your company logo — it's used on invoices, quotes, receipts and emails. Change it here or in Settings → Business details." @changed="onLogoChanged" />
          </div>
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
            <label for="rp">Receipt prefix</label>
            <input id="rp" v-model="s.receipt_prefix" class="ui-input" maxlength="20" data-testid="receipt-prefix" />
          </div>
          <div class="ui-field">
            <label for="rn">Next receipt number</label>
            <input id="rn" v-model.number="s.next_receipt_number" type="number" min="1" class="ui-input" />
          </div>
          <div class="ui-field">
            <label>Preview</label>
            <div class="preview" data-testid="receipt-preview">{{ preview(s.receipt_prefix, s.next_receipt_number) }}</div>
          </div>
          <p class="ui-hint span-all m0">Every payment gets the next receipt number when it is recorded; editing a payment keeps its number.</p>
          <div class="ui-field">
            <label for="cur">Default currency</label>
            <div id="cur" class="ui-input cur-ro" data-testid="invoice-currency">{{ currencyLabel(s.currency) }}</div>
            <span class="ui-hint">Your organisation's currency — change it in <router-link to="/settings#regional">Settings → Business details</router-link>. A customer's own currency still applies to their invoices.</span>
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
                <td><label class="defrate"><input type="radio" name="defrate" :checked="r.is_default" @change="setDefault(r)" aria-label="Default tax rate" /></label></td>
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

      <FxRatesCard />

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
            <span class="ui-hint">
              <code v-text="ph('total')"></code> is the document total, <code v-text="ph('amount_due')"></code> what is still to pay (after deposits and payments). Amounts are filled in on the server in the document's currency when the email is sent, and every email is checked before it goes out.
            </span>
          </div>
          <div class="rcpt-tpl" data-testid="receipt-template">
            <h3>Payment receipt email</h3>
            <p class="ui-hint m0">Sent when you tick “Email receipt to client”, use “Send receipt”, or a client pays online. The receipt PDF is attached.</p>
            <div class="ui-field mb-s">
              <label for="rs">Receipt subject</label>
              <input id="rs" v-model="s.receipt_subject" class="ui-input" :placeholder="defaultReceiptSubject" />
            </div>
            <div class="ui-field">
              <label for="rm">Receipt message</label>
              <textarea id="rm" v-model="s.receipt_message" class="ui-textarea" rows="7" :placeholder="defaultReceiptMessage"></textarea>
              <span class="ui-hint">
                Placeholders: <code v-for="p in receiptPlaceholders" :key="p" v-text="ph(p)"></code>
              </span>
              <span class="ui-hint">Leave empty to use the default shown.</span>
              <div v-if="!s.receipt_subject && !s.receipt_message"><button type="button" class="ui-btn ui-btn--sm" data-testid="receipt-default" @click="useDefaultReceipt"><i class="fa-regular fa-pen-to-square"></i> Start from the default</button></div>
            </div>
          </div>
          <p v-if="sender && sender.ready" class="ui-hint mt" data-testid="invoice-sender"><i class="fa-regular fa-paper-plane"></i> Emails are sent from <strong>{{ sender.from }}</strong><template v-if="sender.always_cc.length"> · always CC {{ sender.always_cc.join(', ') }}</template><template v-if="sender.always_bcc.length"> · always BCC {{ sender.always_bcc.join(', ') }}</template>. <router-link to="/settings#email">Change</router-link></p>
          <p v-else-if="!emailEnabled" class="ui-hint mt">To send directly from the app, connect an email account (e.g. Gmail) under <router-link to="/settings#email">Settings → Outgoing email</router-link>. Until then, “Open in email app” is used.</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import { currencyGroups, currencyLabel } from '@/utils/currencies'
import { invoicingApi, RECEIPT_PLACEHOLDERS, DEFAULT_RECEIPT_SUBJECT, DEFAULT_RECEIPT_MESSAGE } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import OrgLogoUploader from '@/components/branding/OrgLogoUploader.vue'
import FxRatesCard from '@/components/invoicing/FxRatesCard.vue'
import CountryDefaultsNotice from '@/components/invoicing/CountryDefaultsNotice.vue'

let tmp = 0

export default {
  name: 'InvoiceSettings',
  components: { CountryDefaultsNotice, OrgLogoUploader, FxRatesCard },
  data() {
    return {
      s: null,
      rates: [],
      emailEnabled: false,
      saving: false,
      error: null,
      sender: null,
      currencyGroups: currencyGroups(),
      swatches: ['#5b4cf0', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#111827'],
      receiptPlaceholders: RECEIPT_PLACEHOLDERS,
      defaultReceiptSubject: DEFAULT_RECEIPT_SUBJECT,
      defaultReceiptMessage: DEFAULT_RECEIPT_MESSAGE,
      placeholders: ['client', 'number', 'type', 'type_lower', 'total', 'amount_due', 'amount_paid', 'deposit', 'currency', 'issue_date', 'due_date', 'business', 'link', 'pay_link']
    }
  },
  async created() {
    try {
      const [res, rates] = await Promise.all([invoicingApi.getSettings(), invoicingApi.taxRates()])
      this.s = res.settings
      this.emailEnabled = res.email_enabled
      this.sender = res.sender || null
      this.rates = rates
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load settings')
    }
  },
  methods: {
    currencyLabel,
    ph(p) {
      return '{' + '{' + p + '}' + '}'
    },
    preview(prefix, n) {
      const pad = this.s.number_padding || 4
      return `${prefix || ''}${String(n || 1).padStart(pad, '0')}`
    },
    useDefaultReceipt() {
      this.s.receipt_subject = DEFAULT_RECEIPT_SUBJECT
      this.s.receipt_message = DEFAULT_RECEIPT_MESSAGE
    },
    onLogoChanged(b) {
      // The company logo is saved on its own; keep the preview data in step.
      if (this.s) this.s.logo_url = b.hasLogo ? b.logoUrl : ''
    },
    async save() {
      this.error = null
      if (!/^[A-Za-z]{3}$/.test(this.s.currency || '')) return (this.error = 'Choose a currency.')
      if (!(this.s.next_invoice_number >= 1) || !(this.s.next_quote_number >= 1) || !(this.s.next_receipt_number >= 1)) return (this.error = 'Next numbers must be 1 or more.')
      this.saving = true
      try {
        const res = await invoicingApi.saveSettings(this.s)
        this.s = res.settings
        toast.success('Settings saved')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save settings')
        toast.error(this.error)
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

/* Phones / touch: 40px tap targets for the colour swatches */
@media (max-width: 860px), (pointer: coarse) {
  .swatches {
    gap: 8px;
  }
  .swatch {
    width: 40px;
    height: 40px;
  }
}

.defrate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
  cursor: pointer;
}

.defrate input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
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

.m0 {
  margin: 0;
}

.rcpt-tpl {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rcpt-tpl h3 {
  margin: 0;
  font-size: 15px;
}

.linkish {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
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

.cur-ro {
  display: flex;
  align-items: center;
  background: var(--surface-2);
  color: var(--text-2);
  cursor: default;
}
</style>
