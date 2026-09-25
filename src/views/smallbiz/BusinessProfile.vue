<template>
  <form class="profile" novalidate @submit.prevent="save">
    <section class="ui-card">
      <div class="ui-card__head">
        <h2>About your business</h2>
        <span v-if="!settings.configured" class="ui-badge ui-badge--warning">Not set up yet</span>
      </div>
      <div class="ui-card__body grid2">
        <div class="ui-field">
          <label for="bp_name">Trading name *</label>
          <input id="bp_name" v-model="form.trading_name" class="ui-input" :class="{ 'has-error': errors.trading_name }" maxlength="200" placeholder="e.g. Sunrise Bakery" />
          <div v-if="errors.trading_name" class="err">{{ errors.trading_name }}</div>
        </div>
        <div class="ui-field">
          <label for="bp_owner">Owner</label>
          <input id="bp_owner" v-model="form.owner_name" class="ui-input" maxlength="200" placeholder="Your name" />
        </div>
        <div class="ui-field">
          <label for="bp_ind">Industry</label>
          <input id="bp_ind" v-model="form.industry" class="ui-input" list="bp_industries" maxlength="100" placeholder="e.g. Food & beverage" />
          <datalist id="bp_industries">
            <option v-for="i in industries" :key="i" :value="i"></option>
          </datalist>
        </div>
        <div class="ui-field">
          <label for="bp_reg">Registration number</label>
          <input id="bp_reg" v-model="form.registration_number" class="ui-input" maxlength="100" placeholder="Company / business registration" />
        </div>
        <div class="ui-field">
          <label for="bp_email">Email</label>
          <input id="bp_email" v-model="form.email" type="email" class="ui-input" :class="{ 'has-error': errors.email }" maxlength="200" />
          <div v-if="errors.email" class="err">{{ errors.email }}</div>
        </div>
        <div class="ui-field">
          <label for="bp_phone">Phone</label>
          <input id="bp_phone" v-model="form.phone" type="tel" class="ui-input" maxlength="60" />
        </div>
        <div class="ui-field span2">
          <label for="bp_addr">Address</label>
          <textarea id="bp_addr" v-model="form.address" class="ui-textarea" rows="2"></textarea>
        </div>
      </div>
    </section>

    <section class="ui-card">
      <div class="ui-card__head"><h2>Money &amp; tax</h2></div>
      <div class="ui-card__body grid2">
        <div class="ui-field">
          <label for="bp_cur">Default currency</label>
          <select id="bp_cur" v-model="form.currency" class="ui-select" :class="{ 'has-error': errors.currency }">
            <optgroup v-for="g in groups" :key="g.region" :label="g.region">
              <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.flag }} {{ c.code }} — {{ c.name }}</option>
            </optgroup>
          </select>
          <div v-if="errors.currency" class="err">{{ errors.currency }}</div>
          <div v-else class="ui-hint">Defaults to your organisation's currency (<router-link to="/settings#regional">Settings</router-link>) and follows it until you enter an opening balance.</div>
        </div>
        <div class="ui-field">
          <label for="bp_fy">Financial year starts</label>
          <select id="bp_fy" v-model.number="form.financial_year_start" class="ui-select">
            <option v-for="(m, i) in months" :key="m" :value="i + 1">1 {{ m }}</option>
          </select>
        </div>
        <div class="ui-field">
          <label for="bp_open">Opening cash balance</label>
          <input id="bp_open" v-model.trim="form.opening_balance" class="ui-input num" inputmode="decimal" :class="{ 'has-error': errors.opening_balance }" placeholder="0.00" />
          <div v-if="errors.opening_balance" class="err">{{ errors.opening_balance }}</div>
          <div v-else class="ui-hint">What was in the bank/till when you started using the hub.</div>
        </div>
        <div class="ui-field">
          <span class="ui-label">Tax registration</span>
          <label class="ui-switch reg"><input v-model="form.tax_registered" type="checkbox" /> I charge {{ form.tax_name || 'sales tax' }} (registered for GST/VAT)</label>
        </div>
        <div class="ui-field">
          <label for="bp_taxname">Tax name</label>
          <select id="bp_taxname" v-model="form.tax_name" class="ui-select">
            <option v-for="n in taxNames" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div class="ui-field">
          <label for="bp_rate">Standard rate %</label>
          <input id="bp_rate" v-model.number="form.tax_rate" type="number" min="0" max="100" step="0.01" class="ui-input" :class="{ 'has-error': errors.tax_rate }" />
          <div v-if="errors.tax_rate" class="err">{{ errors.tax_rate }}</div>
          <div v-else class="ui-hint">{{ form.tax_registered ? 'Added to new entries by default (you can change it per entry).' : 'Only used if you charge tax.' }}</div>
        </div>
        <div class="ui-field span2">
          <label for="bp_taxno">Tax number</label>
          <input id="bp_taxno" v-model="form.tax_number" class="ui-input" maxlength="100" placeholder="ABN, VAT number, KRA PIN, TIN…" />
        </div>
      </div>
    </section>

    <section class="ui-card">
      <div class="ui-card__head"><h2>Categories</h2></div>
      <div class="ui-card__body cats-row">
        <p>Your cash book comes with everyday categories like Sales, Rent and Fuel. Rename them, add your own, or mark some as tax-free.</p>
        <button type="button" class="ui-btn" @click="$emit('manage-categories')"><i class="fa-solid fa-tags"></i> Manage categories</button>
      </div>
    </section>

    <div class="savebar">
      <span v-if="dirty" class="muted">You have unsaved changes</span>
      <button type="button" class="ui-btn" :disabled="!dirty || saving" @click="reset">Discard</button>
      <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving"><i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> Save profile</button>
    </div>
  </form>
</template>

<script>
import { smallbizApi, parseMinor, fieldErrors, MONTHS } from '@/services/smallbiz'
import { apiErrorMessage } from '@/services/api'
import { currencyGroups } from '@/utils/currencies'
import { toast } from '@/composables/useToast'

const FIELDS = ['trading_name', 'owner_name', 'registration_number', 'tax_number', 'industry', 'email', 'phone', 'address', 'financial_year_start', 'currency', 'tax_name', 'tax_rate', 'tax_registered', 'opening_balance']

export default {
  name: 'BusinessProfile',
  props: { settings: { type: Object, required: true } },
  emits: ['saved', 'manage-categories'],
  data() {
    return {
      form: this.fromSettings(),
      errors: {},
      saving: false,
      groups: currencyGroups(),
      months: MONTHS,
      taxNames: ['GST', 'VAT', 'Sales tax', 'Consumption tax', 'Tax'],
      industries: ['Retail', 'Food & beverage', 'Hospitality', 'Trades & construction', 'Professional services', 'Beauty & wellness', 'Health', 'Transport & logistics', 'Agriculture', 'Creative & media', 'Education', 'Technology', 'Cleaning', 'Automotive', 'Other']
    }
  },
  computed: {
    dirty() {
      const a = this.fromSettings()
      return FIELDS.some((k) => String(a[k] ?? '') !== String(this.form[k] ?? ''))
    }
  },
  watch: {
    settings() {
      this.form = this.fromSettings()
    }
  },
  methods: {
    fromSettings() {
      const s = this.settings
      const f = {}
      for (const k of FIELDS) f[k] = s[k] ?? ''
      f.tax_registered = !!s.tax_registered
      f.tax_name = s.tax_name || 'Tax'
      return f
    },
    reset() {
      this.form = this.fromSettings()
      this.errors = {}
    },
    async save() {
      const e = {}
      if (!String(this.form.trading_name).trim()) e.trading_name = 'Add your trading name'
      const r = Number(this.form.tax_rate)
      if (this.form.tax_rate === '' || Number.isNaN(r) || r < 0 || r > 100) e.tax_rate = 'Enter a rate between 0 and 100'
      if (this.form.opening_balance && parseMinor(this.form.opening_balance, this.form.currency) === null) e.opening_balance = 'Enter a valid amount'
      if (this.form.email && !/^\S+@\S+\.\S+$/.test(this.form.email)) e.email = 'Enter a valid email'
      this.errors = e
      if (Object.keys(e).length) {
        toast.error('Please fix the highlighted fields')
        return
      }
      this.saving = true
      try {
        const s = await smallbizApi.saveSettings({ ...this.form, tax_rate: r })
        toast.success('Business profile saved')
        this.$emit('saved', s)
      } catch (err) {
        const f = fieldErrors(err)
        if (Object.keys(f).length) this.errors = f
        toast.error(apiErrorMessage(err, 'Could not save profile'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 980px;
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

.span2 {
  grid-column: 1 / -1;
}

.has-error {
  border-color: var(--danger) !important;
}

.err {
  color: var(--danger);
  font-size: 12.5px;
}

.num {
  font-variant-numeric: tabular-nums;
}

.reg {
  min-height: 38px;
}

.cats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.cats-row p {
  margin: 0;
  color: var(--text-2);
  flex: 1 1 320px;
}

.savebar {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  z-index: 3;
}

.muted {
  color: var(--text-3);
  font-size: 13px;
  margin-right: auto;
}

@media (max-width: 700px) {
  .grid2 {
    grid-template-columns: 1fr;
  }
}
</style>
