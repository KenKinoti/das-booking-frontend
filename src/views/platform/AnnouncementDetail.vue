<template>
  <div class="ui-page ui-page--wide">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <template v-else-if="!a">
      <div class="ui-card"><div class="ui-card__body sk-col"><span v-for="n in 5" :key="n" class="ui-skeleton"></span></div></div>
    </template>

    <template v-else>
      <header class="ui-page-head">
        <div class="head-main">
          <div class="ui-eyebrow"><router-link to="/super-admin/announcements">Announcements</router-link></div>
          <h1>{{ a.title }}</h1>
          <p class="head-meta">
            <span class="ui-badge" :class="`ui-badge--${statusInfo.badge}`" data-test="status">{{ statusInfo.label }}</span>
            <span class="kind" :class="`is-${tone}`"><i :class="kindInfo.icon"></i> {{ kindInfo.label }}<template v-if="a.priority === 'urgent' && a.kind !== 'urgent'"> · urgent</template></span>
            <span>{{ whenLine }}</span>
            <span v-if="a.ai_draft" class="ai-mini">AI draft</span>
          </p>
        </div>
        <div class="ui-actions">
          <OverflowMenu label="More actions" :items="moreActions" />
          <router-link v-if="editable" :to="`/super-admin/announcements/${a.id}/edit`" class="ui-btn"><i class="fa-regular fa-pen-to-square"></i> Edit</router-link>
          <button v-if="a.status === 'draft' || a.status === 'scheduled'" type="button" class="ui-btn ui-btn--primary" :disabled="busy" @click="sendNow"><i class="fa-solid fa-paper-plane"></i> Send now</button>
          <button v-else type="button" class="ui-btn" :disabled="exporting" @click="exportCsv"><i :class="exporting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-download'"></i> Export CSV</button>
        </div>
      </header>

      <div v-if="a.last_error" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ a.last_error }}</span></div>

      <div class="ui-kpis">
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-users"></i></span>Recipients</div>
          <div class="ui-kpi__value" data-test="kpi-recipients">{{ num(stats.recipients) }}</div>
          <div class="ui-kpi__meta">{{ num(stats.delivered) }} delivered in the app<template v-if="a.occurrences > 1"> · {{ a.occurrences }} sends</template></div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-regular fa-envelope-open"></i></span>Read</div>
          <div class="ui-kpi__value" data-test="kpi-read">{{ stats.delivered ? stats.read_pct + '%' : '—' }}</div>
          <div class="ui-kpi__meta">{{ num(stats.read) }} read · {{ num(stats.dismissed) }} dismissed</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-arrow-pointer"></i></span>Clicked</div>
          <div class="ui-kpi__value">{{ num(stats.clicked) }}</div>
          <div class="ui-kpi__meta">{{ stats.delivered ? stats.click_pct + '% of recipients' : 'Button and email link clicks' }}</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-regular fa-envelope"></i></span>Emailed</div>
          <div class="ui-kpi__value" data-test="kpi-emailed">{{ num(stats.emailed) }}</div>
          <div class="ui-kpi__meta">
            <span v-if="stats.email_failed" class="txt-danger">{{ stats.email_failed }} failed · </span>{{ num(stats.email_pending) }} waiting · {{ num(stats.email_skipped) }} skipped
          </div>
        </div>
        <div v-if="a.kind === 'promotion'" class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-danger"><i class="fa-solid fa-ban"></i></span>Unsubscribed</div>
          <div class="ui-kpi__value">{{ num(stats.unsubscribed) }}</div>
          <div class="ui-kpi__meta">From this offer's link</div>
        </div>
      </div>

      <div class="layout">
        <section class="ui-card">
          <div class="toolbar">
            <div class="ui-tabs" role="tablist">
              <button v-for="t in filters" :key="t.value" class="ui-tab" :class="{ 'is-active': filter === t.value }" role="tab" :aria-selected="filter === t.value" @click="setFilter(t.value)">{{ t.label }}</button>
            </div>
            <div class="ui-input-group search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="q" class="ui-input" type="search" placeholder="Name, email or organisation…" @input="searchSoon" />
            </div>
          </div>
          <div v-if="rLoading && !recipients.length" class="ui-card__body sk-col"><span v-for="n in 4" :key="n" class="ui-skeleton"></span></div>
          <div v-else-if="!recipients.length" class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-user-group"></i></div>
            <h3>{{ a.status === 'draft' || (a.status === 'scheduled' && !a.occurrences) ? 'Not sent yet' : 'Nobody here' }}</h3>
            <p>{{ a.status === 'draft' || (a.status === 'scheduled' && !a.occurrences) ? `It will reach about ${reachText}.` : 'Try another filter.' }}</p>
          </div>
          <div v-else class="ui-table-wrap" :class="{ 'is-loading': rLoading }">
            <table class="ui-table" v-table-cards>
              <thead>
                <tr>
                  <th>Person</th>
                  <th class="hide-md">Organisation</th>
                  <th>In the app</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in recipients" :key="d.id">
                  <td data-label="Person">
                    <strong>{{ d.name }}</strong>
                    <div class="sub">{{ d.email || 'no email' }}</div>
                  </td>
                  <td class="hide-md" data-label="Organisation">{{ d.org_name }}</td>
                  <td data-label="In the app">
                    <span v-if="d.clicked_at" class="ui-badge ui-badge--success">Clicked</span>
                    <span v-else-if="d.read_at" class="ui-badge ui-badge--success">Read</span>
                    <span v-else-if="d.dismissed_at" class="ui-badge ui-badge--draft">Dismissed</span>
                    <span v-else class="ui-badge ui-badge--info">Unread</span>
                    <span v-if="d.unsubscribed" class="ui-badge ui-badge--danger">Unsubscribed</span>
                    <div class="sub">{{ d.read_at ? 'Read ' + short(d.read_at) : 'Delivered ' + short(d.delivered_at) }}</div>
                  </td>
                  <td data-label="Email">
                    <span class="ui-badge" :class="`ui-badge--${emailBadge(d).badge}`">{{ emailBadge(d).label }}</span>
                    <div class="sub" :title="d.email_note">{{ emailSub(d) }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="rTotal > rLimit" class="pager">
            <button class="ui-btn ui-btn--sm" :disabled="rPage <= 1" @click="rGo(rPage - 1)"><i class="fa-solid fa-chevron-left"></i></button>
            <span>{{ (rPage - 1) * rLimit + 1 }}–{{ Math.min(rPage * rLimit, rTotal) }} of {{ rTotal }}</span>
            <button class="ui-btn ui-btn--sm" :disabled="rPage * rLimit >= rTotal" @click="rGo(rPage + 1)"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </section>

        <aside class="side">
          <div class="ui-card">
            <div class="ui-card__head"><h2>Message</h2></div>
            <div class="ui-card__body"><AnnouncementCard :item="a" hide-actions /></div>
          </div>
          <div class="ui-card">
            <div class="ui-card__head"><h2>Details</h2></div>
            <div class="ui-card__body">
              <dl class="facts">
                <div><dt>Audience</dt><dd>{{ audienceText }}</dd></div>
                <div><dt>Email</dt><dd>{{ delayText }}<template v-if="v.service_notice"> · sent even to people with update emails off</template></dd></div>
                <div v-if="a.local_send_at"><dt>Schedule</dt><dd>{{ scheduleText }}</dd></div>
                <div v-if="v.next_sends && v.next_sends.length"><dt>Next</dt><dd><span v-for="t in v.next_sends" :key="t" class="next">{{ zoned(t) }}</span></dd></div>
                <div v-if="a.expires_at"><dt>Stops showing</dt><dd>{{ zoned(a.expires_at) }}</dd></div>
                <div v-if="a.cta_label"><dt>Button</dt><dd>{{ a.cta_label }} → {{ a.cta_url }}</dd></div>
                <div v-if="a.occasion_name"><dt>Occasion</dt><dd>{{ a.occasion_name }} ({{ a.occasion_date }})</dd></div>
                <div><dt>Created</dt><dd>{{ a.created_by_name || 'A super admin' }} · {{ short(a.created_at) }}</dd></div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script>
import AnnouncementCard from '@/components/announcements/AnnouncementCard.vue'
import { announcementsAPI, KINDS, STATUS, zoned, delayLabel, audienceSummary } from '@/services/announcements'
import { apiErrorMessage } from '@/services/api'
import { ensurePlatformSession } from '@/services/platform'
import { downloadBlob } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'AnnouncementDetail',
  components: { AnnouncementCard },
  props: { id: { type: String, required: true } },
  data() {
    return {
      v: {},
      a: null,
      stats: {},
      meta: null,
      error: '',
      busy: false,
      exporting: false,
      recipients: [],
      rTotal: 0,
      rPage: 1,
      rLimit: 50,
      rLoading: false,
      filter: 'all',
      q: '',
      reach: null,
      filters: [
        { value: 'all', label: 'All' },
        { value: 'unread', label: 'Unread' },
        { value: 'read', label: 'Read' },
        { value: 'clicked', label: 'Clicked' },
        { value: 'emailed', label: 'Emailed' },
        { value: 'failed', label: 'Email failed' },
        { value: 'skipped', label: 'Email skipped' },
        { value: 'unsubscribed', label: 'Unsubscribed' }
      ]
    }
  },
  computed: {
    statusInfo() {
      return STATUS[this.a?.status] || STATUS.draft
    },
    kindInfo() {
      return KINDS[this.a?.kind] || KINDS.update
    },
    tone() {
      return this.a?.kind === 'urgent' || this.a?.priority === 'urgent' ? 'danger' : this.kindInfo.tone
    },
    editable() {
      return this.a && (this.a.status === 'draft' || (this.a.status === 'scheduled' && !this.a.occurrences))
    },
    whenLine() {
      const a = this.a
      if (a.status === 'scheduled' && a.next_send_at) return 'Sends ' + this.zoned(a.next_send_at)
      if (a.last_sent_at) return 'Sent ' + this.zoned(a.last_sent_at)
      if (a.status === 'cancelled' && a.cancelled_at) return 'Cancelled ' + this.zoned(a.cancelled_at)
      return 'Not sent yet'
    },
    audienceText() {
      return audienceSummary(this.a.audience, this.meta) + (this.a.audience?.exclude_super_admins ? ' · DASYIN team left out' : '')
    },
    delayText() {
      return delayLabel(this.a.email_delay_minutes)
    },
    scheduleText() {
      const a = this.a
      let s = this.zoned(a.send_at)
      if (a.recurrence === 'weekly') s += ', every week'
      if (a.recurrence === 'monthly') s += ', every month'
      if (a.recurrence !== 'none' && a.repeat_until) s += ` until ${a.repeat_until}`
      return s
    },
    reachText() {
      return this.reach ? `${this.reach.count} ${this.reach.count === 1 ? 'person' : 'people'}` : 'the people in its audience'
    },
    moreActions() {
      const a = this.a
      if (!a) return []
      return [
        { label: 'Send test to me', icon: 'fa-solid fa-vial', onClick: this.test, hidden: a.status === 'cancelled' },
        { label: 'Back to draft', icon: 'fa-solid fa-rotate-left', onClick: this.unschedule, hidden: !(a.status === 'scheduled' && !a.occurrences) },
        { label: 'Retry failed emails', icon: 'fa-solid fa-rotate', onClick: this.retry, hidden: !this.stats.email_failed },
        { label: 'Export CSV', icon: 'fa-solid fa-download', onClick: this.exportCsv },
        { label: 'Duplicate', icon: 'fa-regular fa-copy', onClick: this.duplicate },
        { divider: true, hidden: a.status === 'cancelled' },
        { label: a.status === 'draft' ? 'Delete draft' : 'Cancel announcement', icon: 'fa-solid fa-ban', danger: true, hidden: a.status === 'cancelled', onClick: this.cancel }
      ]
    }
  },
  watch: {
    id() {
      this.load()
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
        this.rPage = 1
        this.loadRecipients()
      }, 300)
    }
    this.load()
    announcementsAPI
      .meta()
      .then((m) => (this.meta = m))
      .catch(() => {})
  },
  methods: {
    zoned(t) {
      return zoned(t, this.a?.timezone)
    },
    num(n) {
      return n == null ? '—' : Number(n).toLocaleString()
    },
    short(t) {
      if (!t) return ''
      return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    },
    emailBadge(d) {
      return (
        {
          sent: { label: 'Emailed', badge: 'success' },
          failed: { label: 'Failed', badge: 'danger' },
          skipped: { label: 'Skipped', badge: 'draft' },
          not_needed: { label: 'Not needed', badge: 'draft' },
          never: { label: 'App only', badge: 'draft' },
          sending: { label: 'Sending', badge: 'warning' }
        }[d.email_status] || { label: 'Waiting', badge: 'info' }
      )
    },
    emailSub(d) {
      if (d.email_status === 'sent') return this.short(d.emailed_at)
      if (d.email_status === 'pending' && d.email_due_at) return 'If unread by ' + this.short(d.email_due_at)
      if (d.email_status === 'not_needed') return 'Read in the app first'
      return d.email_note || ''
    },
    async load() {
      this.error = ''
      try {
        this.v = await announcementsAPI.get(this.id)
        this.a = this.v.announcement
        this.stats = this.v.stats || {}
        this.loadRecipients()
        if (this.a.status === 'draft' || (this.a.status === 'scheduled' && !this.a.occurrences)) {
          announcementsAPI
            .audience(this.a.audience, this.a.kind)
            .then((r) => (this.reach = r))
            .catch(() => {})
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the announcement')
      }
    },
    async loadRecipients() {
      this.rLoading = true
      try {
        const r = await announcementsAPI.recipients(this.id, { filter: this.filter, q: this.q || undefined, page: this.rPage, limit: this.rLimit })
        this.recipients = r.recipients || []
        this.rTotal = r.total || 0
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the recipients'))
      } finally {
        this.rLoading = false
      }
    },
    setFilter(f) {
      this.filter = f
      this.rPage = 1
      this.loadRecipients()
    },
    rGo(p) {
      this.rPage = p
      this.loadRecipients()
    },
    async sendNow() {
      const r = this.reach ? await Promise.resolve(this.reach) : await announcementsAPI.audience(this.a.audience, this.a.kind).catch(() => null)
      const n = r?.count ?? 0
      const ok = await confirmDialog({ title: `Send to ${n} ${n === 1 ? 'person' : 'people'} now?`, message: `“${this.a.title}” appears in their app straight away. ${delayLabel(this.a.email_delay_minutes)}.`, confirmText: 'Send now' })
      if (!ok) return
      this.busy = true
      try {
        const v = await announcementsAPI.sendNow(this.a.id)
        toast.success(`Sent to ${v.sent_to} ${v.sent_to === 1 ? 'person' : 'people'}`)
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not send it'))
      } finally {
        this.busy = false
      }
    },
    async test() {
      try {
        const r = await announcementsAPI.test(this.a.id)
        if (r.email_status === 'sent') toast.success(`Test sent — check your notifications and ${r.email}.`)
        else toast.warning(`In your notifications; the email was not sent: ${r.email_note || r.email_status}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not send the test'))
      }
    },
    async unschedule() {
      try {
        await announcementsAPI.unschedule(this.a.id)
        toast.info('Back to draft — it will not be sent until you schedule it again')
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not change it'))
      }
    },
    async retry() {
      try {
        const r = await announcementsAPI.retryEmails(this.a.id)
        toast.success(`${r.queued} email${r.queued === 1 ? '' : 's'} queued again`)
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not retry'))
      }
    },
    async exportCsv() {
      this.exporting = true
      try {
        const res = await announcementsAPI.exportCsv(this.a.id)
        downloadBlob(res.data, `announcement-${this.a.id.slice(0, 8)}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not export'))
      } finally {
        this.exporting = false
      }
    },
    async duplicate() {
      try {
        const v = await announcementsAPI.duplicate(this.a.id)
        toast.success('Copy created')
        this.$router.push(`/super-admin/announcements/${v.announcement.id}/edit`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not duplicate'))
      }
    },
    async cancel() {
      const draft = this.a.status === 'draft'
      const ok = await confirmDialog({
        title: draft ? 'Delete this draft?' : 'Cancel this announcement?',
        message: draft ? 'The draft is deleted.' : 'Nothing more is sent or emailed, and unread copies leave people’s notifications.',
        confirmText: draft ? 'Delete' : 'Cancel announcement',
        danger: true
      })
      if (!ok) return
      try {
        if (draft) {
          await announcementsAPI.remove(this.a.id)
          toast.success('Draft deleted')
          this.$router.push('/super-admin/announcements')
          return
        }
        await announcementsAPI.cancel(this.a.id)
        toast.success('Announcement cancelled')
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not do that'))
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
.ui-eyebrow a {
  color: inherit;
  text-decoration: none;
}
.ui-eyebrow a:hover {
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
  gap: 6px 12px;
  align-items: center;
}
.kind {
  --tone: var(--info);
  color: var(--tone);
  font-weight: 600;
  font-size: 13.5px;
}
.kind.is-success { --tone: var(--success); }
.kind.is-warning { --tone: var(--warning); }
.kind.is-danger { --tone: var(--danger); }
.ai-mini {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 1px 8px;
}
.sk-col {
  display: grid;
  gap: 12px;
}
.sk-col .ui-skeleton {
  display: block;
  height: 16px;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 20px;
  align-items: start;
}
.side {
  display: grid;
  gap: 16px;
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
  width: min(260px, 100%);
}
.sub {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
  overflow-wrap: anywhere;
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
  font-variant-numeric: tabular-nums;
}
.facts {
  margin: 0;
  display: grid;
  gap: 10px;
}
.facts div {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 10px;
  font-size: 13.5px;
}
.facts dt {
  color: var(--text-3);
  font-weight: 500;
}
.facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.next {
  display: block;
}
.side :deep(.ann) {
  border: 0;
  border-left: 0;
  padding: 0;
  box-shadow: none;
  background: transparent;
}
@media (max-width: 1180px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .side {
    order: -1;
  }
}
@media (max-width: 640px) {
  .search {
    width: 100%;
  }
  .facts div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
