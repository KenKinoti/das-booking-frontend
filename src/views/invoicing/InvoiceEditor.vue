<template>
  <div class="ui-page">
    <header class="ui-page-head">
      <div>
        <router-link :to="backTo" class="back"><i class="fa-solid fa-arrow-left"></i> {{ isQuote ? 'Quotes' : 'Invoices' }}</router-link>
        <h1>{{ heading }}</h1>
        <p v-if="doc.number">{{ doc.number }} · <span class="ui-badge" :class="`ui-badge--${doc.display_status || doc.status}`">{{ statusLabel }}</span></p>
        <p v-else>Fill in the details below — totals update as you type.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" @click="cancel">Cancel</button>
        <button class="ui-btn" :disabled="saving" @click="save(false)">
          <i v-if="saving === 'draft'" class="fa-solid fa-circle-notch spin"></i>
          {{ isNew || doc.status === 'draft' ? 'Save draft' : 'Save changes' }}
        </button>
        <button v-if="isNew || doc.status === 'draft'" class="ui-btn ui-btn--primary" :disabled="saving" @click="save(true)">
          <i :class="saving === 'send' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-paper-plane'"></i>
          Save & send
        </button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }}</span></div>

    <div v-else-if="loading" class="ui-card ui-card__body">
      <div class="ui-skeleton" style="height: 18px; width: 40%; margin-bottom: 16px"></div>
      <div class="ui-skeleton" style="height: 120px"></div>
    </div>

    <div v-else class="layout">
      <div class="main-col">
        <div v-if="errors.length" class="ui-alert ui-alert--danger" role="alert" ref="errorBox">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>
            <strong>Please fix the following:</strong>
            <ul class="err-list"><li v-for="e in errors" :key="e">{{ e }}</li></ul>
          </span>
        </div>

        <!-- Client & details -->
        <section class="ui-card">
          <div class="ui-card__head"><h2><i class="fa-regular fa-user head-ico"></i> Bill to</h2></div>
          <div class="ui-card__body">
            <div class="ui-grid-2">
              <div class="ui-field client-field">
                <label for="client_name">Client name <span class="req">*</span></label>
                <input
                  id="client_name"
                  v-model="doc.client_name"
                  class="ui-input"
                  :class="{ 'is-invalid': touched && !doc.client_name.trim() }"
                  autocomplete="off"
                  placeholder="Start typing to search saved clients"
                  @focus="clientOpen = true"
                  @blur="closeClients"
                  @keydown.down.prevent="clientIdx = Math.min(clientIdx + 1, clientMatches.length - 1)"
                  @keydown.up.prevent="clientIdx = Math.max(clientIdx - 1, 0)"
                  @keydown.enter.prevent="clientMatches[clientIdx] && pickClient(clientMatches[clientIdx])"
                />
                <div v-if="clientOpen && (clientMatches.length || clientQuery)" class="suggest" role="listbox">
                  <button
                    v-for="(c, i) in clientMatches"
                    :key="c.source + (c.customer_id || '') + c.name + c.email"
                    type="button"
                    class="suggest__row"
                    role="option"
                    :class="{ 'is-active': i === clientIdx }"
                    @mousedown.prevent="pickClient(c)"
                  >
                    <span class="suggest__avatar">{{ (c.name || '?')[0].toUpperCase() }}</span>
                    <span class="suggest__text">
                      <strong>{{ c.name }}</strong>
                      <small>{{ [c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details' }}</small>
                    </span>
                    <span class="suggest__meta">
                      <span v-if="c.currency" class="suggest__cur" :title="clientCurrencyTitle(c)">{{ c.country_code ? flag(c.country_code) + ' ' : '' }}{{ c.currency }}</span>
                      <span class="ui-badge" :class="c.source === 'customers' ? 'ui-badge--info' : 'ui-badge--draft'">{{ c.source === 'customers' ? 'Customer' : 'Previous client' }}</span>
                    </span>
                  </button>
                  <div v-if="!clientMatches.length" class="suggest__empty">No saved clients match “{{ doc.client_name.trim() }}”.</div>
                  <button v-if="canCreateCustomer" type="button" class="suggest__row suggest__new" @mousedown.prevent="openNewClient">
                    <span class="suggest__avatar"><i class="fa-solid fa-plus"></i></span>
                    <span class="suggest__text">
                      <strong>Add “{{ doc.client_name.trim() }}” as a new customer</strong>
                      <small>Saves a customer record you can reuse on future invoices</small>
                    </span>
                  </button>
                </div>
                <div v-if="doc.customer_id" class="client-linked">
                  <i class="fa-solid fa-link"></i> Linked to a customer record
                  <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="doc.customer_id = null">Unlink</button>
                </div>
                <div v-else-if="clientsLoaded && !clients.length" class="ui-hint">No saved clients yet — type a name, or add it as a customer.</div>
              </div>
              <div class="ui-field">
                <label for="client_email">Email</label>
                <input id="client_email" v-model.trim="doc.client_email" type="email" class="ui-input" placeholder="accounts@client.com" />
              </div>
              <div class="ui-field">
                <label for="client_address">Address</label>
                <textarea id="client_address" v-model="doc.client_address" class="ui-textarea" rows="2" placeholder="Street, suburb, state, postcode"></textarea>
              </div>
              <div class="ui-grid-2 inner">
                <div class="ui-field">
                  <label for="client_phone">Phone</label>
                  <input id="client_phone" v-model="doc.client_phone" class="ui-input" />
                </div>
                <div class="ui-field">
                  <label for="client_tax">{{ settings.tax_number_label || 'Tax no.' }}</label>
                  <input id="client_tax" v-model="doc.client_tax_number" class="ui-input" />
                </div>
              </div>
              <div class="ui-field span-2">
                <label for="cc_emails">CC <span class="muted">— copied whenever this {{ isQuote ? 'quote' : 'invoice' }} is emailed</span></label>
                <EmailChips id="cc_emails" rows v-model="doc.cc_emails" :names="ccNames" :exclude="[doc.client_email]" icon="fa-regular fa-user" placeholder="Add people to keep in the loop (optional)" aria-label="CC email addresses" />
                <p v-if="ccFromCustomer" class="ui-hint"><i class="fa-regular fa-address-card"></i> {{ ccFromCustomer }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="ui-card">
          <div class="ui-card__head"><h2><i class="fa-regular fa-calendar head-ico"></i> Details</h2></div>
          <div class="ui-card__body">
            <div class="ui-grid-3">
              <div class="ui-field">
                <label for="issue_date">Issue date</label>
                <input id="issue_date" v-model="doc.issue_date" type="date" class="ui-input" @change="applyTerms(termDays)" />
              </div>
              <div class="ui-field">
                <label for="due_date">{{ isQuote ? 'Valid until' : 'Due date' }}</label>
                <input id="due_date" v-model="doc.due_date" type="date" class="ui-input" :min="doc.issue_date" @change="termDays = null" />
                <div class="chips">
                  <button v-for="t in termOptions" :key="t.days" type="button" class="chip" :class="{ 'is-on': termDays === t.days }" @click="applyTerms(t.days)">{{ t.label }}</button>
                </div>
              </div>
              <div class="ui-field">
                <label for="currency">Currency</label>
                <select id="currency" v-model="doc.currency" class="ui-select" @change="onCurrencyManual">
                  <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region"><option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option></optgroup>
                </select>
                <p v-if="currencyHint" class="cur-hint" role="status"><i class="fa-solid fa-earth-africa"></i> {{ currencyHint }}</p>
              </div>
              <div class="ui-field">
                <label for="reference">Reference / PO</label>
                <input id="reference" v-model="doc.reference" class="ui-input" placeholder="Optional" />
              </div>
              <div class="ui-field span-2">
                <label for="title">Title</label>
                <input id="title" v-model="doc.title" class="ui-input" placeholder="e.g. Website redesign – phase 1" />
              </div>
            </div>
          </div>
        </section>

        <!-- Items -->
        <section class="ui-card">
          <div class="ui-card__head">
            <h2><i class="fa-solid fa-list-ul head-ico"></i> Line items</h2>
            <div class="ui-actions">
              <label class="ui-switch small-switch">
                <input type="checkbox" v-model="doc.prices_include_tax" />
                Prices include tax
              </label>
            </div>
          </div>
          <div class="items">
            <div class="items__head">
              <span>Item</span>
              <span class="r">Qty</span>
              <span class="r">Price</span>
              <span class="r">Disc %</span>
              <span>Tax</span>
              <span class="r">Amount</span>
              <span></span>
            </div>
            <transition-group name="row" tag="div">
              <div v-for="(it, i) in doc.items" :key="it._key" class="item">
                <div class="item__desc">
                  <textarea
                    v-model="it.description"
                    class="ui-textarea desc"
                    :class="{ 'is-invalid': touched && !it.description.trim() && Number(it.unit_price) }"
                    rows="1"
                    placeholder="Description of the product or service"
                    @input="autosize($event)"
                    :ref="(el) => el && autosize({ target: el })"
                    :aria-label="`Item ${i + 1} description`"
                  ></textarea>
                </div>
                <div class="item__qty">
                  <label class="m-label">Qty</label>
                  <input v-model.number="it.quantity" type="number" min="0" step="any" class="ui-input r" :aria-label="`Item ${i + 1} quantity`" />
                </div>
                <div class="item__price">
                  <label class="m-label">Price</label>
                  <input v-model.number="it.unit_price" type="number" :step="step" class="ui-input r" :aria-label="`Item ${i + 1} price`" />
                </div>
                <div class="item__disc">
                  <label class="m-label">Disc %</label>
                  <input v-model.number="it.discount_percent" type="number" min="0" max="100" step="any" class="ui-input r" :aria-label="`Item ${i + 1} discount`" />
                </div>
                <div class="item__tax">
                  <label class="m-label">Tax</label>
                  <select class="ui-select" :value="taxKey(it)" @change="setTax(it, $event.target.value)" :aria-label="`Item ${i + 1} tax`">
                    <option v-for="t in taxOptions" :key="t.key" :value="t.key">{{ t.label }}</option>
                  </select>
                </div>
                <div class="item__amt tabular">{{ money(lineAmount(it)) }}</div>
                <div class="item__tools">
                  <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Duplicate" @click="dupItem(i)"><i class="fa-regular fa-copy"></i></button>
                  <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon del" title="Remove" :disabled="doc.items.length === 1" @click="removeItem(i)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </div>
            </transition-group>
          </div>
          <div class="items__add">
            <button type="button" class="ui-btn ui-btn--sm" @click="addItem()"><i class="fa-solid fa-plus"></i> Add line</button>
            <div class="catalog" v-if="catalog.length">
              <button type="button" class="ui-btn ui-btn--sm" @click="catalogOpen = !catalogOpen"><i class="fa-solid fa-box-open"></i> Add from catalog</button>
              <div v-if="catalogOpen" class="catalog__pop">
                <input v-model="catalogQ" class="ui-input" placeholder="Search services & products" ref="catalogInput" />
                <div class="catalog__list">
                  <button v-for="c in catalogMatches" :key="c.type + c.id" type="button" class="catalog__row" @click="addFromCatalog(c)">
                    <span><strong>{{ c.name }}</strong><small>{{ c.type === 'product' ? 'Product' : 'Service' }}{{ c.meta ? ' · ' + c.meta : '' }}</small></span>
                    <span class="tabular">{{ money(c.price) }}</span>
                  </button>
                  <div v-if="!catalogMatches.length" class="muted pad">No matches</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="ui-card">
          <div class="ui-card__head"><h2><i class="fa-regular fa-note-sticky head-ico"></i> Notes & terms</h2></div>
          <div class="ui-card__body ui-grid-2">
            <div class="ui-field">
              <label for="notes">Notes to client</label>
              <textarea id="notes" v-model="doc.notes" class="ui-textarea" rows="4" placeholder="Thank you for your business!"></textarea>
            </div>
            <div class="ui-field">
              <label for="terms">Terms & conditions</label>
              <textarea id="terms" v-model="doc.terms" class="ui-textarea" rows="4"></textarea>
            </div>
          </div>
        </section>

        <section v-if="canTakeDeposit" class="ui-card" data-testid="deposit-card">
          <div class="ui-card__head">
            <h2><i class="fa-solid fa-hand-holding-dollar head-ico"></i> {{ doc.amount_paid > 0 ? 'Record money received' : 'Already paid / deposit' }}</h2>
            <label class="ui-switch"><input v-model="deposit.enabled" type="checkbox" data-testid="deposit-toggle" /> The client has already paid part of this</label>
          </div>
          <div v-if="deposit.enabled" class="ui-card__body">
            <div class="dep-grid">
              <div class="ui-field">
                <label for="dep_amount">Amount received ({{ doc.currency }}) *</label>
                <input id="dep_amount" v-model.number="deposit.amount" type="number" min="0" :step="step" inputmode="decimal" class="ui-input r" :class="{ 'is-invalid': touched && depositError }" placeholder="0" />
              </div>
              <div class="ui-field">
                <label for="dep_date">Date received</label>
                <input id="dep_date" v-model="deposit.date" type="date" :max="today" class="ui-input" />
              </div>
              <div class="ui-field">
                <label for="dep_method">Method</label>
                <select id="dep_method" v-model="deposit.method" class="ui-select">
                  <option v-for="m in depositMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
              </div>
              <div class="ui-field">
                <label for="dep_ref">Reference <span class="muted">(optional)</span></label>
                <input id="dep_ref" v-model.trim="deposit.reference" class="ui-input" maxlength="255" :placeholder="deposit.method === 'mobile_money' ? 'e.g. M-Pesa code QK12AB34CD' : 'Receipt or transaction number'" />
              </div>
            </div>
            <p v-if="touched && depositError" class="field-error dep-err">{{ depositError }}</p>
            <p v-else class="ui-hint">Recorded as a payment when you save: the invoice shows <strong>Deposit received</strong> and the balance due{{ depositAmount > 0 && depositBalance >= 0 ? ` (${money(depositBalance)})` : '' }}.</p>
          </div>
        </section>

        <section v-if="!isQuote" class="ui-card">
          <div class="ui-card__head">
            <h2><i class="fa-solid fa-repeat head-ico"></i> Recurring</h2>
            <label class="ui-switch"><input type="checkbox" v-model="doc.is_recurring" /> Repeat this invoice</label>
          </div>
          <div v-if="doc.is_recurring" class="ui-card__body ui-grid-3">
            <div class="ui-field">
              <label for="rec_interval">Frequency</label>
              <select id="rec_interval" v-model="doc.recurrence_interval" class="ui-select">
                <option v-for="r in recurrence" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="rec_next">Next invoice on</label>
              <input id="rec_next" v-model="doc.next_recurrence_date" type="date" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="rec_end">End date <span class="muted">(optional)</span></label>
              <input id="rec_end" v-model="doc.recurrence_end_date" type="date" class="ui-input" />
            </div>
            <p class="ui-hint span-3">A new draft copy is created automatically on each date. Review and send it from the Invoices list.</p>
          </div>
        </section>
      </div>

      <!-- Summary -->
      <aside class="side-col">
        <div class="ui-card summary">
          <div class="ui-card__head"><h2>Summary</h2><span class="muted">{{ doc.currency }}</span></div>
          <div class="ui-card__body">
            <dl class="totals">
              <div><dt>Subtotal</dt><dd>{{ money(calc.subtotal) }}</dd></div>
              <div v-if="calc.lineDiscounts > 0"><dt>Line discounts</dt><dd>−{{ money(calc.lineDiscounts) }}</dd></div>
              <div class="disc-row">
                <dt>
                  Discount
                  <span class="seg">
                    <button type="button" :class="{ on: doc.discount_type === 'percent' }" @click="doc.discount_type = 'percent'">%</button>
                    <button type="button" :class="{ on: doc.discount_type === 'amount' }" @click="doc.discount_type = 'amount'">$</button>
                  </span>
                </dt>
                <dd><input v-model.number="doc.discount_value" type="number" min="0" step="any" class="ui-input mini r" aria-label="Discount" /></dd>
              </div>
              <div v-if="calc.docDiscount > 0" class="sub"><dt></dt><dd>−{{ money(calc.docDiscount) }}</dd></div>
              <div>
                <dt>Shipping / other</dt>
                <dd><input v-model.number="doc.shipping_amount" type="number" min="0" :step="step" class="ui-input mini r" aria-label="Shipping" /></dd>
              </div>
              <div v-for="(v, k) in calc.taxByRate" :key="k"><dt>{{ k }}{{ doc.prices_include_tax ? ' (incl.)' : '' }}</dt><dd>{{ money(v) }}</dd></div>
              <div v-if="!Object.keys(calc.taxByRate).length"><dt>Tax</dt><dd>{{ money(0) }}</dd></div>
              <div class="grand"><dt>Total</dt><dd>{{ money(calc.total) }}</dd></div>
              <template v-if="doc.amount_paid > 0 || depositAmount > 0">
                <div v-if="doc.amount_paid > 0"><dt>Paid</dt><dd>−{{ money(doc.amount_paid) }}</dd></div>
                <div v-if="depositAmount > 0" data-testid="summary-deposit"><dt>Deposit received</dt><dd>−{{ money(depositAmount) }}</dd></div>
                <div class="grand small"><dt>Balance due</dt><dd>{{ money(depositBalance) }}</dd></div>
              </template>
            </dl>
            <button class="ui-btn ui-btn--primary w-full" :disabled="saving" @click="save(isNew || doc.status === 'draft')">
              <i :class="saving ? 'fa-solid fa-circle-notch spin' : isNew || doc.status === 'draft' ? 'fa-solid fa-paper-plane' : 'fa-solid fa-check'"></i>
              {{ isNew || doc.status === 'draft' ? 'Save & send' : 'Save changes' }}
            </button>
            <p class="ui-hint center">Tip: press <kbd>Ctrl</kbd> + <kbd>S</kbd> to save a draft.</p>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="newClient" class="ui-modal-backdrop" @mousedown.self="newClient = null">
      <div class="ui-modal" style="max-width: 560px" role="dialog" aria-label="New customer">
        <div class="ui-modal__head">
          <h2>New customer</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" title="Close" @click="newClient = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ui-grid-2">
            <div class="ui-field"><label for="nc_first">First name / company *</label><input id="nc_first" v-model="newClient.first_name" class="ui-input" /></div>
            <div class="ui-field"><label for="nc_last">Last name</label><input id="nc_last" v-model="newClient.last_name" class="ui-input" /></div>
            <div class="ui-field"><label for="nc_email">Email</label><input id="nc_email" v-model="newClient.email" type="email" class="ui-input" /></div>
            <div class="ui-field"><label for="nc_phone">Phone</label><input id="nc_phone" v-model="newClient.phone" class="ui-input" /></div>
          </div>
          <div class="ui-grid-2">
            <div class="ui-field"><label for="nc_street">Address</label><input id="nc_street" v-model="newClient.street" class="ui-input" placeholder="Street address" /></div>
            <div class="ui-field">
              <label for="nc_country">Country</label>
              <CountryPicker id="nc_country" v-model="newClient.country_code" />
            </div>
          </div>
          <p class="ui-hint">
            An email or phone number is required.
            <template v-if="newClient.country_code"> Invoices for this customer will use <strong>{{ newClientCurrency.currency }}</strong>{{ newClientCurrency.source === 'country' ? ` (${countryName(newClient.country_code)})` : ' (your default — this country’s currency isn’t supported)' }}.</template>
          </p>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn ui-btn--ghost" @click="newClient = null">Cancel</button>
          <button type="button" class="ui-btn ui-btn--primary" :disabled="savingClient" @click="saveNewClient">
            <i :class="savingClient ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save customer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { currencyGroups, currencyLabel, countryFlag, countryName, customerCurrency, formatCurrency, currencyStep, currencyDecimals } from '@/utils/currencies'
import CountryPicker from '@/components/customers/CountryPicker.vue'
import EmailChips from '@/components/invoicing/EmailChips.vue'
import { invoicingApi, STATUS_LABELS, RECURRENCE, PAYMENT_METHODS } from '@/services/invoicing'
import { CURRENCY_CODES } from '@/utils/currencies'
import api, { apiErrorMessage } from '@/services/api'
import { calculate } from '@/utils/invoiceMath'
import { isoDate, addDays } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

let keySeq = 0
const blankItem = (tax) => ({ _key: ++keySeq, description: '', quantity: 1, unit: '', unit_price: 0, discount_percent: 0, tax_rate: tax?.rate ?? 0, tax_name: tax?.name ?? '', item_type: 'service', reference_id: '' })

export default {
  name: 'InvoiceEditor',
  components: { CountryPicker, EmailChips },
  props: {
    id: { type: String, default: null },
    docType: { type: String, default: 'invoice' }
  },
  data() {
    return {
      loading: true,
      loadError: null,
      saving: false,
      touched: false,
      errors: [],
      settings: {},
      taxRates: [],
      clients: [],
      clientOpen: false,
      clientIdx: 0,
      clientsLoaded: false,
      newClient: null,
      savingClient: false,
      catalog: [],
      catalogOpen: false,
      catalogQ: '',
      termDays: null,
      currencyTouched: false,
      currencyHint: '',
      ccNames: {},
      ccFromCustomer: '',
      snapshot: '',
      doc: this.emptyDoc(),
      recurrence: RECURRENCE,
      currencyGroups: currencyGroups(),
      deposit: { enabled: false, amount: '', date: isoDate(), method: 'cash', reference: '' },
      depositMethods: PAYMENT_METHODS,
      today: isoDate()
    }
  },
  computed: {
    isNew() {
      return !this.id
    },
    isQuote() {
      return (this.doc.doc_type || this.docType) === 'quote'
    },
    backTo() {
      if (!this.isNew) return `${this.isQuote ? '/quotes' : '/invoices'}/${this.id}`
      return this.isQuote ? '/quotes' : '/invoices'
    },
    heading() {
      const t = this.isQuote ? 'quote' : 'invoice'
      return this.isNew ? `New ${t}` : `Edit ${t}`
    },
    statusLabel() {
      const s = this.doc.display_status || this.doc.status
      return STATUS_LABELS[s] || s
    },
    calc() {
      return calculate(this.doc)
    },
    taxOptions() {
      const opts = this.taxRates.map((t) => ({ key: `${t.name}|${t.rate}`, label: `${t.name} (${t.rate}%)`, name: t.name, rate: t.rate }))
      if (!opts.some((o) => o.rate === 0)) opts.push({ key: 'No tax|0', label: 'No tax', name: '', rate: 0 })
      // Keep values from older documents selectable
      for (const it of this.doc.items) {
        const k = this.taxKey(it)
        if (!opts.some((o) => o.key === k)) opts.push({ key: k, label: `${it.tax_name || 'Tax'} (${it.tax_rate}%)`, name: it.tax_name, rate: Number(it.tax_rate) })
      }
      return opts
    },
    defaultTax() {
      return this.taxRates.find((t) => t.is_default) || this.taxRates[0] || { name: this.settings.tax_label || 'GST', rate: this.settings.default_tax_rate ?? 0 }
    },
    termOptions() {
      if (this.isQuote) return [{ days: 14, label: '14 days' }, { days: 30, label: '30 days' }, { days: 60, label: '60 days' }]
      return [{ days: 0, label: 'On receipt' }, { days: 7, label: '7 days' }, { days: 14, label: '14 days' }, { days: 30, label: '30 days' }]
    },
    clientQuery() {
      return (this.doc.client_name || '').trim().toLowerCase()
    },
    clientMatches() {
      const q = this.clientQuery
      if (!q) return this.clients.slice(0, 8)
      const tokens = q.split(/\s+/).filter(Boolean)
      const digits = q.replace(/\D/g, '')
      const scored = []
      for (const c of this.clients) {
        const name = (c.name || '').toLowerCase()
        const hay = `${name} ${(c.email || '').toLowerCase()} ${(c.phone || '').toLowerCase()}`
        const phoneHit = digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits)
        if (!phoneHit && !tokens.every((t) => hay.includes(t))) continue
        let score = 3
        if (name === q) score = 0
        else if (name.startsWith(q)) score = 1
        else if (name.split(/\s+/).some((w) => w.startsWith(tokens[0]))) score = 2
        scored.push({ c, score })
      }
      scored.sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
      return scored.slice(0, 8).map((x) => x.c)
    },
    canCreateCustomer() {
      const q = this.clientQuery
      return q.length >= 2 && !this.clients.some((c) => c.source === 'customers' && (c.name || '').toLowerCase() === q)
    },
    catalogMatches() {
      const q = this.catalogQ.trim().toLowerCase()
      return (q ? this.catalog.filter((c) => c.name.toLowerCase().includes(q)) : this.catalog).slice(0, 30)
    },
    dirty() {
      return this.snapshot && this.snapshot !== this.serialize()
    },
    step() {
      return currencyStep(this.doc.currency)
    },
    // Money already received can be entered on new, draft and unpaid invoices.
    canTakeDeposit() {
      if (this.isQuote) return false
      if (this.isNew) return true
      return ['draft', 'sent', 'partial'].includes(this.doc.status) && this.calc.total - (Number(this.doc.amount_paid) || 0) > 0.004
    },
    depositAmount() {
      if (!this.deposit.enabled) return 0
      return Number(this.deposit.amount) || 0
    },
    depositBalance() {
      return Math.round((this.calc.total - (Number(this.doc.amount_paid) || 0) - this.depositAmount) * 1000) / 1000
    },
    depositError() {
      if (!this.deposit.enabled || !this.canTakeDeposit) return ''
      const a = Number(this.deposit.amount)
      if (!(a > 0)) return 'Enter the amount the client has already paid.'
      const d = currencyDecimals(this.doc.currency)
      if (Math.abs(Math.round(a * 10 ** d) - a * 10 ** d) > 1e-6) return d === 0 ? `${this.doc.currency} amounts can't have decimals.` : `${this.doc.currency} amounts can have at most ${d} decimal places.`
      const due = this.calc.total - (Number(this.doc.amount_paid) || 0)
      if (a > due + 0.4 / 10 ** d) return `The amount already paid can't be more than the ${this.doc.amount_paid > 0 ? 'balance due' : 'invoice total'} (${this.money(due)}).`
      if (this.deposit.date && this.deposit.date > this.today) return "The date received can't be in the future."
      return ''
    },
    newClientCurrency() {
      return customerCurrency({ country_code: this.newClient?.country_code }, this.settings.currency || orgCurrency())
    }
  },
  watch: {
    'doc.client_name'() {
      this.clientIdx = 0
    },
    catalogOpen(v) {
      if (v) this.$nextTick(() => this.$refs.catalogInput?.focus())
    }
  },
  async created() {
    await this.init()
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('beforeunload', this.onBeforeUnload)
  },
  async beforeRouteLeave() {
    if (this.dirty && !this.saving) {
      return await confirmDialog({ title: 'Discard changes?', message: 'You have unsaved changes on this document.', confirmText: 'Discard', danger: true })
    }
    return true
  },
  methods: {
    money(v) {
      return formatCurrency(v, this.doc.currency)
    },
    flag: countryFlag,
    countryName,
    clientCurrencyTitle(c) {
      const why = { customer: 'set on the customer', country: `from ${c.country_name || 'their country'}`, default: 'your default currency', last_used: 'last used for this client' }[c.currency_source]
      return `${currencyLabel(c.currency)}${why ? ' — ' + why : ''}`
    },
    onCurrencyManual() {
      this.currencyTouched = true
      this.currencyHint = ''
    },
    /**
     * Switch the document to the client's currency. Asks first when the user
     * already picked a currency by hand; line amounts are kept (they're entered
     * in the document currency).
     */
    async applyClientCurrency(c) {
      const target = String(c?.currency || '').toUpperCase()
      if (!target) return
      const hint = this.currencyHintFor(c, target)
      if (target === this.doc.currency) {
        this.currencyHint = hint
        return
      }
      if (this.currencyTouched) {
        const ok = await confirmDialog({
          title: `Switch to ${target}?`,
          message: `${c.name} is usually invoiced in ${currencyLabel(target)} (${hint.replace(/^Currency set /, '').replace(/\.$/, '')}). This ${this.isQuote ? 'quote' : 'invoice'} is currently in ${this.doc.currency}, which you chose. Line amounts stay as entered.`,
          confirmText: `Use ${target}`
        })
        if (!ok) return
      }
      this.doc.currency = target
      this.currencyTouched = false
      this.currencyHint = hint
    },
    currencyHintFor(c, target) {
      switch (c.currency_source) {
        case 'country':
          return `Currency set from customer's country (${c.country_name || countryName(c.country_code)} → ${target}).`
        case 'customer':
          return `Currency set from ${c.name}'s customer record (${target}).`
        case 'last_used':
          return `Currency set to ${target}, last used for ${c.name}.`
        default:
          return c.country_name ? `${c.country_name}'s currency isn't supported, so your default (${target}) is used.` : `Currency set to your default (${target}).`
      }
    },
    /** Pull currency, CC contacts and address from the customer record. */
    async loadCustomerDefaults(customerId) {
      try {
        const d = await invoicingApi.customerDefaults(customerId, this.isQuote ? 'quote' : 'invoice')
        if (!d || this.doc.customer_id !== customerId) return null
        this.applyCC(d)
        return d
      } catch {
        return null
      }
    },
    applyCC(d) {
      const names = { ...this.ccNames }
      for (const r of d.cc || []) if (r.name) names[r.email] = r.name
      this.ccNames = names
      this.doc.cc_emails = [...(d.cc_emails || [])]
      const n = this.doc.cc_emails.length
      this.ccFromCustomer = n ? `${n} contact${n > 1 ? 's' : ''} from ${d.name}'s customer record ${n > 1 ? 'are' : 'is'} copied. Manage them on the customer's Contacts tab.` : ''
      if (d.to?.source === 'primary_billing') this.ccFromCustomer = `${this.ccFromCustomer} Emails go to ${d.to.name || d.to.email} (primary billing contact).`.trim()
    },
    emptyDoc() {
      const today = isoDate()
      return {
        doc_type: this.docType,
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        client_tax_number: '',
        customer_id: null,
        reference: '',
        title: '',
        issue_date: today,
        due_date: addDays(today, 14),
        currency: orgCurrency(),
        prices_include_tax: false,
        discount_type: 'percent',
        discount_value: 0,
        shipping_amount: 0,
        notes: '',
        terms: '',
        is_recurring: false,
        recurrence_interval: 'monthly',
        next_recurrence_date: '',
        recurrence_end_date: '',
        amount_paid: 0,
        cc_emails: [],
        items: [blankItem()]
      }
    },
    async init() {
      this.loading = true
      try {
        const [settingsRes, rates, clients] = await Promise.all([invoicingApi.getSettings(), invoicingApi.taxRates(), invoicingApi.clients().catch(() => [])])
        this.settings = settingsRes?.settings || {}
        this.taxRates = rates || []
        this.clients = clients || []
        this.clientsLoaded = true
        if (this.isNew) {
          const d = this.emptyDoc()
          d.currency = this.settings.currency || orgCurrency()
          d.prices_include_tax = !!this.settings.prices_include_tax
          d.notes = this.settings.default_notes || ''
          d.terms = this.settings.default_terms || ''
          const days = this.isQuote ? this.settings.quote_valid_days ?? 30 : this.settings.default_due_days ?? 14
          d.due_date = addDays(d.issue_date, days)
          this.termDays = days
          d.items = [blankItem(this.defaultTax)]
          // Pre-fill from query (e.g. from a customer or booking)
          const qy = this.$route.query
          if (qy.client_name) d.client_name = String(qy.client_name)
          if (qy.client_email) d.client_email = String(qy.client_email)
          if (qy.currency && CURRENCY_CODES.includes(String(qy.currency).toUpperCase())) d.currency = String(qy.currency).toUpperCase()
          if (qy.customer_id) d.customer_id = String(qy.customer_id)
          this.doc = d
          if (d.customer_id) {
            // Everything else comes from the customer record (server-side).
            const cd = await this.loadCustomerDefaults(d.customer_id)
            if (cd) {
              d.client_name = cd.name || d.client_name
              d.client_email = cd.email || d.client_email
              d.client_phone = cd.phone || ''
              d.client_address = cd.address || ''
              d.currency = cd.currency || d.currency
              this.currencyHint = this.currencyHintFor(cd, d.currency)
            }
          }
        } else {
          const inv = await invoicingApi.get(this.id)
          if (['void', 'converted'].includes(inv.status)) {
            this.loadError = 'This document is locked and can no longer be edited.'
            return
          }
          this.doc = {
            ...inv,
            issue_date: isoDate(inv.issue_date),
            due_date: isoDate(inv.due_date),
            next_recurrence_date: inv.next_recurrence_date ? isoDate(inv.next_recurrence_date) : '',
            recurrence_end_date: inv.recurrence_end_date ? isoDate(inv.recurrence_end_date) : '',
            recurrence_interval: inv.recurrence_interval || 'monthly',
            cc_emails: inv.cc_emails || [],
            items: (inv.items || []).map((i) => ({ ...i, _key: ++keySeq }))
          }
          // An existing document's currency was chosen deliberately.
          this.currencyTouched = true
          if (!this.doc.items.length) this.doc.items = [blankItem(this.defaultTax)]
        }
        this.loadCatalog()
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the document')
      } finally {
        this.loading = false
        this.$nextTick(() => {
          this.snapshot = this.serialize()
        })
      }
    },
    async loadCatalog() {
      const out = []
      const [svc, prod] = await Promise.allSettled([api.get('/services'), api.get('/inventory/products')])
      if (svc.status === 'fulfilled') {
        for (const s of svc.value.data?.services || []) {
          if (s.is_active === false) continue
          out.push({ type: 'service', id: s.id, name: s.name, price: Number(s.price) || 0, description: s.description, meta: s.duration ? `${s.duration} min` : s.category })
        }
      }
      if (prod.status === 'fulfilled') {
        for (const p of prod.value.data?.products || []) {
          out.push({ type: 'product', id: p.id, name: p.name, price: Number(p.selling_price) || 0, description: p.description, unit: p.unit_of_measure, meta: p.sku })
        }
      }
      this.catalog = out
    },
    serialize() {
      const { items, ...rest } = this.doc
      return JSON.stringify([rest, items.map((i) => ({ ...i, _key: undefined })), this.deposit.enabled ? this.deposit : null])
    },
    autosize(e) {
      const el = e.target
      el.style.height = 'auto'
      el.style.height = Math.max(38, el.scrollHeight + 2) + 'px'
    },
    openNewClient() {
      const parts = this.doc.client_name.trim().split(/\s+/)
      this.newClient = {
        first_name: parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || '',
        last_name: parts.length > 1 ? parts[parts.length - 1] : '',
        email: this.doc.client_email || '',
        phone: this.doc.client_phone || '',
        street: '',
        country_code: ''
      }
      this.clientOpen = false
    },
    async saveNewClient() {
      const n = this.newClient
      if (!n.first_name.trim()) return toast.error('Add a first name.')
      if (!n.email.trim() && !n.phone.trim()) return toast.error('Add an email or a phone number.')
      if (n.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email.trim())) return toast.error('The email address looks invalid.')
      this.savingClient = true
      try {
        const res = await api.post('/customers', {
          first_name: n.first_name.trim(),
          last_name: n.last_name.trim(),
          email: n.email.trim(),
          phone: n.phone.trim(),
          country_code: n.country_code || '',
          address: { street: n.street.trim(), country: countryName(n.country_code) }
        })
        const cu = res.data?.customer || res.data?.data || res.data || {}
        const cur = cu.billing_currency ? { currency: cu.billing_currency, source: cu.currency_source } : customerCurrency({ country_code: n.country_code }, this.settings.currency)
        const client = {
          customer_id: cu.id || null,
          name: `${n.first_name} ${n.last_name}`.trim(),
          email: n.email.trim(),
          phone: n.phone.trim(),
          address: [n.street.trim(), n.country_code && n.country_code !== 'AU' ? countryName(n.country_code) : ''].filter(Boolean).join('\n'),
          tax_number: '',
          source: 'customers',
          currency: cur.currency,
          currency_source: cur.source,
          country_code: n.country_code,
          country_name: countryName(n.country_code),
          cc_emails: []
        }
        this.clients.unshift(client)
        this.pickClient(client)
        this.newClient = null
        toast.success('Customer saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the customer'))
      } finally {
        this.savingClient = false
      }
    },
    closeClients() {
      setTimeout(() => (this.clientOpen = false), 120)
    },
    async pickClient(c) {
      this.doc.client_name = c.name
      this.doc.client_email = c.email || this.doc.client_email
      this.doc.client_phone = c.phone || this.doc.client_phone
      this.doc.client_address = c.address || this.doc.client_address
      this.doc.client_tax_number = c.tax_number || this.doc.client_tax_number
      this.doc.customer_id = c.customer_id || null
      this.clientOpen = false
      if (c.customer_id) this.loadCustomerDefaults(c.customer_id)
      else {
        this.ccFromCustomer = ''
        if (!this.doc.cc_emails.length && c.cc_emails?.length) this.doc.cc_emails = [...c.cc_emails]
      }
      await this.applyClientCurrency(c)
    },
    applyTerms(days) {
      if (days === null || days === undefined) return
      this.termDays = days
      this.doc.due_date = addDays(this.doc.issue_date, days)
    },
    taxKey(it) {
      return `${it.tax_name || (Number(it.tax_rate) ? 'Tax' : 'No tax')}|${Number(it.tax_rate) || 0}`
    },
    setTax(it, key) {
      const o = this.taxOptions.find((t) => t.key === key)
      if (o) {
        it.tax_rate = o.rate
        it.tax_name = o.name
      }
    },
    lineAmount(it) {
      const sub = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0)
      return sub - (sub * Math.min(100, Math.max(0, Number(it.discount_percent) || 0))) / 100
    },
    addItem(data = {}) {
      this.doc.items.push({ ...blankItem(this.defaultTax), ...data })
      this.$nextTick(() => {
        const rows = this.$el.querySelectorAll('.item .desc')
        rows[rows.length - 1]?.focus()
      })
    },
    addFromCatalog(c) {
      const data = { description: c.description ? `${c.name} — ${c.description}` : c.name, unit_price: c.price, unit: c.unit || '', item_type: c.type, reference_id: c.id }
      const last = this.doc.items[this.doc.items.length - 1]
      if (last && !last.description.trim() && !Number(last.unit_price)) Object.assign(last, data)
      else this.doc.items.push({ ...blankItem(this.defaultTax), ...data })
      this.catalogOpen = false
      this.catalogQ = ''
    },
    dupItem(i) {
      const copy = { ...this.doc.items[i], _key: ++keySeq }
      delete copy.id
      this.doc.items.splice(i + 1, 0, copy)
    },
    removeItem(i) {
      this.doc.items.splice(i, 1)
    },
    validate() {
      const e = []
      if (!this.doc.client_name.trim()) e.push('Add a client name.')
      if (this.doc.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.doc.client_email)) e.push('The client email address looks invalid.')
      const filled = this.doc.items.filter((i) => i.description.trim() || Number(i.unit_price))
      if (!filled.length) e.push('Add at least one line item.')
      if (filled.some((i) => !i.description.trim())) e.push('Every line item needs a description.')
      if (filled.some((i) => Number(i.quantity) <= 0)) e.push('Quantities must be greater than zero.')
      if (this.doc.due_date && this.doc.issue_date && this.doc.due_date < this.doc.issue_date) e.push('The due date is before the issue date.')
      if (this.calc.total < 0) e.push('The total cannot be negative.')
      if (!this.isNew && this.doc.amount_paid > this.calc.total + 0.004) e.push('The total is less than the amount already paid.')
      if (this.depositError) e.push(this.depositError)
      return e
    },
    payload() {
      const d = this.doc
      return {
        doc_type: this.isQuote ? 'quote' : 'invoice',
        customer_id: d.customer_id || null,
        client_name: d.client_name,
        client_email: d.client_email,
        client_phone: d.client_phone,
        client_address: d.client_address,
        client_tax_number: d.client_tax_number,
        reference: d.reference,
        title: d.title,
        issue_date: d.issue_date,
        due_date: d.due_date,
        currency: d.currency,
        prices_include_tax: !!d.prices_include_tax,
        discount_type: d.discount_type,
        discount_value: Number(d.discount_value) || 0,
        shipping_amount: Number(d.shipping_amount) || 0,
        notes: d.notes,
        terms: d.terms,
        is_recurring: !this.isQuote && !!d.is_recurring,
        recurrence_interval: d.recurrence_interval,
        next_recurrence_date: d.next_recurrence_date || '',
        recurrence_end_date: d.recurrence_end_date || '',
        cc_emails: d.cc_emails || [],
        ...(this.canTakeDeposit && this.deposit.enabled && this.depositAmount > 0
          ? { deposit: { amount: this.depositAmount, date: this.deposit.date || isoDate(), method: this.deposit.method, reference: this.deposit.reference } }
          : {}),
        items: d.items
          .filter((i) => i.description.trim() || Number(i.unit_price))
          .map((i) => ({
            description: i.description.trim(),
            quantity: Number(i.quantity) || 0,
            unit: i.unit || '',
            unit_price: Number(i.unit_price) || 0,
            discount_percent: Number(i.discount_percent) || 0,
            tax_rate: Number(i.tax_rate) || 0,
            tax_name: i.tax_name || '',
            item_type: i.item_type || 'service',
            reference_id: i.reference_id || ''
          }))
      }
    },
    async save(andSend) {
      if (this.saving) return
      this.touched = true
      this.errors = this.validate()
      if (this.errors.length) {
        this.$nextTick(() => this.$refs.errorBox?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        return
      }
      this.saving = andSend ? 'send' : 'draft'
      try {
        const saved = this.isNew ? await invoicingApi.create(this.payload()) : await invoicingApi.update(this.id, this.payload())
        this.snapshot = this.serialize()
        toast.success(`${this.isQuote ? 'Quote' : 'Invoice'} ${saved.number} saved`)
        const base = saved.doc_type === 'quote' ? '/quotes' : '/invoices'
        this.$router.push({ path: `${base}/${saved.id}`, query: andSend ? { send: '1' } : {} })
      } catch (e) {
        this.errors = [apiErrorMessage(e, 'Could not save')]
      } finally {
        this.saving = false
      }
    },
    cancel() {
      this.$router.push(this.backTo)
    },
    onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        this.save(false)
      }
    },
    onBeforeUnload(e) {
      if (this.dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
  }
}
</script>

<style scoped>
.dep-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 14px;
}

.dep-grid .ui-field {
  margin: 0;
}

.dep-err {
  margin: 10px 0 0;
  color: var(--danger);
  font-size: 13px;
}

@media (max-width: 900px) {
  .dep-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .dep-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 550;
  color: var(--text-3);
  margin-bottom: 6px;
}

.back:hover {
  color: var(--accent);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.side-col {
  position: sticky;
  top: calc(var(--topbar-h) + 20px);
}

.head-ico {
  color: var(--text-3);
  margin-right: 6px;
  font-size: 13px;
}

.req {
  color: var(--danger);
}

.muted {
  color: var(--text-3);
}

.pad {
  padding: 12px;
}

.inner {
  gap: 12px;
}

.span-2 {
  grid-column: span 2;
}

.span-3 {
  grid-column: 1 / -1;
  margin: 0;
}

.err-list {
  margin: 4px 0 0;
  padding-left: 18px;
}

.client-field {
  position: relative;
}

.suggest {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  z-index: 30;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
}

.suggest__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  font: inherit;
  color: var(--text);
  cursor: pointer;
}

.suggest {
  max-height: 360px;
  overflow-y: auto;
}

.suggest__text {
  flex: 1;
  min-width: 0;
}

.suggest__text strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggest__empty {
  padding: 10px 8px;
  color: var(--text-3);
  font-size: 13px;
}

.suggest__new {
  border-top: 1px solid var(--border);
  border-radius: 0 0 8px 8px;
  margin-top: 4px;
}

.suggest__new .suggest__avatar {
  background: var(--accent-soft);
  color: var(--accent);
}

.client-linked {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--success);
}

.suggest__row small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.suggest__row.is-active,
.suggest__row:hover {
  background: var(--surface-hover);
}

.suggest__avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
  background: var(--accent-soft);
  color: var(--accent);
}

.cur-hint {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: var(--info);
  display: flex;
  gap: 6px;
  align-items: baseline;
  line-height: 1.4;
}

.suggest__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.suggest__cur {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 999px;
  cursor: pointer;
}

.chip.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.small-switch {
  font-size: 13px;
}

/* Items grid */
.items {
  padding: 8px 16px 0;
  container-type: inline-size;
}

.items__head,
.item {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) 62px 96px 64px 122px 96px 64px;
  gap: 8px;
  align-items: start;
}

.items__head {
  padding: 6px 0;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.item {
  padding: 8px 0;
  border-top: 1px dashed var(--border);
}

.item:first-child {
  border-top: 0;
}

.r {
  text-align: right;
}

.desc {
  min-height: 38px;
  resize: none;
  overflow: hidden;
}

.item__amt {
  text-align: right;
  padding-top: 9px;
  font-weight: 600;
}

.item__tools {
  display: flex;
  gap: 0;
  justify-content: flex-end;
  padding-top: 3px;
  opacity: 0.55;
  transition: opacity 0.15s;
}

.item:hover .item__tools,
.item:focus-within .item__tools {
  opacity: 1;
}

.del:hover {
  color: var(--danger);
}

.m-label {
  display: none;
}

.items__add {
  display: flex;
  gap: 8px;
  padding: 12px 16px 16px;
  flex-wrap: wrap;
}

.catalog {
  position: relative;
}

.catalog__pop {
  position: absolute;
  z-index: 30;
  top: calc(100% + 6px);
  left: 0;
  width: 360px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  padding: 8px;
}

.catalog__list {
  max-height: 280px;
  overflow: auto;
  margin-top: 6px;
}

.catalog__row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  text-align: left;
  font: inherit;
  color: var(--text);
  cursor: pointer;
}

.catalog__row small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.catalog__row:hover {
  background: var(--surface-hover);
}

.row-enter-active,
.row-leave-active {
  transition: all 0.18s var(--ease);
}

.row-enter-from,
.row-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Summary */
.totals {
  margin: 0 0 16px;
  display: grid;
  gap: 10px;
}

.totals > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.totals dt {
  font-weight: 500;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 8px;
}

.totals dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.totals .sub {
  margin-top: -6px;
  font-size: 12.5px;
  color: var(--text-3);
}

.totals .grand {
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 20px;
  font-weight: 700;
}

.totals .grand dt {
  color: var(--text);
  font-weight: 650;
}

.totals .grand.small {
  font-size: 16px;
}

.mini {
  width: 100px;
  min-height: 32px;
  padding: 4px 8px;
}

.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
}

.seg button {
  border: 0;
  background: var(--surface);
  color: var(--text-3);
  font: inherit;
  font-size: 12px;
  width: 24px;
  height: 22px;
  cursor: pointer;
}

.seg button.on {
  background: var(--accent);
  color: #fff;
}

.w-full {
  width: 100%;
  height: 44px;
}

.center {
  text-align: center;
  margin: 10px 0 0;
}

kbd {
  font-family: var(--font-sans);
  font-size: 11px;
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-2);
  color: var(--text-2);
}

@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .side-col {
    position: static;
  }
}

@container (max-width: 640px) {
  .items__head {
    display: none;
  }
  .item {
    grid-template-columns: 1fr 1fr 1fr;
    padding: 12px 0;
  }
  .item__desc,
  .item__tax {
    grid-column: 1 / -1;
  }
  .item__amt {
    grid-column: 1 / 3;
    text-align: left;
  }
  .item__tools {
    opacity: 1;
  }
  .m-label {
    display: block;
    font-size: 11px;
    color: var(--text-3);
    margin-bottom: 2px;
  }
}

@media (max-width: 860px) {
  .span-2 {
    grid-column: auto;
  }
  .catalog__pop {
    width: min(360px, 86vw);
  }
}
</style>
