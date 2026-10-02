<template>
  <div class="sh" data-testid="self-hosted">
    <div v-if="!servers.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-hard-drive"></i></div>
      <h3>No self-hosted server yet</h3>
      <p>Add your own server to see what a site costs you on it and when it beats the wholesale plans.</p>
      <div v-if="canEdit" class="ui-actions center"><button type="button" class="ui-btn ui-btn--primary" @click="$emit('add-server')"><i class="fa-solid fa-plus"></i> Add a server</button></div>
    </div>
    <template v-else>
      <div class="toolbar">
        <select v-if="servers.length > 1" v-model="id" class="ui-select narrow" aria-label="Server">
          <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <strong v-else>{{ server.name }}</strong>
        <span class="muted">Costs in {{ server.currency }} unless a line says otherwise</span>
        <span class="spacer"></span>
        <span class="muted">Compare with plans for</span>
        <div class="seg" role="group" aria-label="Hosting need to compare with">
          <button v-for="t in tiers" :key="t.key" type="button" :class="{ on: tier === t.key }" :aria-pressed="tier === t.key" :data-sh-tier="t.key" @click="tier = t.key">{{ t.label }}</button>
        </div>
      </div>

      <div class="row2">
        <!-- Costs -->
        <section class="panel">
          <div class="panel__head">
            <h3>Monthly costs</h3>
            <span v-if="dirty" class="ui-badge ui-badge--warning">Unsaved</span>
          </div>
          <div class="ui-table-wrap">
            <table class="ui-table costs" data-testid="cost-lines">
              <thead>
                <tr><th>Cost</th><th class="num">Per month</th><th>Currency</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="(l, i) in form.costs" :key="l.key || i" :data-line="l.key">
                  <td>
                    <input v-model.trim="l.label" class="ui-input cell lab" :disabled="!canEdit" :aria-label="`Cost ${i + 1} name`" placeholder="What is it?" />
                    <div v-if="l.kind === 'time'" class="time">
                      <input v-model="l.hours" class="ui-input cell n" type="number" min="0" step="0.5" :disabled="!canEdit" :aria-label="`${l.label} hours per month`" :data-testid="'hours-' + l.key" />
                      <span>h ×</span>
                      <input v-model="l.rate" class="ui-input cell n" type="number" min="0" step="any" :disabled="!canEdit" :aria-label="`${l.label} rate per hour`" :data-testid="'rate-' + l.key" />
                      <span>/ h</span>
                    </div>
                  </td>
                  <td class="num">
                    <span v-if="l.kind === 'time'" class="calc" :data-testid="'monthly-' + l.key">{{ num((Number(l.hours) || 0) * (Number(l.rate) || 0)) }}</span>
                    <input v-else v-model="l.amount" class="ui-input cell n" type="number" min="0" step="any" :disabled="!canEdit" :aria-label="`${l.label || 'Cost'} per month`" :data-testid="'amount-' + l.key" />
                  </td>
                  <td>
                    <select v-model="l.currency" class="ui-select cell" :disabled="!canEdit" :aria-label="`${l.label} currency`" :data-testid="'currency-' + l.key">
                      <option value="">{{ server.currency }}</option>
                      <optgroup v-for="g in groups" :key="g.region" :label="g.region">
                        <option v-for="c in g.items" :key="c.code" :value="c.code" :disabled="c.code === server.currency">{{ c.code }}</option>
                      </optgroup>
                    </select>
                  </td>
                  <td class="acts">
                    <button v-if="canEdit" type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Remove ${l.label || 'cost'}`" title="Remove" @click="form.costs.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="m">
                <tr>
                  <td><strong>Total a month</strong><small v-if="dirty" class="block muted">as last saved</small></td>
                  <td class="num" colspan="3"><strong data-testid="sh-total" :data-value="m.monthly_total">{{ cur(m.monthly_total, m.currency) }}</strong><small v-if="m.currency !== home" class="block muted">≈ {{ cur(m.monthly_total_home, home) }}</small></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-if="canEdit" class="addrow">
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="addLine('fixed')"><i class="fa-solid fa-plus"></i> Add a cost</button>
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="addLine('time')"><i class="fa-solid fa-user-clock"></i> Add time</button>
          </div>
          <div class="cap3">
            <label class="ui-field">
              <span class="ui-label">Sites it can hold</span>
              <input v-model="form.capacity" class="ui-input" type="number" min="0" step="1" :disabled="!canEdit" data-testid="sh-capacity" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Sites on it now</span>
              <input v-model="form.current_sites" class="ui-input" type="number" min="0" step="1" :disabled="!canEdit" data-testid="sh-sites" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Disk (GB)</span>
              <input v-model="form.disk_gb" class="ui-input" type="number" min="0" step="any" placeholder="optional" :disabled="!canEdit" />
            </label>
          </div>
          <div v-if="canEdit" class="save">
            <button type="button" class="ui-btn ui-btn--primary" :disabled="saving || !dirty" data-testid="sh-save" @click="save"><i class="fa-solid fa-floppy-disk"></i> Save costs</button>
            <span class="muted">Fixed costs are shared by every site on the server: more sites, lower cost per site.</span>
          </div>
        </section>

        <!-- What it means -->
        <section class="panel">
          <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
          <div v-else-if="!m" class="ui-skeleton" style="height: 320px"></div>
          <template v-else>
            <div class="stats">
              <div data-stat="now" :data-value="m.per_site_current_home ?? ''">
                <small>Cost per site now</small>
                <strong>{{ m.per_site_current_home != null ? cur(m.per_site_current_home, home) : '—' }}</strong>
                <span>{{ m.current_sites ? `${m.current_sites} site${m.current_sites === 1 ? '' : 's'} · per month` : 'no sites yet' }}</span>
              </div>
              <div data-stat="full" :data-value="m.per_site_capacity_home ?? ''">
                <small>With the server full</small>
                <strong>{{ m.per_site_capacity_home != null ? cur(m.per_site_capacity_home, home) : '—' }}</strong>
                <span>{{ m.capacity ? `${m.capacity} sites · per month` : 'set the capacity' }}</span>
              </div>
              <div data-stat="year">
                <small>Server per year</small>
                <strong>{{ cur(m.yearly_total_home, home, { whole: true }) }}</strong>
                <span>{{ cur(m.monthly_total_home, home) }} a month</span>
              </div>
            </div>
            <div v-for="(w, i) in m.warnings" :key="i" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ w }}</span></div>

            <template v-if="m.chart.length">
              <h3 class="sub">Cost per site per month, {{ home }}</h3>
              <CostCurve :xs="m.chart_x" :self="m.chart[0].values" :self-name="m.name" :plans="plans" :current="m.current_sites" :format-y="(v) => num(v, 0)" :format-value="(v) => cur(v, home)" />
            </template>

            <h3 class="sub">Break-even against wholesale plans</h3>
            <p v-if="!m.break_even.length" class="muted">No wholesale plan on your price lists covers this need yet — import or add hosting plans to compare.</p>
            <div v-else class="ui-table-wrap">
              <table v-table-cards class="ui-table" data-testid="break-even">
                <thead>
                  <tr><th>Instead of</th><th class="num">Plan / month</th><th class="num">Break-even</th><th class="num hide-sm">You save / month</th></tr>
                </thead>
                <tbody>
                  <tr v-for="b in m.break_even" :key="b.supplier_id" :data-supplier="b.supplier_name" :data-sites="b.sites" :data-plan-home="b.plan_monthly_home">
                    <td>{{ b.supplier_name }}<small class="block muted">{{ b.plan }}</small></td>
                    <td class="num">{{ cur(b.plan_monthly_home, home) }}<small v-if="b.currency !== home" class="block muted">{{ cur(b.plan_monthly, b.currency) }}</small></td>
                    <td class="num">
                      <strong v-if="b.sites">{{ b.sites }} site{{ b.sites === 1 ? '' : 's' }}</strong><span v-else>—</span>
                      <small class="block" :class="b.reachable ? 'muted' : 'txt-warn'">{{ b.reachable ? (m.current_sites >= b.sites ? 'reached' : `${b.sites - m.current_sites} to go`) : b.sites ? 'beyond capacity' : '' }}</small>
                    </td>
                    <td class="num hide-sm card-show">
                      <template v-if="m.current_sites"><span :class="b.saving_current < 0 ? 'txt-danger' : 'txt-ok'">{{ b.saving_current < 0 ? '−' : '' }}{{ cur(Math.abs(b.saving_current), home, { whole: true }) }}</span><small class="block muted">now</small></template>
                      <template v-if="m.capacity"><span :class="b.saving_capacity < 0 ? 'txt-danger' : 'txt-ok'">{{ b.saving_capacity < 0 ? '−' : '' }}{{ cur(Math.abs(b.saving_capacity), home, { whole: true }) }}</span><small class="block muted">when full</small></template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul v-if="m.break_even.length" class="texts">
              <li v-for="b in m.break_even" :key="'t' + b.supplier_id"><strong>{{ b.supplier_name }}:</strong> {{ b.text }}</li>
            </ul>
          </template>
        </section>
      </div>
    </template>
  </div>
</template>

<script>
import CostCurve from './CostCurve.vue'
import { pricebookApi, cur, num } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { currencyGroups } from '@/utils/currencies'

const blank = (v) => (v === 0 || v === null || v === undefined ? '' : v)

export default {
  name: 'SelfHostedModel',
  components: { CostCurve },
  props: {
    suppliers: { type: Array, default: () => [] },
    tiers: { type: Array, default: () => [] },
    home: { type: String, default: 'AUD' },
    canEdit: { type: Boolean, default: false },
    startTier: { type: String, default: '' },
    version: { type: Number, default: 0 }
  },
  emits: ['changed', 'add-server'],
  data() {
    return { id: '', tier: this.startTier || this.tiers[0]?.key || '', form: { costs: [], capacity: '', current_sites: '', disk_gb: '' }, saved: '', m: null, error: '', saving: false, groups: currencyGroups() }
  },
  computed: {
    servers() {
      return this.suppliers.filter((s) => s.type === 'self_hosted')
    },
    server() {
      return this.servers.find((s) => s.id === this.id) || this.servers[0] || null
    },
    payload() {
      const n = (v) => Number(v) || 0
      return {
        costs: this.form.costs.map((l) => ({ key: l.key, label: l.label, kind: l.kind, amount: l.kind === 'time' ? 0 : n(l.amount), hours: l.kind === 'time' ? n(l.hours) : 0, rate: l.kind === 'time' ? n(l.rate) : 0, currency: l.currency || '', note: l.note || '' })),
        capacity: Math.round(n(this.form.capacity)),
        current_sites: Math.round(n(this.form.current_sites)),
        disk_gb: n(this.form.disk_gb)
      }
    },
    dirty() {
      return JSON.stringify(this.payload) !== this.saved
    },
    plans() {
      return (this.m?.break_even || []).filter((b) => b.plan_monthly_home > 0).map((b) => ({ key: b.supplier_id, name: `${b.supplier_name} · ${b.plan}`, value: b.plan_monthly_home, sites: b.sites }))
    }
  },
  watch: {
    server: {
      immediate: true,
      handler(s, old) {
        if (s && (!old || s.id !== old.id || !this.dirty)) this.reset(s)
        if (s) this.load()
      }
    },
    tier() {
      this.load()
    },
    version() {
      this.load()
    }
  },
  methods: {
    cur,
    num,
    reset(s) {
      this.id = s.id
      this.form = {
        costs: (s.costs || []).map((l) => ({ key: l.key, label: l.label, kind: l.kind === 'time' ? 'time' : 'fixed', amount: blank(l.amount), hours: blank(l.hours), rate: blank(l.rate), currency: l.currency || '', note: l.note || '' })),
        capacity: blank(s.capacity),
        current_sites: blank(s.current_sites),
        disk_gb: blank(s.disk_gb)
      }
      this.saved = JSON.stringify(this.payload)
    },
    addLine(kind) {
      this.form.costs.push({ key: `c${Date.now().toString(36)}`, label: kind === 'time' ? 'Your time' : '', kind, amount: '', hours: '', rate: '', currency: '', note: '' })
    },
    async load() {
      if (!this.server) return
      this.error = ''
      try {
        this.m = await pricebookApi.model(this.server.id, { tier: this.tier })
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not work out the cost model')
      }
    },
    async save() {
      const p = this.payload
      if (p.costs.some((l) => !l.label && (l.amount || l.hours * l.rate))) return toast.error('Give every cost a name')
      this.saving = true
      try {
        await pricebookApi.updateSupplier(this.server.id, p)
        this.saved = JSON.stringify(this.payload)
        toast.success('Server costs saved')
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the costs'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sh {
  min-width: 0;
}
.toolbar {
  display: flex;
  gap: 8px 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.spacer {
  flex: 1;
}
.narrow {
  width: auto;
  min-width: 160px;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.center {
  justify-content: center;
  margin-top: 12px;
}
.seg {
  display: inline-flex;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.seg button {
  background: var(--surface);
  color: var(--text-2);
  border: 0;
  padding: 6px 11px;
  font-size: 13px;
  cursor: pointer;
}
.seg button + button {
  border-left: 1px solid var(--border);
}
.seg button.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.row2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 16px;
  align-items: start;
}
.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  min-width: 0;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.panel__head h3,
.sub {
  font-size: 14.5px;
  margin: 0;
}
.sub {
  margin-top: 4px;
}
.costs td,
.costs th {
  padding: 6px 8px;
  vertical-align: middle;
}
.cell {
  padding: 5px 8px;
  min-height: 0;
}
.cell.lab {
  width: 100%;
  min-width: 120px;
}
.cell.n {
  width: 92px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
select.cell {
  width: auto;
  min-width: 78px;
}
.time {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
  color: var(--text-3);
  font-size: 12.5px;
}
.time .n {
  width: 68px;
}
.calc {
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
}
.costs .ui-btn--icon {
  width: 28px;
  height: 28px;
}
.acts {
  text-align: right;
  width: 36px;
}
.addrow {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.cap3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.save {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.stats > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  min-width: 0;
}
.stats small,
.stats span {
  color: var(--text-3);
  font-size: 12px;
}
.stats strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.texts {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-2);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.block {
  display: block;
}
td small.block {
  font-weight: 400;
}
.txt-ok {
  color: var(--success);
}
.txt-danger {
  color: var(--danger);
}
.txt-warn {
  color: var(--warning);
}
@media (max-width: 1000px) {
  .row2 {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .stats,
  .cap3 {
    grid-template-columns: 1fr 1fr;
  }
  .costs td,
  .costs th {
    padding: 6px 4px;
    white-space: normal !important;
  }
  .costs td:first-child,
  .costs th:first-child {
    position: static !important;
    box-shadow: none !important;
  }
  .cell.lab {
    min-width: 96px;
  }
  .cell.n {
    width: 70px;
  }
  select.cell {
    min-width: 62px;
    padding-left: 4px;
    padding-right: 20px;
  }
  .time {
    flex-wrap: wrap;
  }
  .time .n {
    width: 52px;
  }
}
</style>
