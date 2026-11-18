<template>
  <div class="ui-page ui-page--wide mb-page" data-testid="brief-page">
    <header class="ui-page-head">
      <div class="head-text">
        <div class="ui-eyebrow">Morning brief<template v-if="b"> · {{ b.date_label }}</template></div>
        <h1 data-testid="brief-greeting">{{ b ? b.greeting : 'Your morning brief' }}</h1>
        <p v-if="b && b.organization">{{ b.organization }} · {{ live ? 'live figures' : 'as it was sent' }}<template v-if="b.timezone"> · {{ b.timezone }}</template></p>
      </div>
      <div class="ui-actions head-actions">
        <router-link v-if="!isToday" to="/brief" class="ui-btn" data-testid="brief-today-link"><i class="fa-solid fa-sun"></i> Today</router-link>
        <button v-else class="ui-btn ui-btn--icon" type="button" title="Refresh (syncs Jira)" aria-label="Refresh" :disabled="loading" @click="load(true)">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading && !!b }"></i>
        </button>
        <router-link :to="{ path: '/profile', hash: '#morning-brief' }" class="ui-btn" data-testid="brief-settings-link"><i class="fa-solid fa-sliders"></i> <span class="hide-sm">Settings</span></router-link>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger mb-gap" data-testid="brief-error">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load(false)">Try again</a></span>
    </div>

    <div class="layout">
      <main class="main">
        <!-- Not on yet: one click -->
        <div v-if="showEnable" class="ui-card enable" data-testid="brief-enable">
          <div class="enable__icon"><i class="fa-solid fa-mug-hot"></i></div>
          <div class="enable__text">
            <strong>Get this every morning</strong>
            <span>By email (and WhatsApp when it's set up) at 08:00 in your time zone.</span>
          </div>
          <button class="ui-btn ui-btn--primary" type="button" :disabled="enabling" data-testid="brief-enable-btn" @click="enable">
            <i :class="enabling ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-bell'"></i> Turn it on
          </button>
        </div>

        <!-- Delivery -->
        <div v-if="delivery" class="delivery" data-testid="brief-delivery">
          <span class="ui-badge" :class="`ui-badge--${statusOf(delivery.status).tone}`" data-testid="brief-delivery-status">{{ statusOf(delivery.status).label }}</span>
          <template v-if="delivery.status === 'missed'">
            <span class="muted">The server was down at {{ timeOf(delivery.scheduled_for) }} for more than 3 hours, so this brief wasn't sent.</span>
          </template>
          <template v-else>
            <span v-if="delivery.email_status" class="chan" data-testid="brief-delivery-email">
              <i class="fa-regular fa-envelope"></i> Email <b :class="`t-${chanOf(delivery.email_status).tone}`">{{ chanOf(delivery.email_status).label }}</b>
            </span>
            <span v-if="delivery.whatsapp_status" class="chan" data-testid="brief-delivery-whatsapp">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp <b :class="`t-${chanOf(delivery.whatsapp_status).tone}`">{{ chanOf(delivery.whatsapp_status).label }}</b>
            </span>
            <span class="muted small">{{ delivery.kind === 'test' ? 'Test sent' : 'Sent' }} {{ timeOf(delivery.email_at || delivery.whatsapp_at || delivery.created_at) }}<template v-if="delivery.late"> (late — the server was catching up)</template></span>
          </template>
          <div v-if="delivery.email_error || delivery.whatsapp_error" class="delivery__errors">
            <div v-if="delivery.email_error"><i class="fa-regular fa-envelope"></i> {{ delivery.email_error }}</div>
            <div v-if="delivery.whatsapp_error"><i class="fa-brands fa-whatsapp"></i> {{ delivery.whatsapp_error }}</div>
          </div>
        </div>
        <div v-else-if="b && live && isToday && enabled" class="delivery muted small" data-testid="brief-not-sent-yet">
          <i class="fa-regular fa-clock"></i> Today's brief hasn't been sent yet — these are the figures right now.
        </div>

        <!-- Headline -->
        <section v-if="b" class="headline" data-testid="brief-headline">
          <i class="fa-solid fa-quote-left"></i>
          <p>{{ b.headline }}</p>
        </section>
        <div v-else-if="loading" class="ui-skeleton" style="height: 74px; border-radius: 16px; margin-bottom: 18px"></div>

        <!-- A past day without a brief (not on yet, or before it was set up), or a future day -->
        <div v-if="missing && !loading" class="ui-card" data-testid="brief-missing">
          <div class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-regular fa-calendar-xmark"></i></div>
            <h3>{{ missing.future ? 'Not written yet' : 'No brief that day' }}</h3>
            <p>{{ missing.text }}</p>
            <router-link to="/brief" class="ui-btn ui-btn--primary" data-testid="brief-missing-today"><i class="fa-solid fa-sun"></i> Today's brief</router-link>
          </div>
        </div>

        <div v-else-if="loading && !b" class="sections">
          <section v-for="n in 4" :key="n" class="ui-card"><div class="ui-card__body"><div class="ui-skeleton" style="height: 160px"></div></div></section>
        </div>

        <div v-else-if="b && !b.sections.length" class="ui-card">
          <div class="ui-empty">
            <div class="ui-empty__icon ok"><i class="fa-solid fa-check"></i></div>
            <h3>All clear</h3>
            <p>Nothing needs your attention right now.</p>
          </div>
        </div>

        <div v-else-if="b" class="sections">
          <section v-for="s in b.sections" :key="s.key" class="ui-card sec" :data-testid="`brief-section-${s.key}`">
            <div class="sec__head">
              <span class="sec__icon"><i :class="s.icon || 'fa-solid fa-circle'"></i></span>
              <div class="sec__title">
                <h2>
                  <router-link v-if="s.link" :to="s.link">{{ s.title }}</router-link>
                  <template v-else>{{ s.title }}</template>
                </h2>
                <p v-if="s.summary">{{ s.summary }}</p>
              </div>
            </div>
            <div v-for="(n, i) in s.notes || []" :key="`n${i}`" class="ui-alert ui-alert--warning note" data-testid="brief-note"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ n }}</span></div>
            <div v-for="g in s.groups" :key="g.key" class="grp">
              <h3>{{ g.title }}</h3>
              <ul>
                <li v-for="(it, i) in g.items" :key="it.key || i" :class="it.tone ? `tone-${it.tone}` : ''">
                  <div class="it__main">
                    <div class="it__title">
                      <router-link v-if="it.link" :to="it.link">{{ it.title }}</router-link>
                      <span v-else>{{ it.title }}</span>
                      <span v-if="it.tag" class="tag" :class="it.tone ? `tag--${it.tone}` : ''">{{ it.tag }}</span>
                    </div>
                    <div v-if="it.detail || it.external" class="it__detail">
                      {{ it.detail }}
                      <a v-if="it.external" :href="it.external" target="_blank" rel="noopener noreferrer" class="ext">{{ externalLabel(it.external) }} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                    </div>
                    <div v-if="it.progress != null" class="bar" role="progressbar" :aria-valuenow="it.progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`${it.title} ${it.progress}% done`">
                      <span :style="{ width: `${it.progress}%` }"></span>
                    </div>
                  </div>
                  <div v-if="it.value" class="it__value">{{ it.value }}</div>
                </li>
              </ul>
              <router-link v-if="g.more" :to="g.link || s.link || '/brief'" class="more">and {{ g.more }} more <i class="fa-solid fa-arrow-right"></i></router-link>
            </div>
          </section>
        </div>
      </main>

      <!-- History -->
      <aside class="ui-card side" data-testid="brief-history">
        <div class="ui-card__head"><h2><i class="fa-solid fa-clock-rotate-left"></i>&nbsp; Last 30 days</h2></div>
        <div class="ui-card__body side__body">
          <div v-if="historyLoading" class="sk"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 36px"></div></div>
          <p v-else-if="!days.length" class="muted small">Your sent briefs appear here.</p>
          <ul v-else class="hist">
            <li v-for="h in days" :key="h.key">
              <router-link :to="`/brief/${h.date}`" :class="{ active: h.date === shownDate }" :data-testid="`brief-history-${h.date}`">
                <span class="dot" :class="`dot--${statusOf(h.status).tone}`"></span>
                <span class="hist__date">{{ dayLabel(h.date) }}<small v-if="h.kind === 'test'"> · test</small></span>
                <span class="hist__chans">
                  <i v-if="h.email_status" class="fa-regular fa-envelope" :class="`t-${chanOf(h.email_status).tone}`" :title="`Email: ${chanOf(h.email_status).label}`"></i>
                  <i v-if="h.whatsapp_status" class="fa-brands fa-whatsapp" :class="`t-${chanOf(h.whatsapp_status).tone}`" :title="`WhatsApp: ${chanOf(h.whatsapp_status).label}`"></i>
                </span>
                <span class="hist__head">{{ h.status === 'missed' ? 'Missed' : h.headline }}</span>
              </router-link>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import { briefApi, BRIEF_STATUS, CHANNEL_STATUS, dayLabel } from '@/services/brief'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'MorningBrief',
  props: { date: { type: String, default: '' } },
  data() {
    return { b: null, delivery: null, live: true, enabled: true, loading: true, error: '', missing: null, history: [], historyLoading: true, enabling: false }
  },
  computed: {
    isToday() {
      return !this.date || (this.b && this.live && this.b.date === this.date && !this.delivery)
    },
    shownDate() {
      return this.b ? this.b.date : this.date
    },
    showEnable() {
      return !this.loading && !this.enabled && !this.date
    },
    days() {
      // One row per day: the scheduled brief, else the day's test.
      const by = new Map()
      for (const h of this.history) {
        const cur = by.get(h.date)
        if (!cur || (cur.kind === 'test' && h.kind === 'scheduled')) by.set(h.date, h)
      }
      return [...by.values()].map((h) => ({ ...h, key: `${h.date}-${h.kind}` }))
    }
  },
  watch: {
    date() {
      this.load(false)
    }
  },
  created() {
    this.load(false)
    this.loadHistory()
  },
  methods: {
    dayLabel,
    statusOf(s) {
      return BRIEF_STATUS[s] || { label: s || '—', tone: 'draft' }
    },
    chanOf(s) {
      return CHANNEL_STATUS[s] || { label: s || '—', tone: 'draft' }
    },
    timeOf(iso) {
      if (!iso) return ''
      const tz = this.b?.timezone || undefined
      try {
        return 'at ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })
      } catch {
        return ''
      }
    },
    externalLabel(u) {
      return /atlassian|\/browse\//.test(u) ? 'Jira' : 'Open'
    },
    async load(refresh) {
      this.loading = true
      this.error = ''
      this.missing = null
      try {
        const d = this.date ? await briefApi.day(this.date) : await briefApi.today(refresh)
        this.b = d.brief
        this.delivery = d.delivery || null
        this.live = !!d.live
        if (!this.date) this.enabled = d.enabled !== false
        if (!this.b && this.delivery) this.b = null
      } catch (e) {
        this.b = null
        this.delivery = null
        // No brief for that day is a normal answer, not an error (pkg/brief handler.go: 404 NO_BRIEF / NOT_YET).
        const code = e?.response?.status === 404 ? e.response.data?.error?.code : ''
        if (this.date && (code === 'NO_BRIEF' || code === 'NOT_YET')) {
          const day = dayLabel(this.date, true)
          this.missing = code === 'NOT_YET' ? { future: true, text: `${day} hasn't come yet — each brief is written on its morning.` } : { future: false, text: `No brief was written for ${day}.` }
        } else this.error = apiErrorMessage(e, 'Could not load the brief')
      } finally {
        this.loading = false
      }
    },
    async loadHistory() {
      this.historyLoading = true
      try {
        this.history = (await briefApi.history(30)).items || []
      } catch {
        this.history = []
      } finally {
        this.historyLoading = false
      }
    },
    async enable() {
      this.enabling = true
      try {
        const s = await briefApi.quickOn()
        this.enabled = true
        toast.success(s.next_send_at ? `Your morning brief is on — next one ${new Date(s.next_send_at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: s.timezone })}` : 'Your morning brief is on')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not turn it on'))
      } finally {
        this.enabling = false
      }
    }
  }
}
</script>

<style scoped>
.mb-page {
  --mb-gap: 18px;
}

.head-text {
  min-width: 0;
}

.mb-gap {
  margin-bottom: var(--mb-gap);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: var(--mb-gap);
  align-items: start;
}

.main {
  min-width: 0;
}

.enable {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  margin-bottom: var(--mb-gap);
  border-color: var(--accent-ring);
  background: var(--accent-soft);
}

.enable__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--accent);
  flex-shrink: 0;
}

.enable__text {
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.enable__text span {
  color: var(--text-2);
  font-size: 13px;
}

.delivery {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin-bottom: 12px;
  font-size: 13px;
}

.delivery__errors {
  flex-basis: 100%;
  display: grid;
  gap: 4px;
  color: var(--danger);
}

.chan {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-2);
}

.t-success {
  color: var(--success);
}

.t-danger {
  color: var(--danger);
}

.t-warning {
  color: var(--warning);
}

.t-info {
  color: var(--info);
}

.muted {
  color: var(--text-3);
}

.small {
  font-size: 13px;
}

.headline {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  margin-bottom: var(--mb-gap);
  box-shadow: var(--shadow-xs);
}

.headline i {
  color: var(--accent);
  margin-top: 4px;
}

.headline p {
  margin: 0;
  font-size: 18px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--text);
  overflow-wrap: anywhere;
}

.sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--mb-gap);
}

.sec {
  padding: 18px 20px;
  min-width: 0;
}

.sec:only-child {
  grid-column: 1 / -1;
}

.sec__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.sec__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.sec__title {
  min-width: 0;
}

.sec__title h2 {
  font-size: 16px;
  margin: 0;
}

.sec__title h2 a {
  color: inherit;
  text-decoration: none;
}

.sec__title h2 a:hover {
  color: var(--accent);
}

.sec__title p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.note {
  margin: 8px 0;
  font-size: 13px;
}

.grp h3 {
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  margin: 14px 0 4px;
}

.grp ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.grp li {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
}

.grp li:last-child {
  border-bottom: 0;
}

.it__main {
  min-width: 0;
  flex: 1;
}

.it__title {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.it__title a {
  color: var(--text);
  text-decoration: none;
}

.it__title a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.it__detail {
  font-size: 13px;
  color: var(--text-3);
  margin-top: 2px;
  overflow-wrap: anywhere;
}

.ext {
  white-space: nowrap;
  margin-left: 4px;
  font-size: 12px;
}

.it__value {
  font-weight: 650;
  font-size: 14px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.tone-danger .it__value {
  color: var(--danger);
}

.tag {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--neutral-soft);
  color: var(--text-2);
  white-space: nowrap;
  vertical-align: 1px;
}

.tag--danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.tag--warn {
  background: var(--warning-soft);
  color: var(--warning);
}

.tag--ok {
  background: var(--success-soft);
  color: var(--success);
}

.bar {
  height: 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  margin-top: 6px;
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.more {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  margin-top: 6px;
}

.side {
  position: sticky;
  top: calc(var(--topbar-h) + 12px);
}

.side__body {
  padding-top: 4px;
}

.sk {
  display: grid;
  gap: 8px;
}

.hist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.hist a {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  grid-template-areas: 'dot date chans' 'dot head head';
  column-gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--text);
  text-decoration: none;
  font-size: 13px;
}

.hist a:hover,
.hist a.active {
  background: var(--surface-hover);
}

.hist a.active {
  box-shadow: inset 3px 0 0 var(--accent);
}

.dot {
  grid-area: dot;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  background: var(--text-3);
}

.dot--success {
  background: var(--success);
}

.dot--warning {
  background: var(--warning);
}

.dot--danger {
  background: var(--danger);
}

.hist__date {
  grid-area: date;
  font-weight: 600;
}

.hist__date small {
  color: var(--text-3);
  font-weight: 400;
}

.hist__chans {
  grid-area: chans;
  display: inline-flex;
  gap: 6px;
}

.hist__head {
  grid-area: head;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1100px) {
  .sections {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .side {
    position: static;
  }
}

@media (max-width: 560px) {
  .hide-sm {
    display: none;
  }

  .headline p {
    font-size: 16px;
  }

  .sec {
    padding: 16px;
  }

  .enable {
    flex-wrap: wrap;
  }

  .enable .ui-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
