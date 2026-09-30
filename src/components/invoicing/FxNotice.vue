<template>
  <div class="fxn" :class="`fxn--${tone}`" role="status" data-testid="fx-notice">
    <i class="fxn__icon" :class="icon"></i>
    <div class="fxn__body">
      <p class="fxn__text" data-testid="fx-notice-text">
        <template v-if="loading">Getting the {{ base }} → {{ currency }} exchange rate…</template>
        <template v-else-if="!(rate > 0)">
          <strong>No exchange rate for {{ base }} → {{ currency }}.</strong> Prices from your catalog are in {{ base }}; enter the rate to convert them. The {{ docWord }} can't be sent without one.
        </template>
        <template v-else>
          Prices from your catalog are in <strong>{{ base }}</strong> and {{ locked ? 'are' : 'will be' }} converted to <strong>{{ currency }}</strong> at <strong class="tabular" data-testid="fx-notice-rate">1 {{ base }} = {{ rateNum(rate) }} {{ currency }}</strong>{{ ' ' }}<span class="muted">(1 {{ currency }} = {{ rateNum(1 / rate) }} {{ base }})</span> — {{ sourceText }}{{ when ? ', ' + when : '' }}.<template v-if="locked">{{ ' ' }}<span class="muted">Locked on this {{ docWord }}.</span></template>
        </template>
      </p>
      <p v-for="w in warnings" :key="w" class="fxn__warn"><i class="fa-solid fa-triangle-exclamation"></i> {{ w }}</p>
    </div>
    <div class="fxn__actions">
      <button v-if="canUpdate" type="button" class="ui-btn ui-btn--sm" :disabled="loading" data-testid="fx-update-rate" @click="$emit('update-rate')"><i class="fa-solid fa-rotate"></i> Update rate</button>
      <button type="button" class="ui-btn ui-btn--sm" :disabled="loading" data-testid="fx-change-rate" @click="$emit('change-rate')"><i class="fa-solid fa-pen"></i> {{ rate > 0 ? 'Change rate' : 'Enter rate' }}</button>
      <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="loading" data-testid="fx-keep-base" @click="$emit('keep-base')">Keep {{ base }}</button>
    </div>
  </div>
</template>

<script>
import { rateNumber } from '@/utils/currencies'
import { formatDateTime } from '@/utils/format'

/** Notice shown in the invoice editor when the document currency differs
 * from the organisation's (catalog) currency. */
export default {
  name: 'FxNotice',
  props: {
    base: { type: String, required: true },
    currency: { type: String, required: true },
    rate: { type: Number, default: 0 }, // units of currency per 1 base
    source: { type: String, default: '' },
    date: { type: String, default: '' },
    locked: { type: Boolean, default: false },
    canUpdate: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    docWord: { type: String, default: 'invoice' }
  },
  emits: ['change-rate', 'keep-base', 'update-rate'],
  computed: {
    ageHours() {
      if (!this.date) return 0
      const t = new Date(this.date).getTime()
      return Number.isNaN(t) ? 0 : (Date.now() - t) / 3600000
    },
    sourceText() {
      return { live: 'live rate', fallback: 'approximate reference rate', manual: 'manual rate' }[this.source] || 'rate'
    },
    when() {
      return this.date ? formatDateTime(this.date) : ''
    },
    warnings() {
      const w = []
      if (this.loading || !(this.rate > 0)) return w
      if (this.source === 'fallback') w.push('Live rates are unavailable — this is an approximate reference rate. Check it or enter the rate you want.')
      if (this.source === 'manual') w.push('This is a manual rate. Make sure it is the rate you agreed with the client.')
      if (this.source === 'live' && this.ageHours > 24) w.push(`This rate is ${Math.floor(this.ageHours / 24) >= 1 ? Math.floor(this.ageHours / 24) + ' day(s)' : 'over 24 hours'} old.${this.canUpdate ? ' Use “Update rate” for today’s rate.' : ''}`)
      return w
    },
    tone() {
      if (!this.loading && !(this.rate > 0)) return 'danger'
      return this.warnings.length ? 'warning' : 'info'
    },
    icon() {
      if (this.loading) return 'fa-solid fa-circle-notch fa-spin'
      return { danger: 'fa-solid fa-circle-exclamation', warning: 'fa-solid fa-triangle-exclamation', info: 'fa-solid fa-right-left' }[this.tone]
    }
  },
  methods: {
    rateNum: rateNumber
  }
}
</script>

<style scoped>
.fxn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--info);
  background: var(--info-soft);
  color: var(--text);
}
.fxn--warning {
  border-color: var(--warning);
  background: var(--warning-soft);
}
.fxn--danger {
  border-color: var(--danger);
  background: var(--danger-soft);
}
.fxn__icon {
  margin-top: 3px;
  color: var(--info);
}
.fxn--warning .fxn__icon {
  color: var(--warning);
}
.fxn--danger .fxn__icon {
  color: var(--danger);
}
.fxn__body {
  flex: 1;
  min-width: 0;
}
.fxn__text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
}
.fxn__warn {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--text-2);
}
.fxn__warn i {
  color: var(--warning);
}
.fxn__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.muted {
  color: var(--text-3);
}
.tabular {
  font-variant-numeric: tabular-nums;
}
@media (max-width: 720px) {
  .fxn {
    flex-wrap: wrap;
  }
  .fxn__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
