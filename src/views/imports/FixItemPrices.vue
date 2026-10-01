<template>
  <section class="ui-card" data-testid="fix-prices">
    <div class="ui-card__head">
      <div>
        <h2><i class="fa-solid fa-tags head-ico"></i> Fix item prices from Zoho</h2>
        <p class="muted small sub">Re-reads your Zoho items and corrects the price, currency and tax setting of services imported from them. Nothing else changes; you see every change first.</p>
      </div>
    </div>
    <div class="ui-card__body">
      <div class="fp-form">
        <label class="ui-field">
          <span class="ui-label">Read items from</span>
          <select v-model="form.source" class="ui-select" data-testid="fix-source">
            <option value="auto">{{ connected ? 'Zoho Books (connected)' : 'The last uploaded Item.csv' }}</option>
            <option v-if="connected" value="file">The last uploaded Item.csv</option>
          </select>
        </label>
        <div class="ui-field">
          <span class="ui-label">Prices</span>
          <div class="fp-modes">
            <label class="fp-radio"><input v-model="form.mode" type="radio" value="keep" data-testid="fix-keep" /> <span>Keep in Zoho's currency{{ src ? ` (${src})` : '' }}</span></label>
            <label class="fp-radio"><input v-model="form.mode" type="radio" value="convert" data-testid="fix-convert" /> <span>Convert to {{ home || 'home currency' }}</span></label>
          </div>
        </div>
        <label v-if="form.mode === 'convert'" class="ui-field">
          <span class="ui-label">Rate: 1 {{ src || 'source' }} = … {{ home }}</span>
          <input v-model.number="form.rate" type="number" min="0" step="any" class="ui-input tabular" data-testid="fix-rate" :placeholder="suggested ? String(suggested) : 'Rate'" />
          <span v-if="suggested" class="ui-hint">{{ rateLabel }} rate {{ rateNum(suggested) }} <a v-if="form.rate !== suggested" href="#" @click.prevent="form.rate = suggested">use it</a></span>
        </label>
        <label class="ui-switch fp-check"><input v-model="form.include_tax" type="checkbox" /> <span>Zoho prices include tax</span></label>
        <label class="ui-switch fp-check"><input v-model="form.include_edited" type="checkbox" data-testid="fix-include-edited" /> <span>Also fix services edited here since the import</span></label>
      </div>
      <div class="fp-actions">
        <button class="ui-btn" :disabled="busy" data-testid="fix-preview" @click="run(true)"><i :class="busy && dry ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-magnifying-glass'"></i> Preview changes</button>
      </div>

      <div v-if="error" class="ui-alert ui-alert--danger fp-gap"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

      <template v-if="result">
        <p class="muted small fp-gap" data-testid="fix-summary">
          From {{ result.source_label }} ·
          <strong>{{ result.dry_run ? result.changes : result.applied }}</strong> {{ result.dry_run ? 'to change' : 'changed' }} ·
          {{ result.unchanged }} already right · {{ result.edited }} left alone<template v-if="result.not_imported"> · {{ result.not_imported }} not imported</template>
        </p>
        <div v-if="result.rows.length" class="ui-table-wrap">
          <table class="ui-table" v-table-cards data-testid="fix-table">
            <thead>
              <tr><th>Service</th><th class="num">Zoho</th><th class="num">Now</th><th class="num">New</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in result.rows" :key="r.service_id" :data-testid="`fix-row-${r.name}`">
                <td data-label="Service">{{ r.name }}</td>
                <td data-label="Zoho" class="num tabular">{{ money(r.zoho_price, r.zoho_currency) }}</td>
                <td data-label="Now" class="num tabular" :class="{ old: r.status === 'change' || r.status === 'applied' }">{{ money(r.old_price, r.old_currency) }}<small v-if="r.old_includes_tax" class="muted"> incl. tax</small></td>
                <td data-label="New" class="num tabular">{{ money(r.new_price, r.new_currency) }}<small v-if="r.new_includes_tax" class="muted"> incl. tax</small></td>
                <td data-label="Status"><span class="ui-badge" :class="badge(r.status).cls">{{ badge(r.status).label }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="result.dry_run && result.changes" class="fp-actions fp-gap">
          <button class="ui-btn ui-btn--primary" :disabled="busy" data-testid="fix-apply" @click="apply"><i :class="busy && !dry ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Apply {{ result.changes }} change{{ result.changes === 1 ? '' : 's' }}</button>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatMoney } from '@/utils/format'
import { rateNumber } from '@/utils/currencies'

const BADGES = {
  change: { label: 'Will change', cls: 'ui-badge--warning' },
  applied: { label: 'Fixed', cls: 'ui-badge--success' },
  same: { label: 'Correct', cls: 'ui-badge--draft' },
  edited: { label: 'Left alone', cls: 'ui-badge--info' }
}

export default {
  name: 'FixItemPrices',
  props: { connected: { type: Boolean, default: false }, homeCurrency: { type: String, default: '' } },
  data() {
    return { form: { source: 'auto', mode: 'keep', rate: null, include_tax: false, include_edited: false }, busy: false, dry: true, result: null, error: '' }
  },
  computed: {
    src() {
      return this.result?.source_currency || ''
    },
    home() {
      return this.result?.home_currency || this.homeCurrency
    },
    suggested() {
      const r = this.result?.pricing
      return r && r.rate > 0 && r.source_currency !== r.home_currency ? r.rate : 0
    },
    rateLabel() {
      return { live: 'Live', fallback: 'Reference', manual: 'Your manual' }[this.result?.pricing?.rate_source] || 'Suggested'
    }
  },
  methods: {
    money: (v, c) => formatMoney(v, c),
    rateNum: rateNumber,
    badge(s) {
      return BADGES[s] || { label: s, cls: '' }
    },
    body(dry) {
      const convert = this.form.mode === 'convert'
      return {
        dry_run: dry,
        source: this.form.source,
        include_edited: this.form.include_edited,
        item_prices: { mode: convert ? 'convert' : 'keep', rate: convert ? Number(this.form.rate) || 0 : 0, rate_source: convert && this.form.rate === this.suggested ? this.result?.pricing?.rate_source : 'manual', include_tax: this.form.include_tax }
      }
    },
    async run(dry) {
      if (this.form.mode === 'convert' && !(Number(this.form.rate) > 0)) {
        if (this.suggested) this.form.rate = this.suggested
        else if (this.result) {
          this.error = 'Enter the exchange rate to convert with.'
          return
        } else {
          // first look: find the source currency and a suggested rate
          await this.run_({ ...this.body(true), item_prices: { mode: 'keep' } }, true)
          if (this.suggested) this.form.rate = this.suggested
          else return
        }
      }
      await this.run_(this.body(dry), dry)
    },
    async run_(body, dry) {
      this.busy = true
      this.dry = dry
      this.error = ''
      try {
        const r = await api.post('/imports/zoho/fix-prices', body)
        this.result = r.data?.data
        if (!dry) toast.success(`${this.result.applied} service price${this.result.applied === 1 ? '' : 's'} fixed`)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not read the Zoho items')
      } finally {
        this.busy = false
      }
    },
    async apply() {
      const n = this.result.changes
      const ok = await confirmDialog({
        title: `Fix ${n} service price${n === 1 ? '' : 's'}?`,
        message: 'Only the price, currency and "includes tax" setting of these services change. Invoices already issued are not touched.',
        confirmText: 'Apply changes'
      })
      if (ok) await this.run(false)
    }
  }
}
</script>

<style scoped>
.sub {
  margin: 2px 0 0;
}
.head-ico {
  color: var(--accent);
  margin-right: 4px;
}
.fp-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 12px 16px;
  align-items: start;
}
.fp-modes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fp-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  cursor: pointer;
}
.fp-radio input {
  accent-color: var(--accent);
}
.fp-check {
  align-self: center;
}
.fp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}
.fp-gap {
  margin-top: 14px;
}
.old {
  color: var(--text-3);
  text-decoration: line-through;
}
.tabular {
  font-variant-numeric: tabular-nums;
}
</style>
