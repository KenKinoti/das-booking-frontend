<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div class="head-main">
        <div class="ui-eyebrow">
          <router-link :to="`/events/${eventId}`" class="crumb"><i class="fa-solid fa-arrow-left"></i> {{ event ? event.title : 'Event' }}</router-link>
        </div>
        <h1>Registrations</h1>
        <p v-if="event">{{ whenLabel }} · {{ location(event) }}</p>
        <p v-else>&nbsp;</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="exporting || !event" @click="exportCsv"><i :class="exporting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-download'"></i> Export CSV</button>
        <button class="ui-btn ui-btn--primary" :disabled="!event" @click="openAdd"><i class="fa-solid fa-user-plus"></i> Add attendee</button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="init">Try again</a></span></div>

    <template v-else>
      <div class="ui-kpis">
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-ticket"></i></span>Registered</div>
          <div class="ui-kpi__value">{{ sum.tickets || 0 }}<small v-if="sum.capacity" class="of">/ {{ sum.capacity }}</small></div>
          <div class="ui-kpi__meta">{{ sum.registrations || 0 }} registration{{ sum.registrations === 1 ? '' : 's' }}{{ sum.waitlisted ? ` · ${sum.waitlisted} waitlisted` : '' }}</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-user-check"></i></span>Checked in</div>
          <div class="ui-kpi__value">{{ sum.checked_in || 0 }}</div>
          <div class="ui-kpi__meta">{{ sum.tickets ? Math.round(((sum.checked_in || 0) / sum.tickets) * 100) : 0 }}% arrived</div>
          <div class="kpi-bar"><span :style="{ width: (sum.tickets ? Math.min(100, (sum.checked_in / sum.tickets) * 100) : 0) + '%' }"></span></div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-hourglass-half"></i></span>Awaiting</div>
          <div class="ui-kpi__value">{{ counts.pending }}</div>
          <div class="ui-kpi__meta">Pending approval · {{ unpaidCount }} unpaid</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-sack-dollar"></i></span>Revenue</div>
          <div class="ui-kpi__value">{{ money(sum.revenue) }}</div>
          <div class="ui-kpi__meta">{{ money(sum.paid) }} collected</div>
        </div>
      </div>

      <section class="ui-card">
        <div class="toolbar">
          <div class="ui-tabs" role="tablist">
            <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="status = t.value">
              {{ t.label }}<span class="count">{{ t.count }}</span>
            </button>
          </div>
          <div class="toolbar__right">
            <div class="ui-input-group search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="q" class="ui-input" type="search" placeholder="Name, email, phone or reference…" aria-label="Search registrations" />
            </div>
            <select v-model="checked" class="ui-select filter" aria-label="Check-in filter">
              <option value="">Any check-in</option>
              <option value="yes">Checked in</option>
              <option value="no">Not checked in</option>
            </select>
            <select v-if="event && event.ticket_types && event.ticket_types.length > 1" v-model="ticket" class="ui-select filter" aria-label="Ticket filter">
              <option value="">All tickets</option>
              <option v-for="t in event.ticket_types" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <div v-if="loading && !regs.length" class="ui-card__body">
          <div v-for="n in 6" :key="n" class="sk-row">
            <div class="ui-skeleton" style="width: 34px; height: 34px; border-radius: 10px"></div>
            <div class="ui-skeleton" style="flex: 1"></div>
            <div class="ui-skeleton" style="width: 90px"></div>
            <div class="ui-skeleton" style="width: 110px"></div>
          </div>
        </div>

        <div v-else-if="!rows.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-user-group"></i></div>
          <h3>{{ regs.length ? 'No registrations match' : 'No registrations yet' }}</h3>
          <p>{{ regs.length ? 'Try a different search or filter.' : 'Share the registration page, or add attendees manually.' }}</p>
          <div style="margin-top: 12px">
            <button v-if="regs.length" class="ui-btn" @click="clearFilters"><i class="fa-solid fa-xmark"></i> Clear filters</button>
            <button v-else class="ui-btn ui-btn--primary" @click="openAdd"><i class="fa-solid fa-user-plus"></i> Add attendee</button>
          </div>
        </div>

        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Attendee</th>
                <th class="hide-sm">Ticket</th>
                <th class="hide-md">Status</th>
                <th class="hide-md">Payment</th>
                <th class="num hide-sm">Amount</th>
                <th class="hide-lg">Registered</th>
                <th>Check-in</th>
                <th style="width: 44px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id" :class="{ 'is-cancelled': r.status === 'cancelled' }">
                <td>
                  <div class="who">
                    <span class="avatar">{{ initials(r.registrant_name) }}</span>
                    <span class="who__txt">
                      <strong>{{ r.registrant_name }}</strong>
                      <small>{{ r.registrant_email }}</small>
                      <small class="show-sm">{{ r.ticket_type_name }}{{ r.quantity > 1 ? ` ×${r.quantity}` : '' }} · {{ regMeta(r).label }}</small>
                    </span>
                  </div>
                </td>
                <td class="hide-sm">
                  {{ r.ticket_type_name || '—' }}<span v-if="r.quantity > 1" class="muted"> ×{{ r.quantity }}</span>
                  <small class="ref">#{{ r.qr_code }}</small>
                </td>
                <td class="hide-md"><span class="ui-badge" :class="`ui-badge--${regMeta(r).badge}`">{{ regMeta(r).label }}</span></td>
                <td class="hide-md"><span class="ui-badge" :class="`ui-badge--${payMeta(r).badge}`">{{ payMeta(r).label }}</span></td>
                <td class="num hide-sm">{{ r.total_amount > 0 ? money(r.total_amount) : '—' }}</td>
                <td class="hide-lg muted nowrap">{{ dateTime(r.registration_date || r.created_at) }}</td>
                <td>
                  <label class="ui-switch ci" :title="r.checked_in_at ? `Checked in ${dateTime(r.checked_in_at)}` : 'Not checked in'">
                    <input type="checkbox" :checked="!!r.checked_in_at" :disabled="busy === r.id || (!r.checked_in_at && !canCheck(r))" :aria-label="`Check in ${r.registrant_name}`" @change="toggleCheckIn(r)" />
                    <span class="ci__txt hide-sm">{{ r.checked_in_at ? time(r.checked_in_at) : '' }}</span>
                  </label>
                </td>
                <td>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Actions for ${r.registrant_name}`" @click.stop="openMenu(r, $event)"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer v-if="rows.length" class="pager">
          <span class="muted">{{ rows.length }} of {{ regs.length }} registration{{ regs.length === 1 ? '' : 's' }}</span>
        </footer>
      </section>
    </template>

    <div v-if="menuReg" class="menu__list" :style="menuStyle" role="menu" @click="menuReg = null">
      <button role="menuitem" @click="openEdit(menuReg)"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
      <button v-if="menuReg.status === 'pending' || menuReg.status === 'waitlisted'" role="menuitem" @click="patch(menuReg, { status: 'confirmed' }, 'Registration confirmed')"><i class="fa-solid fa-check"></i> Confirm</button>
      <button v-if="menuReg.payment_status === 'pending'" role="menuitem" @click="patch(menuReg, { payment_status: 'paid' }, 'Marked as paid')"><i class="fa-solid fa-money-bill"></i> Mark as paid</button>
      <a role="menuitem" :href="`mailto:${menuReg.registrant_email}`"><i class="fa-regular fa-envelope"></i> Email attendee</a>
      <button v-if="menuReg.status !== 'cancelled'" role="menuitem" @click="cancelReg(menuReg)"><i class="fa-solid fa-ban"></i> Cancel registration</button>
      <button role="menuitem" class="danger" @click="remove(menuReg)"><i class="fa-regular fa-trash-can"></i> Delete</button>
    </div>

    <AttendeeModal v-if="modal && event" :event="event" :registration="editing" @close="closeModal" @saved="onSaved" />
  </div>
</template>

<script>
import { eventsApi, REG_STATUS, PAY_STATUS, eventLocation } from '@/services/events'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDateTime, downloadBlob, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import AttendeeModal from '@/components/events/AttendeeModal.vue'

export default {
  name: 'EventRegistrations',
  components: { AttendeeModal },
  data() {
    return {
      event: null,
      regs: [],
      sum: {},
      loading: false,
      loadError: '',
      exporting: false,
      status: 'all',
      checked: '',
      ticket: '',
      q: '',
      busy: '',
      menuReg: null,
      menuStyle: {},
      modal: false,
      editing: null
    }
  },
  computed: {
    eventId() {
      return this.$route.params.eventId
    },
    counts() {
      const c = { all: this.regs.length, confirmed: 0, pending: 0, waitlisted: 0, cancelled: 0 }
      this.regs.forEach((r) => {
        if (c[r.status] != null) c[r.status]++
      })
      return c
    },
    unpaidCount() {
      return this.regs.filter((r) => r.payment_status === 'pending' && r.status !== 'cancelled').length
    },
    tabs() {
      return [
        { value: 'all', label: 'All', count: this.counts.all },
        { value: 'confirmed', label: 'Confirmed', count: this.counts.confirmed },
        { value: 'pending', label: 'Pending', count: this.counts.pending },
        { value: 'waitlisted', label: 'Waitlist', count: this.counts.waitlisted },
        { value: 'cancelled', label: 'Cancelled', count: this.counts.cancelled }
      ]
    },
    rows() {
      const q = this.q.trim().toLowerCase().replace(/^#/, '')
      return this.regs.filter((r) => {
        if (this.status !== 'all' && r.status !== this.status) return false
        if (this.checked === 'yes' && !r.checked_in_at) return false
        if (this.checked === 'no' && r.checked_in_at) return false
        if (this.ticket && r.ticket_type_id !== this.ticket) return false
        if (!q) return true
        return [r.registrant_name, r.registrant_email, r.registrant_phone, r.company, r.qr_code].some((v) => String(v || '').toLowerCase().includes(q))
      })
    },
    whenLabel() {
      if (!this.event) return ''
      return formatDateTime(this.event.start_date)
    }
  },
  watch: {
    eventId() {
      this.init()
    }
  },
  created() {
    this.init()
    document.addEventListener('click', this.closeMenu)
    window.addEventListener('scroll', this.closeMenu, true)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeMenu)
    window.removeEventListener('scroll', this.closeMenu, true)
  },
  methods: {
    location: eventLocation,
    dateTime: formatDateTime,
    time(v) {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(v))
    },
    money(v) {
      return formatMoney(v || 0, (this.event && this.event.currency) || 'AUD')
    },
    regMeta(r) {
      return REG_STATUS[r.status] || REG_STATUS.pending
    },
    payMeta(r) {
      return PAY_STATUS[r.payment_status] || PAY_STATUS.pending
    },
    canCheck(r) {
      return r.status === 'confirmed' || r.status === 'pending'
    },
    initials(name = '') {
      return (
        String(name)
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0])
          .join('')
          .toUpperCase() || '?'
      )
    },
    closeMenu() {
      this.menuReg = null
    },
    openMenu(r, ev) {
      if (this.menuReg && this.menuReg.id === r.id) {
        this.menuReg = null
        return
      }
      const rect = ev.currentTarget.getBoundingClientRect()
      const h = 250
      const top = rect.bottom + h > window.innerHeight ? Math.max(8, rect.top - h) : rect.bottom + 4
      this.menuStyle = { position: 'fixed', top: `${top}px`, left: `${Math.max(8, rect.right - 220)}px`, width: '220px' }
      this.menuReg = r
    },
    clearFilters() {
      this.q = ''
      this.status = 'all'
      this.checked = ''
      this.ticket = ''
    },
    async init() {
      this.loadError = ''
      this.loading = true
      try {
        const [ev, data] = await Promise.all([eventsApi.get(this.eventId), eventsApi.registrations(this.eventId)])
        this.event = ev
        this.regs = data.registrations || []
        this.sum = data.summary || ev.stats || {}
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load registrations')
      } finally {
        this.loading = false
      }
    },
    async reload() {
      try {
        const [ev, data] = await Promise.all([eventsApi.get(this.eventId), eventsApi.registrations(this.eventId)])
        this.event = ev
        this.regs = data.registrations || []
        this.sum = data.summary || {}
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not refresh registrations'))
      }
    },
    replace(reg) {
      const i = this.regs.findIndex((r) => r.id === reg.id)
      if (i >= 0) this.regs.splice(i, 1, reg)
    },
    async toggleCheckIn(r) {
      this.busy = r.id
      const want = !r.checked_in_at
      try {
        const updated = await eventsApi.checkIn(this.eventId, r.id, want)
        this.replace(updated)
        this.sum = { ...this.sum, checked_in: Math.max(0, (this.sum.checked_in || 0) + (want ? r.quantity : -r.quantity)) }
        toast.success(want ? `${r.registrant_name} checked in` : 'Check-in undone')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update check-in'))
        this.regs = this.regs.slice()
      } finally {
        this.busy = ''
      }
    },
    async patch(r, body, msg) {
      try {
        const updated = await eventsApi.updateRegistration(this.eventId, r.id, body)
        this.replace(updated)
        toast.success(msg)
        this.reload()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update registration'))
      }
    },
    async cancelReg(r) {
      const ok = await confirmDialog({ title: 'Cancel registration?', message: `${r.registrant_name}'s place will be released. You can re-confirm it later.`, confirmText: 'Cancel registration', danger: true })
      if (ok) this.patch(r, { status: 'cancelled', checked_in: false }, 'Registration cancelled')
    },
    async remove(r) {
      const ok = await confirmDialog({ title: 'Delete registration?', message: `${r.registrant_name} (${r.registrant_email}) will be permanently removed from this event.`, confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await eventsApi.removeRegistration(this.eventId, r.id)
        this.regs = this.regs.filter((x) => x.id !== r.id)
        toast.success('Registration deleted')
        this.reload()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete registration'))
      }
    },
    openAdd() {
      this.editing = null
      this.modal = true
    },
    openEdit(r) {
      this.editing = r
      this.modal = true
    },
    closeModal() {
      this.modal = false
      this.editing = null
    },
    onSaved() {
      this.closeModal()
      this.reload()
    },
    async exportCsv() {
      this.exporting = true
      try {
        const blob = await eventsApi.exportCsv(this.eventId, { status: this.status, checked_in: this.checked, ticket_type_id: this.ticket, search: this.q.trim().replace(/^#/, '') })
        const slug = String(this.event.title || 'event')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        downloadBlob(blob, `${slug}-registrations-${isoDate()}.csv`)
        toast.success('Export downloaded')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      } finally {
        this.exporting = false
      }
    }
  }
}
</script>

<style scoped>
.crumb {
  color: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crumb:hover {
  color: var(--accent);
}
.head-main {
  min-width: 0;
  max-width: 100%;
}
.of {
  font-size: 15px;
  font-weight: 550;
  color: var(--text-3);
  margin-left: 4px;
}
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }
.kpi-bar {
  height: 4px;
  border-radius: 99px;
  background: var(--bg-subtle);
  margin-top: 10px;
  overflow: hidden;
}
.kpi-bar span {
  display: block;
  height: 100%;
  background: var(--success);
}
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
  flex-wrap: wrap;
}
.search { width: 280px; }
.filter { width: 160px; }
.sk-row {
  display: flex;
  gap: 16px;
  padding: 10px 0;
  align-items: center;
}
.sk-row .ui-skeleton {
  height: 16px;
}
.who {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}
.who__txt {
  min-width: 0;
}
.who__txt strong {
  display: block;
  font-weight: 600;
}
.who__txt small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.ref {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-3);
}
.ci {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.ci__txt {
  font-size: 12px;
  color: var(--success);
  font-variant-numeric: tabular-nums;
}
tr.is-cancelled td {
  opacity: 0.6;
}
.show-sm {
  display: none !important;
}
.muted { color: var(--text-3); }
.nowrap { white-space: nowrap; }
.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
.menu__list {
  z-index: 60;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 6px;
  display: flex;
  flex-direction: column;
}
.menu__list button,
.menu__list a {
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
}
.menu__list i {
  width: 16px;
  color: var(--text-3);
}
.menu__list button:hover,
.menu__list a:hover {
  background: var(--surface-hover);
}
.menu__list .danger,
.menu__list .danger i {
  color: var(--danger);
}
@media (max-width: 1200px) {
  .hide-lg { display: none; }
}
@media (max-width: 900px) {
  .hide-md { display: none; }
}
@media (max-width: 640px) {
  .hide-sm { display: none; }
  .show-sm { display: block !important; }
  .toolbar__right { width: 100%; }
  .search { width: 100%; flex: 1 1 100%; }
  .filter { flex: 1; width: auto; min-width: 0; }
  .ui-tabs { overflow-x: auto; max-width: 100%; }
  .who__txt small { max-width: 180px; }
}
@media (max-width: 640px) {
  .ui-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 20px;
  }
  .ui-kpi__meta {
    white-space: normal;
  }
}
</style>
