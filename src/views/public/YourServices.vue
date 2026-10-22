<template>
  <div class="ys" data-testid="your-services">
    <div class="ys__wrap">
      <div v-if="error" class="ys__state">
        <div class="ui-empty__icon"><i class="fa-solid fa-link-slash"></i></div>
        <h1>Link unavailable</h1>
        <p>{{ error }}</p>
      </div>
      <div v-else-if="!v" class="ys__state"><i class="fa-solid fa-circle-notch fa-spin big"></i></div>
      <template v-else>
        <header class="ys__head">
          <img v-if="v.business.logo" :src="v.business.logo" :alt="v.business.name" class="ys__logo" />
          <div v-else class="ys__brand">{{ v.business.name }}</div>
          <div class="ys__contact">
            <a v-if="v.business.email" :href="`mailto:${v.business.email}`"><i class="fa-regular fa-envelope"></i> {{ v.business.email }}</a>
            <a v-if="v.business.phone" :href="`tel:${v.business.phone.replace(/\s/g, '')}`"><i class="fa-solid fa-phone"></i> {{ v.business.phone }}</a>
          </div>
        </header>

        <h1 class="ys__title">Your services</h1>
        <p class="ys__hi">{{ v.customer }}</p>

        <section v-if="v.open.length" class="ys__due" data-testid="ys-due">
          <div class="ys__due-head">
            <div>
              <span class="lbl">To pay</span>
              <strong class="num">{{ totals }}</strong>
            </div>
            <span v-if="overdue" class="ui-badge ui-badge--danger">{{ overdue }} overdue</span>
          </div>
          <ul class="inv">
            <li v-for="i in v.open" :key="i.token" :data-testid="`ys-open-${i.number}`">
              <span class="inv__main">
                <strong>{{ i.number }}</strong>
                <small>{{ i.service }} · due {{ date(i.due) }}</small>
              </span>
              <span class="inv__amt num">{{ money(i.balance, i.currency) }}<span v-if="i.status === 'overdue'" class="ui-badge ui-badge--danger">Overdue</span></span>
              <span class="inv__btns">
                <router-link :to="`/i/${i.token}`" class="ui-btn ui-btn--sm ui-btn--ghost">View</router-link>
                <router-link v-if="i.payable" :to="`/pay/${i.token}`" class="ui-btn ui-btn--sm ui-btn--primary" :data-testid="`ys-pay-${i.number}`"><i class="fa-solid fa-credit-card"></i> Pay now</router-link>
              </span>
            </li>
          </ul>
          <p v-if="!v.online_pay" class="ui-hint">Pay as shown on the invoice (online payment is not available).</p>
        </section>
        <div v-else class="ui-alert ui-alert--success ys__ok"><i class="fa-solid fa-circle-check"></i><span>Nothing to pay right now — thank you!</span></div>

        <section class="ys__subs">
          <h2>Subscriptions</h2>
          <p v-if="!v.subscriptions.length" class="muted">No active subscriptions.</p>
          <article v-for="s in v.subscriptions" :key="s.number" class="sub" :class="`is-${s.status}`" :data-testid="`ys-sub-${s.number}`">
            <div class="sub__top">
              <div>
                <strong>{{ s.name }}</strong>
                <small>{{ s.number }}<template v-if="s.domain"> · {{ s.domain }}</template></small>
              </div>
              <span class="ui-badge" :class="statusBadge(s.status)">{{ statusLabel(s.status) }}</span>
            </div>
            <ul class="sub__items">
              <li v-for="(it, k) in s.items" :key="k">{{ it }}</li>
            </ul>
            <div class="sub__facts">
              <span><span class="lbl">{{ s.period }}</span><strong class="num">{{ money(s.amount, s.currency) }}</strong></span>
              <span v-if="s.next_due"><span class="lbl">Next due</span><strong>{{ date(s.next_due) }}</strong></span>
              <span v-if="s.paid_through"><span class="lbl">Paid up to</span><strong>{{ date(s.paid_through) }}</strong></span>
            </div>
            <p v-if="s.notice" class="sub__notice"><i class="fa-solid fa-circle-info"></i> {{ s.notice }}</p>
          </article>
        </section>

        <section v-if="v.paid.length" class="ys__paid">
          <h2>Paid</h2>
          <ul class="inv paid">
            <li v-for="i in v.paid" :key="i.token">
              <span class="inv__main"><strong>{{ i.number }}</strong><small>{{ i.service }}{{ i.paid_on ? ` · paid ${date(i.paid_on)}` : '' }}</small></span>
              <span class="inv__amt num">{{ money(i.total, i.currency) }}</span>
              <span class="inv__btns"><router-link :to="`/i/${i.token}`" class="ui-btn ui-btn--sm ui-btn--ghost">View</router-link></span>
            </li>
          </ul>
        </section>
        <p class="ys__foot">This page is private to you — keep the link to see your services any time. Powered by DASYIN</p>
      </template>
    </div>
  </div>
</template>

<script>
import { subscriptionsApi, statusLabel, statusBadge } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { formatDate } from '@/utils/format'
import { formatCurrency } from '@/utils/currencies'

export default {
  name: 'YourServices',
  props: { token: { type: String, required: true } },
  data() {
    return { v: null, error: '' }
  },
  computed: {
    totals() {
      const t = this.v?.total_due || {}
      return Object.keys(t)
        .map((c) => formatCurrency(t[c], c))
        .join(' + ')
    },
    overdue() {
      return (this.v?.open || []).filter((i) => i.status === 'overdue').length
    }
  },
  async created() {
    try {
      this.v = await subscriptionsApi.portal(this.token)
      document.title = `Your services · ${this.v.business.name}`
    } catch (e) {
      this.error = e.response?.status === 404 ? 'This link is not valid any more. Ask for a new one.' : apiErrorMessage(e)
    }
  },
  methods: {
    statusLabel,
    statusBadge,
    money(v, c) {
      return formatCurrency(v, c)
    },
    date(d) {
      return formatDate(d)
    }
  }
}
</script>

<style scoped>
.ys {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  padding: 28px 16px 48px;
}
.ys__wrap {
  max-width: 760px;
  margin: 0 auto;
}
.ys__state {
  text-align: center;
  padding: 120px 20px;
  color: var(--text-3);
}
.ys__state h1 {
  font-size: 22px;
  color: var(--text);
}
.big {
  font-size: 28px;
}
.ys__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.ys__logo {
  max-height: 44px;
  max-width: 200px;
}
.ys__brand {
  font-size: 20px;
  font-weight: 700;
}
.ys__contact {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 13px;
}
.ys__contact a {
  color: var(--text-2);
  text-decoration: none;
}
.ys__contact i {
  margin-right: 4px;
}
.ys__title {
  font-size: 26px;
  margin: 0;
}
.ys__hi {
  margin: 2px 0 18px;
  color: var(--text-2);
}
.ys__due,
.sub,
.ys__paid {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}
.ys__due {
  padding: 16px;
  margin-bottom: 22px;
}
.ys__due-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.ys__due-head strong {
  display: block;
  font-size: 24px;
}
.lbl {
  display: block;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}
.num {
  font-variant-numeric: tabular-nums;
}
.inv {
  list-style: none;
  margin: 0;
  padding: 0;
}
.inv li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--border);
}
.inv__main small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}
.inv__amt {
  font-weight: 600;
  white-space: nowrap;
}
.inv__amt .ui-badge {
  margin-left: 6px;
}
.inv__btns {
  display: flex;
  gap: 6px;
}
.ys__ok {
  margin-bottom: 22px;
}
.ys__subs h2,
.ys__paid h2 {
  font-size: 16px;
  margin: 0 0 10px;
}
.sub {
  padding: 14px 16px;
  margin-bottom: 12px;
}
.sub.is-suspended {
  border-color: var(--danger);
}
.sub.is-past_due {
  border-color: var(--warning);
}
.sub__top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.sub__top small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}
.sub__items {
  margin: 8px 0;
  padding-left: 18px;
  font-size: 13.5px;
  color: var(--text-2);
}
.sub__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
}
.sub__notice {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--text-2);
}
.ys__paid {
  padding: 14px 16px;
  margin-top: 22px;
}
.inv.paid li:first-child {
  border-top: 0;
}
.ys__foot {
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
  margin-top: 28px;
}
.muted {
  color: var(--text-3);
}
@media (max-width: 560px) {
  .inv li {
    grid-template-columns: 1fr auto;
  }
  .inv__btns {
    grid-column: 1 / -1;
  }
}
</style>
