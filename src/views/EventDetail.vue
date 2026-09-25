<template>
  <div class="ui-page ui-page--wide">
    <div v-if="error" class="ui-alert ui-alert--danger" style="margin-top: 8px">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ error }} <router-link to="/events">Back to events</router-link> · <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <template v-else-if="!event">
      <div class="ui-skeleton" style="height: 28px; width: 320px; margin-bottom: 12px"></div>
      <div class="ui-skeleton" style="height: 200px; border-radius: 16px; margin-bottom: 20px"></div>
      <div class="ui-kpis"><div v-for="n in 4" :key="n" class="ui-kpi"><div class="ui-skeleton" style="height: 50px"></div></div></div>
    </template>

    <template v-else>
      <header class="ui-page-head">
        <div class="head-main">
          <div class="ui-eyebrow">
            <router-link to="/events" class="crumb"><i class="fa-solid fa-arrow-left"></i> Events</router-link>
          </div>
          <h1>{{ event.title }}</h1>
          <p class="head-meta">
            <span class="ui-badge" :class="`ui-badge--${statusMeta.badge}`">{{ statusMeta.label }}</span>
            <span><i class="fa-regular fa-calendar"></i> {{ whenLabel }}</span>
            <span><i :class="typeIcon(event.type)"></i> {{ location(event) }}</span>
          </p>
        </div>
        <div class="ui-actions">
          <button class="ui-btn" @click="shareOpen = true"><i class="fa-solid fa-share-nodes"></i> Share</button>
          <router-link :to="`/events/${event.id}/edit`" class="ui-btn"><i class="fa-regular fa-pen-to-square"></i> Edit</router-link>
          <button v-if="event.status === 'draft'" class="ui-btn ui-btn--primary" :disabled="busy" @click="setStatus('published')"><i class="fa-solid fa-paper-plane"></i> Publish</button>
          <router-link v-else :to="`/events/${event.id}/registrations`" class="ui-btn ui-btn--primary"><i class="fa-solid fa-clipboard-check"></i> Check-in</router-link>
          <div class="menu" @keydown.esc="menuOpen = false">
            <button class="ui-btn ui-btn--icon" aria-label="More actions" :aria-expanded="menuOpen" @click.stop="menuOpen = !menuOpen"><i class="fa-solid fa-ellipsis"></i></button>
            <div v-if="menuOpen" class="menu__list" role="menu" @click="menuOpen = false">
              <button role="menuitem" @click="duplicate"><i class="fa-regular fa-copy"></i> Duplicate</button>
              <button v-if="event.status === 'published'" role="menuitem" @click="setStatus('draft')"><i class="fa-regular fa-eye-slash"></i> Unpublish (back to draft)</button>
              <button v-if="event.status === 'published'" role="menuitem" @click="setStatus('completed')"><i class="fa-solid fa-flag-checkered"></i> Mark as completed</button>
              <button v-if="event.status === 'cancelled' || event.status === 'completed'" role="menuitem" @click="setStatus('published')"><i class="fa-solid fa-rotate-left"></i> Reopen</button>
              <button v-if="event.status !== 'cancelled'" role="menuitem" class="danger" @click="cancelEvent"><i class="fa-solid fa-ban"></i> Cancel event</button>
              <button role="menuitem" class="danger" @click="remove"><i class="fa-regular fa-trash-can"></i> Delete event</button>
            </div>
          </div>
        </div>
      </header>

      <div v-if="event.status === 'cancelled'" class="ui-alert ui-alert--warning banner"><i class="fa-solid fa-ban"></i><span>This event is cancelled. Registrations are closed.</span></div>
      <div v-else-if="event.status === 'draft'" class="ui-alert banner"><i class="fa-solid fa-circle-info"></i><span>This event is a draft — it isn't visible to attendees until you publish it.</span></div>

      <div v-if="event.cover_image_url" class="hero" :style="coverStyle"></div>

      <div class="ui-kpis">
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-ticket"></i></span>Registered</div>
          <div class="ui-kpi__value">{{ s.tickets }}<small v-if="s.capacity" class="of">/ {{ s.capacity }}</small></div>
          <div class="ui-kpi__meta">{{ s.registrations }} registration{{ s.registrations === 1 ? '' : 's' }}{{ s.waitlisted ? ` · ${s.waitlisted} waitlisted` : '' }}</div>
          <div v-if="s.capacity" class="kpi-bar"><span :style="{ width: Math.min(100, s.fill_rate) + '%' }"></span></div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-user-check"></i></span>Checked in</div>
          <div class="ui-kpi__value">{{ s.checked_in }}</div>
          <div class="ui-kpi__meta">{{ s.tickets ? Math.round((s.checked_in / s.tickets) * 100) : 0 }}% of registered</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-sack-dollar"></i></span>Revenue</div>
          <div class="ui-kpi__value">{{ money(s.revenue) }}</div>
          <div class="ui-kpi__meta">{{ money(s.paid) }} collected</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-chair"></i></span>Seats left</div>
          <div class="ui-kpi__value">{{ s.capacity ? s.remaining : '∞' }}</div>
          <div class="ui-kpi__meta">{{ s.capacity ? `${Math.round(s.fill_rate)}% filled` : 'Unlimited capacity' }}</div>
        </div>
      </div>

      <div class="cols">
        <div class="col-main">
          <section class="ui-card">
            <div class="ui-card__head"><h2>Ticket sales</h2><router-link :to="`/events/${event.id}/edit`" class="ui-btn ui-btn--ghost ui-btn--sm">Manage tickets</router-link></div>
            <div v-if="!event.ticket_types || !event.ticket_types.length" class="ui-card__body muted">No ticket types yet.</div>
            <div v-else class="ui-table-wrap">
              <table class="ui-table">
                <thead>
                  <tr><th>Ticket</th><th class="num">Price</th><th>Sold</th><th class="num">Revenue</th></tr>
                </thead>
                <tbody>
                  <tr v-for="t in event.ticket_types" :key="t.id">
                    <td>
                      <strong>{{ t.name }}</strong>
                      <span v-if="!t.is_active" class="ui-badge ui-badge--draft" style="margin-left: 8px">Off sale</span>
                      <small v-if="t.description" class="sub">{{ t.description }}</small>
                    </td>
                    <td class="num">{{ t.price > 0 ? money(t.price) : 'Free' }}</td>
                    <td class="sold-cell">
                      <div class="sold-row"><span>{{ t.sold_quantity }}{{ t.quantity ? ` / ${t.quantity}` : '' }}</span><span v-if="t.quantity" class="muted">{{ Math.round((t.sold_quantity / t.quantity) * 100) }}%</span></div>
                      <div v-if="t.quantity" class="bar"><span :style="{ width: Math.min(100, (t.sold_quantity / t.quantity) * 100) + '%' }"></span></div>
                    </td>
                    <td class="num">{{ money(t.price * t.sold_quantity) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="ui-card">
            <div class="ui-card__head">
              <h2>Registrations</h2>
              <div class="ui-actions">
                <button class="ui-btn ui-btn--sm" @click="addOpen = true"><i class="fa-solid fa-user-plus"></i> Add attendee</button>
                <router-link :to="`/events/${event.id}/registrations`" class="ui-btn ui-btn--ghost ui-btn--sm">View all <i class="fa-solid fa-arrow-right"></i></router-link>
              </div>
            </div>
            <div v-if="regsLoading && !regs.length" class="ui-card__body"><div v-for="n in 3" :key="n" class="ui-skeleton" style="height: 36px; margin-bottom: 10px"></div></div>
            <div v-else-if="!regs.length" class="ui-empty compact">
              <div class="ui-empty__icon"><i class="fa-solid fa-user-group"></i></div>
              <h3>No registrations yet</h3>
              <p>Share the registration page or add attendees manually.</p>
            </div>
            <ul v-else class="reg-list">
              <li v-for="r in regs.slice(0, 8)" :key="r.id" class="reg">
                <span class="avatar">{{ initials(r.registrant_name) }}</span>
                <span class="reg__who">
                  <strong>{{ r.registrant_name }}</strong>
                  <small>{{ r.registrant_email }} · {{ r.ticket_type_name || 'Ticket' }}{{ r.quantity > 1 ? ` ×${r.quantity}` : '' }}</small>
                </span>
                <span class="ui-badge hide-sm" :class="`ui-badge--${regMeta(r).badge}`">{{ regMeta(r).label }}</span>
                <button
                  class="ui-btn ui-btn--sm checkin"
                  :class="r.checked_in_at ? 'ui-btn--success' : ''"
                  :disabled="checking === r.id || !canCheck(r)"
                  :title="r.checked_in_at ? `Checked in ${dateTime(r.checked_in_at)} — click to undo` : 'Check in'"
                  @click="toggleCheckIn(r)"
                >
                  <i :class="checking === r.id ? 'fa-solid fa-circle-notch fa-spin' : r.checked_in_at ? 'fa-solid fa-check' : 'fa-regular fa-square'"></i>
                  <span class="hide-sm">{{ r.checked_in_at ? 'Checked in' : 'Check in' }}</span>
                </button>
              </li>
            </ul>
            <div v-if="regs.length > 8" class="more"><router-link :to="`/events/${event.id}/registrations`">View all {{ regs.length }} registrations</router-link></div>
          </section>

          <section v-if="event.description || event.short_description" class="ui-card">
            <div class="ui-card__head"><h2>About this event</h2></div>
            <div class="ui-card__body">
              <p v-if="event.short_description" class="summary-line">{{ event.short_description }}</p>
              <div class="desc">{{ event.description }}</div>
            </div>
          </section>
        </div>

        <aside class="col-side">
          <section class="ui-card">
            <div class="ui-card__head"><h2>Details</h2></div>
            <div class="ui-card__body">
              <dl class="facts">
                <div><dt><i class="fa-regular fa-clock"></i> Starts</dt><dd>{{ dateTime(event.start_date) }}</dd></div>
                <div><dt><i class="fa-regular fa-clock"></i> Ends</dt><dd>{{ dateTime(event.end_date) }}</dd></div>
                <div><dt><i :class="typeIcon(event.type)"></i> Format</dt><dd>{{ typeLabel(event.type) }}</dd></div>
                <div v-if="event.type !== 'online'">
                  <dt><i class="fa-solid fa-location-dot"></i> Venue</dt>
                  <dd>
                    {{ event.venue_name || '—' }}
                    <small v-if="addressLine" class="sub">{{ addressLine }}</small>
                  </dd>
                </div>
                <div v-if="event.type !== 'in_person'">
                  <dt><i class="fa-solid fa-video"></i> Online</dt>
                  <dd>
                    <a v-if="event.online_url" :href="event.online_url" target="_blank" rel="noopener" class="link">{{ event.online_platform || 'Join link' }} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                    <span v-else class="muted">No link yet</span>
                  </dd>
                </div>
                <div v-if="event.category"><dt><i class="fa-solid fa-tag"></i> Category</dt><dd>{{ event.category }}</dd></div>
                <div v-if="event.contact_email || event.contact_name">
                  <dt><i class="fa-regular fa-envelope"></i> Contact</dt>
                  <dd>{{ event.contact_name }} <a v-if="event.contact_email" :href="`mailto:${event.contact_email}`" class="link sub">{{ event.contact_email }}</a></dd>
                </div>
                <div><dt><i class="fa-solid fa-sliders"></i> Settings</dt><dd class="chips"><span class="chip">{{ event.is_public ? 'Public page' : 'Private' }}</span><span v-if="event.requires_approval" class="chip">Approval</span><span v-if="event.allow_waitlist" class="chip">Waitlist</span></dd></div>
              </dl>
              <div v-if="tags.length" class="chips" style="margin-top: 12px"><span v-for="t in tags" :key="t" class="chip">#{{ t }}</span></div>
            </div>
          </section>

          <section class="ui-card">
            <div class="ui-card__head"><h2>Registration page</h2></div>
            <div class="ui-card__body">
              <p v-if="!event.is_public" class="muted small">The public page is turned off. Enable it in the event settings to share.</p>
              <p v-else-if="event.status !== 'published'" class="muted small">Publish the event to open registrations. The link below will work once it's live.</p>
              <p v-else class="muted small">Anyone with this link can view the event and register.</p>
              <div class="copy">
                <input class="ui-input" :value="shareUrl" readonly aria-label="Registration link" @focus="$event.target.select()" />
                <button class="ui-btn ui-btn--icon" aria-label="Copy link" title="Copy link" @click="copy"><i class="fa-regular fa-copy"></i></button>
              </div>
              <a :href="shareUrl" target="_blank" rel="noopener" class="ui-btn ui-btn--ghost ui-btn--sm" style="margin-top: 8px" :class="{ disabled: !canShare }"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open page</a>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <!-- Share modal -->
    <div v-if="shareOpen && event" class="ui-modal-backdrop" @mousedown.self="shareOpen = false">
      <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div class="ui-modal__head">
          <h2 id="share-title">Share event</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="shareOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="!canShare" class="ui-alert ui-alert--warning" style="margin-bottom: 12px"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ event.is_public ? 'Publish the event so people can register.' : 'The public page is off for this event.' }}</span></div>
          <div class="ui-field">
            <label>Registration link</label>
            <div class="copy">
              <input class="ui-input" :value="shareUrl" readonly @focus="$event.target.select()" />
              <button class="ui-btn" @click="copy"><i class="fa-regular fa-copy"></i> Copy</button>
            </div>
          </div>
          <div class="share-row">
            <a class="ui-btn ui-btn--sm" :href="mailto" target="_blank" rel="noopener"><i class="fa-regular fa-envelope"></i> Email</a>
            <a class="ui-btn ui-btn--sm" :href="`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>
            <a class="ui-btn ui-btn--sm" :href="`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`" target="_blank" rel="noopener"><i class="fa-brands fa-facebook"></i> Facebook</a>
            <a class="ui-btn ui-btn--sm" :href="`https://x.com/intent/post?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(event.title)}`" target="_blank" rel="noopener"><i class="fa-brands fa-x-twitter"></i> X</a>
          </div>
        </div>
        <div class="ui-modal__foot">
          <a :href="shareUrl" target="_blank" rel="noopener" class="ui-btn"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open page</a>
          <button class="ui-btn ui-btn--primary" @click="shareOpen = false">Done</button>
        </div>
      </div>
    </div>

    <AttendeeModal v-if="addOpen && event" :event="event" @close="addOpen = false" @saved="onAdded" />
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { eventsApi, STATUS_META, REG_STATUS, typeLabel, typeIcon, eventLocation, publicEventUrl } from '@/services/events'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import AttendeeModal from '@/components/events/AttendeeModal.vue'

export default {
  name: 'EventDetail',
  components: { AttendeeModal },
  data() {
    return {
      event: null,
      error: '',
      regs: [],
      regsLoading: false,
      checking: '',
      busy: false,
      menuOpen: false,
      shareOpen: false,
      addOpen: false
    }
  },
  computed: {
    id() {
      return this.$route.params.id
    },
    s() {
      return (this.event && this.event.stats) || {}
    },
    statusMeta() {
      return STATUS_META[this.event.display_status] || STATUS_META.draft
    },
    whenLabel() {
      const a = new Date(this.event.start_date)
      const b = new Date(this.event.end_date)
      const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
      if (a.toDateString() === b.toDateString()) return `${day.format(a)}, ${time.format(a)} – ${time.format(b)}`
      return `${day.format(a)} – ${day.format(b)}`
    },
    addressLine() {
      const a = this.event.address || {}
      return [a.street, a.suburb, a.state, a.postcode].filter(Boolean).join(', ')
    },
    tags() {
      return String(this.event.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    },
    coverStyle() {
      return this.event.cover_image_url ? { backgroundImage: `url("${String(this.event.cover_image_url).replace(/"/g, '%22')}")` } : {}
    },
    shareUrl() {
      return publicEventUrl(this.event.id)
    },
    canShare() {
      return this.event.is_public && this.event.status === 'published'
    },
    mailto() {
      const subject = encodeURIComponent(`You're invited: ${this.event.title}`)
      const body = encodeURIComponent(`${this.event.title}\n${this.whenLabel}\n\nRegister here: ${this.shareUrl}`)
      return `mailto:?subject=${subject}&body=${body}`
    }
  },
  watch: {
    id() {
      this.event = null
      this.load()
    }
  },
  created() {
    this.load()
    document.addEventListener('click', this.closeMenu)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeMenu)
  },
  methods: {
    typeLabel,
    typeIcon,
    location: eventLocation,
    dateTime: formatDateTime,
    money(v) {
      return formatMoney(v, (this.event && this.event.currency) || orgCurrency())
    },
    regMeta(r) {
      return REG_STATUS[r.status] || REG_STATUS.pending
    },
    canCheck(r) {
      return r.status === 'confirmed' || r.status === 'pending' || !!r.checked_in_at
    },
    initials(name = '') {
      return (
        name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0])
          .join('')
          .toUpperCase() || '?'
      )
    },
    closeMenu() {
      this.menuOpen = false
    },
    async load() {
      this.error = ''
      try {
        this.event = await eventsApi.get(this.id)
        this.loadRegs()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load this event')
      }
    },
    async refresh() {
      try {
        this.event = await eventsApi.get(this.id)
      } catch {
        /* keep current */
      }
    },
    async loadRegs() {
      this.regsLoading = true
      try {
        const data = await eventsApi.registrations(this.id)
        this.regs = data.registrations || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load registrations'))
      } finally {
        this.regsLoading = false
      }
    },
    async toggleCheckIn(r) {
      this.checking = r.id
      try {
        const updated = await eventsApi.checkIn(this.id, r.id, !r.checked_in_at)
        Object.assign(r, updated)
        toast.success(updated.checked_in_at ? `${r.registrant_name} checked in` : 'Check-in undone')
        this.refresh()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update check-in'))
      } finally {
        this.checking = ''
      }
    },
    onAdded() {
      this.addOpen = false
      this.loadRegs()
      this.refresh()
    },
    async copy() {
      try {
        await navigator.clipboard.writeText(this.shareUrl)
        toast.success('Link copied')
      } catch {
        toast.info('Select the link and copy it manually')
      }
    },
    async setStatus(status) {
      this.busy = true
      try {
        this.event = await eventsApi.setStatus(this.id, status)
        const msg = { published: 'Event published', draft: 'Moved back to draft', completed: 'Marked as completed', cancelled: 'Event cancelled' }
        toast.success(msg[status] || 'Updated')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update status'))
      } finally {
        this.busy = false
      }
    },
    async cancelEvent() {
      const ok = await confirmDialog({
        title: 'Cancel this event?',
        message: `Registrations for “${this.event.title}” will close. Existing registrations are kept so you can contact attendees.`,
        confirmText: 'Cancel event',
        danger: true
      })
      if (ok) this.setStatus('cancelled')
    },
    async duplicate() {
      try {
        const copy = await eventsApi.duplicate(this.id)
        toast.success('Event duplicated as a draft')
        this.$router.push(`/events/${copy.id}/edit`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not duplicate event'))
      }
    },
    async remove() {
      const n = this.s.registrations || 0
      const ok = await confirmDialog({
        title: 'Delete this event?',
        message: n ? `“${this.event.title}” and its ${n} registration${n === 1 ? '' : 's'} will be permanently removed.` : `“${this.event.title}” will be permanently removed.`,
        confirmText: 'Delete event',
        danger: true
      })
      if (!ok) return
      try {
        await eventsApi.remove(this.id)
        toast.success('Event deleted')
        this.$router.push('/events')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete event'))
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
}
.crumb:hover {
  color: var(--accent);
}
.head-main {
  min-width: 0;
}
.head-main h1 {
  overflow-wrap: anywhere;
}
.head-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
}
.head-meta i {
  color: var(--text-3);
  margin-right: 4px;
}
.banner {
  margin-bottom: 16px;
}
.hero {
  height: 220px;
  border-radius: var(--radius-lg);
  background-color: var(--accent-soft);
  background-size: cover;
  background-position: center;
  margin-bottom: 20px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
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
  background: var(--accent);
}
.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}
.col-main,
.col-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
.sub {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}
.sold-cell {
  min-width: 140px;
}
.sold-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}
.bar {
  height: 5px;
  background: var(--bg-subtle);
  border-radius: 99px;
  margin-top: 6px;
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 99px;
}
.reg-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.reg {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-top: 1px solid var(--border);
}
.reg:first-child {
  border-top: 0;
}
.reg__who {
  flex: 1;
  min-width: 0;
}
.reg__who strong {
  display: block;
  font-weight: 600;
}
.reg__who small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.checkin {
  min-width: 112px;
  justify-content: center;
}
.more {
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  font-size: 13.5px;
}
.compact {
  padding: 28px 16px;
}
.summary-line {
  font-weight: 600;
  color: var(--text);
}
.desc {
  white-space: pre-line;
  color: var(--text-2);
  line-height: 1.6;
}
.facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.facts > div {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
}
.facts dt {
  color: var(--text-3);
  font-weight: 500;
  font-size: 13px;
}
.facts dt i {
  width: 16px;
  text-align: center;
  margin-right: 4px;
}
.facts dd {
  margin: 0;
  font-size: 13.5px;
  color: var(--text);
  overflow-wrap: anywhere;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 99px;
  background: var(--bg-subtle);
  color: var(--text-2);
}
.link {
  color: var(--accent);
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}
.copy {
  display: flex;
  gap: 8px;
}
.copy .ui-input {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
}
.small {
  font-size: 13px;
  margin-bottom: 10px;
}
.muted {
  color: var(--text-3);
}
.disabled {
  opacity: 0.6;
}
.share-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.menu {
  position: relative;
}
.menu__list {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 30;
  min-width: 230px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 6px;
  display: flex;
  flex-direction: column;
}
.menu__list button {
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;
  padding: 9px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.menu__list button i {
  width: 16px;
  color: var(--text-3);
}
.menu__list button:hover {
  background: var(--surface-hover);
}
.menu__list button.danger,
.menu__list button.danger i {
  color: var(--danger);
}

@media (max-width: 1100px) {
  .cols {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .hero {
    height: 140px;
  }
  .hide-sm {
    display: none;
  }
  .checkin {
    min-width: 0;
  }
  .reg {
    padding: 10px 14px;
  }
  .ui-actions {
    flex-wrap: wrap;
  }
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
