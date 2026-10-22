<template>
  <div class="cs" data-testid="customer-subscriptions">
    <div class="cs__bar">
      <p>Hosting, domains and other services this client pays for on a schedule.</p>
      <span class="cs__btns">
        <button v-if="list.length" type="button" class="ui-btn ui-btn--sm" :disabled="copying" data-testid="cs-portal" @click="copyPortal"><i class="fa-solid fa-link"></i> “Your services” link</button>
        <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" data-testid="cs-new" @click="modal = true"><i class="fa-solid fa-plus"></i> New subscription</button>
      </span>
    </div>
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    <div v-if="loading" class="ui-skeleton" style="height: 90px"></div>
    <div v-else-if="!list.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-arrows-rotate"></i></div>
      <h3>No subscriptions</h3>
      <p>Put {{ customerName || 'this client' }} on your catalogue services (hosting, a domain, email…) and invoices go out every month, quarter or year with the pay link.</p>
    </div>
    <ul v-else class="cs__list">
      <li v-for="s in list" :key="s.id" :data-testid="`cs-${s.number}`">
        <router-link :to="{ path: '/subscriptions', query: { sub: s.id } }" class="cs__item">
          <span class="cs__main">
            <strong>{{ s.name }}</strong>
            <small>{{ s.number }} · {{ periodLabel(s.period) }} · {{ money(s.amount_tax, s.currency) }}</small>
            <small v-if="s.open">{{ s.open.invoice_number }} due {{ date(s.open.due_date) }}{{ s.open.days_overdue > 0 ? ` — ${s.open.days_overdue} days overdue` : '' }}{{ s.open.suspend_on && s.status !== 'suspended' ? `, suspended ${date(s.open.suspend_on)} unless paid` : '' }}</small>
            <small v-else-if="s.status !== 'cancelled' && s.next_billing_date">Next billing {{ date(s.next_billing_date) }}</small>
          </span>
          <span class="ui-badge" :class="statusBadge(s.status)">{{ statusLabel(s.status) }}</span>
        </router-link>
      </li>
    </ul>
    <SubscriptionModal v-if="modal" :preset="{ customer_id: customerId, customer_name: customerName }" @close="modal = false" @saved="onSaved" />
  </div>
</template>

<script>
import SubscriptionModal from './SubscriptionModal.vue'
import { subscriptionsApi, periodLabel, statusLabel, statusBadge } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import { formatCurrency } from '@/utils/currencies'

export default {
  name: 'CustomerSubscriptions',
  components: { SubscriptionModal },
  props: {
    customerId: { type: String, required: true },
    customerName: { type: String, default: '' }
  },
  emits: ['changed'],
  data() {
    return { list: [], loading: true, error: '', modal: false, copying: false }
  },
  watch: {
    customerId() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    periodLabel,
    statusLabel,
    statusBadge,
    money(v, c) {
      return formatCurrency(v, c)
    },
    date(d) {
      return formatDate(d, 'short')
    },
    async load() {
      this.loading = true
      try {
        const r = await subscriptionsApi.list({ customer_id: this.customerId })
        this.list = r.subscriptions || []
        this.error = ''
      } catch (e) {
        // Subscriptions belong to the invoicing module: hide quietly without it.
        this.error = e.response?.status === 402 || e.response?.status === 403 ? '' : apiErrorMessage(e, 'Could not load the subscriptions')
        this.list = []
      } finally {
        this.loading = false
      }
    },
    onSaved(s) {
      this.modal = false
      this.load()
      this.$emit('changed', s)
    },
    async copyPortal() {
      this.copying = true
      try {
        const r = await subscriptionsApi.portalLink(this.customerId)
        const url = r.url || `${window.location.origin}${r.path}`
        try {
          await navigator.clipboard.writeText(url)
          toast.success('Link copied — send it to the client')
        } catch {
          toast.info(url)
        }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not get the link'))
      } finally {
        this.copying = false
      }
    }
  }
}
</script>

<style scoped>
.cs__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.cs__bar p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
.cs__btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cs__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.cs__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: inherit;
  text-decoration: none;
}
.cs__item:hover {
  border-color: var(--border-strong);
}
.cs__main {
  min-width: 0;
}
.cs__main small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}
</style>
