<template>
  <FbSection id="league" title="League position" :subtitle="subtitle">
    <template v-if="a.source_check" #actions>
      <SourceBadge :checks="srcChecks" title="Source check · league table" test-key="standings" />
    </template>
    <div v-if="!st || !st.table || !st.table.length" class="fb-muted">No league table for this competition (cup or not covered).</div>
    <div v-else class="fbl2">
      <div class="fb-fig">
        <div class="fb-fig__title">Table around both teams</div>
        <div class="fb-fig__sub">{{ st.source }} · as of {{ fmtDateTime(st.as_of, tz) }}</div>
        <div class="fb-scroll" style="margin-top: 6px">
          <table class="fb-table fbl2__t" data-test="fb-mini-table">
            <thead>
              <tr>
                <th class="num">#</th>
                <th>Team</th>
                <th class="num">P</th>
                <th class="num">W</th>
                <th class="num">D</th>
                <th class="num">L</th>
                <th class="num">Goals</th>
                <th class="num">GD</th>
                <th class="num">Pts</th>
                <th>Form</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="r in mini" :key="r.gap ? 'gap' + r.rank : r.team_id">
                <tr v-if="r.gap" class="fbl2__gap">
                  <td colspan="10" aria-hidden="true">⋯</td>
                </tr>
                <tr v-else :class="{ 'is-team': r.side }" :style="r.side ? { boxShadow: `inset 3px 0 0 ${r.side === 'home' ? 'var(--fb-home)' : 'var(--fb-away)'}` } : null" :data-team="r.team_id" :data-rank="r.rank">
                  <td class="num">{{ r.rank }}</td>
                  <td class="fbl2__name">
                    {{ r.name }}
                    <span v-if="zone(r)" class="fbl2__zone fb-muted" :title="r.description">· {{ zone(r) }}</span>
                  </td>
                  <td class="num">{{ r.played }}</td>
                  <td class="num">{{ r.won }}</td>
                  <td class="num">{{ r.drawn }}</td>
                  <td class="num">{{ r.lost }}</td>
                  <td class="num">{{ r.gf }}:{{ r.ga }}</td>
                  <td class="num">{{ r.gd > 0 ? '+' : '' }}{{ r.gd }}</td>
                  <td class="num"><strong>{{ r.points }}</strong></td>
                  <td>
                    <span class="fbl2__form"
                      ><span v-for="(c, j) in (r.form || '').split('')" :key="j" class="fb-res fbl2__mini" :class="'fb-res--' + c">{{ c }}</span></span
                    >
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <FbFigure
        title="Position through the season"
        subtitle="1st at the top"
        :legend="[
          { name: f.home.name, color: 'var(--fb-home)', kind: 'line' },
          { name: f.away.name, color: 'var(--fb-away)', kind: 'line' }
        ]"
        :table="histTable"
        chart-id="position-history"
      >
        <FbLine
          :series="histSeries"
          :height="240"
          y-invert
          :y-domain="[1, size]"
          :y-ticks="yTicks"
          :format-y="(v) => ordinal(v)"
          :format-x="(x) => 'MD ' + x"
          :format-x-tip="(x) => 'Matchday ' + x"
          :format-value="(v, s, p) => `${ordinal(v)} · ${p.points} pts`"
          :end-labels="histEnd"
          y-title="Position"
          aria-label="League position after each matchday for both teams"
        />
        <template #foot>{{ ph.source }}</template>
      </FbFigure>
    </div>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import SourceBadge from './SourceBadge.vue'
import { checksFor } from './srccheck'
import FbFigure from '../charts/FbFigure.vue'
import FbLine from '../charts/FbLine.vue'
import { fmtDateTime } from '../fb'

export default {
  name: 'LeagueSection',
  components: { FbSection, FbFigure, FbLine, SourceBadge },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  computed: {
    srcChecks() {
      return checksFor(this.a.source_check, 'standings', this.tz)
    },
    f() {
      return this.a.fixture
    },
    st() {
      return this.a.standings
    },
    size() {
      return this.st?.table_size || this.st?.table?.length || 20
    },
    subtitle() {
      if (!this.st?.home) return ''
      return `${this.f.home.name} ${this.ordinal(this.st.home.rank)} (${this.st.home.points} pts) · ${this.f.away.name} ${this.ordinal(this.st.away.rank)} (${this.st.away.points} pts) of ${this.size}`
    },
    mini() {
      const t = [...(this.st?.table || [])].sort((x, y) => x.rank - y.rank)
      const ids = { [this.st?.home?.team_id]: 'home', [this.st?.away?.team_id]: 'away' }
      const keep = new Set()
      t.forEach((r, i) => {
        if (ids[r.team_id]) for (let k = i - 2; k <= i + 2; k++) if (k >= 0 && k < t.length) keep.add(k)
      })
      keep.add(0)
      const out = []
      let prev = -1
      ;[...keep]
        .sort((x, y) => x - y)
        .forEach((i) => {
          if (prev >= 0 && i - prev > 1) out.push({ gap: true, rank: i })
          out.push({ ...t[i], side: ids[t[i].team_id] || null })
          prev = i
        })
      if (prev < t.length - 1) out.push({ gap: true, rank: t.length })
      return out
    },
    ph() {
      return this.st?.position_history || { home: [], away: [] }
    },
    histSeries() {
      const mk = (pts, key, name, color) => ({ key, name, color, points: (pts || []).map((p) => ({ x: p.played, y: p.rank, points: p.points, date: p.date })) })
      return [mk(this.ph.home, 'home', this.f.home.name, 'var(--fb-home)'), mk(this.ph.away, 'away', this.f.away.name, 'var(--fb-away)')]
    },
    histEnd() {
      return this.histSeries
        .map((s) => {
          const l = s.points[s.points.length - 1]
          return l ? { key: s.key, text: `${s.name.split(' ')[0]} ${this.ordinal(l.y)}` } : null
        })
        .filter(Boolean)
    },
    yTicks() {
      const n = this.size
      const step = n > 12 ? 5 : n > 6 ? 2 : 1
      const t = [1]
      for (let v = step; v <= n; v += step) if (v !== 1) t.push(v)
      if (t[t.length - 1] !== n) t.push(n)
      return t
    },
    histTable() {
      const h = this.ph.home || []
      const w = this.ph.away || []
      const n = Math.max(h.length, w.length)
      const rows = []
      for (let i = 0; i < n; i++) rows.push([h[i]?.played ?? w[i]?.played, h[i] ? `${this.ordinal(h[i].rank)} (${h[i].points} pts)` : '—', w[i] ? `${this.ordinal(w[i].rank)} (${w[i].points} pts)` : '—'])
      return { cols: [{ label: 'Matchday', num: true }, { label: this.f.home.name }, { label: this.f.away.name }], rows }
    }
  },
  methods: {
    fmtDateTime,
    ordinal(n) {
      const s = ['th', 'st', 'nd', 'rd']
      const v = n % 100
      return n + (s[(v - 20) % 10] || s[v] || s[0])
    },
    zone(r) {
      const d = (r.description || '').toLowerCase()
      if (!d) return ''
      if (d.includes('relegation')) return 'relegation'
      if (d.includes('champions league')) return 'Champions League'
      if (d.includes('europa')) return 'Europa'
      if (d.includes('conference')) return 'Conference'
      if (d.includes('promotion')) return 'promotion'
      return ''
    }
  }
}
</script>

<style scoped>
.fbl2 {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 24px;
}
.fbl2__t tr.is-team td {
  background: var(--surface-2);
  font-weight: 600;
}
.fbl2__gap td {
  text-align: center;
  color: var(--text-3);
  padding: 2px;
  font-size: 12px;
}
.fbl2__name {
  white-space: nowrap;
}
.fbl2__zone {
  font-size: 11px;
  font-weight: 500;
}
.fbl2__form {
  display: inline-flex;
  gap: 2px;
}
.fbl2__mini {
  width: 16px;
  height: 16px;
  font-size: 9.5px;
  border-radius: 4px;
}
@media (max-width: 1000px) {
  .fbl2 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
