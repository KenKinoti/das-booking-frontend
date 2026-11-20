<template>
  <FbSection id="cover" title="Doubles & triples" subtitle="Which games to cover first, and how fast the chance grows against the number of combinations you pay for" open-on-phone>
    <FbFigure
      title="Combinations against the chance of getting every game right"
      :subtitle="`Each point adds the next cover from the priority list below. One combination costs ${money(price)}.`"
      :table="coverTable"
      chart-id="jp-coverage"
    >
      <div class="fbjc__ctl">
        <div class="fb-seg" role="radiogroup" aria-label="Chance axis">
          <button type="button" role="radio" :aria-checked="!logY" :class="{ 'is-on': !logY }" @click="logY = false">Chance: even steps</button>
          <button type="button" role="radio" :aria-checked="logY" :class="{ 'is-on': logY }" data-test="fb-jp-cov-log" @click="logY = true">Chance: log scale</button>
        </div>
      </div>
      <FbCoverage :points="points" :price="price" :currency="currency" :games="an.nGames" :log-y="logY" :mark="plan ? plan.combos : null" :height="270" />
    </FbFigure>

    <div class="fbjc__plans" data-test="fb-jp-plans">
      <div class="fb-fig__title">Ready-made plans</div>
      <div class="fb-fig__sub">Pick one to mark its covers on the games chart and on the curve above.</div>
      <div class="fbjc__planlist" role="radiogroup" aria-label="Cover plan">
        <button
          v-for="(p, i) in plans"
          :key="i"
          type="button"
          role="radio"
          class="fbjc__plan"
          :class="{ 'is-on': plan && plan.label === p.label }"
          :aria-checked="!!(plan && plan.label === p.label)"
          :data-plan="p.combos"
          @click="$emit('plan', plan && plan.label === p.label ? null : p)"
        >
          <strong>{{ p.label }}</strong>
          <span>{{ p.combos.toLocaleString() }} combination{{ p.combos === 1 ? '' : 's' }}</span>
          <span>{{ money(p.cost) }}</span>
          <span class="fb-muted">chance 1 in {{ p.oneIn ? p.oneIn.toLocaleString() : '—' }}</span>
        </button>
      </div>
      <div v-if="plan" class="fbjc__chosen">
        <span class="fb-ticket" :aria-label="'Plan picks: ' + ticketText(plan.picks)"
          ><b v-for="(p, i) in plan.picks" :key="i" :class="{ 'is-multi': p.length > 1 }" :title="'Game ' + (i + 1)">{{ p }}</b></span
        >
        <button type="button" class="fb-linkbtn" @click="copy(plan.picks)"><i class="fa-regular fa-copy"></i> Copy</button>
        <button type="button" class="fb-linkbtn" :disabled="saving" @click="save(plan)"><i class="fa-regular fa-bookmark"></i> Save as a ticket</button>
      </div>
    </div>

    <div class="fbjc__prio">
      <div class="fb-fig__title">Priority list</div>
      <div class="fb-fig__sub">
        Cover the game where an extra selection buys the most chance for each extra combination. Doubling a game doubles the cost; tripling triples it.
      </div>
      <div class="fb-scroll" style="margin-top: 6px">
        <table class="fb-table fb-table--nowrap" data-test="fb-jp-priority">
          <thead>
            <tr>
              <th class="num">Step</th>
              <th>Game</th>
              <th>Cover</th>
              <th class="num">Combinations</th>
              <th class="num">Cost</th>
              <th class="num">Chance of {{ an.nGames }}/{{ an.nGames }}</th>
              <th class="num" title="How many times more likely the ticket becomes with this step">Chance ×</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in an.cover" :key="c.step" :data-step="c.step" :data-game="c.game" :class="{ 'is-hl': plan && c.combos <= plan.combos }">
              <td class="num fb-muted">{{ c.step }}</td>
              <td>{{ c.game }}. {{ gameName(c.game) }}</td>
              <td>
                <span class="fb-ticket"><b class="is-multi">{{ c.picks }}</b></span>
                <span class="fb-muted fb-small"> add {{ c.add }}, a {{ c.kind }}</span>
              </td>
              <td class="num">{{ c.combos?.toLocaleString() }}</td>
              <td class="num">{{ money(c.cost) }}</td>
              <td class="num">1 in {{ c.oneIn ? c.oneIn.toLocaleString() : '—' }}</td>
              <td class="num">{{ c.gain != null ? '×' + c.gain.toFixed(2) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="fb-honest" style="margin-top: 12px">
        <i class="fa-solid fa-scale-balanced"></i>
        <span>Covering more games raises the chance but the cost grows faster: {{ lastLine }} The jackpot's full set is {{ an.combosFull ? an.combosFull.toLocaleString() : '—' }} combinations.</span>
      </p>
    </div>
  </FbSection>
</template>

<script>
import FbSection from '../match/FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbCoverage from '../charts/FbCoverage.vue'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { money as fmtMoney } from '../fb'
import { smallPct, copyText, ticketText } from './jp'

export default {
  name: 'JpCover',
  components: { FbSection, FbFigure, FbCoverage },
  props: {
    an: { type: Object, required: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'KES' },
    plan: { type: Object, default: null },
    jackpotId: { type: String, default: '' }
  },
  emits: ['plan', 'changed'],
  data() {
    return { logY: false, saving: false }
  },
  computed: {
    points() {
      const ml = this.an.mostLikely
      const pts = []
      if (ml.p) pts.push({ combos: 1, p: ml.p, added: 'The most likely ticket, no covers' })
      for (const c of this.an.cover) pts.push({ combos: c.combos, p: c.p, added: `Step ${c.step}: game ${c.game} (${this.gameName(c.game)}) → ${c.picks}, a ${c.kind}` })
      return pts
    },
    plans() {
      const one = this.an.mostLikely
      return [{ label: 'Single ticket', combos: 1, cost: this.price, p: one.p, oneIn: one.oneIn, picks: one.picks }].concat(this.an.plans)
    },
    coverTable() {
      return {
        cols: [{ label: 'Combinations', num: true }, { label: 'Cost', num: true }, { label: 'Chance', num: true }, { label: '1 in', num: true }, { label: 'Step' }],
        rows: this.points.map((p) => [p.combos.toLocaleString(), this.money(p.combos * this.price), smallPct(p.p), Math.round(1 / p.p).toLocaleString(), p.added])
      }
    },
    lastLine() {
      const last = this.an.cover[this.an.cover.length - 1]
      if (!last) return ''
      return `${last.combos.toLocaleString()} combinations cost ${this.money(last.cost)} and still win only about 1 in ${last.oneIn?.toLocaleString()}.`
    }
  },
  methods: {
    ticketText,
    money(v) {
      return fmtMoney(v, this.currency)
    },
    gameName(n) {
      const g = this.an.games.find((x) => x.n === n)
      return g ? `${g.home} v ${g.away}` : ''
    },
    async copy(picks) {
      const ok = await copyText(ticketText(picks))
      if (ok) toast.success(`Copied: ${ticketText(picks)}`)
    },
    async save(p) {
      if (!this.jackpotId) return
      this.saving = true
      try {
        const v = await footballApi.addJackpotTicket(this.jackpotId, { name: p.label, picks: p.picks, source: p.combos > 1 ? 'cover' : 'most_likely' })
        toast.success(`Saved “${p.label}”`)
        this.$emit('changed', v)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the ticket'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.fbjc__ctl {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}
.fbjc__plans,
.fbjc__prio {
  margin-top: 20px;
}
.fbjc__planlist {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.fbjc__plan {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.fbjc__plan.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent);
}
.fbjc__plan:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.fbjc__chosen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 10px;
}
</style>
