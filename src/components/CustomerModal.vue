<template>
  <div v-if="show" class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 720px" role="dialog" aria-modal="true" :aria-label="title" @submit.prevent="submit">
      <div class="ui-modal__head">
        <div>
          <h2>{{ title }}</h2>
          <p class="sub">{{ isEditing ? 'Update contact details, address and notes.' : 'Add a person or business you work with.' }}</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div class="section-label">Contact</div>
        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="cm-first">First name <span class="req">*</span></label>
            <input id="cm-first" ref="first" v-model.trim="form.first_name" class="ui-input" :class="{ 'is-invalid': errors.first_name }" autocomplete="off" />
            <span v-if="errors.first_name" class="field-error">{{ errors.first_name }}</span>
          </div>
          <div class="ui-field">
            <label for="cm-last">Last name</label>
            <input id="cm-last" v-model.trim="form.last_name" class="ui-input" autocomplete="off" />
          </div>
          <div class="ui-field">
            <label for="cm-email">Email</label>
            <div class="ui-input-group">
              <i class="fa-regular fa-envelope"></i>
              <input id="cm-email" v-model.trim="form.email" type="email" class="ui-input" :class="{ 'is-invalid': errors.email }" placeholder="name@example.com" />
            </div>
            <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          </div>
          <div class="ui-field">
            <label for="cm-phone">Phone</label>
            <div class="ui-input-group">
              <i class="fa-solid fa-phone"></i>
              <input id="cm-phone" v-model.trim="form.phone" type="tel" class="ui-input" :class="{ 'is-invalid': errors.phone }" placeholder="04xx xxx xxx" maxlength="20" />
            </div>
            <span v-if="errors.phone" class="field-error">{{ errors.phone }}</span>
          </div>
          <div class="ui-field">
            <label for="cm-dob">Date of birth</label>
            <input id="cm-dob" v-model="form.date_of_birth" type="date" class="ui-input" :max="today" />
          </div>
          <div v-if="isEditing" class="ui-field">
            <label>Status</label>
            <label class="ui-switch status-switch">
              <input v-model="form.is_active" type="checkbox" />
              {{ form.is_active ? 'Active' : 'Inactive' }}
            </label>
          </div>
        </div>

        <div class="section-label">Address</div>
        <div class="ui-field" style="margin-bottom: 16px">
          <label for="cm-street">Street address</label>
          <input id="cm-street" v-model="form.address.street" class="ui-input" autocomplete="street-address" />
        </div>
        <div class="addr-grid">
          <div class="ui-field">
            <label for="cm-suburb">Suburb / city</label>
            <input id="cm-suburb" v-model="form.address.suburb" class="ui-input" />
          </div>
          <div class="ui-field">
            <label for="cm-state">State / region</label>
            <input id="cm-state" v-model="form.address.state" class="ui-input" :list="form.country_code === 'AU' ? 'cm-states' : undefined" />
            <datalist id="cm-states">
              <option v-for="s in states" :key="s" :value="s" />
            </datalist>
          </div>
          <div class="ui-field">
            <label for="cm-post">Postcode</label>
            <input id="cm-post" v-model="form.address.postcode" class="ui-input" maxlength="10" />
          </div>
          <div class="ui-field">
            <label for="cm-country">Country</label>
            <CountryPicker id="cm-country" v-model="form.country_code" @change="onCountry" />
          </div>
        </div>

        <div class="section-label">Invoicing</div>
        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="cm-currency">Invoice currency</label>
            <select id="cm-currency" v-model="form.currency" class="ui-select">
              <option value="">Automatic — {{ autoCurrency.currency }} ({{ autoCurrencyReason }})</option>
              <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.flag }} {{ c.code }} — {{ c.name }}</option>
              </optgroup>
            </select>
            <span class="ui-hint">{{ currencyHint }}</span>
          </div>
        </div>

        <div class="section-label">
          Contacts <span v-if="contactsCount" class="count-pill">{{ contactsCount }}</span>
        </div>
        <CustomerContacts v-if="isEditing" :customer-id="customer.id" @changed="contactsCount = $event" />
        <CustomerContacts v-else v-model="pendingContacts" />

        <div class="section-label">Notes</div>
        <div class="ui-field">
          <textarea id="cm-notes" v-model="form.notes" class="ui-textarea" rows="3" placeholder="Preferences, allergies, how they found you…" aria-label="Notes"></textarea>
        </div>
      </div>

      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i>
          {{ isEditing ? 'Save changes' : 'Create customer' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { customerService } from '@/services/customerService'
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { isoDate } from '@/utils/format'
import { currencyGroups, countryName, countryCodeFromName, customerCurrency, currencyLabel } from '@/utils/currencies'
import CountryPicker from './customers/CountryPicker.vue'
import CustomerContacts from './customers/CustomerContacts.vue'

// Organisation default currency (for customers whose country's currency isn't supported).
let orgDefaultPromise = null
function orgDefaultCurrency() {
  if (!orgDefaultPromise) {
    orgDefaultPromise = invoicingApi
      .getSettings()
      .then((r) => r?.settings?.currency || orgCurrency())
      .catch(() => {
        orgDefaultPromise = null
        return orgCurrency()
      })
  }
  return orgDefaultPromise
}

const blank = () => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  is_active: true,
  notes: '',
  country_code: 'AU',
  currency: '',
  address: { street: '', suburb: '', state: '', postcode: '', country: 'Australia' }
})

export default {
  name: 'CustomerModal',
  components: { CountryPicker, CustomerContacts },
  props: {
    show: { type: Boolean, default: false },
    customer: { type: Object, default: null }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      form: blank(),
      errors: {},
      error: '',
      saving: false,
      orgDefault: orgCurrency(),
      pendingContacts: [],
      contactsCount: 0,
      currencyGroups: currencyGroups(),
      today: isoDate(),
      states: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
    }
  },
  computed: {
    isEditing() {
      return !!this.customer?.id
    },
    title() {
      return this.isEditing ? 'Edit customer' : 'New customer'
    },
    autoCurrency() {
      return customerCurrency({ country_code: this.form.country_code }, this.orgDefault)
    },
    autoCurrencyReason() {
      return this.autoCurrency.source === 'country' ? `from ${countryName(this.form.country_code)}` : 'organisation default'
    },
    currencyHint() {
      if (this.form.currency) return `New invoices and quotes for this customer use ${currencyLabel(this.form.currency)}.`
      if (this.autoCurrency.source === 'country') return `Follows the customer's country. Choose a currency to override it.`
      return this.form.country_code
        ? `${countryName(this.form.country_code)}'s currency isn't supported yet, so your default currency is used.`
        : 'No country set, so your default currency is used.'
    }
  },
  watch: {
    show: {
      immediate: true,
      handler(v) {
        if (!v) return
        const c = this.customer
        this.form = c
          ? {
              ...blank(),
              first_name: c.first_name || '',
              last_name: c.last_name || '',
              email: c.email || '',
              phone: c.phone || '',
              notes: c.notes || '',
              is_active: c.is_active !== false,
              date_of_birth: c.date_of_birth ? isoDate(c.date_of_birth) : '',
              address: { ...blank().address, ...(c.address || {}) },
              country_code: c.country_code || countryCodeFromName(c.address?.country),
              currency: c.currency || ''
            }
          : blank()
        this.pendingContacts = []
        this.contactsCount = c?.contacts_count || 0
        orgDefaultCurrency().then((cur) => (this.orgDefault = cur))
        this.errors = {}
        this.error = ''
        this.$nextTick(() => this.$refs.first?.focus())
      }
    }
  },
  methods: {
    close() {
      if (!this.saving) this.$emit('close')
    },
    onCountry(code) {
      this.form.address.country = countryName(code)
    },
    validate() {
      const e = {}
      if (!this.form.first_name) e.first_name = 'First name is required'
      if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) e.email = 'Enter a valid email address'
      if (!this.form.email && !this.form.phone) e.phone = 'Add an email address or a phone number'
      if (this.form.phone && !/^[+\d][\d\s()-]{5,19}$/.test(this.form.phone)) e.phone = 'Enter a valid phone number'
      this.errors = e
      return !Object.keys(e).length
    },
    async submit() {
      if (!this.validate()) return
      this.saving = true
      this.error = ''
      try {
        const payload = { ...this.form, address: { ...this.form.address, country: countryName(this.form.country_code) } }
        const saved = this.isEditing ? await customerService.update(this.customer.id, payload) : await customerService.create(payload)
        let failed = 0
        if (!this.isEditing && saved?.id && this.pendingContacts.length) {
          for (const { _local, ...ct } of this.pendingContacts) {
            try {
              await customerService.createContact(saved.id, ct)
            } catch {
              failed++
            }
          }
        }
        toast.success(this.isEditing ? 'Customer updated' : 'Customer created')
        if (failed) toast.warning(`${failed} contact${failed > 1 ? 's' : ''} could not be saved — add them from the customer's Contacts tab.`)
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the customer')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13.5px;
}

.section-label {
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin: 20px 0 12px;
}

.section-label:first-of-type {
  margin-top: 4px;
}

.addr-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.4fr;
  gap: 16px;
}

.req {
  color: var(--danger);
}

.field-error {
  font-size: 12px;
  color: var(--danger);
}

.count-pill {
  display: inline-block;
  margin-left: 6px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 11px;
  letter-spacing: 0;
}

.status-switch {
  height: 38px;
}

@media (max-width: 640px) {
  .addr-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
