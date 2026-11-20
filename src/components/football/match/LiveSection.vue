<template>
  <FbSection id="live" :title="isLiveNow ? 'Live' : 'Match events'" :subtitle="subtitle" open-on-phone>
    <template #actions>
      <span v-if="isLiveNow" class="fb-pill fb-pill--live" data-test="fb-live-minute"><span class="fb-livedot"></span>{{ minuteText }}</span>
      <span v-else class="fb-pill">{{ L.status }}</span>
    </template>
    <!-- minute strip with goals -->
    <div class="fblv__strip" role="img" :aria-label="stripLabel">
      <div class="fblv__track">
        <i class="fblv__elapsed" :style="{ width: Math.min(100, (minute / span) * 100) + '%' }"></i>
        <i class="fblv__ht" :style="{ left: (45 / span) * 100 + '%' }"></i>
        <span
          v-for="(g, i) in goals"
          :key="i"
          class="fblv__goal"
          :class="'fblv__goal--' + g.side"
          :style="{ left: (Math.min(g.minute + (g.extra || 0), span) / span) * 100 + '%', background: g.side === 'home' ? 'var(--fb-home)' : 'var(--fb-away)' }"
          :title="`${g.minute}′ ${g.player} (${g.side === 'home' ? f.home.name : f.away.name})`"
        ></span>
      </div>
      <div class="fblv__ticks fb-muted"><span>0′</span><span :style="{ left: (45 / span) * 100 + '%' }">HT</span><span>{{ span }}′</span></div>
    </div>

    <div class="fblv__grid">
      <div>
        <div class="fb-fig__title">Events</div>
        <ol class="fblv__events" data-test="fb-live-events">
          <li v-for="(e, i) in events" :key="i" :class="'is-' + e.side" :data-type="e.type">
            <span class="fblv__min fb-num">{{ e.minute }}{{ e.extra ? '+' + e.extra : '' }}′</span>
            <i :class="icon(e)" aria-hidden="true"></i>
            <span class="fblv__what">
              <strong>{{ e.player || e.detail }}</strong>
              <span class="fblv__detail fb-muted fb-small">{{ e.detail }}<template v-if="e.assist"> · {{ e.type === 'subst' ? 'off ' : 'assist ' }}{{ e.assist }}</template> · {{ e.side === 'home' ? f.home.name : f.away.name }}</span>
            </span>
          </li>
          <li v-if="!events.length" class="fb-muted">No events yet.</li>
        </ol>
      </div>
      <div>
        <FbFigure
          title="Match statistics"
          :legend="[
            { name: f.home.name, color: 'var(--fb-home)' },
            { name: f.away.name, color: 'var(--fb-away)' }
          ]"
          :table="statTable"
          chart-id="live-stats"
        >
          <div class="fblv__stats" data-test="fb-live-stats">
            <div v-for="s in stats" :key="s.key" class="fblv__stat" :data-stat="s.key" role="img" :aria-label="`${s.label}: ${f.home.name} ${s.ht}, ${f.away.name} ${s.at}`">
              <span class="fblv__v fb-num">{{ s.ht }}</span>
              <span class="fblv__bars">
                <span class="fblv__half fblv__half--h"><i :style="{ width: s.hs * 100 + '%' }"></i></span>
                <span class="fblv__half fblv__half--a"><i :style="{ width: s.as * 100 + '%' }"></i></span>
              </span>
              <span class="fblv__v fblv__v--a fb-num">{{ s.at }}</span>
              <span class="fblv__lbl">{{ s.label }}</span>
            </div>
          </div>
        </FbFigure>
        <div v-if="L.live_prices && L.live_prices.length" class="fblv__prices">
          <div class="fb-fig__title">In-play prices</div>
          <ul>
            <li v-for="(p, i) in L.live_prices" :key="i">
              <span>{{ p.title.replace('API-Football in-play — ', '') }}</span><strong class="fb-num">{{ odds(p.price) }}</strong><span class="fb-muted fb-small">{{ ago(p.updated_at || p.fetched_at, now) }}</span>
            </li>
          </ul>
          <p class="fb-muted fb-small">In-play prices move fast and include a bigger margin. API-Football's in-play feed.</p>
        </div>
      </div>
    </div>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import { odds, ago, fmtDateTime, isLive } from '../fb'

const STATS = [
  ['possession', 'Possession', (v) => `${v}%`],
  ['xg', 'Expected goals (xG)', (v) => Number(v).toFixed(2)],
  ['shots_total', 'Shots', String],
  ['shots_on', 'Shots on target', String],
  ['corners', 'Corners', String],
  ['saves', 'Saves', String],
  ['fouls', 'Fouls', String],
  ['yellow', 'Yellow cards', String],
  ['red', 'Red cards', String],
  ['pass_pct', 'Pass accuracy', (v) => `${v}%`]
]

export default {
  name: 'LiveSection',
  components: { FbSection, FbFigure },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' },
    now: { type: String, default: '' }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    L() {
      return this.a.live || {}
    },
    isLiveNow() {
      return isLive(this.L.status)
    },
    minute() {
      return (this.L.minute || 0) + (this.L.extra || 0)
    },
    span() {
      return Math.max(90, this.minute, ...this.events.map((e) => e.minute + (e.extra || 0)))
    },
    minuteText() {
      if (this.L.status === 'HT') return 'Half time'
      return `${this.L.minute ?? ''}${this.L.extra ? '+' + this.L.extra : ''}′`
    },
    subtitle() {
      const sc = this.L.score || {}
      return `${this.f.home.name} ${sc.home ?? 0}–${sc.away ?? 0} ${this.f.away.name} · updated ${fmtDateTime(this.L.updated_at, this.tz)}${this.isLiveNow ? ' · refreshes every minute' : ''}`
    },
    events() {
      return [...(this.L.events || [])].sort((x, y) => x.minute + (x.extra || 0) / 100 - (y.minute + (y.extra || 0) / 100))
    },
    goals() {
      return this.events.filter((e) => e.type === 'Goal' && !/missed/i.test(e.detail))
    },
    stripLabel() {
      return `Minute ${this.minute} of ${this.span}. Goals: ${this.goals.map((g) => `${g.minute}′ ${g.player}`).join(', ') || 'none'}`
    },
    stats() {
      const h = this.L.stats?.home || {}
      const w = this.L.stats?.away || {}
      return STATS.filter(([k]) => h[k] != null || w[k] != null).map(([k, label, fmt]) => {
        const hv = Number(h[k]) || 0
        const av = Number(w[k]) || 0
        const max = k === 'possession' || k === 'pass_pct' ? 100 : Math.max(hv, av, k === 'xg' ? 0.5 : 1)
        return { key: k, label, ht: h[k] == null ? '—' : fmt(h[k]), at: w[k] == null ? '—' : fmt(w[k]), hs: hv / max, as: av / max }
      })
    },
    statTable() {
      return { cols: [{ label: 'Statistic' }, { label: this.f.home.name, num: true }, { label: this.f.away.name, num: true }], rows: this.stats.map((s) => [s.label, s.ht, s.at]) }
    }
  },
  methods: {
    odds,
    ago,
    icon(e) {
      if (e.type === 'Goal') return /missed/i.test(e.detail) ? 'fa-solid fa-xmark fblv__i' : 'fa-regular fa-futbol fblv__i'
      if (e.type === 'Card') return /red/i.test(e.detail) ? 'fa-solid fa-square fblv__i fblv__red' : 'fa-solid fa-square fblv__i fblv__yellow'
      if (e.type === 'subst') return 'fa-solid fa-right-left fblv__i'
      if (e.type === 'Var') return 'fa-solid fa-tv fblv__i'
      return 'fa-solid fa-circle fblv__i'
    }
  }
}
</script>

<style scoped>
.fblv__strip {
  margin: 4px 0 18px;
}
.fblv__track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
}
.fblv__elapsed {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: var(--border-strong);
}
.fblv__ht {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: var(--text-3);
}
.fblv__goal {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--fb-surface);
}
.fblv__ticks {
  position: relative;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-top: 4px;
}
.fblv__ticks span:nth-child(2) {
  position: absolute;
  transform: translateX(-50%);
}
.fblv__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 24px;
}
.fblv__events {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  max-height: 420px;
  overflow-y: auto;
}
.fblv__events li {
  display: grid;
  grid-template-columns: 44px 18px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--surface-2);
  font-size: 13px;
  border-left: 3px solid transparent;
}
.fblv__events li.is-home {
  border-left-color: var(--fb-home);
}
.fblv__events li.is-away {
  border-left-color: var(--fb-away);
}
.fblv__detail {
  display: block;
}
.fblv__min {
  font-weight: 650;
  color: var(--text-2);
}
.fblv__i {
  color: var(--text-2);
}
.fblv__yellow {
  color: #e0a800;
}
.fblv__red {
  color: var(--danger);
}
.fblv__stats {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.fblv__stat {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  grid-template-areas: 'hv lbl av' 'hv bars av';
  align-items: center;
  column-gap: 8px;
}
.fblv__lbl {
  grid-area: lbl;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-3);
}
.fblv__bars {
  grid-area: bars;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
}
.fblv__half {
  display: flex;
  height: 8px;
}
.fblv__half--h {
  justify-content: flex-end;
}
.fblv__half i {
  display: block;
  height: 8px;
  min-width: 2px;
}
.fblv__half--h i {
  background: var(--fb-home);
  border-radius: 4px 0 0 4px;
}
.fblv__half--a i {
  background: var(--fb-away);
  border-radius: 0 4px 4px 0;
}
.fblv__v {
  grid-area: hv;
  font-weight: 650;
  font-size: 13px;
}
.fblv__v--a {
  grid-area: av;
  text-align: right;
}
.fblv__prices {
  margin-top: 16px;
}
.fblv__prices ul {
  list-style: none;
  margin: 6px 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}
.fblv__prices li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  font-size: 13px;
}
@media (max-width: 900px) {
  .fblv__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
