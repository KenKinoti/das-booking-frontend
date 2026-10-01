<template>
  <section class="ui-card" data-testid="item-pricing">
    <div class="ui-card__head">
      <div>
        <h2>Item prices</h2>
        <p class="sub muted small">
          <template v-if="foreign">Your Zoho items are priced in <strong>{{ src }}</strong>; your home currency here is <strong>{{ home }}</strong>.</template>
          <template v-else>Item prices are in {{ src }}, the same as your home currency.</template>
        </p>
      </div>
    </div>
    <div class="ui-card__body">
      <div v-if="showSourcePicker" class="ip-src">
        <label class="ui-field">
          <span class="ui-label">Prices in this file are in</span>
          <select class="ui-select" :value="value.currency || src" data-testid="item-source-currency" @change="set({ currency: $event.target.value })">
            <optgroup v-for="g in groups" :key="g.region" :label="g.region">
              <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
            </optgroup>
          </select>
          <span class="ui-hint">The file doesn't say. Choose the currency of your Zoho organisation, then update the preview.</span>
        </label>
      </div>

      <div v-if="foreign" class="ip-modes" role="radiogroup" aria-label="Item prices">
        <label class="ip-mode" :class="{ on: mode === 'keep' }">
          <input type="radio" name="ip-mode" value="keep" :checked="mode === 'keep'" data-testid="price-keep" @change="set({ mode: 'keep' })" />
          <span>
            <strong>Keep prices in {{ src }} (as in Zoho)</strong>
            <small>Services keep their {{ src }} price. Adding one to an invoice converts it at the invoice's rate.</small>
          </span>
        </label>
        <label class="ip-mode" :class="{ on: mode === 'convert' }">
          <input type="radio" name="ip-mode" value="convert" :checked="mode === 'convert'" data-testid="price-convert" @change="chooseConvert" />
          <span>
            <strong>Convert to {{ home }}</strong>
            <small>Prices are converted once, now, and stored in {{ home }}.</small>
          </span>
        </label>
        <div v-if="mode === 'convert'" class="ip-rate">
          <label class="ui-field">
            <span class="ui-label">Rate: 1 {{ src }} =</span>
            <div class="ip-rate__row">
              <input class="ui-input tabular" type="number" min="0" step="any" :value="value.rate || ''" data-testid="price-rate" @input="set({ rate: Number($event.target.value) || 0, rate_source: 'manual' })" />
              <span class="ip-unit">{{ home }}</span>
              <button v-if="pricing.rate > 0 && value.rate !== pricing.rate" type="button" class="ui-btn ui-btn--sm" @click="set({ rate: pricing.rate, rate_source: pricing.rate_source })">Use {{ rateLabel }} rate</button>
            </div>
            <span class="ui-hint">
              <template v-if="pricing.rate > 0">{{ rateLabel }} rate: 1 {{ src }} = {{ rateNum(pricing.rate) }} {{ home }}<template v-if="pricing.rate_provider"> · {{ pricing.rate_provider }}</template>. Edit it if you use a different rate.</template>
              <template v-else>No rate is available for {{ src }} → {{ home }} — enter one.</template>
            </span>
          </label>
          <div v-if="!(value.rate > 0)" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>Enter a rate, or keep prices in {{ src }}.</span></div>
        </div>
      </div>

      <label class="ui-switch ip-tax">
        <input type="checkbox" :checked="!!value.include_tax" data-testid="price-incl-tax" @change="set({ include_tax: $event.target.checked })" />
        <span>Zoho prices include tax <small class="muted">(unless an item says otherwise)</small></span>
      </label>

      <div class="ui-table-wrap ip-table">
        <table class="ui-table" data-testid="price-preview">
          <thead>
            <tr><th>Item</th><th class="num">Zoho price</th><th class="num">Price here</th></tr>
          </thead>
          <tbody>
            <tr v-for="(it, i) in shown" :key="i">
              <td>{{ it.name }}<small v-if="inclOf(it)" class="muted"> · incl. tax</small></td>
              <td class="num tabular">{{ money(it.price, it.currency) }}</td>
              <td class="num tabular" :class="{ conv: converted(it) }">{{ money(target(it).price, target(it).currency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="pricing.items.length > shown.length || pricing.total > pricing.items.length" class="muted small ip-more">
        Showing {{ shown.length }} of {{ pricing.total }} items.
        <a v-if="pricing.items.length > shown.length" href="#" @click.prevent="limit += 50">Show more</a>
      </p>
    </div>
  </section>
</template>

<script>
import { formatMoney } from '@/utils/format'
import { convertAmount, rateNumber, currencyGroups } from '@/utils/currencies'

export default {
  name: 'ItemPricingCard',
  props: {
    pricing: { type: Object, required: true },
    modelValue: { type: Object, default: () => ({}) },
    files: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  data() {
    return { limit: 8, groups: currencyGroups() }
  },
  computed: {
    value() {
      return this.modelValue || {}
    },
    src() {
      return this.pricing.source_currency
    },
    home() {
      return this.pricing.home_currency
    },
    foreign() {
      return this.src !== this.home
    },
    mode() {
      return this.foreign && this.value.mode === 'convert' ? 'convert' : 'keep'
    },
    showSourcePicker() {
      return this.files && !this.pricing.detected
    },
    shown() {
      return this.pricing.items.slice(0, this.limit)
    },
    rateLabel() {
      return { live: 'Live', fallback: 'Reference', manual: 'Your manual' }[this.pricing.rate_source] || 'Suggested'
    }
  },
  created() {
    // Remember which currency the preview found, so the import prices in it.
    if (!this.value.currency && this.src) this.set({ currency: this.src })
  },
  methods: {
    set(patch) {
      this.$emit('update:modelValue', { ...this.value, ...patch })
    },
    chooseConvert() {
      this.set({ mode: 'convert', rate: this.value.rate > 0 ? this.value.rate : this.pricing.rate || 0, rate_source: this.value.rate > 0 ? this.value.rate_source : this.pricing.rate_source })
    },
    rateNum: rateNumber,
    money(v, c) {
      return formatMoney(v, c)
    },
    inclOf(it) {
      return it.tax_inclusive === true || ((it.tax_inclusive === undefined || it.tax_inclusive === null) && !!this.value.include_tax)
    },
    converted(it) {
      return this.mode === 'convert' && this.value.rate > 0 && it.currency === this.src && this.foreign
    },
    target(it) {
      if (this.converted(it)) return { price: convertAmount(it.price, this.value.rate, this.home), currency: this.home }
      return { price: it.price, currency: it.currency }
    }
  }
}
</script>

<style scoped>
.sub {
  margin: 2px 0 0;
}
.ip-src {
  max-width: 420px;
  margin-bottom: 14px;
}
.ip-modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.ip-mode {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
}
.ip-mode.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.ip-mode input {
  margin-top: 3px;
}
.ip-mode span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ip-mode small {
  color: var(--text-3);
  font-size: 12px;
}
.ip-rate {
  grid-column: 1 / -1;
}
.ip-rate__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ip-rate__row .ui-input {
  max-width: 180px;
}
.ip-unit {
  font-weight: 600;
  color: var(--text-2);
}
.ip-tax {
  margin-bottom: 12px;
}
.ip-table {
  margin: 0 -2px;
}
.conv {
  color: var(--accent);
  font-weight: 600;
}
.tabular {
  font-variant-numeric: tabular-nums;
}
.ip-more {
  margin: 8px 0 0;
}
</style>
