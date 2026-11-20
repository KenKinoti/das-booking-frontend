<template>
  <!-- Create / edit a jackpot: bookmaker, prize, ticket price, bonus tiers and closing time. -->
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal fb fbjf" role="dialog" aria-modal="true" aria-labelledby="fbjf-title" data-test="fb-jp-form" novalidate @submit.prevent="save" @keydown.esc="$emit('close')">
      <div class="ui-modal__head">
        <h2 id="fbjf-title">{{ jackpot ? 'Edit jackpot' : 'New jackpot' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body fbjf__body">
        <div class="ui-field">
          <label class="ui-label" for="fbjf-name">Name</label>
          <input id="fbjf-name" v-model.trim="f.name" class="ui-input" maxlength="120" placeholder="e.g. Midweek jackpot" data-test="fb-jp-name" />
        </div>
        <div class="fbjf__row">
          <div class="ui-field">
            <label class="ui-label" for="fbjf-book">Bookmaker</label>
            <input id="fbjf-book" v-model.trim="f.bookmaker" class="ui-input" list="fbjf-books" maxlength="80" data-test="fb-jp-bookmaker" />
            <datalist id="fbjf-books">
              <option v-for="b in BOOKMAKERS" :key="b" :value="b"></option>
            </datalist>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbjf-close">Closes at</label>
            <input id="fbjf-close" v-model="f.closes_at" class="ui-input" type="datetime-local" data-test="fb-jp-closes" />
          </div>
        </div>
        <div class="fbjf__row">
          <div class="ui-field">
            <label class="ui-label" for="fbjf-prize">Top prize ({{ currency }})</label>
            <input id="fbjf-prize" v-model="f.prize" class="ui-input" inputmode="decimal" placeholder="e.g. 100000000" data-test="fb-jp-prize" />
            <span class="ui-hint">{{ moneyHint(f.prize) }}</span>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbjf-price">Ticket price ({{ currency }})</label>
            <input id="fbjf-price" v-model="f.ticket_price" class="ui-input" inputmode="decimal" placeholder="e.g. 99" data-test="fb-jp-price" />
            <span class="ui-hint">Cost of one combination</span>
          </div>
        </div>
        <fieldset class="fbjf__bonus">
          <legend class="ui-label">Bonuses <span class="fb-muted fb-small">(optional — paid for exactly that many right)</span></legend>
          <div v-for="(b, i) in f.bonuses" :key="i" class="fbjf__brow">
            <input v-model="b.correct" class="ui-input" inputmode="numeric" :aria-label="'Bonus ' + (i + 1) + ': number correct'" placeholder="12" :data-test="'fb-jp-bonus-k-' + i" />
            <span class="fb-muted fb-small">correct pays</span>
            <input v-model="b.amount" class="ui-input" inputmode="decimal" :aria-label="'Bonus ' + (i + 1) + ': amount'" placeholder="Amount" :data-test="'fb-jp-bonus-amt-' + i" />
            <button type="button" class="fb-linkbtn" :aria-label="'Remove bonus ' + (i + 1)" @click="f.bonuses.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
          <button type="button" class="ui-btn ui-btn--sm" data-test="fb-jp-bonus-add" @click="addBonus"><i class="fa-solid fa-plus"></i> Add a bonus tier</button>
        </fieldset>
        <div v-if="error" class="ui-alert ui-alert--danger" role="alert"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" data-test="fb-jp-save"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ jackpot ? 'Save' : 'Create' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { BOOKMAKERS } from './jp'

const numOrNull = (v) => {
  const s = String(v ?? '').replace(/[,\s]/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/** ISO instant → value for <input type=datetime-local> in a time zone. */
function toLocalInput(iso, tz) {
  if (!iso) return ''
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const g = (k) => p.find((x) => x.type === k)?.value
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}
/** <input type=datetime-local> value (wall time in tz) → ISO instant. */
function fromLocalInput(v, tz) {
  if (!v) return null
  const guess = new Date(v + ':00Z')
  const back = toLocalInput(guess.toISOString(), tz)
  const diff = new Date(back + ':00Z') - guess
  return new Date(guess.getTime() - diff).toISOString()
}

export default {
  name: 'JackpotForm',
  props: {
    jackpot: { type: Object, default: null },
    currency: { type: String, default: 'KES' },
    tz: { type: String, default: 'Africa/Nairobi' },
    defaults: { type: Object, default: null }
  },
  emits: ['close', 'saved'],
  data() {
    const j = this.jackpot || this.defaults || {}
    return {
      BOOKMAKERS,
      f: {
        name: j.name || '',
        bookmaker: j.bookmaker || 'SportPesa',
        prize: j.prize != null ? String(j.prize) : '',
        ticket_price: j.ticket_price != null ? String(j.ticket_price) : '',
        closes_at: toLocalInput(j.closes_at, this.tz),
        bonuses: (j.bonuses || []).map((b) => ({ correct: String(b.correct), amount: String(b.amount) }))
      },
      saving: false,
      error: ''
    }
  },
  methods: {
    moneyHint(v) {
      const n = numOrNull(v)
      return n > 0 ? formatMoney(n, this.currency) : ' '
    },
    addBonus() {
      const used = this.f.bonuses.map((b) => Number(b.correct))
      const n = this.jackpot?.games?.length || 13
      const next = [n - 1, n - 2, n - 3].find((k) => !used.includes(k)) ?? ''
      this.f.bonuses.push({ correct: String(next), amount: '' })
    },
    async save() {
      this.error = ''
      const prize = numOrNull(this.f.prize)
      const price = numOrNull(this.f.ticket_price)
      if (!this.f.name) return (this.error = 'Give the jackpot a name.')
      if (Number.isNaN(prize) || (prize != null && prize < 0)) return (this.error = 'The prize must be a number.')
      if (Number.isNaN(price) || (price != null && price <= 0)) return (this.error = 'The ticket price must be a number above zero.')
      const bonuses = []
      for (const b of this.f.bonuses) {
        if (!String(b.correct).trim() && !String(b.amount).trim()) continue
        const k = Number(b.correct)
        const a = numOrNull(b.amount)
        if (!Number.isInteger(k) || k < 1 || Number.isNaN(a) || a == null) return (this.error = 'Each bonus needs a number correct and an amount.')
        bonuses.push({ correct: k, amount: a })
      }
      const body = { name: this.f.name, bookmaker: this.f.bookmaker, prize, ticket_price: price, bonuses, closes_at: fromLocalInput(this.f.closes_at, this.tz), currency: this.currency }
      this.saving = true
      try {
        const r = this.jackpot ? await footballApi.updateJackpot(this.jackpot.id, body) : await footballApi.createJackpot(body)
        this.$emit('saved', r)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the jackpot')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.fbjf {
  max-width: 560px;
}
.fbjf__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.fbjf__body .ui-field {
  margin: 0;
  min-width: 0;
}
.fbjf__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.fbjf__bonus {
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  justify-items: start;
}
.fbjf__brow {
  display: grid;
  grid-template-columns: 70px auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
}
@media (max-width: 520px) {
  .fbjf__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
