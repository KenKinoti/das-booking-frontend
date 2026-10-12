<template>
  <div class="setup" data-testid="bar-setup">
    <!-- Locations -->
    <section class="blk">
      <div class="blk__head">
        <div>
          <h3>Store &amp; bars</h3>
          <p>Where stock is kept, sold and counted. Deliveries go to the main store unless you choose another location.</p>
        </div>
        <button v-if="perm.approve" type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-testid="add-location" @click="locModal = { loc: null }"><i class="fa-solid fa-plus"></i> Add location</button>
      </div>
      <div v-if="!bar.locations.length" class="ui-empty small">
        <div class="ui-empty__icon"><i class="fa-solid fa-warehouse"></i></div>
        <h3>No locations yet</h3>
        <p>Start with a main store and one bar — you can add more bars, a kitchen or an event bar later.</p>
        <button v-if="perm.approve" type="button" class="ui-btn ui-btn--primary ui-btn--sm" style="margin-top: 10px" data-testid="quick-locations" :disabled="busy" @click="quickLocations"><i class="fa-solid fa-wand-magic-sparkles"></i> Add “Main store” and “Main bar”</button>
      </div>
      <div v-else class="locs">
        <div v-for="l in bar.locations" :key="l.id" class="loc" :data-loc="l.name">
          <span class="loc__icon" :class="'t-' + l.type"><i :class="locationIcon(l.type)"></i></span>
          <div class="loc__main">
            <strong>{{ l.name }}</strong>
            <small>
              {{ locationTypeLabel(l.type) }}
              <template v-if="isMain(l)"> · <span class="tag">Main store</span></template>
              <template v-if="isDefaultBar(l)"> · <span class="tag">Default bar</span></template>
              <template v-if="staffCount(l)"> · {{ staffCount(l) }} staff assigned</template>
            </small>
          </div>
          <div v-if="perm.approve" class="loc__actions">
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${l.name}`" @click="locModal = { loc: l }"><i class="fa-regular fa-pen-to-square"></i></button>
            <button v-if="perm.delete" type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${l.name}`" @click="removeLocation(l)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    </section>

    <!-- Terminals -->
    <section v-if="bar.locations.length" class="blk">
      <div class="blk__head">
        <div>
          <h3>POS tills → bars</h3>
          <p>Which bar a till sells from when the cashier hasn’t picked one on the POS screen (“Selling from”). Sales without either go to the default bar.</p>
        </div>
      </div>
      <div v-if="termError" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ termError }}</span></div>
      <div class="terms">
        <div v-for="(t, i) in terminals" :key="i" class="term">
          <input v-model.trim="t.terminal_id" class="ui-input" placeholder="Till ID (e.g. main)" aria-label="Till ID" :data-testid="'term-id-' + i" />
          <select v-model="t.location_id" class="ui-select" aria-label="Sells from" :data-testid="'term-loc-' + i">
            <option value="">Default bar</option>
            <option v-for="b in sellable" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Remove till" @click="terminals.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="terms__foot">
          <button type="button" class="ui-btn ui-btn--sm" data-testid="add-terminal" @click="terminals.push({ terminal_id: terminals.length ? '' : 'main', location_id: '' })"><i class="fa-solid fa-plus"></i> Add till</button>
          <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="termBusy || !perm.approve" data-testid="save-terminals" @click="saveTerminals">Save tills</button>
        </div>
      </div>
    </section>

    <!-- Settings -->
    <form v-if="form" class="blk" data-testid="bar-settings" @submit.prevent="saveSettings">
      <div class="blk__head">
        <div>
          <h3>Rules &amp; thresholds</h3>
          <p>How tots are measured, when a night ends and when a variance is worth a look.</p>
        </div>
      </div>
      <div class="grid">
        <label class="ui-field">
          <span class="ui-label">Tot size (ml)</span>
          <input v-model.number="form.tot_ml" class="ui-input" type="number" min="5" max="200" step="1" required data-testid="set-tot" />
          <span class="ui-hint">A single measure. Items can override it (e.g. 30 ml for one brand).</span>
        </label>
        <label class="ui-field">
          <span class="ui-label">Night ends at</span>
          <input v-model="form.day_cutoff" class="ui-input" type="time" min="00:00" max="12:00" required data-testid="set-cutoff" />
          <span class="ui-hint">Sales before this time (up to midday) count for the previous night.</span>
        </label>
        <label class="ui-field">
          <span class="ui-label">Main store</span>
          <select v-model="form.main_store_id" class="ui-select" data-testid="set-main-store">
            <option value="">—</option>
            <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
          <span class="ui-hint">Deliveries are received here by default.</span>
        </label>
        <label class="ui-field">
          <span class="ui-label">Default bar</span>
          <select v-model="form.default_bar_id" class="ui-select" data-testid="set-default-bar">
            <option value="">—</option>
            <option v-for="l in sellable" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
          <span class="ui-hint">Sales that don’t say which bar.</span>
        </label>
        <label class="ui-field">
          <span class="ui-label">Flag variance above (%)</span>
          <input v-model="form.variance_pct_threshold" class="ui-input" type="number" min="0" step="0.1" placeholder="No threshold" data-testid="set-var-pct" />
          <span class="ui-hint">Of what was sold and wasted in the period.</span>
        </label>
        <label class="ui-field">
          <span class="ui-label">Flag variance above ({{ cur }})</span>
          <input v-model="form.variance_amount_threshold" class="ui-input" type="number" min="0" step="1" placeholder="No threshold" data-testid="set-var-amt" />
          <span class="ui-hint">Per item, at cost.</span>
        </label>
        <label class="ui-field">
          <span class="ui-label">Comps &amp; staff drinks per shift (drinks)</span>
          <input v-model="form.comp_allowance_per_shift" class="ui-input" type="number" min="0" step="1" placeholder="No allowance" data-testid="set-comp" />
          <span class="ui-hint">{{ compHint }}</span>
        </label>
      </div>

      <div class="switches">
        <label class="ui-switch"><input v-model="form.block_when_out" type="checkbox" data-testid="set-block" /><span>Block POS sales when the bar shows no stock</span></label>
        <p class="ui-hint">Off (recommended): the sale goes through and is flagged “sold more than recorded”, so service never stops for a stock-keeping gap.</p>
        <label class="ui-switch"><input v-model="form.night_report.enabled" type="checkbox" data-testid="set-night" /><span>Email a night report to managers</span></label>
        <div v-if="form.night_report.enabled" class="inline">
          <label class="ui-field">
            <span class="ui-label">Send at</span>
            <input v-model="form.night_report.send_at" class="ui-input" type="time" :min="form.day_cutoff" />
          </label>
          <p class="ui-hint">Sales by category, pour cost, wastage and comps, the last count’s variance, low stock and pending approvals — to users who can approve stock.</p>
        </div>
      </div>

      <h4 class="sub">Pour-cost targets</h4>
      <p class="ui-hint">Optional, per category — menu items above their target are flagged. Leave empty for no target.</p>
      <div class="targets">
        <label v-for="c in targetCats" :key="c.key" class="ui-field">
          <span class="ui-label"><i :class="c.icon"></i> {{ c.label }}</span>
          <div class="pct"><input v-model="form.pour_cost_targets[c.key]" class="ui-input" type="number" min="0" max="100" step="0.5" placeholder="—" :data-testid="'target-' + c.key" /><span>%</span></div>
        </label>
      </div>

      <div v-if="formError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
      <div class="blk__foot">
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !perm.approve" data-testid="save-settings">{{ saving ? 'Saving…' : 'Save settings' }}</button>
      </div>
    </form>

    <LocationModal v-if="locModal" :loc="locModal.loc" @close="locModal = null" @saved="onLocSaved" />
  </div>
</template>

<script>
import { bar, loadBar, currency, mainStoreId, defaultBarId } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { CATEGORIES, locationIcon, locationTypeLabel } from '@/utils/barUnits'
import LocationModal from './LocationModal.vue'

const numOrNull = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))

export default {
  name: 'BarSetup',
  components: { LocationModal },
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 }
  },
  emits: ['changed'],
  data() {
    return { bar, locModal: null, busy: false, terminals: [], termBusy: false, termError: '', form: null, saving: false, formError: '' }
  },
  computed: {
    cur() {
      return currency()
    },
    sellable() {
      return bar.locations.filter((l) => l.type !== 'store')
    },
    targetCats() {
      return CATEGORIES.filter((c) => !['consumables', 'garnish', 'food', 'other'].includes(c.key))
    },
    compHint() {
      return 'Tots or units. Free and staff drinks beyond this wait for a manager’s approval before they leave stock.'
    }
  },
  watch: {
    version() {
      this.loadTerminals()
    }
  },
  created() {
    this.resetForm()
    this.loadTerminals()
  },
  methods: {
    locationIcon,
    locationTypeLabel,
    isMain(l) {
      return l.is_main_store || l.id === mainStoreId()
    },
    isDefaultBar(l) {
      return l.id === defaultBarId() && l.type !== 'store'
    },
    staffCount(l) {
      return (l.staff_ids || l.staff || []).length
    },
    resetForm() {
      const s = bar.settings || {}
      const targets = {}
      for (const c of CATEGORIES) {
        const v = s.pour_cost_targets?.[c.key]
        targets[c.key] = v === null || v === undefined ? '' : v
      }
      this.form = {
        tot_ml: s.tot_ml || 25,
        day_cutoff: s.day_cutoff || '06:00',
        block_when_out: !!s.block_when_out,
        variance_pct_threshold: Number(s.variance_pct_threshold) ? s.variance_pct_threshold : '',
        variance_amount_threshold: Number(s.variance_amount_threshold) ? s.variance_amount_threshold : '',
        comp_allowance_per_shift: s.comp_allowance_per_shift ?? '',
        pour_cost_targets: targets,
        night_report: { enabled: !!s.night_report?.enabled, send_at: s.night_report?.send_at || '07:00' },
        default_bar_id: s.default_bar_id || '',
        main_store_id: s.main_store_id || ''
      }
    },
    async saveSettings() {
      this.formError = ''
      const f = this.form
      if (!(Number(f.tot_ml) > 0)) {
        this.formError = 'Enter the tot size in ml'
        return
      }
      const targets = {}
      for (const [k, v] of Object.entries(f.pour_cost_targets)) {
        const n = numOrNull(v)
        if (n !== null && (n < 0 || n > 100)) {
          this.formError = 'Pour-cost targets are percentages between 0 and 100'
          return
        }
        targets[k] = n
      }
      const body = {
        tot_ml: Number(f.tot_ml),
        day_cutoff: f.day_cutoff,
        block_when_out: !!f.block_when_out,
        // empty = no threshold (0)
        variance_pct_threshold: numOrNull(f.variance_pct_threshold) ?? 0,
        variance_amount_threshold: numOrNull(f.variance_amount_threshold) ?? 0,
        comp_allowance_per_shift: numOrNull(f.comp_allowance_per_shift) ?? 0,
        pour_cost_targets: targets,
        night_report: { enabled: !!f.night_report.enabled, send_at: f.night_report.send_at || '07:00' },
        default_bar_id: f.default_bar_id || '',
        main_store_id: f.main_store_id || ''
      }
      this.saving = true
      try {
        const s = await barApi.saveSettings(body)
        if (s && typeof s === 'object') bar.settings = { ...bar.settings, ...s }
        else await loadBar(true)
        this.resetForm()
        toast.success('Bar settings saved')
        this.$emit('changed')
      } catch (e) {
        this.formError = apiErrorMessage(e, 'Could not save the settings')
      } finally {
        this.saving = false
      }
    },
    async quickLocations() {
      this.busy = true
      try {
        await barApi.createLocation({ name: 'Main store', type: 'store', is_main_store: true })
        await barApi.createLocation({ name: 'Main bar', type: 'bar', is_default_bar: true })
        await loadBar(true)
        this.resetForm()
        toast.success('Main store and Main bar added')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not add the locations'))
      } finally {
        this.busy = false
      }
    },
    async onLocSaved() {
      this.locModal = null
      await loadBar(true)
      this.resetForm()
      this.$emit('changed')
    },
    async removeLocation(l) {
      const ok = await confirmDialog({ title: `Delete ${l.name}?`, message: 'Locations with stock or history cannot be deleted — move the stock out first.', confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await barApi.deleteLocation(l.id)
        toast.success(`${l.name} deleted`)
        await loadBar(true)
        this.resetForm()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the location'))
      }
    },
    async loadTerminals() {
      this.termError = ''
      try {
        const list = await barApi.terminals()
        this.terminals = list.map((t) => ({ terminal_id: t.terminal_id, location_id: t.location_id || '' }))
      } catch (e) {
        this.termError = apiErrorMessage(e, 'Could not load the tills')
      }
    },
    async saveTerminals() {
      const rows = this.terminals.filter((t) => t.terminal_id)
      const ids = rows.map((t) => t.terminal_id.toLowerCase())
      if (new Set(ids).size !== ids.length) {
        toast.error('Each till ID can only be listed once')
        return
      }
      this.termBusy = true
      try {
        await barApi.saveTerminals(rows.map((t) => ({ terminal_id: t.terminal_id, location_id: t.location_id || null })))
        toast.success('Tills saved')
        await this.loadTerminals()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the tills'))
      } finally {
        this.termBusy = false
      }
    }
  }
}
</script>

<style scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.blk {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--surface);
}
.blk__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.blk__head > div {
  flex: 1 1 280px;
  min-width: 0;
}
.blk h3 {
  font-size: 15px;
  margin: 0 0 3px;
}
.blk__head p {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}
.blk__foot {
  display: flex;
  justify-content: flex-end;
}
.locs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}
.loc {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  min-width: 0;
}
.loc__icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.loc__icon.t-store {
  background: var(--info-soft);
  color: var(--info);
}
.loc__icon.t-kitchen,
.loc__icon.t-event {
  background: var(--warning-soft);
  color: var(--warning);
}
.loc__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.loc__main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.loc__main small {
  color: var(--text-3);
  font-size: 12px;
}
.tag {
  color: var(--accent);
  font-weight: 600;
}
.loc__actions {
  display: flex;
  gap: 2px;
}
.terms {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 640px;
}
.term {
  display: grid;
  grid-template-columns: 1fr 1.2fr auto;
  gap: 8px;
  align-items: center;
}
.terms__foot {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px 16px;
}
.switches {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.switches .ui-hint {
  margin: 0 0 6px 46px;
}
.inline {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-left: 46px;
}
.inline .ui-field {
  width: 140px;
}
.inline .ui-hint {
  margin: 0 0 8px;
  flex: 1 1 240px;
}
.sub {
  font-size: 14px;
  margin: 8px 0 0;
}
.targets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px 14px;
}
.targets .ui-label i {
  color: var(--text-3);
  width: 16px;
}
.pct {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pct span {
  color: var(--text-3);
}
@media (max-width: 640px) {
  .blk {
    padding: 12px;
  }
  .switches .ui-hint,
  .inline {
    margin-left: 0;
  }
  .term {
    grid-template-columns: 1fr 1fr auto;
  }
}
</style>
