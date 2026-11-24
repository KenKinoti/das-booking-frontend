<template>
  <!-- v2.19.1 Results: finished matches with DASYIN's locked pick and a big ✓ Correct / ✗ Wrong, and one tally line
       ("Yesterday: 7 ✓ · 5 ✗ · 3 no pick") linking to the scorecard. -->
  <section class="fbrs" data-test="fb-results" :aria-busy="loading ? 'true' : 'false'">
    <div class="fbrs__bar">
      <div class="fb-seg fbrs__seg" role="radiogroup" aria-label="Which results">
        <button
          type="button"
          role="radio"
          :aria-checked="range === '7d'"
          :class="{ 'is-on': range === '7d' }"
          data-test="fb-results-7d"
          @click="$emit('range', '7d')"
        >
          Last 7 days
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="range === 'day'"
          :class="{ 'is-on': range === 'day' }"
          data-test="fb-results-day"
          @click="$emit('range', 'day')"
        >
          {{ dayButton }}
        </button>
      </div>
      <router-link
        v-if="data && data.scorecard"
        :to="data.scorecard"
        class="ui-btn ui-btn--sm fbrs__sc"
        data-test="fb-results-scorecard"
        >Scorecard <i class="fa-solid fa-arrow-right" aria-hidden="true"></i
      ></router-link>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger">
      <i class="fa-solid fa-circle-exclamation"></i
      ><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a></span>
    </div>

    <div
      v-if="data"
      class="fbrs__tally"
      role="status"
      data-test="fb-results-tally"
      :data-correct="data.tally.correct"
      :data-wrong="data.tally.wrong"
      :data-nopick="nopick(data.tally)"
    >
      <span class="fbrs__tally-line" data-test="fb-results-line">{{ data.tally.line }}</span>
      <span v-if="data.tally.hit_rate != null" class="fbrs__tally-sub"
        >{{ Math.round(data.tally.hit_rate * 100) }}% of the graded picks right</span
      >
      <span class="fbrs__tally-sub">{{ data.note }}</span>
    </div>
    <p v-if="staleNote" class="fb-honest fbrs__stale" data-test="fb-results-stale">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>{{ staleNote }}</span>
    </p>

    <div v-if="loading && !data" class="fb-panel">
      <div
        v-for="n in 4"
        :key="n"
        class="ui-skeleton"
        style="height: 56px; margin: 10px 16px"
      ></div>
    </div>

    <template v-else-if="data">
      <section v-for="d in days" :key="d.date" class="fb-panel fbrs__day" :data-day="d.date">
        <header class="fbrs__dayhead">
          <h2>{{ d.label }}</h2>
          <span class="fb-muted fb-small" data-test="fb-results-dayline">{{
            d.tally.line.replace(d.label + ': ', '')
          }}</span>
        </header>
        <router-link
          v-for="r in d.rows"
          :key="r.fixture_id"
          :to="`/football/match/${r.fixture_id}`"
          class="fbrs__row"
          :data-fixture="r.fixture_id"
          :data-mark="r.mark"
        >
          <span class="fbrs__time fb-num">
            <span>{{ fmtTime(r.kickoff, tz) }}</span>
            <span class="fb-pill fbrs__st">{{ stText(r) }}</span>
          </span>
          <span class="fbrs__match">
            <span class="fbrs__team"
              ><FbCrest
                :src="r.home.logo"
                :name="r.home.name"
                :code="r.home.code"
                :size="18"
              /><span class="fbrs__tname">{{ r.home.name }}</span
              ><b class="fb-num">{{ goals(r, 'home') }}</b></span
            >
            <span class="fbrs__team"
              ><FbCrest
                :src="r.away.logo"
                :name="r.away.name"
                :code="r.away.code"
                :size="18"
              /><span class="fbrs__tname">{{ r.away.name }}</span
              ><b class="fb-num">{{ goals(r, 'away') }}</b></span
            >
            <span class="fb-muted fb-small fbrs__comp"
              >{{ r.competition.name
              }}<template v-if="r.competition.country && r.competition.country !== 'World'">
                · {{ r.competition.country }}</template
              ></span
            >
          </span>
          <FbLockedResult
            class="fbrs__lr"
            :row="r"
            :fixture-id="r.fixture_id"
            :finished="true"
            :details="false"
            :badge-test-id="'fb-results-mark-' + r.fixture_id"
            :chip-test-id="'fb-results-pick-' + r.fixture_id"
          />
        </router-link>
      </section>
      <div v-if="!days.length" class="ui-empty fb-panel" data-test="fb-results-empty">
        <div class="ui-empty__icon"><i class="fa-regular fa-square-check"></i></div>
        <h3>No finished matches {{ range === 'day' ? 'on this day' : 'in the last 7 days' }}</h3>
        <p>Locked picks show here with ✓ or ✗ once their matches have finished.</p>
      </div>
    </template>
  </section>
</template>

<script>
import FbCrest from '../FbCrest.vue'
import FbLockedResult from './FbLockedResult.vue'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { fmtTime, ago, statusText, isLive } from '../fb'

export default {
  name: 'ResultsView',
  components: { FbCrest, FbLockedResult },
  props: {
    date: { type: String, default: '' },
    range: { type: String, default: '7d' }, // 7d | day
    tz: { type: String, default: 'Africa/Nairobi' },
    competition: { type: String, default: '' },
    q: { type: String, default: '' },
    dayLabel: { type: String, default: '' },
    now: { type: String, default: '' },
  },
  emits: ['range', 'loaded'],
  data() {
    return { data: null, loading: false, error: '', reqId: 0 }
  },
  computed: {
    dayButton() {
      return this.dayLabel || 'Chosen day'
    },
    days() {
      const q = this.q.trim().toLowerCase()
      return (this.data?.days || [])
        .map((d) => ({
          ...d,
          rows: q
            ? d.rows.filter((r) =>
                [r.home.name, r.away.name, r.competition.name].some((x) =>
                  String(x || '')
                    .toLowerCase()
                    .includes(q),
                ),
              )
            : d.rows,
        }))
        .filter((d) => d.rows.length)
    },
    staleNote() {
      const t = this.data?.tally
      if (!t || !t.pending) return ''
      const last = this.data.last_result_at
      return `${t.pending} match${t.pending === 1 ? ' is' : 'es are'} waiting for the result${last ? ` (results last fetched ${ago(last, this.now || this.data.as_of)})` : ''}. They are graded as soon as it arrives — the locked pick doesn't change.`
    },
  },
  watch: {
    date() {
      if (this.range === 'day') this.load()
    },
    range() {
      this.load()
    },
    competition() {
      this.load()
    },
  },
  created() {
    this.load()
  },
  methods: {
    fmtTime,
    nopick(t) {
      return (t.no_pick || 0) + (t.not_enough_data || 0)
    },
    stText(r) {
      if (['FT', 'AET', 'PEN'].includes(r.status)) return 'FT'
      if (['NS', 'TBD', ''].includes(r.status || '')) return 'No result yet'
      if (['CANC', 'ABD', 'AWD', 'WO'].includes(r.status))
        return { CANC: 'Cancelled', ABD: 'Abandoned', AWD: 'Awarded', WO: 'Walkover' }[r.status]
      return isLive(r.status) ? statusText({ status: r.status }) || 'In play' : r.status
    },
    goals(r, side) {
      const s = r.score || {}
      const v = side === 'home' ? (s.ft_home ?? s.home) : (s.ft_away ?? s.away)
      return v == null ? '' : v
    },
    async load() {
      const id = ++this.reqId
      this.loading = true
      this.error = ''
      try {
        const params = { competition: this.competition }
        if (this.range === 'day' && this.date) params.date = this.date
        else params.days = 7
        const d = await footballApi.results(params)
        if (id !== this.reqId) return
        this.data = d
        this.$emit('loaded', d)
      } catch (e) {
        if (id !== this.reqId) return
        this.error = apiErrorMessage(e, 'Could not load the results')
      } finally {
        if (id === this.reqId) this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.fbrs {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
}
.fbrs__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.fbrs__seg button {
  min-height: 36px;
  padding: 4px 14px;
  font-size: 13px;
}
.fbrs__sc {
  min-height: 36px;
}
.fbrs__tally {
  display: grid;
  gap: 2px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
}
.fbrs__tally-line {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.fbrs__tally-sub {
  font-size: 12.5px;
  color: var(--text-3);
}
.fbrs__stale {
  margin: 0;
}
.fbrs__dayhead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.fbrs__dayhead h2 {
  margin: 0;
  font-size: 14.5px;
  font-weight: 650;
}
.fbrs__row {
  display: grid;
  grid-template-columns: 64px minmax(160px, 1fr) minmax(0, 1.6fr);
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
  min-height: 44px;
}
.fbrs__dayhead + .fbrs__row {
  border-top: 0;
}
.fbrs__row:hover {
  background: var(--surface-hover);
}
.fbrs__row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.fbrs__time {
  display: grid;
  gap: 4px;
  justify-items: start;
  font-size: 13px;
  font-weight: 650;
}
.fbrs__st {
  font-size: 11px;
}
.fbrs__match {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.fbrs__team {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 550;
  min-width: 0;
}
.fbrs__tname {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fbrs__team b {
  margin-left: auto;
  padding-left: 6px;
}
.fbrs__comp {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 760px) {
  .fbrs__row {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'time'
      'match'
      'lr';
    gap: 8px;
    padding: 12px;
  }
  .fbrs__time {
    grid-area: time;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .fbrs__match {
    grid-area: match;
  }
  .fbrs__lr {
    grid-area: lr;
  }
  .fbrs__dayhead {
    padding: 10px 12px;
  }
  .fbrs__tally-line {
    font-size: 16px;
  }
}
@media (max-width: 640px) {
  .fbrs__seg button,
  .fbrs__sc {
    min-height: 44px;
  }
}
</style>
