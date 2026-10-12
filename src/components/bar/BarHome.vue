<template>
  <div class="hm" data-testid="bar-home">
    <div class="hm__bar">
      <label class="ui-label" for="hm-loc">My bar</label>
      <select id="hm-loc" v-model="loc" class="ui-select" data-testid="home-loc">
        <option v-for="l in places" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
    </div>

    <div class="acts">
      <button v-if="openCount" type="button" class="act act--main" data-testid="home-continue" @click="$router.push(`/bar-stock/count/${openCount.id}`)">
        <i class="fa-solid fa-clipboard-check"></i>
        <span><strong>Continue counting</strong><small>{{ openCount.number }} · {{ openCount.counted_count || 0 }} of {{ openCount.line_count || 0 }} counted</small></span>
      </button>
      <button v-else-if="perm.create" type="button" class="act act--main" data-testid="home-count" @click="$emit('start-count')">
        <i class="fa-solid fa-clipboard-check"></i>
        <span><strong>Count stock</strong><small>End-of-night or spot count</small></span>
      </button>
      <button v-if="perm.create" type="button" class="act" data-testid="home-request" @click="$emit('request', { to_location_id: loc })">
        <i class="fa-solid fa-hand-holding-droplet"></i>
        <span><strong>Request stock</strong><small>From the store</small></span>
      </button>
      <button v-if="perm.create" type="button" class="act" data-testid="home-topup" @click="$emit('request', { to_location_id: loc, topUp: true })">
        <i class="fa-solid fa-arrow-up-wide-short"></i>
        <span><strong>Top up to par</strong><small>What the bar is short of</small></span>
      </button>
      <button v-if="perm.create" type="button" class="act" data-testid="home-wastage" @click="$emit('wastage')">
        <i class="fa-solid fa-wine-glass-empty"></i>
        <span><strong>Log wastage</strong><small>Breakage, spill, comp</small></span>
      </button>
    </div>

    <section v-if="incoming.length" class="blk" data-testid="home-incoming">
      <h3>On the way to {{ locName }}</h3>
      <ul class="rows">
        <li v-for="t in incoming" :key="t.id">
          <span><strong>{{ t.number }}</strong><small>{{ t.line_count }} item{{ t.line_count === 1 ? '' : 's' }} from {{ t.from_location }} · {{ t.status === 'issued' ? 'issued — check what arrived' : 'requested' }}</small></span>
          <button v-if="t.status === 'issued'" type="button" class="ui-btn ui-btn--primary ui-btn--sm" :data-testid="'home-receive-' + t.number" @click="$emit('open-transfer', t.id)">Receive</button>
          <span v-else class="ui-badge ui-badge--info">Requested</span>
        </li>
      </ul>
    </section>

    <section class="blk">
      <div class="blk__head">
        <h3>Stock at {{ locName }}</h3>
        <label class="ui-switch"><input v-model="lowOnly" type="checkbox" /><span>Low only</span></label>
      </div>
      <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      <div v-else-if="loading && !items.length" class="ui-skeleton" style="height: 160px"></div>
      <div v-else-if="!shown.length" class="ui-empty small"><p>{{ lowOnly ? 'Nothing is low here.' : 'No stock items here yet.' }}</p></div>
      <ul v-else class="rows stock">
        <li v-for="it in shown" :key="it.product_id">
          <span><strong>{{ it.name }}</strong><small>{{ categoryLabel(it.category) }}</small></span>
          <span class="q" :class="{ low: it.low }">{{ it.on_hand_text || qtyText(it.on_hand, it) }}<span v-if="it.low" class="ui-badge ui-badge--warning">Low</span></span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
import { bar, myLocation, setMyLocation, defaultBarId, locationName } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { qtyText, categoryLabel } from '@/utils/barUnits'

// "My bar": the bartender's home — count, request stock, log wastage.
export default {
  name: 'BarHome',
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 }
  },
  emits: ['start-count', 'request', 'wastage', 'open-transfer', 'go'],
  data() {
    const places = bar.locations.filter((l) => l.type !== 'store').length ? bar.locations.filter((l) => l.type !== 'store') : bar.locations
    const mine = myLocation()
    return {
      places,
      loc: places.some((l) => l.id === mine) ? mine : places.find((l) => l.id === defaultBarId())?.id || places[0]?.id || '',
      items: [],
      counts: [],
      transfers: [],
      lowOnly: false,
      loading: false,
      error: ''
    }
  },
  computed: {
    locName() {
      return locationName(this.loc)
    },
    openCount() {
      return this.counts.find((c) => c.status === 'draft') || null
    },
    incoming() {
      return this.transfers.filter((t) => t.to_location_id === this.loc && (t.status === 'requested' || t.status === 'issued'))
    },
    shown() {
      const list = this.lowOnly ? this.items.filter((it) => it.low) : this.items
      return list.slice().sort((a, b) => Number(b.low) - Number(a.low) || String(a.name).localeCompare(String(b.name)))
    }
  },
  watch: {
    loc(v) {
      setMyLocation(v)
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
    qtyText,
    categoryLabel,
    async load() {
      if (!this.loc) return
      this.loading = true
      this.error = ''
      try {
        const [items, counts, transfers] = await Promise.all([
          barApi.items({ location_id: this.loc }),
          barApi.counts({ location_id: this.loc, status: 'draft' }).catch(() => []),
          barApi.transfers({ location_id: this.loc, status: 'open' }).catch(() => [])
        ])
        this.items = items
        this.counts = counts
        this.transfers = transfers
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the bar')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.hm {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hm__bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hm__bar .ui-label {
  margin: 0;
  font-weight: 600;
}
.hm__bar .ui-select {
  width: auto;
  min-width: 200px;
  font-weight: 600;
}
.acts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.act {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  min-height: 76px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.act:hover {
  border-color: var(--accent);
}
.act > i {
  font-size: 22px;
  width: 30px;
  text-align: center;
  color: var(--accent);
}
.act span {
  display: flex;
  flex-direction: column;
}
.act small {
  color: var(--text-3);
  font-size: 12.5px;
}
.act--main {
  background: var(--accent-soft);
  border-color: var(--accent);
}
.blk {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.blk__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.blk h3 {
  font-size: 14.5px;
  margin: 0;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.rows li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid var(--border);
}
.rows li > span:first-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.rows small {
  font-size: 12px;
  color: var(--text-3);
}
.q {
  font-variant-numeric: tabular-nums;
  text-align: right;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}
.q.low {
  color: var(--warning);
  font-weight: 600;
}
@media (max-width: 480px) {
  .acts {
    grid-template-columns: 1fr 1fr;
  }
  .act {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
  }
  .hm__bar .ui-select {
    flex: 1;
    min-width: 0;
  }
}
</style>
