<template>
  <div class="ui-page fb fbjl" data-test="fb-jackpots">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Football</div>
        <h1>Jackpot analyser</h1>
        <p>Paste a SportPesa or Betika jackpot, see each game's fair chances, the most likely ticket, which games to double first and what a ticket is really worth.</p>
      </div>
      <div class="ui-actions">
        <router-link class="ui-btn ui-btn--primary" to="/football/jackpot/new" data-test="fb-jp-new"><i class="fa-solid fa-plus"></i> New jackpot</router-link>
      </div>
    </header>

    <FbNoAccess v-if="forbidden" :reason="forbidden" />
    <template v-else>
      <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px">
        <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
      </div>

      <div v-if="loading && !items.length" class="fb-panel">
        <div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 52px; margin: 12px 16px"></div>
      </div>

      <template v-else>
        <div v-if="!items.length && !error" class="ui-empty fb-panel" data-test="fb-jp-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-ticket"></i></div>
          <h3>No jackpots yet</h3>
          <p>Create one, then paste the games straight from your bookmaker's app — one game per line, with or without the odds.</p>
          <router-link class="ui-btn ui-btn--primary" to="/football/jackpot/new"><i class="fa-solid fa-plus"></i> New jackpot</router-link>
        </div>

        <section v-for="g in groups" :key="g.key" class="fb-panel fbjl__group" :data-group="g.key">
          <div class="fb-panel__head">
            <div>
              <h2>{{ g.label }}</h2>
              <p>{{ g.hint }}</p>
            </div>
          </div>
          <div class="fb-panel__body">
            <ul class="fbjl__list">
              <li v-for="j in g.items" :key="j.id" class="fbjl__item" :data-jackpot="j.id">
                <router-link :to="`/football/jackpot/${j.id}`" class="fbjl__main">
                  <span class="fbjl__name">{{ j.name }}</span>
                  <span class="fb-muted fb-small">
                    {{ j.bookmaker }} · {{ j.games_count }} game{{ j.games_count === 1 ? '' : 's' }}<template v-if="j.prize"> · prize {{ money(j.prize, j.currency) }}</template>
                    <template v-if="j.closes_at"> · {{ isOpen(j) ? 'closes' : 'closed' }} {{ fmtClose(j.closes_at, tz) }}</template>
                  </span>
                </router-link>
                <div class="fbjl__stats">
                  <span v-if="j.unmatched" class="fb-pill fb-pill--warn" :title="j.unmatched + ' games not matched to a fixture'"><i class="fa-solid fa-link-slash"></i> {{ j.unmatched }} unmatched</span>
                  <span v-if="j.best_one_in" class="fbjl__stat" title="Chance that the most likely ticket gets every game right (from the jackpot's last analysis)">
                    <span class="fb-muted fb-small">Most likely ticket</span><strong class="fb-num" data-test="fb-jp-list-one-in">1 in {{ j.best_one_in.toLocaleString() }}</strong>
                  </span>
                  <span v-if="j.graded && j.graded.best_correct != null" class="fbjl__stat" data-test="fb-jp-graded-summary">
                    <span class="fb-muted fb-small">Most likely ticket got</span><strong class="fb-num">{{ j.graded.best_correct }}/{{ j.games_count }} right</strong>
                  </span>
                  <span v-if="j.tickets_count" class="fb-muted fb-small">{{ j.tickets_count }} saved ticket{{ j.tickets_count === 1 ? '' : 's' }}</span>
                  <span class="fb-pill" :class="statusClass(j)">{{ statusText(j) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <!-- History: how the most likely tickets did -->
        <section v-if="graded.length" class="fb-panel fbjl__hist" data-test="fb-jp-history">
          <div class="fb-panel__head">
            <div>
              <h2>History</h2>
              <p>
                How many games the most likely ticket got right in each graded jackpot<template v-if="stats && stats.jackpots">
                  — {{ stats.jackpots }} graded, {{ fixed(stats.avg_correct_most_likely, 1) }} right on average, best {{ stats.best_correct }}</template
                >.
              </p>
            </div>
          </div>
          <div class="fb-panel__body">
            <FbFigure
              title="Correct picks per graded jackpot"
              subtitle="Bar = games the most likely ticket got right, out of the games in that jackpot · figure = also what was expected before kick-off"
              :table="histTable"
              chart-id="jp-history"
            >
              <FbMeterList :rows="histRows" mode="meter" aria-label="Correct picks per graded jackpot" />
            </FbFigure>
          </div>
        </section>
      </template>
      <FbFootnote />
    </template>

  </div>
</template>

<script>
import '@/components/football/football.css'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { fb, loadMeta, forbiddenReason } from '@/components/football/fbState'
import { DEFAULT_TZ, money, fixed } from '@/components/football/fb'
import FbNoAccess from '@/components/football/FbNoAccess.vue'
import FbFootnote from '@/components/football/FbFootnote.vue'
import FbFigure from '@/components/football/charts/FbFigure.vue'
import FbMeterList from '@/components/football/charts/FbMeterList.vue'
import { fmtClose } from '@/components/football/jackpot/jp'
import { normJackpot } from '@/components/football/jackpot/jpApi'

export default {
  name: 'JackpotList',
  components: { FbNoAccess, FbFootnote, FbFigure, FbMeterList },
  data() {
    return { items: [], history: [], stats: null, loading: false, error: '', forbidden: '', tz: DEFAULT_TZ }
  },
  computed: {
    currency() {
      return fb.meta?.currency || 'KES'
    },
    now() {
      return new Date(fb.meta?.now || Date.now())
    },
    groups() {
      const isDone = (j) => j.status === 'graded' || !!(j.graded && j.graded.complete)
      const open = this.items.filter((j) => !isDone(j) && this.isOpen(j))
      const waiting = this.items.filter((j) => !isDone(j) && !this.isOpen(j))
      const done = this.items.filter(isDone)
      return [
        { key: 'open', label: 'Open', hint: 'Still taking tickets', items: open },
        { key: 'waiting', label: 'Waiting for results', hint: 'Closed; graded automatically as the results come in', items: waiting },
        { key: 'graded', label: 'Graded', hint: 'All results in', items: done }
      ].filter((g) => g.items.length)
    },
    graded() {
      return this.history.filter((j) => j.graded && j.graded.best_correct != null)
    },
    histRows() {
      return this.graded.map((j) => ({
        key: String(j.id),
        label: j.name,
        sub: `${j.bookmaker} · ${fmtClose(j.closes_at, this.tz)}`,
        value: j.graded.best_correct,
        max: j.games_count,
        color: 'var(--fb-home)',
        valueText: `${j.graded.best_correct}/${j.games_count}${j.graded.expected_correct != null ? ` · expected ${fixed(j.graded.expected_correct, 1)}` : ''}`,
        tip: [
          ['Most likely ticket', `${j.graded.best_correct} of ${j.games_count} right`],
          ['Expected before kick-off', j.graded.expected_correct != null ? fixed(j.graded.expected_correct, 1) : '—'],
          ['Best saved ticket', j.graded.best_ticket != null ? `${j.graded.best_ticket} right` : '—']
        ]
      }))
    },
    histTable() {
      return {
        cols: [{ label: 'Jackpot' }, { label: 'Closed' }, { label: 'Most likely ticket', num: true }, { label: 'Expected', num: true }, { label: 'Best saved ticket', num: true }],
        rows: this.graded.map((j) => [
          j.name,
          fmtClose(j.closes_at, this.tz),
          `${j.graded.best_correct}/${j.games_count}`,
          j.graded.expected_correct != null ? fixed(j.graded.expected_correct, 1) : '—',
          j.graded.best_ticket != null ? `${j.graded.best_ticket}/${j.games_count}` : '—'
        ])
      }
    }
  },
  async created() {
    await loadMeta(true)
    if (fb.forbidden) {
      this.forbidden = fb.forbidden
      return
    }
    if (fb.meta?.timezone) this.tz = fb.meta.timezone
    this.load()
  },
  methods: {
    money,
    fixed,
    fmtClose,
    isOpen(j) {
      return !j.closes_at || new Date(j.closes_at) > this.now
    },
    statusText(j) {
      if (j.graded && j.graded.complete) return 'Graded'
      if (j.graded) return 'Partly graded'
      if (j.status === 'draft') return 'Draft'
      return this.isOpen(j) ? 'Open' : 'Closed'
    },
    statusClass(j) {
      if (j.graded) return 'fb-pill--good'
      return this.isOpen(j) ? 'fb-pill--info' : ''
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const [d, h] = await Promise.all([footballApi.jackpots({ limit: 100 }), footballApi.jackpotHistory({ limit: 30 }).catch(() => null)])
        this.items = (d.jackpots || []).map(normJackpot)
        this.history = (h?.history || []).map(normJackpot)
        this.stats = h?.stats || null
      } catch (e) {
        this.forbidden = forbiddenReason(e)
        if (!this.forbidden) this.error = apiErrorMessage(e, 'Could not load your jackpots')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.fbjl__group + .fbjl__group,
.fbjl__hist {
  margin-top: 16px;
}
.fbjl__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.fbjl__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 18px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}
.fbjl__item:first-child {
  border-top: 0;
  padding-top: 0;
}
.fbjl__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
  color: var(--text);
  text-decoration: none;
  min-width: 0;
  flex: 1 1 260px;
}
.fbjl__main:hover .fbjl__name {
  text-decoration: underline;
}
.fbjl__name {
  font-weight: 650;
  font-size: 14.5px;
}
.fbjl__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
}
.fbjl__stat {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  line-height: 1.25;
}
.fbjl__stat strong {
  font-size: 13.5px;
}
</style>
