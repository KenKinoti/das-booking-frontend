<template>
  <ul class="feed">
    <li v-for="(a, i) in items" :key="i">
      <component :is="a.link ? 'router-link' : 'div'" :to="a.link || undefined" class="feed__row" :class="{ link: !!a.link }">
        <span class="feed__icon" :class="'k-' + a.kind"><i :class="icon(a)"></i></span>
        <div class="feed__main">
          <strong :title="a.title">{{ a.title }}</strong>
          <small>{{ detail(a) }}</small>
        </div>
        <div class="feed__side">
          <span v-if="a.amount" class="feed__amt">{{ money(a.amount, a.currency) }}</span>
          <time :datetime="a.at" :title="full(a.at)">{{ ago(a.at) }}</time>
        </div>
      </component>
    </li>
  </ul>
</template>

<script>
import { timeAgo, money } from './analytics'
import { formatDateTime } from '@/utils/format'

const ICONS = {
  invoice: 'fa-solid fa-file-invoice-dollar',
  payment: 'fa-solid fa-circle-dollar-to-slot',
  booking: 'fa-regular fa-calendar-check',
  customer: 'fa-solid fa-user-plus',
  pos: 'fa-solid fa-cash-register'
}

export default {
  name: 'ActivityFeed',
  props: {
    items: { type: Array, default: () => [] },
    currency: { type: String, default: 'AUD' }
  },
  methods: {
    icon(a) {
      return ICONS[a.kind] || 'fa-solid fa-circle-info'
    },
    ago(t) {
      return timeAgo(t)
    },
    full(t) {
      return formatDateTime(t)
    },
    money(v, cur) {
      return money(v, cur || this.currency)
    },
    detail(a) {
      if (a.kind === 'booking' && a.ref_time) return `${a.detail} · ${formatDateTime(a.ref_time)}`
      return a.detail
    }
  }
}
</script>

<style scoped>
.feed {
  list-style: none;
  margin: 0;
  padding: 6px;
}

.feed__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 10px;
  color: var(--text);
}

.feed__row.link:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.feed__icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 13px;
  flex-shrink: 0;
  background: var(--accent-soft);
  color: var(--accent);
}

.k-payment {
  background: var(--success-soft);
  color: var(--success);
}

.k-booking {
  background: var(--info-soft);
  color: var(--info);
}

.k-customer {
  background: var(--warning-soft);
  color: var(--warning);
}

.k-pos {
  background: var(--neutral-soft);
  color: var(--text-2);
}

.feed__main {
  flex: 1;
  min-width: 0;
}

.feed__main strong {
  display: block;
  font-weight: 600;
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed__main small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed__side {
  text-align: right;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.feed__amt {
  font-weight: 600;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.feed__side time {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}
</style>
