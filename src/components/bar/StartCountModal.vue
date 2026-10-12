<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" aria-labelledby="sc-title" data-testid="start-count-modal" @submit.prevent="start">
      <div class="ui-modal__head">
        <h2 id="sc-title">Start a stock count</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <label class="ui-field">
          <span class="ui-label">Location</span>
          <select v-model="loc" class="ui-select" required data-testid="sc-loc">
            <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </label>
        <div v-if="openCount" class="ui-alert ui-alert--warning" data-testid="sc-open">
          <i class="fa-solid fa-circle-info"></i>
          <span>
            {{ openCount.number }} is still {{ openCount.status === 'submitted' ? 'waiting for review' : 'open' }} at this location — one count at a time.
            <router-link v-if="openCount.status !== 'submitted'" :to="`/bar-stock/count/${openCount.id}`" @click="$emit('close')">Continue it</router-link>
          </span>
        </div>
        <div class="ui-field">
          <span class="ui-label">Type</span>
          <div class="types" role="radiogroup" aria-label="Count type">
            <button v-for="t in COUNT_TYPES" :key="t.key" type="button" class="type" :class="{ 'is-active': type === t.key }" role="radio" :aria-checked="type === t.key" :data-type="t.key" @click="type = t.key">
              <strong>{{ t.label }}</strong><small>{{ t.hint }}</small>
            </button>
          </div>
        </div>
        <div v-if="type === 'spot'" class="ui-field">
          <span class="ui-label">Items to count</span>
          <div v-if="picked.length" class="spot">
            <span v-for="it in picked" :key="it.product_id" class="pill">{{ it.name }} <button type="button" :aria-label="`Remove ${it.name}`" @click="unpick(it)"><i class="fa-solid fa-xmark"></i></button></span>
          </div>
          <ItemPicker :items="items" :exclude="picked.map((x) => x.product_id)" placeholder="Add items — e.g. your top 10 spirits" testid="sc-pick" @pick="picked.push($event)" />
          <button v-if="items.length" type="button" class="ui-btn ui-btn--ghost ui-btn--sm quick" @click="pickTopSpirits"><i class="fa-solid fa-whiskey-glass"></i> All spirits here</button>
        </div>
        <label class="ui-switch"><input v-model="blind" type="checkbox" data-testid="sc-blind" /><span>Blind count — counters don’t see what the system expects</span></label>
        <div v-if="staff.length" class="ui-field">
          <span class="ui-label">Staff on shift</span>
          <span class="ui-hint">Losses in this count’s period are shared equally between them in the shift report.</span>
          <div class="staff">
            <label v-for="u in staff" :key="u.id" class="chk"><input v-model="staffIds" type="checkbox" :value="u.id" /> {{ u.name }}<small v-if="u.id === meId"> (you)</small></label>
          </div>
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy || !!openCount || (type === 'spot' && !picked.length)" data-testid="sc-start">{{ busy ? 'Starting…' : 'Start counting' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { bar, defaultBarId, myLocation, setMyLocation } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { usersService } from '@/services/users'
import { useAuthStore } from '@/stores/auth'
import { COUNT_TYPES } from '@/utils/barUnits'
import ItemPicker from './ItemPicker.vue'

export default {
  name: 'StartCountModal',
  components: { ItemPicker },
  emits: ['close', 'started'],
  data() {
    const mine = myLocation()
    const h = new Date().getHours()
    return {
      bar,
      COUNT_TYPES,
      loc: (bar.locations.some((l) => l.id === mine) ? mine : '') || defaultBarId() || bar.locations[0]?.id || '',
      type: h >= 2 && h < 12 ? 'closing' : 'full',
      blind: false,
      items: [],
      picked: [],
      staff: [],
      staffIds: [],
      openCount: null,
      busy: false,
      error: ''
    }
  },
  computed: {
    meId() {
      return useAuthStore().user?.id || ''
    }
  },
  watch: {
    loc() {
      this.picked = []
      this.loadItems()
      this.checkOpen()
    }
  },
  async created() {
    this.loadItems()
    this.checkOpen()
    const me = useAuthStore().user || {}
    const meRow = me.id ? { id: me.id, name: `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.email || 'Me' } : null
    try {
      const r = await usersService.list({ limit: 200 })
      this.staff = (r.users || []).filter((u) => u.is_active !== false).map((u) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email }))
    } catch {
      this.staff = []
    }
    if (meRow && !this.staff.some((u) => u.id === meRow.id)) this.staff.unshift(meRow)
    if (meRow) this.staffIds = [meRow.id]
  },
  methods: {
    async loadItems() {
      try {
        this.items = (await barApi.items({ location_id: this.loc })).filter((it) => it.active !== false && it.track !== false)
      } catch {
        this.items = []
      }
    },
    async checkOpen() {
      try {
        const list = await barApi.counts({ location_id: this.loc, status: 'open' })
        this.openCount = list[0] || null
      } catch {
        this.openCount = null
      }
    },
    unpick(it) {
      this.picked = this.picked.filter((x) => x.product_id !== it.product_id)
    },
    pickTopSpirits() {
      const have = new Set(this.picked.map((x) => x.product_id))
      for (const it of this.items) if (it.category === 'spirits' && !have.has(it.product_id)) this.picked.push(it)
    },
    async start() {
      this.error = ''
      this.busy = true
      try {
        const body = { location_id: this.loc, type: this.type, blind: this.blind, staff_ids: this.staffIds }
        if (this.type === 'spot') body.product_ids = this.picked.map((x) => x.product_id)
        const c = await barApi.startCount(body)
        setMyLocation(this.loc)
        this.$emit('started', c?.count || c)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not start the count')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.types {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.type {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.type small {
  color: var(--text-3);
  font-size: 12px;
}
.type.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.type.is-active strong {
  color: var(--accent);
}
.spot {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 4px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 600;
}
.pill button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0 4px;
}
.quick {
  align-self: flex-start;
  margin-top: 4px;
}
.staff {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 4px 12px;
  max-height: 160px;
  overflow-y: auto;
}
.chk {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13.5px;
}
.chk small {
  color: var(--text-3);
}
</style>
