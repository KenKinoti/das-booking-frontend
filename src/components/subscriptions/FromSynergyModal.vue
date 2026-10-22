<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" aria-labelledby="fs-title" data-testid="from-synergy-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">Synergy Wholesale site</div>
          <h2 id="fs-title">Bill {{ site.domain }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <p class="ui-hint">{{ site.plan || 'Hosting' }} · Synergy charges you {{ money(site.cost_home, site.home) }} a month. Suspended and unsuspended at Synergy automatically when the API is connected.</p>
        <div class="ui-field">
          <label for="fs-customer">Client</label>
          <CustomerPicker id="fs-customer" v-model="f.customer_id" :initial-name="site.customer_name" @picked="onCustomer" />
        </div>
        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="fs-service">Catalogue service</label>
            <select id="fs-service" v-model="f.service_id" class="ui-select" data-testid="fs-service" @change="onService">
              <option value="none">No catalogue service</option>
              <option v-for="s in catalog" :key="s.id" :value="s.id">{{ s.name }} — {{ money(s.price, s.currency) }}</option>
            </select>
            <label v-if="f.service_id === 'none'" class="ui-switch save-svc"><input v-model="f.save_service" type="checkbox" data-testid="fs-save-service" /> <span>Save it as a service for “{{ site.plan || 'this plan' }}” sites</span></label>
          </div>
          <div class="ui-field">
            <label for="fs-period">Billing period</label>
            <select id="fs-period" v-model="f.period" class="ui-select" data-testid="fs-period" @change="onPeriod">
              <option v-for="p in PERIODS" :key="p.key" :value="p.key">{{ p.label }}</option>
            </select>
          </div>
        </div>
        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="fs-price">Price per {{ periodNoun(f.period) }} ({{ cur }})</label>
            <input id="fs-price" v-model="f.price" class="ui-input num" type="number" min="0" step="any" data-testid="fs-price" />
            <span v-if="note" class="ui-hint">{{ note }}</span>
          </div>
          <div class="ui-field">
            <label for="fs-start">Billing starts</label>
            <input id="fs-start" v-model="f.start_date" class="ui-input" type="date" data-testid="fs-start" />
            <span class="ui-hint">The next renewal — the first invoice goes out a few days before.</span>
          </div>
        </div>
        <div class="ui-field">
          <label for="fs-desc">On the invoice</label>
          <input id="fs-desc" v-model.trim="f.description" class="ui-input" data-testid="fs-desc" />
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="fs-create"><i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Create subscription</button>
      </div>
    </form>
  </div>
</template>

<script>
import CustomerPicker from './CustomerPicker.vue'
import { subscriptionsApi, PERIODS, periodNoun } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatCurrency } from '@/utils/currencies'

export default {
  name: 'FromSynergyModal',
  components: { CustomerPicker },
  props: { site: { type: Object, required: true } },
  emits: ['close', 'created'],
  data() {
    const sg = this.site.suggestion || {}
    return {
      PERIODS,
      catalog: [],
      cur: sg.currency || this.site.home,
      note: sg.note || '',
      busy: false,
      error: '',
      f: {
        customer_id: this.site.customer_id || '',
        service_id: sg.service_id || 'none',
        save_service: !sg.service_id,
        period: sg.period || 'monthly',
        price: sg.price || '',
        start_date: (this.site.start || '').slice(0, 10),
        description: sg.description || ''
      }
    }
  },
  created() {
    this.loadCatalog()
  },
  methods: {
    periodNoun,
    money(v, c) {
      return formatCurrency(v || 0, c)
    },
    async loadCatalog() {
      try {
        const r = await subscriptionsApi.catalog({ currency: this.cur, period: this.f.period })
        this.catalog = r.services || []
      } catch {
        this.catalog = []
      }
    },
    onCustomer(c) {
      if (c?.currency && c.currency !== this.cur) {
        this.cur = c.currency
        this.loadCatalog()
      }
    },
    async onPeriod() {
      await this.loadCatalog()
      this.onService()
    },
    onService() {
      const s = this.catalog.find((x) => x.id === this.f.service_id)
      if (!s) return
      if (s.period && s.period !== this.f.period) {
        this.f.period = s.period
        return this.onPeriod()
      }
      if (s.quote !== null && s.quote !== undefined) this.f.price = s.quote
      this.f.description = s.label
      this.note = `From the catalogue: ${s.name}${s.quote_note ? ` (${s.quote_note})` : ''}`
    },
    async save() {
      this.error = ''
      if (!this.f.customer_id) {
        this.error = 'Choose the client this site belongs to.'
        return
      }
      if (!(Number(this.f.price) > 0)) {
        this.error = 'Enter the price.'
        return
      }
      this.busy = true
      try {
        const sub = await subscriptionsApi.fromSynergy({
          domain: this.site.domain,
          customer_id: this.f.customer_id,
          service_id: this.f.service_id,
          save_service: this.f.service_id === 'none' && this.f.save_service,
          price: Number(this.f.price),
          period: this.f.period,
          start_date: this.f.start_date,
          description: this.f.description
        })
        toast.success(`${sub.number} created — ${this.site.domain}`)
        this.$emit('created', sub)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not create the subscription')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.num {
  font-variant-numeric: tabular-nums;
}
.save-svc {
  margin-top: 6px;
  font-size: 13px;
}
</style>
