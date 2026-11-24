<template>
  <!-- Top bar: "N waiting for approval" (Pending review, v2.19). Shown only while something waits. -->
  <router-link
    v-if="show"
    to="/outbox"
    class="tb__btn obt"
    :class="{ 'is-urgent': urgent }"
    :title="title"
    :aria-label="title"
    data-testid="outbox-topbar"
  >
    <i class="fa-solid fa-inbox" aria-hidden="true"></i>
    <span class="obt__count" aria-hidden="true" data-testid="outbox-topbar-count">{{ n > 99 ? '99+' : n }}</span>
  </router-link>
</template>

<script>
import { outbox, startOutboxCounts, stopOutboxCounts } from './outboxState'

export default {
  name: 'OutboxTopbarButton',
  computed: {
    n() {
      return outbox.counts.waiting || 0
    },
    show() {
      return outbox.loaded && this.n > 0 && this.$route.path !== '/outbox'
    },
    urgent() {
      const c = outbox.counts
      return !!(c.time_sensitive || c.failed)
    },
    title() {
      const c = outbox.counts
      const mine = outbox.me && !outbox.me.can_approve
      const base = mine ? `${this.n} of your message${this.n === 1 ? ' is' : 's are'} waiting for approval` : `${this.n} message${this.n === 1 ? '' : 's'} waiting for approval`
      const extra = [c.time_sensitive ? `${c.time_sensitive} time-sensitive` : '', c.failed ? `${c.failed} couldn’t be sent` : '', c.stale ? `${c.stale} stale` : ''].filter(Boolean)
      return `${base}${extra.length ? ' (' + extra.join(', ') + ')' : ''} — open Pending review`
    }
  },
  mounted() {
    startOutboxCounts()
  },
  beforeUnmount() {
    stopOutboxCounts()
  }
}
</script>

<style scoped>
.obt {
  position: relative;
  text-decoration: none;
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 40%, var(--border));
  background: var(--warning-soft);
}
.obt:hover {
  color: var(--warning);
  background: var(--warning-soft);
  border-color: var(--warning);
}
.obt.is-urgent {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 40%, var(--border));
  background: var(--danger-soft);
}
.obt__count {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--warning);
  color: #fff;
  font-size: 10.5px;
  font-weight: 750;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--surface);
  font-variant-numeric: tabular-nums;
}
[data-theme='dark'] .obt__count {
  color: #1a1206;
}
.obt.is-urgent .obt__count {
  background: var(--danger);
}
@media (max-width: 640px) {
  .tb__btn.obt {
    width: 44px;
    height: 44px;
  }
}
</style>
