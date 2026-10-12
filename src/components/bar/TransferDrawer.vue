<template>
  <BarDrawer :title="t ? `${t.from_location || locationName(t.from_location_id)} → ${t.to_location || locationName(t.to_location_id)}` : 'Loading…'" eyebrow="Transfer" width="720px" testid="transfer-drawer" @close="$emit('close')">
    <template v-if="t" #sub>
      <span class="ui-badge" :class="meta.badge">{{ meta.label }}</span>
      <span>{{ t.number }}</span>
      <span v-if="t.mode === 'direct'">direct move</span>
      <span v-if="t.has_discrepancy" class="ui-badge ui-badge--danger">Difference on arrival</span>
    </template>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    <div v-else-if="!t" class="ui-skeleton" style="height: 280px"></div>
    <template v-else>
      <ol class="steps">
        <li class="done"><i class="fa-regular fa-hand"></i><span><strong>{{ t.mode === 'direct' ? 'Moved' : 'Requested' }}</strong><small>{{ formatDateTime(t.created_at) }}<template v-if="t.requested_by_name"> · {{ t.requested_by_name }}</template></small></span></li>
        <li v-if="t.mode !== 'direct'" :class="{ done: !!t.issued_at, now: t.status === 'requested' }"><i class="fa-solid fa-dolly"></i><span><strong>Issued</strong><small>{{ t.issued_at ? formatDateTime(t.issued_at) + (t.issued_by_name ? ' · ' + t.issued_by_name : '') : 'by the store keeper' }}</small></span></li>
        <li v-if="t.mode !== 'direct'" :class="{ done: !!t.received_at, now: t.status === 'issued' }"><i class="fa-solid fa-box-open"></i><span><strong>Received</strong><small>{{ t.received_at ? formatDateTime(t.received_at) + (t.received_by_name ? ' · ' + t.received_by_name : '') : 'by the bar' }}</small></span></li>
      </ol>
      <p v-if="t.note" class="note"><i class="fa-regular fa-note-sticky"></i> {{ t.note }}</p>

      <div v-if="mode" class="ui-alert">
        <i class="fa-solid fa-circle-info"></i>
        <span v-if="mode === 'issue'">Check the quantities you are sending to {{ t.to_location }}. Stock leaves {{ t.from_location }} when you issue.</span>
        <span v-else>Count what arrived. Anything less than was issued is recorded as a difference on this transfer.</span>
      </div>

      <div class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="num" :class="{ 'hide-sm': mode }">Requested</th>
              <th class="num" :class="{ 'hide-sm': mode === 'receive' }">{{ mode === 'issue' ? 'Issue' : 'Issued' }}</th>
              <th v-if="t.mode !== 'direct'" class="num" :class="{ 'hide-sm': mode === 'issue' }">Received</th>
              <th v-if="showDiff" class="num">Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in t.lines" :key="l.product_id" :data-line="l.name">
              <td>
                <strong>{{ l.name }}</strong>
                <small v-if="mode === 'issue' && stockAt[l.product_id] !== undefined" class="sub">{{ t.from_location }} has {{ stockAt[l.product_id] }}</small>
                <small v-if="mode" class="sub show-sm">requested {{ l.requested_text || '—' }}<template v-if="mode === 'receive'"> · issued {{ l.issued_text || '—' }}</template></small>
              </td>
              <td class="num" :class="{ 'hide-sm': mode }">{{ l.requested_text || '—' }}</td>
              <td class="num" :class="{ 'hide-sm': mode === 'receive' }">
                <div v-if="mode === 'issue'" class="qcell">
                  <input v-model="qty[l.product_id]" class="ui-input" type="number" min="0" step="any" inputmode="decimal" :aria-label="`Issue ${l.name}`" :data-testid="'issue-qty-' + i" />
                  <span>{{ unitName(l) }}</span>
                </div>
                <template v-else>{{ l.issued_text || '—' }}</template>
              </td>
              <td v-if="t.mode !== 'direct'" class="num" :class="{ 'hide-sm': mode === 'issue' }">
                <div v-if="mode === 'receive'" class="qcell">
                  <input v-model="qty[l.product_id]" class="ui-input" type="number" min="0" step="any" inputmode="decimal" :aria-label="`Received ${l.name}`" :data-testid="'recv-qty-' + i" />
                  <span>{{ unitName(l) }}</span>
                </div>
                <template v-else>{{ l.received_text || '—' }}</template>
              </td>
              <td v-if="showDiff" class="num" :class="{ neg: Number(l.discrepancy) > 0 }">{{ Number(l.discrepancy) ? '−' + l.discrepancy_text : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="perm.approve && has(t.value)" class="val">Value at cost {{ money(t.value) }}<template v-if="Number(t.discrepancy_value)"> · difference {{ money(t.discrepancy_value) }}</template></p>
    </template>

    <template v-if="t && (mode || canCancel)" #foot>
      <button v-if="canCancel" type="button" class="ui-btn ui-btn--ghost danger" :disabled="busy" data-testid="tr-cancel" @click="cancel">Cancel transfer</button>
      <span class="sp"></span>
      <button v-if="mode === 'issue'" type="button" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="tr-issue" @click="issue"><i class="fa-solid fa-dolly"></i> Issue to {{ t.to_location }}</button>
      <button v-if="mode === 'receive'" type="button" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="tr-receive" @click="receive"><i class="fa-solid fa-box-open"></i> Confirm received</button>
    </template>
  </BarDrawer>
</template>

<script>
import BarDrawer from './BarDrawer.vue'
import { money, has, locationName } from './barContext'
import { barApi, TRANSFER_STATUS, statusMeta } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { plural } from '@/utils/barUnits'

export default {
  name: 'TransferDrawer',
  components: { BarDrawer },
  props: {
    id: { type: String, required: true },
    perm: { type: Object, required: true }
  },
  emits: ['close', 'changed'],
  data() {
    return { t: null, error: '', qty: {}, stockAt: {}, busy: false }
  },
  computed: {
    meta() {
      if (this.t?.mode === 'direct' && this.t.status === 'received') return { label: 'Moved', badge: 'ui-badge--success' }
      return statusMeta(TRANSFER_STATUS, this.t?.status)
    },
    mode() {
      if (!this.t) return ''
      if (this.t.status === 'requested' && this.perm.edit) return 'issue'
      if (this.t.status === 'issued' && this.perm.create) return 'receive'
      return ''
    },
    canCancel() {
      if (!this.t || !['requested', 'issued'].includes(this.t.status)) return false
      const me = useAuthStore().user?.id
      return this.perm.edit || (this.t.status === 'requested' && this.t.requested_by === me)
    },
    showDiff() {
      return (this.t?.lines || []).some((l) => Number(l.discrepancy))
    }
  },
  watch: {
    id() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    money,
    has,
    locationName,
    formatDateTime,
    unitName(l) {
      const u = l.unit || 'bottle'
      if (u === 'ml') return 'ml'
      if (u === 'tot') return 'tots'
      if (u === 'pack' || u === 'case') return 'packs'
      return plural(l.unit_label || 'unit', 2)
    },
    async load() {
      this.error = ''
      try {
        const t = await barApi.transfer(this.id)
        this.t = t
        const q = {}
        for (const l of t.lines || []) {
          if (t.status === 'requested') q[l.product_id] = l.requested_qty ?? ''
          else if (t.status === 'issued') q[l.product_id] = l.issued_qty ?? l.requested_qty ?? ''
        }
        this.qty = q
        if (t.status === 'requested' && this.perm.edit) this.loadStock(t.from_location_id)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the transfer')
      }
    },
    async loadStock(loc) {
      try {
        const items = await barApi.items({ location_id: loc })
        const m = {}
        for (const it of items) m[it.product_id] = it.on_hand_text
        this.stockAt = m
      } catch {
        this.stockAt = {}
      }
    },
    lines() {
      return (this.t.lines || []).map((l) => ({ product_id: l.product_id, qty: Number(this.qty[l.product_id]) || 0, unit: l.unit }))
    },
    async issue() {
      const lines = this.lines()
      if (lines.some((l) => l.qty < 0)) return toast.error('Quantities cannot be negative')
      this.busy = true
      try {
        await barApi.issueTransfer(this.id, lines)
        toast.success(`${this.t.number} issued to ${this.t.to_location}`)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not issue the transfer'))
      } finally {
        this.busy = false
      }
    },
    async receive() {
      const lines = this.lines()
      const short = (this.t.lines || []).filter((l) => Number(this.qty[l.product_id]) < Number(l.issued_qty ?? l.requested_qty) - 1e-9)
      if (short.length) {
        const ok = await confirmDialog({ title: 'Less than was issued', message: `${short.map((l) => l.name).join(', ')} — the difference is recorded on the transfer for the manager.`, confirmText: 'Confirm received' })
        if (!ok) return
      }
      this.busy = true
      try {
        await barApi.receiveTransfer(this.id, lines)
        toast.success(`${this.t.number} received at ${this.t.to_location}`)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not receive the transfer'))
      } finally {
        this.busy = false
      }
    },
    async cancel() {
      const ok = await confirmDialog({ title: `Cancel ${this.t.number}?`, message: this.t.status === 'issued' ? 'The issued stock goes back to the store.' : 'The request is withdrawn.', confirmText: 'Cancel transfer', danger: true })
      if (!ok) return
      this.busy = true
      try {
        await barApi.cancelTransfer(this.id)
        toast.success('Transfer cancelled')
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not cancel the transfer'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}
.steps li {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-3);
}
.steps li > i {
  margin-top: 3px;
}
.steps li span {
  display: flex;
  flex-direction: column;
}
.steps li small {
  font-size: 12px;
}
.steps li.done {
  color: var(--text);
}
.steps li.done > i {
  color: var(--success);
}
.steps li.now {
  outline: 2px solid var(--accent);
  color: var(--text);
}
.note {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-2);
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.qcell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}
.qcell .ui-input {
  width: 90px;
  text-align: right;
}
.qcell span {
  font-size: 12px;
  color: var(--text-3);
  min-width: 44px;
  text-align: left;
}
.neg {
  color: var(--danger);
  font-weight: 600;
}
.val {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}
.danger {
  color: var(--danger);
}
.show-sm {
  display: none;
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .show-sm {
    display: block;
  }
  .qcell .ui-input {
    width: 70px;
  }
}
.sp {
  flex: 1;
}
</style>
