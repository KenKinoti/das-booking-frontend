<template>
  <div class="drawer-backdrop" @mousedown.self="$emit('close')">
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Booking details">
      <header class="drawer__head">
        <div class="drawer__title">
          <span class="ui-badge" :class="`ui-badge--${meta.badge}`">{{ meta.label }}</span>
          <h2>{{ customerName || 'Booking' }}</h2>
          <p>{{ whenLong }}</p>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close details" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <div v-if="actions.length" class="drawer__status">
        <button
          v-for="a in actions"
          :key="a.to"
          class="ui-btn ui-btn--sm"
          :class="a.kind ? `ui-btn--${a.kind}` : ''"
          :disabled="!!busy"
          @click="$emit('status', a.to)"
        >
          <i :class="busy === a.to ? 'fa-solid fa-circle-notch spin' : a.icon"></i> {{ a.label }}
        </button>
      </div>

      <div class="drawer__body">
        <section class="block">
          <div class="info-rows">
            <div class="info-row">
              <i class="fa-regular fa-clock"></i>
              <div>
                <strong>{{ timeRange }}</strong>
                <small>{{ dateLong }} · {{ duration }}</small>
              </div>
            </div>
            <div class="info-row">
              <i class="fa-regular fa-user"></i>
              <div>
                <strong>{{ staffName || 'Unassigned' }}</strong>
                <small>Staff member</small>
              </div>
            </div>
            <div v-if="booking.vehicle" class="info-row">
              <i class="fa-solid fa-car-side"></i>
              <div>
                <strong>{{ vehicleLabel(booking.vehicle) }}</strong>
                <small>Vehicle<template v-if="booking.vehicle.color"> · {{ booking.vehicle.color }}</template></small>
              </div>
            </div>
          </div>
        </section>

        <section class="block">
          <h3>Customer</h3>
          <div class="cust">
            <span class="avatar">{{ initials(customerName) }}</span>
            <div class="cust__main">
              <strong>{{ customerName || 'Unknown customer' }}</strong>
              <a v-if="booking.customer?.phone" :href="`tel:${booking.customer.phone}`"><i class="fa-solid fa-phone"></i> {{ booking.customer.phone }}</a>
              <a v-if="booking.customer?.email" :href="`mailto:${booking.customer.email}`"><i class="fa-regular fa-envelope"></i> {{ booking.customer.email }}</a>
            </div>
          </div>
        </section>

        <section class="block">
          <h3>Services</h3>
          <ul v-if="booking.services?.length" class="svcs">
            <li v-for="s in booking.services" :key="s.id">
              <span>
                {{ s.name }}
                <small>{{ formatDuration(s.duration) }}</small>
              </span>
              <span class="num">{{ money(s.price) }}</span>
            </li>
          </ul>
          <p v-else class="muted">No services attached.</p>
          <div class="total">
            <span>Total</span>
            <strong class="num">{{ money(booking.total_price) }}</strong>
          </div>
          <p v-if="priceAdjusted" class="ui-hint">Custom price (services total {{ money(servicesTotal) }})</p>
        </section>

        <section v-if="booking.notes" class="block">
          <h3>Notes</h3>
          <p class="note">{{ booking.notes }}</p>
        </section>
        <section v-if="booking.internal_notes" class="block">
          <h3>Internal notes</h3>
          <p class="note note--internal"><i class="fa-solid fa-lock"></i> {{ booking.internal_notes }}</p>
        </section>

        <p class="meta">Created {{ formatDateTime(booking.created_at) }}<template v-if="booking.updated_at && booking.updated_at !== booking.created_at"> · updated {{ formatDateTime(booking.updated_at) }}</template></p>
      </div>

      <footer class="drawer__foot">
        <button class="ui-btn ui-btn--ghost ui-btn--danger-text" :disabled="!!busy" @click="$emit('delete')">
          <i :class="busy === 'delete' ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-trash-can'"></i> Delete
        </button>
        <div class="foot-right">
          <button class="ui-btn" :disabled="!!busy" @click="$emit('edit')"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
          <button class="ui-btn" :class="{ 'ui-btn--primary': booking.status === 'completed' }" :disabled="!booking.customer" @click="$emit('invoice')">
            <i class="fa-solid fa-file-invoice-dollar"></i> Create invoice
          </button>
        </div>
      </footer>
    </aside>
  </div>
</template>

<script>
import { formatMoney, formatDateTime } from '@/utils/format'
import { statusMeta, statusActions, personName, initials, vehicleLabel, formatTime, formatDuration, minutesBetween } from './bookingUtils'

export default {
  name: 'BookingDrawer',
  props: {
    booking: { type: Object, required: true },
    busy: { type: String, default: '' }
  },
  emits: ['close', 'status', 'edit', 'delete', 'invoice'],
  computed: {
    meta() {
      return statusMeta(this.booking.status)
    },
    actions() {
      return statusActions(this.booking.status)
    },
    customerName() {
      return personName(this.booking.customer)
    },
    staffName() {
      return personName(this.booking.staff)
    },
    timeRange() {
      return `${formatTime(this.booking.start_time)} – ${formatTime(this.booking.end_time)}`
    },
    dateLong() {
      return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(this.booking.start_time))
    },
    whenLong() {
      return `${new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(this.booking.start_time))} · ${this.timeRange}`
    },
    duration() {
      return formatDuration(minutesBetween(this.booking.start_time, this.booking.end_time))
    },
    servicesTotal() {
      return (this.booking.services || []).reduce((t, s) => t + (Number(s.price) || 0), 0)
    },
    priceAdjusted() {
      return (this.booking.services || []).length > 0 && Math.abs(this.servicesTotal - Number(this.booking.total_price || 0)) > 0.005
    }
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    initials,
    vehicleLabel,
    formatDuration,
    formatDateTime,
    money(v) {
      return formatMoney(v)
    },
    onKey(e) {
      if (e.key === 'Escape' && !document.querySelector('.ui-modal-backdrop')) this.$emit('close')
    }
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1900;
  background: rgba(10, 12, 24, 0.35);
  animation: fade 0.15s ease-out;
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  animation: slide 0.2s var(--ease, ease-out);
}

@keyframes fade { from { opacity: 0; } }
@keyframes slide { from { transform: translateX(24px); opacity: 0; } }

.drawer__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.drawer__title h2 {
  font-size: 19px;
  margin: 10px 0 2px;
  letter-spacing: -0.01em;
}

.drawer__title p {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

.drawer__status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-subtle);
}

.drawer__body {
  flex: 1;
  overflow: auto;
  padding: 4px 20px 20px;
}

.block {
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.block:last-of-type { border-bottom: 0; }

.block h3 {
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin: 0 0 10px;
}

.info-rows {
  display: grid;
  gap: 14px;
}

.info-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.info-row > i {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--bg-subtle);
  color: var(--text-2);
  font-size: 13px;
  flex-shrink: 0;
}

.info-row strong,
.cust__main strong { display: block; font-weight: 600; }
.info-row small { color: var(--text-3); font-size: 12.5px; }

.cust {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.cust__main { display: grid; gap: 3px; min-width: 0; }

.cust__main a {
  color: var(--text-2);
  font-size: 13px;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cust__main a:hover { color: var(--accent); }
.cust__main a i { width: 16px; color: var(--text-3); }

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.svcs {
  list-style: none;
  margin: 0;
  padding: 0;
}

.svcs li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14px;
}

.svcs small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.total {
  display: flex;
  justify-content: space-between;
  padding-top: 10px;
  font-size: 15px;
}

.num { font-variant-numeric: tabular-nums; }
.muted { color: var(--text-3); margin: 0; font-size: 13.5px; }

.note {
  margin: 0;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-2);
}

.note--internal {
  background: var(--warning-soft);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text);
}

.note--internal i { color: var(--warning); margin-right: 4px; font-size: 12px; }

.meta {
  color: var(--text-3);
  font-size: 12px;
  margin: 8px 0 0;
}

.drawer__foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.foot-right { display: flex; gap: 8px; }

.ui-btn--danger-text { color: var(--danger); }
.ui-btn--danger-text:hover:not(:disabled) { background: var(--danger-soft); }

@media (max-width: 480px) {
  .drawer__foot { flex-wrap: wrap; }
  .foot-right { flex: 1; }
  .foot-right .ui-btn { flex: 1; justify-content: center; }
}
</style>
