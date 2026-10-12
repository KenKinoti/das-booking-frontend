<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-labelledby="starter-title" data-testid="starter-modal">
      <div class="ui-modal__head">
        <div>
          <h2 id="starter-title">Starter list</h2>
          <p class="mlead">Common drinks and bar supplies — tick what you carry. Items you already have are skipped. No prices are set; costs come from your deliveries.</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-else-if="!catalog" class="ui-skeleton" style="height: 260px"></div>
        <template v-else>
          <div class="ui-input-group">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Filter the list" aria-label="Filter the starter list" />
          </div>
          <div class="groups">
            <section v-for="g in groups" :key="g.key" class="grp">
              <header>
                <strong><i :class="g.icon"></i> {{ g.label }}</strong>
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="toggleGroup(g)">{{ g.items.every((x) => picked.includes(x.key)) ? 'None' : 'All' }}</button>
              </header>
              <label v-for="it in g.items" :key="it.key" class="opt" :data-key="it.key">
                <input v-model="picked" type="checkbox" :value="it.key" />
                <span>{{ it.name }}<small>{{ size(it) }}</small></span>
              </label>
            </section>
          </div>
          <label class="ui-switch"><input v-model="menu" type="checkbox" data-testid="starter-menu" /><span>Also create POS menu items (a tot and a bottle for spirits, the drink itself for beers &amp; sodas)</span></label>
        </template>
      </div>
      <div class="ui-modal__foot">
        <span class="picked">{{ picked.length }} selected</span>
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="button" class="ui-btn ui-btn--primary" :disabled="busy || !picked.length" data-testid="starter-add" @click="add">{{ busy ? 'Adding…' : `Add ${picked.length || ''} item${picked.length === 1 ? '' : 's'}` }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { bar } from './barContext'
import { barApi, arr } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { CATEGORIES, mlText } from '@/utils/barUnits'

export default {
  name: 'StarterModal',
  emits: ['close', 'added'],
  data() {
    return { catalog: null, error: '', q: '', picked: [], menu: true, busy: false }
  },
  computed: {
    groups() {
      const q = this.q.trim().toLowerCase()
      const list = (this.catalog || []).filter((x) => !q || String(x.name).toLowerCase().includes(q))
      return CATEGORIES.map((c) => ({ ...c, items: list.filter((x) => (x.category || 'other') === c.key) })).filter((g) => g.items.length)
    }
  },
  async created() {
    try {
      const d = await barApi.catalog()
      this.catalog = arr(d, 'catalog', 'items')
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the starter list')
    }
  },
  methods: {
    size(it) {
      const pack = Number(it.pack_size) > 1 ? ` · ${it.pack_size} per ${it.pack_label || 'case'}` : ''
      if ((it.base_unit || 'ml') === 'ml') return ` · ${mlText(it.unit_size)} ${it.unit_label || 'bottle'}${pack}`
      return ` · ${it.unit_label || 'unit'}${pack}`
    },
    toggleGroup(g) {
      const keys = g.items.map((x) => x.key)
      if (keys.every((k) => this.picked.includes(k))) this.picked = this.picked.filter((k) => !keys.includes(k))
      else this.picked = [...new Set([...this.picked, ...keys])]
    },
    async add() {
      this.busy = true
      try {
        const s = bar.settings || {}
        const r = await barApi.setup({ locations: [], tot_ml: s.tot_ml || 25, day_cutoff: s.day_cutoff || '06:00', catalog_keys: this.picked, make_menu_items: this.menu })
        const n = r?.items_created ?? r?.created?.items ?? r?.summary?.items_created
        toast.success(n !== undefined ? `${n} item${n === 1 ? '' : 's'} added` : 'Starter items added')
        this.$emit('added')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not add the items'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.mlead {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-3);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 4px;
}
.grp {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.grp header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.grp header strong {
  font-size: 13.5px;
}
.grp header i {
  color: var(--text-3);
  width: 16px;
}
.opt {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13.5px;
  padding: 3px 0;
  cursor: pointer;
}
.opt input {
  margin-top: 3px;
}
.opt small {
  color: var(--text-3);
  font-size: 12px;
}
.picked {
  margin-right: auto;
  align-self: center;
  color: var(--text-3);
  font-size: 13px;
}
</style>
