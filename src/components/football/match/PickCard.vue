<template>
  <!-- v2.18 "The pick": one plain verdict at the top of the match page, with how often picks like it came off, the safer
       pick, the goals lean, the likeliest scores and a draw alert. "How we got 64%" opens the consensus behind it. -->
  <section id="pick" class="fb-panel fbpk" data-section="pick" aria-labelledby="pick-h">
    <header class="fb-panel__head">
      <div>
        <h2 id="pick-h">The pick</h2>
        <p>{{ subtitle }}</p>
      </div>
      <FbResultBadge v-if="rc" :check="rc" test-id="fb-pick-result" />
    </header>

    <div class="fb-panel__body">
      <div v-if="!v" class="fbpk__none" data-test="fb-pick-none" :data-reason="noPick ? noPick.key : ''">
        <i class="fa-regular fa-circle-question" aria-hidden="true"></i>
        <span v-if="noPick && noPick.key === 'not_enough_data'"
          ><strong>No pick — not enough data.</strong> {{ noPick.reason }}.
          {{ finished ? 'So this match is not graded.' : 'A pick appears as soon as there is a price, ClubElo ratings or enough match history.' }}</span
        >
        <span v-else>{{ finished ? 'No pick — nothing was locked before kick-off, so this match is not graded.' : 'No pick yet — there are no prices or ratings for this match so far.' }}</span>
      </div>
      <ul v-if="!v && checks.length" class="fbpk__checks" data-test="fb-pick-checks">
        <li v-for="c in checks" :key="c.key" :data-ok="c.ok ? '1' : '0'">
          <span class="fb-mk" :class="c.ok ? 'fb-mk--correct' : 'fb-mk--none'"
            ><i :class="c.ok ? 'fa-solid fa-check' : 'fa-solid fa-minus'" aria-hidden="true"></i>{{ c.label }}</span
          ><span v-if="!c.ok && c.why" class="fb-muted fb-small"> — {{ c.why }}</span>
        </li>
      </ul>

      <template v-else>
        <div class="fbpk__main" data-test="fb-pick" :data-pick="v.pick" :data-p="v.p" :data-tier="v.tier.key">
          <div class="fbpk__what">
            <span class="fbpk__k">{{ finished ? 'Pick before kick-off' : 'Pick' }}</span>
            <span class="fbpk__label" data-test="fb-pick-label">{{ v.pick_label }}</span>
          </div>
          <div class="fbpk__chance">
            <span class="fbpk__k">Chance</span>
            <span class="fbpk__pct" data-test="fb-pick-p">{{ pct(v.p, 0) }}</span>
            <span v-if="v.fair_odds" class="fb-muted fb-small">fair odds {{ Number(v.fair_odds).toFixed(2) }}</span>
          </div>
          <div class="fbpk__tier">
            <span class="fbpk__k">Level</span>
            <span class="fbpk__tierv" data-test="fb-pick-tier"><FbTierPips :tier="v.tier.key" /> {{ v.tier.label }}</span>
          </div>
        </div>

        <p class="fbpk__hist" data-test="fb-pick-history">
          <template v-if="v.tier.history && v.tier.history.hit_rate != null">
            In past matches, picks at this level ({{ v.tier.range }}) came off <strong>{{ pct(v.tier.history.hit_rate, 0) }}</strong> of the time<template v-if="v.tier.history.n">
              ({{ v.tier.history.n.toLocaleString() }} matches)</template
            >.
          </template>
          <template v-if="v.tier.own">
            DASYIN's own {{ v.tier.label.toLowerCase() }} picks: <strong>{{ pct(v.tier.own.hit_rate, 0) }}</strong> of {{ v.tier.own.n.toLocaleString() }} graded.</template
          >
          <template v-else> DASYIN's own record at this level shows once 30 picks are graded.</template>
          <span v-if="v.tier.history && v.tier.history.source" class="fb-muted"> Source: {{ v.tier.history.source }}.</span>
        </p>
        <p v-if="v.tier.note" class="fb-honest" data-test="fb-pick-note">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>{{ v.tier.note }}</span>
        </p>

        <div class="fbpk__facts">
          <div v-if="v.safer" class="fbpk__fact" data-test="fb-pick-safer">
            <span class="fbpk__k">Safer pick</span>
            <span class="fbpk__v">{{ v.safer.label }} · {{ pct(v.safer.p, 0) }}</span>
            <span v-if="v.safer.history_hit_rate != null" class="fb-muted fb-small">came off {{ pct(v.safer.history_hit_rate, 0) }} of the time in past matches at this level</span>
          </div>
          <div v-if="v.goals" class="fbpk__fact" data-test="fb-pick-goals">
            <span class="fbpk__k">Goals lean</span>
            <span class="fbpk__v">{{ goalsText(v.goals) }} · {{ pct(v.goals.p, 0) }}</span>
            <span v-if="v.btts" class="fb-muted fb-small">{{ bttsText(v.btts) }} · {{ pct(v.btts.p, 0) }}</span>
          </div>
          <div v-if="v.top_scores.length" class="fbpk__fact" data-test="fb-pick-scores">
            <span class="fbpk__k">Likeliest scores</span>
            <span class="fbpk__v fbpk__scores">
              <span v-for="s in v.top_scores" :key="s.score" class="fbpk__score"
                ><b class="fb-num">{{ s.score }}</b> <span class="fb-muted fb-num">{{ pct(s.p, 0) }}</span></span
              >
            </span>
            <span class="fb-muted fb-small">{{ v.score_note }}</span>
          </div>
          <div v-if="v.draw_alert" class="fbpk__fact fbpk__fact--alert" data-test="fb-pick-draw">
            <span class="fbpk__v"
              ><span class="fb-dalert"><i class="fa-solid fa-equals" aria-hidden="true"></i>Draw alert</span></span
            >
            <span class="fb-small">{{ v.draw_alert.why }}</span>
          </div>
        </div>

        <details class="fbpk__how" data-test="fb-pick-how" :open="howOpen" @toggle="howOpen = $event.target.open">
          <summary>
            <span>How we got {{ pct(v.p, 0) }}</span
            ><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </summary>
          <div class="fbpk__howbody">
            <p class="fb-small fbpk__lead">
              The chance is a weighted blend of the sources below (bookmaker margins removed). {{ weightsText }}
              <template v-if="v.consensus && v.consensus.as_of">As of {{ fmtDateTime(v.consensus.as_of || v.as_of, tz) }}.</template>
            </p>
            <FbFigure
              v-if="srcRows.length"
              title="Each source's home win · draw · away win"
              subtitle="Rows add up to 100%; the last row is the blend the pick comes from"
              :legend="[
                { name: f.home.name, color: 'var(--fb-home)' },
                { name: 'Draw', color: 'var(--fb-draw)' },
                { name: f.away.name, color: 'var(--fb-away)' }
              ]"
              :table="srcTable"
              chart-id="pick-consensus"
            >
              <FbStack :rows="srcRows" :names="[f.home.name, 'Draw', f.away.name]" />
            </FbFigure>
            <div class="fb-scroll">
              <table class="fb-table fb-table--nowrap" data-test="fb-pick-sources">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th class="num">Weight</th>
                    <th class="num">1 · X · 2</th>
                    <th>As of</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in sources" :key="s.key" :data-source="s.key" :data-weight="s.weight">
                    <td>
                      <i
                        class="fbpk__sw"
                        :class="{ 'is-ring': s.style.ring }"
                        :style="s.style.ring ? { boxShadow: 'inset 0 0 0 2px ' + s.style.color } : { background: s.style.color }"
                        aria-hidden="true"
                      ></i>
                      <a v-if="s.url" :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a
                      ><template v-else>{{ s.label }}</template>
                    </td>
                    <td class="num">{{ s.weight != null ? pct(s.weight, 0) : '—' }}</td>
                    <td class="num">{{ trioText(s.probs) }}</td>
                    <td class="fb-small">{{ s.as_of ? fmtDateTime(s.as_of, tz) : '—' }}</td>
                  </tr>
                  <tr class="is-hl">
                    <td><strong>Blend</strong></td>
                    <td class="num">100%</td>
                    <td class="num">
                      <strong>{{ trioText(blend) }}</strong>
                    </td>
                    <td class="fb-small">{{ v.locked_at || v.frozen_at ? 'locked ' + fmtDateTime(v.locked_at || v.frozen_at, tz) : 'until kick-off' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="missing.length" class="fb-small fbpk__lead" data-test="fb-pick-missing">
              Not used for this match:
              <template v-for="(m, i) in missing" :key="m.key"
                >{{ i ? '; ' : '' }}<strong>{{ m.label || consensusLabel(m.key) }}</strong> ({{ m.why }})</template
              >.
            </p>
            <div v-if="poly" class="fbpk__extra" data-test="fb-pick-polymarket">
              <div class="fb-fig__title">
                Polymarket markets<template v-if="poly.detail && poly.detail.title"> · {{ poly.detail.title }}</template>
              </div>
              <div class="fb-fig__sub">
                Mid prices of each yes/no market; a market is used only with enough money in it and a tight bid–ask spread<template
                  v-if="!polyMarkets.length && poly.detail && poly.detail.n_markets"
                  >. Built from {{ poly.detail.n_markets }} markets: {{ trioText(trio(poly.probs)) }}</template
                >.
              </div>
              <div v-if="polyMarkets.length" class="fb-scroll">
                <table class="fb-table fb-table--nowrap">
                  <thead>
                    <tr>
                      <th>Outcome</th>
                      <th class="num">Mid</th>
                      <th class="num">Bid – ask</th>
                      <th class="num">Liquidity</th>
                      <th>Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="m in polyMarkets" :key="m.outcome" :data-outcome="m.outcome">
                      <td>{{ outcomeLabel(m.outcome) }}</td>
                      <td class="num">{{ pct(m.mid, 1) }}</td>
                      <td class="num">{{ m.best_bid != null ? pct(m.best_bid, 0) : '—' }} – {{ m.best_ask != null ? pct(m.best_ask, 0) : '—' }}</td>
                      <td class="num">{{ m.liquidity != null ? 'US$' + Math.round(m.liquidity).toLocaleString('en') : '—' }}</td>
                      <td>
                        <span v-if="m.used" class="fb-mk fb-mk--correct"><i class="fa-solid fa-check" aria-hidden="true"></i>Used</span
                        ><span v-else class="fb-mk fb-mk--none"
                          >Not used<template v-if="m.why"> — {{ m.why }}</template></span
                        >
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <a v-if="poly.url" :href="poly.url" target="_blank" rel="noopener noreferrer" class="fb-small"
                >Open on Polymarket <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i
              ></a>
            </div>
            <p v-if="apf && apf.detail" class="fb-small fbpk__lead" data-test="fb-pick-apf">
              API-Football's own prediction: {{ apfPct }}<template v-if="apf.detail.advice"> · its advice: “{{ apf.detail.advice }}”</template> — a free opinion with a small
              weight.
            </p>
            <p class="fb-muted fb-small fbpk__lead">
              Missing sources are left out and the weights of the others scaled up. The market is not “corrected”: closing prices are already well calibrated on draws. Tiers come
              from this blended chance: Strong 60%+, Good 50–60%, Close call 42–50%, Coin-flip under 42%.
            </p>
          </div>
        </details>
      </template>
      <p class="fb-muted fb-small fbpk__foot">Estimates, never certainties. 18+. The pick that is graded is the one stored before kick-off — nothing is regraded afterwards.</p>
    </div>
  </section>
</template>

<script>
import '../verdict/verdict.css'
import FbTierPips from '../verdict/FbTierPips.vue'
import FbResultBadge from '../verdict/FbResultBadge.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbStack from '../charts/FbStack.vue'
import { pct, fmtDateTime, isFinished } from '../fb'
import { normVerdict, normResult, verdictFromResult, goalsText, bttsText, CONSENSUS_STYLE, consensusLabel } from '../verdict/verdict'
import { trio } from '../jackpot/jpApi'
import { noPickOf } from '../results/lock'

export default {
  name: 'PickCard',
  components: { FbTierPips, FbResultBadge, FbFigure, FbStack },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  data() {
    return { howOpen: false }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    v() {
      return normVerdict(this.a.verdict) || verdictFromResult(this.a.result_check)
    },
    finished() {
      return isFinished(this.f.status)
    },
    rc() {
      const r = normResult(this.a.result_check)
      return r && r.kind !== 'pending' ? r : null
    },
    missing() {
      return this.v?.consensus?.missing || []
    },
    poly() {
      return (this.a.source_probs || []).find((x) => x.source === 'polymarket') || null
    },
    polyMarkets() {
      return this.poly?.detail?.markets || []
    },
    apf() {
      return (this.a.source_probs || []).find((x) => x.source === 'apifootball_pred') || null
    },
    apfPct() {
      const p = this.apf?.detail?.percent
      if (p) return `${this.f.home.name} ${p.home}, draw ${p.draw}, ${this.f.away.name} ${p.away}`
      const t = trio(this.apf?.probs)
      return t ? this.trioText(t) : ''
    },
    noPick() {
      return noPickOf(this.a, { finished: this.finished })
    },
    checks() {
      const np = this.a.no_pick || null
      return (np && np.checks) || []
    },
    subtitle() {
      if (!this.v) return 'One plain pick per match'
      // v2.19.1: locked early, refreshed until kick-off, then final.
      const lock = this.a.lock
      if (lock && lock.status === 'locked' && lock.label) {
        return lock.final ? `${lock.label} — this is the pick that is graded` : `${lock.label} · refreshes with the prices until kick-off, then it's final`
      }
      if (this.v.frozen_at) return `Locked before kick-off (${fmtDateTime(this.v.frozen_at, this.tz)}) — this is the pick that is graded`
      return `Updates with the prices until kick-off${this.v.as_of ? ' · as of ' + fmtDateTime(this.v.as_of, this.tz) : ''}`
    },
    blend() {
      return trio(this.v?.consensus?.probs) || null
    },
    sources() {
      return (this.v?.consensus?.sources || []).map((s) => ({
        ...s,
        label: s.label || consensusLabel(s.key),
        probs: trio(s.probs),
        weight: s.weight == null ? null : Number(s.weight),
        style: CONSENSUS_STYLE[s.key] || { color: 'var(--text-3)', ring: true }
      }))
    },
    weightsText() {
      const w = this.v?.consensus?.weights_from
      if (w === 'learned') return 'The weights were learned from DASYIN’s graded matches and beat the defaults on matches held back for checking.'
      return 'Default weights: the sharp market counts most.'
    },
    srcRows() {
      const rows = this.sources
        .filter((s) => s.probs)
        .map((s) => ({
          key: s.key,
          label: s.label,
          sub: s.weight != null ? `weight ${pct(s.weight, 0)}` : '',
          h: s.probs.h,
          d: s.probs.d,
          a: s.probs.a,
          dot: s.style.color,
          ring: s.style.ring
        }))
      if (this.blend) rows.push({ key: 'blend', label: 'Blend', sub: `pick ${this.v.pick_label}`, h: this.blend.h, d: this.blend.d, a: this.blend.a })
      return rows
    },
    srcTable() {
      return {
        cols: [{ label: 'Source' }, { label: 'Weight', num: true }, { label: this.f.home.name, num: true }, { label: 'Draw', num: true }, { label: this.f.away.name, num: true }],
        rows: this.srcRows.map((r) => [r.label, r.key === 'blend' ? '100%' : r.sub.replace('weight ', ''), pct(r.h), pct(r.d), pct(r.a)])
      }
    }
  },
  methods: {
    pct,
    fmtDateTime,
    goalsText,
    bttsText,
    consensusLabel,
    trio,
    outcomeLabel(o) {
      return { 1: `${this.f.home.name} win`, X: 'Draw', 2: `${this.f.away.name} win` }[String(o).toUpperCase()] || o
    },
    trioText(t) {
      if (!t) return '—'
      return [t.h, t.d, t.a].map((x) => (x == null ? '—' : Math.round(x * 100))).join(' · ')
    },
    reveal() {
      /* always open; kept for the page's section jump */
    }
  }
}
</script>

<style scoped>
.fbpk {
  scroll-margin-top: calc(var(--topbar-h, 64px) + 64px);
}
.fbpk__none {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-2);
  font-size: 13.5px;
  line-height: 1.45;
}
.fbpk__checks {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 4px;
  font-size: 13px;
}
.fbpk__main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px 32px;
}
.fbpk__what,
.fbpk__chance,
.fbpk__tier {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.fbpk__k {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbpk__label {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.fbpk__pct {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.fbpk__tierv {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.5;
}
.fbpk__tierv .fb-pips {
  transform: scale(1.25);
  transform-origin: left bottom;
  margin-right: 3px;
}
.fbpk__hist {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
.fbpk__hist strong {
  color: var(--text);
}
.fbpk .fb-honest {
  margin: 10px 0 0;
}
.fbpk__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.fbpk__fact {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  min-width: 0;
}
.fbpk__fact--alert {
  border-color: color-mix(in srgb, var(--warning) 40%, var(--border));
}
.fbpk__v {
  font-weight: 650;
  font-size: 14px;
}
.fbpk__scores {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.fbpk__how {
  margin-top: 14px;
  border-top: 1px solid var(--border);
}
.fbpk__how summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
  font-weight: 650;
  font-size: 14px;
  list-style: none;
}
.fbpk__how summary::-webkit-details-marker {
  display: none;
}
.fbpk__how summary i {
  font-size: 12px;
  color: var(--text-3);
  transition: transform 0.15s;
}
.fbpk__how[open] summary i {
  transform: rotate(180deg);
}
.fbpk__how summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}
.fbpk__howbody {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 4px;
}
.fbpk__lead {
  margin: 0;
  color: var(--text-2);
}
.fbpk__sw {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 7px;
  vertical-align: 0;
}
.fbpk__extra {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}
.fbpk__foot {
  margin: 12px 0 0;
}
@media (max-width: 640px) {
  .fbpk__main {
    gap: 10px 22px;
  }
  .fbpk__label,
  .fbpk__pct {
    font-size: 22px;
  }
}
</style>
