<template>
  <FbSection id="odds" title="Odds" :subtitle="subtitle">
    <template #actions>
      <select v-model="groupKey" class="ui-select fbo__sel" aria-label="Market" data-test="fb-odds-market">
        <option v-for="g in groups" :key="g.key" :value="g.key">{{ g.label }}</option>
      </select>
    </template>
    <div v-if="!groups.length" class="fb-muted">No bookmaker prices for this match yet.</div>
    <template v-else>
      <div class="fb-scroll">
        <table class="fb-table fbo__t" data-test="fb-odds-table">
          <thead>
            <tr>
              <th>Bookmaker</th>
              <th v-for="s in group.sels" :key="s.selection" class="num">{{ selHead(s) }}</th>
              <th class="num" title="The bookmaker's built-in margin on this market: sum of 1/price − 1">Margin</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr class="fbo__fair">
              <td>
                <strong>Fair odds</strong> <span class="fb-muted fb-small">{{ market.fair_source }}</span>
              </td>
              <td v-for="s in group.sels" :key="s.selection" class="num">{{ s.fair_p ? odds(1 / s.fair_p) : '—' }}</td>
              <td class="num">0%</td>
              <td class="fb-muted fb-small">margin removed</td>
            </tr>
            <tr v-for="b in books" :key="b.id" :data-book="b.key" :data-source="b.source">
              <td>
                <span class="fbo__book">{{ b.title }}</span>
                <span v-if="b.sharp" class="fb-pill fb-pill--info" title="Sharp bookmaker: low margin, prices hard to beat">sharp</span>
                <span v-if="b.kenya" class="fb-pill" title="Operates in Kenya (international prices can differ from the Kenyan site)">KE</span>
                <span class="fb-muted fb-small fbo__src">{{ srcLabel(b.source) }}</span>
              </td>
              <td v-for="s in group.sels" :key="s.selection" class="num" :class="{ 'fbo__best': isBest(s, b) }" :data-best="isBest(s, b) ? '1' : null">
                <template v-if="b.prices[s.selection] != null">
                  {{ odds(b.prices[s.selection]) }}<span v-if="isBest(s, b)" class="fbo__bestmark" aria-label="best price">best</span>
                </template>
                <template v-else>—</template>
              </td>
              <td class="num">{{ b.margin == null ? '—' : pct(b.margin) }}</td>
              <td class="fb-small" :class="b.stale ? 'fb-neg' : 'fb-muted'">
                {{ b.updated_at ? ago(b.updated_at, now) : b.fetched_at ? 'typed ' + ago(b.fetched_at, now) : '—' }}<template v-if="b.stale"> · stale</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="fb-muted fb-small" style="margin: 6px 0 0">Best price per selection is marked. Bookmakers with lower margins give more back. Betika (KE) comes from OddsPapi when it prices the match; SportPesa and Odibets aren't carried by any data provider — type their prices into the price check.</p>

      <FbFigure
        v-if="moveSeries.length"
        style="margin-top: 18px"
        title="Line movement"
        :subtitle="`${moveBook} · price over time (lower = more money for that outcome)`"
        :legend="moveSeries.length > 1 ? moveSeries.map((s) => ({ name: s.name, color: s.color, kind: 'line' })) : null"
        :table="moveTable"
        chart-id="line-movement"
      >
        <div class="fbo__mvctl">
          <select v-if="moveBooks.length > 1" v-model="moveBookKey" class="ui-select" aria-label="Bookmaker for line movement">
            <option v-for="b in moveBooks" :key="b.key" :value="b.key">{{ b.title }}</option>
          </select>
          <div v-if="twoWay" class="fb-seg" role="radiogroup" aria-label="Side">
            <button v-for="s in group.sels" :key="s.selection" type="button" role="radio" :aria-checked="moveSide === s.selection" :class="{ 'is-on': moveSide === s.selection }" @click="moveSide = s.selection">
              {{ selHead(s) }}
            </button>
          </div>
        </div>
        <FbLine
          :series="moveSeries"
          :height="220"
          :format-x="(x) => fmtShort(x)"
          :format-x-tip="(x) => fmtDateTime(new Date(x).toISOString(), tz)"
          :format-y="(v) => v.toFixed(2)"
          :format-value="(v) => v.toFixed(2)"
          :tip-note="moveNote"
          :end-labels="moveEnd"
          aria-label="Bookmaker price over time"
        />
      </FbFigure>
      <p v-else class="fb-muted fb-small" style="margin-top: 14px">No price history for this market yet: movement appears after a second odds snapshot.</p>
    </template>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbLine from '../charts/FbLine.vue'
import { odds, pct, spct, ago, fmtDateTime, line, marketLabel } from '../fb'

const KENYA = ['sportpesa', 'betika', 'betika_ke', 'odibets', 'betway', '1xbet', 'mozzartbet', 'shabiki', 'sportybet', 'betin', 'bangbet', '22bet', 'melbet', 'dafabet', 'helabet']
const ORDER = { '1x2': 0, dc: 1, dnb: 2, ou: 3, btts: 4, ah: 5 }

export default {
  name: 'OddsSection',
  components: { FbSection, FbFigure, FbLine },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' },
    now: { type: String, default: '' }
  },
  data() {
    return { groupKey: '1x2|', moveBookKey: 'pinnacle|apifootball', moveSide: '' }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    market() {
      return this.a.market || {}
    },
    subtitle() {
      return `${this.market.books || 0} bookmakers · prices as of ${fmtDateTime(this.market.as_of, this.tz)}${this.market.closing ? ' · closing prices' : ''}`
    },
    groups() {
      const by = new Map()
      for (const s of this.market.selections || []) {
        const key = `${s.market}|${s.line == null ? '' : s.line}`
        if (!by.has(key)) by.set(key, { key, market: s.market, line: s.line, sels: [] })
        by.get(key).sels.push(s)
      }
      return [...by.values()]
        .map((g) => ({ ...g, label: marketLabel(g.market).replace(' (1X2)', '') + (g.line != null ? ` ${g.market === 'ah' ? line(g.line) : g.line}` : '') }))
        .sort((x, y) => (ORDER[x.market] ?? 9) - (ORDER[y.market] ?? 9) || (x.line ?? 0) - (y.line ?? 0))
    },
    group() {
      return this.groups.find((g) => g.key === this.groupKey) || this.groups[0] || { sels: [] }
    },
    twoWay() {
      return !['1x2', 'dc', 'dnb', 'ah'].includes(this.group.market)
    },
    bookMeta() {
      const m = new Map()
      for (const b of this.market.bookmakers || []) m.set(`${b.key}|${b.source}`, b)
      return m
    },
    books() {
      const rows = new Map()
      for (const s of this.group.sels) {
        for (const p of s.prices || []) {
          const id = `${p.bookmaker}|${p.source}`
          if (!rows.has(id)) {
            const bm = this.bookMeta.get(id) || {}
            rows.set(id, { id, key: p.bookmaker, title: p.title, source: p.source, prices: {}, updated_at: p.updated_at, fetched_at: p.fetched_at, stale: !!bm.stale, sharp: !!bm.sharp, kenya: KENYA.includes(p.bookmaker) })
          }
          rows.get(id).prices[s.selection] = p.price
        }
      }
      const n = this.group.sels.length
      return [...rows.values()]
        .map((r) => {
          const ps = Object.values(r.prices)
          return { ...r, margin: ps.length === n && n > 1 ? ps.reduce((t, p) => t + 1 / p, 0) - 1 : null }
        })
        .sort((x, y) => (x.margin ?? 9) - (y.margin ?? 9))
    },
    moveBooks() {
      const seen = new Map()
      for (const m of this.market.movement || []) {
        if (m.market !== this.group.market || String(m.line ?? '') !== String(this.group.line ?? '')) continue
        const key = `${m.bookmaker}|${m.source}`
        if (!seen.has(key)) seen.set(key, { key, title: (this.bookMeta.get(key)?.title || m.bookmaker) + (m.source === 'oddsapi' ? ' (The Odds API)' : m.source === 'oddspapi' ? ' (OddsPapi)' : '') })
      }
      return [...seen.values()]
    },
    moveBook() {
      return (this.moveBooks.find((b) => b.key === this.moveBookKey) || this.moveBooks[0] || {}).title || ''
    },
    moveEntries() {
      const key = this.moveBooks.some((b) => b.key === this.moveBookKey) ? this.moveBookKey : this.moveBooks[0]?.key
      return (this.market.movement || []).filter((m) => `${m.bookmaker}|${m.source}` === key && m.market === this.group.market && String(m.line ?? '') === String(this.group.line ?? ''))
    },
    moveSeries() {
      const colorOf = (sel) => ({ home: 'var(--fb-home)', '1x': 'var(--fb-home)', draw: 'var(--fb-draw)', '12': 'var(--fb-draw)', away: 'var(--fb-away)', x2: 'var(--fb-away)' })[sel] || 'var(--text-2)'
      let list = this.moveEntries
      if (this.twoWay) {
        const side = this.moveSide || this.group.sels[0]?.selection
        list = list.filter((m) => m.selection === side)
      }
      const order = (this.group.sels || []).map((s) => s.selection)
      return [...list]
        .sort((x, y) => order.indexOf(x.selection) - order.indexOf(y.selection))
        .map((m) => ({
          key: m.selection,
          name: this.selHead({ selection: m.selection }),
          color: colorOf(m.selection),
          step: true,
          dots: true,
          extendTo: new Date(this.market.as_of || this.now || Date.now()).getTime(),
          open: m.open,
          last: m.last,
          change: m.change_pct,
          points: m.points.map((p) => ({ x: new Date(p.at).getTime(), y: p.price }))
        }))
    },
    moveEnd() {
      return this.moveSeries.map((s) => ({ key: s.key, text: `${s.name.split(' ')[0]} ${s.last.toFixed(2)}` }))
    },
    moveTable() {
      const rows = []
      for (const s of this.moveSeries) for (const p of s.points) rows.push([s.name, fmtDateTime(new Date(p.x).toISOString(), this.tz), odds(p.y)])
      return { cols: [{ label: 'Selection' }, { label: 'Time' }, { label: 'Price', num: true }], rows }
    }
  },
  watch: {
    groupKey() {
      this.moveSide = ''
    }
  },
  methods: {
    odds,
    pct,
    ago,
    fmtDateTime,
    selHead(s) {
      const h = this.f.home.name
      const w = this.f.away.name
      const sel = s.selection
      switch (this.group.market) {
        case '1x2':
          return sel === 'home' ? h : sel === 'away' ? w : 'Draw'
        case 'dc':
          return sel === '1x' ? '1X' : sel === 'x2' ? 'X2' : '12'
        case 'dnb':
        case 'ah':
          return sel === 'home' ? h : w
        case 'ou':
          return sel === 'over' ? 'Over' : 'Under'
        case 'btts':
          return sel === 'yes' ? 'Yes' : 'No'
      }
      return sel
    },
    srcLabel(src) {
      if (src.startsWith('manual')) return 'typed in'
      return src === 'oddsapi' ? 'The Odds API' : src === 'apifootball' ? 'API-Football' : src === 'oddspapi' ? 'OddsPapi' : src
    },
    isBest(s, b) {
      return s.best && b.prices[s.selection] != null && s.best.bookmaker === b.key && s.best.source === b.source
    },
    fmtShort(x) {
      return new Intl.DateTimeFormat(undefined, { timeZone: this.tz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(x))
    },
    moveNote(x) {
      const s = this.moveSeries.map((m) => `${m.name.split(' ')[0]} ${m.open.toFixed(2)}→${m.last.toFixed(2)} (${spct(m.change)})`).join(' · ')
      return x != null ? `Opened → latest: ${s}` : ''
    }
  }
}
</script>

<style scoped>
.fbo__sel {
  width: auto;
  min-width: 160px;
}
.fbo__t td {
  white-space: nowrap;
}
.fbo__book {
  font-weight: 600;
  margin-right: 4px;
}
.fbo__src {
  margin-left: 4px;
}
.fbo__t .fb-pill {
  height: 18px;
  font-size: 10.5px;
  padding: 0 6px;
}
.fbo__fair td {
  background: var(--surface-2);
}
.fbo__best {
  font-weight: 750;
}
.fbo__bestmark {
  display: inline-block;
  margin-left: 5px;
  padding: 0 5px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  background: var(--success-soft);
  color: var(--fb-good-text);
  vertical-align: 1px;
}
.fbo__mvctl {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.fbo__mvctl .ui-select {
  width: auto;
}
</style>
