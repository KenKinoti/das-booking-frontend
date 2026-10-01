<template>
  <section class="ui-card exp-card dviz" data-testid="expenses-card">
    <div class="ui-card__head wrap">
      <div>
        <h2><i class="fa-solid fa-receipt head-ic"></i> Expenses</h2>
        <span class="sub">Synergy Wholesale, Google Workspace &amp; other suppliers · approved, excl. tax</span>
      </div>
      <router-link to="/expenses" class="ui-btn ui-btn--sm">Open expenses <i class="fa-solid fa-arrow-right"></i></router-link>
    </div>
    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    </div>
    <div v-else-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 140px"></div></div>
    <div v-else-if="empty" class="ui-empty small">
      <div class="ui-empty__icon"><i class="fa-solid fa-receipt"></i></div>
      <h3>Track what you spend</h3>
      <p>Connect Synergy Wholesale and Gmail, or upload supplier invoices — then review them in the Expenses inbox.</p>
      <router-link to="/expenses?tab=sources" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-solid fa-plug"></i> Connect sources</router-link>
    </div>
    <div v-else class="ui-card__body body">
      <div class="figs">
        <router-link to="/expenses" class="fig" data-fig="this_month">
          <span>This month</span><strong>{{ m(k.this_month) }}</strong>
          <DeltaBadge :value="k.this_month_change_pct ?? null" :positive-is-good="false" :show-new="true" title="vs the same days last month" />
        </router-link>
        <router-link to="/expenses" class="fig" data-fig="last_month"><span>Last month</span><strong>{{ m(k.last_month) }}</strong></router-link>
        <router-link to="/expenses" class="fig" data-fig="ytd"><span>Year to date</span><strong>{{ m(k.ytd) }}</strong></router-link>
        <router-link to="/expenses?tab=subscriptions" class="fig" data-fig="subs"><span>Subscriptions / yr</span><strong>{{ m(k.subscriptions_annual) }}</strong></router-link>
      </div>
      <div class="side">
        <router-link v-if="syn?.has_data" to="/expenses?tab=synergy" class="line syn" data-testid="card-synergy">
          <i class="fa-solid fa-server"></i>
          <span>Synergy run-rate <strong>{{ aud(syn.run_rate) }}/mo</strong> · {{ syn.active_sites }} sites<template v-if="syn.balance != null"> · balance {{ aud(syn.balance) }}</template></span>
          <span v-if="syn.alerts" class="ui-badge ui-badge--warning" data-testid="card-synergy-alerts">{{ syn.alerts }} alert{{ syn.alerts === 1 ? '' : 's' }}</span>
        </router-link>
        <div v-if="d.kpis.inbox" class="line warn">
          <i class="fa-solid fa-inbox"></i><router-link to="/expenses?tab=inbox">{{ d.kpis.inbox }} to review</router-link>
        </div>
        <div v-for="a in d.alerts.slice(0, 3)" :key="a.key" class="line" :class="'sev-' + a.severity">
          <i :class="a.severity === 'info' ? 'fa-solid fa-circle-info' : 'fa-solid fa-triangle-exclamation'"></i>
          <router-link :to="a.link || '/expenses?tab=alerts'">{{ a.title }}</router-link>
        </div>
        <div v-if="!d.alerts.length && !d.kpis.inbox" class="line ok"><i class="fa-solid fa-circle-check"></i> No alerts</div>
        <div v-for="v in d.by_vendor.slice(0, 3)" :key="v.vendor" class="line vend">
          <span>{{ v.vendor }}</span><strong>{{ m(v.amount) }}</strong>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import DeltaBadge from '@/components/dashboard/DeltaBadge.vue'
import '@/components/dashboard/dashviz.css'
import { expensesApi, money, aud } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'

export default {
  name: 'ExpensesCard',
  components: { DeltaBadge },
  data() {
    return { d: null, error: '' }
  },
  computed: {
    k() {
      return this.d?.kpis || {}
    },
    syn() {
      return this.d?.synergy || null
    },
    empty() {
      const d = this.d
      return d && !d.kpis.ytd && !d.kpis.last_month && !d.kpis.inbox && !d.alerts.length && !d.by_vendor.length && !d.synergy?.has_data
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    aud,
    m(v) {
      return money(v || 0, this.d?.currency)
    },
    async load() {
      this.error = ''
      try {
        this.d = await expensesApi.summary()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load expenses')
      }
    }
  }
}
</script>

<style scoped>
.head-ic {
  color: var(--text-3);
  margin-right: 4px;
}
.wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.sub {
  color: var(--text-3);
  font-size: 12.5px;
}
.body {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 16px;
}
.figs {
  display: grid;
  align-self: start;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.fig {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: inherit;
  text-decoration: none;
  min-width: 0;
}
.fig > :deep(*:last-child:not(strong)) {
  align-self: flex-start;
}
.fig:hover {
  background: var(--surface-hover);
}
.fig span {
  font-size: 12px;
  color: var(--text-3);
}
.fig strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.side {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13.5px;
  min-width: 0;
}
.line {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.line a {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.line.warn i,
.line.sev-warning i {
  color: var(--warning);
}
.line.sev-danger i {
  color: var(--danger);
}
.line.sev-info i {
  color: var(--info);
}
.line.ok i {
  color: var(--success);
}
.line.syn {
  color: var(--text-2);
  text-decoration: none;
  flex-wrap: wrap;
  font-size: 13px;
}
.line.syn i {
  color: var(--accent);
}
.line.syn strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.line.syn span:first-of-type {
  min-width: 0;
  flex: 1;
}
.vend {
  justify-content: space-between;
  color: var(--text-2);
  border-top: 1px dashed var(--border);
  padding-top: 6px;
}
.vend strong {
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
@media (max-width: 1000px) {
  .body {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 560px) {
  .figs {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
