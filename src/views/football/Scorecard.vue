<template>
  <div class="ui-page fb fbsc" data-test="fb-scorecard">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Football</div>
        <h1>Scorecard</h1>
        <p>How DASYIN's picks did, counted honestly: only picks frozen before kick-off, graded after full time, compared with what their own chances said.</p>
      </div>
      <div class="ui-actions">
        <router-link class="ui-btn" to="/football"><i class="fa-regular fa-futbol"></i> Match centre</router-link>
        <router-link class="ui-btn ui-btn--ghost" to="/football/model"><i class="fa-solid fa-scale-balanced"></i> Model record</router-link>
      </div>
    </header>

    <FbNoAccess v-if="forbidden" :reason="forbidden" />
    <template v-else>
      <!-- One filter row above everything it scopes -->
      <div class="fbsc-filters" data-test="fb-sc-filters">
        <div class="fbsc-periods" role="radiogroup" aria-label="Period">
          <button
            v-for="p in PERIODS"
            :key="p.key"
            type="button"
            role="radio"
            class="fbsc-chip"
            :class="{ 'is-on': period === p.key }"
            :aria-checked="period === p.key"
            :data-period="p.key"
            @click="setPeriod(p.key)"
          >
            {{ p.label }}
          </button>
        </div>
        <div v-if="period === 'custom'" class="fbsc-custom">
          <label class="fbsc-date"><span>From</span><input v-model="from" class="ui-input" type="date" data-test="fb-sc-from" :max="to || undefined" /></label>
          <label class="fbsc-date"><span>To</span><input v-model="to" class="ui-input" type="date" data-test="fb-sc-to" :min="from || undefined" /></label>
          <button type="button" class="ui-btn" :disabled="!from || !to" data-test="fb-sc-apply" @click="apply">Show</button>
        </div>
        <div class="fbsc-ctrls">
          <select v-model="competition" class="ui-select" aria-label="Competition" data-test="fb-sc-competition" @change="apply">
            <option value="">All competitions</option>
            <option v-for="c in competitions" :key="c.id" :value="String(c.id)">{{ c.name }}{{ c.country && c.country !== 'World' ? ` (${c.country})` : '' }}</option>
          </select>
          <select v-model="tier" class="ui-select" aria-label="Tier" data-test="fb-sc-tier" @change="apply">
            <option value="">All tiers</option>
            <option v-for="t in tiers" :key="t.key" :value="t.key">{{ t.label }} ({{ t.range }})</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px">
        <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
      </div>

      <div v-if="!sc && !error">
        <div class="ui-skeleton" style="height: 90px; margin-bottom: 16px"></div>
        <div class="ui-skeleton" style="height: 120px; margin-bottom: 16px"></div>
        <div class="ui-skeleton" style="height: 260px"></div>
      </div>

      <div v-if="sc" class="fbsc-body" :style="{ opacity: loading ? 0.6 : 1 }">
        <p class="fbsc-when fb-muted fb-small" data-test="fb-sc-period">
          {{ periodLine }} · times in {{ tz.replace('_', ' ')
          }}<template v-if="t.no_pick || t.void">
            · not counted: {{ [t.no_pick ? `${t.no_pick} without a frozen pick` : '', t.void ? `${t.void} void` : ''].filter(Boolean).join(', ') }}</template
          >
        </p>

        <!-- Plain-English verdict -->
        <section class="fb-panel fbsc-verdict" data-test="fb-sc-verdict" :data-graded="t.graded" :data-correct="t.correct">
          <i class="fa-solid fa-square-check" aria-hidden="true"></i>
          <div>
            <p class="fbsc-verdict__txt">{{ verdictText }}</p>
            <p v-if="verdictChip" class="fbsc-verdict__chip">
              <span class="fb-mk" :class="verdictChip.cls" data-test="fb-sc-verdict-chip" :data-verdict="t.verdict"
                ><i :class="verdictChip.icon" aria-hidden="true"></i>{{ verdictChip.text }}</span
              >
            </p>
            <p v-if="sc.note" class="fbsc-verdict__note">{{ sc.note }}</p>
            <p class="fb-muted fb-small fbsc-verdict__foot">
              The “normal range” is where 8 results in 10 land if every pick's chance was right (the 10th to 90th percentile). Results inside it are luck either way; below it is
              worth a look. Estimates, never certainties. 18+.
            </p>
          </div>
        </section>

        <template v-if="t.graded">
          <!-- Tiles -->
          <div class="fbsc-tiles" data-test="fb-sc-tiles">
            <div class="ui-kpi fbsc-tile" data-tile="right" :data-v="t.correct" :data-of="t.graded">
              <div class="ui-kpi__label">Picks right</div>
              <div class="fbsc-tile__v">
                {{ t.correct }} <span>of {{ t.graded }}</span>
              </div>
              <div class="ui-kpi__meta">{{ pct(t.hit_rate, 0) }} hit rate</div>
            </div>
            <div class="ui-kpi fbsc-tile" data-tile="expected" :data-v="t.expected" :data-low="t.expected_low" :data-high="t.expected_high">
              <div class="ui-kpi__label">Their chances said</div>
              <div class="fbsc-tile__v">about {{ t.expected != null ? fmt1(t.expected) : '—' }}</div>
              <div class="ui-kpi__meta">
                normal range {{ t.expected_low ?? '—' }}–{{ t.expected_high ?? '—' }}<template v-if="rangeWord"> · {{ rangeWord }}</template>
              </div>
            </div>
            <div v-if="sc.safer" class="ui-kpi fbsc-tile" data-tile="safer" :data-v="sc.safer.correct" :data-of="sc.safer.graded">
              <div class="ui-kpi__label">Safer picks right</div>
              <div class="fbsc-tile__v">
                {{ sc.safer.correct }} <span>of {{ sc.safer.graded }}</span>
              </div>
              <div class="ui-kpi__meta">{{ pct(sc.safer.hit_rate, 0) }} · the pick or the draw (double chance)</div>
            </div>
            <div v-if="sc.goals" class="ui-kpi fbsc-tile" data-tile="goals" :data-v="sc.goals.correct" :data-of="sc.goals.graded">
              <div class="ui-kpi__label">Goals lean right</div>
              <div class="fbsc-tile__v">
                {{ sc.goals.correct }} <span>of {{ sc.goals.graded }}</span>
              </div>
              <div class="ui-kpi__meta">
                {{ pct(sc.goals.hit_rate, 0) }} · over/under 2.5<template v-if="sc.btts && sc.btts.graded"> · both score {{ pct(sc.btts.hit_rate, 0) }}</template>
              </div>
            </div>
            <div v-if="sc.favourite" class="ui-kpi fbsc-tile" data-tile="favourite" :data-v="sc.favourite.correct" :data-of="sc.favourite.graded">
              <div class="ui-kpi__label">Bookmaker favourite</div>
              <div class="fbsc-tile__v">
                {{ sc.favourite.correct ?? '—' }} <span>of {{ sc.favourite.graded ?? '—' }}</span>
              </div>
              <div class="ui-kpi__meta">
                {{ pct(sc.favourite.hit_rate, 0)
                }}<template v-if="sc.favourite.agreement_rate != null">
                  · our pick was the favourite in
                  {{ sc.favourite.agreement != null ? sc.favourite.agreement + ' of ' + sc.favourite.graded : pct(sc.favourite.agreement_rate, 0) }}</template
                >
              </div>
            </div>
          </div>
          <p v-if="sc.scores && sc.scores.graded" class="fb-muted fb-small fbsc-scores" data-test="fb-sc-exact">
            Exact scores: {{ sc.scores.correct }} of {{ sc.scores.graded }} likeliest scores landed ({{ pct(sc.scores.hit_rate, 0) }}) — exact scores land about 1 time in 9, so
            treat them as a guide only.
          </p>

          <div class="fbsc-grid">
            <!-- Tier bars -->
            <section class="fb-panel" data-test="fb-sc-tiers">
              <div class="fb-panel__head">
                <div>
                  <h2>By pick level</h2>
                  <p>Hit rate per tier in this period, against what the chances said and against the open history</p>
                </div>
              </div>
              <div class="fb-panel__body">
                <FbFigure
                  title="Hit rate per tier"
                  subtitle="Stronger picks should come off more often; small samples swing a lot"
                  :legend="[
                    { name: 'Actual (bar, shaded by tier)', color: 'var(--fb-tier-good)' },
                    { name: 'Expected from the chances (tick)', color: 'var(--text)', kind: 'tick' },
                    { name: historyName + ' (ring)', color: 'transparent', kind: 'ring' }
                  ]"
                  :table="tierTable"
                  chart-id="sc-tiers"
                >
                  <FbTierBars :rows="sc.byTier" :history-label="historyName" aria-label="Hit rate per tier: actual, expected and history" />
                  <template #foot>
                    History: how often the bookmakers' favourite at each level won in
                    <a v-if="sc.history && sc.history.url" :href="sc.history.url" target="_blank" rel="noopener noreferrer">{{ historySource }}</a
                    ><template v-else>{{ historySource }}</template
                    >.
                  </template>
                </FbFigure>
              </div>
            </section>

            <!-- Weekly line -->
            <section class="fb-panel" data-test="fb-sc-weekly">
              <div class="fb-panel__head">
                <div>
                  <h2>Week by week</h2>
                  <p>Share of picks right each week, with what the chances said and the normal range</p>
                </div>
              </div>
              <div class="fb-panel__body">
                <FbFigure
                  v-if="sc.weekly.length >= 2"
                  title="Hit rate per week"
                  subtitle="Weeks starting Monday · the shaded band is the normal range"
                  :legend="[
                    { name: 'Actual', color: 'var(--fb-actual)', kind: 'line' },
                    { name: 'Expected', color: 'var(--fb-expected)', kind: 'line' },
                    { name: 'Normal range', color: 'var(--fb-expected)', kind: 'band' }
                  ]"
                  :table="weeklyTable"
                  chart-id="sc-weekly"
                >
                  <FbLine
                    :series="weeklySeries"
                    :bands="weeklyBands"
                    :y-domain="[0, 1]"
                    :y-ticks="[0, 0.25, 0.5, 0.75, 1]"
                    :format-y="(v) => Math.round(v * 100) + '%'"
                    :format-x="weekX"
                    :format-x-tip="weekTip"
                    :format-value="(v) => pct(v, 0)"
                    :tip-note="weekNote"
                    :height="230"
                    aria-label="Hit rate per week against the expected rate and the normal range"
                  />
                </FbFigure>
                <p v-else class="fb-muted fb-small" data-test="fb-sc-weekly-short">
                  The weekly line appears when the period covers two weeks or more<template v-if="sc.weekly.length === 1"
                    >: this week {{ sc.weekly[0].correct }} of {{ sc.weekly[0].graded }} right</template
                  >.
                </p>
              </div>
            </section>
          </div>

          <!-- Rows -->
          <section class="fb-panel" data-test="fb-sc-rows">
            <div class="fb-panel__head">
              <div>
                <h2>Every graded pick</h2>
                <p>{{ sc.rows.length }} match{{ sc.rows.length === 1 ? '' : 'es' }} · the pick frozen before kick-off and how it went</p>
              </div>
            </div>
            <div class="fb-panel__body">
              <table class="fb-table fbsc-rows" aria-label="Graded picks">
                <thead>
                  <tr>
                    <th>Kick-off</th>
                    <th>Match</th>
                    <th>Pick</th>
                    <th>Safer pick</th>
                    <th class="num">Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in rowsView" :key="r.key" :data-fixture="r.id" :data-result="r.result ? r.result.kind : ''">
                    <td data-label="Kick-off" class="fb-small fbsc-ko">
                      <template v-if="r.kickoff"
                        ><span>{{ fmtDay(r.kickoff, tz) }}</span> <span class="fb-muted">{{ fmtTime(r.kickoff, tz) }}</span></template
                      ><template v-else>—</template>
                    </td>
                    <td data-label="Match">
                      <router-link v-if="r.id" :to="`/football/match/${r.id}`" class="fbsc-match">{{ r.match }}</router-link
                      ><span v-else class="fbsc-match">{{ r.match }}</span>
                      <span v-if="r.competition" class="fb-muted fb-small fbsc-comp">{{ r.competition }}</span>
                    </td>
                    <td data-label="Pick">
                      <span class="fbsc-pick fbsc-pick--main"
                        ><FbTierPips :tier="r.tier" /><span class="fbsc-pick__t"
                          >{{ r.pickLabel }} · <span class="fb-num">{{ pct(r.p, 0) }}</span></span
                        ><span v-if="r.pickMark" class="fb-mk" :class="'fb-mk--' + r.pickMark" :title="r.pickMark === 'correct' ? 'Correct' : 'Wrong'"
                          ><i :class="r.pickMark === 'correct' ? 'fa-solid fa-check' : 'fa-solid fa-xmark'" aria-hidden="true"></i
                          ><span class="sr-only">{{ r.pickMark === 'correct' ? 'Correct' : 'Wrong' }}</span></span
                        ></span
                      >
                    </td>
                    <td data-label="Safer pick">
                      <span v-if="r.safer" class="fbsc-pick"
                        >{{ r.safer
                        }}<span v-if="r.saferMark" class="fb-mk" :class="'fb-mk--' + r.saferMark"
                          ><i :class="r.saferMark === 'correct' ? 'fa-solid fa-check' : 'fa-solid fa-xmark'" aria-hidden="true"></i
                          >{{ r.saferMark === 'correct' ? 'Correct' : 'Wrong' }}</span
                        ></span
                      >
                      <span v-else class="fb-muted">—</span>
                    </td>
                    <td data-label="Score" class="num fb-num">{{ r.score || '—' }}</td>
                    <td data-label="Result"><FbResultBadge v-if="r.result" :check="r.result" small /><span v-else class="fb-muted">—</span></td>
                  </tr>
                </tbody>
              </table>
              <button v-if="sc.rows.length > rowLimit" type="button" class="ui-btn ui-btn--ghost fbsc-more" @click="rowLimit += 50">
                Show more ({{ sc.rows.length - rowLimit }} left)
              </button>
            </div>
          </section>

          <!-- By competition -->
          <section v-if="sc.byCompetition.length > 1" class="fb-panel" data-test="fb-sc-competitions">
            <div class="fb-panel__head">
              <div>
                <h2>By competition</h2>
                <p>Small samples swing a lot — read these as a hint, not a verdict</p>
              </div>
            </div>
            <div class="fb-panel__body">
              <div class="fb-scroll">
                <table class="fb-table fb-table--nowrap">
                  <thead>
                    <tr>
                      <th>Competition</th>
                      <th class="num">Graded</th>
                      <th class="num">Right</th>
                      <th class="num">Hit rate</th>
                      <th class="num">Expected rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in sc.byCompetition" :key="c.competition_id || c.id || c.name" :data-competition="c.competition_id || c.id">
                      <td>{{ c.name || c.competition }}</td>
                      <td class="num">{{ c.graded }}</td>
                      <td class="num">{{ c.correct }}</td>
                      <td class="num">{{ pct(c.hit_rate, 0) }}</td>
                      <td class="num">{{ c.expected_rate != null ? pct(c.expected_rate, 0) : c.expected != null ? fmt1(c.expected) : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </template>

        <div v-else class="ui-empty fb-panel" data-test="fb-sc-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-square-check"></i></div>
          <h3>No graded picks in this period</h3>
          <p>Picks are graded after full time, and only picks frozen before kick-off count. Try a longer period or another competition.</p>
        </div>

        <!-- Graded jackpots -->
        <section v-if="sc.jackpots.length" class="fb-panel" data-test="fb-sc-jackpots">
          <div class="fb-panel__head">
            <div>
              <h2>Jackpots graded in this period</h2>
              <p>The most likely ticket against what its chances said</p>
            </div>
          </div>
          <div class="fb-panel__body">
            <ul class="fbsc-jps">
              <li v-for="j in sc.jackpots" :key="j.id" :data-jackpot="j.id">
                <router-link :to="`/football/jackpot/${j.id}`" class="fbsc-match">{{ j.name }}</router-link>
                <span
                  ><strong>{{ j.correct }} of {{ j.of }}</strong> right<template v-if="j.expected != null"> · expected {{ fmt1(j.expected) }}</template
                  ><template v-if="j.low != null && j.high != null"> (normal {{ j.low }}–{{ j.high }})</template></span
                >
                <span class="fb-mk" :class="jpWord(j).cls">{{ jpWord(j).text }}</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
      <FbFootnote />
    </template>
  </div>
</template>

<script>
import '@/components/football/football.css'
import '@/components/football/verdict/verdict.css'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { fb, loadMeta, forbiddenReason } from '@/components/football/fbState'
import { DEFAULT_TZ, pct, fmtDay, fmtTime, fmtShortDate } from '@/components/football/fb'
import FbNoAccess from '@/components/football/FbNoAccess.vue'
import FbFootnote from '@/components/football/FbFootnote.vue'
import FbFigure from '@/components/football/charts/FbFigure.vue'
import FbLine from '@/components/football/charts/FbLine.vue'
import FbTierBars from '@/components/football/charts/FbTierBars.vue'
import FbTierPips from '@/components/football/verdict/FbTierPips.vue'
import FbResultBadge from '@/components/football/verdict/FbResultBadge.vue'
import { TIERS, TIER_ORDER, tierKeyOf, markKind, HISTORY } from '@/components/football/verdict/verdict'
import { PERIODS, normScorecard, periodText } from '@/components/football/scorecard/sc'

const SEL = (s, home, away) =>
  ({ 1: `${home} win`, X: 'Draw', 2: `${away} win`, '1X': `${home} or draw`, X2: `Draw or ${away}`, 12: `${home} or ${away}` })[String(s || '').toUpperCase()] || s || ''

export default {
  name: 'FootballScorecard',
  components: { FbNoAccess, FbFootnote, FbFigure, FbLine, FbTierBars, FbTierPips, FbResultBadge },
  data() {
    const q = this.$route.query
    const per = PERIODS.some((p) => p.key === q.period) ? q.period : 'weekend'
    return {
      PERIODS,
      period: per,
      from: typeof q.from === 'string' ? q.from : '',
      to: typeof q.to === 'string' ? q.to : '',
      competition: typeof q.competition === 'string' ? q.competition : '',
      tier: TIERS[q.tier] ? q.tier : '',
      competitions: [],
      sc: null,
      error: '',
      forbidden: '',
      loading: false,
      tz: DEFAULT_TZ,
      reqId: 0,
      rowLimit: 50
    }
  },
  computed: {
    tiers() {
      return TIER_ORDER.map((k) => TIERS[k])
    },
    t() {
      return this.sc?.totals || {}
    },
    periodLine() {
      const p = this.sc?.period || {}
      if (p.label) return p.label
      const name = PERIODS.find((x) => x.key === this.period)?.label || ''
      return p.from ? `${name} · ${periodText(p, this.tz)}` : name
    },
    historySource() {
      const h = this.sc?.history
      if (!h) return 'Club Football Match Data 2019/20–2026 (76,528 matches)'
      return `${h.source}${h.n ? `, ${Number(h.n).toLocaleString('en')} matches` : ''}${h.from && h.to ? ` (${String(h.from).slice(0, 4)}–${String(h.to).slice(0, 4)})` : ''}`
    },
    /** The API's verdict key as a chip: icon + words (never colour alone). */
    verdictChip() {
      const k = this.t.verdict
      const m = {
        as_expected: { text: 'About what the chances said', icon: 'fa-solid fa-equals', cls: 'fb-mk--none' },
        bad_luck: { text: 'Below expected, inside the normal range', icon: 'fa-solid fa-arrow-down', cls: 'fb-mk--none' },
        good_luck: { text: 'Above expected, inside the normal range', icon: 'fa-solid fa-arrow-up', cls: 'fb-mk--none' },
        below_range: { text: 'Below the normal range — worth a look', icon: 'fa-solid fa-triangle-exclamation', cls: 'fb-mk--wrong' },
        above_range: { text: 'Above the normal range', icon: 'fa-solid fa-arrow-up', cls: 'fb-mk--correct' },
        too_few: { text: 'Too few graded picks to judge', icon: 'fa-solid fa-hourglass-half', cls: 'fb-mk--none' }
      }
      return m[k] || null
    },
    historyName() {
      return 'History'
    },
    rangeWord() {
      const t = this.t
      if (t.expected_low == null || t.expected_high == null || !t.graded) return ''
      if (t.correct < t.expected_low) return 'below the normal range'
      if (t.correct > t.expected_high) return 'above the normal range'
      return 'inside the normal range'
    },
    verdictText() {
      if (this.sc?.verdictText) return this.sc.verdictText
      const t = this.t
      if (!t.graded) return 'No graded picks in this period yet.'
      return `${t.correct} of ${t.graded} right. The picks' own chances said about ${t.expected != null ? Math.round(t.expected) : '—'} (normal range ${t.expected_low ?? '—'}–${t.expected_high ?? '—'}).`
    },
    tierTable() {
      return {
        cols: [
          { label: 'Tier' },
          { label: 'Graded', num: true },
          { label: 'Right', num: true },
          { label: 'Actual', num: true },
          { label: 'Expected', num: true },
          { label: 'History', num: true }
        ],
        rows: (this.sc?.byTier || []).map((r) => [
          `${r.label} (${r.range})`,
          r.graded,
          r.correct,
          r.graded ? pct(r.hit_rate, 0) : '—',
          pct(r.expected_rate, 0),
          pct(r.history_hit_rate, 0)
        ])
      }
    },
    weeks() {
      return (this.sc?.weekly || []).filter((w) => w.graded > 0)
    },
    weeklySeries() {
      return [
        { key: 'actual', name: 'Actual', color: 'var(--fb-actual)', dots: true, points: this.weeks.map((w, i) => ({ x: i, y: w.correct / w.graded })) },
        { key: 'expected', name: 'Expected', color: 'var(--fb-expected)', points: this.weeks.map((w, i) => ({ x: i, y: w.expected != null ? w.expected / w.graded : null })) }
      ]
    },
    weeklyBands() {
      const pts = this.weeks.map((w, i) => (w.low != null && w.high != null ? { x: i, y0: w.low / w.graded, y1: w.high / w.graded } : null)).filter(Boolean)
      return pts.length > 1 ? [{ key: 'range', name: 'Normal range', color: 'var(--fb-expected)', opacity: 0.16, points: pts, tip: (x) => this.bandTip(x) }] : []
    },
    weeklyTable() {
      return {
        cols: [{ label: 'Week of' }, { label: 'Graded', num: true }, { label: 'Right', num: true }, { label: 'Expected', num: true }, { label: 'Normal range', num: true }],
        rows: this.weeks.map((w) => [this.weekDate(w), w.graded, w.correct, w.expected != null ? this.fmt1(w.expected) : '—', w.low != null ? `${w.low}–${w.high}` : '—'])
      }
    },
    rowsView() {
      return (this.sc?.rows || []).slice(0, this.rowLimit).map((r, i) => {
        const fx = typeof r.fixture === 'object' && r.fixture ? r.fixture : {}
        const teams = r.teams || fx
        const home = teams.home?.name || teams.home || r.home || 'Home'
        const away = teams.away?.name || teams.away || r.away || 'Away'
        const id = fx.id ?? r.fixture_id ?? (typeof r.fixture !== 'object' ? r.fixture : null) ?? r.id
        const marks = r.marks || r.result_check || {}
        const pickSel = r.pick?.selection || r.pick
        const saferSel = r.safer?.selection || r.safer
        const comp = r.competition?.name || r.competition || ''
        return {
          key: id ?? i,
          id,
          kickoff: r.kickoff || fx.kickoff,
          match: `${home} v ${away}`,
          competition: typeof comp === 'string' ? comp : '',
          tier: r.tier?.key || r.tier || tierKeyOf(r.p) || 'coinflip',
          pickLabel: r.pick_label || r.pick?.label || SEL(pickSel, home, away),
          p: r.p,
          pickMark: markKind(marks.pick),
          safer: r.safer_label || r.safer?.label || (saferSel ? SEL(saferSel, home, away) : ''),
          saferMark: markKind(marks.safer),
          score: (typeof r.score === 'string' ? r.score : r.score?.final) || (typeof marks.score === 'string' ? marks.score : '') || '',
          result: r.result
        }
      })
    }
  },
  async created() {
    await loadMeta(true)
    if (fb.forbidden) {
      this.forbidden = fb.forbidden
      return
    }
    if (fb.meta?.timezone) this.tz = fb.meta.timezone
    footballApi
      .competitions()
      .then((d) => (this.competitions = d.competitions || []))
      .catch(() => {})
    this.load()
  },
  methods: {
    pct,
    fmtDay,
    fmtTime,
    periodText,
    fmt1(v) {
      return Number(v).toFixed(1).replace(/\.0$/, '')
    },
    setPeriod(k) {
      this.period = k
      if (k !== 'custom') this.apply()
    },
    apply() {
      const query = {
        period: this.period !== 'weekend' ? this.period : undefined,
        from: this.period === 'custom' ? this.from || undefined : undefined,
        to: this.period === 'custom' ? this.to || undefined : undefined,
        competition: this.competition || undefined,
        tier: this.tier || undefined
      }
      this.$router.replace({ query: Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined)) }).catch(() => {})
      this.load()
    },
    async load() {
      if (this.period === 'custom' && (!this.from || !this.to)) return
      const id = ++this.reqId
      this.loading = true
      this.error = ''
      try {
        const d = await footballApi.scorecard({
          period: this.period,
          from: this.period === 'custom' ? this.from : undefined,
          to: this.period === 'custom' ? this.to : undefined,
          competition: this.competition,
          tier: this.tier
        })
        if (id !== this.reqId) return
        if (d?.timezone) this.tz = d.timezone
        this.sc = normScorecard(d)
        this.rowLimit = 50
      } catch (e) {
        if (id !== this.reqId) return
        this.forbidden = forbiddenReason(e)
        if (!this.forbidden) this.error = apiErrorMessage(e, 'Could not load the scorecard')
      } finally {
        if (id === this.reqId) this.loading = false
      }
    },
    weekDate(w) {
      return w.week_start ? fmtShortDate(w.week_start.length === 10 ? w.week_start + 'T12:00:00Z' : w.week_start, 'UTC') : ''
    },
    weekX(i) {
      return this.weeks[i] ? this.weekDate(this.weeks[i]) : ''
    },
    weekTip(i) {
      return this.weeks[i] ? `Week of ${this.weekDate(this.weeks[i])}` : ''
    },
    weekNote(i) {
      const w = this.weeks[i]
      return w ? `${w.correct} of ${w.graded} right${w.expected != null ? ` · expected ${this.fmt1(w.expected)}` : ''}` : ''
    },
    bandTip(i) {
      const w = this.weeks[i]
      return w && w.low != null ? `${w.low}–${w.high} right` : null
    },
    jpWord(j) {
      if (j.low == null || j.high == null || j.correct == null) return { text: '', cls: '' }
      if (j.correct < j.low) return { text: 'below the normal range', cls: 'fb-mk--wrong' }
      if (j.correct > j.high) return { text: 'above the normal range', cls: 'fb-mk--correct' }
      return { text: 'inside the normal range', cls: 'fb-mk--none' }
    },
    HISTORY
  }
}
</script>

<style scoped>
.fbsc-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 12px;
}
.fbsc-periods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fbsc-chip {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.fbsc-chip:hover {
  border-color: var(--border-strong);
  color: var(--text);
}
.fbsc-chip.is-on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}
.fbsc-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.fbsc-custom {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
}
.fbsc-date {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbsc-date .ui-input {
  width: auto;
}
.fbsc-ctrls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}
.fbsc-ctrls .ui-select {
  width: auto;
  max-width: 260px;
}
.fbsc-when {
  margin: 0 0 10px;
}
.fbsc-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  transition: opacity 0.15s;
}
.fbsc-verdict {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px 20px;
}
.fbsc-verdict > i {
  font-size: 22px;
  color: var(--accent);
  margin-top: 3px;
}
.fbsc-verdict__txt {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.01em;
}
.fbsc-verdict__foot {
  margin: 6px 0 0;
}
.fbsc-verdict__chip {
  margin: 6px 0 0;
  font-size: 13px;
}
.fbsc-verdict__note {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-2);
}
.fbsc-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}
.fbsc-tile {
  padding: 14px 16px;
}
.fbsc-tile__v {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 6px;
  line-height: 1.15;
}
.fbsc-tile__v span {
  font-size: 15px;
  font-weight: 550;
  color: var(--text-3);
}
.fbsc-scores {
  margin: -6px 0 0;
}
.fbsc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.fbsc-match {
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
}
a.fbsc-match:hover {
  text-decoration: underline;
}
.fbsc-comp {
  display: block;
}
.fbsc-pick {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.fbsc-rows td {
  vertical-align: top;
}
.fbsc-ko span {
  display: block;
  white-space: nowrap;
}
.fbsc-pick--main {
  flex-wrap: nowrap;
  align-items: flex-start;
}
.fbsc-pick--main .fb-pips {
  margin-top: 3px;
}
.fbsc-pick__t {
  min-width: 0;
}
.fbsc-more {
  margin-top: 10px;
  min-height: 44px;
}
.fbsc-jps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.fbsc-jps li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
@media (max-width: 1100px) {
  .fbsc-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 640px) {
  .fbsc-chip {
    min-height: 44px;
  }
  .fbsc-ctrls {
    margin-left: 0;
    width: 100%;
  }
  .fbsc-ctrls .ui-select {
    flex: 1 1 140px;
    max-width: none;
    min-height: 44px;
  }
  .fbsc-verdict {
    padding: 14px;
  }
  .fbsc-verdict__txt {
    font-size: 15.5px;
  }
  .fbsc-tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .fbsc-tile__v {
    font-size: 21px;
  }
  /* rows become cards on phones: one line per field with its label */
  .fbsc-rows thead {
    display: none;
  }
  .fbsc-rows,
  .fbsc-rows tbody,
  .fbsc-rows tr,
  .fbsc-rows td {
    display: block;
    width: 100%;
  }
  .fbsc-rows tr {
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .fbsc-rows td {
    position: relative;
    display: block;
    min-height: 22px;
    padding: 3px 0 3px 94px;
    border: 0;
    text-align: left;
  }
  .fbsc-rows td::before {
    content: attr(data-label);
    position: absolute;
    left: 0;
    top: 4px;
    width: 86px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-3);
  }
  .fbsc-rows td.num {
    text-align: left;
  }
  .fbsc-ko span {
    display: inline;
  }
}
</style>
