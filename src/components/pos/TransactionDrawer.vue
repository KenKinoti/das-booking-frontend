<template>
  <div class="sheet-backdrop" @mousedown.self="$emit('close')">
    <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="txn-title">
      <header class="sheet__head">
        <div>
          <div class="ui-eyebrow">Sale</div>
          <h2 id="txn-title">{{ txn?.transaction_number || 'Loading…' }}</h2>
          <div v-if="txn" class="sheet__sub">
            <StatusBadge domain="pos" :status="txn.status || 'completed'" />
            <span>{{ dateTime(txn.created_at) }}</span>
          </div>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <div class="sheet__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <template v-else-if="!txn">
          <div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 18px; margin-bottom: 12px"></div>
        </template>
        <template v-else>
          <div v-if="txn.status === 'voided'" class="ui-alert ui-alert--danger">
            <i class="fa-solid fa-ban"></i>
            <span>Voided {{ dateTime(txn.voided_at) }}. <strong>Reason:</strong> {{ txn.void_reason || '—' }}</span>
          </div>

          <div class="total-card">
            <span>Total</span>
            <strong :class="{ struck: txn.status === 'voided' }">{{ money(txn.total_amount) }}</strong>
          </div>

          <dl class="facts">
            <div>
              <dt>Customer</dt>
              <dd>
                <template v-if="txn.customer">
                  {{ name(txn.customer) }}<small v-if="txn.customer.email || txn.customer.phone">{{ txn.customer.email || txn.customer.phone }}</small>
                </template>
                <span v-else class="muted">Walk-in</span>
              </dd>
            </div>
            <div>
              <dt>Cashier</dt>
              <dd>{{ name(txn.cashier) || '—' }}</dd>
            </div>
            <div>
              <dt>Device</dt>
              <dd data-testid="txn-device">
                <template v-if="txn.device_label"><i class="fa-solid fa-mobile-screen muted"></i> {{ txn.device_label }}</template>
                <span v-else class="muted">Not recorded</span>
              </dd>
            </div>
          </dl>

          <h3 class="sec">Items</h3>
          <table class="ui-table mini">
            <thead>
              <tr>
                <th>Item</th>
                <th class="num">Qty</th>
                <th class="num">Price</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in txn.items" :key="it.id">
                <td>
                  <div class="item-name">{{ it.item_name }}</div>
                  <small v-if="it.sku" class="muted mono">{{ it.sku }}</small>
                </td>
                <td class="num">{{ it.quantity }}</td>
                <td class="num">{{ money(it.unit_price) }}</td>
                <td class="num">{{ money(it.total_price) }}</td>
              </tr>
            </tbody>
          </table>

          <dl class="sums">
            <div><dt>Subtotal</dt><dd>{{ money(txn.sub_total) }}</dd></div>
            <div v-if="txn.discount_amount > 0"><dt>Discount</dt><dd>−{{ money(txn.discount_amount) }}</dd></div>
            <div v-if="txn.tax_amount > 0"><dt>{{ txn.tax_inclusive ? 'Tax (included)' : 'Tax' }}</dt><dd>{{ money(txn.tax_amount) }}</dd></div>
            <div class="sums__grand"><dt>Total</dt><dd>{{ money(txn.total_amount) }}</dd></div>
          </dl>

          <h3 class="sec">Payments</h3>
          <ul class="pays">
            <li v-for="p in txn.payments" :key="p.id">
              <span class="pay-ic"><i :class="payIcon(p.method)"></i></span>
              <span class="pays__main">
                {{ label(p.method) }}
                <small v-if="p.reference" class="muted">{{ p.reference }}</small>
              </span>
              <strong>{{ money(p.amount) }}</strong>
            </li>
            <li v-if="txn.change_amount > 0" class="change">
              <span class="pay-ic"><i class="fa-solid fa-arrow-rotate-left"></i></span>
              <span class="pays__main">Change given</span>
              <strong>−{{ money(txn.change_amount) }}</strong>
            </li>
          </ul>

          <template v-if="txn.notes">
            <h3 class="sec">Notes</h3>
            <p class="notes">{{ txn.notes }}</p>
          </template>

          <template v-if="photosShown">
            <h3 class="sec">Photos <span v-if="txn.photo_count" class="muted">{{ txn.photo_count }}</span></h3>
            <p v-if="photoError" class="muted">{{ photoError }}</p>
            <p v-else-if="!photos.length && txn.photo_count && !isManager" class="muted">Only managers can see the photos of this sale.</p>
            <div v-if="photos.length" class="photos" data-testid="txn-photos">
              <figure v-for="ph in photos" :key="ph.id" class="photo">
                <button type="button" class="photo__btn" :aria-label="`Open photo: ${kindLabel(ph.kind)}`" @click="openPhoto(ph)">
                  <img v-if="urls[ph.id]" :src="urls[ph.id]" :alt="kindLabel(ph.kind)" />
                  <span v-else class="ui-skeleton photo__sk"></span>
                </button>
                <figcaption>
                  <strong>{{ kindLabel(ph.kind) }}</strong>
                  <span v-if="ph.note">{{ ph.note }}</span>
                  <small class="muted">{{ ph.uploader_name }} · {{ dateTime(ph.created_at) }}</small>
                </figcaption>
                <button v-if="isManager" type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm photo__del" :aria-label="'Remove photo'" @click="removePhoto(ph)"><i class="fa-regular fa-trash-can"></i></button>
              </figure>
            </div>
          </template>
        </template>
      </div>

      <footer v-if="txn" class="sheet__foot">
        <button v-if="txn.status !== 'voided'" class="ui-btn ui-btn--danger" @click="voidOpen = true"><i class="fa-solid fa-ban"></i> Void sale</button>
        <span class="spacer"></span>
        <button v-if="canAddPhoto" class="ui-btn" data-testid="txn-add-photo" @click="addingPhoto = true"><i class="fa-solid fa-camera"></i> <span class="hide-xs">Add photo</span></button>
        <button class="ui-btn ui-btn--primary" @click="showReceipt = true"><i class="fa-solid fa-print"></i> Receipt</button>
      </footer>
    </aside>

    <!-- Void confirmation -->
    <div v-if="voidOpen" class="ui-modal-backdrop" @mousedown.self="!voiding && (voidOpen = false)">
      <div class="ui-modal" role="alertdialog" aria-modal="true" aria-labelledby="void-title">
        <div class="ui-modal__head">
          <h2 id="void-title">Void {{ txn.transaction_number }}?</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" :disabled="voiding" @click="voidOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form class="ui-modal__body" @submit.prevent="doVoid">
          <p class="void-copy">This marks the {{ money(txn.total_amount) }} sale as voided and returns {{ itemQty }} item{{ itemQty === 1 ? '' : 's' }} to stock. Refund the customer’s payment separately. This can’t be undone.</p>
          <div class="ui-field">
            <label for="void-reason">Reason</label>
            <textarea id="void-reason" ref="reason" v-model="reason" class="ui-textarea" rows="2" maxlength="300" placeholder="e.g. Customer returned items, entered in error" required></textarea>
          </div>
        </form>
        <div class="ui-modal__foot">
          <button class="ui-btn" :disabled="voiding" @click="voidOpen = false">Cancel</button>
          <button class="ui-btn ui-btn--danger" :disabled="voiding || !reason.trim()" @click="doVoid">
            <i :class="voiding ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-ban'"></i> Void sale
          </button>
        </div>
      </div>
    </div>

    <ReceiptModal v-if="showReceipt && txn" :transaction="txn" :organization="organization" :currency="txn.currency || currency" @close="showReceipt = false" />
    <SalePhotoSheet v-if="addingPhoto && txn" :transaction="txn" :currency="txn.currency || currency" @close="addingPhoto = false" @saved="onPhotoSaved" />
    <div v-if="viewing" class="lightbox" role="dialog" aria-modal="true" aria-label="Photo" @click="viewing = null">
      <img :src="urls[viewing.id]" :alt="kindLabel(viewing.kind)" />
      <button type="button" class="ui-btn ui-btn--icon lightbox__close" aria-label="Close photo"><i class="fa-solid fa-xmark"></i></button>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import ReceiptModal from './ReceiptModal.vue'
import SalePhotoSheet from './SalePhotoSheet.vue'
import { posService, PAYMENT_LABELS, personName, mobileMoneyLabel } from '@/services/posService'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { atLeast } from '@/composables/useAccess'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'TransactionDrawer',
  components: { ReceiptModal, SalePhotoSheet },
  props: {
    transactionId: { type: String, required: true },
    organization: { type: Object, default: null },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['close', 'voided', 'photos'],
  data() {
    return { txn: null, error: '', voidOpen: false, reason: '', voiding: false, showReceipt: false, photos: [], urls: {}, photoError: '', addingPhoto: false, viewing: null }
  },
  computed: {
    isManager() {
      return atLeast('manager')
    },
    myId() {
      try {
        return useAuthStore().user?.id || ''
      } catch {
        return ''
      }
    },
    // managers; the cashier on the day of their own sale (the API checks the same)
    canAddPhoto() {
      if (!this.txn || (this.txn.photo_count || 0) >= 5) return false
      if (this.isManager) return true
      return this.txn.cashier_id === this.myId && Date.now() - new Date(this.txn.created_at).getTime() < 24 * 3600 * 1000
    },
    photosShown() {
      return !!this.txn && ((this.txn.photo_count || 0) > 0 || this.photos.length > 0)
    },
    itemQty() {
      return (this.txn?.items || []).reduce((n, i) => n + (i.product_id ? i.quantity : 0), 0)
    }
  },
  watch: {
    transactionId: { immediate: true, handler: 'load' },
    voidOpen(v) {
      if (v) {
        this.reason = ''
        this.$nextTick(() => this.$refs.reason?.focus())
      }
    }
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
    this.freeUrls()
  },
  methods: {
    money(v) {
      return formatMoney(v, this.txn?.currency || this.currency)
    },
    dateTime: formatDateTime,
    name: personName,
    label(m) {
      return PAYMENT_LABELS[m] || m
    },
    payIcon(m) {
      return m === 'cash' ? 'fa-solid fa-money-bill-wave' : m === 'card' || m === 'eftpos' ? 'fa-regular fa-credit-card' : m === 'voucher' ? 'fa-solid fa-gift' : m === 'mobile_money' ? 'fa-solid fa-mobile-screen-button' : 'fa-solid fa-building-columns'
    },
    onKey(e) {
      if (e.key !== 'Escape' || this.showReceipt || this.addingPhoto) return
      if (this.viewing) {
        this.viewing = null
        return
      }
      if (this.voidOpen) {
        if (!this.voiding) this.voidOpen = false
      } else this.$emit('close')
    },
    async load() {
      this.txn = null
      this.error = ''
      this.photos = []
      this.freeUrls()
      try {
        this.txn = await posService.getTransaction(this.transactionId)
        if (this.txn.photo_count > 0) this.loadPhotos()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load this sale')
      }
    },
    kindLabel(k) {
      return k === 'payment' ? `${mobileMoneyLabel(this.txn?.currency || this.currency)} / payment` : k === 'damage' ? 'Damaged item' : 'Photo'
    },
    freeUrls() {
      for (const u of Object.values(this.urls)) URL.revokeObjectURL(u)
      this.urls = {}
    },
    async loadPhotos() {
      this.photoError = ''
      try {
        const res = await posService.salePhotos(this.txn.id)
        this.photos = res.photos || []
        for (const ph of this.photos) {
          if (this.urls[ph.id]) continue
          posService
            .salePhotoBlob(ph.id)
            .then((b) => (this.urls = { ...this.urls, [ph.id]: URL.createObjectURL(b) }))
            .catch(() => {})
        }
      } catch (e) {
        this.photoError = apiErrorMessage(e, 'Could not load the photos')
      }
    },
    openPhoto(ph) {
      if (this.urls[ph.id]) this.viewing = ph
    },
    onPhotoSaved() {
      this.addingPhoto = false
      this.txn = { ...this.txn, photo_count: (this.txn.photo_count || 0) + 1 }
      this.$emit('photos', this.txn.photo_count)
      this.loadPhotos()
    },
    async removePhoto(ph) {
      const ok = await confirmDialog({ title: 'Remove this photo?', message: 'It is deleted from the sale for everyone.', confirmText: 'Remove', danger: true })
      if (!ok) return
      try {
        await posService.deleteSalePhoto(ph.id)
        this.photos = this.photos.filter((x) => x.id !== ph.id)
        if (this.urls[ph.id]) URL.revokeObjectURL(this.urls[ph.id])
        this.txn = { ...this.txn, photo_count: Math.max(0, (this.txn.photo_count || 1) - 1) }
        this.$emit('photos', this.txn.photo_count)
        toast.success('Photo removed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the photo'))
      }
    },
    async doVoid() {
      if (!this.reason.trim() || this.voiding) return
      this.voiding = true
      try {
        this.txn = await posService.voidTransaction(this.txn.id, this.reason.trim())
        this.voidOpen = false
        toast.success(`${this.txn.transaction_number} voided and stock restored`)
        this.$emit('voided', this.txn)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not void this sale'))
      } finally {
        this.voiding = false
      }
    }
  }
}
</script>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1990;
  background: rgba(10, 12, 24, 0.45);
  display: flex;
  justify-content: flex-end;
  animation: ui-fade 0.15s ease-out;
}
.sheet {
  width: min(520px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  animation: slide 0.22s var(--ease);
}
@keyframes slide {
  from {
    transform: translateX(40px);
    opacity: 0;
  }
}
.sheet__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
}
.sheet__head h2 {
  margin: 2px 0 6px;
  font-size: 19px;
  font-family: var(--font-mono);
  letter-spacing: -0.01em;
}
.sheet__sub {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-3);
}
.sheet__body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sheet__foot {
  display: flex;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}
.spacer {
  flex: 1;
}
.total-card {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.total-card span {
  color: var(--text-2);
  font-size: 13px;
}
.total-card strong {
  font-size: 28px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.struck {
  text-decoration: line-through;
  color: var(--text-3);
}
.facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
}
.facts dt {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
  margin-bottom: 2px;
}
.facts dd {
  margin: 0;
  font-weight: 550;
}
.facts small {
  display: block;
  font-weight: 400;
  color: var(--text-3);
  font-size: 12.5px;
}
.sec {
  margin: 6px 0 -4px;
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}
.mini {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.mini th,
.mini td {
  padding: 8px 12px;
}
.item-name {
  font-weight: 550;
}
.mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
}
.muted {
  color: var(--text-3);
}
.sums {
  margin: 0;
  font-size: 13.5px;
  align-self: flex-end;
  width: min(260px, 100%);
}
.sums div {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}
.sums dt {
  font-weight: 400;
  color: var(--text-2);
}
.sums dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.sums__grand {
  border-top: 1px solid var(--border);
  margin-top: 4px;
  padding-top: 6px !important;
}
.sums__grand dt,
.sums__grand dd {
  font-weight: 700;
  color: var(--text);
}
.pays {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.pays li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.pays li:last-child {
  border-bottom: 0;
}
.pays__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-weight: 550;
}
.pays__main small {
  font-weight: 400;
  font-size: 12px;
}
.pays strong {
  font-variant-numeric: tabular-nums;
}
.pays .change {
  color: var(--text-2);
}
.pay-ic {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--bg-subtle);
  color: var(--text-2);
  font-size: 13px;
}
.notes {
  margin: 0;
  white-space: pre-wrap;
  color: var(--text-2);
}
.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.photo {
  position: relative;
  margin: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-2);
}
.photo__btn {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: var(--bg-subtle);
  cursor: zoom-in;
  aspect-ratio: 4 / 3;
}
.photo__btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.photo__sk {
  display: block;
  width: 100%;
  height: 100%;
}
.photo figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  font-size: 12.5px;
}
.photo__del {
  position: absolute;
  top: 6px;
  right: 6px;
  background: var(--surface);
}
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 2200;
  background: rgba(0, 0, 0, 0.85);
  display: grid;
  place-items: center;
  padding: 16px;
  cursor: zoom-out;
}
.lightbox img {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius);
}
.lightbox__close {
  position: absolute;
  top: max(12px, env(safe-area-inset-top));
  right: 12px;
  background: var(--surface);
}
@media (max-width: 420px) {
  .hide-xs {
    display: none;
  }
}
.void-copy {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 14px;
}
@media (max-width: 560px) {
  .sheet__head,
  .sheet__body,
  .sheet__foot {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
