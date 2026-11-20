<template>
  <FbSection id="price-check" title="Price check" subtitle="Type the odds your app offers — SportPesa, Betika, Odibets… — and see them against the fair price and the model" open-on-phone>
    <div class="fbpc">
      <form class="fbpc__form" novalidate @submit.prevent="record">
        <div class="ui-field">
          <span class="ui-label" id="fbpc-mk">Market</span>
          <div class="fb-seg fbpc__markets" role="radiogroup" aria-labelledby="fbpc-mk">
            <button v-for="m in MARKETS" :key="m.key" type="button" role="radio" :aria-checked="market === m.key" :class="{ 'is-on': market === m.key }" :data-test="'fb-pc-market-' + m.key" @click="setMarket(m.key)">
              {{ m.short }}
            </button>
          </div>
        </div>
        <div class="ui-field">
          <span class="ui-label" id="fbpc-sel">Selection</span>
          <div class="fbpc__sels" role="radiogroup" aria-labelledby="fbpc-sel">
            <button
              v-for="s in currentMarket.selections"
              :key="s"
              type="button"
              role="radio"
              class="fbpc__sel"
              :class="{ 'is-on': sel === s }"
              :aria-checked="sel === s"
              :data-test="'fb-pc-sel-' + s"
              @click="sel = s"
            >
              {{ selShort(s) }}
            </button>
          </div>
        </div>
        <div class="fbpc__row">
          <div v-if="currentMarket.needsLine" class="ui-field">
            <label class="ui-label" for="fbpc-line">{{ market === 'ou' ? 'Goals line' : 'Handicap (your team)' }}</label>
            <select id="fbpc-line" v-model.number="ln" class="ui-select" data-test="fb-pc-line">
              <option v-for="l in lines" :key="l" :value="l">{{ market === 'ah' ? line(l) : l }}{{ pricedLines.includes(l) ? ' · priced' : '' }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbpc-book">Bookmaker</label>
            <select id="fbpc-book" v-model="book" class="ui-select" data-test="fb-pc-book">
              <option v-for="b in bookmakers" :key="b" :value="b">{{ b }}</option>
              <option value="__other">Other…</option>
            </select>
            <input v-if="book === '__other'" v-model.trim="otherBook" class="ui-input" style="margin-top: 6px" placeholder="Bookmaker name" aria-label="Bookmaker name" maxlength="80" />
          </div>
        </div>
        <div class="fbpc__row">
          <div class="ui-field">
            <label class="ui-label" for="fbpc-odds">Odds offered (decimal)</label>
            <input id="fbpc-odds" v-model="oddsIn" class="ui-input fbpc__odds" inputmode="decimal" autocomplete="off" placeholder="e.g. 2.10" data-test="fb-pc-odds" @input="onOdds" />
            <span v-if="oddsError" class="ui-field__error">{{ oddsError }}</span>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbpc-stake">Stake ({{ currency }})</label>
            <input id="fbpc-stake" v-model="stakeIn" class="ui-input" inputmode="decimal" autocomplete="off" :placeholder="suggestedStake > 0 ? String(suggestedStake) : 'Amount'" data-test="fb-pc-stake" />
          </div>
        </div>

        <div class="fbpc__btns">
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="!canRecord || saving" data-test="fb-pc-record">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-receipt'"></i> Record this bet
          </button>
          <button type="button" class="ui-btn" :disabled="!validOdds || savingPrice" data-test="fb-pc-save" @click="savePrice">
            <i class="fa-regular fa-bookmark"></i> Save price
          </button>
        </div>
        <div v-if="recordError" class="ui-alert ui-alert--danger fbpc__err" data-test="fb-pc-error" role="alert">
          <i class="fa-solid fa-hand"></i><span>{{ recordError }}</span>
        </div>
      </form>

      <!-- Result -->
      <div class="fbpc__out" aria-live="polite" data-test="fb-pc-result">
        <div class="fbpc__label">{{ label }}</div>
        <div class="fbpc__cmp">
          <div class="fbpc__box" :class="boxClass(evFair)" data-test="fb-pc-fair">
            <div class="fbpc__k">Against the fair price</div>
            <div class="fbpc__v fb-num" data-test="fb-pc-ev-fair" :data-v="evFair == null ? '' : evFair.toFixed(6)">{{ evFair == null ? '—' : spct(evFair) }}</div>
            <div class="fbpc__s">
              <template v-if="fairP != null">fair {{ pct(fairP) }} · fair odds {{ odds(1 / fairP) }}</template>
              <template v-else>No sharp or consensus price for this selection</template>
            </div>
            <div class="fbpc__s fb-muted">{{ fairSourceText }}</div>
          </div>
          <div class="fbpc__box" :class="boxClass(evModel)" data-test="fb-pc-model">
            <div class="fbpc__k">Against the model</div>
            <div class="fbpc__v fb-num" data-test="fb-pc-ev-model" :data-v="evModel == null ? '' : evModel.toFixed(6)">{{ evModel == null ? '—' : spct(evModel) }}</div>
            <div class="fbpc__s">
              <template v-if="modelP != null">model {{ pct(modelP) }} · model odds {{ odds(1 / modelP) }}</template>
              <template v-else>The model has no estimate for this market</template>
            </div>
            <div v-if="pushP > 0.0005" class="fbpc__s fb-muted">refund (push) chance {{ pct(pushP) }} — EV counts it</div>
          </div>
        </div>

        <p v-if="validOdds" class="fbpc__verdict" data-test="fb-pc-verdict">
          <i :class="verdictIcon"></i>
          <span>{{ verdict }}</span>
        </p>

        <div class="fbpc__kelly" data-test="fb-pc-kelly">
          <div class="fbpc__k">Suggested stake (¼ Kelly, at most {{ Math.round(cap * 100) }}% of your bankroll)</div>
          <div v-if="!validOdds" class="fb-muted fb-small">Type the odds to see a stake.</div>
          <template v-else-if="bankroll != null">
            <div class="fbpc__kv">
              <div>
                <span class="fbpc__kn fb-num" data-test="fb-pc-kelly-fair" :data-v="kellyFair">{{ money(stakeFor(kellyFair), currency) }}</span>
                <span class="fb-muted fb-small">at the fair price · {{ pct(kellyFair, 2) }} of bankroll</span>
              </div>
              <div>
                <span class="fbpc__kn fbpc__kn--2 fb-num" data-test="fb-pc-kelly-model" :data-v="kellyModel">{{ money(stakeFor(kellyModel), currency) }}</span>
                <span class="fb-muted fb-small">at the model's estimate · {{ pct(kellyModel, 2) }}</span>
              </div>
            </div>
            <div class="fb-muted fb-small">Bankroll {{ money(bankroll, currency) }}. Zero means no edge at this price — never chase losses.</div>
          </template>
          <div v-else class="fb-muted fb-small">Set a starting bankroll on <router-link to="/football/bets#bankroll">My bets</router-link> to see a stake in {{ currency }}.</div>
        </div>

        <div class="fbpc__limits" data-test="fb-pc-limits">
          <template v-if="limits && limits.on_break">
            <span class="fb-pill fb-pill--bad"><i class="fa-solid fa-mug-hot"></i> On a break</span>
            <span class="fb-small">until {{ fmtDateTime(limits.cool_off_until, tz) }} — new bets can't be recorded.</span>
          </template>
          <template v-else-if="activeLimits.length">
            <span v-for="l in activeLimits" :key="l.key" class="fb-pill" :class="overLimit(l) ? 'fb-pill--bad' : l.left / l.limit < 0.25 ? 'fb-pill--warn' : ''">
              {{ l.label }}: {{ money(l.left, currency) }} left
            </span>
            <span v-if="activeLimits.some(overLimit)" class="fb-small fb-neg">This stake is over a limit — it won't be recorded.</span>
          </template>
          <span v-else class="fb-small fb-muted">No limits set. <router-link to="/football/bets#limits">Set limits</router-link></span>
        </div>
      </div>
    </div>

    <!-- Saved prices -->
    <div class="fbpc__saved">
      <div class="fb-fig__title">Prices saved by your organisation <span class="fb-muted fb-small">· shown only to you and your team, labelled “manual”</span></div>
      <div v-if="!manual.length" class="fb-muted fb-small" style="margin-top: 4px">None yet. Use “Save price” to keep a price you saw on a bookmaker's app.</div>
      <div v-else class="fb-scroll">
        <table class="fb-table fb-table--nowrap" data-test="fb-manual-prices">
          <thead>
            <tr>
              <th>Bookmaker</th>
              <th>Selection</th>
              <th class="num">Price</th>
              <th class="num">vs fair</th>
              <th>Seen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in manual" :key="m.id">
              <td>{{ m.bookmaker }}</td>
              <td>{{ selectionLabel(m.market, m.selection, m.line, f.home.name, f.away.name) }}</td>
              <td class="num">{{ odds(m.price) }}</td>
              <td class="num">{{ manualEv(m) == null ? '—' : spct(manualEv(m)) }}</td>
              <td>{{ fmtDay(m.seen_at, tz, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</td>
              <td class="num">
                <button type="button" class="fb-linkbtn" @click="use(m)">Check</button>
                <button type="button" class="fb-linkbtn" :aria-label="'Delete ' + m.bookmaker + ' price'" @click="removeManual(m)"><i class="fa-regular fa-trash-can"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { MARKETS, OU_LINES, AH_LINES, modelFor, marketSel, kelly, evSplit, pct, spct, odds, money, line, selectionLabel, fmtDateTime, fmtDay } from '../fb'

const BOOK_KEY = 'fb.pricecheck.book'

export default {
  name: 'PriceCheck',
  components: { FbSection },
  props: {
    a: { type: Object, required: true },
    meta: { type: Object, default: null },
    limits: { type: Object, default: null },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  emits: ['recorded', 'saved'],
  data() {
    let book = 'SportPesa'
    try {
      book = localStorage.getItem(BOOK_KEY) || book
    } catch {
      /* private mode */
    }
    return { MARKETS, market: '1x2', sel: 'home', ln: 2.5, book, otherBook: '', oddsIn: '', stakeIn: '', server: null, serverKey: '', timer: null, saving: false, savingPrice: false, recordError: '' }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    currency() {
      return this.a.bankroll?.currency || this.meta?.currency || 'KES'
    },
    fraction() {
      return this.a.bankroll?.kelly_fraction ?? this.meta?.kelly_fraction ?? 0.25
    },
    cap() {
      return this.a.bankroll?.kelly_cap ?? this.meta?.kelly_cap ?? 0.02
    },
    bankroll() {
      const b = this.a.bankroll?.balance
      return b == null ? null : Number(b)
    },
    bookmakers() {
      const list = this.meta?.bookmakers || ['SportPesa', 'Betika', 'Odibets', 'Betway', '1xBet', 'Mozzartbet', 'Shabiki']
      return list.includes(this.book) || this.book === '__other' ? list : [this.book, ...list]
    },
    bookName() {
      return this.book === '__other' ? this.otherBook : this.book
    },
    currentMarket() {
      return MARKETS.find((m) => m.key === this.market)
    },
    pricedLines() {
      return [...new Set((this.a.market?.selections || []).filter((s) => s.market === this.market && s.selection === this.sel && s.line != null).map((s) => Number(s.line)))]
    },
    lines() {
      const base = this.market === 'ou' ? OU_LINES : AH_LINES
      return [...new Set([...base, ...this.pricedLines])].sort((x, y) => x - y)
    },
    lineVal() {
      return this.currentMarket.needsLine ? this.ln : null
    },
    label() {
      return selectionLabel(this.market, this.sel, this.lineVal, this.f.home.name, this.f.away.name)
    },
    odd() {
      const v = Number(String(this.oddsIn).replace(',', '.').trim())
      return Number.isFinite(v) ? v : null
    },
    validOdds() {
      return this.odd != null && this.odd >= 1.01 && this.odd <= 1000
    },
    oddsError() {
      if (!String(this.oddsIn).trim()) return ''
      return this.validOdds ? '' : 'Decimal odds between 1.01 and 1000 (e.g. 2.10)'
    },
    msel() {
      return marketSel(this.a.market, this.market, this.sel, this.lineVal)
    },
    fairP() {
      return this.msel?.fair_p ?? null
    },
    fairSourceText() {
      if (!this.msel) return 'not priced by the providers'
      return `${this.msel.fair_source || 'market'} · ${this.msel.books} book${this.msel.books === 1 ? '' : 's'}${this.msel.best ? ` · best ${odds(this.msel.best.price)} (${this.msel.best.title})` : ''}`
    },
    local() {
      return modelFor(this.a.model, this.market, this.sel, this.lineVal)
    },
    inputsKey() {
      return [this.market, this.sel, this.lineVal, this.validOdds ? this.odd : ''].join('|')
    },
    serverOk() {
      return this.server && this.serverKey === this.inputsKey
    },
    modelP() {
      if (this.serverOk && this.server.model_p != null) return this.server.model_p
      return this.local?.p ?? null
    },
    pushP() {
      if (this.serverOk && this.server.model_push != null) return this.server.model_push
      return this.local?.push || 0
    },
    evFair() {
      return this.validOdds && this.fairP ? this.fairP * this.odd - 1 : null
    },
    evModel() {
      if (!this.validOdds || this.modelP == null) return null
      if (this.serverOk) return this.server.ev
      if (this.local?.split) return evSplit(this.local.split, this.odd)
      if (this.market === 'dnb' && this.local?.push) {
        const b = this.a.model.blend
        const w = this.sel === 'home' ? b.home : b.away
        const l = this.sel === 'home' ? b.away : b.home
        return w * (this.odd - 1) - l
      }
      return this.modelP * this.odd - 1
    },
    kellyFair() {
      return this.validOdds && this.fairP ? round4(kelly(this.fairP, this.odd, this.fraction, this.cap)) : 0
    },
    kellyModel() {
      if (!this.validOdds || this.modelP == null) return 0
      if (this.serverOk) return this.server.kelly_fraction
      return round4(kelly(this.modelP, this.odd, this.fraction, this.cap))
    },
    suggestedStake() {
      return this.stakeFor(this.kellyFair) || 0
    },
    stake() {
      const v = Number(String(this.stakeIn || '').replace(',', '.'))
      if (String(this.stakeIn || '').trim() === '') return this.suggestedStake || null
      return Number.isFinite(v) && v > 0 ? v : null
    },
    canRecord() {
      return this.validOdds && this.stake > 0 && !!this.bookName && !(this.limits && this.limits.on_break)
    },
    activeLimits() {
      return (this.limits?.limits || []).filter((l) => l.limit != null)
    },
    verdict() {
      const ef = this.evFair
      const em = this.evModel
      if (ef == null && em == null) return 'No fair price or model estimate for this selection — compare with another bookmaker.'
      if (ef != null) {
        if (ef > 0.005) return `This price is ${spct(ef)} above the fair price — the kind of gap that has been around break-even or slightly positive over time. ${em != null && em < 0 ? 'The model disagrees.' : ''}`.trim()
        if (ef >= -0.005) return 'About the fair price: no edge either way.'
        return `This price is ${spct(-ef).replace('+', '')} below the fair price — the bookmaker's margin is against you.${em != null && em > 0 ? ' The model likes it, but in backtests model-only edges lost money.' : ''}`
      }
      return em > 0 ? 'Only the model sees value here, and model-only edges lost money in backtests. Treat with care.' : 'The model sees no value at this price.'
    },
    verdictIcon() {
      return this.evFair != null && this.evFair > 0.005 ? 'fa-solid fa-circle-check fb-pos' : 'fa-solid fa-circle-info fb-muted'
    },
    manual() {
      return this.a.market?.manual || []
    }
  },
  watch: {
    market() {
      if (!this.currentMarket.selections.includes(this.sel)) this.sel = this.currentMarket.selections[0]
      this.pickDefaultLine()
    },
    sel() {
      if (this.market === 'ah') this.pickDefaultLine()
    },
    inputsKey() {
      this.recordError = ''
      clearTimeout(this.timer)
      if (!this.validOdds) return
      this.timer = setTimeout(this.askServer, 250)
    },
    book(v) {
      try {
        if (v !== '__other') localStorage.setItem(BOOK_KEY, v)
      } catch {
        /* private mode */
      }
    }
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    pct,
    spct,
    odds,
    money,
    line,
    selectionLabel,
    fmtDateTime,
    fmtDay,
    selShort(s) {
      const h = this.f.home.name
      const w = this.f.away.name
      switch (this.market) {
        case '1x2':
          return s === 'home' ? h : s === 'away' ? w : 'Draw'
        case 'dc':
          return s === '1x' ? `${h} or draw` : s === 'x2' ? `Draw or ${w}` : 'Either team wins'
        case 'dnb':
        case 'ah':
          return s === 'home' ? h : w
        case 'ou':
          return s === 'over' ? 'Over' : 'Under'
        case 'btts':
          return s === 'yes' ? 'Yes' : 'No'
      }
      return s
    },
    setMarket(k) {
      this.market = k
    },
    pickDefaultLine() {
      if (this.market === 'ou') {
        if (!OU_LINES.includes(this.ln) && !this.pricedLines.includes(this.ln)) this.ln = 2.5
        if (this.ln < 0) this.ln = 2.5
      } else if (this.market === 'ah') {
        this.ln = this.pricedLines.length ? this.pricedLines[0] : 0
      }
    },
    onOdds() {
      this.oddsIn = String(this.oddsIn).replace(/[^0-9.,]/g, '')
    },
    stakeFor(fr) {
      if (this.bankroll == null || !(fr > 0)) return 0
      return Math.floor(fr * this.bankroll * 100) / 100
    },
    boxClass(ev) {
      if (ev == null) return ''
      return ev > 0.005 ? 'is-pos' : ev < -0.005 ? 'is-neg' : ''
    },
    overLimit(l) {
      return this.stake != null && l.left != null && l.key.endsWith('_stake') && this.stake > l.left + 1e-9
    },
    manualEv(m) {
      const s = marketSel(this.a.market, m.market, m.selection, m.line)
      return s?.fair_p ? s.fair_p * m.price - 1 : null
    },
    use(m) {
      this.market = m.market
      this.$nextTick(() => {
        this.sel = m.selection
        this.$nextTick(() => {
          if (m.line != null) this.ln = Number(m.line)
          this.oddsIn = String(m.price)
          const known = this.bookmakers.includes(m.bookmaker)
          this.book = known ? m.bookmaker : '__other'
          if (!known) this.otherBook = m.bookmaker
        })
      })
    },
    async askServer() {
      const key = this.inputsKey
      try {
        const k = await footballApi.kelly(this.f.id, { market: this.market, selection: this.sel, line: this.lineVal, odds: this.odd })
        if (key === this.inputsKey) {
          this.server = k
          this.serverKey = key
        }
      } catch {
        if (key === this.inputsKey) this.server = null
      }
    },
    async record() {
      if (!this.canRecord) return
      this.saving = true
      this.recordError = ''
      try {
        const b = await footballApi.createBet({ fixture_id: this.f.id, bookmaker: this.bookName, market: this.market, selection: this.sel, line: this.lineVal, odds: this.odd, stake: this.stake })
        toast.success(`Recorded: ${b.label} @ ${odds(b.odds)} × ${money(b.stake, this.currency)}`)
        this.stakeIn = ''
        this.$emit('recorded', b)
      } catch (e) {
        this.recordError = apiErrorMessage(e, 'Could not record the bet')
      } finally {
        this.saving = false
      }
    },
    async savePrice() {
      if (!this.validOdds || !this.bookName) return
      this.savingPrice = true
      try {
        await footballApi.addManualOdd({ fixture_id: this.f.id, bookmaker: this.bookName, market: this.market, selection: this.sel, line: this.lineVal, price: this.odd })
        toast.success(`Saved: ${this.bookName} ${odds(this.odd)} for ${this.label}`)
        this.$emit('saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the price'))
      } finally {
        this.savingPrice = false
      }
    },
    async removeManual(m) {
      const okk = await confirmDialog({ title: 'Delete this price?', message: `${m.bookmaker} ${odds(m.price)} — ${selectionLabel(m.market, m.selection, m.line, this.f.home.name, this.f.away.name)}`, confirmText: 'Delete', danger: true })
      if (!okk) return
      try {
        await footballApi.deleteManualOdd(m.id)
        this.$emit('saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the price'))
      }
    }
  }
}

function round4(x) {
  return Math.round(x * 10000) / 10000
}
</script>

<style scoped>
.fbpc {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
}
.fbpc__form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-content: start;
  min-width: 0;
}
.fbpc__form .ui-field {
  margin: 0;
  min-width: 0;
}
.fbpc__markets {
  width: 100%;
  flex-wrap: wrap;
  overflow-x: visible;
}
.fbpc__sels {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fbpc__sel {
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  border-radius: 9px;
  padding: 6px 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fbpc__sel.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--accent);
}
.fbpc__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.fbpc__odds {
  font-size: 18px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.fbpc__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fbpc__err {
  margin: 0;
}
.fbpc__out {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  background: var(--surface-2);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-content: start;
  min-width: 0;
}
.fbpc__label {
  font-weight: 650;
  font-size: 14px;
}
.fbpc__cmp {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.fbpc__box {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface);
  min-width: 0;
}
.fbpc__box.is-pos {
  border-color: color-mix(in srgb, var(--fb-good) 55%, var(--border));
}
.fbpc__box.is-neg {
  border-color: color-mix(in srgb, var(--fb-bad) 45%, var(--border));
}
.fbpc__k {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.fbpc__v {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 2px 0;
}
.fbpc__box.is-pos .fbpc__v {
  color: var(--fb-good-text);
}
.fbpc__box.is-neg .fbpc__v {
  color: var(--danger);
}
.fbpc__s {
  font-size: 12px;
  color: var(--text-2);
}
.fbpc__verdict {
  display: flex;
  gap: 8px;
  margin: 0;
  font-size: 13px;
}
.fbpc__verdict i {
  margin-top: 3px;
}
.fbpc__kelly {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}
.fbpc__kv {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
}
.fbpc__kv > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
.fbpc__kn {
  font-size: 20px;
  font-weight: 700;
}
.fbpc__kn--2 {
  font-size: 16px;
  color: var(--text-2);
}
.fbpc__limits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.fbpc__saved {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
@media (max-width: 900px) {
  .fbpc {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 420px) {
  .fbpc__cmp {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
