<template>
  <div class="ps" data-testid="people-summary">
    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    </div>
    <div v-else-if="loading && !summary" class="ui-card__body">
      <div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 18px; margin-bottom: 12px"></div>
    </div>
    <div v-else-if="!summary || !summary.people.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-users"></i></div>
      <h3>No sales {{ rangeLabel ? rangeLabel.toLowerCase() : 'in this period' }}</h3>
      <p>Who sold what, on which device, shows here once sales are rung up.</p>
    </div>
    <template v-else>
      <section class="ps__sec">
        <h3 class="ps__title">By person <span class="muted">{{ rangeLabel }}</span></h3>
        <div class="ui-table-wrap">
          <table class="ui-table" v-table-cards>
            <thead>
              <tr>
                <th>Person</th>
                <th class="num">Sales</th>
                <th class="num">Value</th>
                <th class="num" title="Their sales that were voided · sales they voided (anyone's)">Voids</th>
                <th class="num">Discounts</th>
                <th class="num" title="Cash kept (cash taken minus change), mobile money and card">Money taken</th>
                <th>Devices</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in summary.people" :key="p.user_id" class="is-clickable" tabindex="0" :data-person="p.name" @click="$emit('person', p.user_id)" @keydown.enter="$emit('person', p.user_id)">
                <td class="ps__person">
                  <strong>{{ p.name }}</strong>
                  <small v-if="p.photo_count" class="muted ps__photos" :title="`${p.photo_count} photo${p.photo_count === 1 ? '' : 's'} on their sales`"><i class="fa-solid fa-camera"></i> {{ p.photo_count }}</small>
                </td>
                <td class="num">{{ p.sales_count }}<small class="muted ps__sub">{{ p.items_sold }} items</small></td>
                <td class="num"><strong>{{ money(p.sales_total) }}</strong><small v-if="p.sales_count" class="muted ps__sub">avg {{ money(p.average_sale) }}</small></td>
                <td class="num" :class="{ 'txt-danger': p.voided_count > 0 }">
                  {{ p.voided_count }}<small v-if="p.voided_count" class="muted ps__sub">{{ money(p.voided_total) }}</small>
                  <small v-if="p.voids_done" class="txt-warn ps__sub">voided {{ p.voids_done }}</small>
                </td>
                <td class="num" :class="{ 'txt-warn': p.discount_count > 0 }">{{ p.discount_count }}<small v-if="p.discount_count" class="muted ps__sub">{{ money(p.discount_total) }}</small></td>
                <td class="num ps__money">
                  <span><small class="muted">Cash</small> {{ money(p.cash_total) }}</span>
                  <span v-if="p.mobile_total"><small class="muted">{{ mobileLabel }}</small> {{ money(p.mobile_total) }}</span>
                  <span v-if="p.card_total"><small class="muted">Card</small> {{ money(p.card_total) }}</span>
                  <span v-if="p.other_total"><small class="muted">Other</small> {{ money(p.other_total) }}</span>
                </td>
                <td class="ps__devs">
                  <span v-for="d in p.devices" :key="d.device_id" class="ps__dev" :title="`${d.sales_count} sales · ${money(d.sales_total)}`">
                    <i class="fa-solid fa-mobile-screen"></i> {{ d.device_label || (d.device_id ? 'Unnamed device' : 'Not recorded') }} <span class="muted">{{ d.sales_count }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="summary.people.length > 1">
              <tr>
                <td><strong>Everyone</strong></td>
                <td class="num">{{ summary.totals.sales_count }}</td>
                <td class="num"><strong>{{ money(summary.totals.sales_total) }}</strong></td>
                <td class="num">{{ summary.totals.voided_count }}</td>
                <td class="num">{{ summary.totals.discount_count }}</td>
                <td class="num ps__money">
                  <span><small class="muted">Cash</small> {{ money(summary.totals.cash_total) }}</span>
                  <span v-if="summary.totals.mobile_total"><small class="muted">{{ mobileLabel }}</small> {{ money(summary.totals.mobile_total) }}</span>
                  <span v-if="summary.totals.card_total"><small class="muted">Card</small> {{ money(summary.totals.card_total) }}</span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="ps__sec">
        <h3 class="ps__title">By device</h3>
        <div class="ui-table-wrap">
          <table class="ui-table" v-table-cards>
            <thead>
              <tr>
                <th>Device</th>
                <th class="num">Sales</th>
                <th class="num">Value</th>
                <th class="num">Voided</th>
                <th>Used by</th>
                <th class="hide-md">Last sale</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in summary.devices" :key="d.device_id || 'none'" class="is-clickable" tabindex="0" :data-device="d.device_label || 'none'" @click="$emit('device', d.device_id || 'none')" @keydown.enter="$emit('device', d.device_id || 'none')">
                <td>
                  <strong><i class="fa-solid fa-mobile-screen muted"></i> {{ d.device_label || (d.device_id ? 'Unnamed device' : 'Not recorded') }}</strong>
                  <small v-if="!d.device_id" class="muted"> (sales from before devices were tagged)</small>
                </td>
                <td class="num card-show" data-label="Sales">{{ d.sales_count }}</td>
                <td class="num card-show" data-label="Value"><strong>{{ money(d.sales_total) }}</strong></td>
                <td class="num card-show" data-label="Voided" :class="{ 'txt-danger': d.voided_count > 0 }">{{ d.voided_count }}</td>
                <td class="card-show" data-label="Used by">{{ (d.people || []).join(', ') }}</td>
                <td class="hide-md nowrap">{{ d.last_sale ? when(d.last_sale) : "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="ui-hint ps__hint">Each phone or computer is named on the till (⋯ → This device). Tap a person or a device to see their sales.</p>
      </section>
    </template>
  </div>
</template>

<script>
// Managers: sales, voids, discounts and money taken per person and per device
// (GET /pos/people-summary) for the transactions page's date range.
import { formatMoney, formatDateTime } from '@/utils/format'
import { mobileMoneyLabel } from '@/services/posService'

export default {
  name: 'PeopleSummary',
  props: {
    summary: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    rangeLabel: { type: String, default: '' },
    currency: { type: String, default: '' }
  },
  emits: ['person', 'device'],
  computed: {
    mobileLabel() {
      return mobileMoneyLabel(this.currency)
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency || undefined)
    },
    when: formatDateTime
  }
}
</script>

<style scoped>
.ps__sec {
  padding: 4px 0 8px;
}
.ps__sec + .ps__sec {
  border-top: 1px solid var(--border);
}
.ps__title {
  margin: 0;
  padding: 14px 16px 8px;
  font-size: 14px;
  font-weight: 650;
}
.ps__title .muted {
  font-weight: 500;
  margin-left: 6px;
}
.muted {
  color: var(--text-3);
}
.txt-danger {
  color: var(--danger);
}
.nowrap {
  white-space: nowrap;
}
.txt-warn {
  color: var(--warning);
}
.ps__dev {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 2px 6px 2px 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  font-size: 12.5px;
  white-space: nowrap;
}
.ps__person strong {
  white-space: nowrap;
}
.ps__sub {
  display: block;
  font-size: 11.5px;
  white-space: nowrap;
}
.ps__money span {
  display: block;
  white-space: nowrap;
}
.ps__money small {
  font-size: 11.5px;
  margin-right: 4px;
}
.ps__devs .ps__dev {
  display: flex;
  width: fit-content;
}
.ps__photos {
  margin-left: 6px;
  font-size: 12px;
}
.ps__hint {
  padding: 0 16px 8px;
}
tfoot td {
  border-top: 1px solid var(--border-strong);
  background: var(--surface-2);
}
.num {
  font-variant-numeric: tabular-nums;
}
tr.is-clickable:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
@media (max-width: 1200px) {
  .hide-lg {
    display: none;
  }
}
@media (max-width: 900px) {
  .hide-md {
    display: none;
  }
}
</style>
