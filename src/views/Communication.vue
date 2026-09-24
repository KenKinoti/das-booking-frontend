<template>
  <div class="mp ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Communication</div>
        <h1>Communication hub</h1>
        <p>Your conversations and calls at a glance.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/meetings" class="ui-btn"><i class="fa-solid fa-calendar-plus"></i> Schedule meeting</router-link>
        <router-link :to="{ path: '/messages', query: { new: '1' } }" class="ui-btn ui-btn--primary"><i class="fa-regular fa-pen-to-square"></i> New message</router-link>
      </div>
    </header>

    <div class="ui-kpis">
      <router-link to="/messages" class="ui-kpi kpi-btn link-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-envelope"></i></span>Unread messages</div>
        <div class="ui-kpi__value tnum" :class="{ accent: unread > 0 }">{{ loaded ? unread : '–' }}</div>
        <div class="ui-kpi__meta">{{ loaded ? `Across ${threads.length} conversation${threads.length === 1 ? '' : 's'}` : ' ' }}</div>
      </router-link>
      <router-link to="/meetings" class="ui-kpi kpi-btn link-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-calendar-day"></i></span>Meetings today</div>
        <div class="ui-kpi__value tnum">{{ loaded ? meetingsToday : '–' }}</div>
        <div class="ui-kpi__meta">{{ loaded ? `${upcoming.length} upcoming in total` : ' ' }}</div>
      </router-link>
      <router-link :to="next ? `/meetings?open=${next.id}` : '/meetings'" class="ui-kpi kpi-btn link-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-video"></i></span>Next call</div>
        <div class="ui-kpi__value next">{{ next ? relTime(next.start_at) : loaded ? 'None' : '–' }}</div>
        <div class="ui-kpi__meta ellipsis">{{ next ? next.title : 'Nothing scheduled' }}</div>
      </router-link>
      <router-link to="/messages" class="ui-kpi kpi-btn link-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-user-group"></i></span>People you talk to</div>
        <div class="ui-kpi__value tnum">{{ loaded ? contacts : '–' }}</div>
        <div class="ui-kpi__meta">In your conversations</div>
      </router-link>
    </div>

    <div class="grid">
      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Recent conversations</h2>
          <router-link to="/messages" class="ui-btn ui-btn--ghost ui-btn--sm">All messages <i class="fa-solid fa-arrow-right"></i></router-link>
        </div>
        <div v-if="!loaded" class="ui-card__body"><div v-for="n in 4" :key="n" class="sk-row"><div class="ui-skeleton" style="width: 40px; height: 40px"></div><div class="ui-skeleton" style="flex: 1"></div></div></div>
        <div v-else-if="threadsError" class="ui-card__body"><div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ threadsError }}</span></div></div>
        <div v-else-if="!threads.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-comments"></i></div>
          <h3>No conversations yet</h3>
          <p>Message a teammate to get started.</p>
          <router-link :to="{ path: '/messages', query: { new: '1' } }" class="ui-btn ui-btn--primary" style="margin-top: 12px"><i class="fa-regular fa-pen-to-square"></i> New message</router-link>
        </div>
        <ul v-else class="rows">
          <li v-for="t in threads.slice(0, 6)" :key="t.id">
            <router-link :to="{ path: '/messages', query: { thread: String(t.id) } }" class="crow">
              <span class="avatar" :class="{ group: t.isGroup }"><i v-if="t.isGroup" class="fa-solid fa-user-group"></i><template v-else>{{ initials(t.name) }}</template></span>
              <span class="crow__body">
                <span class="crow__title">{{ t.name }}</span>
                <span class="crow__sub">{{ t.last ? (t.last.sender_id === meId ? 'You: ' : '') + t.last.content : 'No messages yet' }}</span>
              </span>
              <span class="crow__side">
                <span class="muted small">{{ time(t.updatedAt) }}</span>
                <span v-if="t.unread" class="unread">{{ t.unread }}</span>
              </span>
            </router-link>
          </li>
        </ul>
      </section>

      <section class="ui-card">
        <div class="ui-card__head">
          <h2>Upcoming meetings</h2>
          <router-link to="/meetings" class="ui-btn ui-btn--ghost ui-btn--sm">All meetings <i class="fa-solid fa-arrow-right"></i></router-link>
        </div>
        <div v-if="!loaded" class="ui-card__body"><div v-for="n in 4" :key="n" class="sk-row"><div class="ui-skeleton" style="width: 48px; height: 44px"></div><div class="ui-skeleton" style="flex: 1"></div></div></div>
        <div v-else-if="meetingsError" class="ui-card__body"><div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ meetingsError }}</span></div></div>
        <div v-else-if="!upcoming.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-calendar"></i></div>
          <h3>Nothing scheduled</h3>
          <p>Schedule a call and invite teammates or customers.</p>
          <router-link to="/meetings" class="ui-btn ui-btn--primary" style="margin-top: 12px"><i class="fa-solid fa-calendar-plus"></i> Schedule meeting</router-link>
        </div>
        <ul v-else class="rows">
          <li v-for="m in upcoming.slice(0, 6)" :key="m.id">
            <router-link :to="`/meetings?open=${m.id}`" class="crow">
              <span class="date-chip"><strong>{{ day(m.start_at) }}</strong><small>{{ month(m.start_at) }}</small></span>
              <span class="crow__body">
                <span class="crow__title">{{ m.title }}</span>
                <span class="crow__sub">{{ clock(m.start_at) }} – {{ clock(m.end_at) }} · {{ (m.participants || []).length }} invited</span>
              </span>
              <span class="crow__side">
                <span v-if="m.status === 'in_progress'" class="ui-badge ui-badge--success">Live</span>
                <span v-else class="muted small">{{ relTime(m.start_at) }}</span>
              </span>
            </router-link>
          </li>
        </ul>
      </section>
    </div>

    <section class="tools">
      <router-link v-for="tool in tools" :key="tool.to" :to="tool.to" class="ui-card tool">
        <span class="tool__icon" :class="tool.tone"><i :class="tool.icon"></i></span>
        <span>
          <strong>{{ tool.label }}</strong>
          <small>{{ tool.hint }}</small>
        </span>
        <i class="fa-solid fa-chevron-right muted"></i>
      </router-link>
    </section>
  </div>
</template>

<script>
import '@/styles/module-page.css'
import { apiErrorMessage } from '@/services/api'
import { messagingService, normalizeThread, initials, formatMessageTime } from '@/services/messaging'
import { meetingsApi } from '@/services/meetings'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Communication',
  data() {
    return {
      threads: [],
      meetings: [],
      unread: 0,
      loaded: false,
      threadsError: '',
      meetingsError: '',
      tools: [
        { to: '/messages', label: 'Messages', hint: 'Team chat, one-to-one and groups', icon: 'fa-regular fa-message', tone: '' },
        { to: '/meetings', label: 'Meetings & calls', hint: 'Schedule calls with calendar invites and transcripts', icon: 'fa-solid fa-calendar-plus', tone: 'info' },
        { to: '/video-call', label: 'Video call room', hint: 'Start an instant call and share the room link', icon: 'fa-solid fa-video', tone: 'success' },
        { to: '/messaging-settings', label: 'Messaging settings', hint: 'Team chat options and WhatsApp Business', icon: 'fa-solid fa-gear', tone: 'warning' }
      ]
    }
  },
  computed: {
    meId() {
      return useAuthStore().user?.id || ''
    },
    upcoming() {
      return this.meetings.filter((m) => m.status !== 'cancelled').sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
    },
    meetingsToday() {
      const today = new Date().toDateString()
      return this.upcoming.filter((m) => new Date(m.start_at).toDateString() === today).length
    },
    next() {
      return this.upcoming[0] || null
    },
    contacts() {
      const ids = new Set()
      this.threads.forEach((t) => t.others.forEach((p) => ids.add(p.user_id)))
      return ids.size
    }
  },
  async created() {
    await Promise.all([this.loadThreads(), this.loadMeetings(), this.loadUnread()])
    this.loaded = true
  },
  methods: {
    initials,
    time: formatMessageTime,
    async loadThreads() {
      try {
        const list = await messagingService.getThreads()
        this.threads = (list || []).map((t) => normalizeThread(t, this.meId)).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      } catch (e) {
        this.threadsError = apiErrorMessage(e, 'Could not load conversations')
      }
    },
    async loadMeetings() {
      try {
        const { meetings } = await meetingsApi.list({ scope: 'upcoming' })
        this.meetings = meetings
      } catch (e) {
        this.meetingsError = apiErrorMessage(e, 'Could not load meetings')
      }
    },
    async loadUnread() {
      try {
        this.unread = await messagingService.getUnreadCount()
      } catch {
        this.unread = 0
      }
    },
    day: (d) => new Date(d).getDate(),
    month: (d) => new Date(d).toLocaleDateString([], { month: 'short' }),
    clock: (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    relTime(d) {
      const diff = new Date(d) - Date.now()
      const mins = Math.round(diff / 60000)
      if (mins <= 0) return 'Now'
      if (mins < 60) return `In ${mins} min`
      const hrs = Math.round(mins / 60)
      if (hrs < 24) return `In ${hrs} h`
      const days = Math.round(hrs / 24)
      return days === 1 ? 'Tomorrow' : `In ${days} days`
    }
  }
}
</script>

<style scoped>
.link-kpi {
  text-decoration: none;
  display: block;
}

.ui-kpi__value.accent {
  color: var(--accent);
}

.ui-kpi__value.next {
  font-size: 22px;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 6px;
}

.crow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--text);
}

.crow:hover {
  background: var(--surface-hover);
}

.avatar.group {
  background: var(--info-soft);
  color: var(--info);
}

.crow__body {
  flex: 1;
  min-width: 0;
}

.crow__title {
  display: block;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crow__sub {
  display: block;
  font-size: 13px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crow__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.unread {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.date-chip {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  flex-shrink: 0;
}

.date-chip strong {
  font-size: 17px;
}

.date-chip small {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
}

.tools {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.tool {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  text-decoration: none;
  color: var(--text);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.tool:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.tool > span:nth-child(2) {
  flex: 1;
  min-width: 0;
}

.tool small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}

.tool__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 17px;
  flex-shrink: 0;
}

.tool__icon.info { background: var(--info-soft); color: var(--info); }
.tool__icon.success { background: var(--success-soft); color: var(--success); }
.tool__icon.warning { background: var(--warning-soft); color: var(--warning); }

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
