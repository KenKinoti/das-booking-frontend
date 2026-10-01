<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 560px" role="dialog" aria-modal="true" aria-labelledby="ren-title" data-testid="renewal-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">{{ renewal ? (renewal.source === 'synergy_api' ? 'From Synergy Wholesale' : 'Renewal') : 'New renewal' }}</div>
          <h2 id="ren-title">{{ renewal ? renewal.name : 'Track a renewal' }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div class="grid">
          <label class="ui-field span2">
            <span class="ui-label">Name</span>
            <input v-model.trim="form.name" class="ui-input" :disabled="synced" placeholder="e.g. client.com.au, SSL certificate" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Kind</span>
            <select v-model="form.kind" class="ui-select" :disabled="synced">
              <option value="domain">Domain</option>
              <option value="hosting">Hosting</option>
              <option value="ssl">SSL certificate</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Renews / expires on</span>
            <input v-model="form.expires_on" type="date" class="ui-input" :disabled="synced" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Your cost</span>
            <input v-model="form.cost" type="number" min="0" step="0.01" class="ui-input" data-testid="ren-cost" />
            <span v-if="renewal?.cost_source === 'synergy_pricing'" class="ui-hint">From Synergy's price list (wholesale, may exclude GST)</span>
          </label>
          <label class="ui-field">
            <span class="ui-label">Currency</span>
            <select v-model="form.currency" class="ui-select">
              <optgroup v-for="g in groups" :key="g.region" :label="g.region">
                <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }}</option>
              </optgroup>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Client</span>
            <select v-model="form.customer_id" class="ui-select" data-testid="ren-client">
              <option value="">— none —</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">You charge the client</span>
            <input v-model="form.price" type="number" min="0" step="0.01" class="ui-input" placeholder="optional" />
          </label>
          <label class="ui-switch span2"><input v-model="form.auto_renew" type="checkbox" :disabled="synced" /> <span>Auto-renews</span></label>
        </div>
        <p v-if="synced" class="ui-hint">Name, date and auto-renew come from Synergy Wholesale and update on every sync.</p>
      </div>
      <div class="ui-modal__foot">
        <button v-if="renewal && renewal.source !== 'synergy_api'" type="button" class="ui-btn ui-btn--ghost danger" :disabled="busy" @click="archive">Stop tracking</button>
        <span class="spacer"></span>
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="ren-save">Save</button>
      </div>
    </form>
  </div>
</template>

<script>
import { expensesApi } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { currencyGroups } from '@/utils/currencies'
import { orgCurrency } from '@/utils/orgDefaults'

export default {
  name: 'RenewalModal',
  props: {
    renewal: { type: Object, default: null },
    customers: { type: Array, default: () => [] }
  },
  emits: ['close', 'saved'],
  data() {
    const r = this.renewal || {}
    return {
      busy: false,
      error: '',
      groups: currencyGroups(),
      form: {
        name: r.name || '',
        kind: r.kind || 'domain',
        expires_on: r.expires_on ? String(r.expires_on).slice(0, 10) : '',
        cost: r.cost ?? '',
        currency: r.currency || orgCurrency(),
        customer_id: r.customer_id || '',
        price: r.price ?? '',
        auto_renew: !!r.auto_renew
      }
    }
  },
  computed: {
    synced() {
      return this.renewal?.source === 'synergy_api'
    }
  },
  methods: {
    body() {
      const b = { cost: Number(this.form.cost) || 0, currency: this.form.currency, customer_id: this.form.customer_id, price: Number(this.form.price) || 0 }
      if (!this.synced) Object.assign(b, { name: this.form.name, kind: this.form.kind, expires_on: this.form.expires_on, auto_renew: this.form.auto_renew })
      return b
    },
    async save() {
      if (!this.form.name) return (this.error = 'Enter a name')
      if (!this.synced && !this.form.expires_on) return (this.error = 'Enter the renewal date')
      this.busy = true
      try {
        await expensesApi.saveRenewal(this.renewal?.id, this.body())
        toast.success('Renewal saved')
        this.$emit('saved')
        this.$emit('close')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save')
      } finally {
        this.busy = false
      }
    },
    async archive() {
      this.busy = true
      try {
        await expensesApi.saveRenewal(this.renewal.id, { active: false })
        toast.success('No longer tracked')
        this.$emit('saved')
        this.$emit('close')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not update')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.span2 {
  grid-column: span 2;
}
.spacer {
  flex: 1;
}
.danger {
  color: var(--danger);
}
@media (max-width: 480px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .span2 {
    grid-column: auto;
  }
}
</style>
