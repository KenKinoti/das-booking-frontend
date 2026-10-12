<template>
  <div class="tr" data-testid="bar-transfers">
    <div class="toolbar">
      <select v-model="loc" class="ui-select" aria-label="Location">
        <option value="">All locations</option>
        <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <div class="ui-tabs st-tabs" role="tablist" aria-label="Status">
        <button v-for="s in tabs" :key="s.key" type="button" class="ui-tab" :class="{ 'is-active': status === s.key }" role="tab" :aria-selected="status === s.key" :data-status="s.key" @click="status = s.key">{{ s.label }}<span v-if="s.n" class="count" :class="s.tone">{{ s.n }}</span></button>
      </div>
      <div class="end">
        <button v-if="perm.create && bars.length" type="button" class="ui-btn ui-btn--sm" data-testid="tr-topup-open" @click="$emit('new', { topUp: true, to_location_id: topUpTo })"><i class="fa-solid fa-arrow-up-wide-short"></i><span class="hide-xs"> Top up to par</span></button>
        <button v-if="perm.create" type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-testid="tr-new" @click="$emit('new', {})"><i class="fa-solid fa-plus"></i> {{ perm.edit ? 'New transfer' : 'Request stock' }}</button>
      </div>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="loading && !all.length" class="sk"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 52px"></div></div>
    <div v-else-if="!shown.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-right-left"></i></div>
      <h3>{{ status === 'open' ? 'Nothing waiting' : 'No transfers here' }}</h3>
      <p>Bars request stock from the store; the store keeper issues it and the bar confirms what arrived — any difference is recorded.</p>
    </div>
    <ul v-else class="list">
      <li v-for="t in shown" :key="t.id" class="tcard" :data-transfer="t.number" @click="$emit('open', t.id)">
        <div class="tcard__route">
          <strong>{{ t.from_location || locationName(t.from_location_id) }}</strong>
          <i class="fa-solid fa-arrow-right"></i>
          <strong>{{ t.to_location || locationName(t.to_location_id) }}</strong>
        </div>
        <div class="tcard__meta">
          <span class="ui-badge" :class="meta(t).badge">{{ meta(t).label }}</span>
          <span v-if="t.has_discrepancy" class="ui-badge ui-badge--danger">Difference</span>
          <span>{{ t.number }}</span>
          <span>{{ t.line_count || (t.lines || []).length }} item{{ (t.line_count || (t.lines || []).length) === 1 ? '' : 's' }}</span>
          <span v-if="perm.approve && has(t.value)">{{ money(t.value) }}</span>
          <span>{{ when(t) }}</span>
          <span v-if="t.requested_by_name">by {{ t.requested_by_name }}</span>
        </div>
        <div class="tcard__lines">{{ linesText(t) }}</div>
        <div class="tcard__act" @click.stop>
          <button v-if="t.status === 'requested' && perm.edit" type="button" class="ui-btn ui-btn--primary ui-btn--sm" :data-testid="'issue-' + t.number" @click="$emit('open', t.id)"><i class="fa-solid fa-dolly"></i> Issue</button>
          <button v-else-if="t.status === 'issued' && perm.create" type="button" class="ui-btn ui-btn--primary ui-btn--sm" :data-testid="'receive-' + t.number" @click="$emit('open', t.id)"><i class="fa-solid fa-box-open"></i> Receive</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { bar, money, has, locationName, barsOnly, defaultBarId, myLocation } from './barContext'
import { barApi, TRANSFER_STATUS, statusMeta } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime, formatDate } from '@/utils/format'

export default {
  name: 'BarTransfers',
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 }
  },
  emits: ['new', 'open'],
  data() {
    return { bar, loc: '', status: 'open', all: [], loading: false, error: '' }
  },
  computed: {
    bars() {
      return barsOnly().length ? barsOnly() : bar.locations.filter((l) => l.type !== 'store')
    },
    topUpTo() {
      const mine = myLocation()
      return this.bars.some((b) => b.id === mine) ? mine : defaultBarId() || this.bars[0]?.id || ''
    },
    tabs() {
      const n = (fn) => this.all.filter(fn).length
      return [
        { key: 'open', label: 'Open', n: n((t) => t.status === 'requested' || t.status === 'issued'), tone: 'warn' },
        { key: 'requested', label: 'Requested', n: n((t) => t.status === 'requested') },
        { key: 'issued', label: 'On the way', n: n((t) => t.status === 'issued') },
        { key: 'received', label: 'Done' },
        { key: 'cancelled', label: 'Cancelled' },
        { key: 'all', label: 'All' }
      ]
    },
    shown() {
      const s = this.status
      return this.all.filter((t) => {
        if (s === 'all') return true
        if (s === 'open') return t.status === 'requested' || t.status === 'issued'
        if (s === 'received') return t.status === 'received' || t.status === 'completed' || t.status === 'direct' || (t.mode === 'direct' && t.status !== 'cancelled')
        return t.status === s
      })
    }
  },
  watch: {
    loc() {
      this.load()
    },
    version() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    money,
    has,
    locationName,
    meta(t) {
      if (t.mode === 'direct' && t.status === 'received') return { label: 'Moved', badge: 'ui-badge--success' }
      return statusMeta(TRANSFER_STATUS, t.status)
    },
    when(t) {
      const at = t.received_at || t.issued_at || t.created_at
      return at ? formatDateTime(at) : formatDate(t.business_date)
    },
    linesText(t) {
      const ls = t.lines || []
      const txt = ls
        .slice(0, 4)
        .map((l) => `${l.issued_text && t.status !== 'requested' ? l.issued_text : l.requested_text || ''} ${l.name || ''}`.trim())
        .join(' · ')
      return ls.length > 4 ? `${txt} · +${ls.length - 4} more` : txt
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.all = await barApi.transfers({ location_id: this.loc, limit: 300 })
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the transfers')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.tr {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.toolbar .ui-select {
  width: 190px;
}
.st-tabs {
  overflow-x: auto;
  max-width: 100%;
}
.end {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.count.warn {
  background: var(--warning-soft);
  color: var(--warning);
}
.sk {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tcard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'route act' 'meta act' 'lines act';
  gap: 4px 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s;
}
.tcard:hover {
  border-color: var(--border-strong);
}
.tcard__route {
  grid-area: route;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.tcard__route i {
  color: var(--text-3);
  font-size: 12px;
}
.tcard__meta {
  grid-area: meta;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
  font-size: 12.5px;
  color: var(--text-3);
}
.tcard__lines {
  grid-area: lines;
  font-size: 13px;
  color: var(--text-2);
  overflow-wrap: anywhere;
}
.tcard__act {
  grid-area: act;
  align-self: center;
}
@media (max-width: 640px) {
  .toolbar .ui-select {
    flex: 1 1 160px;
  }
  .end {
    margin-left: 0;
  }
  .tcard {
    grid-template-columns: 1fr;
    grid-template-areas: 'route' 'meta' 'lines' 'act';
  }
  .tcard__act {
    justify-self: start;
  }
}
@media (max-width: 480px) {
  .hide-xs {
    display: none;
  }
}
</style>
