<template>
  <div class="cs" data-testid="bar-counts">
    <div class="toolbar">
      <select v-model="loc" class="ui-select" aria-label="Location">
        <option value="">All locations</option>
        <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <div class="ui-tabs st-tabs" role="tablist" aria-label="Status">
        <button v-for="s in statuses" :key="s.key" type="button" class="ui-tab" :class="{ 'is-active': status === s.key }" role="tab" :aria-selected="status === s.key" @click="status = s.key">{{ s.label }}<span v-if="s.n" class="count" :class="s.tone">{{ s.n }}</span></button>
      </div>
      <button v-if="perm.create" type="button" class="ui-btn ui-btn--primary ui-btn--sm end" data-testid="counts-start" @click="$emit('start')"><i class="fa-solid fa-clipboard-check"></i> Start count</button>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="loading && !counts.length" class="sk"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 48px"></div></div>
    <div v-else-if="!counts.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-clipboard-check"></i></div>
      <h3>{{ status === 'all' && !loc ? 'No stock counts yet' : 'No counts here' }}</h3>
      <p>Count a bar at the end of the night (or a few top spirits as a spot check). Counting works on a phone, even when the Wi-Fi drops.</p>
      <button v-if="perm.create" type="button" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="$emit('start')"><i class="fa-solid fa-clipboard-check"></i> Start the first count</button>
    </div>
    <div v-else class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Count</th>
            <th class="hide-sm">Night of</th>
            <th>Status</th>
            <th class="num hide-sm">Items</th>
            <th v-if="perm.approve" class="num">Variance</th>
            <th class="num"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in counts" :key="c.id" class="is-clickable" :data-count="c.number || c.id" @click="openCount(c)">
            <td>
              <div class="cname">
                <strong>{{ countTypeLabel(c.type) }} · {{ c.location || locationName(c.location_id) }}</strong>
                <small>{{ c.number }}<template v-if="c.blind"> · blind</template><template v-if="c.created_by_name"> · {{ c.created_by_name }}</template><span class="show-sm"> · {{ formatDate(c.business_date, 'short') }}</span></small>
              </div>
            </td>
            <td class="hide-sm">{{ formatDate(c.business_date) }}</td>
            <td><span class="ui-badge" :class="meta(c).badge">{{ meta(c).label }}</span></td>
            <td class="num hide-sm">{{ itemsText(c) }}</td>
            <td v-if="perm.approve" class="num" :class="varClass(c)">{{ varText(c) }}</td>
            <td class="num">
              <button v-if="isDraft(c) && perm.create" type="button" class="ui-btn ui-btn--sm" :data-testid="'continue-' + (c.number || c.id)" @click.stop="$router.push(`/bar-stock/count/${c.id}`)">Continue</button>
              <button v-else-if="c.status === 'submitted' && perm.approve" type="button" class="ui-btn ui-btn--primary ui-btn--sm" :data-testid="'review-' + (c.number || c.id)" @click.stop="$emit('review', c.id)">Review</button>
              <button v-if="isDraft(c) && (perm.approve || perm.delete)" type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Delete ${c.number || 'count'}`" @click.stop="remove(c)"><i class="fa-regular fa-trash-can"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { bar, money, has, locationName, pick } from './barContext'
import { barApi, COUNT_STATUS, statusMeta } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate } from '@/utils/format'
import { countTypeLabel } from '@/utils/barUnits'

export default {
  name: 'BarCounts',
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 }
  },
  emits: ['start', 'review', 'changed'],
  data() {
    return { bar, loc: '', status: 'all', all: [], loading: false, error: '' }
  },
  computed: {
    statuses() {
      const n = (s) => this.all.filter((c) => (s === 'draft' ? this.isDraft(c) : c.status === s)).length
      return [
        { key: 'all', label: 'All' },
        { key: 'draft', label: 'In progress', n: n('draft') },
        { key: 'submitted', label: 'To review', n: n('submitted'), tone: 'warn' },
        { key: 'approved', label: 'Approved' }
      ]
    },
    counts() {
      if (this.status === 'all') return this.all
      if (this.status === 'draft') return this.all.filter((c) => this.isDraft(c))
      return this.all.filter((c) => c.status === this.status)
    }
  },
  watch: {
    loc() {
      this.load()
    },
    version() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    formatDate,
    locationName,
    countTypeLabel,
    isDraft(c) {
      return c.status === 'draft' || c.status === 'recount'
    },
    meta(c) {
      if (c.status === 'draft' && Number(c.recount_round) > 0) return { label: 'Recount', badge: 'ui-badge--info' }
      return statusMeta(COUNT_STATUS, c.status)
    },
    itemsText(c) {
      const n = pick(c, 'line_count', 'lines_total', 'items')
      const done = pick(c, 'counted_count', 'lines_counted', 'counted')
      if (n === undefined) return '—'
      return done !== undefined && c.status !== 'approved' ? `${done} / ${n}` : String(n)
    },
    varValue(c) {
      return pick(c, 'variance_value')
    },
    varText(c) {
      if (c.status !== 'approved') return '—'
      const v = this.varValue(c)
      if (!has(v)) return '—'
      return (Number(v) > 0 ? '+' : '') + money(v)
    },
    varClass(c) {
      const v = Number(this.varValue(c)) || 0
      if (c.status !== 'approved' || !v) return ''
      return v < 0 ? 'neg' : 'pos'
    },
    openCount(c) {
      if (this.isDraft(c) && this.perm.create) this.$router.push(`/bar-stock/count/${c.id}`)
      else this.$emit('review', c.id)
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.all = await barApi.counts({ location_id: this.loc })
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the counts')
      } finally {
        this.loading = false
      }
    },
    async remove(c) {
      const ok = await confirmDialog({ title: 'Delete this count?', message: `${c.number || 'The count'} and everything entered in it will be removed.`, confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await barApi.deleteCount(c.id)
        toast.success('Count deleted')
        this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the count'))
      }
    }
  }
}
</script>

<style scoped>
.cs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.toolbar .ui-select {
  width: 190px;
}
.st-tabs {
  overflow-x: auto;
}
.end {
  margin-left: auto;
}
.count.warn {
  background: var(--warning-soft);
  color: var(--warning);
}
.sk {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cname {
  display: flex;
  flex-direction: column;
}
.cname small {
  color: var(--text-3);
  font-size: 12px;
}
.neg {
  color: var(--danger);
  font-weight: 600;
}
.pos {
  color: var(--success);
  font-weight: 600;
}
.show-sm {
  display: none;
}
@media (max-width: 760px) {
  .hide-sm {
    display: none;
  }
  .show-sm {
    display: inline;
  }
  .toolbar .ui-select {
    flex: 1 1 160px;
  }
}
</style>
