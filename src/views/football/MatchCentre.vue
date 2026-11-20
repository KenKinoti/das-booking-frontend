<template>
  <div class="ui-page fb fbmc" data-test="fb-match-centre">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Football</div>
        <h1>Match centre</h1>
        <p>Fair chances from the sharp market (bookmaker margin removed), DASYIN's model as a second opinion, and the best price on offer.</p>
      </div>
      <div class="ui-actions">
        <router-link class="ui-btn" to="/football/bets"><i class="fa-solid fa-receipt"></i> My bets</router-link>
        <router-link class="ui-btn ui-btn--ghost" to="/football/model"><i class="fa-solid fa-scale-balanced"></i> Model record</router-link>
      </div>
    </header>

    <FbNoAccess v-if="forbidden" :reason="forbidden" />

    <template v-else>
      <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px">
        <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a></span>
      </div>
      <div v-if="meta && !meta.providers.apifootball && !meta.providers.oddsapi" class="ui-alert ui-alert--warning" style="margin-bottom: 16px" data-test="fb-no-providers">
        <i class="fa-solid fa-plug-circle-exclamation"></i>
        <span>
          Football data isn't connected yet.
          <template v-if="isSuper">Add the API-Football and The Odds API keys in <router-link to="/system-settings?tab=football">System settings → Football data</router-link>.</template>
          <template v-else>Ask your platform admin to connect the football data providers.</template>
        </span>
      </div>

      <!-- Live now -->
      <section v-if="live.length" class="fbmc-live" aria-label="Live now" data-test="fb-live-now">
        <div class="fbmc-live__head"><span class="fb-livedot"></span> Live now <span class="fb-muted fb-small">· updates every minute</span></div>
        <div class="fbmc-live__list">
          <router-link v-for="f in live" :key="f.id" :to="`/football/match/${f.id}`" class="fbmc-live__item" :data-fixture="f.id">
            <span class="fbmc-live__min"><span class="fb-livedot"></span> {{ statusText(f) }}</span>
            <span class="fbmc-live__team"><FbCrest :src="f.home.logo" :name="f.home.name" :code="f.home.code" :size="18" />{{ f.home.name }}<b>{{ f.score.home ?? 0 }}</b></span>
            <span class="fbmc-live__team"><FbCrest :src="f.away.logo" :name="f.away.name" :code="f.away.code" :size="18" />{{ f.away.name }}<b>{{ f.score.away ?? 0 }}</b></span>
          </router-link>
        </div>
      </section>

      <!-- Filters: one row above everything they scope -->
      <div class="fbmc-filters">
        <div ref="dates" class="fbmc-dates" role="tablist" aria-label="Day">
          <button
            v-for="d in days"
            :key="d.key"
            type="button"
            role="tab"
            class="fbmc-day"
            :class="{ 'is-on': d.key === date, 'is-today': d.key === today }"
            :aria-selected="d.key === date"
            :data-day="d.key"
            @click="pickDate(d.key)"
          >
            <span class="fbmc-day__wd">{{ d.wd }}</span>
            <span class="fbmc-day__n">{{ d.n }}</span>
          </button>
        </div>
        <div class="fbmc-ctrls">
          <select v-model="competition" class="ui-select fbmc-comp" aria-label="Competition" @change="syncQuery(), load()">
            <option value="">All competitions</option>
            <optgroup v-for="g in compGroups" :key="g.label" :label="g.label">
              <option v-for="c in g.items" :key="c.id" :value="String(c.id)">{{ c.name }}{{ c.country && c.country !== 'World' ? ` (${c.country})` : '' }}</option>
            </optgroup>
          </select>
          <div class="fbmc-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Team or competition" aria-label="Search teams or competitions" @input="debouncedLoad" />
          </div>
          <label class="fbmc-toggle" title="Model's probability at least this far above the fair (sharp) price">
            <input v-model="valueOnly" type="checkbox" data-test="fb-value-only" @change="syncQuery" />
            <span>Value only</span>
          </label>
          <select v-model.number="threshold" class="ui-select fbmc-thr" aria-label="Minimum edge over the fair price" @change="syncQuery">
            <option v-for="t in thresholds" :key="t" :value="t">edge ≥ {{ Math.round(t * 100) }} pts</option>
          </select>
          <label class="fbmc-toggle">
            <input v-model="watchOnly" type="checkbox" @change="syncQuery" />
            <span><i class="fa-solid fa-star"></i> Watchlist</span>
          </label>
        </div>
      </div>

      <div class="fbmc-info">
        <span v-if="asOf">Data as of {{ fmtDateTime(asOf, tz) }} · times in {{ tzLabel }}</span>
        <span class="fbmc-info__legend" aria-label="Legend">
          <span><i class="fb-key" style="background: var(--fb-home)"></i>Home</span>
          <span><i class="fb-key" style="background: var(--fb-draw)"></i>Draw</span>
          <span><i class="fb-key" style="background: var(--fb-away)"></i>Away</span>
          <span><i class="fb-dot fb-dot--fresh"></i>odds &lt; 6 h old</span>
          <span><i class="fb-dot fb-dot--stale"></i>stale</span>
          <span><i class="fa-solid fa-caret-up fb-pos"></i>price above the fair odds</span>
        </span>
      </div>
      <p v-if="valueOnly" class="fb-honest fbmc-honest">
        <i class="fa-solid fa-circle-info"></i>
        <span
          >“Value” = the model's probability is at least {{ Math.round(threshold * 100) }} points above the fair price. In backtests, betting the model's edges at closing prices lost money; only
          prices above the sharp fair odds came out around break-even. Check the price, not just the edge.</span
        >
      </p>

      <div v-if="loading && !fixtures.length" class="fb-panel fbmc-skel">
        <div v-for="n in 6" :key="n" class="ui-skeleton" style="height: 44px; margin: 10px 16px"></div>
      </div>

      <div v-else :style="{ opacity: loading ? 0.6 : 1 }" class="fbmc-groups">
        <section v-for="g in groups" :key="g.id" class="fb-panel fbmc-group" :data-competition="g.id">
          <header class="fbmc-group__head">
            <FbCrest :src="g.logo" :name="g.name" :size="22" />
            <div>
              <h2>{{ g.name }}</h2>
              <span class="fb-muted fb-small">{{ g.country }}<template v-if="g.round"> · {{ String(g.round).replace('Regular Season - ', 'Matchday ') }}</template></span>
            </div>
            <span class="fb-pill">{{ g.items.length }} {{ g.items.length === 1 ? 'match' : 'matches' }}</span>
          </header>
          <div class="fbmc-cols" aria-hidden="true">
            <span></span><span>Kick-off</span><span>Match</span><span>Fair chance · H D A</span><span>Model · H D A</span><span>Best price · 1 X 2</span><span></span>
          </div>
          <div
            v-for="f in g.items"
            :key="f.id"
            class="fbmc-row"
            :class="{ 'is-live': isLive(f.status) }"
            :data-fixture="f.id"
            @click="open(f, $event)"
          >
            <button
              type="button"
              class="fbmc-star"
              :class="{ 'is-on': f.watched }"
              :aria-pressed="f.watched"
              :aria-label="(f.watched ? 'Remove from' : 'Add to') + ' watchlist'"
              :title="f.watched ? 'On your watchlist' : 'Add to watchlist'"
              @click.stop="toggleWatch(f)"
            >
              <i :class="f.watched ? 'fa-solid fa-star' : 'fa-regular fa-star'"></i>
            </button>
            <div class="fbmc-time">
              <template v-if="isLive(f.status)"><span class="fb-pill fb-pill--live"><span class="fb-livedot"></span>{{ statusText(f) }}</span></template>
              <template v-else-if="isFinished(f.status)"><span class="fb-pill">FT</span></template>
              <template v-else-if="['PST', 'CANC', 'ABD'].includes(f.status)"><span class="fb-pill fb-pill--warn">{{ statusText(f) }}</span></template>
              <template v-else>{{ fmtTime(f.kickoff, tz) }}</template>
            </div>
            <router-link class="fbmc-teams" :to="`/football/match/${f.id}`" @click.stop>
              <span class="fbmc-team"><FbCrest :src="f.home.logo" :name="f.home.name" :code="f.home.code" :size="20" /><span class="fbmc-tname">{{ f.home.name }}</span><b v-if="f.score.home != null">{{ f.score.home }}</b></span>
              <span class="fbmc-team"><FbCrest :src="f.away.logo" :name="f.away.name" :code="f.away.code" :size="20" /><span class="fbmc-tname">{{ f.away.name }}</span><b v-if="f.score.away != null">{{ f.score.away }}</b></span>
            </router-link>
            <div class="fbmc-fair" :data-fair="f.market_1x2 ? [f.market_1x2.home, f.market_1x2.draw, f.market_1x2.away].map((v) => v.toFixed(4)).join(',') : ''">
              <span class="fbmc-lbl">Fair</span>
              <template v-if="f.market_1x2">
                <FbThin :home="f.market_1x2.home" :draw="f.market_1x2.draw" :away="f.market_1x2.away" :names="[f.home.name, 'Draw', f.away.name]" :what="'Fair chance (' + (f.market_source || 'market') + ')'" />
                <span class="fbmc-trio fb-num">{{ trio(f.market_1x2) }}</span>
              </template>
              <span v-else class="fb-muted fb-small">No market price yet</span>
            </div>
            <div class="fbmc-model" :data-model="f.model ? [f.model.home, f.model.draw, f.model.away].join(',') : ''">
              <span class="fbmc-lbl">Model</span>
              <span v-if="f.model" class="fbmc-trio fb-num">{{ trio(f.model) }}</span>
              <span v-else class="fb-muted fb-small">—</span>
            </div>
            <div class="fbmc-best">
              <span class="fbmc-lbl">Best</span>
              <span v-for="k in ['home', 'draw', 'away']" :key="k" class="fbmc-price fb-num" :title="priceTitle(f, k)">
                {{ f.best_odds && f.best_odds[k] ? odds(f.best_odds[k].price) : '—' }}<i v-if="aboveFair(f, k)" class="fa-solid fa-caret-up fb-pos" aria-label="above the fair odds"></i>
              </span>
            </div>
            <div class="fbmc-flags">
              <span v-if="f.value_count" class="fb-pill fb-pill--info" :title="valueTitle(f)">{{ edgesOver(f).length || f.value_count }} edge{{ (edgesOver(f).length || f.value_count) === 1 ? '' : 's' }}</span>
              <i class="fb-dot" :class="'fb-dot--' + freshness(f.odds_at || f.fetched_at, now, f.stale)" :title="freshTitle(f)" role="img" :aria-label="freshTitle(f)"></i>
            </div>
          </div>
        </section>

        <div v-if="!loading && !groups.length && !error" class="ui-empty fb-panel" data-test="fb-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-futbol"></i></div>
          <h3>{{ emptyTitle }}</h3>
          <p>{{ emptyText }}</p>
          <button v-if="nextDay && !fixtures.length" type="button" class="ui-btn ui-btn--primary" data-test="fb-next-day" @click="pickDate(nextDay.key)">
            Next matches: {{ nextDay.label }} <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <FbFootnote />
    </template>
  </div>
</template>

<script>
import '@/components/football/football.css'
import { footballApi } from '@/services/football'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import { apiErrorMessage } from '@/services/api'
import FbCrest from '@/components/football/FbCrest.vue'
import FbThin from '@/components/football/charts/FbThin.vue'
import FbNoAccess from '@/components/football/FbNoAccess.vue'
import FbFootnote from '@/components/football/FbFootnote.vue'
import { fb, loadMeta, forbiddenReason } from '@/components/football/fbState'
import { DEFAULT_TZ, dayKey, addDaysKey, fmtTime, fmtDateTime, odds, isLive, isFinished, statusText, freshness, ago } from '@/components/football/fb'

const GROUPS = [
  ['europe_top', 'Top European leagues'],
  ['uefa', 'UEFA competitions'],
  ['africa', 'Kenya & Africa'],
  ['international', 'International'],
  ['other', 'Other']
]

export default {
  name: 'MatchCentre',
  components: { FbCrest, FbThin, FbNoAccess, FbFootnote },
  data() {
    const q = this.$route.query
    return {
      fixtures: [],
      competitions: [],
      live: [],
      watch: [],
      tz: DEFAULT_TZ,
      date: typeof q.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : '',
      competition: typeof q.competition === 'string' ? q.competition : '',
      q: typeof q.q === 'string' ? q.q : '',
      valueOnly: q.value === '1',
      watchOnly: q.watch === '1',
      threshold: Number(q.edge) > 0 ? Number(q.edge) : 0.03,
      asOf: null,
      now: null,
      loading: false,
      error: '',
      forbidden: '',
      timer: null,
      liveTimer: null,
      reqId: 0,
      nextDay: null
    }
  },
  computed: {
    meta() {
      return fb.meta
    },
    isSuper() {
      return useAuthStore().isSuperAdmin
    },
    today() {
      return dayKey(this.now || this.meta?.now || new Date(), this.tz)
    },
    days() {
      const out = []
      for (let i = -7; i <= 7; i++) {
        const key = addDaysKey(this.today, i)
        const d = new Date(key + 'T12:00:00Z')
        out.push({
          key,
          wd: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : i === -1 ? 'Yday' : new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(d),
          n: new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
        })
      }
      return out
    },
    thresholds() {
      const base = this.meta?.min_edge || 0.03
      return [...new Set([base, 0.05, 0.08].filter((t) => t >= base))].sort((a, b) => a - b)
    },
    compGroups() {
      return GROUPS.map(([k, label]) => ({ label, items: this.competitions.filter((c) => (c.group || 'other') === k) }))
        .concat([{ label: 'More', items: this.competitions.filter((c) => !GROUPS.some(([k]) => k === (c.group || 'other'))) }])
        .filter((g) => g.items.length)
    },
    shown() {
      return this.fixtures.filter((f) => (!this.valueOnly || this.edgesOver(f).length > 0) && (!this.watchOnly || f.watched))
    },
    groups() {
      const by = new Map()
      for (const f of this.shown) {
        const c = f.competition || {}
        if (!by.has(c.id)) by.set(c.id, { id: c.id, name: c.name, country: c.country, logo: c.logo, round: c.round, items: [] })
        by.get(c.id).items.push(f)
      }
      const prio = new Map(this.competitions.map((c) => [c.id, c.priority ?? 50]))
      return [...by.values()].sort((a, b) => (prio.get(a.id) ?? 99) - (prio.get(b.id) ?? 99) || String(a.name).localeCompare(String(b.name)))
    },
    tzLabel() {
      return this.tz.replace('_', ' ')
    },
    emptyTitle() {
      if (this.fixtures.length && this.valueOnly) return 'No matches pass the value filter'
      if (this.fixtures.length && this.watchOnly) return 'No watched matches on this day'
      return 'No matches on this day'
    },
    emptyText() {
      if (this.fixtures.length) return 'Lower the threshold or switch the filter off to see every match.'
      return this.competition || this.q ? 'Try another day, competition or search.' : 'Only the competitions switched on for this platform are listed. Try another day.'
    }
  },
  async created() {
    await loadMeta(true)
    if (fb.forbidden) {
      this.forbidden = fb.forbidden
      return
    }
    if (!this.date) this.date = dayKey(this.meta?.now || new Date(), this.tz)
    if (this.meta?.min_edge && !this.$route.query.edge) this.threshold = this.meta.min_edge
    this.loadCompetitions()
    this.loadWatch()
    this.loadLive()
    await this.load(true)
    this.liveTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.loadLive()
        if (this.date === this.today) this.load(false, true)
      }
    }, 60000)
  },
  beforeUnmount() {
    clearTimeout(this.timer)
    clearInterval(this.liveTimer)
  },
  methods: {
    fmtTime,
    fmtDateTime,
    odds,
    isLive,
    isFinished,
    statusText,
    freshness,
    trio(p) {
      return [p.home, p.draw, p.away].map((v) => (v == null ? '—' : Math.round(v * 100))).join(' · ')
    },
    edgesOver(f) {
      return (f.edges || []).filter((e) => e.edge != null && e.edge >= this.threshold - 1e-9)
    },
    fairP(f, k) {
      return f.market_1x2 ? f.market_1x2[k] : null
    },
    aboveFair(f, k) {
      const p = this.fairP(f, k)
      const b = f.best_odds?.[k]
      return !!(p && b && b.price * p - 1 > 1e-9)
    },
    priceTitle(f, k) {
      const b = f.best_odds?.[k]
      if (!b) return 'No price yet'
      const p = this.fairP(f, k)
      const ev = p ? b.price * p - 1 : null
      return `${b.title} ${b.price.toFixed(2)}${p ? ` · fair odds ${(1 / p).toFixed(2)} · ${ev >= 0 ? '+' : '−'}${Math.abs(ev * 100).toFixed(1)}% vs fair` : ''}`
    },
    valueTitle(f) {
      const e = this.edgesOver(f)
      return (e.length ? e : f.edges || []).map((x) => `${x.label}: model ${(x.model_p * 100).toFixed(1)}% vs fair ${x.market_p != null ? (x.market_p * 100).toFixed(1) + '%' : '—'}`).join('\n')
    },
    freshTitle(f) {
      const s = freshness(f.odds_at || f.fetched_at, this.now, f.stale)
      return `${s === 'stale' ? 'Stale data' : s === 'aging' ? 'Odds a few hours old' : 'Fresh'} · odds updated ${ago(f.odds_at, this.now)} · match data ${ago(f.fetched_at, this.now)}`
    },
    syncQuery() {
      const query = {
        date: this.date !== this.today ? this.date : undefined,
        competition: this.competition || undefined,
        q: this.q || undefined,
        value: this.valueOnly ? '1' : undefined,
        edge: this.valueOnly && this.threshold !== (this.meta?.min_edge || 0.03) ? String(this.threshold) : undefined,
        watch: this.watchOnly ? '1' : undefined
      }
      this.$router.replace({ query: Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined)) }).catch(() => {})
    },
    pickDate(k) {
      this.date = k
      this.syncQuery()
      this.load()
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.syncQuery()
        this.load()
      }, 300)
    },
    async load(first = false, quiet = false) {
      const id = ++this.reqId
      if (!quiet) this.loading = true
      this.error = ''
      try {
        const d = await footballApi.fixtures({ date: this.date, competition: this.competition, q: this.q.trim(), limit: 300 })
        if (id !== this.reqId) return
        this.now = d.now
        this.asOf = d.last_run_at || d.now
        const tz = d.timezone || DEFAULT_TZ
        if (tz !== this.tz) {
          this.tz = tz
          // The first guess of "today" used the default zone: correct it once the organisation's is known.
          if (first && !this.$route.query.date && this.date !== dayKey(d.now, tz)) {
            this.date = dayKey(d.now, tz)
            return this.load()
          }
        }
        this.fixtures = d.fixtures || []
        this.nextDay = null
        if (!this.fixtures.length && !this.q && !this.competition) this.findNext()
        this.$nextTick(() => this.scrollDay())
      } catch (e) {
        if (id !== this.reqId) return
        this.forbidden = forbiddenReason(e)
        if (!this.forbidden) this.error = apiErrorMessage(e, 'Could not load the matches')
      } finally {
        if (id === this.reqId) this.loading = false
      }
    },
    async findNext() {
      try {
        const d = await footballApi.fixtures({ status: 'upcoming', limit: 1 })
        const f = (d.fixtures || [])[0]
        if (f) {
          const key = dayKey(f.kickoff, this.tz)
          if (key !== this.date) this.nextDay = { key, label: new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: this.tz }).format(new Date(f.kickoff)) }
        }
      } catch {
        this.nextDay = null
      }
    },
    scrollDay() {
      const el = this.$refs.dates?.querySelector('.is-on')
      const box = this.$refs.dates
      if (el && box) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2
    },
    async loadCompetitions() {
      try {
        this.competitions = (await footballApi.competitions()).competitions || []
      } catch {
        this.competitions = []
      }
    },
    async loadWatch() {
      try {
        this.watch = (await footballApi.watchlist()).items || []
      } catch {
        this.watch = []
      }
    },
    async loadLive() {
      try {
        this.live = (await footballApi.live()).live || []
      } catch {
        this.live = []
      }
    },
    async toggleWatch(f) {
      try {
        if (f.watched) {
          const item = this.watch.find((w) => w.kind === 'fixture' && Number(w.ref_id) === f.id)
          if (item) await footballApi.unwatch(item.id)
          f.watched = false
        } else {
          await footballApi.watch({ kind: 'fixture', ref_id: f.id })
          f.watched = true
        }
        await this.loadWatch()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update your watchlist'))
      }
    },
    open(f, e) {
      if (e && (e.target.closest('a') || e.target.closest('button'))) return
      this.$router.push(`/football/match/${f.id}`)
    }
  }
}
</script>

<style scoped>
.fbmc-live {
  margin-bottom: 16px;
}
.fbmc-live__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 650;
  margin-bottom: 8px;
}
.fbmc-live__list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.fbmc-live__item {
  flex: 0 0 auto;
  min-width: 220px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
}
.fbmc-live__item:hover {
  border-color: var(--border-strong);
}
.fbmc-live__min {
  font-size: 12px;
  color: var(--danger);
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.fbmc-live__team {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.fbmc-live__team b {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.fbmc-filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
  min-width: 0;
}
.fbmc-dates {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 2px 6px;
  scrollbar-width: thin;
  min-width: 0;
}
.fbmc-day {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 1px;
  min-width: 58px;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  font: inherit;
}
.fbmc-day:hover {
  border-color: var(--border-strong);
}
.fbmc-day.is-on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}
.fbmc-day__wd {
  font-size: 11.5px;
  font-weight: 650;
}
.fbmc-day__n {
  font-size: 12px;
  white-space: nowrap;
}
.fbmc-ctrls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.fbmc-comp {
  width: auto;
  min-width: 0;
  max-width: 280px;
}
.fbmc-search {
  position: relative;
  flex: 1 1 200px;
  max-width: 320px;
  min-width: 0;
}
.fbmc-search i {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  font-size: 13px;
}
.fbmc-search input {
  padding-left: 32px;
  width: 100%;
}
.fbmc-thr {
  width: auto;
}
.fbmc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 550;
  color: var(--text-2);
  cursor: pointer;
  white-space: nowrap;
}
.fbmc-toggle input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}
.fbmc-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-3);
  margin: 4px 0 12px;
}
.fbmc-info__legend {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.fbmc-info__legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.fbmc-honest {
  margin: 0 0 12px;
}
.fbmc-groups {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  transition: opacity 0.15s;
}
.fbmc-group__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.fbmc-group__head h2 {
  font-size: 14.5px;
  font-weight: 650;
  margin: 0;
}
.fbmc-group__head .fb-pill {
  margin-left: auto;
}
.fbmc-cols,
.fbmc-row {
  display: grid;
  grid-template-columns: 30px 64px minmax(180px, 1.5fr) minmax(150px, 1.3fr) minmax(90px, 0.8fr) minmax(150px, 1.1fr) 76px;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
}
.fbmc-cols {
  padding-top: 8px;
  padding-bottom: 4px;
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbmc-row {
  padding-top: 10px;
  padding-bottom: 10px;
  border-top: 1px solid var(--border);
  cursor: pointer;
}
.fbmc-cols + .fbmc-row {
  border-top: 0;
}
.fbmc-row:hover {
  background: var(--surface-hover);
}
.fbmc-row:last-child {
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
.fbmc-star {
  border: 0;
  background: none;
  color: var(--text-3);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
}
.fbmc-star.is-on {
  color: #c98500;
}
.fbmc-star:hover {
  background: var(--bg-subtle);
}
.fbmc-time {
  white-space: nowrap;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
.fbmc-teams {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
  color: var(--text);
  text-decoration: none;
  min-width: 0;
}
.fbmc-teams:hover .fbmc-tname {
  text-decoration: underline;
}
.fbmc-team {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 550;
  min-width: 0;
}
.fbmc-tname {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fbmc-team b {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.fbmc-fair {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  min-width: 0;
}
.fbmc-trio {
  font-size: 12.5px;
  color: var(--text-2);
}
.fbmc-best {
  display: flex;
  gap: 10px;
  font-size: 13px;
}
.fbmc-price {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 36px;
}
.fbmc-flags {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.fbmc-lbl {
  display: none;
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
  width: 42px;
  flex-shrink: 0;
}
@media (max-width: 1180px) {
  .fbmc-cols {
    display: none;
  }
  .fbmc-row {
    grid-template-columns: 30px 72px minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'star time teams flags'
      'star time fair best'
      'star time model .';
    row-gap: 6px;
  }
  .fbmc-star {
    grid-area: star;
    align-self: start;
  }
  .fbmc-time {
    grid-area: time;
    align-self: start;
    padding-top: 4px;
  }
  .fbmc-teams {
    grid-area: teams;
  }
  .fbmc-fair {
    grid-area: fair;
  }
  .fbmc-model {
    grid-area: model;
  }
  .fbmc-best {
    grid-area: best;
  }
  .fbmc-flags {
    grid-area: flags;
    align-self: start;
  }
  .fbmc-lbl {
    display: inline-block;
  }
  .fbmc-fair {
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }
  .fbmc-model,
  .fbmc-best {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
@media (max-width: 640px) {
  .fbmc-row {
    grid-template-columns: 30px minmax(0, 1fr) auto;
    grid-template-areas:
      'star teams flags'
      'time time time'
      'fair fair fair'
      'model model model'
      'best best best';
    padding: 10px 12px;
  }
  .fbmc-time {
    padding-top: 0;
    font-size: 12.5px;
    color: var(--text-2);
  }
  .fbmc-group__head {
    padding: 10px 12px;
  }
  .fbmc-comp,
  .fbmc-search {
    flex: 1 1 100%;
    max-width: none;
  }
}
</style>
