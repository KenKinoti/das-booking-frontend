<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 860px" role="dialog" aria-modal="true" aria-labelledby="rb-title" data-testid="recurring-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">Recurring bill</div>
          <h2 id="rb-title">{{ schedule ? `Edit ${schedule.name}` : 'New recurring bill' }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="form.mode === 'track'" class="ui-alert ui-alert--success">
          <i class="fa-solid fa-link"></i>
          <span>Linked to an Expenses subscription: the supplier's invoices are imported by Expenses (and counted once). This schedule doesn't create bills — it reminds you before each due date and matches the imported bill.</span>
        </div>

        <h3 class="sec">What</h3>
        <div class="grid">
          <label class="ui-field span2">
            <span class="ui-label">Name</span>
            <input v-model="form.name" class="ui-input" maxlength="200" placeholder="e.g. Synergy Wholesale hosting" data-testid="rb-name" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Vendor</span>
            <select v-model="form.vendor_id" class="ui-select" :class="{ 'is-invalid': touched && !form.vendor_id }" data-testid="rb-vendor" @change="onVendor">
              <option value="">Select a vendor…</option>
              <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Category account</span>
            <AccountSelect v-model="form.account_id" :accounts="accounts" :types="['Expense', 'Asset']" placeholder="Vendor's default account" aria-label="Category account" />
          </label>
          <label class="ui-field span2">
            <span class="ui-label">Line description <small class="opt">optional</small></span>
            <input v-model="form.description" class="ui-input" maxlength="400" placeholder="Defaults to the name — the period (e.g. Oct 2026) is added" />
          </label>
        </div>

        <h3 class="sec">Amount</h3>
        <div class="grid">
          <label class="ui-field">
            <span class="ui-label">Amount (incl. tax)</span>
            <input v-model="form.amount" class="ui-input num" type="number" min="0" step="0.01" placeholder="0.00" :class="{ 'is-invalid': touched && !(Number(form.amount) > 0) }" data-testid="rb-amount" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Currency</span>
            <select v-model="form.currency" class="ui-select" data-testid="rb-currency">
              <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
              </optgroup>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Tax rate %</span>
            <input v-model="form.tax_rate" class="ui-input num" type="number" min="0" max="100" step="0.01" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Amount is</span>
            <select v-model="form.amount_mode" class="ui-select" data-testid="rb-amount-mode">
              <option value="fixed">Fixed</option>
              <option value="estimate">An estimate — confirm each time</option>
            </select>
          </label>
          <p v-if="form.currency !== currency" class="ui-hint span-all"><i class="fa-solid fa-right-left"></i> Bills are recorded in {{ currency }}, converted at the exchange rate on the day each bill is created (your manual rate if you set one).</p>
          <p v-if="form.amount_mode === 'estimate'" class="ui-hint span-all">Estimated bills are always created as drafts so the real amount can be confirmed before they count in your books.</p>
        </div>

        <h3 class="sec">Schedule</h3>
        <RecurrenceFields v-model="rec" />
        <div class="grid" style="margin-top: 12px">
          <label class="ui-field">
            <span class="ui-label">Due</span>
            <div class="inline"><input v-model.number="form.due_days" class="ui-input num" type="number" min="0" max="365" aria-label="Due days after the bill date" /><span class="muted">days after the bill date</span></div>
          </label>
          <label v-if="form.mode !== 'track'" class="ui-field">
            <span class="ui-label">Create the bill</span>
            <div class="inline"><input v-model.number="form.advance_days" class="ui-input num" type="number" min="0" max="60" aria-label="Days ahead" /><span class="muted">days ahead</span></div>
          </label>
          <label v-if="isLinked" class="ui-field">
            <span class="ui-label">Bills</span>
            <select v-model="form.mode" class="ui-select">
              <option value="track">Come from Expenses imports (remind only)</option>
              <option value="create">Are created by this schedule</option>
            </select>
          </label>
        </div>
        <div v-if="isLinked && form.mode === 'create'" class="ui-alert ui-alert--warning" style="margin-top: 10px">
          <i class="fa-solid fa-triangle-exclamation"></i><span>Expenses also turns this supplier's invoices into bills — creating them here as well would count the cost twice.</span>
        </div>

        <h3 class="sec">Service</h3>
        <div class="grid">
          <label class="ui-field">
            <span class="ui-label">Keeps online <small class="opt">optional</small></span>
            <input v-model="form.service" class="ui-input" maxlength="200" placeholder="e.g. Web hosting, Google Workspace" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Synergy domain <small class="opt">optional</small></span>
            <input v-model="form.synergy_domain" class="ui-input" maxlength="200" placeholder="example.com.au" />
          </label>
        </div>

        <h3 class="sec">Reminders</h3>
        <div class="grid">
          <label class="ui-field">
            <span class="ui-label">Remind</span>
            <select v-model="leadMode" class="ui-select" :disabled="form.reminders_off">
              <option value="default">Organisation default{{ defaultLeadsText ? ` (${defaultLeadsText})` : '' }}</option>
              <option value="custom">Custom days before the due date</option>
            </select>
          </label>
          <label v-if="leadMode === 'custom'" class="ui-field">
            <span class="ui-label">Days before</span>
            <input v-model="leadText" class="ui-input" placeholder="e.g. 14, 7, 1" :disabled="form.reminders_off" aria-label="Reminder days before" />
          </label>
          <label class="ui-field span2">
            <span class="ui-label">Also email <small class="opt">optional</small></span>
            <input v-model="recipientsText" class="ui-input" placeholder="accounts@example.com, it@example.com" :disabled="form.reminders_off" aria-label="Extra recipients" />
          </label>
          <label class="ui-switch span-all">
            <input v-model="form.reminders_off" type="checkbox" aria-label="No reminders for this bill" />
            No reminders for this bill
          </label>
        </div>
      </div>

      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" data-testid="rb-save">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ schedule ? 'Save changes' : 'Create recurring bill' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import AccountSelect from './AccountSelect.vue'
import RecurrenceFields from './RecurrenceFields.vue'
import { recurringApi } from '@/services/recurringBills'
import { apiErrorMessage } from '@/services/api'
import { currencyGroups } from '@/utils/currencies'
import { orgCurrency } from '@/utils/orgDefaults'
import { isoDate, addDays } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'RecurringBillModal',
  components: { AccountSelect, RecurrenceFields },
  props: {
    schedule: { type: Object, default: null },
    prefill: { type: Object, default: null },
    vendors: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    currency: { type: String, default: () => orgCurrency() },
    defaultLeads: { type: Array, default: () => [7, 1] }
  },
  emits: ['close', 'saved'],
  data() {
    const s = this.schedule || this.prefill || {}
    return {
      form: {
        name: s.name || '',
        vendor_id: s.vendor_id || '',
        account_id: s.account_id || '',
        description: s.description || '',
        amount: s.amount || '',
        currency: s.currency || this.currency,
        tax_rate: s.tax_rate ?? 0,
        amount_mode: s.amount_mode || 'fixed',
        due_days: s.due_days ?? 0,
        advance_days: s.advance_days ?? 7,
        mode: s.mode || 'create',
        service: s.service || '',
        synergy_domain: s.synergy_domain || '',
        reminders_off: !!s.reminders_off,
        subscription_key: s.subscription_key || '',
        expense_vendor_id: s.expense_vendor_id || ''
      },
      rec: {
        frequency: s.frequency || 'monthly',
        interval: s.interval || 2,
        start_date: s.start_date ? isoDate(s.start_date) : addDays(isoDate(), 7),
        end_mode: s.end_mode || 'never',
        end_after: s.end_after || 12,
        end_date: s.end_date ? isoDate(s.end_date) : '',
        create_as: s.create_as || 'draft',
        auto_pay: !!s.auto_pay,
        mode: s.mode || 'create'
      },
      leadMode: Array.isArray(s.reminder_leads) ? 'custom' : 'default',
      leadText: Array.isArray(s.reminder_leads) ? s.reminder_leads.join(', ') : '',
      recipientsText: (s.extra_recipients || []).join(', '),
      currencyGroups: currencyGroups(),
      saving: false,
      touched: false,
      error: ''
    }
  },
  computed: {
    isLinked() {
      return !!this.form.subscription_key || this.form.mode === 'track'
    },
    defaultLeadsText() {
      return (this.defaultLeads || []).map((d) => `${d}d`).join(' & ')
    }
  },
  watch: {
    'form.mode'(v) {
      this.rec = { ...this.rec, mode: v }
    }
  },
  methods: {
    onVendor() {
      const v = this.vendors.find((x) => x.id === this.form.vendor_id)
      if (!v) return
      if (!this.form.name) this.form.name = v.name
      if (!this.form.account_id && v.default_account_id) this.form.account_id = v.default_account_id
    },
    leads() {
      if (this.leadMode !== 'custom') return null
      const out = []
      for (const p of String(this.leadText).split(/[\s,;]+/).filter(Boolean)) {
        const n = parseInt(p, 10)
        if (Number.isNaN(n) || n < 1 || n > 60) throw new Error('Reminder days must be numbers from 1 to 60.')
        out.push(n)
      }
      if (!out.length) throw new Error('Enter at least one reminder day, e.g. 7, 1.')
      return out
    },
    validate() {
      if (!this.form.vendor_id) return 'Choose a vendor.'
      if (!(Number(this.form.amount) > 0)) return 'Enter the amount.'
      if (!this.rec.start_date) return 'Choose the first bill date.'
      if (this.rec.frequency === 'custom' && !(this.rec.interval >= 1 && this.rec.interval <= 60)) return 'Repeat every 1 to 60 months.'
      if (this.rec.end_mode === 'after' && !(this.rec.end_after >= 1)) return 'Enter how many bills.'
      if (this.rec.end_mode === 'on' && (!this.rec.end_date || this.rec.end_date < this.rec.start_date)) return 'The end date must be on or after the first bill date.'
      return ''
    },
    async save() {
      this.touched = true
      this.error = this.validate()
      if (this.error) return
      let leads
      try {
        leads = this.leads()
      } catch (e) {
        this.error = e.message
        return
      }
      const payload = {
        ...this.form,
        amount: Number(this.form.amount),
        tax_rate: Number(this.form.tax_rate) || 0,
        due_days: Number(this.form.due_days) || 0,
        advance_days: Number(this.form.advance_days) || 0,
        frequency: this.rec.frequency,
        interval: Number(this.rec.interval) || 1,
        start_date: this.rec.start_date,
        end_mode: this.rec.end_mode,
        end_after: Number(this.rec.end_after) || 0,
        end_date: this.rec.end_date,
        create_as: this.rec.create_as,
        auto_pay: this.rec.auto_pay,
        reminder_leads: leads,
        extra_recipients: this.recipientsText.split(/[\s,;]+/).filter(Boolean)
      }
      this.saving = true
      try {
        const saved = this.schedule ? await recurringApi.update(this.schedule.id, payload) : await recurringApi.create(payload)
        toast.success(this.schedule ? 'Recurring bill updated' : `${saved.name} scheduled — ${saved.summary}`)
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the recurring bill')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sec {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
  margin: 18px 0 10px;
}
.sec:first-of-type {
  margin-top: 4px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px 14px;
  align-items: start;
}
.span2 {
  grid-column: span 2;
}
.span-all {
  grid-column: 1 / -1;
  margin: 0;
}
.num {
  font-variant-numeric: tabular-nums;
}
.inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.inline .ui-input {
  width: 80px;
}
.muted,
.opt {
  color: var(--text-3);
  font-size: 12.5px;
  font-weight: 400;
}
@media (max-width: 560px) {
  .span2 {
    grid-column: 1 / -1;
  }
}
</style>
