<template>
  <SideDrawer :open="open" :title="order ? order.order_number : 'Purchase order'" width="640px" @close="$emit('close')">
    <template #title>
      <div class="title-row">
        <h2>{{ order ? order.order_number : 'Purchase order' }}</h2>
        <span v-if="order" class="ui-badge" :class="`ui-badge--${meta.badge}`">{{ meta.label }}</span>
        <span v-if="isOverdue" class="ui-badge ui-badge--overdue">Overdue</span>
      </div>
      <p v-if="order">
        <a href="#" class="sup-link" @click.prevent="$emit('open-supplier', order.supplier_id)">{{ order.supplier?.name || 'Supplier' }}</a>
        · {{ fmtDate(order.order_date) }}
      </p>
    </template>

    <template v-if="order" #actions>
      <button v-if="canReceive" class="ui-btn ui-btn--success ui-btn--sm" @click="showReceive = true"><i class="fa-solid fa-box-open"></i> Receive stock</button>
      <button v-if="status === 'draft'" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="!!busy" @click="setStatus('sent')"><i class="fa-solid fa-paper-plane"></i> Mark as ordered</button>
      <button v-if="status === 'draft' || status === 'sent'" class="ui-btn ui-btn--sm" @click="$emit('edit', order)"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
      <button class="ui-btn ui-btn--sm" @click="print"><i class="fa-solid fa-print"></i> Print</button>
      <button v-if="status === 'partially_received'" class="ui-btn ui-btn--sm" :disabled="!!busy" @click="closeShort"><i class="fa-solid fa-flag-checkered"></i> Close order</button>
      <button v-if="status === 'sent'" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="!!busy" @click="setStatus('draft')"><i class="fa-solid fa-rotate-left"></i> Back to draft</button>
      <button v-if="status === 'cancelled'" class="ui-btn ui-btn--sm" :disabled="!!busy" @click="setStatus('draft')"><i class="fa-solid fa-rotate-left"></i> Reopen as draft</button>
      <button v-if="status === 'draft' || status === 'sent'" class="ui-btn ui-btn--sm ui-btn--ghost danger-text" :disabled="!!busy" @click="cancel"><i class="fa-solid fa-ban"></i> Cancel order</button>
      <button v-if="status === 'draft' || status === 'cancelled'" class="ui-btn ui-btn--sm ui-btn--ghost danger-text" :disabled="!!busy" @click="remove"><i class="fa-regular fa-trash-can"></i> Delete</button>
    </template>

    <div v-if="loading && !order" class="sk">
      <div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 18px; margin-bottom: 12px"></div>
    </div>
    <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <template v-else-if="order">
      <div class="facts">
        <div><span>Order date</span><strong>{{ fmtDate(order.order_date) }}</strong></div>
        <div>
          <span>Expected</span>
          <strong :class="{ 'txt-danger': isOverdue }">{{ order.expected_date ? fmtDate(order.expected_date) : 'Not set' }}</strong>
          <small v-if="order.expected_date && (status === 'sent' || status === 'partially_received')">{{ relDays(order.expected_date) }}</small>
        </div>
        <div><span>Received</span><strong>{{ order.received_date ? fmtDate(order.received_date) : '—' }}</strong></div>
        <div><span>Total</span><strong class="num">{{ money(order.total_amount) }}</strong></div>
      </div>

      <div v-if="status !== 'draft' && status !== 'cancelled'" class="progress-wrap">
        <div class="progress-label">
          <span>Received</span>
          <span>{{ receivedUnits }} / {{ orderedUnits }} units</span>
        </div>
        <div class="po-progress"><div class="po-progress__bar" :style="{ width: pct + '%' }"></div></div>
      </div>

      <h3 class="sec">Items</h3>
      <div class="ui-table-wrap items">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Product</th>
              <th class="num">Qty</th>
              <th class="num">Rcvd</th>
              <th class="num hide-xs">Unit cost</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in order.items" :key="it.id">
              <td>
                <div class="p-name">{{ it.product?.name || 'Deleted product' }}</div>
                <small class="muted">{{ it.product?.sku }}</small>
              </td>
              <td class="num">{{ it.quantity }}</td>
              <td class="num">
                <span :class="it.quantity_received >= it.quantity ? 'txt-success' : it.quantity_received > 0 ? 'txt-warning' : 'muted'">{{ it.quantity_received || 0 }}</span>
              </td>
              <td class="num hide-xs">{{ money(it.unit_cost) }}</td>
              <td class="num">{{ money(it.total_cost) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <dl class="totals">
        <div><dt>Subtotal</dt><dd>{{ money(order.sub_total) }}</dd></div>
        <div><dt>Tax</dt><dd>{{ money(order.tax_amount) }}</dd></div>
        <div><dt>Shipping</dt><dd>{{ money(order.shipping_cost) }}</dd></div>
        <div class="grand"><dt>Total</dt><dd>{{ money(order.total_amount) }}</dd></div>
      </dl>

      <template v-if="order.notes">
        <h3 class="sec">Notes</h3>
        <p class="notes">{{ order.notes }}</p>
      </template>

      <p class="meta muted">
        Created {{ fmtDateTime(order.created_at) }}<span v-if="creatorName"> by {{ creatorName }}</span>
      </p>
    </template>

    <ReceiveStockModal v-if="showReceive && order" :order="order" @close="showReceive = false" @received="onReceived" />
  </SideDrawer>
</template>

<script>
import SideDrawer from './SideDrawer.vue'
import ReceiveStockModal from './ReceiveStockModal.vue'
import { supplierService, poStatusMeta } from '@/services/supplierService'
import api, { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate, formatDateTime, relativeDays, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export default {
  name: 'PurchaseOrderDrawer',
  components: { SideDrawer, ReceiveStockModal },
  props: {
    open: { type: Boolean, default: false },
    orderId: { type: String, default: '' }
  },
  emits: ['close', 'changed', 'edit', 'open-supplier', 'deleted'],
  data() {
    return { order: null, loading: false, error: '', busy: '', showReceive: false }
  },
  computed: {
    status() {
      return this.meta.value
    },
    meta() {
      return poStatusMeta(this.order?.status)
    },
    canReceive() {
      return this.status === 'sent' || this.status === 'partially_received'
    },
    isOverdue() {
      return !!this.order?.expected_date && this.canReceive && isoDate(this.order.expected_date) < isoDate()
    },
    orderedUnits() {
      return (this.order?.items || []).reduce((s, i) => s + (i.quantity || 0), 0)
    },
    receivedUnits() {
      return (this.order?.items || []).reduce((s, i) => s + (i.quantity_received || 0), 0)
    },
    pct() {
      return this.orderedUnits ? Math.min(100, Math.round((this.receivedUnits / this.orderedUnits) * 100)) : 0
    },
    creatorName() {
      const c = this.order?.creator
      return c ? [c.first_name, c.last_name].filter(Boolean).join(' ') : ''
    }
  },
  watch: {
    open(v) {
      if (v) this.load()
    },
    orderId() {
      if (this.open) this.load()
    }
  },
  created() {
    if (this.open) this.load()
  },
  methods: {
    money: (v) => formatMoney(v),
    fmtDate: formatDate,
    fmtDateTime: formatDateTime,
    relDays: (v) => {
      const r = relativeDays(v)
      return r ? `due ${r}` : ''
    },
    async load() {
      if (!this.orderId) return
      if (this.order?.id !== this.orderId) this.order = null
      this.loading = true
      this.error = ''
      try {
        const res = await supplierService.getPurchaseOrder(this.orderId)
        this.order = res.data?.purchase_order || null
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the purchase order')
      } finally {
        this.loading = false
      }
    },
    async setStatus(status, message) {
      this.busy = status
      try {
        const res = await supplierService.updatePurchaseOrderStatus(this.order.id, status)
        this.order = res.data?.purchase_order || this.order
        toast.success(message || `${this.order.order_number} marked as ${poStatusMeta(status).label.toLowerCase()}`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the status'))
      } finally {
        this.busy = ''
      }
    },
    async cancel() {
      const ok = await confirmDialog({ title: `Cancel ${this.order.order_number}?`, message: 'The order will be kept for your records but can no longer be received. You can reopen it as a draft later.', confirmText: 'Cancel order', danger: true })
      if (ok) this.setStatus('cancelled', `${this.order.order_number} cancelled`)
    },
    async closeShort() {
      const outstanding = this.orderedUnits - this.receivedUnits
      const ok = await confirmDialog({ title: 'Close this order?', message: `${outstanding} unit${outstanding === 1 ? '' : 's'} still outstanding will not be received. The order will be marked as received.`, confirmText: 'Close order' })
      if (ok) this.setStatus('received', `${this.order.order_number} closed`)
    },
    async remove() {
      const ok = await confirmDialog({ title: `Delete ${this.order.order_number}?`, message: 'This permanently removes the purchase order.', confirmText: 'Delete', danger: true })
      if (!ok) return
      this.busy = 'delete'
      try {
        await supplierService.deletePurchaseOrder(this.order.id)
        toast.success(`${this.order.order_number} deleted`)
        this.$emit('deleted')
        this.$emit('changed')
        this.$emit('close')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the purchase order'))
      } finally {
        this.busy = ''
      }
    },
    onReceived(po) {
      this.showReceive = false
      if (po) this.order = po
      this.$emit('changed')
    },
    async print() {
      const w = window.open('', '_blank', 'width=900,height=1000')
      if (!w) {
        toast.error('Allow pop-ups to print this purchase order')
        return
      }
      w.document.write('<p style="font-family:sans-serif;padding:24px">Preparing purchase order…</p>')
      let biz = {}
      try {
        const r = await api.get('/invoicing/settings')
        biz = r.data?.data?.settings || r.data?.settings || {}
      } catch {
        biz = {}
      }
      const o = this.order
      const s = o.supplier || {}
      const addr = s.address ? [s.address.street, [s.address.suburb, s.address.state, s.address.postcode].filter(Boolean).join(' ')].filter(Boolean).join('<br>') : ''
      const rows = (o.items || [])
        .map((it) => `<tr><td>${esc(it.product?.name || 'Product')}<div class="sku">${esc(it.product?.sku || '')}</div></td><td class="n">${it.quantity}</td><td class="n">${esc(formatMoney(it.unit_cost))}</td><td class="n">${esc(formatMoney(it.total_cost))}</td></tr>`)
        .join('')
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.order_number)}</title>
<style>
body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111322;margin:40px;font-size:13px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.02em}.muted{color:#5b6070}.top{display:flex;justify-content:space-between;gap:24px;margin-bottom:32px}
.box{display:flex;gap:48px;margin-bottom:28px}.box h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5b6070}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#5b6070;border-bottom:2px solid #111322;padding:8px 6px}
td{padding:10px 6px;border-bottom:1px solid #e6e8ef;vertical-align:top}.n{text-align:right;white-space:nowrap}.sku{color:#5b6070;font-size:11px}
.tot{margin-left:auto;width:280px;margin-top:16px}.tot div{display:flex;justify-content:space-between;padding:4px 6px}.tot .g{font-weight:700;font-size:16px;border-top:2px solid #111322;margin-top:6px;padding-top:8px}
.notes{margin-top:28px;white-space:pre-wrap}@media print{body{margin:16mm}}
</style></head><body>
<div class="top"><div><h1>Purchase order</h1><div class="muted">${esc(o.order_number)}</div></div>
<div style="text-align:right">${biz.business_name ? `<strong>${esc(biz.business_name)}</strong><br>` : ''}${biz.address ? esc(biz.address).replace(/\n/g, '<br>') + '<br>' : ''}${biz.email ? esc(biz.email) + '<br>' : ''}${biz.phone ? esc(biz.phone) + '<br>' : ''}${biz.tax_number ? esc(biz.tax_number_label || 'ABN') + ' ' + esc(biz.tax_number) : ''}</div></div>
<div class="box"><div><h4>Supplier</h4><strong>${esc(s.name || '')}</strong><br>${s.contact_person ? esc(s.contact_person) + '<br>' : ''}${addr ? addr + '<br>' : ''}${s.email ? esc(s.email) + '<br>' : ''}${s.phone ? esc(s.phone) : ''}</div>
<div><h4>Order date</h4>${esc(formatDate(o.order_date))}<h4 style="margin-top:12px">Expected delivery</h4>${esc(o.expected_date ? formatDate(o.expected_date) : '—')}</div>
${s.payment_terms ? `<div><h4>Payment terms</h4>${esc(s.payment_terms)}</div>` : ''}</div>
<table><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Unit cost</th><th class="n">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot"><div><span>Subtotal</span><span>${esc(formatMoney(o.sub_total))}</span></div><div><span>Tax</span><span>${esc(formatMoney(o.tax_amount))}</span></div><div><span>Shipping</span><span>${esc(formatMoney(o.shipping_cost))}</span></div><div class="g"><span>Total</span><span>${esc(formatMoney(o.total_amount))}</span></div></div>
${o.notes ? `<div class="notes"><h4 class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px">Notes</h4>${esc(o.notes)}</div>` : ''}
<script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script></body></html>`
      w.document.open()
      w.document.write(html)
      w.document.close()
    }
  }
}
</script>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sup-link {
  color: var(--accent);
  font-weight: 550;
  text-decoration: none;
}
.sup-link:hover {
  text-decoration: underline;
}
.danger-text {
  color: var(--danger);
}
.facts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}
.facts > div {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  min-width: 0;
}
.facts span {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
  margin-bottom: 3px;
}
.facts strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.facts small {
  font-size: 11.5px;
  color: var(--text-3);
}
.progress-wrap {
  margin-bottom: 18px;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--text-2);
  margin-bottom: 6px;
  font-variant-numeric: tabular-nums;
}
.po-progress {
  height: 8px;
  border-radius: 99px;
  background: var(--bg-subtle);
  overflow: hidden;
}
.po-progress__bar {
  height: 100%;
  background: var(--success);
  border-radius: 99px;
  transition: width 0.3s var(--ease);
}
.sec {
  font-size: 13px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin: 18px 0 8px;
}
.items {
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.p-name {
  font-weight: 550;
  color: var(--text);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.muted {
  color: var(--text-3);
}
.txt-success {
  color: var(--success);
  font-weight: 600;
}
.txt-warning {
  color: var(--warning);
  font-weight: 600;
}
.txt-danger {
  color: var(--danger) !important;
}
.totals {
  margin: 12px 0 0 auto;
  max-width: 280px;
}
.totals > div {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: var(--text-2);
}
.totals dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.totals .grand {
  border-top: 1px solid var(--border);
  margin-top: 6px;
  padding-top: 8px;
  font-weight: 700;
  font-size: 15px;
}
.totals .grand dt {
  color: var(--text);
}
.notes {
  white-space: pre-wrap;
  color: var(--text-2);
  margin: 0;
}
.meta {
  margin-top: 22px;
  font-size: 12px;
}
@media (max-width: 600px) {
  .facts {
    grid-template-columns: 1fr 1fr;
  }
  .hide-xs {
    display: none;
  }
}
</style>
