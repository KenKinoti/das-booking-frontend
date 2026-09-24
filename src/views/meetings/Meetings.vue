<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Communication</div>
        <h1>Meetings</h1>
        <p>Schedule calls, send calendar invites and keep transcripts with summaries.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="loading" @click="load"><i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate'"></i> Refresh</button>
        <button class="ui-btn ui-btn--primary" @click="openSchedule()"><i class="fa-regular fa-calendar-plus"></i> Schedule meeting</button>
      </div>
    </header>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-regular fa-calendar"></i></span>Today</div>
        <div class="ui-kpi__value">{{ loaded ? stats.today : '—' }}</div>
        <div class="ui-kpi__meta">{{ nextToday ? `Next at ${fmtTime(nextToday.start_at)}` : 'Nothing else today' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-calendar-week"></i></span>This week</div>
        <div class="ui-kpi__value">{{ loaded ? stats.week : '—' }}</div>
        <div class="ui-kpi__meta">{{ stats.weekHours }} scheduled</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-hourglass-half"></i></span>Upcoming</div>
        <div class="ui-kpi__value">{{ loaded ? stats.upcoming : '—' }}</div>
        <div class="ui-kpi__meta">{{ stats.people }} {{ stats.people === 1 ? 'person' : 'people' }} invited</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-circle-check"></i></span>Past meetings</div>
        <div class="ui-kpi__value">{{ loaded ? stats.completed : '—' }}</div>
        <div class="ui-kpi__meta">{{ stats.transcripts }} with transcript{{ stats.transcripts === 1 ? '' : 's' }}</div>
      </div>
    </div>

    <div v-if="loaded && !smtpConfigured" class="ui-alert ui-alert--warning smtp-note">
      <i class="fa-solid fa-envelope-open-text"></i>
      <span>Email isn't configured on the server (SMTP), so invites aren't emailed automatically. After scheduling you'll get a <strong>.ics file</strong> and a <strong>pre-filled email</strong> to send yourself.</span>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': tab === t.value }" role="tab" :aria-selected="tab === t.value" @click="setTab(t.value)">
            {{ t.label }} <span class="tab-count">{{ counts[t.value] }}</span>
          </button>
        </div>
        <div class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="q" class="ui-input" type="search" placeholder="Search title, agenda or people…" aria-label="Search meetings" />
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !loaded" class="ui-card__body">
        <div v-for="n in 5" :key="n" class="sk-row">
          <div class="ui-skeleton" style="width: 70px"></div>
          <div class="ui-skeleton" style="flex: 1"></div>
          <div class="ui-skeleton" style="width: 90px"></div>
        </div>
      </div>

      <div v-else-if="!groups.length" class="ui-empty">
        <div class="ui-empty__icon"><i :class="q ? 'fa-solid fa-magnifying-glass' : tab === 'cancelled' ? 'fa-regular fa-calendar-xmark' : 'fa-regular fa-calendar'"></i></div>
        <h3>{{ emptyTitle }}</h3>
        <p>{{ emptyText }}</p>
        <button v-if="!q && tab === 'upcoming'" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openSchedule()"><i class="fa-regular fa-calendar-plus"></i> Schedule meeting</button>
      </div>

      <div v-else class="agenda" :class="{ 'is-loading': loading }">
        <div v-for="g in groups" :key="g.key" class="day">
          <div class="day__head">
            <span class="day__date">
              <span class="day__num">{{ g.dayNum }}</span>
              <span class="day__label"><strong>{{ g.label }}</strong><small>{{ g.sub }}</small></span>
            </span>
            <span class="muted small">{{ g.items.length }} {{ g.items.length === 1 ? 'meeting' : 'meetings' }}</span>
          </div>
          <ul class="rows">
            <li v-for="m in g.items" :key="m.id" class="row" :class="{ 'is-live': isLive(m, now), 'is-cancelled': m.status === 'cancelled' }" tabindex="0" @click="select(m)" @keydown.enter="select(m)">
              <div class="row__time">
                <strong>{{ fmtTime(m.start_at) }}</strong>
                <small>{{ durationLabel(m) }}</small>
              </div>
              <div class="row__main">
                <div class="row__title">
                  <span class="title-text">{{ m.title }}</span>
                  <i v-if="m.recurrence && m.recurrence !== 'none'" class="fa-solid fa-repeat muted" :title="`Repeats ${m.recurrence}`"></i>
                  <i v-if="m.has_transcript" class="fa-regular fa-file-lines muted" title="Transcript saved"></i>
                </div>
                <div class="row__meta">
                  <span><i :class="locIcon(m)"></i> {{ locationLabel(m) }}</span>
                  <span v-if="m.participants && m.participants.length" class="avatars" :title="m.participants.map((p) => p.name || p.email).join(', ')">
                    <span v-for="p in m.participants.slice(0, 4)" :key="p.email" class="avatar">{{ initials(p.name || p.email) }}</span>
                    <span v-if="m.participants.length > 4" class="avatar more">+{{ m.participants.length - 4 }}</span>
                  </span>
                  <span v-else class="muted">No participants</span>
                </div>
              </div>
              <div class="row__side" @click.stop>
                <span class="ui-badge" :class="`ui-badge--${displayStatus(m, now).cls}`">{{ displayStatus(m, now).label }}</span>
                <button v-if="canJoin(m)" class="ui-btn ui-btn--sm" :class="isLive(m, now) ? 'ui-btn--success' : ''" @click="join(m)"><i class="fa-solid fa-video"></i> <span class="hide-xs">Join</span></button>
                <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Open ${m.title}`" @click="select(m)"><i class="fa-solid fa-chevron-right"></i></button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <MeetingDrawer v-if="selected" :meeting="selected" @close="closeDrawer" @edit="openSchedule" @changed="onChanged" @deleted="onDeleted" @result="showResult" />
    <ScheduleMeetingModal v-if="scheduleOpen" :meeting="editing" :smtp-configured="smtpConfigured" @close="scheduleOpen = false" @saved="onSaved" />
    <InviteResultModal v-if="result" :meeting="result.meeting" :invite="result.invite" :mode="result.mode" @close="result = null" />
  </div>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { isoDate } from '@/utils/format'
import { meetingsApi, fmtTime, durationLabel, displayStatus, locationLabel, initials, isPast, isLive } from '@/services/meetings'
import MeetingDrawer from '@/components/meetings/MeetingDrawer.vue'
import ScheduleMeetingModal from '@/components/meetings/ScheduleMeetingModal.vue'
import InviteResultModal from '@/components/meetings/InviteResultModal.vue'

const TAB_KEY = 'meetings.tab'

export default {
  name: 'Meetings',
  components: { MeetingDrawer, ScheduleMeetingModal, InviteResultModal },
  data() {
    let tab = 'upcoming'
    try {
      tab = localStorage.getItem(TAB_KEY) || 'upcoming'
    } catch {
      /* storage unavailable */
    }
    return {
      meetings: [],
      smtpConfigured: false,
      loading: false,
      loaded: false,
      error: '',
      tab: ['upcoming', 'past', 'cancelled'].includes(tab) ? tab : 'upcoming',
      q: '',
      selected: null,
      scheduleOpen: false,
      editing: null,
      result: null,
      now: Date.now(),
      timer: null,
      tabs: [
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'past', label: 'Past' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  },
  computed: {
    buckets() {
      const up = []
      const past = []
      const cancelled = []
      for (const m of this.meetings) {
        if (m.status === 'cancelled') cancelled.push(m)
        else if (isPast(m, this.now)) past.push(m)
        else up.push(m)
      }
      return { upcoming: up, past, cancelled }
    },
    counts() {
      return { upcoming: this.buckets.upcoming.length, past: this.buckets.past.length, cancelled: this.buckets.cancelled.length }
    },
    filtered() {
      const q = this.q.trim().toLowerCase()
      let list = this.buckets[this.tab] || []
      if (q) {
        list = list.filter((m) => [m.title, m.description, m.location, ...(m.participants || []).flatMap((p) => [p.name, p.email])].some((s) => String(s || '').toLowerCase().includes(q)))
      }
      const dir = this.tab === 'upcoming' ? 1 : -1
      return [...list].sort((a, b) => dir * (new Date(a.start_at) - new Date(b.start_at)))
    },
    groups() {
      const out = []
      const map = {}
      const today = isoDate(new Date(this.now))
      const tomorrow = isoDate(new Date(this.now + 86400000))
      const yesterday = isoDate(new Date(this.now - 86400000))
      for (const m of this.filtered) {
        const d = new Date(m.start_at)
        const key = isoDate(d)
        if (!map[key]) {
          const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(d)
          const full = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: d.getFullYear() !== new Date(this.now).getFullYear() ? 'numeric' : undefined }).format(d)
          const label = key === today ? 'Today' : key === tomorrow ? 'Tomorrow' : key === yesterday ? 'Yesterday' : weekday
          map[key] = { key, label, sub: label === weekday ? full : `${weekday}, ${full}`, dayNum: d.getDate(), items: [] }
          out.push(map[key])
        }
        map[key].items.push(m)
      }
      return out
    },
    stats() {
      const now = new Date(this.now)
      const today = isoDate(now)
      const weekStart = new Date(now)
      weekStart.setHours(0, 0, 0, 0)
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
      const active = this.meetings.filter((m) => m.status !== 'cancelled')
      const todays = active.filter((m) => isoDate(new Date(m.start_at)) === today)
      const week = active.filter((m) => new Date(m.start_at) >= weekStart && new Date(m.start_at) < weekEnd)
      const mins = week.reduce((s, m) => s + Math.max(0, (new Date(m.end_at) - new Date(m.start_at)) / 60000), 0)
      const past = this.buckets.past
      const people = new Set(this.buckets.upcoming.flatMap((m) => (m.participants || []).map((p) => p.email)))
      return {
        today: todays.length,
        week: week.length,
        weekHours: mins >= 60 ? `${Math.round((mins / 60) * 10) / 10} h` : `${Math.round(mins)} min`,
        upcoming: this.buckets.upcoming.length,
        people: people.size,
        completed: past.length,
        transcripts: past.filter((m) => m.has_transcript).length
      }
    },
    nextToday() {
      const today = isoDate(new Date(this.now))
      return this.buckets.upcoming.find((m) => isoDate(new Date(m.start_at)) === today && new Date(m.end_at).getTime() >= this.now)
    },
    emptyTitle() {
      if (this.q) return 'Nothing matches your search'
      return { upcoming: 'No upcoming meetings', past: 'No past meetings yet', cancelled: 'No cancelled meetings' }[this.tab]
    },
    emptyText() {
      if (this.q) return 'Try a different name, email or title.'
      return {
        upcoming: 'Schedule a call, invite customers or teammates and they’ll get a calendar invite.',
        past: 'Meetings you’ve held show here with their transcripts and summaries.',
        cancelled: 'Meetings you cancel are kept here for reference.'
      }[this.tab]
    }
  },
  mounted() {
    this.load()
    this.timer = setInterval(() => (this.now = Date.now()), 30000)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    fmtTime: (v) => fmtTime(v),
    durationLabel,
    displayStatus,
    locationLabel,
    initials,
    isLive,
    locIcon(m) {
      return m.location_type === 'external' ? 'fa-solid fa-link' : m.location_type === 'physical' ? 'fa-solid fa-location-dot' : 'fa-solid fa-video'
    },
    canJoin(m) {
      if (m.status === 'cancelled' || m.status === 'completed') return false
      const start = new Date(m.start_at).getTime()
      return start - 60 * 60000 <= this.now && new Date(m.end_at).getTime() >= this.now - 30 * 60000
    },
    setTab(t) {
      this.tab = t
      try {
        localStorage.setItem(TAB_KEY, t)
      } catch {
        /* ignore */
      }
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const { meetings, smtpConfigured } = await meetingsApi.list()
        this.meetings = meetings
        this.smtpConfigured = smtpConfigured
        this.loaded = true
        this.now = Date.now()
        const open = this.$route.query.open
        if (open && !this.selected) {
          const m = meetings.find((x) => x.id === open)
          if (m) this.selected = m
        }
      } catch (err) {
        this.error = apiErrorMessage(err, 'Could not load meetings.')
      } finally {
        this.loading = false
      }
    },
    select(m) {
      this.selected = m
    },
    closeDrawer() {
      this.selected = null
      if (this.$route.query.open) this.$router.replace({ query: {} })
    },
    join(m) {
      if (m.location_type === 'external' && m.join_url) window.open(m.join_url, '_blank', 'noopener')
      else this.$router.push(`/meetings/${m.id}`)
    },
    openSchedule(meeting = null) {
      this.editing = meeting && meeting.id ? meeting : null
      this.scheduleOpen = true
    },
    upsert(m) {
      const i = this.meetings.findIndex((x) => x.id === m.id)
      if (i >= 0) this.meetings.splice(i, 1, { ...this.meetings[i], ...m })
      else this.meetings.push(m)
    },
    onSaved({ meeting, invite, mode, changed, sendInvites }) {
      this.scheduleOpen = false
      this.upsert(meeting)
      if (mode === 'edit') {
        this.selected = { ...meeting }
        if (!changed) {
          toast.success('Meeting saved')
          return
        }
      } else {
        this.tab = isPast(meeting) ? 'past' : 'upcoming'
      }
      if (sendInvites && invite && (meeting.participants || []).length) {
        if (invite.emailed) toast.success(mode === 'edit' ? `Updated invite emailed to ${invite.sent} ${invite.sent === 1 ? 'person' : 'people'}` : `Invites emailed to ${invite.sent} ${invite.sent === 1 ? 'person' : 'people'}`)
        this.result = { meeting, invite, mode }
      } else {
        toast.success(mode === 'edit' ? 'Meeting updated' : 'Meeting scheduled')
        if (mode === 'create') this.selected = meeting
      }
      this.load()
    },
    onChanged(m) {
      this.upsert(m)
    },
    onDeleted(id) {
      this.meetings = this.meetings.filter((m) => m.id !== id)
      this.closeDrawer()
    },
    showResult(r) {
      this.result = r
      if (r.mode === 'cancel') {
        this.upsert(r.meeting)
        this.closeDrawer()
      }
    }
  }
}
</script>

<style scoped>
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.smtp-note {
  margin-bottom: 16px;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12px;
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
.tab-count {
  font-size: 11px;
  color: var(--text-3);
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
}
.search {
  width: 280px;
}
.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}
.agenda.is-loading {
  opacity: 0.6;
}
.day + .day {
  border-top: 1px solid var(--border);
}
.day__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
}
.day__date {
  display: flex;
  align-items: center;
  gap: 10px;
}
.day__num {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.day__label {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.day__label small {
  color: var(--text-3);
  font-size: 12px;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: grid;
  grid-template-columns: 92px 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.12s;
}
.row + .row {
  border-top: 1px solid var(--border);
}
.row:hover,
.row:focus-visible {
  background: var(--surface-hover);
  outline: none;
}
.row.is-live {
  border-left-color: var(--success);
}
.row.is-cancelled .title-text {
  text-decoration: line-through;
  color: var(--text-3);
}
.row__time {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.row__time small {
  color: var(--text-3);
  font-size: 12px;
}
.row__main {
  min-width: 0;
}
.row__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-2);
}
.row__meta i {
  color: var(--text-3);
  margin-right: 2px;
}
.avatars {
  display: inline-flex;
}
.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  border: 2px solid var(--surface);
  margin-left: -6px;
}
.avatar:first-child {
  margin-left: 0;
}
.avatar.more {
  background: var(--surface-2);
  color: var(--text-2);
}
.row__side {
  display: flex;
  align-items: center;
  gap: 8px;
}
@media (max-width: 640px) {
  .ui-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__meta {
    font-size: 12px;
  }
  .search {
    width: 100%;
  }
  .row {
    grid-template-columns: 72px 1fr;
    gap: 10px;
  }
  .row__side {
    grid-column: 2;
    justify-content: flex-start;
  }
  .hide-xs {
    display: none;
  }
  .ui-tabs {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
