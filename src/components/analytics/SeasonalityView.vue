<template>
  <div data-testid="view-seasonality">
    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Seasonality index</h2>
          <span class="sub">{{ d?.note }}<template v-if="d && d.peak"> Strongest: {{ d.peak }} · weakest: {{ d.low }}.</template></span>
        </div>
      </div>
      <div class="ui-card__body">
        <div v-if="!d" class="ui-skeleton" style="height: 220px"></div>
        <SignedBarChart
          v-else
          :labels="MONTHS"
          :values="d.index.map((v) => (v ? v - 100 : 0))"
          :colors="d.index.map((v) => (v >= 100 ? 'var(--viz-1)' : 'var(--viz-2)'))"
          :height="220"
          value-name="Index"
          :format-y="(v) => (v > 0 ? '+' : '') + Math.round(v)"
          :format-value="(v, i) => `${d.index[i]} (${v >= 0 ? '+' : ''}${Math.round(v)} vs an average month)`"
          :format-title="(x) => x"
          :detail="(i) => `Average ${m(d.average[i])}`"
          aria-label="Seasonality index by calendar month (difference from an average month)"
          data-testid="season-index"
        />
      </div>
    </section>

    <section class="ui-card mb">
      <div class="ui-card__head">
        <div>
          <h2>Revenue by year and month</h2>
          <span class="sub">Darker = more revenue · {{ d?.conversion?.currency }}</span>
        </div>
      </div>
      <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 200px"></div></div>
      <div v-else class="heat-wrap">
        <table class="heat" data-testid="season-heat">
          <thead>
            <tr>
              <th class="sticky">Year</th>
              <th v-for="mo in MONTHS" :key="mo" class="num">{{ mo }}</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, yi) in d.matrix" :key="d.years[yi]">
              <th class="sticky">{{ d.years[yi] }}</th>
              <td v-for="(v, mi) in row" :key="mi" class="num cell" :style="{ background: v == null ? 'transparent' : heat(v / max) }" :title="v == null ? 'Outside the range' : `${MONTHS[mi]} ${d.years[yi]}: ${m(v)}`">
                {{ v == null ? '' : m(v, true) }}
              </td>
              <td class="num tot">{{ m(row.reduce((s, v) => s + (v || 0), 0), true) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import SignedBarChart from './charts/SignedBarChart.vue'
import { analyticsApi } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { money, heat, downloadCsv, fileStamp } from './fmt'

const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(2024, i, 1)))

export default {
  name: 'SeasonalityView',
  components: { SignedBarChart },
  props: { params: { type: Object, required: true }, filters: { type: Object, required: true } },
  emits: ['drill', 'loaded'],
  data() {
    return { d: null, error: '', req: 0, MONTHS }
  },
  computed: {
    max() {
      let mx = 1
      ;(this.d?.matrix || []).forEach((r) => r.forEach((v) => v != null && (mx = Math.max(mx, v))))
      return mx
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
    heat,
    m(v, c = false) {
      return money(v, this.d?.conversion?.currency, c)
    },
    async load() {
      const id = ++this.req
      try {
        const d = await analyticsApi.seasonality(this.params)
        if (id !== this.req) return
        this.d = d
        this.error = ''
        this.$emit('loaded', d)
      } catch (e) {
        if (id === this.req) this.error = apiErrorMessage(e, 'Could not load seasonality.')
      }
    },
    exportCsv() {
      const d = this.d
      if (!d) return
      const rows = [[`Seasonality (${d.conversion.currency})`], [d.note], [], ['Year', ...MONTHS]]
      d.matrix.forEach((r, i) => rows.push([d.years[i], ...r.map((v) => (v == null ? '' : v))]))
      rows.push(['Average', ...d.average], ['Index', ...d.index])
      downloadCsv(`seasonality-${fileStamp()}.csv`, rows)
    }
  }
}
</script>

<style scoped>
.mb {
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
}

.heat-wrap {
  overflow-x: auto;
  padding: 4px 16px 14px;
}

.heat {
  border-collapse: separate;
  border-spacing: 2px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-width: 100%;
}

.heat th,
.heat td {
  padding: 6px 8px;
  white-space: nowrap;
  text-align: right;
  color: var(--text);
}

.heat thead th {
  color: var(--text-3);
  font-weight: 600;
}

.heat .sticky {
  position: sticky;
  left: 0;
  background: var(--surface);
  text-align: left;
  z-index: 1;
}

.cell {
  border-radius: 4px;
  min-width: 52px;
}

.tot {
  font-weight: 650;
}
</style>
