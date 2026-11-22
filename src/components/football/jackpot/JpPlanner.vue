<template>
  <!-- v2.18 budget planner: type a budget, get the doubles / triples that buy the most chance of getting every game right
       for that money — combinations, cost, "1 in N", expected correct and the bonus tiers' chances. After grading: how many
       the plan would have got. -->
  <FbSection id="planner" title="Budget planner" :subtitle="subtitle" open-on-phone>
    <form class="fbjp__form" novalidate data-test="fb-jp-planner" @submit.prevent="run">
      <label class="ui-field fbjp__budget">
        <span class="ui-label">Your budget ({{ currency }})</span>
        <input
          v-model.number="budget"
          class="ui-input"
          type="number"
          inputmode="numeric"
          :min="price || 1"
          :step="price || 1"
          data-test="fb-jp-budget"
          aria-describedby="fbjp-help"
        />
      </label>
      <div class="fbjp__quick" role="group" aria-label="Quick budgets">
        <button v-for="b in quick" :key="b" type="button" class="fbjp__q" :class="{ 'is-on': budget === b }" @click="budget = b">{{ money(b, currency) }}</button>
      </div>
      <button type="submit" class="ui-btn ui-btn--primary fbjp__go" :disabled="busy || !(budget > 0)" data-test="fb-jp-plan">
        <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-wand-magic-sparkles'" aria-hidden="true"></i> Plan my covers
      </button>
    </form>
    <p id="fbjp-help" class="fb-honest fbjp__help">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span
        >One combination costs {{ money(price, currency) }}. On a slate of close games, covering more outcomes is the only real lever you have: a double doubles the cost, a triple
        triples it. The planner spends the budget where each extra combination buys the most chance. It never makes a jackpot likely — it only makes it less unlikely.</span
      >
    </p>
    <div v-if="error" class="ui-alert ui-alert--danger">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span>
    </div>

    <div v-if="p" class="fbjp__out" data-test="fb-jp-plan-result" :data-combos="p.combinations" :data-cost="p.cost">
      <div class="fbjp__tiles">
        <div class="fbjp__tile">
          <div class="fbjp__k">Combinations</div>
          <div class="fbjp__v" data-test="fb-jp-plan-combos">{{ (p.combinations ?? 0).toLocaleString() }}</div>
          <div class="fb-muted fb-small">
            cost {{ money(p.cost, currency)
            }}<template v-if="p.doubles != null"> · {{ p.doubles }} double{{ p.doubles === 1 ? '' : 's' }}, {{ p.triples }} triple{{ p.triples === 1 ? '' : 's' }}</template
            ><template v-if="p.left > 0"> · {{ money(p.left, currency) }} left over</template>
          </div>
        </div>
        <div class="fbjp__tile">
          <div class="fbjp__k">Every game right</div>
          <div class="fbjp__v" data-test="fb-jp-plan-onein">{{ p.one_in ? '1 in ' + p.one_in.toLocaleString() : oneIn(p.p_all) }}</div>
          <div class="fb-muted fb-small">
            {{ smallPct(p.p_all) }} chance<template v-if="p.base_one_in"> · one ticket: 1 in {{ p.base_one_in.toLocaleString() }}</template>
          </div>
        </div>
        <div class="fbjp__tile">
          <div class="fbjp__k">Expected right</div>
          <div class="fbjp__v" data-test="fb-jp-plan-expected">
            {{ p.expected_correct != null ? p.expected_correct.toFixed(1) : '—' }} <span>of {{ nGames }}</span>
          </div>
          <div class="fb-muted fb-small">counting a covered game as right when any covered outcome happens</div>
        </div>
        <div v-if="p.would_have" class="fbjp__tile fbjp__tile--graded" data-test="fb-jp-plan-graded" :data-v="p.would_have.correct">
          <div class="fbjp__k">After the results</div>
          <div class="fbjp__v">
            {{ p.would_have.correct }} <span>of {{ p.would_have.of || nGames }}</span>
          </div>
          <div class="fb-muted fb-small">
            this plan would have got {{ p.would_have.correct }} right<template v-if="p.would_have.all"> — the jackpot</template
            ><template v-else-if="p.would_have.bonus"> — a bonus of {{ money(p.would_have.bonus.amount, currency) }}</template>
          </div>
        </div>
      </div>

      <div v-if="p.bonus.length" class="fbjp__bonus">
        <div class="fb-fig__title">Chance of each prize tier with this plan</div>
        <FbMeterList :rows="bonusRows" mode="bars" color="var(--fb-actual)" aria-label="Chance of at least k right with this plan" data-test="fb-jp-plan-bonus" />
      </div>

      <div class="fbjp__ticket">
        <div class="fb-fig__title">Your covers</div>
        <span class="fb-ticket" :aria-label="'Plan: ' + p.picks.join(' ')"
          ><b v-for="(c, i) in p.picks" :key="i" :class="{ 'is-multi': c.length > 1 }" :title="'Game ' + (i + 1)">{{ c }}</b></span
        >
        <div class="fbjp__acts">
          <button type="button" class="fb-linkbtn" @click="copy"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copy</button>
          <button type="button" class="fb-linkbtn" :disabled="saving" data-test="fb-jp-plan-save" @click="save">
            <i class="fa-regular fa-bookmark" aria-hidden="true"></i> Save as a ticket
          </button>
        </div>
      </div>
      <div class="fb-scroll">
        <table class="fb-table fb-table--nowrap" data-test="fb-jp-plan-games">
          <thead>
            <tr>
              <th class="num">#</th>
              <th>Game</th>
              <th>Cover</th>
              <th class="num">Chance covered</th>
              <th v-if="p.would_have">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in p.games" :key="g.n" :data-game="g.n" :data-cover="g.cover" :class="{ 'is-hl': g.cover.length > 1 }">
              <td class="num fb-muted">{{ g.n }}</td>
              <td>{{ g.label }}</td>
              <td>
                <span class="fb-ticket"
                  ><b :class="{ 'is-multi': g.cover.length > 1 }">{{ g.cover }}</b></span
                >
                <span v-if="g.cover.length > 1" class="fb-muted fb-small fbjp__kind">{{ g.kind || (g.cover.length === 2 ? 'double' : 'triple') }}</span>
              </td>
              <td class="num">{{ g.p != null ? pct(g.p, 0) : '—' }}</td>
              <td v-if="p.would_have">
                <span v-if="g.correct != null" class="fb-mk" :class="g.correct ? 'fb-mk--correct' : 'fb-mk--wrong'"
                  ><i :class="g.correct ? 'fa-solid fa-check' : 'fa-solid fa-xmark'" aria-hidden="true"></i>{{ g.correct ? 'Covered' : 'Missed' }}</span
                >
                <span v-else class="fb-muted fb-small">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="p.explain" class="fb-honest" data-test="fb-jp-plan-explain">
        <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i><span>{{ p.explain }}</span>
      </p>
      <details v-if="p.ladder.length > 1" class="fbjp__ladder" data-test="fb-jp-plan-ladder">
        <summary>What more (or less) money buys</summary>
        <div class="fb-scroll">
          <table class="fb-table fb-table--nowrap">
            <thead>
              <tr>
                <th class="num">Budget</th>
                <th class="num">Combinations</th>
                <th class="num">Cost</th>
                <th class="num">Every game right</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in p.ladder" :key="l.budget" :class="{ 'is-hl': l.combinations === p.combinations }">
                <td class="num">{{ money(l.budget, currency) }}</td>
                <td class="num">{{ (l.combinations ?? 0).toLocaleString() }}</td>
                <td class="num">{{ money(l.cost, currency) }}</td>
                <td class="num">{{ l.one_in ? '1 in ' + l.one_in.toLocaleString() : oneIn(l.p_all) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
      <p v-if="p.maxCombos" class="fb-muted fb-small" style="margin: 0">
        Plans are kept to {{ p.maxCombos }} combinations at most.<template v-if="p.basis"> Chances used: {{ p.basis }}.</template> {{ p.note }}
      </p>
      <p v-else-if="p.note" class="fb-muted fb-small" style="margin: 0">{{ p.note }}</p>
    </div>
  </FbSection>
</template>

<script>
import '../verdict/verdict.css'
import FbSection from '../match/FbSection.vue'
import FbMeterList from '../charts/FbMeterList.vue'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { money, pct } from '../fb'
import { oneIn, smallPct, copyText, ticketText } from './jp'
import { pick } from './jpApi'

const n = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

export default {
  name: 'JpPlanner',
  components: { FbSection, FbMeterList },
  props: {
    jackpotId: { type: String, required: true },
    an: { type: Object, required: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'KES' },
    bonuses: { type: Array, default: () => [] },
    results: { type: Array, default: () => [] } // the jackpot's games with result / void (for "covered / missed")
  },
  emits: ['changed'],
  data() {
    const price = this.price || 0
    return { budget: price ? price * 8 : 1000, busy: false, saving: false, error: '', raw: null }
  },
  computed: {
    nGames() {
      return this.an.nGames
    },
    quick() {
      const pr = this.price || 0
      if (!pr) return [500, 1000, 5000]
      return [...new Set([pr * 2, pr * 8, pr * 32, pr * 96].filter((x) => x > 0))]
    },
    subtitle() {
      return 'Type what you want to spend; get the doubles and triples that buy the most chance for it'
    },
    /** POST /football/jackpots/:id/plan → { budget, ticket_price, max_combinations, plan: { picks, combinations, cost, p_all,
     *  one_in, expected_correct, doubles, triples, singles, games[], at_least[], graded }, single, ladder[], explain }. */
    p() {
      const raw = this.raw
      if (!raw) return null
      const r = raw.plan || raw
      const games = (r.games || []).map((g, i) => {
        const ag = this.an.games[i] || {}
        return {
          n: n(g.n) ?? i + 1,
          label: g.home ? `${g.home} v ${g.away}` : ag.label || `Game ${i + 1}`,
          cover: pick(g.covered || g.cover || g.pick || ag.pick),
          kind: g.kind || '',
          p: n(g.p_covered ?? g.p),
          correct: g.correct != null ? !!g.correct : this.coveredResult(g.n ?? i + 1, pick(g.covered || g.cover || g.pick || ag.pick))
        }
      })
      const picks = (r.picks || []).length ? r.picks.map(pick) : games.map((g) => g.cover)
      const cost = n(r.cost)
      const budget = n(raw.budget)
      const graded = r.graded || null
      return {
        games,
        picks,
        combinations: n(r.combinations),
        cost,
        left: budget != null && cost != null ? budget - cost : null,
        p_all: n(r.p_all),
        one_in: n(r.one_in),
        base_one_in: n(raw.single?.one_in),
        expected_correct: n(r.expected_correct),
        doubles: n(r.doubles),
        triples: n(r.triples),
        bonus: (r.at_least || []).map((b) => ({ k: n(b.k), p: n(b.p), amount: this.bonusAmount(n(b.k)) })).filter((b) => b.k != null),
        would_have: graded ? { correct: n(graded.correct), of: n(graded.of), bonus: graded.bonus || null, all: !!graded.all_correct } : null,
        maxCombos: n(raw.max_combinations),
        ladder: (raw.ladder || []).map((l) => ({ budget: n(l.budget), combinations: n(l.combinations), cost: n(l.cost), p_all: n(l.p_all), one_in: n(l.one_in) })),
        explain: raw.explain || '',
        basis: raw.basis || '',
        note: raw.disclaimer || ''
      }
    },
    bonusRows() {
      return (this.p?.bonus || []).map((b) => ({
        key: 'k' + b.k,
        label: b.k === this.nGames ? `All ${b.k} right` : `${b.k} or more right`,
        sub: b.k === this.nGames ? 'the jackpot' : b.amount ? `bonus ${money(b.amount, this.currency)}` : '',
        value: b.p || 0,
        valueText: `${smallPct(b.p)} · ${oneIn(b.p)}`,
        tip: [
          ['Chance', smallPct(b.p)],
          ['That is', oneIn(b.p)]
        ]
      }))
    }
  },
  methods: {
    money,
    pct,
    oneIn,
    smallPct,
    reveal() {},
    coveredResult(nn, cover) {
      const g = this.results.find((x) => Number(x.n) === Number(nn))
      if (!g || g.void || !g.result) return null
      return cover.includes(String(g.result).toUpperCase())
    },
    bonusAmount(k) {
      return (this.bonuses || []).find((b) => Number(b.correct) === k)?.amount ?? null
    },
    async run() {
      this.busy = true
      this.error = ''
      try {
        this.raw = await footballApi.planJackpot(this.jackpotId, { budget: Number(this.budget) })
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not plan the covers')
      } finally {
        this.busy = false
      }
    },
    async copy() {
      if (this.p && (await copyText(ticketText(this.p.picks)))) toast.success(`Copied: ${ticketText(this.p.picks)}`)
    },
    async save() {
      if (!this.p) return
      this.saving = true
      try {
        this.$emit(
          'changed',
          await footballApi.addJackpotTicket(this.jackpotId, { name: `Budget plan ${money(this.p.cost, this.currency)}`, picks: this.p.picks, source: 'cover' })
        )
        toast.success('Plan saved as a ticket')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the plan'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.fbjp__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 12px;
}
.fbjp__budget {
  margin: 0;
  min-width: 160px;
  flex: 0 1 200px;
}
.fbjp__budget .ui-input {
  min-height: 44px;
}
.fbjp__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fbjp__q {
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.fbjp__q.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
}
.fbjp__q:focus-visible {
  outline: 2px solid var(--accent);
}
.fbjp__go {
  min-height: 44px;
}
.fbjp__help {
  margin: 12px 0 0;
}
.fbjp__out {
  margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.fbjp__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.fbjp__tile {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
}
.fbjp__tile--graded {
  border-color: var(--border-strong);
}
.fbjp__k {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.fbjp__v {
  font-size: 21px;
  font-weight: 700;
}
.fbjp__v span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
}
.fbjp__ticket {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.fbjp__ticket .fb-fig__title {
  width: 100%;
}
.fbjp__acts {
  display: flex;
  gap: 4px;
}
.fbjp__acts .fb-linkbtn {
  min-height: 36px;
}
.fbjp__kind {
  margin-left: 6px;
}
.fbjp__ladder summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 650;
  font-size: 13.5px;
}
</style>
