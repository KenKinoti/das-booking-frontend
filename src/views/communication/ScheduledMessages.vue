<template>
  <div class="ui-page ui-page--wide ssm">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow"><router-link to="/communication" class="crumb">Communication</router-link></div>
        <h1>Scheduled messages</h1>
        <p>Everything set to go out later — invoices, reminders, statements, customer and team messages.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn ui-btn--primary" data-testid="new-scheduled" @click="openComposer()"><i class="fa-regular fa-clock"></i> Schedule a message</button>
      </div>
    </header>

    <section class="ui-card">
      <div class="ssm-bar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': tab === t.value }" role="tab" :aria-selected="tab === t.value" :data-testid="'tab-' + t.value" @click="setTab(t.value)">
            {{ t.label }}<span v-if="counts[t.value]" class="count" :class="{ danger: t.value === 'failed' }">{{ counts[t.value] }}</span>
          </button>
        </div>
        <div class="ssm-filters">
          <div class="ui-input-group ssm-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search title, customer or number" aria-label="Search" />
          </div>
          <select v-model="kind" class="ui-select" aria-label="Kind" data-testid="filter-kind">
            <option value="">All kinds</option>
            <option v-for="(label, k) in kindOptions" :key="k" :value="k">{{ label }}</option>
          </select>
          <select v-model="channel" class="ui-select" aria-label="Channel">
            <option value="">All channels</option>
            <option v-for="(label, c) in channelLabels" :key="c" :value="c">{{ label }}</option>
          </select>
        </div>
      </div>
      <div v-if="invoiceFilter" class="ssm-invoice">
        <span><i class="fa-solid fa-filter"></i> Showing one invoice's scheduled sends.</span>
        <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="clearInvoice">Show all</button>
      </div>

      <div v-if="loading && !items.length" class="ui-card__body"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 56px; margin-bottom: 10px"></div></div>
      <div v-else-if="error" class="ui-card__body"><div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div></div>
      <div v-else-if="!items.length" class="ui-empty" data-testid="empty">
        <div class="ui-empty__icon"><i :class="tab === 'failed' ? 'fa-regular fa-face-smile' : 'fa-regular fa-clock'"></i></div>
        <h3>{{ emptyTitle }}</h3>
        <p>{{ emptyText }}</p>
        <button v-if="tab === 'upcoming' || tab === 'recurring'" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openComposer()"><i class="fa-regular fa-clock"></i> Schedule a message</button>
      </div>
      <ul v-else class="ssm-list" data-testid="scheduled-list">
        <li v-for="it in items" :key="it.message.id">
          <button type="button" class="ssm-row" :data-id="it.message.id" :data-kind="it.message.kind" data-testid="scheduled-row" @click="open(it.message.id)">
            <span class="ssm-ico" :class="'k-' + it.message.kind"><i :class="kindIcon(it.message)"></i></span>
            <span class="ssm-main">
              <strong>{{ it.message.title }}</strong>
              <small>
                <span>{{ kindLabel(it.message) }}</span>
                <span v-if="it.recipients_text"> · {{ it.recipients_text }}</span>
              </small>
              <small class="ssm-chans">
                <i v-for="c in it.message.channels" :key="c" :class="chanIcon(c)" :title="chanLabel(c)"></i>
                <span v-if="it.message.repeat && it.message.repeat.freq !== 'none'" class="ssm-rep"><i class="fa-solid fa-repeat"></i> {{ it.repeat_text }}</span>
              </small>
              <small v-if="it.message.last_note && (tab === 'failed' || tab === 'sent')" class="ssm-note">{{ it.message.last_note }}</small>
            </span>
            <span class="ssm-side">
              <span v-if="it.message.next_local" class="ssm-when" :class="{ paused: it.message.status === 'paused' }">{{ when(it.message.next_local) }}</span>
              <span v-else-if="it.message.last_run_at" class="ssm-when muted">{{ dt(it.message.last_run_at) }}</span>
              <span class="ssm-badges">
                <span v-if="it.message.status !== 'done' || !it.message.last_result" class="ui-badge" :class="statusInfo(it.message.status).badge">{{ statusInfo(it.message.status).label }}</span>
                <span v-if="it.message.last_result" class="ui-badge" :class="resultInfo(it.message.last_result).badge">{{ resultInfo(it.message.last_result).label }}</span>
              </span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <ScheduledDetail v-if="openId" :id="openId" :key="openId + ':' + detailKey" @close="close" @changed="load" @edit="edit" />
    <ScheduleComposer v-if="composer" :key="composerKey" :message="composer.message" :kind="composer.kind" :fixed-kind="!!composer.message" @close="composer = null" @saved="saved" />
  </div>
</template>

<script>
import ScheduledDetail from '@/components/schedsend/ScheduledDetail.vue'
import ScheduleComposer from '@/components/schedsend/ScheduleComposer.vue'
import { schedsendApi, KIND_LABELS, KIND_ICONS, CHANNEL_LABELS, CHANNEL_ICONS, RESULT_LABELS, STATUS_LABELS, localLabel } from '@/services/schedsend'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/format'

const TABS = ['upcoming', 'recurring', 'sent', 'failed']

/** Communication → Scheduled: upcoming / recurring / sent / failed scheduled sends. */
export default {
  name: 'ScheduledMessages',
  components: { ScheduledDetail, ScheduleComposer },
  data() {
    const qy = this.$route.query
    return {
      tab: TABS.includes(qy.tab) ? qy.tab : 'upcoming',
      q: '',
      kind: '',
      channel: '',
      invoiceFilter: qy.invoice || '',
      items: [],
      counts: {},
      loading: false,
      error: '',
      openId: qy.open || '',
      composer: qy.new ? { kind: qy.new === '1' ? 'customer' : qy.new, message: null } : null,
      composerKey: 0,
      detailKey: 0,
      timer: null,
      poll: null,
      tabs: [
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'recurring', label: 'Recurring' },
        { value: 'sent', label: 'Sent' },
        { value: 'failed', label: 'Failed' }
      ],
      kindOptions: { invoice: 'Invoice & quote emails', receipt: 'Receipts', reminder: 'Payment reminders', customer: 'Customer messages', statement: 'Statements', team: 'Team messages' },
      channelLabels: CHANNEL_LABELS
    }
  },
  computed: {
    emptyTitle() {
      return { upcoming: 'Nothing scheduled', recurring: 'No recurring messages', sent: 'Nothing sent yet', failed: 'No failed sends' }[this.tab]
    },
    emptyText() {
      return {
        upcoming: 'Use “Send later” when sending an invoice, or schedule a message to customers or your team.',
        recurring: 'Monthly statements, check-ins and reminders that repeat show here.',
        sent: 'Finished and cancelled scheduled sends show here with their results.',
        failed: 'Sends that failed or were missed show here, with the reason for each person.'
      }[this.tab]
    }
  },
  watch: {
    q() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.load(), 250)
    },
    kind() {
      this.load()
    },
    channel() {
      this.load()
    },
    '$route.query.open'(v) {
      this.openId = v || ''
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
    clearTimeout(this.poll)
  },
  methods: {
    when: localLabel,
    dt: formatDateTime,
    kindLabel(m) {
      if (m.kind === 'invoice' && m.doc_type === 'quote') return KIND_LABELS.quote
      return KIND_LABELS[m.kind] || m.kind
    },
    kindIcon(m) {
      return m.kind === 'invoice' && m.doc_type === 'quote' ? KIND_ICONS.quote : KIND_ICONS[m.kind] || 'fa-regular fa-clock'
    },
    chanLabel: (c) => CHANNEL_LABELS[c] || c,
    chanIcon: (c) => CHANNEL_ICONS[c] || 'fa-regular fa-message',
    resultInfo: (s) => RESULT_LABELS[s] || { label: s, badge: '' },
    statusInfo: (s) => STATUS_LABELS[s] || { label: s, badge: '' },
    async load() {
      this.loading = true
      try {
        const r = await schedsendApi.list({ tab: this.tab, q: this.q || undefined, kind: this.kind || undefined, channel: this.channel || undefined, invoice_id: this.invoiceFilter || undefined })
        this.items = r.items || []
        this.counts = r.counts || {}
        this.error = ''
        clearTimeout(this.poll)
        if (this.items.some((i) => i.message.status === 'running')) this.poll = setTimeout(() => this.load(), 3000)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load scheduled messages')
      } finally {
        this.loading = false
      }
    },
    setTab(t) {
      this.tab = t
      this.$router.replace({ query: { ...this.$route.query, tab: t === 'upcoming' ? undefined : t } })
      this.load()
    },
    clearInvoice() {
      this.invoiceFilter = ''
      this.$router.replace({ query: { ...this.$route.query, invoice: undefined } })
      this.load()
    },
    open(id) {
      this.openId = id
      this.$router.replace({ query: { ...this.$route.query, open: id } })
    },
    close() {
      this.openId = ''
      this.$router.replace({ query: { ...this.$route.query, open: undefined } })
      this.load()
    },
    openComposer(kind = 'customer') {
      this.composerKey++
      this.composer = { kind, message: null }
    },
    edit(m) {
      this.composerKey++
      this.composer = { kind: m.kind, message: m }
    },
    saved(m) {
      this.composer = null
      this.detailKey++
      if (this.$route.query.new) this.$router.replace({ query: { ...this.$route.query, new: undefined } })
      this.load()
      if (m?.id) this.open(m.id)
    }
  }
}
</script>

<style scoped>
.crumb {
  color: inherit;
  text-decoration: none;
}
.ssm-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.ssm-bar .ui-tabs {
  overflow-x: auto;
  max-width: 100%;
}
.count {
  margin-left: 6px;
  min-width: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 11px;
  font-weight: 700;
}
.count.danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.ssm-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ssm-filters .ui-select {
  width: auto;
}
.ssm-search {
  min-width: 220px;
}
.ssm-invoice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  background: var(--info-soft);
  color: var(--info);
}
.ssm-list {
  list-style: none;
  margin: 0;
  padding: 6px;
}
.ssm-list li + li {
  border-top: 1px solid var(--border);
}
.ssm-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.ssm-row:hover {
  background: var(--surface-hover);
}
.ssm-ico {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
}
.ssm-ico.k-reminder,
.ssm-ico.k-statement {
  background: var(--warning-soft);
  color: var(--warning);
}
.ssm-ico.k-team {
  background: var(--info-soft);
  color: var(--info);
}
.ssm-ico.k-customer {
  background: var(--success-soft);
  color: var(--success);
}
.ssm-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ssm-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ssm-main small {
  color: var(--text-3);
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ssm-chans {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ssm-rep {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ssm-note {
  color: var(--text-2) !important;
  white-space: normal !important;
}
.ssm-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.ssm-when {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}
.ssm-when.paused {
  color: var(--text-3);
  text-decoration: line-through;
}
.ssm-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.muted {
  color: var(--text-3);
}
@media (max-width: 640px) {
  .ssm-filters {
    width: 100%;
  }
  .ssm-search {
    min-width: 0;
    flex: 1 1 100%;
  }
  .ssm-filters .ui-select {
    flex: 1;
  }
  .ssm-row {
    flex-wrap: wrap;
  }
  .ssm-side {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    padding-left: 52px;
  }
}
</style>
