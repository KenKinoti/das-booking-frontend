<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Events</div>
        <h1>Events</h1>
        <p>Plan events, sell tickets and check in your attendees.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/events/create" class="ui-btn ui-btn--primary"><i class="fa-solid fa-plus"></i> New event</router-link>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': scope === 'upcoming' }" @click="setScope('upcoming')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-regular fa-calendar"></i></span>Upcoming events</div>
        <div class="ui-kpi__value"><span v-if="stats">{{ stats.upcoming }}</span><span v-else class="ui-skeleton sk-val"></span></div>
        <div class="ui-kpi__meta">
          <template v-if="stats && stats.next_event">Next: {{ stats.next_event.title }} · {{ shortDate(stats.next_event.start_date) }}</template>
          <template v-else-if="stats">{{ stats.live ? `${stats.live} happening now` : 'Nothing scheduled yet' }}</template>
        </div>
      </button>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-ticket"></i></span>Registrations</div>
        <div class="ui-kpi__value"><span v-if="stats">{{ num(stats.tickets) }}</span><span v-else class="ui-skeleton sk-val"></span></div>
        <div class="ui-kpi__meta" v-if="stats">{{ num(stats.registrations) }} bookings · {{ num(stats.checked_in) }} checked in</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-sack-dollar"></i></span>Ticket revenue</div>
        <div class="ui-kpi__value"><span v-if="stats">{{ money(stats.revenue, stats.currency) }}</span><span v-else class="ui-skeleton sk-val"></span></div>
        <div class="ui-kpi__meta" v-if="stats">{{ money(stats.paid, stats.currency) }} collected</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-users"></i></span>Capacity filled</div>
        <div class="ui-kpi__value"><span v-if="stats">{{ stats.upcoming_capacity ? `${Math.round(stats.capacity_filled)}%` : '—' }}</span><span v-else class="ui-skeleton sk-val"></span></div>
        <div class="ui-kpi__meta" v-if="stats">
          <template v-if="stats.upcoming_capacity">{{ num(stats.upcoming_tickets) }} of {{ num(stats.upcoming_capacity) }} seats, upcoming events</template>
          <template v-else>No capacity-limited upcoming events</template>
        </div>
        <div v-if="stats && stats.upcoming_capacity" class="kpi-bar"><span :style="{ width: Math.min(100, stats.capacity_filled) + '%' }"></span></div>
      </div>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': scope === t.value }" role="tab" :aria-selected="scope === t.value" @click="setScope(t.value)">
            {{ t.label }}<span v-if="t.count != null" class="count">{{ t.count }}</span>
          </button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search events…" aria-label="Search events" @input="debouncedLoad" />
          </div>
          <select v-model="category" class="ui-select filter" aria-label="Category" @change="reload">
            <option value="">All categories</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <select v-model="type" class="ui-select filter" aria-label="Event type" @change="reload">
            <option value="">All formats</option>
            <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <div class="view-toggle" role="group" aria-label="View">
            <button class="ui-btn ui-btn--sm ui-btn--icon" :class="{ 'is-on': view === 'grid' }" aria-label="Grid view" title="Grid view" @click="setView('grid')"><i class="fa-solid fa-grip"></i></button>
            <button class="ui-btn ui-btn--sm ui-btn--icon" :class="{ 'is-on': view === 'list' }" aria-label="List view" title="List view" @click="setView('list')"><i class="fa-solid fa-list"></i></button>
          </div>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="reload">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !events.length" class="ui-card__body">
        <div class="grid">
          <div v-for="n in 6" :key="n" class="ev-card sk-card">
            <div class="ui-skeleton" style="height: 128px; border-radius: 12px"></div>
            <div class="ui-skeleton" style="height: 16px; width: 70%; margin-top: 14px"></div>
            <div class="ui-skeleton" style="height: 12px; width: 50%; margin-top: 10px"></div>
          </div>
        </div>
      </div>

      <div v-else-if="!events.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-regular fa-calendar-plus"></i></div>
        <h3>{{ filtered ? 'No events match your filters' : emptyTitle }}</h3>
        <p>{{ filtered ? 'Try a different search, category or tab.' : 'Create an event, add ticket types and share the registration page.' }}</p>
        <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: center">
          <button v-if="filtered" class="ui-btn" @click="clearFilters"><i class="fa-solid fa-xmark"></i> Clear filters</button>
          <router-link v-else to="/events/create" class="ui-btn ui-btn--primary"><i class="fa-solid fa-plus"></i> Create event</router-link>
        </div>
      </div>

      <div v-else-if="view === 'grid'" class="ui-card__body" :class="{ 'is-loading': loading }">
        <div class="grid">
          <article v-for="e in events" :key="e.id" class="ev-card" tabindex="0" @click="open(e)" @keydown.enter="open(e)">
            <div class="cover" :style="coverStyle(e)">
              <div class="date-chip">
                <span class="m">{{ month(e.start_date) }}</span>
                <span class="d">{{ day(e.start_date) }}</span>
              </div>
              <span class="ui-badge status" :class="`ui-badge--${badge(e)}`">{{ statusLabel(e) }}</span>
              <i v-if="!e.cover_image_url" :class="typeIcon(e.type)" class="cover-icon"></i>
            </div>
            <div class="ev-body">
              <div class="ev-cat">{{ e.category || 'Event' }} · {{ typeLabel(e.type) }}</div>
              <h3 class="ev-title">{{ e.title }}</h3>
              <div class="ev-meta"><i class="fa-regular fa-clock"></i>{{ dateTime(e.start_date) }}</div>
              <div class="ev-meta"><i :class="typeIcon(e.type)"></i>{{ location(e) }}</div>
              <div class="ev-foot">
                <div class="fill">
                  <div class="fill__row">
                    <span><strong>{{ e.stats.tickets }}</strong> {{ e.stats.capacity ? `/ ${e.stats.capacity}` : '' }} registered</span>
                    <span v-if="e.stats.capacity" class="muted">{{ Math.round(e.stats.fill_rate) }}%</span>
                  </div>
                  <div v-if="e.stats.capacity" class="bar"><span :style="{ width: Math.min(100, e.stats.fill_rate) + '%' }" :class="{ full: e.stats.fill_rate >= 100 }"></span></div>
                </div>
                <div class="price">{{ priceLabel(e) }}</div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th class="hide-md">Location</th>
              <th>Status</th>
              <th class="num">Registered</th>
              <th class="num hide-sm">Revenue</th>
              <th style="width: 44px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e.id" class="is-clickable" @click="open(e)">
              <td>
                <div class="ev-cell">
                  <span class="thumb" :style="coverStyle(e)"><i v-if="!e.cover_image_url" :class="typeIcon(e.type)"></i></span>
                  <span>
                    <strong class="ev-cell__title">{{ e.title }}</strong>
                    <small>{{ e.category || 'Event' }} · {{ typeLabel(e.type) }}</small>
                  </span>
                </div>
              </td>
              <td class="nowrap">{{ dateTime(e.start_date) }}</td>
              <td class="hide-md muted">{{ location(e) }}</td>
              <td><span class="ui-badge" :class="`ui-badge--${badge(e)}`">{{ statusLabel(e) }}</span></td>
              <td class="num">{{ e.stats.tickets }}<span v-if="e.stats.capacity" class="muted"> / {{ e.stats.capacity }}</span></td>
              <td class="num hide-sm">{{ money(e.stats.revenue, e.currency) }}</td>
              <td @click.stop>
                <router-link :to="`/events/${e.id}`" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Open ${e.title}`"><i class="fa-solid fa-chevron-right"></i></router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="events.length && total > events.length" class="pager">
        <span class="muted">Showing {{ events.length }} of {{ total }}</span>
        <button class="ui-btn ui-btn--sm" :disabled="loading" @click="loadMore"><i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-angles-down'"></i> Load more</button>
      </footer>
    </section>
  </div>
</template>

<script>
import { eventsApi, EVENT_TYPES, STATUS_META, typeLabel, typeIcon, eventLocation } from '@/services/events'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDateTime } from '@/utils/format'

const VIEW_KEY = 'events.view'

export default {
  name: 'Events',
  data() {
    let view = 'grid'
    try {
      view = localStorage.getItem(VIEW_KEY) || 'grid'
    } catch {
      /* ignore */
    }
    const q = this.$route.query
    return {
      events: [],
      total: 0,
      page: 1,
      perPage: 24,
      scope: q.scope || 'upcoming',
      q: q.q || '',
      category: q.category || '',
      type: q.type || '',
      view,
      categories: [],
      stats: null,
      loading: false,
      error: null,
      timer: null,
      types: EVENT_TYPES
    }
  },
  computed: {
    tabs() {
      const s = this.stats
      return [
        { value: 'upcoming', label: 'Upcoming', count: s ? s.upcoming : null },
        { value: 'past', label: 'Past', count: s ? s.past : null },
        { value: 'draft', label: 'Drafts', count: s ? s.drafts : null },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'all', label: 'All', count: s ? s.total_events : null }
      ]
    },
    filtered() {
      return !!(this.q || this.category || this.type)
    },
    emptyTitle() {
      return {
        upcoming: 'No upcoming events',
        past: 'No past events yet',
        draft: 'No drafts',
        cancelled: 'No cancelled events',
        all: 'No events yet'
      }[this.scope]
    }
  },
  created() {
    this.load()
    this.loadStats()
    this.loadCategories()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    typeLabel,
    typeIcon,
    location: eventLocation,
    money(v, c) {
      return formatMoney(v, c || 'AUD')
    },
    num(n) {
      return new Intl.NumberFormat().format(n || 0)
    },
    dateTime: formatDateTime,
    shortDate(v) {
      return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(v))
    },
    month(v) {
      return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(v))
    },
    day(v) {
      return new Date(v).getDate()
    },
    badge(e) {
      return (STATUS_META[e.display_status] || STATUS_META.draft).badge
    },
    statusLabel(e) {
      return (STATUS_META[e.display_status] || STATUS_META.draft).label
    },
    priceLabel(e) {
      const active = (e.ticket_types || []).filter((t) => t.is_active)
      if (!active.length || active.every((t) => !t.price)) return 'Free'
      const prices = active.map((t) => t.price)
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      if (min === max) return this.money(min, e.currency)
      return min === 0 ? `Free – ${this.money(max, e.currency)}` : `From ${this.money(min, e.currency)}`
    },
    coverStyle(e) {
      if (e.cover_image_url) return { backgroundImage: `url("${String(e.cover_image_url).replace(/"/g, '%22')}")` }
      return {}
    },
    async load(append = false) {
      this.loading = true
      this.error = null
      try {
        const data = await eventsApi.list({ scope: this.scope, search: this.q, category: this.category, type: this.type, page: this.page, per_page: this.perPage })
        const list = data.events || []
        this.events = append ? this.events.concat(list) : list
        this.total = data.total || 0
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load events')
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        this.stats = await eventsApi.stats()
      } catch {
        this.stats = null
      }
    },
    async loadCategories() {
      try {
        const data = await eventsApi.categories()
        this.categories = data.categories || []
      } catch {
        this.categories = []
      }
    },
    reload() {
      this.page = 1
      this.syncQuery()
      this.load()
    },
    loadMore() {
      this.page += 1
      this.load(true)
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.reload, 280)
    },
    setScope(s) {
      this.scope = s
      this.reload()
    },
    setView(v) {
      this.view = v
      try {
        localStorage.setItem(VIEW_KEY, v)
      } catch {
        /* ignore */
      }
    },
    clearFilters() {
      this.q = ''
      this.category = ''
      this.type = ''
      this.reload()
    },
    syncQuery() {
      const query = {}
      if (this.scope !== 'upcoming') query.scope = this.scope
      if (this.q) query.q = this.q
      if (this.category) query.category = this.category
      if (this.type) query.type = this.type
      this.$router.replace({ query }).catch(() => {})
    },
    open(e) {
      this.$router.push(`/events/${e.id}`)
    }
  }
}
</script>

<style scoped>
.kpi-btn {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.kpi-btn:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}
.kpi-btn.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }
.sk-val { display: inline-block; width: 80px; height: 26px; }
.ui-kpi__meta {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
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
  background: var(--warning);
  border-radius: 99px;
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
  align-items: center;
}
.search { width: 240px; }
.filter { width: 160px; }
.view-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
}
.view-toggle .ui-btn {
  border-color: transparent;
  background: transparent;
  color: var(--text-3);
  box-shadow: none;
}
.view-toggle .ui-btn.is-on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 18px;
}
.ev-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  display: flex;
  flex-direction: column;
}
.ev-card:hover,
.ev-card:focus-visible {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
  transform: translateY(-1px);
  outline: none;
}
.sk-card {
  padding: 12px;
  cursor: default;
}
.cover {
  position: relative;
  height: 136px;
  background-color: var(--accent-soft);
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
}
.cover-icon {
  font-size: 34px;
  color: var(--accent);
  opacity: 0.55;
}
.date-chip {
  position: absolute;
  top: 12px;
  left: 12px;
  background: var(--surface);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  width: 48px;
  text-align: center;
  padding: 5px 0 6px;
  line-height: 1.05;
}
.date-chip .m {
  display: block;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--danger);
  letter-spacing: 0.04em;
}
.date-chip .d {
  display: block;
  font-size: 19px;
  font-weight: 750;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.status {
  position: absolute;
  top: 12px;
  right: 12px;
  box-shadow: var(--shadow-xs);
}
.ui-badge--void-plain {
  background: var(--neutral-soft);
  color: var(--text-2);
}
.cover .ui-badge--void-plain,
.cover .ui-badge--draft {
  background: var(--surface);
}
.ev-body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.ev-cat {
  font-size: 11.5px;
  font-weight: 650;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.ev-title {
  font-size: 16px;
  font-weight: 650;
  margin: 0 0 2px;
  color: var(--text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ev-meta {
  font-size: 13px;
  color: var(--text-2);
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-meta i {
  width: 14px;
  color: var(--text-3);
  text-align: center;
}
.ev-foot {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: flex-end;
  gap: 16px;
  justify-content: space-between;
}
.fill {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: var(--text-2);
}
.fill__row {
  display: flex;
  justify-content: space-between;
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
.bar span.full {
  background: var(--success);
}
.price {
  font-weight: 700;
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.ev-cell {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 220px;
}
.ev-cell small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}
.ev-cell__title {
  font-weight: 600;
}
.thumb {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
  background-color: var(--accent-soft);
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  color: var(--accent);
  font-size: 14px;
}
.nowrap { white-space: nowrap; }
.muted { color: var(--text-3); }
.is-loading {
  opacity: 0.6;
  transition: opacity 0.2s;
}
.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

@media (max-width: 900px) {
  .hide-md { display: none; }
}
@media (max-width: 640px) {
  .hide-sm { display: none; }
  .toolbar__right { width: 100%; }
  .search { width: 100%; flex: 1 1 100%; }
  .filter { flex: 1; width: auto; min-width: 0; }
  .ui-tabs { overflow-x: auto; max-width: 100%; }
  .grid { grid-template-columns: 1fr; }
  .cover { height: 104px; }
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
