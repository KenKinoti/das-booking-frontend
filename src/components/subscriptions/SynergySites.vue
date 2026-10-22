<template>
  <div data-testid="synergy-sites-tab">
    <div class="toolbar">
      <p class="hs-lead">
        Your Synergy Wholesale hosted sites (Expenses → Synergy) with the client each one is matched to. Create a client's subscription in one click — priced from your catalogue, what you bill them today, or the retail helper ({{ margin }}% margin on Synergy's cost).
      </p>
      <div class="toolbar__right">
        <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="loading" @click="load(true)"><i class="fa-solid fa-rotate"></i> Refresh</button>
        <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" :disabled="!ready.length || bulkBusy" data-testid="bulk-create" @click="bulk">
          <i :class="bulkBusy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-wand-magic-sparkles'"></i> Create subscriptions for all matched sites<span v-if="ready.length"> ({{ ready.length }})</span>
        </button>
      </div>
    </div>
    <div v-if="error" class="ui-card__body"><div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div></div>
    <div v-if="loading && !sites.length" class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div>
    <div v-else-if="!sites.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-server"></i></div>
      <h3>No Synergy sites yet</h3>
      <p>Upload your Synergy Wholesale statements and hosting usage reports (or connect the API) in Expenses → Synergy, and every hosted site shows up here.</p>
      <router-link to="/expenses?tab=synergy" class="ui-btn ui-btn--primary" style="margin-top: 12px"><i class="fa-solid fa-upload"></i> Go to Expenses → Synergy</router-link>
    </div>
    <template v-else>
      <div class="chips-row">
        <button v-for="fl in filters" :key="fl.key" type="button" class="chip" :class="{ on: filter === fl.key }" :aria-pressed="filter === fl.key" :data-testid="`sites-filter-${fl.key}`" @click="filter = fl.key">
          {{ fl.label }}<span class="chip__n">{{ fl.count }}</span>
        </button>
      </div>
      <div class="ui-table-wrap">
        <table class="ui-table" v-table-cards data-testid="sites-table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Client</th>
              <th class="num">Synergy cost /mo</th>
              <th>Bill as</th>
              <th data-label=""></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in shown" :key="s.domain" :data-testid="`site-${s.domain}`" :data-ready="s.ready ? '1' : '0'">
              <td class="card-title">
                <strong>{{ s.domain }}</strong>
                <small class="sub">{{ s.plan || 'plan unknown' }}<template v-if="s.status !== 'active'"> · {{ s.status }}</template></small>
              </td>
              <td>
                <template v-if="s.customer_name">{{ s.customer_name }}<small class="sub">{{ matchLabel(s.client_match) }}</small></template>
                <span v-else-if="s.no_client" class="muted">Not a client site</span>
                <span v-else class="warn-txt"><i class="fa-solid fa-circle-question"></i> No client matched</span>
              </td>
              <td class="num">{{ money(s.cost_home, s.home) }}</td>
              <td>
                <template v-if="s.subscription">
                  <router-link :to="{ path: '/subscriptions', query: { sub: s.subscription.id } }" class="sub-link" :data-testid="`site-sub-${s.domain}`">{{ s.subscription.number }}</router-link>
                  <span class="ui-badge" :class="statusBadge(s.subscription.status)">{{ statusLabel(s.subscription.status) }}</span>
                </template>
                <template v-else-if="s.suggestion && s.suggestion.price > 0">
                  <strong class="num">{{ money(s.suggestion.price, s.suggestion.currency) }}</strong><small class="sub">{{ periodLabel(s.suggestion.period) }} · {{ sourceLabel(s.suggestion) }}</small>
                </template>
                <span v-else class="muted">—</span>
                <small v-if="!s.subscription && s.reason" class="sub">{{ s.reason }}</small>
              </td>
              <td class="row-actions">
                <template v-if="!s.subscription && s.status !== 'cancelled' && !s.no_client">
                  <button v-if="s.ready" type="button" class="ui-btn ui-btn--sm ui-btn--primary" :disabled="busy === s.domain" :data-testid="`site-create-${s.domain}`" @click="quick(s)">
                    <i :class="busy === s.domain ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-plus'"></i> Create
                  </button>
                  <button type="button" class="ui-btn ui-btn--sm" :data-testid="`site-review-${s.domain}`" @click="review(s)">{{ s.ready ? 'Review…' : 'Set up…' }}</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <FromSynergyModal v-if="modalSite" :site="modalSite" @close="modalSite = null" @created="onCreated" />
  </div>
</template>

<script>
import FromSynergyModal from './FromSynergyModal.vue'
import { subscriptionsApi, periodLabel, statusLabel, statusBadge } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatCurrency } from '@/utils/currencies'

export default {
  name: 'SynergySites',
  components: { FromSynergyModal },
  props: {
    /** Open the set-up modal for this domain once loaded (deep link from Expenses). */
    openDomain: { type: String, default: '' }
  },
  emits: ['created', 'count'],
  data() {
    // fresh: domains billed in this visit — they stay in the list (now showing their subscription) until the filter changes.
    return { sites: [], margin: 50, loading: true, error: '', busy: '', bulkBusy: false, modalSite: null, filter: 'unbilled', fresh: [] }
  },
  computed: {
    ready() {
      return this.sites.filter((s) => s.ready)
    },
    filters() {
      const n = (fn) => this.sites.filter(fn).length
      return [
        { key: 'unbilled', label: 'Not billed yet', count: n((s) => !s.subscription && s.status !== 'cancelled' && !s.no_client) },
        { key: 'ready', label: 'Ready (client matched)', count: this.ready.length },
        { key: 'billed', label: 'Billed', count: n((s) => !!s.subscription) },
        { key: 'all', label: 'All', count: this.sites.length }
      ]
    },
    shown() {
      const fresh = (s) => this.fresh.includes(s.domain)
      switch (this.filter) {
        case 'unbilled':
          return this.sites.filter((s) => (!s.subscription && s.status !== 'cancelled' && !s.no_client) || fresh(s))
        case 'ready':
          return this.sites.filter((s) => s.ready || fresh(s))
        case 'billed':
          return this.sites.filter((s) => !!s.subscription)
      }
      return this.sites
    }
  },
  watch: {
    filter() {
      this.fresh = []
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
      return formatCurrency(v || 0, c)
    },
    matchLabel(m) {
      return { manual: 'set by you', invoice: 'matched from invoices', website: 'matched by website', email: 'matched by email', name: 'matched by name' }[m] || ''
    },
    sourceLabel(sg) {
      return { mapped: 'your service for this plan', catalogue: 'from the catalogue', billed: 'what you bill today', retail: 'retail helper' }[sg.source] || ''
    },
    async load(refresh = false) {
      this.loading = true
      try {
        const r = await subscriptionsApi.synergySites(refresh)
        this.sites = r.sites || []
        this.margin = r.target_margin ?? 50
        this.error = ''
        this.$emit('count', this.filters[0].count)
        if (!this.sites.some((s) => !s.subscription && s.status !== 'cancelled' && !s.no_client) && this.filter === 'unbilled' && this.sites.length) this.filter = 'all'
        if (this.openDomain) {
          const s = this.sites.find((x) => x.domain === this.openDomain.toLowerCase())
          if (s && !s.subscription) this.review(s)
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the Synergy sites')
      } finally {
        this.loading = false
      }
    },
    review(s) {
      this.modalSite = s
    },
    async quick(s) {
      this.busy = s.domain
      try {
        const sub = await subscriptionsApi.fromSynergy({ domain: s.domain, customer_id: s.customer_id, service_id: s.suggestion.service_id || '', price: s.suggestion.price, period: s.suggestion.period, start_date: s.start })
        toast.success(`${sub.number} created for ${s.customer_name} — ${s.domain}`)
        this.fresh.push(s.domain)
        this.$emit('created', sub)
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the subscription'))
      } finally {
        this.busy = ''
      }
    },
    onCreated(sub) {
      if (this.modalSite) this.fresh.push(this.modalSite.domain)
      this.modalSite = null
      this.$emit('created', sub)
      this.load()
    },
    async bulk() {
      const list = this.ready
      const ok = await confirmDialog({
        title: `Create ${list.length} subscription${list.length === 1 ? '' : 's'}?`,
        message: `One for each Synergy site matched to a client and not billed yet (${list
          .slice(0, 4)
          .map((s) => s.domain)
          .join(', ')}${list.length > 4 ? '…' : ''}), with the suggested price. Billing starts at each site's next renewal; the first invoices go out 7 days ahead.`,
        confirmText: 'Create them'
      })
      if (!ok) return
      this.bulkBusy = true
      try {
        const r = await subscriptionsApi.bulkFromSynergy({ domains: list.map((s) => s.domain) })
        const failed = (r.results || []).filter((x) => !x.ok)
        this.fresh.push(...(r.results || []).filter((x) => x.ok).map((x) => x.domain))
        toast.success(`${r.created} subscription${r.created === 1 ? '' : 's'} created`)
        if (failed.length) toast.warning(`${failed.length} not created: ${failed[0].domain} — ${failed[0].error}`)
        this.$emit('created', null)
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the subscriptions'))
      } finally {
        this.bulkBusy = false
      }
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar__right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
@media (max-width: 640px) {
  .toolbar__right {
    width: 100%;
  }
  .toolbar__right .ui-btn {
    flex: 1 1 auto;
    white-space: normal;
    text-align: center;
    justify-content: center;
  }
}
.hs-lead {
  margin: 0;
  color: var(--text-2);
  font-size: 13.5px;
  max-width: 720px;
}
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 16px 4px;
}
.chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
}
.chip.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.chip__n {
  margin-left: 6px;
  font-size: 11.5px;
  opacity: 0.8;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.muted {
  color: var(--text-3);
}
.warn-txt {
  color: var(--warning);
}
.num {
  font-variant-numeric: tabular-nums;
}
.sub-link {
  font-weight: 600;
  margin-right: 6px;
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.row-actions .ui-btn + .ui-btn {
  margin-left: 4px;
}
</style>
