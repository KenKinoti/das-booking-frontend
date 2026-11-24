<template>
  <div class="ui-page ui-page--wide obx" data-testid="outbox-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow"><router-link to="/communication" class="crumb">Communication</router-link></div>
        <h1>Pending review</h1>
        <p>{{ lead }}</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn ui-btn--icon obx-hbtn" type="button" title="Refresh" aria-label="Refresh the list" :disabled="loading" @click="load()"><i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading && loaded }"></i></button>
        <router-link v-if="canApprove" :to="{ path: '/settings', hash: '#review-before-sending' }" class="ui-btn obx-hbtn" data-testid="outbox-settings-link"><i class="fa-solid fa-sliders"></i> <span>Settings</span></router-link>
      </div>
    </header>

    <div v-if="counts && counts.enabled === false" class="ui-alert ui-alert--warning obx-mb" data-testid="outbox-off">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span>
        <strong>Review before sending is off.</strong> New client messages go straight out, as before.<template v-if="counts.waiting"> The {{ counts.waiting }} below still wait for a decision.</template>
        <router-link v-if="canApprove" :to="{ path: '/settings', hash: '#review-before-sending' }">Turn it back on</router-link>
      </span>
    </div>

    <!-- What needs attention first -->
    <div v-if="counts && (counts.waiting || counts.approved)" class="obx-sum" data-testid="outbox-summary">
      <button type="button" class="obx-stat" :class="{ on: tab === 'waiting' && !flag && status !== 'failed' }" data-testid="sum-waiting" @click="quick('waiting')">
        <strong class="tabular">{{ counts.pending ?? counts.waiting }}</strong>
        <span>waiting for approval<small v-if="counts.oldest_at"> · oldest {{ waited(counts.oldest_at) }}</small></span>
      </button>
      <button v-if="counts.time_sensitive" type="button" class="obx-stat is-danger" :class="{ on: flag === 'time_sensitive' }" data-testid="sum-time" @click="quick('time_sensitive')">
        <strong class="tabular">{{ counts.time_sensitive }}</strong><span>time-sensitive</span>
      </button>
      <button v-if="counts.stale" type="button" class="obx-stat is-warn" :class="{ on: flag === 'stale' }" data-testid="sum-stale" @click="quick('stale')">
        <strong class="tabular">{{ counts.stale }}</strong><span>stale — waited over {{ staleDays }} days</span>
      </button>
      <button v-if="counts.failed" type="button" class="obx-stat is-danger" :class="{ on: status === 'failed' }" data-testid="sum-failed" @click="quick('failed')">
        <strong class="tabular">{{ counts.failed }}</strong><span>couldn’t be sent — try again</span>
      </button>
      <button v-if="counts.approved" type="button" class="obx-stat is-info" :class="{ on: tab === 'approved' }" data-testid="sum-approved" @click="setTab('approved')">
        <strong class="tabular">{{ counts.approved }}</strong><span>approved for later<small v-if="counts.next_send_at"> · next {{ when(counts.next_send_at) }}</small></span>
      </button>
    </div>

    <section class="ui-card">
      <div class="obx-bar">
        <div class="ui-tabs obx-tabs" role="tablist" aria-label="Pending review">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': tab === t.value }" role="tab" :aria-selected="tab === t.value" :data-testid="'tab-' + t.value" @click="setTab(t.value)">
            {{ t.label }}<span v-if="tabCount(t.value)" class="count" :class="{ warn: t.value === 'waiting' }">{{ tabCount(t.value) }}</span>
          </button>
        </div>
        <div class="obx-filters">
          <div class="ui-input-group obx-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search who, subject or number" aria-label="Search messages" data-testid="outbox-search" />
          </div>
          <select v-model="kind" class="ui-select" aria-label="Kind of message" data-testid="filter-kind">
            <option value="">All kinds</option>
            <option v-for="k in facets.kinds" :key="k.key" :value="k.key">{{ k.label }}{{ k.n ? ` (${k.n})` : '' }}</option>
          </select>
          <select v-model="channel" class="ui-select" aria-label="Channel" data-testid="filter-channel">
            <option value="">All channels</option>
            <option v-for="c in channelOptions" :key="c.key" :value="c.key">{{ c.label }}{{ c.n ? ` (${c.n})` : '' }}</option>
          </select>
          <select v-model="who" class="ui-select" aria-label="Who queued it" data-testid="filter-who">
            <option value="">Queued by anyone</option>
            <option value="t:automatic">Automatic</option>
            <option value="t:scheduled">Scheduled</option>
            <option value="t:manual">Sent by a person</option>
            <option v-if="canApprove" value="p:me">Me</option>
            <option v-for="p in facets.people" :key="p.id" :value="'p:' + p.id">{{ p.name }}{{ p.n ? ` (${p.n})` : '' }}</option>
          </select>
        </div>
      </div>

      <div v-if="activeChips.length" class="obx-chips" data-testid="outbox-active-filters">
        <span v-for="c in activeChips" :key="c.key" class="obx-chip">
          {{ c.label }}
          <button type="button" :aria-label="'Remove filter ' + c.label" @click="c.clear()"><i class="fa-solid fa-xmark"></i></button>
        </span>
        <button type="button" class="linkish" @click="clearFilters">Clear all</button>
      </div>

      <!-- Bulk actions (approvers, on the Waiting tab) -->
      <div v-if="selectable && items.length" class="obx-bulk" :class="{ 'has-sel': selected.length }" data-testid="outbox-bulk">
        <label class="obx-check obx-check--all">
          <input type="checkbox" :checked="allSelected" :indeterminate.prop="someSelected" aria-label="Select all shown" data-testid="select-all" @change="toggleAll($event.target.checked)" />
        </label>
        <span class="obx-bulk__text" aria-live="polite">{{ selected.length ? `${selected.length} selected` : 'Select messages to approve or reject several at once' }}</span>
        <template v-if="selected.length">
          <button type="button" class="ui-btn ui-btn--sm" :disabled="bulkBusy" data-testid="bulk-reject" @click="bulkRejectOpen = true"><i class="fa-solid fa-ban"></i> Reject</button>
          <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" :disabled="bulkBusy" data-testid="bulk-approve" @click="bulkApprove"><i :class="bulkBusy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-paper-plane'"></i> Approve &amp; send</button>
          <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="selected = []">Clear</button>
        </template>
      </div>

      <div v-if="loading && !loaded" class="ui-card__body"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 64px; margin-bottom: 10px"></div></div>
      <div v-else-if="error" class="ui-card__body"><div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a></span></div></div>
      <div v-else-if="!items.length" class="ui-empty" data-testid="outbox-empty">
        <div class="ui-empty__icon"><i :class="tab === 'waiting' && !hasFilters ? 'fa-regular fa-circle-check' : 'fa-solid fa-inbox'"></i></div>
        <h3>{{ hasFilters ? 'Nothing matches these filters' : tabInfo.empty }}</h3>
        <p>{{ hasFilters ? 'Try another search or clear the filters.' : canApprove ? tabInfo.emptyText : staffEmpty }}</p>
        <button v-if="hasFilters" type="button" class="ui-btn" style="margin-top: 12px" @click="clearFilters">Clear filters</button>
      </div>
      <ul v-else ref="list" class="obx-list" role="list" data-testid="outbox-list" @keydown="onListKey">
        <li v-for="(it, i) in items" :key="it.id" class="obx-row" :class="{ 'is-sel': isSel(it.id), 'is-open': openId === it.id, ['st-' + it.status]: true }" :data-id="it.id" :data-status="it.status" :data-kind="it.kind" data-testid="outbox-row">
          <label v-if="selectable" class="obx-check">
            <input type="checkbox" :checked="isSel(it.id)" :disabled="!selectableItem(it)" :aria-label="'Select ' + rowTitle(it)" data-testid="row-select" @change="toggle(it.id, $event.target.checked)" />
          </label>
          <button type="button" class="obx-main" :data-index="i" :aria-label="rowAria(it)" data-testid="row-open" @click="open(it.id)" @focus="focusIndex = i">
            <span class="obx-ico" :class="'tone-' + toneOf(it.kind)" aria-hidden="true">
              <i :class="iconOf(it.kind)"></i>
              <span class="obx-ico__chan"><i :class="channelIconOf(it.channel)"></i></span>
            </span>
            <span class="obx-body">
              <strong class="obx-title">{{ rowTitle(it) }}</strong>
              <span class="obx-line">
                <span class="obx-kind">{{ kindLabelOf(it) }}</span>
                <span> · to <span class="obx-to">{{ it.to_name || it.to }}</span><template v-if="it.to_name && it.channel !== 'email'"> ({{ it.to }})</template></span>
                <span v-if="(it.cc || []).length" class="muted"> +{{ it.cc.length }} CC</span>
              </span>
              <span class="obx-line obx-line--meta">
                <span v-if="it.record" class="obx-rec"><i class="fa-regular fa-file-lines" aria-hidden="true"></i> {{ it.record.label || it.record.number }}</span>
                <span v-if="it.amount !== null && it.amount !== undefined" class="obx-amt tabular">{{ money(it.amount, it.currency) }}</span>
                <span class="obx-why" :title="it.trigger"><i :class="triggerIcon(it.trigger_kind)" aria-hidden="true"></i> {{ it.trigger }}</span>
              </span>
              <span v-if="it.snippet && tab === 'waiting'" class="obx-snip">{{ it.snippet }}</span>
              <span v-if="it.stale || it.flag || it.edited || it.status === 'failed' || it.superseded_reason || it.decision_note" class="obx-flags">
                <span v-if="it.status === 'failed'" class="ui-badge ui-badge--danger" data-testid="flag-failed" :title="it.error"><i class="fa-solid fa-triangle-exclamation"></i> Not sent — {{ shortErr(it.error) }}</span>
                <span v-if="it.flag" class="ui-badge" :class="it.blocks ? 'ui-badge--danger' : 'ui-badge--info'" data-testid="flag-time"><i :class="it.blocks ? 'fa-solid fa-lock' : 'fa-regular fa-clock'"></i> {{ it.flag }}</span>
                <span v-if="it.stale" class="ui-badge ui-badge--warning" data-testid="flag-stale"><i class="fa-solid fa-hourglass-end"></i> Stale</span>
                <span v-if="it.edited" class="ui-badge ui-badge--draft"><i class="fa-regular fa-pen-to-square"></i> Edited</span>
                <span v-if="it.status === 'superseded' && it.superseded_reason" class="obx-reason">{{ it.superseded_reason }}</span>
                <span v-else-if="it.status === 'rejected' && it.decision_note" class="obx-reason">“{{ it.decision_note }}”</span>
              </span>
            </span>
            <span class="obx-side">
              <span class="obx-wait" :title="'Queued ' + when(it.created_at)">
                <template v-if="tab === 'waiting'"><i class="fa-regular fa-hourglass-half" aria-hidden="true"></i> {{ waited(it.created_at) }}</template>
                <template v-else-if="it.status === 'sent'">{{ when(it.sent_at) }}</template>
                <template v-else-if="it.status === 'approved'">goes {{ when(it.send_at) }}</template>
                <template v-else>{{ when(it.decided_at || it.created_at) }}</template>
              </span>
              <span v-if="tab !== 'waiting' || it.status !== 'pending'" class="ui-badge" :class="statusOf(it.status).badge">{{ statusOf(it.status).short }}</span>
              <span v-else-if="it.send_at && future(it.send_at)" class="obx-due muted">due {{ when(it.send_at) }}</span>
              <small v-if="tab !== 'waiting' && (it.approved_by || it.decided_by)" class="muted obx-by">{{ (it.approved_by || it.decided_by).name }}</small>
            </span>
          </button>
        </li>
      </ul>
      <div v-if="items.length && total > items.length" class="obx-more">
        <button type="button" class="ui-btn" :disabled="loading" data-testid="outbox-more" @click="loadMore"><i class="fa-solid fa-angles-down"></i> Show more ({{ total - items.length }} more)</button>
      </div>
      <p v-if="items.length && canApprove && tab === 'waiting'" class="obx-keys muted small" aria-hidden="true">Tip: <kbd>j</kbd> / <kbd>k</kbd> move between messages, <kbd>Enter</kbd> opens one, <kbd>x</kbd> selects it.</p>
    </section>

    <OutboxReview v-if="openId" :id="openId" :key="openId" :ids="itemIds" @close="close" @changed="onChanged" @move="moveTo" @filter-customer="filterCustomer" />

    <!-- Bulk reject with one note -->
    <div v-if="bulkRejectOpen" class="ui-modal-backdrop" @mousedown.self="bulkRejectOpen = false">
      <form class="ui-modal obx-rej" role="dialog" aria-modal="true" aria-labelledby="obx-rej-title" data-testid="bulk-reject-dialog" @submit.prevent="bulkReject" @keydown.esc="bulkRejectOpen = false">
        <div class="ui-modal__head">
          <div>
            <h2 id="obx-rej-title">Reject {{ selected.length }} message{{ selected.length === 1 ? '' : 's' }}?</h2>
            <p class="muted small m0">Nothing is sent to these clients. Each record keeps a note that it was not sent.</p>
          </div>
        </div>
        <div class="ui-modal__body">
          <div class="ui-field">
            <label for="obx_note">Note <span class="muted">(optional — kept in each message’s history)</span></label>
            <textarea id="obx_note" v-model="bulkNote" class="ui-textarea" rows="3" maxlength="500" placeholder="e.g. Old reminders — the clients have paid" data-testid="bulk-reject-note"></textarea>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="bulkRejectOpen = false">Keep them</button>
          <button type="submit" class="ui-btn ui-btn--danger" :disabled="bulkBusy" data-testid="bulk-reject-confirm"><i :class="bulkBusy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-ban'"></i> Reject — don’t send</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import OutboxReview from '@/components/outbox/OutboxReview.vue'
import { outboxApi, OUTBOX_TABS, OUTBOX_CHANNEL_LABELS, kindLabel, kindIcon, kindTone, channelIcon, statusInfo, waitedFor, whenText } from '@/services/outbox'
import { outbox, refreshOutboxCounts, ensureOutboxMe } from '@/components/outbox/outboxState'
import { apiErrorMessage } from '@/services/api'
import { formatCurrency } from '@/utils/currencies'
import { orgDefaults } from '@/utils/orgDefaults'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const TABS = OUTBOX_TABS.map((t) => t.value)
const TRIGGER_ICONS = { manual: 'fa-regular fa-user', automatic: 'fa-solid fa-gears', scheduled: 'fa-regular fa-clock' }

/**
 * Communication → Pending review (/outbox): every client message waiting for approval (pkg/outbox). Tabs Waiting /
 * Approved & scheduled / Sent / Rejected & superseded; filters (kind, channel, who queued it, customer via ?customer=,
 * stale / time-sensitive); multi-select bulk approve / reject; ?open=<id> opens the review drawer.
 */
export default {
  name: 'PendingReview',
  components: { OutboxReview },
  data() {
    const qy = this.$route.query
    return {
      tab: TABS.includes(qy.tab) ? qy.tab : 'waiting',
      q: typeof qy.q === 'string' ? qy.q : '',
      kind: typeof qy.kind === 'string' ? qy.kind : '',
      channel: typeof qy.channel === 'string' ? qy.channel : '',
      who: typeof qy.who === 'string' ? qy.who : '',
      flag: ['stale', 'time_sensitive'].includes(qy.flag) ? qy.flag : '',
      status: qy.status === 'failed' ? 'failed' : '',
      customer: typeof qy.customer === 'string' ? { id: qy.customer, name: typeof qy.customer_name === 'string' ? qy.customer_name : 'one customer' } : null,
      items: [],
      total: 0,
      page: 1,
      facets: { kinds: [], channels: [], people: [] },
      listCounts: null,
      loading: false,
      loaded: false,
      error: '',
      openId: typeof qy.open === 'string' ? qy.open : '',
      selected: [],
      bulkBusy: false,
      bulkRejectOpen: false,
      bulkNote: '',
      focusIndex: -1,
      timer: null,
      poll: null,
      staleDays: 7,
      tabs: OUTBOX_TABS
    }
  },
  computed: {
    counts() {
      return this.listCounts || (outbox.loaded ? outbox.counts : null)
    },
    canApprove() {
      return !!(this.counts?.can_approve ?? outbox.me?.can_approve)
    },
    lead() {
      if (this.counts && this.counts.enabled === false) return 'Client messages that were waiting when review was switched off, and what happened to the ones before.'
      if (this.canApprove) return 'Every message to a client waits here until you approve it — invoices, reminders, receipts, notices and messages. See it as the client will, change what needs changing, then send.'
      return 'Messages you sent to clients wait here until an owner or admin approves them. You can see where each one is.'
    },
    staffEmpty() {
      return this.tab === 'waiting' ? 'None of your messages are waiting. When you send something to a client, it shows here until an owner or admin approves it.' : this.tabInfo.emptyText
    },
    tabInfo() {
      return OUTBOX_TABS.find((t) => t.value === this.tab) || OUTBOX_TABS[0]
    },
    selectable() {
      return this.canApprove && this.tab === 'waiting'
    },
    itemIds() {
      return this.items.map((i) => i.id)
    },
    selectableIds() {
      return this.items.filter((i) => this.selectableItem(i)).map((i) => i.id)
    },
    allSelected() {
      return this.selectableIds.length > 0 && this.selectableIds.every((id) => this.selected.includes(id))
    },
    someSelected() {
      return this.selected.length > 0 && !this.allSelected
    },
    channelOptions() {
      const f = this.facets.channels || []
      if (f.length) return f.map((c) => ({ key: c.key, label: c.label || OUTBOX_CHANNEL_LABELS[c.key] || c.key, n: c.n }))
      return Object.entries(OUTBOX_CHANNEL_LABELS).map(([key, label]) => ({ key, label }))
    },
    hasFilters() {
      return !!(this.q || this.kind || this.channel || this.who || this.flag || this.status || this.customer)
    },
    activeChips() {
      const out = []
      if (this.flag) out.push({ key: 'flag', label: this.flag === 'stale' ? 'Stale only' : 'Time-sensitive only', clear: () => (this.flag = '') })
      if (this.status === 'failed') out.push({ key: 'status', label: 'Couldn’t be sent', clear: () => (this.status = '') })
      if (this.customer) out.push({ key: 'customer', label: 'Customer: ' + this.customer.name, clear: () => (this.customer = null) })
      return out
    },
    params() {
      const p = { tab: this.tab, page: this.page, per_page: 50 }
      if (this.q.trim()) p.q = this.q.trim()
      if (this.kind) p.kind = this.kind
      if (this.channel) p.channel = this.channel
      if (this.flag) p.flag = this.flag
      if (this.status) p.status = this.status
      if (this.customer) p.customer_id = this.customer.id
      if (this.who.startsWith('t:')) p.trigger_kind = this.who.slice(2)
      else if (this.who.startsWith('p:')) p.created_by = this.who.slice(2)
      return p
    },
    tick() {
      return outbox.tick
    }
  },
  watch: {
    q() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.reload(), 250)
    },
    kind() {
      this.reload()
    },
    channel() {
      this.reload()
    },
    who() {
      this.reload()
    },
    flag() {
      this.reload()
    },
    status() {
      this.reload()
    },
    customer() {
      this.reload()
    },
    '$route.query.open'(v) {
      this.openId = typeof v === 'string' ? v : ''
    },
    tick() {
      // Something changed elsewhere (a Send dialog queued a message): refresh quietly.
      if (!this.openId) this.load({ quiet: true })
    }
  },
  created() {
    ensureOutboxMe()
    this.load()
    outboxApi
      .settings()
      .then((s) => {
        if (s?.stale_days) this.staleDays = s.stale_days
      })
      .catch(() => {})
  },
  mounted() {
    document.addEventListener('keydown', this.onDocKey)
  },
  beforeUnmount() {
    clearTimeout(this.timer)
    clearTimeout(this.poll)
    document.removeEventListener('keydown', this.onDocKey)
  },
  methods: {
    kindLabelOf: (it) => kindLabel(it),
    iconOf: kindIcon,
    toneOf: kindTone,
    channelIconOf: channelIcon,
    statusOf: statusInfo,
    triggerIcon: (k) => TRIGGER_ICONS[k] || 'fa-regular fa-circle',
    waited: (iso) => waitedFor(iso),
    money: (v, c) => formatCurrency(v, c || undefined),
    when(iso) {
      return whenText(iso, orgDefaults.timezone || undefined)
    },
    future: (iso) => !!iso && new Date(iso).getTime() > Date.now(),
    shortErr(e) {
      const s = String(e || 'it failed')
      return s.length > 60 ? s.slice(0, 57) + '…' : s
    },
    rowTitle(it) {
      return it.subject || it.snippet || `${kindLabel(it)} to ${it.to_name || it.to}`
    },
    rowAria(it) {
      const bits = [kindLabel(it), 'to ' + (it.to_name || it.to), it.subject, it.record?.label, it.trigger, this.tab === 'waiting' ? 'waiting ' + this.waited(it.created_at) : statusInfo(it.status).short]
      if (it.stale) bits.push('stale')
      if (it.flag) bits.push(it.flag)
      return bits.filter(Boolean).join(', ')
    },
    tabCount(t) {
      const c = this.counts
      if (!c) return 0
      if (t === 'waiting') return c.waiting || 0
      if (t === 'approved') return c.approved || 0
      return 0
    },
    selectableItem(it) {
      return it.status === 'pending' || it.status === 'failed'
    },
    isSel(id) {
      return this.selected.includes(id)
    },
    toggle(id, on) {
      if (on && !this.selected.includes(id)) this.selected.push(id)
      if (!on) this.selected = this.selected.filter((x) => x !== id)
    },
    toggleAll(on) {
      this.selected = on ? [...this.selectableIds] : []
    },
    syncQuery() {
      const qy = { ...this.$route.query }
      const set = (k, v) => (v ? (qy[k] = v) : delete qy[k])
      set('tab', this.tab === 'waiting' ? '' : this.tab)
      set('kind', this.kind)
      set('channel', this.channel)
      set('who', this.who)
      set('flag', this.flag)
      set('status', this.status)
      set('customer', this.customer?.id || '')
      set('customer_name', this.customer?.name && this.customer.id ? this.customer.name : '')
      set('open', this.openId)
      this.$router.replace({ query: qy }).catch(() => {})
    },
    reload() {
      this.page = 1
      this.selected = []
      this.syncQuery()
      this.load()
    },
    async load({ quiet = false, append = false } = {}) {
      if (!quiet) this.loading = true
      try {
        const r = await outboxApi.list(this.params)
        const rows = r?.items || []
        this.items = append ? [...this.items, ...rows.filter((x) => !this.items.some((y) => y.id === x.id))] : rows
        this.total = r?.total ?? this.items.length
        if (r?.filters) this.facets = { kinds: r.filters.kinds || [], channels: r.filters.channels || [], people: (r.filters.people || []).filter((p) => p && p.id) }
        if (r?.counts) {
          this.listCounts = r.counts
          outbox.counts = { ...outbox.counts, ...r.counts }
        }
        this.selected = this.selected.filter((id) => this.items.some((i) => i.id === id && this.selectableItem(i)))
        this.error = ''
        this.loaded = true
        clearTimeout(this.poll)
        if (this.items.some((i) => i.status === 'sending')) this.poll = setTimeout(() => this.load({ quiet: true }), 4000)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load Pending review')
      } finally {
        this.loading = false
      }
    },
    loadMore() {
      this.page++
      this.load({ append: true })
    },
    setTab(t) {
      if (this.tab === t && !this.flag && !this.status) return
      this.tab = t
      this.flag = ''
      this.status = ''
      this.reload()
    },
    quick(what) {
      this.tab = 'waiting'
      this.flag = what === 'stale' || what === 'time_sensitive' ? what : ''
      this.status = what === 'failed' ? 'failed' : ''
      this.reload()
    },
    clearFilters() {
      this.q = ''
      this.kind = ''
      this.channel = ''
      this.who = ''
      this.flag = ''
      this.status = ''
      this.customer = null
      this.reload()
    },
    open(id) {
      this.openId = id
      this.$router.replace({ query: { ...this.$route.query, open: id } }).catch(() => {})
    },
    close() {
      const was = this.openId
      this.openId = ''
      this.$router.replace({ query: { ...this.$route.query, open: undefined } }).catch(() => {})
      this.load({ quiet: true })
      this.$nextTick(() => this.$refs.list?.querySelector(`[data-id="${was}"] .obx-main`)?.focus({ preventScroll: false }))
    },
    moveTo(id) {
      this.open(id)
    },
    /** "All their messages" in the drawer: this customer's messages on every tab. */
    filterCustomer(c) {
      if (!c?.id) return
      this.openId = ''
      this.customer = { id: c.id, name: c.name || 'one customer' }
    },
    onChanged(item) {
      if (!item?.id) return
      const i = this.items.findIndex((x) => x.id === item.id)
      if (i !== -1) this.items.splice(i, 1, { ...this.items[i], ...item })
      this.selected = this.selected.filter((x) => x !== item.id || this.selectableItem(item))
      refreshOutboxCounts()
    },
    // -------------------------------------------------- bulk
    selectedItems() {
      return this.items.filter((i) => this.selected.includes(i.id))
    },
    async bulkApprove() {
      const list = this.selectedItems()
      if (!list.length) return
      const later = list.filter((i) => i.send_at && this.future(i.send_at)).length
      const now = list.length - later
      const parts = []
      if (now) parts.push(`${now} ${now === 1 ? 'goes' : 'go'} to the client${now === 1 ? '' : 's'} now`)
      if (later) parts.push(`${later} ${later === 1 ? 'is' : 'are'} approved for ${later === 1 ? 'its' : 'their'} scheduled time`)
      const ok = await confirmDialog({
        title: `Approve ${list.length} message${list.length === 1 ? '' : 's'}?`,
        message: `${parts.join(' and ')}. They are sent exactly as they are now — open one first if it needs changes.`,
        confirmText: 'Approve & send'
      })
      if (!ok) return
      await this.runBulk({ action: 'approve', ids: list.map((i) => i.id), when: 'scheduled' })
    },
    async bulkReject() {
      const ids = [...this.selected]
      if (!ids.length) return
      await this.runBulk({ action: 'reject', ids, note: this.bulkNote.trim() })
      this.bulkRejectOpen = false
      this.bulkNote = ''
    },
    async runBulk(body) {
      this.bulkBusy = true
      try {
        const r = await outboxApi.bulk(body)
        const results = r?.results || []
        const sent = results.filter((x) => x.ok && x.outcome === 'sent').length
        const approved = results.filter((x) => x.ok && x.outcome === 'approved').length
        const superseded = results.filter((x) => x.outcome === 'superseded').length
        const rejected = results.filter((x) => x.ok && (x.outcome === 'rejected' || x.status === 'rejected')).length
        const failed = results.filter((x) => !x.ok || x.outcome === 'failed').length
        const bits = []
        if (sent) bits.push(`${sent} sent`)
        if (approved) bits.push(`${approved} approved for later`)
        if (rejected) bits.push(`${rejected} rejected`)
        if (superseded) bits.push(`${superseded} not needed any more`)
        if (failed) bits.push(`${failed} couldn’t be ${body.action === 'reject' ? 'rejected' : 'sent'}`)
        const msg = bits.join(' · ') || 'Done'
        if (failed) toast.warning(msg + (body.action === 'approve' ? ' — the failed ones stay in Waiting with the reason.' : ''), { title: 'Partly done' })
        else toast.success(msg)
        if (r?.counts) outbox.counts = { ...outbox.counts, ...r.counts }
        this.selected = []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not do that'))
      } finally {
        this.bulkBusy = false
        refreshOutboxCounts()
        this.load({ quiet: true })
      }
    },
    // -------------------------------------------------- keyboard: j / k / Enter / x
    rowButtons() {
      return [...(this.$refs.list?.querySelectorAll('.obx-main') || [])]
    },
    focusRow(i) {
      const btns = this.rowButtons()
      if (!btns.length) return
      const n = Math.max(0, Math.min(btns.length - 1, i))
      btns[n].focus()
      btns[n].scrollIntoView({ block: 'nearest' })
      this.focusIndex = n
    },
    onListKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.focusRow(this.focusIndex + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.focusRow(this.focusIndex - 1)
      }
    },
    onDocKey(e) {
      if (this.openId || this.bulkRejectOpen || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      const t = e.target
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (document.querySelector('.ui-modal-backdrop, .cp-backdrop, [role=dialog][aria-modal=true]')) return
      if (e.key === 'j') {
        e.preventDefault()
        this.focusRow(this.focusIndex + 1)
      } else if (e.key === 'k') {
        e.preventDefault()
        this.focusRow(this.focusIndex < 0 ? 0 : this.focusIndex - 1)
      } else if (e.key === 'x' && this.selectable && this.focusIndex >= 0) {
        const it = this.items[this.focusIndex]
        if (it && this.selectableItem(it)) {
          e.preventDefault()
          this.toggle(it.id, !this.isSel(it.id))
        }
      }
    }
  }
}
</script>

<style scoped>
.crumb {
  color: inherit;
  text-decoration: none;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12.5px;
}
.m0 {
  margin: 0;
}
.tabular {
  font-variant-numeric: tabular-nums;
}
.obx-mb {
  margin-bottom: 16px;
}
.obx-sum {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.obx-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  text-align: left;
  box-shadow: var(--shadow-xs);
}
.obx-stat strong {
  font-size: 20px;
  line-height: 1;
  color: var(--warning);
}
.obx-stat small {
  color: var(--text-3);
}
.obx-stat.is-danger strong {
  color: var(--danger);
}
.obx-stat.is-warn strong {
  color: var(--warning);
}
.obx-stat.is-info strong {
  color: var(--info);
}
.obx-stat:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}
.obx-stat.on {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.obx-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.obx-tabs {
  max-width: 100%;
}
.count {
  margin-left: 2px;
  min-width: 18px;
  text-align: center;
}
.count.warn {
  background: var(--warning-soft);
  color: var(--warning);
  font-weight: 700;
}
.obx-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.obx-filters .ui-select {
  width: auto;
  max-width: 220px;
}
.obx-search {
  min-width: 220px;
}
.obx-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 13px;
}
.obx-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.obx-chip button {
  border: 0;
  background: transparent;
  color: inherit;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
}
.linkish {
  background: none;
  border: 0;
  padding: 0;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
.obx-bulk {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  padding: 8px 16px 8px 10px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-3);
}
.obx-bulk.has-sel {
  background: var(--accent-soft);
  color: var(--text);
}
.obx-bulk__text {
  flex: 1;
  min-width: 140px;
}
.obx-check {
  flex: none;
  width: 40px;
  min-height: 40px;
  display: grid;
  place-items: center;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.obx-check:hover {
  background: var(--surface-hover);
}
.obx-check input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}
.obx-list {
  list-style: none;
  margin: 0;
  padding: 6px;
}
.obx-row {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  border-radius: var(--radius-sm);
  padding-left: 4px;
}
.obx-row + .obx-row {
  border-top: 1px solid var(--border);
}
.obx-row .obx-check {
  margin-top: 12px;
}
.obx-row.is-sel {
  background: var(--accent-soft);
}
.obx-row.is-open {
  box-shadow: inset 3px 0 0 var(--accent);
}
.obx-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 10px;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-sm);
  font: inherit;
}
.obx-main:hover {
  background: var(--surface-hover);
}
.obx-row.is-sel .obx-main:hover {
  background: transparent;
}
.obx-main:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.obx-ico {
  position: relative;
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 16px;
  background: var(--accent-soft);
  color: var(--accent);
}
.obx-ico.tone-warning {
  background: var(--warning-soft);
  color: var(--warning);
}
.obx-ico.tone-success {
  background: var(--success-soft);
  color: var(--success);
}
.obx-ico.tone-info {
  background: var(--info-soft);
  color: var(--info);
}
.obx-ico.tone-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.obx-ico__chan {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10px;
  background: var(--surface);
  color: var(--text-2);
  border: 1px solid var(--border);
}
.obx-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.obx-title {
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.obx-line {
  font-size: 13px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.obx-kind {
  font-weight: 600;
}
.obx-line--meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  white-space: normal;
  color: var(--text-3);
  font-size: 12.5px;
}
.obx-rec {
  color: var(--text-2);
}
.obx-amt {
  color: var(--text);
  font-weight: 600;
}
.obx-why {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.obx-snip {
  font-size: 12.5px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.obx-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 3px;
  align-items: center;
}
.obx-flags .ui-badge {
  height: auto;
  min-height: 24px;
  padding-top: 3px;
  padding-bottom: 3px;
  white-space: normal;
  max-width: 100%;
  text-align: left;
  line-height: 1.35;
}
.obx-reason {
  font-size: 12.5px;
  color: var(--text-2);
}
.obx-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  max-width: 200px;
  text-align: right;
}
.obx-wait {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  color: var(--text-2);
}
.st-pending .obx-wait {
  color: var(--warning);
}
.obx-due,
.obx-by {
  font-size: 12px;
}
.obx-more {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-top: 1px solid var(--border);
}
.obx-keys {
  margin: 0;
  padding: 8px 16px 12px;
}
kbd {
  font-family: var(--font-sans);
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
}
.obx-rej {
  max-width: 480px;
}
@media (max-width: 900px) {
  .obx-filters {
    width: 100%;
  }
  .obx-search {
    flex: 1 1 100%;
    min-width: 0;
  }
  .obx-filters .ui-select {
    flex: 1 1 0;
    max-width: none;
    min-width: 0;
  }
}
@media (max-width: 640px) {
  .obx-hbtn span {
    display: none;
  }
  .obx-hbtn {
    min-width: 44px;
    min-height: 44px;
  }
  .obx-sum {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .obx-stat {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .obx-bar {
    padding: 12px;
  }
  .obx-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    width: 100%;
  }
  .obx-tabs .ui-tab {
    min-height: 44px;
  }
  .obx-filters .ui-select {
    flex: 1 1 calc(50% - 8px);
  }
  .obx-filters .ui-select:last-child {
    flex-basis: 100%;
  }
  .obx-chip button {
    width: 44px;
    height: 44px;
  }
  .obx-check {
    width: 44px;
    min-height: 44px;
  }
  .obx-check input {
    width: 22px;
    height: 22px;
  }
  .obx-row .obx-check {
    margin-top: 10px;
  }
  .obx-main {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 8px 12px 4px;
  }
  .obx-ico {
    width: 38px;
    height: 38px;
    font-size: 15px;
  }
  .obx-body {
    flex-basis: calc(100% - 52px);
  }
  .obx-title,
  .obx-line:not(.obx-line--meta) {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .obx-side {
    width: 100%;
    max-width: none;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    padding-left: 48px;
    text-align: left;
  }
  .obx-bulk {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--surface);
  }
  .obx-bulk.has-sel {
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }
  .obx-bulk .ui-btn {
    min-height: 44px;
  }
  .obx-more .ui-btn {
    min-height: 44px;
  }
  .obx-keys {
    display: none;
  }
}
</style>
