<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal fb" style="max-width: 480px" role="dialog" aria-modal="true" aria-labelledby="fbst-title" data-test="fb-settle" novalidate @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="fbst-title">Settle bet</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body fbst">
        <p style="margin: 0">
          <strong>{{ bet.label }}</strong> @ {{ odds(bet.odds) }} · {{ money(bet.stake, bet.currency) }}<br />
          <span class="fb-muted fb-small">{{ bet.home.name }} v {{ bet.away.name }}<template v-if="bet.score && bet.score.home != null"> · {{ bet.score.home }}–{{ bet.score.away }}</template></span>
        </p>
        <fieldset class="fbst__opts">
          <legend class="ui-label">Result</legend>
          <label v-for="o in options" :key="o.value" class="fbst__opt">
            <input v-model="status" type="radio" name="fbst-status" :value="o.value" :data-test="'fb-settle-' + o.value" />
            <span><strong>{{ o.label }}</strong><span class="fb-muted fb-small"> {{ o.hint }}</span></span>
          </label>
        </fieldset>
        <div v-if="status === 'cashed_out'" class="ui-field" style="margin: 0">
          <label class="ui-label" for="fbst-cash">Cash-out amount ({{ bet.currency }})</label>
          <input id="fbst-cash" v-model="cash" class="ui-input" inputmode="decimal" data-test="fb-settle-cash" />
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger" role="alert"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" data-test="fb-settle-save"><i class="fa-solid fa-check"></i> Save</button>
      </div>
    </form>
  </div>
</template>

<script>
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { odds, money } from '../fb'

export default {
  name: 'SettleModal',
  props: { bet: { type: Object, required: true } },
  emits: ['close', 'saved'],
  data() {
    return {
      status: this.bet.status === 'open' ? 'auto' : this.bet.status,
      cash: '',
      saving: false,
      error: '',
      options: [
        { value: 'auto', label: 'From the result', hint: 'settle automatically from the final score' },
        { value: 'won', label: 'Won', hint: '' },
        { value: 'half_won', label: 'Half won', hint: 'quarter lines' },
        { value: 'void', label: 'Void / refunded', hint: 'stake returned' },
        { value: 'half_lost', label: 'Half lost', hint: 'quarter lines' },
        { value: 'lost', label: 'Lost', hint: '' },
        { value: 'cashed_out', label: 'Cashed out', hint: 'enter what the bookmaker paid' },
        { value: 'open', label: 'Reopen', hint: 'not settled yet' }
      ]
    }
  },
  methods: {
    odds,
    money,
    async save() {
      this.error = ''
      const body = { status: this.status }
      if (this.status === 'cashed_out') {
        const v = Number(String(this.cash).replace(',', '.'))
        if (!(v >= 0)) {
          this.error = 'Enter the amount the bookmaker paid you.'
          return
        }
        body.cash_out = v
      }
      this.saving = true
      try {
        this.$emit('saved', await footballApi.settleBet(this.bet.id, body))
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not settle the bet')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.fbst {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.fbst__opts {
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}
.fbst__opt {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13.5px;
}
.fbst__opt:hover {
  background: var(--surface-hover);
}
.fbst__opt input {
  accent-color: var(--accent);
}
</style>
