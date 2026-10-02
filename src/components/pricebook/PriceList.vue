<template>
  <div class="pl" data-testid="price-list">
    <div class="toolbar">
      <div class="ui-input-group search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="q" class="ui-input" placeholder="Search plan, domain ending, supplier…" aria-label="Search prices" data-testid="price-search" />
      </div>
      <select v-model="supplier" class="ui-select narrow" aria-label="Supplier" data-testid="price-supplier">
        <option value="">All suppliers</option>
        <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <select v-model="kind" class="ui-select narrow" aria-label="Kind" data-testid="price-kind">
        <option value="">All kinds</option>
        <option v-for="k in KINDS" :key="k.key" :value="k.key">{{ k.label }}</option>
      </select>
      <label class="ui-switch" :title="`Checked more than ${staleDays} days ago`"><input v-model="staleOnly" type="checkbox" data-testid="price-stale" /> <span>To check<span v-if="staleCount" class="cnt">{{ staleCount }}</span></span></label>
      <label class="ui-switch"><input v-model="showInactive" type="checkbox" /> <span>Inactive</span></label>
      <span class="spacer"></span>
      <span class="muted" data-testid="price-count">{{ shown.length }} of {{ items.length }}</span>
    </div>

    <div v-if="!items.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-tags"></i></div>
      <h3>No prices yet</h3>
      <p>Import your researched price list as a CSV, auto-fill Synergy from your statements, or add prices one by one.</p>
      <div class="ui-actions center">
        <button type="button" class="ui-btn ui-btn--primary" @click="$emit('import')"><i class="fa-solid fa-file-import"></i> Import CSV</button>
        <button type="button" class="ui-btn" @click="$emit('add')"><i class="fa-solid fa-plus"></i> Add a price</button>
      </div>
    </div>
    <div v-else-if="!shown.length" class="ui-empty small">
      <div class="ui-empty__icon"><i class="fa-solid fa-filter"></i></div>
      <h3>No prices match</h3>
      <p>Change the search or the filters.</p>
    </div>
    <div v-else class="ui-table-wrap">
      <table v-table-cards class="ui-table" data-testid="price-table">
        <thead>
          <tr>
            <th>Price for</th>
            <th class="hide-md">Supplier</th>
            <th class="num">Price</th>
            <th class="num hide-sm">Renews at</th>
            <th class="hide-md">Includes</th>
            <th>As of</th>
            <th data-label=""></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in visible" :key="it.id" :class="{ inactive: !it.active }" :data-item="it.id" :data-name="it.name" :data-kind="it.kind" :data-supplier="it.supplier_name" :data-stale="it.stale">
            <td>
              <div class="what">
                <span class="kic" :title="kindOf(it.kind).label"><i :class="kindOf(it.kind).icon"></i></span>
                <div class="min0">
                  <strong>{{ it.tld && isDomainKind(it.kind) ? it.tld : it.name }}</strong>
                  <small>{{ kindOf(it.kind).label }}<span class="show-md"> · {{ it.supplier_name }}</span></small>
                  <span class="badges">
                    <span v-if="it.promo" class="ui-badge ui-badge--warning" title="Introductory price: the first period only">Intro price</span>
                    <span v-if="!it.active" class="ui-badge ui-badge--draft">Inactive</span>
                    <span v-if="it.supplier_type === 'competitor'" class="ui-badge ui-badge--draft">Competitor</span>
                  </span>
                </div>
              </div>
            </td>
            <td class="hide-md supname card-hide">{{ it.supplier_name }}</td>
            <td class="num">
              <template v-if="editing(it, 'price')">
                <input ref="edit" v-model="draft" class="ui-input cell" type="number" min="0" step="any" :aria-label="`Price of ${it.name}`" @keydown.enter.prevent="commit(it, 'price')" @keydown.esc="cancel" @blur="commit(it, 'price')" />
              </template>
              <button v-else type="button" class="cellbtn" :disabled="!canEdit" :title="canEdit ? 'Click to change the price' : ''" data-testid="price-cell" :data-value="it.price" @click="start(it, 'price')">
                {{ cur(it.price, it.currency) }}
              </button>
              <small class="block muted">{{ periodOf(it.period).per }}</small>
              <small v-if="it.prev_price != null" class="block prev" data-testid="prev-price" :title="`Changed ${formatDate(it.price_changed_at)}`">
                <i class="fa-solid" :class="it.price > it.prev_price ? 'fa-arrow-trend-up up' : 'fa-arrow-trend-down down'"></i> was {{ cur(it.prev_price, it.currency) }}
              </small>
            </td>
            <td class="num hide-sm" :class="it.regular_price != null || it.setup_fee > 0 ? 'card-show' : 'card-hide'">
              <template v-if="editing(it, 'regular_price')">
                <input ref="edit" v-model="draft" class="ui-input cell" type="number" min="0" step="any" placeholder="none" :aria-label="`Regular price of ${it.name}`" @keydown.enter.prevent="commit(it, 'regular_price')" @keydown.esc="cancel" @blur="commit(it, 'regular_price')" />
              </template>
              <button v-else type="button" class="cellbtn" :class="{ dim: it.regular_price == null }" :disabled="!canEdit" :title="canEdit ? 'Regular price after an introductory offer' : ''" @click="start(it, 'regular_price')">
                {{ it.regular_price != null ? cur(it.regular_price, it.currency) : 'same' }}
              </button>
              <small v-if="it.setup_fee > 0" class="block muted">+ {{ cur(it.setup_fee, it.currency) }} setup</small>
            </td>
            <td class="hide-md specs" :class="it.kind === 'hosting_plan' ? 'card-show' : 'card-hide'">
              <template v-if="it.kind === 'hosting_plan'">
                <span v-if="it.disk_gb != null"><i class="fa-solid fa-hard-drive"></i> {{ count(it.disk_gb, ' GB') }}</span>
                <span v-if="it.sites != null"><i class="fa-solid fa-window-maximize"></i> {{ count(it.sites) }} site{{ it.sites === 1 ? '' : 's' }}</span>
                <span v-if="it.email_accounts != null" title="Mailboxes included"><i class="fa-solid fa-envelope"></i> {{ count(it.email_accounts) }}</span>
                <span v-if="it.bandwidth"><i class="fa-solid fa-gauge-high"></i> {{ it.bandwidth }}</span>
                <span v-if="it.disk_gb == null && it.sites == null && it.email_accounts == null && !it.bandwidth" class="muted">—</span>
              </template>
              <span v-else class="muted">—</span>
            </td>
            <td class="asof">
              <span>{{ it.as_of ? formatDate(it.as_of) : 'no date' }}</span>
              <button v-if="it.stale && it.active" type="button" class="ui-badge ui-badge--warning check" :disabled="!canEdit" data-testid="check-price"
                :title="canEdit ? 'Still the price? Click to mark it checked today' : 'Older than ' + staleDays + ' days'" @click="markChecked(it)">Check price</button>
              <a v-if="safeUrl(it.source_url)" :href="safeUrl(it.source_url)" target="_blank" rel="noopener noreferrer" class="src" :title="it.source_url" :aria-label="`Source of ${it.name}`"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
            </td>
            <td class="acts">
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Price history" :aria-label="`History of ${it.name}`" data-testid="price-history" @click="$emit('history', it)"><i class="fa-solid fa-clock-rotate-left"></i></button>
              <OverflowMenu v-if="canEdit" :items="menu(it)" :label="`Actions for ${it.name}`" btn-class="ui-btn--ghost ui-btn--sm" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="shown.length > visible.length" class="more">
      <button type="button" class="ui-btn ui-btn--sm" data-testid="price-more" @click="all = true">Show all {{ shown.length }} prices</button>
    </div>
    <p v-if="items.length" class="muted cap">Prices are per billing period in the supplier's own currency. Click a price to change it — the old one is kept in the history. Prices checked more than {{ staleDays }} days ago are flagged.</p>
  </div>
</template>

<script>
import OverflowMenu from '@/components/ui/OverflowMenu.vue'
import { pricebookApi, KINDS, kindOf, periodOf, isDomainKind, cur, count, safeUrl } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate } from '@/utils/format'

export default {
  name: 'PriceList',
  components: { OverflowMenu },
  props: {
    items: { type: Array, default: () => [] },
    suppliers: { type: Array, default: () => [] },
    canEdit: { type: Boolean, default: false },
    staleDays: { type: Number, default: 90 },
    today: { type: String, default: '' },
    filterSupplier: { type: String, default: '' }
  },
  emits: ['changed', 'edit', 'history', 'import', 'add'],
  data() {
    return { q: '', supplier: this.filterSupplier, kind: '', staleOnly: false, showInactive: false, all: false, edit: null, draft: '', saving: false, KINDS }
  },
  computed: {
    staleCount() {
      return this.items.filter((i) => i.stale && i.active).length
    },
    visible() {
      return this.all ? this.shown : this.shown.slice(0, this.PAGE || 30)
    },
    shown() {
      const q = this.q.trim().toLowerCase()
      return this.items.filter((it) => {
        if (!this.showInactive && !it.active) return false
        if (this.supplier && it.supplier_id !== this.supplier) return false
        if (this.kind && it.kind !== this.kind) return false
        if (this.staleOnly && !it.stale) return false
        if (q && !`${it.name} ${it.tld} ${it.supplier_name} ${it.notes} ${kindOf(it.kind).label}`.toLowerCase().includes(q)) return false
        return true
      })
    }
  },
  watch: {
    filterSupplier(v) {
      this.supplier = v
    }
  },
  created() {
    this.PAGE = 30
  },
  methods: {
    cur,
    count,
    safeUrl,
    kindOf,
    periodOf,
    isDomainKind,
    formatDate,
    editing(it, field) {
      return this.edit && this.edit.id === it.id && this.edit.field === field
    },
    start(it, field) {
      if (!this.canEdit) return
      this.edit = { id: it.id, field }
      this.draft = it[field] ?? ''
      this.$nextTick(() => {
        const el = Array.isArray(this.$refs.edit) ? this.$refs.edit[0] : this.$refs.edit
        if (el) {
          el.focus()
          el.select?.()
        }
      })
    },
    cancel() {
      this.edit = null
    },
    async commit(it, field) {
      if (!this.editing(it, field) || this.saving) return
      const raw = String(this.draft).trim()
      const cur0 = it[field]
      let value = raw === '' ? null : Number(raw)
      if (field === 'price' && (value === null || Number.isNaN(value) || value < 0)) {
        this.edit = null
        if (raw !== '') toast.error('Enter a price of zero or more')
        return
      }
      if (value !== null && (Number.isNaN(value) || value < 0)) {
        this.edit = null
        toast.error('Enter a price of zero or more')
        return
      }
      if (value === 0 && field === 'regular_price') value = null
      if ((cur0 ?? null) === value) {
        this.edit = null
        return
      }
      this.saving = true
      try {
        await pricebookApi.updateItem(it.id, { [field]: value })
        toast.success(field === 'price' ? `${it.name}: price updated — the old price is in the history` : `${it.name} updated`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the price'))
      } finally {
        this.saving = false
        this.edit = null
      }
    },
    async markChecked(it) {
      if (!this.canEdit) return
      try {
        await pricebookApi.updateItem(it.id, { as_of: this.today || new Date().toISOString().slice(0, 10) })
        toast.success(`${it.name}: marked as checked today`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the date'))
      }
    },
    menu(it) {
      return [
        { label: 'Edit', icon: 'fa-regular fa-pen-to-square', onClick: () => this.$emit('edit', it) },
        { label: 'Checked today', icon: 'fa-regular fa-calendar-check', onClick: () => this.markChecked(it) },
        { label: it.active ? 'Deactivate' : 'Activate', icon: it.active ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye', onClick: () => this.toggle(it) },
        { divider: true },
        { label: 'Delete', icon: 'fa-regular fa-trash-can', danger: true, onClick: () => this.remove(it) }
      ]
    },
    async toggle(it) {
      try {
        await pricebookApi.updateItem(it.id, { active: !it.active })
        toast.info(it.active ? `${it.name} is no longer used in comparisons` : `${it.name} is active again`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the price'))
      }
    },
    async remove(it) {
      const ok = await confirmDialog({ title: 'Delete this price?', message: `${it.supplier_name} · ${it.name} and its history will be removed.`, confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await pricebookApi.deleteItem(it.id)
        toast.success('Price deleted')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the price'))
      }
    }
  }
}
</script>

<style scoped>
.pl {
  min-width: 0;
}
.toolbar {
  display: flex;
  gap: 8px 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.toolbar .search {
  min-width: 200px;
  flex: 1;
  max-width: 340px;
}
.narrow {
  width: auto;
  min-width: 140px;
}
.spacer {
  flex: 1;
}
.cnt {
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 11.5px;
  font-weight: 600;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.cap {
  margin: 10px 0 0;
}
.center {
  justify-content: center;
  margin-top: 12px;
}
.what {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 150px;
}
.kic {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-subtle);
  color: var(--text-3);
  font-size: 12px;
  flex-shrink: 0;
}
.min0 {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.min0 strong {
  overflow-wrap: anywhere;
}
.min0 small {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 400;
}
.more {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
.badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.badges .ui-badge {
  font-size: 10.5px;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.block {
  display: block;
}
.cellbtn {
  background: none;
  border: 1px dashed transparent;
  border-radius: 6px;
  padding: 2px 6px;
  margin: -2px -6px;
  font: inherit;
  color: inherit;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.cellbtn:hover:not(:disabled) {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}
.cellbtn:disabled {
  cursor: default;
}
.cellbtn.dim {
  color: var(--text-3);
}
.cell {
  width: 110px;
  padding: 4px 6px;
  min-height: 0;
  text-align: right;
}
.prev {
  color: var(--text-3);
  font-size: 11.5px;
}
.prev .up {
  color: var(--warning);
}
.prev .down {
  color: var(--success);
}
.supname {
  white-space: nowrap;
}
.specs {
  font-size: 12.5px;
  color: var(--text-2);
}
.specs span {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  margin-right: 10px;
  white-space: nowrap;
}
.specs i {
  color: var(--text-3);
  font-size: 11px;
}
.asof {
  white-space: nowrap;
  font-size: 13px;
}
.asof .check {
  margin-left: 6px;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}
.asof .check:disabled {
  cursor: default;
}
.src {
  margin-left: 6px;
  color: var(--text-3);
  font-size: 11px;
}
.acts {
  text-align: right;
  white-space: nowrap;
}
tr.inactive td {
  opacity: 0.6;
}
.show-md {
  display: none;
}
@media (max-width: 900px) {
  .hide-md {
    display: none;
  }
  .show-md {
    display: inline;
  }
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .toolbar .search {
    max-width: none;
    flex-basis: 100%;
  }
  .narrow {
    flex: 1;
    min-width: 0;
  }
  .what {
    min-width: 0;
  }
  .asof {
    white-space: normal;
  }
}
</style>
