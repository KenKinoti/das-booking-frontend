<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-labelledby="tr-title" data-testid="transfer-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <h2 id="tr-title">{{ mode === 'direct' ? 'Move stock' : 'Request stock' }}</h2>
          <p class="mlead">{{ mode === 'direct' ? 'Stock leaves one location and arrives at the other straight away.' : 'The store keeper issues it, then the bar confirms what arrived.' }}</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <div v-if="perm.edit" class="seg" role="radiogroup" aria-label="Transfer type">
          <button type="button" :class="{ 'is-active': mode === 'request' }" role="radio" :aria-checked="mode === 'request'" data-testid="tr-mode-request" @click="mode = 'request'"><i class="fa-regular fa-hand"></i> Request → issue → receive</button>
          <button type="button" :class="{ 'is-active': mode === 'direct' }" role="radio" :aria-checked="mode === 'direct'" data-testid="tr-mode-direct" @click="mode = 'direct'"><i class="fa-solid fa-bolt"></i> Direct move</button>
        </div>
        <div class="route">
          <label class="ui-field">
            <span class="ui-label">From</span>
            <select v-model="from" class="ui-select" required data-testid="tr-from">
              <option v-for="l in bar.locations" :key="l.id" :value="l.id" :disabled="l.id === to">{{ l.name }}</option>
            </select>
          </label>
          <i class="fa-solid fa-arrow-right route__arrow"></i>
          <label class="ui-field">
            <span class="ui-label">To</span>
            <select v-model="to" class="ui-select" required data-testid="tr-to">
              <option v-for="l in bar.locations" :key="l.id" :value="l.id" :disabled="l.id === from">{{ l.name }}</option>
            </select>
          </label>
        </div>

        <div class="lines-head">
          <span class="ui-label">Items</span>
          <button type="button" class="ui-btn ui-btn--sm" :disabled="!to || suggesting" data-testid="tr-topup" @click="topUp"><i :class="suggesting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-arrow-up-wide-short'"></i> Top up to par</button>
        </div>
        <div v-if="loadErr" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadErr }}</span></div>
        <div v-if="lines.length" class="lines">
          <div v-for="(l, i) in lines" :key="l.product_id" class="line" :data-line="l.item?.name">
            <div class="line__name">
              <strong>{{ l.item?.name || 'Item' }}</strong>
              <small v-if="fromStock(l) !== null">{{ locationName(from) }} has {{ qtyText(fromStock(l), l.item, { packs: true }) }}</small>
              <small v-if="l.suggested">par top-up</small>
            </div>
            <QtyInput v-model:qty="l.qty" v-model:unit="l.unit" :item="l.item" :tot-ml="totMl" :allowed="allowedUnits(l.item)" :label="`${l.item?.name} quantity`" :testid="'tr-line-' + i" />
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Remove ${l.item?.name}`" @click="lines.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
        <ItemPicker :items="items" :exclude="lines.map((l) => l.product_id)" :show-stock="true" placeholder="Add an item — search or scan" testid="tr-pick" @pick="addLine" />
        <label class="ui-field">
          <span class="ui-label">Note</span>
          <input v-model.trim="note" class="ui-input" maxlength="300" placeholder="Optional — e.g. for the VIP booking at 11" />
        </label>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy || !lines.length" data-testid="tr-save">{{ busy ? 'Saving…' : mode === 'direct' ? 'Move stock' : 'Send request' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { bar, locationName, orgTotMl, mainStoreId, defaultBarId, myLocation, setMyLocation } from './barContext'
import { barApi, arr } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { qtyText, toBase, isMl } from '@/utils/barUnits'
import ItemPicker from './ItemPicker.vue'
import QtyInput from './QtyInput.vue'

export default {
  name: 'TransferModal',
  components: { ItemPicker, QtyInput },
  props: {
    preset: { type: Object, default: () => ({}) },
    perm: { type: Object, required: true }
  },
  emits: ['close', 'saved'],
  data() {
    const p = this.preset || {}
    const mine = myLocation()
    const store = mainStoreId()
    let to = p.to_location_id || (mine && mine !== store ? mine : '') || defaultBarId() || bar.locations.find((l) => l.id !== store)?.id || ''
    let from = p.from_location_id || store || bar.locations.find((l) => l.id !== to)?.id || ''
    if (from === to) to = bar.locations.find((l) => l.id !== from)?.id || ''
    return {
      bar,
      mode: p.mode || 'request',
      from,
      to,
      lines: [],
      presetLines: p.lines || [],
      items: [],
      fromItems: [],
      note: p.note || '',
      busy: false,
      error: '',
      loadErr: '',
      suggesting: false
    }
  },
  computed: {
    totMl() {
      return orgTotMl()
    }
  },
  watch: {
    from() {
      this.loadFrom()
    }
  },
  async created() {
    try {
      this.items = (await barApi.items()).filter((it) => it.active !== false)
    } catch (e) {
      this.loadErr = apiErrorMessage(e, 'Could not load the stock items')
    }
    this.loadFrom()
    for (const pl of this.presetLines) {
      const it = this.items.find((x) => x.product_id === pl.product_id)
      if (it) this.addLine(it, pl.qty, pl.unit)
    }
    if (this.preset?.topUp) this.topUp()
  },
  methods: {
    qtyText,
    locationName,
    allowedUnits(it) {
      return isMl(it) ? ['bottle', 'ml'] : ['unit', 'pack']
    },
    async loadFrom() {
      if (!this.from) return
      try {
        this.fromItems = await barApi.items({ location_id: this.from })
      } catch {
        this.fromItems = []
      }
    },
    fromStock(l) {
      const it = this.fromItems.find((x) => x.product_id === l.product_id)
      return it ? Number(it.on_hand) || 0 : null
    },
    addLine(it, qty = 1, unit) {
      if (this.lines.some((l) => l.product_id === it.product_id)) return
      this.lines.push({ product_id: it.product_id, item: it, qty, unit: unit || (isMl(it) ? 'bottle' : 'unit') })
    },
    async topUp() {
      if (!this.to) return
      this.suggesting = true
      try {
        const d = await barApi.suggestTransfer(this.to)
        const rows = arr(d, 'lines', 'items', 'suggestions')
        if (d?.from_location_id && d.from_location_id !== this.to) this.from = d.from_location_id
        let added = 0
        for (const r of rows) {
          const it = this.items.find((x) => x.product_id === r.product_id)
          if (!it) continue
          const units = Number(r.qty_units ?? r.suggest_units ?? r.units ?? r.qty) || 0
          if (!(units > 0)) continue
          const ex = this.lines.find((l) => l.product_id === it.product_id)
          if (ex) {
            ex.qty = units
            ex.unit = isMl(it) ? 'bottle' : 'unit'
          } else {
            this.lines.push({ product_id: it.product_id, item: it, qty: units, unit: isMl(it) ? 'bottle' : 'unit', suggested: true })
          }
          added++
        }
        if (!added) toast.info(`${locationName(this.to)} is at or above par for everything with a par level`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not work out the top-up'))
      } finally {
        this.suggesting = false
      }
    },
    async save() {
      this.error = ''
      if (!this.from || !this.to || this.from === this.to) return (this.error = 'Choose two different locations')
      const lines = this.lines.map((l) => ({ product_id: l.product_id, qty: Number(l.qty) || 0, unit: l.unit, base: toBase(l.qty, l.unit, l.item, this.totMl) }))
      if (lines.some((l) => !(l.qty > 0))) return (this.error = 'Every line needs a quantity')
      this.busy = true
      try {
        const t = await barApi.createTransfer({ from_location_id: this.from, to_location_id: this.to, mode: this.mode, note: this.note, lines: lines.map(({ product_id, qty, unit }) => ({ product_id, qty, unit })) })
        if (this.mode === 'request' && !this.perm.edit) setMyLocation(this.to)
        toast.success(this.mode === 'direct' ? `Moved to ${locationName(this.to)}` : `Request ${t?.number || ''} sent to ${locationName(this.from)}`.replace('  ', ' '))
        this.$emit('saved', t)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the transfer')
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
.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.seg button {
  padding: 9px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.seg button.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.route {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: end;
}
.route__arrow {
  color: var(--text-3);
  padding-bottom: 12px;
}
.lines-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(200px, 260px) auto;
  gap: 10px;
  align-items: start;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.line__name {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-top: 6px;
}
.line__name small {
  color: var(--text-3);
  font-size: 12px;
}
@media (max-width: 560px) {
  .line {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .line > .qi {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .seg {
    grid-template-columns: 1fr;
  }
}
</style>
