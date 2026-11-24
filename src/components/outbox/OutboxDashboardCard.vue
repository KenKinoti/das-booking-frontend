<template>
  <!-- Dashboard: "N messages waiting for approval" while anything waits in Pending review (v2.19). -->
  <section v-if="show" class="obd" :class="{ 'is-urgent': urgent }" data-testid="outbox-dashboard-card" role="region" aria-labelledby="obd-title">
    <span class="obd__icon" aria-hidden="true"><i class="fa-solid fa-inbox"></i></span>
    <div class="obd__text">
      <strong id="obd-title" data-testid="outbox-dashboard-title">{{ title }}</strong>
      <span>{{ detail }}</span>
    </div>
    <div class="obd__actions">
      <router-link :to="{ path: '/outbox' }" class="ui-btn ui-btn--primary obd__btn" data-testid="outbox-dashboard-review"><i class="fa-solid fa-list-check"></i> {{ canApprove ? 'Review now' : 'See them' }}</router-link>
    </div>
  </section>
</template>

<script>
import { outbox, startOutboxCounts, stopOutboxCounts } from './outboxState'
import { waitedFor } from '@/services/outbox'

export default {
  name: 'OutboxDashboardCard',
  computed: {
    c() {
      return outbox.counts
    },
    n() {
      return this.c.waiting || 0
    },
    canApprove() {
      return !!outbox.me?.can_approve
    },
    show() {
      return outbox.loaded && this.n > 0
    },
    urgent() {
      return !!(this.c.time_sensitive || this.c.failed)
    },
    title() {
      const n = this.n
      if (!this.canApprove) return `${n} of your message${n === 1 ? ' is' : 's are'} waiting for approval`
      return `${n} message${n === 1 ? '' : 's'} waiting for approval`
    },
    detail() {
      const c = this.c
      const bits = []
      if (c.oldest_at) bits.push(`the oldest has waited ${waitedFor(c.oldest_at)}`)
      if (c.time_sensitive) bits.push(`${c.time_sensitive} time-sensitive`)
      if (c.failed) bits.push(`${c.failed} couldn’t be sent`)
      if (c.stale) bits.push(`${c.stale} stale`)
      const lead = this.canApprove ? 'Nothing goes to clients until you approve it' : 'An owner or admin approves them before they go'
      return `${lead}${bits.length ? ' — ' + bits.join(', ') : ''}.`
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
.obd {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 18px;
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--warning) 45%, var(--border));
  background: linear-gradient(90deg, var(--warning-soft), var(--surface) 70%);
  box-shadow: var(--shadow-xs);
}
.obd.is-urgent {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  background: linear-gradient(90deg, var(--danger-soft), var(--surface) 70%);
}
.obd__icon {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--warning);
  font-size: 18px;
  box-shadow: var(--shadow-xs);
}
.obd.is-urgent .obd__icon {
  color: var(--danger);
}
.obd__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.obd__text strong {
  font-size: 15px;
}
.obd__text span {
  font-size: 13px;
  color: var(--text-2);
}
.obd__actions {
  flex: none;
}
@media (max-width: 640px) {
  .obd {
    flex-wrap: wrap;
  }
  .obd__text {
    flex-basis: calc(100% - 56px);
  }
  .obd__actions {
    width: 100%;
  }
  .obd__btn {
    width: 100%;
    min-height: 44px;
  }
}
</style>
