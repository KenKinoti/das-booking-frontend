<template>
  <FbSection id="value" title="What a ticket is worth" subtitle="Expected value of one combination with the most likely picks: prize, bonuses, and the share you would keep" open-on-phone>
    <div v-if="!ev" class="fb-muted">Add the prize and ticket price to see the expected value.</div>
    <template v-else>
      <div class="fbjv">
        <div class="fbjv__slider">
          <label class="ui-label" for="fbjv-share">Other winning tickets you would share the top prize with</label>
          <div class="fbjv__range">
            <input id="fbjv-share" v-model.number="lambda" type="range" min="0" :max="maxLambda" step="0.1" data-test="fb-jp-share" :aria-valuetext="shareText" />
            <span class="fbjv__val fb-num" data-test="fb-jp-share-val">{{ lambda.toFixed(1) }}</span>
          </div>
          <div class="fbjv__ticks fb-muted fb-small"><span>0 — you keep it all</span><span>{{ maxLambda }}</span></div>
          <p class="fbjv__explain">
            If every game on your ticket is right, other people's tickets may be right too, and the prize is split equally between all winning tickets. Most people pick
            favourites, so a ticket full of favourites is more likely to be shared. {{ modelLine }}
          </p>
          <p class="fbjv__keep">With {{ lambda.toFixed(1) }} other winners expected you would keep about <strong>{{ Math.round(cur.shareFactor * 100) }}%</strong> of the prize on average.</p>
          <div class="fbjv__btns">
            <button type="button" class="fb-linkbtn" :disabled="Math.abs(lambda - (ev.coWinners || 0)) < 1e-9" @click="lambda = Number(ev.coWinners || 0)"><i class="fa-solid fa-rotate-left"></i> Back to the estimate ({{ fixed(ev.coWinners, 1) }})</button>
            <button v-if="jackpotId" type="button" class="fb-linkbtn" :disabled="saving" data-test="fb-jp-share-save" @click="saveShare"><i class="fa-regular fa-floppy-disk"></i> Use {{ lambda.toFixed(1) }} for this jackpot</button>
          </div>
        </div>

        <div class="fbjv__out">
          <div class="fbjv__tiles">
            <div class="fbjv__tile">
              <div class="fbjv__k">Expected back per {{ money(ev.price) }} ticket</div>
              <div class="fbjv__v fb-num" data-test="fb-jp-ev-back" :data-v="(cur.evJackpot + (ev.evBonuses || 0)).toFixed(4)">{{ money(cur.evJackpot + (ev.evBonuses || 0)) }}</div>
            </div>
            <div class="fbjv__tile" :class="cur.evTotal >= 0 ? 'is-pos' : 'is-neg'">
              <div class="fbjv__k">Expected value</div>
              <div class="fbjv__v fb-num" data-test="fb-jp-ev-total" :data-v="cur.evTotal.toFixed(4)">{{ smoney(cur.evTotal) }}</div>
              <div class="fb-muted fb-small">{{ cur.back != null ? `${Math.round(cur.back * 100)} cents back per shilling` : '' }}</div>
            </div>
          </div>
          <FbFigure title="Where the expected return comes from" subtitle="Each part = amount × chance; the ticket price for comparison" :table="partsTable" chart-id="jp-ev-parts">
            <FbMeterList :rows="partRows" aria-label="Expected return by part, against the ticket price" />
          </FbFigure>
        </div>
      </div>
      <p class="fb-honest" style="margin-top: 14px" data-test="fb-jp-ev-honest">
        <i class="fa-solid fa-scale-balanced"></i>
        <span
          >{{ ev.explain }} Bonuses are counted as fixed amounts, as entered. The chance of the top prize is still {{ oneInTxt }}. 18+ only; spend only what you can afford to lose.</span
        >
      </p>
    </template>
  </FbSection>
</template>

<script>
import FbSection from '../match/FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbMeterList from '../charts/FbMeterList.vue'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { fixed, money as fmtMoney, smoney as fmtSmoney } from '../fb'
import { evWith } from './jpApi'
import { smallPct, oneIn } from './jp'

export default {
  name: 'JpEv',
  components: { FbSection, FbFigure, FbMeterList },
  props: {
    an: { type: Object, required: true },
    currency: { type: String, default: 'KES' },
    jackpotId: { type: String, default: '' },
    sharing: { type: Object, default: null }
  },
  emits: ['changed'],
  data() {
    const ev = this.an.ev
    const fixedCo = this.sharing?.mode === 'fixed' && this.sharing?.co_winners != null ? Number(this.sharing.co_winners) : null
    // Start exactly at the API's estimate so the first figures equal the API's; the slider moves in steps of 0.1.
    return { lambda: Number(fixedCo ?? ev?.coWinners ?? 0), saving: false }
  },
  computed: {
    ev() {
      return this.an.ev
    },
    maxLambda() {
      return Math.max(20, Math.ceil((this.ev?.coWinners || 0) * 2))
    },
    cur() {
      return evWith(this.ev, this.lambda)
    },
    shareText() {
      return `${this.lambda.toFixed(1)} other winners: you keep about ${Math.round(this.cur.shareFactor * 100)}% of the prize`
    },
    modelLine() {
      const s = this.an.sharing || {}
      if (s.mode === 'fixed') return `This jackpot is set to ${fixed(this.ev.coWinners, 1)} other winners.`
      return `The estimate here is ${fixed(this.ev.coWinners, 1)} other winners for this ticket, assuming about ${Number(this.ev.ticketsSold || s.tickets_sold || 0).toLocaleString()} tickets are sold and that favourites are over-picked.`
    },
    oneInTxt() {
      return oneIn(this.ev.pJackpot)
    },
    partRows() {
      const rows = [
        { key: 'top', label: 'Top prize share', sub: `${money(this.ev.prize, this.currency)} × ${smallPct(this.ev.pJackpot)} × ${Math.round(this.cur.shareFactor * 100)}% kept`, value: this.cur.evJackpot, valueText: this.money(this.cur.evJackpot) }
      ]
      for (const b of this.ev.bonuses) rows.push({ key: 'b' + b.correct, label: `Bonus for ${b.correct} right`, sub: `${this.money(b.amount)} × ${smallPct(b.p)}`, value: b.ev, valueText: this.money(b.ev) })
      rows.push({ key: 'price', label: 'Ticket price', sub: 'what one combination costs', value: this.ev.price, valueText: this.money(this.ev.price), color: 'var(--text-3)' })
      return rows
    },
    partsTable() {
      return { cols: [{ label: 'Part' }, { label: 'How', num: false }, { label: 'Amount', num: true }], rows: this.partRows.map((r) => [r.label, r.sub, r.valueText]) }
    }
  },
  methods: {
    fixed,
    round1(x) {
      return Math.round(x * 10) / 10
    },
    money(v) {
      return fmtMoney(v, this.currency)
    },
    smoney(v) {
      return fmtSmoney(v, this.currency)
    },
    async saveShare() {
      this.saving = true
      try {
        const v = await footballApi.updateJackpot(this.jackpotId, { sharing: { ...(this.sharing || {}), mode: 'fixed', co_winners: this.lambda } })
        toast.success(`Saved: ${this.lambda.toFixed(1)} other winners for this jackpot`)
        this.$emit('changed', v)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = false
      }
    }
  }
}

function money(v, c) {
  return fmtMoney(v, c)
}
</script>

<style scoped>
.fbjv {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 20px;
}
.fbjv__slider {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  align-content: start;
}
.fbjv__range {
  display: flex;
  align-items: center;
  gap: 10px;
}
.fbjv__range input {
  flex: 1;
  accent-color: var(--accent);
  min-width: 0;
}
.fbjv__val {
  font-size: 18px;
  font-weight: 700;
  min-width: 42px;
  text-align: right;
}
.fbjv__ticks {
  display: flex;
  justify-content: space-between;
}
.fbjv__explain,
.fbjv__keep {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}
.fbjv__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
}
.fbjv__out {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-content: start;
  min-width: 0;
}
.fbjv__tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.fbjv__tile {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
}
.fbjv__tile.is-pos {
  border-color: color-mix(in srgb, var(--fb-good) 50%, var(--border));
}
.fbjv__tile.is-neg {
  border-color: color-mix(in srgb, var(--fb-bad) 40%, var(--border));
}
.fbjv__k {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.fbjv__v {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
@media (max-width: 900px) {
  .fbjv {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 420px) {
  .fbjv__tiles {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
