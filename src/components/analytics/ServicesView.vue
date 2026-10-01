<template>
  <div data-testid="view-services">
    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="kpis">
      <KpiCard label="Service revenue" icon="fa-solid fa-layer-group" tone="success" :loading="!d" :value="m(d?.revenue)" meta="Excl. tax, all service lines" :show-delta="false" />
      <KpiCard label="Direct costs" icon="fa-solid fa-truck-fast" tone="warning" :loading="!d" :value="m(d?.direct_cost)" meta="Hosting, domains, Workspace, software" :show-delta="false" />
      <KpiCard label="Gross margin" icon="fa-solid fa-percent" tone="info" :loading="!d" :value="d && d.revenue ? pct(((d.revenue - d.direct_cost) / d.revenue) * 100) : '—'" :meta="m(d ? d.revenue - d.direct_cost : 0) + ' after direct costs'" :show-delta="false" data-kpi="gm" />
      <KpiCard label="Overhead" icon="fa-solid fa-building" :loading="!d" :value="m(d?.overhead)" meta="Other approved expenses (not allocated)" :show-delta="false" />
    </div>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Margin by service line</h2>
          <span class="sub">{{ d?.cost_mapping }}</span>
        </div>
        <button class="ui-btn ui-btn--sm" type="button" data-testid="edit-mapping" @click="openMap"><i class="fa-solid fa-sliders"></i> Edit mapping</button>
      </div>
      <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 260px"></div></div>
      <div v-else-if="!d.lines.length" class="ui-empty small"><p>No revenue or direct costs in this range.</p></div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table" data-testid="service-lines">
          <thead>
            <tr>
              <th>Service line</th>
              <th class="num">Revenue</th>
              <th class="num hide-sm">YoY</th>
              <th class="num">Direct cost</th>
              <th class="num">Margin</th>
              <th class="num hide-sm">Clients</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in d.lines" :key="l.line" class="is-clickable" :data-line="l.line" @click="drill(l)">
              <td><i class="dviz-swatch" :style="{ background: LINE_COLORS[l.line] }"></i>{{ l.label }}</td>
              <td class="num">{{ m(l.revenue) }}</td>
              <td class="num hide-sm" :class="l.yoy_pct > 0 ? 'up' : l.yoy_pct < 0 ? 'down' : ''">{{ l.prev ? pct(l.yoy_pct, 0, true) : '—' }}</td>
              <td class="num">{{ l.cost ? m(l.cost) : '—' }}</td>
              <td class="num">
                <strong :class="{ down: l.margin < 0 }">{{ m(l.margin) }}</strong>
                <small class="muted block">{{ l.margin_pct == null ? '' : pct(l.margin_pct, 0) }}</small>
              </td>
              <td class="num hide-sm">{{ l.clients }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="d && d.lines.length" class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Revenue mix by month</h2>
          <span class="sub">Stacked by service line (credit notes reduce their line; months below zero show as zero)</span>
        </div>
        <div class="dviz-legend">
          <span v-for="l in d.lines" :key="l.line"><i class="dviz-swatch" :style="{ background: LINE_COLORS[l.line] }"></i>{{ l.label }}</span>
        </div>
      </div>
      <div class="ui-card__body">
        <StackedBarChart
          :labels="d.months"
          :series="d.lines.map((l) => ({ key: l.line, name: l.label, values: l.months, color: LINE_COLORS[l.line] }))"
          :height="260"
          :format-x="(x) => monthLabel(x)"
          :format-title="(x) => monthLabel(x, true)"
          :format-y="(v) => ax(v)"
          :format-value="(v) => m(v)"
          aria-label="Revenue by service line and month"
        />
      </div>
    </section>

    <div v-if="mapOpen" class="ui-modal-backdrop" @mousedown.self="mapOpen = false">
      <div class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-labelledby="map-title">
        <div class="ui-modal__head">
          <h2 id="map-title">Service-line mapping</h2>
          <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="mapOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <p class="ui-hint">
            Each invoice line goes to the first service line (top to bottom) with a keyword its description contains (case-insensitive). Lines matching nothing are
            “Other”. Use the arrows to change the order.
          </p>
          <div v-for="(r, i) in rules" :key="r.line" class="rule" :data-rule="r.line">
            <div class="rule__head">
              <span class="ord">{{ i + 1 }}</span>
              <i class="dviz-swatch" :style="{ background: LINE_COLORS[r.line] }"></i>
              <strong>{{ labels[r.line] || r.line }}</strong>
              <span class="grow"></span>
              <button class="ui-btn ui-btn--icon ui-btn--sm ui-btn--ghost" type="button" :disabled="i === 0" aria-label="Move up" @click="move(i, -1)"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="ui-btn ui-btn--icon ui-btn--sm ui-btn--ghost" type="button" :disabled="i === rules.length - 1" aria-label="Move down" @click="move(i, 1)"><i class="fa-solid fa-arrow-down"></i></button>
            </div>
            <textarea v-model="r.text" class="ui-textarea" rows="2" :aria-label="'Keywords for ' + (labels[r.line] || r.line)" placeholder="Comma-separated keywords"></textarea>
          </div>
          <div v-if="mapError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ mapError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn ui-btn--ghost" type="button" :disabled="saving" @click="resetMap">Restore defaults</button>
          <span class="grow"></span>
          <button class="ui-btn" type="button" @click="mapOpen = false">Cancel</button>
          <button class="ui-btn ui-btn--primary" type="button" data-testid="save-mapping" :disabled="saving" @click="saveMap">
            <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> Save mapping
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import StackedBarChart from './charts/StackedBarChart.vue'
import { analyticsApi, LINE_COLORS, monthLabel } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { money, axis, pct, downloadCsv, fileStamp } from './fmt'

export default {
  name: 'ServicesView',
  components: { KpiCard, StackedBarChart },
  props: { params: { type: Object, required: true }, filters: { type: Object, required: true } },
  emits: ['drill', 'loaded'],
  data() {
    return { d: null, error: '', req: 0, LINE_COLORS, mapOpen: false, rules: [], labels: {}, saving: false, mapError: '' }
  },
  computed: {
    cur() {
      return this.d?.conversion?.currency
    }
  },
  watch: {
    params: {
      deep: true,
      handler() {
        this.load()
      }
    }
  },
  created() {
    this.load()
  },
  methods: {
    monthLabel,
    pct,
    m(v, c = false) {
      return money(v, this.cur, c)
    },
    ax(v) {
      return axis(v, this.cur)
    },
    drill(l) {
      this.$router.push({ query: { ...this.$route.query, view: 'revenue', line: l.line } })
    },
    async load() {
      const id = ++this.req
      try {
        const d = await analyticsApi.serviceLines(this.params)
        if (id !== this.req) return
        this.d = d
        this.error = ''
        this.$emit('loaded', d)
      } catch (e) {
        if (id === this.req) this.error = apiErrorMessage(e, 'Could not load service-line analytics.')
      }
    },
    async openMap() {
      this.mapError = ''
      try {
        const r = await analyticsApi.serviceMap()
        this.labels = r.labels || {}
        const have = new Set((r.rules || []).map((x) => x.line))
        const order = (r.order || []).filter((k) => k !== 'other' && !have.has(k))
        this.rules = [...(r.rules || []).map((x) => ({ line: x.line, text: (x.keywords || []).join(', ') })), ...order.map((k) => ({ line: k, text: '' }))]
        this.mapOpen = true
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the mapping'))
      }
    },
    move(i, dir) {
      const r = this.rules.splice(i, 1)[0]
      this.rules.splice(i + dir, 0, r)
    },
    async saveMap() {
      this.saving = true
      this.mapError = ''
      try {
        const rules = this.rules
          .map((r) => ({ line: r.line, keywords: r.text.split(/[,\n]/).map((k) => k.trim()).filter(Boolean) }))
          .filter((r) => r.keywords.length)
        await analyticsApi.saveServiceMap(rules)
        toast.success('Mapping saved — figures recalculated')
        this.mapOpen = false
        this.load()
      } catch (e) {
        this.mapError = apiErrorMessage(e, 'Could not save the mapping')
      } finally {
        this.saving = false
      }
    },
    async resetMap() {
      if (!(await confirmDialog({ title: 'Restore default mapping?', message: 'Your keyword changes will be replaced by the built-in mapping.', confirmText: 'Restore' }))) return
      this.saving = true
      try {
        await analyticsApi.resetServiceMap()
        toast.success('Default mapping restored')
        this.mapOpen = false
        this.load()
      } catch (e) {
        this.mapError = apiErrorMessage(e, 'Could not restore the mapping')
      } finally {
        this.saving = false
      }
    },
    exportCsv() {
      const d = this.d
      if (!d) return
      const rows = [[`Service lines ${d.from} to ${d.to} (${d.conversion.currency}, excl. tax)`], [d.cost_mapping], [], ['Service line', 'Revenue', 'Previous year', 'YoY %', 'Direct cost', 'Margin', 'Margin %', 'Clients', ...d.months]]
      d.lines.forEach((l) => rows.push([l.label, l.revenue, l.prev, l.yoy_pct ?? '', l.cost, l.margin, l.margin_pct ?? '', l.clients, ...l.months]))
      rows.push([], ['Overhead (unallocated expenses)', d.overhead])
      downloadCsv(`service-lines-${fileStamp()}.csv`, rows)
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.ui-card__head.wrap {
  flex-wrap: wrap;
  gap: 8px;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
  max-width: 760px;
}

.muted {
  color: var(--text-3);
}

.block {
  display: block;
}

.up {
  color: var(--success);
}

.down {
  color: var(--danger);
}

.rule {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  margin-bottom: 10px;
}

.rule__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.ord {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-subtle);
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--text-2);
}

.grow {
  flex: 1;
}

.ui-modal__foot {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .hide-sm {
    display: none;
  }

  .kpis {
    gap: 10px;
  }
}
</style>
