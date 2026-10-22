<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Announcements</h1>
        <p>Message everyone who uses DASYIN — updates, reminders, offers and urgent notices, in the app and by email when unread.</p>
      </div>
      <div class="ui-actions">
        <OverflowMenu
          label="More actions"
          :items="[
            { label: 'Run due now', icon: 'fa-solid fa-play', onClick: runDue },
            { label: 'Reminder settings', icon: 'fa-solid fa-sliders', onClick: openSettings }
          ]"
        />
        <router-link to="/super-admin/announcements/new" class="ui-btn ui-btn--primary"><i class="fa-solid fa-plus"></i> New announcement</router-link>
      </div>
    </header>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-regular fa-calendar-check"></i></span>Scheduled</div>
        <div class="ui-kpi__value">{{ counts.scheduled ?? '—' }}</div>
        <div class="ui-kpi__meta">{{ counts.draft || 0 }} draft{{ counts.draft === 1 ? '' : 's' }} waiting</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-inbox"></i></span>Delivered</div>
        <div class="ui-kpi__value">{{ num(last30.delivered) }}</div>
        <div class="ui-kpi__meta">In the app, last 30 days</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-regular fa-envelope-open"></i></span>Read</div>
        <div class="ui-kpi__value">{{ last30.delivered ? last30.read_pct + '%' : '—' }}</div>
        <div class="ui-kpi__meta">{{ num(last30.read) }} read · {{ num(last30.clicked) }} clicked</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-regular fa-envelope"></i></span>Emailed</div>
        <div class="ui-kpi__value">{{ num(last30.emailed) }}</div>
        <div class="ui-kpi__meta">Unread in time, so emailed</div>
      </div>
    </div>

    <div class="layout">
      <section class="ui-card list-card">
        <div class="toolbar">
          <div class="ui-tabs" role="tablist">
            <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">
              {{ t.label }}<span v-if="counts[t.value]" class="tab-count">{{ counts[t.value] }}</span>
            </button>
          </div>
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search announcements…" @input="searchSoon" />
          </div>
        </div>

        <div v-if="error" class="ui-card__body">
          <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
        </div>
        <div v-else-if="loading && !rows.length" class="ui-card__body">
          <div v-for="n in 5" :key="n" class="sk-row"><span class="ui-skeleton" style="flex: 1"></span><span class="ui-skeleton" style="width: 90px"></span><span class="ui-skeleton" style="width: 70px"></span></div>
        </div>
        <div v-else-if="!rows.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-bullhorn"></i></div>
          <h3>{{ q || status !== 'all' ? 'Nothing matches' : 'No announcements yet' }}</h3>
          <p>{{ q || status !== 'all' ? 'Try another search or tab.' : 'Share an update, a reminder or an offer with everyone — or plan one for a date coming up.' }}</p>
          <router-link v-if="!q && status === 'all'" to="/super-admin/announcements/new" class="ui-btn ui-btn--primary" style="margin-top: 12px"><i class="fa-solid fa-plus"></i> New announcement</router-link>
        </div>
        <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
          <table class="ui-table" v-table-cards>
            <thead>
              <tr>
                <th>Announcement</th>
                <th>Status</th>
                <th class="num">Recipients</th>
                <th class="num">Read</th>
                <th class="num hide-md">Clicked</th>
                <th class="num hide-md">Emailed</th>
                <th style="width: 44px" data-label=""></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.announcement.id" class="is-clickable" @click="open(r.announcement)">
                <td data-label="Announcement">
                  <div class="title-cell">
                    <span class="kind-ico" :class="`is-${tone(r.announcement)}`"><i :class="kindOf(r.announcement).icon"></i></span>
                    <span class="title-cell__text">
                      <strong>{{ r.announcement.title }}</strong>
                      <small>
                        {{ kindOf(r.announcement).label }}<template v-if="r.announcement.priority === 'urgent' && r.announcement.kind !== 'urgent'"> · urgent</template> · {{ audience(r.announcement.audience) }}
                        <template v-if="r.announcement.occasion_name"> · <i class="fa-regular fa-calendar"></i> {{ r.announcement.occasion_name }}</template>
                        <span v-if="r.announcement.ai_draft" class="ai-mini">AI draft</span>
                      </small>
                    </span>
                  </div>
                </td>
                <td data-label="Status">
                  <span class="ui-badge" :class="`ui-badge--${statusOf(r.announcement).badge}`">{{ statusOf(r.announcement).label }}</span>
                  <div class="sub">{{ when(r.announcement) }}</div>
                </td>
                <td class="num" data-label="Recipients">{{ r.stats.recipients ? num(r.stats.recipients) : '—' }}</td>
                <td class="num" data-label="Read">{{ r.stats.delivered ? r.stats.read_pct + '%' : '—' }}<div v-if="r.stats.delivered" class="sub">{{ num(r.stats.read) }}</div></td>
                <td class="num hide-md" data-label="Clicked">{{ r.stats.delivered ? num(r.stats.clicked) : '—' }}</td>
                <td class="num hide-md" data-label="Emailed">
                  {{ r.stats.delivered ? num(r.stats.emailed) : '—' }}
                  <div v-if="r.stats.email_failed" class="sub txt-danger">{{ r.stats.email_failed }} failed</div>
                </td>
                <td data-label="" @click.stop>
                  <OverflowMenu label="Actions" :items="rowActions(r.announcement)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="total > limit" class="pager">
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="go(page - 1)"><i class="fa-solid fa-chevron-left"></i></button>
          <span>Page {{ page }} of {{ Math.ceil(total / limit) }}</span>
          <button class="ui-btn ui-btn--sm" :disabled="page * limit >= total" @click="go(page + 1)"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </section>

      <aside class="ui-card upcoming" aria-labelledby="upcoming-title">
        <div class="ui-card__head">
          <h2 id="upcoming-title"><i class="fa-regular fa-calendar"></i> Coming up</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" type="button" @click="loadOccasions"><i class="fa-solid fa-rotate"></i><span class="sr-only">Refresh</span></button>
        </div>
        <div class="ui-card__body upcoming__body">
          <p class="ui-hint upcoming__hint">Important dates in the next {{ occDays }} days. You're nudged {{ leadText }} before each one.</p>
          <div v-if="occLoading && !occasions.length" class="sk-col"><span v-for="n in 3" :key="n" class="ui-skeleton"></span></div>
          <div v-else-if="occError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ occError }}</span></div>
          <div v-else-if="!occasions.length" class="ui-empty compact">
            <div class="ui-empty__icon"><i class="fa-regular fa-calendar"></i></div>
            <h3>Nothing important coming up</h3>
            <p>Holidays, observances and shopping seasons show here three weeks ahead.</p>
          </div>
          <ul v-else class="occ-list">
            <li v-for="o in occasions" :key="o.key + o.date_text" class="occ" :class="{ 'is-skipped': o.skipped, 'is-focus': focusKey === o.key + o.date_text }" :id="`occ-${o.key}`">
              <div class="occ__date">
                <span>{{ monthOf(o.date_text) }}</span><strong>{{ dayOf(o.date_text) }}</strong>
              </div>
              <div class="occ__main">
                <strong class="occ__name">{{ o.name }}</strong>
                <small class="occ__meta">{{ kindLabel(o.kind) }}<template v-if="o.countries && o.countries.length"> · {{ o.countries.join(', ') }}</template> · {{ inDays(o.days_until) }}</small>
                <small v-if="o.planned" class="occ__state" :class="`is-${o.planned.status}`">
                  <i :class="o.planned.status === 'scheduled' ? 'fa-regular fa-calendar-check' : o.planned.status === 'sent' ? 'fa-solid fa-check' : 'fa-regular fa-pen-to-square'"></i>
                  {{ plannedText(o.planned) }}
                </small>
                <small v-else-if="o.skipped" class="occ__state is-skipped"><i class="fa-solid fa-forward"></i> Skipped this year</small>
                <small v-else-if="o.note" class="occ__state is-note"><i class="fa-solid fa-circle-info"></i> {{ o.note }}</small>
                <div class="occ__actions">
                  <button v-if="o.planned" type="button" class="ui-btn ui-btn--sm" @click="open(o.planned)">Open</button>
                  <button v-else-if="!o.skipped" type="button" class="ui-btn ui-btn--sm ui-btn--primary" :data-test="`plan-${o.key}`" @click="openPlan(o)"><i class="fa-solid fa-pen-nib"></i> Plan message</button>
                  <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="skip(o, !o.skipped)">{{ o.skipped ? "Don't skip" : 'Skip this year' }}</button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Plan a message for an occasion -->
    <div v-if="plan.open" class="ui-modal-backdrop" @mousedown.self="plan.open = false">
      <div class="ui-modal" style="max-width: 720px" role="dialog" aria-modal="true" aria-labelledby="plan-title">
        <div class="ui-modal__head">
          <h2 id="plan-title">{{ plan.o.name }} · {{ longDate(plan.o.date_text) }}</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" type="button" aria-label="Close" @click="plan.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body plan-body">
          <p class="plan-lead">{{ inDays(plan.o.days_until, true) }}. Here's a ready draft — schedule it as it is, change it first, or have AI write one.</p>
          <AnnouncementCard :item="planItem" hide-actions />
          <dl class="plan-facts">
            <div><dt>Goes to</dt><dd>{{ audience(plan.o.draft.audience) }}</dd></div>
            <div><dt>Sends</dt><dd>{{ planWhen }}</dd></div>
            <div><dt>Kind</dt><dd>{{ kindLabelOf(plan.o.draft.kind) }}{{ plan.o.draft.cta_label ? ' · button “' + plan.o.draft.cta_label + '”' : '' }}</dd></div>
          </dl>
          <p v-if="plan.o.note" class="ui-hint"><i class="fa-solid fa-circle-info"></i> {{ plan.o.note }}</p>
        </div>
        <div class="ui-modal__foot plan-foot">
          <button type="button" class="ui-btn ui-btn--ghost" :disabled="plan.busy" @click="skip(plan.o, true, true)">Skip this year</button>
          <span class="grow"></span>
          <button v-if="aiEnabled" type="button" class="ui-btn" :disabled="plan.busy" @click="planDraft(true)"><i class="fa-solid fa-wand-magic-sparkles"></i> Write with AI</button>
          <button type="button" class="ui-btn" :disabled="plan.busy" @click="planDraft(false)"><i class="fa-regular fa-pen-to-square"></i> Edit draft</button>
          <button type="button" class="ui-btn ui-btn--primary" :disabled="plan.busy" data-test="plan-schedule" @click="planSchedule">
            <i :class="plan.busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-calendar-check'"></i> Schedule for {{ shortWhen }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reminder settings -->
    <div v-if="settings.open" class="ui-modal-backdrop" @mousedown.self="settings.open = false">
      <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="set-title">
        <div class="ui-modal__head">
          <h2 id="set-title">Reminder settings</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" type="button" aria-label="Close" @click="settings.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body form-stack">
          <label class="ui-switch"><input v-model="settings.form.nudges_on" type="checkbox" /> Nudge super admins before important dates</label>
          <div class="ui-field">
            <label class="ui-label" for="set-leads">Days before</label>
            <input id="set-leads" v-model="settings.leads" class="ui-input" placeholder="14, 3" :disabled="!settings.form.nudges_on" />
            <span class="ui-hint">Comma-separated, e.g. “14, 3” — one nudge at each.</span>
          </div>
          <label class="ui-switch"><input v-model="settings.form.nudge_email" type="checkbox" :disabled="!settings.form.nudges_on" /> Email the nudges too (not only in the app)</label>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label class="ui-label" for="set-hour">“Schedule for the day” sends at</label>
              <select id="set-hour" v-model.number="settings.form.send_hour" class="ui-select">
                <option v-for="h in 24" :key="h" :value="h - 1">{{ String(h - 1).padStart(2, '0') }}:00</option>
              </select>
            </div>
            <div class="ui-field">
              <label class="ui-label" for="set-tz">Team time zone</label>
              <select id="set-tz" v-model="settings.form.timezone" class="ui-select">
                <option v-for="z in zones" :key="z" :value="z">{{ z.replace('_', ' ') }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="settings.open = false">Cancel</button>
          <button type="button" class="ui-btn ui-btn--primary" :disabled="settings.busy" @click="saveSettings">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AnnouncementCard from '@/components/announcements/AnnouncementCard.vue'
import { announcementsAPI, KINDS, STATUS, zoned, localToDate, audienceSummary } from '@/services/announcements'
import { apiErrorMessage } from '@/services/api'
import { ensurePlatformSession } from '@/services/platform'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const OCC_KINDS = { public_holiday: 'Public holiday', observance: 'Observance', commercial: 'Shopping season', custom: 'Custom' }

export default {
  name: 'Announcements',
  components: { AnnouncementCard },
  data() {
    return {
      rows: [],
      total: 0,
      page: 1,
      limit: 25,
      counts: {},
      last30: {},
      status: 'all',
      q: '',
      loading: true,
      error: '',
      meta: null,
      occasions: [],
      occLoading: true,
      occError: '',
      occSettings: null,
      aiEnabled: false,
      focusKey: '',
      plan: { open: false, o: null, busy: false },
      settings: { open: false, form: {}, leads: '', busy: false },
      tabs: [
        { value: 'all', label: 'All' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'draft', label: 'Drafts' },
        { value: 'sent', label: 'Sent' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  },
  computed: {
    occDays() {
      const leads = this.occSettings?.nudge_lead_days || [14, 3]
      return Math.max(21, leads[0] || 0)
    },
    leadText() {
      const leads = this.occSettings?.nudge_lead_days || [14, 3]
      if (this.occSettings && !this.occSettings.nudges_on) return 'not (nudges are off)'
      return leads.join(' and ') + ' days'
    },
    zones() {
      return this.meta?.timezones || ['Africa/Nairobi', 'Australia/Sydney', 'UTC']
    },
    planItem() {
      const d = this.plan.o?.draft || {}
      return { title: d.title, body: d.body, kind: d.kind, priority: d.priority, cta_label: d.cta_label, cta_url: d.cta_url }
    },
    planWhen() {
      const d = this.plan.o?.draft
      if (!d) return ''
      return zoned(localToDate(d.local_send_at, d.timezone), d.timezone)
    },
    shortWhen() {
      const d = this.plan.o?.draft
      if (!d) return ''
      const t = localToDate(d.local_send_at, d.timezone)
      try {
        return t.toLocaleString(undefined, { timeZone: d.timezone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      } catch {
        return d.local_send_at.replace('T', ' ')
      }
    }
  },
  watch: {
    '$route.query.occasion'() {
      this.focusFromQuery()
    }
  },
  created() {
    if (ensurePlatformSession()) {
      window.location.reload()
      return
    }
    let t = null
    this.searchSoon = () => {
      clearTimeout(t)
      t = setTimeout(() => {
        this.page = 1
        this.load()
      }, 300)
    }
    this.load()
    this.loadOccasions()
    announcementsAPI
      .meta()
      .then((m) => (this.meta = m))
      .catch(() => {})
  },
  methods: {
    num(n) {
      return n == null ? '—' : Number(n).toLocaleString()
    },
    kindOf(a) {
      return KINDS[a.kind] || KINDS.update
    },
    kindLabelOf(k) {
      return (KINDS[k] || KINDS.update).label
    },
    tone(a) {
      return a.kind === 'urgent' || a.priority === 'urgent' ? 'danger' : this.kindOf(a).tone
    },
    statusOf(a) {
      return STATUS[a.status] || STATUS.draft
    },
    audience(a) {
      return audienceSummary(a, this.meta)
    },
    when(a) {
      if (a.status === 'scheduled' && a.next_send_at) return (a.recurrence !== 'none' ? 'Next ' : '') + zoned(a.next_send_at, a.timezone)
      if (a.status === 'sent' && a.last_sent_at) return zoned(a.last_sent_at, a.timezone, { zone: false })
      if (a.status === 'cancelled' && a.cancelled_at) return 'Cancelled ' + zoned(a.cancelled_at, a.timezone, { zone: false })
      if (a.status === 'draft' && a.local_send_at) return 'For ' + zoned(a.send_at, a.timezone)
      return ''
    },
    kindLabel(k) {
      return OCC_KINDS[k] || 'Occasion'
    },
    inDays(n, sentence = false) {
      if (n === 0) return sentence ? 'It is today' : 'today'
      if (n === 1) return sentence ? 'It is tomorrow' : 'tomorrow'
      return sentence ? `It is in ${n} days` : `in ${n} days`
    },
    monthOf(d) {
      return new Date(d + 'T12:00:00Z').toLocaleString(undefined, { month: 'short', timeZone: 'UTC' })
    },
    dayOf(d) {
      return Number(d.slice(8, 10))
    },
    longDate(d) {
      return new Date(d + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    },
    plannedText(p) {
      if (p.status === 'scheduled') return `Scheduled · ${zoned(p.next_send_at, p.timezone, { zone: false })}`
      if (p.status === 'sent') return 'Sent'
      if (p.status === 'sending') return 'Sending now'
      return 'Draft — not scheduled yet'
    },
    setStatus(s) {
      this.status = s
      this.page = 1
      this.load()
    },
    go(p) {
      this.page = p
      this.load()
    },
    async load() {
      this.loading = true
      try {
        const d = await announcementsAPI.list({ status: this.status, q: this.q || undefined, page: this.page, limit: this.limit })
        this.rows = d.items || []
        this.total = d.total || 0
        this.counts = d.counts || {}
        this.last30 = d.last_30_days || {}
        this.error = ''
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load announcements')
      } finally {
        this.loading = false
      }
    },
    async loadOccasions() {
      this.occLoading = true
      try {
        const d = await announcementsAPI.occasions()
        this.occasions = d.occasions || []
        this.occSettings = d.settings
        this.aiEnabled = !!d.ai_enabled
        this.occError = ''
        this.$nextTick(this.focusFromQuery)
      } catch (e) {
        this.occError = apiErrorMessage(e, 'Could not load the calendar')
      } finally {
        this.occLoading = false
      }
    },
    focusFromQuery() {
      const key = this.$route.query.occasion
      if (!key) return
      const date = this.$route.query.date
      const o = this.occasions.find((x) => x.key === key && (!date || x.date_text === date))
      if (!o) return
      this.focusKey = o.key + o.date_text
      document.getElementById(`occ-${o.key}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (!o.planned && !o.skipped) this.openPlan(o)
    },
    open(a) {
      this.$router.push(a.status === 'draft' ? `/super-admin/announcements/${a.id}/edit` : `/super-admin/announcements/${a.id}`)
    },
    rowActions(a) {
      const editable = a.status === 'draft' || (a.status === 'scheduled' && !a.occurrences)
      return [
        { label: 'Open', icon: 'fa-regular fa-eye', onClick: () => this.$router.push(`/super-admin/announcements/${a.id}`) },
        { label: 'Edit', icon: 'fa-regular fa-pen-to-square', hidden: !editable, onClick: () => this.$router.push(`/super-admin/announcements/${a.id}/edit`) },
        { label: 'Duplicate', icon: 'fa-regular fa-copy', onClick: () => this.duplicate(a) },
        { divider: true, hidden: a.status === 'cancelled' },
        { label: a.status === 'draft' ? 'Delete draft' : 'Cancel', icon: 'fa-solid fa-ban', danger: true, hidden: a.status === 'cancelled', onClick: () => this.cancel(a) }
      ]
    },
    async duplicate(a) {
      try {
        const v = await announcementsAPI.duplicate(a.id)
        toast.success('Copy created — edit it and send it again')
        this.$router.push(`/super-admin/announcements/${v.announcement.id}/edit`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not duplicate'))
      }
    },
    async cancel(a) {
      const draft = a.status === 'draft'
      const ok = await confirmDialog({
        title: draft ? 'Delete this draft?' : 'Cancel this announcement?',
        message: draft ? `“${a.title}” is deleted.` : `“${a.title}” stops: nothing more is sent or emailed, and unread copies leave people's notifications.`,
        confirmText: draft ? 'Delete' : 'Cancel announcement',
        danger: true
      })
      if (!ok) return
      try {
        if (draft) await announcementsAPI.remove(a.id)
        else await announcementsAPI.cancel(a.id)
        toast.success(draft ? 'Draft deleted' : 'Announcement cancelled')
        this.load()
        this.loadOccasions()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not do that'))
      }
    },
    openPlan(o) {
      this.plan = { open: true, o, busy: false }
    },
    async planSchedule() {
      const o = this.plan.o
      this.plan.busy = true
      try {
        const r = await announcementsAPI.planOccasion({ key: o.key, date: o.date_text, schedule: true })
        toast.success(`“${r.announcement.title}” is scheduled for ${zoned(r.announcement.next_send_at, r.announcement.timezone)}`, { title: o.name })
        this.plan.open = false
        this.load()
        this.loadOccasions()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not schedule it'))
      } finally {
        this.plan.busy = false
      }
    },
    async planDraft(ai) {
      const o = this.plan.o
      this.plan.busy = true
      try {
        const r = await announcementsAPI.planOccasion({ key: o.key, date: o.date_text })
        this.plan.open = false
        this.$router.push({ path: `/super-admin/announcements/${r.announcement.id}/edit`, query: ai ? { ai: '1' } : {} })
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the draft'))
      } finally {
        this.plan.busy = false
      }
    },
    async skip(o, skip, fromPlan = false) {
      try {
        await announcementsAPI.skipOccasion({ key: o.key, date: o.date_text, skip })
        toast.info(skip ? `${o.name} skipped this year — no more nudges for it.` : `${o.name} is back on — you'll be nudged before it.`)
        if (fromPlan) this.plan.open = false
        this.loadOccasions()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      }
    },
    async runDue() {
      try {
        const r = await announcementsAPI.runDue()
        toast.success(`${r.announcements} sent to ${r.people} people · ${r.emailed} emailed · ${r.nudges} nudge${r.nudges === 1 ? '' : 's'}`, { title: 'Ran due work' })
        this.load()
        this.loadOccasions()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not run it now'))
      }
    },
    async openSettings() {
      try {
        const s = await announcementsAPI.settings()
        this.settings = { open: true, form: { ...s }, leads: (s.nudge_lead_days || []).join(', '), busy: false }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the settings'))
      }
    },
    async saveSettings() {
      const leads = this.settings.leads
        .split(/[,\s]+/)
        .map((x) => parseInt(x, 10))
        .filter((x) => Number.isFinite(x) && x >= 0 && x <= 90)
      if (this.settings.form.nudges_on && !leads.length) {
        toast.error('Enter at least one number of days, e.g. 14, 3')
        return
      }
      this.settings.busy = true
      try {
        this.occSettings = await announcementsAPI.saveSettings({ ...this.settings.form, nudge_lead_days: leads })
        this.settings.open = false
        toast.success('Reminder settings saved')
        this.loadOccasions()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the settings'))
      } finally {
        this.settings.busy = false
      }
    }
  }
}
</script>

<style scoped>
@media (min-width: 641px) {
  .ui-page-head > div:first-child {
    flex: 1 1 360px;
    min-width: 0;
  }
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}
.list-card {
  min-width: 0;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar .ui-tabs {
  overflow-x: auto;
  max-width: 100%;
}
.search {
  width: min(280px, 100%);
}
.tab-count {
  margin-left: 6px;
  font-size: 11.5px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.sk-row {
  display: flex;
  gap: 12px;
  padding: 10px 0;
}
.sk-row .ui-skeleton,
.sk-col .ui-skeleton {
  height: 16px;
  display: block;
}
.sk-col {
  display: grid;
  gap: 12px;
}
.title-cell {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}
.title-cell__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.title-cell__text strong {
  overflow-wrap: anywhere;
}
.title-cell__text small {
  color: var(--text-3);
  font-size: 12.5px;
}
.kind-ico {
  --tone: var(--info);
  --tone-soft: var(--info-soft);
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--tone-soft);
  color: var(--tone);
  font-size: 13px;
}
.kind-ico.is-success { --tone: var(--success); --tone-soft: var(--success-soft); }
.kind-ico.is-warning { --tone: var(--warning); --tone-soft: var(--warning-soft); }
.kind-ico.is-danger { --tone: var(--danger); --tone-soft: var(--danger-soft); }
.ai-mini {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 0 7px;
}
.sub {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}
.num {
  font-variant-numeric: tabular-nums;
}
.txt-danger {
  color: var(--danger);
}
.pager {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-2);
  border-top: 1px solid var(--border);
}

.upcoming {
  position: sticky;
  top: calc(var(--topbar-h) + 16px);
}
.upcoming .ui-card__head h2 i {
  color: var(--accent);
  margin-right: 6px;
}
.upcoming__body {
  display: grid;
  gap: 10px;
}
.upcoming__hint {
  margin: 0;
}
.ui-empty.compact {
  padding: 18px 8px;
}
.occ-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.occ {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.occ.is-focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.occ.is-skipped {
  opacity: 0.7;
}
.occ__date {
  flex-shrink: 0;
  width: 46px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  height: fit-content;
}
.occ__date span {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.occ__date strong {
  font-size: 19px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.occ__main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}
.occ__name {
  font-size: 14.5px;
  overflow-wrap: anywhere;
}
.occ__meta {
  color: var(--text-3);
}
.occ__state {
  font-weight: 600;
  color: var(--text-2);
}
.occ__state.is-scheduled,
.occ__state.is-sent {
  color: var(--success);
}
.occ__state.is-draft {
  color: var(--warning);
}
.occ__state.is-note {
  font-weight: 400;
  color: var(--text-3);
}
.occ__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.plan-body {
  display: grid;
  gap: 14px;
}
.plan-lead {
  margin: 0;
  color: var(--text-2);
}
.plan-facts {
  margin: 0;
  display: grid;
  gap: 6px;
}
.plan-facts div {
  display: flex;
  gap: 10px;
  font-size: 13.5px;
}
.plan-facts dt {
  width: 80px;
  flex-shrink: 0;
  color: var(--text-3);
  font-weight: 500;
}
.plan-facts dd {
  margin: 0;
  color: var(--text);
  min-width: 0;
}
.plan-foot {
  flex-wrap: wrap;
}
.plan-foot .grow {
  flex: 1;
}
.form-stack {
  display: grid;
  gap: 14px;
}

@media (max-width: 1180px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .upcoming {
    position: static;
    order: -1;
  }
}
@media (max-width: 640px) {
  .toolbar {
    padding: 10px 12px;
  }
  .search {
    width: 100%;
  }
  .plan-foot .ui-btn {
    flex: 1 1 auto;
    justify-content: center;
  }
  .plan-foot .grow {
    display: none;
  }
}
</style>
