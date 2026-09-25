<template>
  <section class="ui-card mk dviz">
    <div class="ui-card__head mk__head">
      <div class="mk__title">
        <h2><i class="fa-solid fa-globe"></i> Markets</h2>
        <span class="mk__sub">
          <template v-if="data">Updated {{ updatedAgo }} · refreshes every {{ refreshMinutes }} min</template>
          <template v-else-if="loading">Loading live prices…</template>
        </span>
      </div>
      <div class="ui-actions mk__actions">
        <label class="mk__base">
          <span>Base</span>
          <select v-model="base" class="ui-select ui-select--sm" aria-label="Base currency" @change="onBase">
            <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" type="button" title="Refresh" aria-label="Refresh market data" :disabled="loading" @click="load(true)">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
    </div>

    <div class="ui-card__body mk__body">
      <!-- loading skeleton -->
      <div v-if="loading && !data" class="fx-grid">
        <div v-for="i in 7" :key="i" class="fx-tile"><div class="ui-skeleton" style="height: 86px"></div></div>
      </div>

      <div v-else-if="error && !data" class="ui-alert ui-alert--warning">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>Market data couldn’t be loaded. {{ error }}</div>
      </div>

      <template v-else-if="data">
        <!-- FX -->
        <div v-if="fx" class="mk__section">
          <div class="mk__sechead">
            <h3>Exchange rates <span class="muted">· 1 {{ data.base }} buys</span></h3>
            <span v-if="fx.stale" class="ui-badge ui-badge--warning" :title="fx.error">Delayed</span>
            <span v-if="fx.as_of" class="mk__asof">As of {{ asOf(fx.as_of) }}</span>
          </div>
          <div v-if="!fx.available" class="mk__unavail">
            <i class="fa-solid fa-plug-circle-xmark"></i>
            <div>
              <strong>Live FX rates unavailable</strong>
              <small>{{ sourceNames(fx) }} could not be reached. Values will appear automatically when the source responds.</small>
            </div>
          </div>
          <div v-else class="fx-grid">
            <div v-for="q in fx.items" :key="q.symbol" class="fx-tile" :class="{ na: !q.available }">
              <div class="fx-tile__top">
                <span class="fx-pair">{{ data.base }}/{{ q.symbol }}</span>
                <DeltaBadge v-if="q.available && q.change_30d !== undefined && q.change_30d !== null" :value="q.change_30d" title="Change over 30 days" />
              </div>
              <div class="fx-rate">{{ q.available ? rate(q.price) : '—' }}</div>
              <div class="fx-name" :title="q.name">{{ q.name }}</div>
              <div class="fx-spark">
                <Sparkline v-if="q.spark && q.spark.length > 1" :values="q.spark" color="var(--viz-1)" :height="26" :aria-label="`${data.base}/${q.symbol} 30-day trend`" />
              </div>
              <div class="fx-foot">
                <span v-if="q.available">1 {{ q.symbol }} = {{ rate(q.inverse) }} {{ data.base }}</span>
                <span v-else>{{ q.note || 'Not available' }}</span>
              </div>
              <div class="fx-src" :title="q.source + (q.as_of ? ' · ' + asOf(q.as_of) : '')">{{ shortSource(q.source) }}<template v-if="q.as_of"> · {{ asOf(q.as_of) }}</template></div>
            </div>
          </div>
        </div>

        <div class="mk__cols">
          <div v-for="sec in others" :key="sec.key" class="mk__section">
            <div class="mk__sechead">
              <h3>{{ sec.title }}</h3>
              <span v-if="sec.stale" class="ui-badge ui-badge--warning" :title="sec.error">Delayed</span>
              <span v-if="sec.as_of" class="mk__asof">As of {{ asOf(sec.as_of) }}</span>
            </div>
            <div v-if="!sec.available" class="mk__unavail">
              <i class="fa-solid fa-plug-circle-xmark"></i>
              <div>
                <strong>{{ sec.title }} unavailable</strong>
                <small>{{ sourceNames(sec) }} could not be reached.</small>
              </div>
            </div>
            <ul v-else class="qlist">
              <li v-for="q in sec.items" :key="q.symbol" class="qrow">
                <div class="qrow__name">
                  <strong>{{ q.name }}</strong>
                  <small>{{ q.symbol }}<template v-if="q.unit"> · {{ q.unit }}</template></small>
                </div>
                <div class="qrow__spark">
                  <Sparkline v-if="q.spark && q.spark.length > 1" :values="q.spark" color="var(--viz-1)" :height="26" :aria-label="`${q.name} ${q.spark_span} trend`" />
                </div>
                <div class="qrow__px">
                  <strong>{{ q.available ? price(q.price, q.currency) : '—' }}</strong>
                  <DeltaBadge v-if="q.available && q.change_1d !== undefined && q.change_1d !== null" :value="q.change_1d" :title="q.kind === 'crypto' ? '24-hour change' : 'Daily change'" />
                  <small v-else-if="!q.available && q.note" class="muted">{{ q.note }}</small>
                </div>
              </li>
            </ul>
            <p v-if="sec.note && sec.available" class="mk__note">{{ sec.note }}</p>
          </div>
        </div>

        <div class="mk__sources">
          <span>Sources:</span>
          <a v-for="s in data.sources" :key="s.name" :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.name }}</a>
          <span v-if="data.disabled && data.disabled.includes('indices')" class="muted">· Equity indices can be enabled with an Alpha Vantage API key.</span>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import './dashviz.css'
import DeltaBadge from './DeltaBadge.vue'
import Sparkline from './charts/Sparkline.vue'
import { fetchMarket, loadPref, savePref, timeAgo } from './analytics'
import { apiErrorMessage } from '@/services/api'

const PREF = 'dash.marketBase'

export default {
  name: 'MarketsPanel',
  components: { DeltaBadge, Sparkline },
  props: {
    defaultBase: { type: String, default: '' }
  },
  data() {
    return {
      data: null,
      loading: false,
      error: '',
      base: loadPref(PREF, '') || this.defaultBase || orgCurrency(),
      timer: null,
      tick: 0,
      tickTimer: null
    }
  },
  computed: {
    currencies() {
      const list = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'KES', 'JPY', 'CNY']
      if (this.base && !list.includes(this.base)) list.unshift(this.base)
      return list
    },
    fx() {
      return this.data?.sections?.find((s) => s.key === 'fx')
    },
    others() {
      return (this.data?.sections || []).filter((s) => s.key !== 'fx')
    },
    refreshMinutes() {
      return Math.max(1, Math.round((this.data?.refresh_seconds || 900) / 60))
    },
    updatedAgo() {
      void this.tick
      return timeAgo(this.data?.generated_at)
    }
  },
  watch: {
    defaultBase(v) {
      if (v && !loadPref(PREF, '') && v !== this.base) {
        this.base = v
        this.load()
      }
    }
  },
  mounted() {
    this.load()
    this.tickTimer = setInterval(() => (this.tick += 1), 30000)
    document.addEventListener('visibilitychange', this.onVisible)
  },
  beforeUnmount() {
    clearTimeout(this.timer)
    clearInterval(this.tickTimer)
    document.removeEventListener('visibilitychange', this.onVisible)
  },
  methods: {
    async load() {
      clearTimeout(this.timer)
      this.loading = true
      try {
        this.data = await fetchMarket(this.base)
        this.error = ''
      } catch (e) {
        this.error = apiErrorMessage(e, 'Please try again later.')
      } finally {
        this.loading = false
        const secs = Math.max(60, this.data?.refresh_seconds || 900)
        this.timer = setTimeout(() => this.load(), secs * 1000)
      }
    },
    onVisible() {
      if (document.visibilityState !== 'visible' || !this.data) return
      const age = (Date.now() - new Date(this.data.generated_at).getTime()) / 1000
      if (age > (this.data.refresh_seconds || 900)) this.load()
    },
    onBase() {
      savePref(PREF, this.base)
      this.load()
    },
    rate(v) {
      const n = Number(v) || 0
      const digits = n >= 100 ? 2 : n >= 1 ? 4 : 5
      return new Intl.NumberFormat(undefined, { minimumFractionDigits: Math.min(digits, 2), maximumFractionDigits: digits }).format(n)
    },
    price(v, cur) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || this.data.base, maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v)
      } catch {
        return `${cur} ${v}`
      }
    },
    asOf(v) {
      if (!v) return ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v + 'T00:00:00'))
      }
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return v
      return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d)
    },
    shortSource(s) {
      if (!s) return ''
      if (s.includes('European Central Bank')) return 'ECB'
      if (s.includes('ExchangeRate-API')) return 'ExchangeRate-API'
      return s
    },
    sourceNames(sec) {
      return (sec.sources || []).map((s) => this.shortSource(s.name)).join(' and ') || 'The source'
    }
  }
}
</script>

<style scoped>
.mk__head {
  flex-wrap: wrap;
}

.mk__title h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mk__title h2 i {
  color: var(--accent);
  font-size: 14px;
}

.mk__sub {
  font-size: 12px;
  color: var(--text-3);
}

.mk__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mk__base {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-3);
  margin: 0;
}

.mk__base select {
  width: auto;
  height: 32px;
  padding-top: 0;
  padding-bottom: 0;
}

.mk__body {
  display: grid;
  gap: 22px;
}

.mk__section h3 {
  font-size: 13px;
  font-weight: 650;
  margin: 0;
  color: var(--text);
}

.mk__sechead {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.mk__asof {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--text-3);
}

.muted {
  color: var(--text-3);
  font-weight: 500;
}

.fx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 10px;
}

.fx-tile {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 12px 10px;
  background: var(--surface-2);
  min-width: 0;
}

.fx-tile.na {
  opacity: 0.7;
}

.fx-tile__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.fx-pair {
  font-size: 12px;
  font-weight: 650;
  color: var(--text-2);
  letter-spacing: 0.02em;
}

.fx-rate {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}

.fx-name {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fx-spark {
  height: 26px;
  margin: 8px 0 6px;
}

.fx-foot {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.fx-foot span:first-child {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fx-src {
  margin-top: 2px;
  font-size: 10.5px;
  color: var(--text-3);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mk__cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 22px;
}

.qlist {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.qrow {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(50px, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
}

.qrow + .qrow {
  border-top: 1px solid var(--border);
}

.qrow__name strong {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
}

.qrow__name small {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qrow__spark {
  height: 26px;
}

.qrow__px {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.qrow__px strong {
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}

.mk__note {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--text-3);
}

.mk__unavail {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-2);
}

.mk__unavail i {
  color: var(--text-3);
  margin-top: 3px;
}

.mk__unavail strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
}

.mk__unavail small {
  color: var(--text-3);
  font-size: 12px;
}

.mk__sources {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11.5px;
  color: var(--text-3);
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.mk__sources a {
  color: var(--text-2);
  text-decoration: underline;
  text-decoration-color: var(--border-strong);
  text-underline-offset: 2px;
}

.mk__sources a:hover {
  color: var(--accent);
}

@media (max-width: 520px) {
  .fx-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .qrow {
    grid-template-columns: minmax(0, 1fr) 60px auto;
    gap: 10px;
  }
}
</style>
