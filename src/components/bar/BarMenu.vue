<template>
  <div class="mn" data-testid="bar-menu">
    <div class="toolbar">
      <div class="ui-input-group search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="q" class="ui-input" type="search" placeholder="Search menu items" aria-label="Search menu items" data-testid="menu-search" />
      </div>
      <div class="chips" role="tablist" aria-label="Kind">
        <button v-for="k in kinds" :key="k.key" type="button" class="chip" :class="{ 'is-active': kind === k.key }" role="tab" :aria-selected="kind === k.key" @click="kind = k.key">{{ k.label }} <span>{{ k.n }}</span></button>
      </div>
      <label v-if="perm.approve && overN" class="ui-switch"><input v-model="overOnly" type="checkbox" data-testid="menu-over" /><span>Over target ({{ overN }})</span></label>
      <button v-if="perm.edit" type="button" class="ui-btn ui-btn--primary ui-btn--sm end" data-testid="menu-new" @click="edit = { recipe: null }"><i class="fa-solid fa-plus"></i> New menu item</button>
    </div>

    <div v-if="perm.approve && list.length" class="summary">
      <span><strong>{{ list.length }}</strong> menu items</span>
      <span v-if="avgPour !== null">average pour cost <strong>{{ fmtNum(avgPour, 1) }}%</strong></span>
      <span v-if="overN" class="over"><i class="fa-solid fa-flag"></i> <strong>{{ overN }}</strong> over their category target</span>
      <span v-else-if="!hasTargets" class="muted">No pour-cost targets set — add them in Setup to flag expensive pours.</span>
    </div>
    <div v-if="perm.edit && noPrice" class="ui-alert ui-alert--warning" data-testid="menu-noprice">
      <i class="fa-solid fa-tag"></i>
      <span>{{ noPrice }} menu item{{ noPrice === 1 ? ' has' : 's have' }} no selling price yet — open {{ noPrice === 1 ? 'it' : 'each' }} to set the price before it’s sold on the POS.</span>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="loading && !list.length" class="sk"><div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 48px"></div></div>
    <div v-else-if="!list.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-whiskey-glass"></i></div>
      <h3>No menu items yet</h3>
      <p>Menu items are what the POS sells — a tot, a bottle, a beer, a cocktail — each with a recipe that takes stock from the bar. Make tots &amp; bottles from a spirit on the Stock tab, or build a cocktail here.</p>
      <div class="empty-actions">
        <button v-if="perm.edit" type="button" class="ui-btn ui-btn--primary" @click="edit = { recipe: null }"><i class="fa-solid fa-plus"></i> New menu item</button>
        <button type="button" class="ui-btn" @click="$emit('go', 'stock')"><i class="fa-solid fa-bottle-droplet"></i> Go to stock items</button>
      </div>
    </div>
    <div v-else-if="!shown.length" class="ui-empty small"><p>Nothing matches.</p></div>
    <div v-else class="ui-table-wrap">
      <table class="ui-table tbl">
        <thead>
          <tr>
            <th>Menu item</th>
            <th class="hide-sm">Recipe</th>
            <th class="num">Price</th>
            <th v-if="perm.approve" class="num">Cost</th>
            <th v-if="perm.approve" class="num">Pour cost</th>
            <th v-if="perm.approve" class="num hide-sm">Margin</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.pos_product_id" :class="{ 'is-clickable': perm.edit, off: r.active === false }" :data-recipe="r.name" @click="perm.edit && (edit = { recipe: r })">
            <td>
              <div class="nm">
                <strong>{{ r.name }}</strong>
                <small><span class="kind" :class="'k-' + r.kind">{{ kindLabel(r.kind) }}</span><span v-if="!(Number(r.price) > 0)" class="ui-badge ui-badge--warning noprice">No price</span><span class="show-sm"> · {{ linesText(r) }}</span></small>
              </div>
            </td>
            <td class="hide-sm lines">{{ linesText(r) }}</td>
            <td class="num">{{ money(r.price) }}</td>
            <td v-if="perm.approve" class="num">{{ has(r.cost) ? money(r.cost) : '—' }}</td>
            <td v-if="perm.approve" class="num" :class="{ over: isOver(r) }" :data-pour="r.pour_cost_pct">
              <template v-if="r.pour_cost_pct !== null && r.pour_cost_pct !== undefined">
                <i v-if="isOver(r)" class="fa-solid fa-flag" :title="`Over the ${fmtNum(r.pour_cost_target, 1)}% target for ${categoryLabel(r.category)}`"></i>
                {{ fmtNum(r.pour_cost_pct, 1) }}%
                <small v-if="has(r.pour_cost_target)" class="tgt">target {{ fmtNum(r.pour_cost_target, 1) }}%</small>
              </template>
              <template v-else>—</template>
            </td>
            <td v-if="perm.approve" class="num hide-sm">{{ has(r.margin) ? money(r.margin) : '—' }}<small v-if="r.margin_pct !== null && r.margin_pct !== undefined" class="tgt">{{ fmtNum(r.margin_pct, 1) }}%</small></td>
          </tr>
        </tbody>
      </table>
      <p v-if="perm.approve" class="foot-note">Cost at average cost of the stock used. Pour cost = cost ÷ price{{ taxNote }}.</p>
    </div>

    <RecipeModal v-if="edit" :recipe="edit.recipe" :perm="perm" @close="edit = null" @saved="onSaved" />
  </div>
</template>

<script>
import { bar, money, has } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { fmtNum, categoryLabel } from '@/utils/barUnits'
import RecipeModal from './RecipeModal.vue'

const KINDS = { tot: 'Tot', bottle: 'Bottle', self: 'Sold as is', custom: 'Mixed / cocktail' }

export default {
  name: 'BarMenu',
  components: { RecipeModal },
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 }
  },
  emits: ['changed', 'go'],
  data() {
    return { list: [], loading: false, error: '', q: '', kind: '', overOnly: false, edit: null }
  },
  computed: {
    kinds() {
      const n = (k) => this.list.filter((r) => (r.kind || 'custom') === k).length
      return [{ key: '', label: 'All', n: this.list.length }, ...Object.entries(KINDS).map(([key, label]) => ({ key, label, n: n(key) })).filter((k) => k.n)]
    },
    shown() {
      const q = this.q.trim().toLowerCase()
      return this.list.filter((r) => {
        if (this.kind && (r.kind || 'custom') !== this.kind) return false
        if (this.overOnly && !this.isOver(r)) return false
        return !q || String(r.name).toLowerCase().includes(q) || (r.lines || []).some((l) => String(l.name || '').toLowerCase().includes(q))
      })
    },
    noPrice() {
      return this.list.filter((r) => r.active !== false && !(Number(r.price) > 0) && (r.lines || []).length).length
    },
    overN() {
      return this.list.filter((r) => this.isOver(r)).length
    },
    avgPour() {
      const xs = this.list.filter((r) => typeof r.pour_cost_pct === 'number')
      if (!xs.length) return null
      return xs.reduce((s, r) => s + r.pour_cost_pct, 0) / xs.length
    },
    hasTargets() {
      return Object.values(bar.settings?.pour_cost_targets || {}).some((v) => v !== null && v !== undefined)
    },
    taxNote() {
      const r = this.list.find((x) => x.tax_rate)
      return r && r.prices_include_tax ? ` before ${fmtNum(r.tax_rate, 1)}% tax` : ''
    }
  },
  watch: {
    version() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    money,
    has,
    fmtNum,
    categoryLabel,
    kindLabel(k) {
      return KINDS[k || 'custom'] || k
    },
    isOver(r) {
      return has(r.pour_cost_target) && typeof r.pour_cost_pct === 'number' && r.pour_cost_pct > Number(r.pour_cost_target)
    },
    linesText(r) {
      return (r.lines || []).map((l) => `${l.qty_text || l.qty} ${l.name || ''}`.trim()).join(' + ') || 'no stock lines'
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.list = await barApi.recipes()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the menu')
      } finally {
        this.loading = false
      }
    },
    onSaved() {
      this.edit = null
      this.load()
      this.$emit('changed')
    }
  }
}
</script>

<style scoped>
.mn {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.search {
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 340px;
}
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  border-radius: 999px;
  padding: 5px 11px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.chip span {
  color: var(--text-3);
}
.chip.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.end {
  margin-left: auto;
}
.summary {
  display: flex;
  gap: 6px 18px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-2);
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.summary .over {
  color: var(--danger);
}
.muted {
  color: var(--text-3);
}
.sk {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
}
.tbl td,
.tbl th {
  font-variant-numeric: tabular-nums;
}
.nm {
  display: flex;
  flex-direction: column;
}
.nm small {
  font-size: 12px;
  color: var(--text-3);
}
.kind {
  font-weight: 600;
}
.noprice {
  margin-left: 6px;
  font-size: 11px;
}
.k-tot {
  color: var(--accent);
}
.k-bottle {
  color: var(--info);
}
.k-custom {
  color: var(--warning);
}
.lines {
  color: var(--text-2);
  font-size: 13px;
  max-width: 420px;
}
td.over {
  color: var(--danger);
  font-weight: 700;
}
.tgt {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 400;
}
tr.off td {
  opacity: 0.55;
}
.foot-note {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--text-3);
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
  .search {
    max-width: none;
  }
  .end {
    margin-left: 0;
  }
}
</style>
