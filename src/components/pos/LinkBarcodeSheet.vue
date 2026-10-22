<template>
  <div class="lb-backdrop" @mousedown.self="!busy && $emit('close')">
    <section class="lb" role="dialog" aria-modal="true" aria-labelledby="lb-title" data-testid="link-barcode">
      <header class="lb__head">
        <div>
          <h2 id="lb-title">Unknown barcode</h2>
          <p class="lb__code"><i class="fa-solid fa-barcode"></i> <code data-testid="link-code">{{ code }}</code> <span v-if="kind">· {{ kind }}</span></p>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" :disabled="busy" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <!-- Staff: a manager links codes -->
      <div v-if="!canManage" class="lb__body lb__ask" data-testid="link-ask-manager">
        <span class="lb__ask-icon"><i class="fa-solid fa-user-shield"></i></span>
        <h3>Ask your manager</h3>
        <p>This barcode isn’t on any product yet. A manager can link it in two taps — show them the code above. Meanwhile, find the item by name.</p>
        <button class="ui-btn ui-btn--primary" data-testid="link-search-instead" @click="$emit('search')"><i class="fa-solid fa-magnifying-glass"></i> Find by name</button>
      </div>

      <template v-else>
        <div class="lb__tabs ui-tabs" role="tablist">
          <button class="ui-tab" :class="{ 'is-active': tab === 'link' }" role="tab" :aria-selected="tab === 'link'" @click="tab = 'link'">Link to a product</button>
          <button class="ui-tab" :class="{ 'is-active': tab === 'new' }" role="tab" :aria-selected="tab === 'new'" data-testid="link-new-tab" @click="openNew">New product</button>
        </div>

        <div v-if="tab === 'link'" class="lb__body">
          <div class="ui-input-group">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input ref="q" v-model="q" class="ui-input" type="search" placeholder="Search the product this code belongs to" aria-label="Search products" autocomplete="off" data-testid="link-search" @keydown.enter.prevent="pickFirst" />
          </div>
          <ul class="lb__list" role="listbox" aria-label="Products">
            <li v-for="p in results" :key="p.id">
              <button type="button" class="lb__row" :class="{ 'is-selected': selected && selected.id === p.id }" role="option" :aria-selected="!!(selected && selected.id === p.id)" :data-link-product="p.name" @click="select(p)">
                <span class="lb__avatar">{{ initials(p.name) }}</span>
                <span class="lb__main">
                  <strong>{{ p.name }}</strong>
                  <small>{{ p.sku }}<template v-if="p.barcode"> · has {{ p.barcode }}</template></small>
                </span>
                <span class="lb__price">{{ money(p.selling_price) }}</span>
              </button>
            </li>
            <li v-if="!results.length" class="lb__empty">No product matches “{{ q }}”. <a href="#" @click.prevent="openNew">Create it</a></li>
          </ul>
          <div v-if="conflict" class="ui-alert ui-alert--warning lb__conflict" data-testid="link-conflict">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>{{ conflict.message }}</span>
          </div>
          <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        </div>

        <form v-else class="lb__body lb__new" @submit.prevent="create">
          <div class="ui-field">
            <label for="lb-name">Name</label>
            <input id="lb-name" ref="name" v-model="draft.name" class="ui-input" maxlength="255" required placeholder="e.g. Tusker Lager 500ml" data-testid="new-name" />
          </div>
          <div class="lb__grid">
            <div class="ui-field">
              <label for="lb-price">Selling price</label>
              <input id="lb-price" v-model="draft.price" class="ui-input" type="number" min="0" step="0.01" inputmode="decimal" required data-testid="new-price" />
            </div>
            <div class="ui-field">
              <label for="lb-stock">In stock now</label>
              <input id="lb-stock" v-model="draft.stock" class="ui-input" type="number" min="0" step="1" inputmode="numeric" data-testid="new-stock" />
            </div>
          </div>
          <p class="ui-hint">The barcode {{ code }} is saved on the new product. {{ barMode ? 'Drinks poured from bar stock (tots, cocktails) are set up in Bar stock → Menu.' : 'Add cost, category and photos later in Inventory.' }}</p>
          <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        </form>

        <footer class="lb__foot">
          <button class="ui-btn" :disabled="busy" @click="$emit('close')">Cancel</button>
          <template v-if="tab === 'link'">
            <button v-if="conflict" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="link-confirm-conflict" @click="link(conflict.opts)">
              <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-link'"></i> {{ conflict.action }}
            </button>
            <button v-else class="ui-btn ui-btn--primary" :disabled="busy || !selected" data-testid="link-confirm" @click="link()">
              <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-link'"></i> {{ selected ? `Link to ${short(selected.name)}` : 'Pick a product' }}
            </button>
          </template>
          <button v-else class="ui-btn ui-btn--primary" :disabled="busy || !draft.name.trim() || draft.price === ''" data-testid="new-create" @click="create">
            <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plus'"></i> Create &amp; add
          </button>
        </footer>
      </template>
    </section>
  </div>
</template>

<script>
// "Link this barcode": a code the till doesn't know. Managers pick the product
// (tap) and link it (tap) — POST /pos/barcode-links — or create a new product
// with the code; staff are asked to fetch a manager.
import api, { apiErrorMessage } from '@/services/api'
import { posService } from '@/services/posService'
import { formatMoney } from '@/utils/format'
import { searchIndex } from '@/utils/posFast'
import { isValidGtin, isValidUpce } from '@/utils/barcode/checks'

export default {
  name: 'LinkBarcodeSheet',
  props: {
    code: { type: String, required: true },
    index: { type: Object, default: null },
    currency: { type: String, default: '' },
    canManage: { type: Boolean, default: false },
    barMode: { type: Boolean, default: false }
  },
  emits: ['close', 'linked', 'created', 'search'],
  data() {
    return { tab: 'link', q: '', selected: null, busy: false, error: '', conflict: null, draft: { name: '', price: '', stock: '1' } }
  },
  computed: {
    kind() {
      const c = this.code
      if (/^\d{13}$/.test(c) && isValidGtin(c)) return 'EAN-13'
      if (/^\d{12}$/.test(c) && isValidGtin(c)) return 'UPC-A'
      if (/^\d{8}$/.test(c) && isValidGtin(c)) return 'EAN-8'
      if (/^[01]\d{7}$/.test(c) && isValidUpce(c)) return 'UPC-E'
      return ''
    },
    results() {
      if (!this.index) return []
      if (this.q.trim()) return searchIndex(this.index, this.q, { limit: 8 })
      // nothing typed: products without a barcode first (the likely ones)
      const none = searchIndex(this.index, '', { limit: 8, filter: (p) => !p.barcode })
      return none.length ? none : searchIndex(this.index, '', { limit: 8 })
    }
  },
  watch: {
    q() {
      this.selected = null
      this.conflict = null
      this.error = ''
    }
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
    this.$nextTick(() => this.$refs.q?.focus())
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency || undefined)
    },
    initials(n = '') {
      return (
        String(n)
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((x) => x[0])
          .join('')
          .toUpperCase() || '?'
      )
    },
    short(n) {
      return n.length > 22 ? n.slice(0, 21) + '…' : n
    },
    onKey(e) {
      if (e.key === 'Escape' && !this.busy) this.$emit('close')
    },
    select(p) {
      this.selected = p
      this.conflict = null
      this.error = ''
    },
    pickFirst() {
      if (this.results[0]) this.select(this.results[0])
    },
    openNew() {
      this.tab = 'new'
      this.error = ''
      if (!this.draft.name && this.q.trim() && !this.results.length) this.draft.name = this.q.trim()
      this.$nextTick(() => this.$refs.name?.focus())
    },
    async link(opts = {}) {
      const p = this.selected
      if (!p || this.busy) return
      this.busy = true
      this.error = ''
      try {
        const res = await posService.linkBarcode(p.id, this.code, opts)
        this.$emit('linked', { ...p, barcode: res?.product?.barcode || this.code }, res?.moved_from || null)
      } catch (e) {
        const d = e?.response?.data || {}
        if (e?.response?.status === 409 && d.code === 'PRODUCT_HAS_CODE') {
          this.conflict = { message: `${p.name} already has barcode ${d.current_barcode}. Replace it with ${this.code}?`, action: 'Replace barcode', opts: { ...opts, replace: true } }
        } else if (e?.response?.status === 409 && d.code === 'BARCODE_TAKEN') {
          this.conflict = { message: `${this.code} is already on ${d.product?.name || 'another product'}. Move it to ${p.name}?`, action: 'Move barcode here', opts: { ...opts, move: true, replace: true } }
        } else this.error = apiErrorMessage(e, 'Could not link the barcode')
      } finally {
        this.busy = false
      }
    },
    async create() {
      if (this.busy || !this.draft.name.trim() || this.draft.price === '') return
      this.busy = true
      this.error = ''
      try {
        const body = { name: this.draft.name.trim(), selling_price: Number(this.draft.price) || 0, barcode: this.code, current_stock: Math.max(0, parseInt(this.draft.stock, 10) || 0), is_active: true }
        const res = await api.post('/inventory/products', body)
        const p = res.data?.product || res.data?.data?.product || res.data?.data
        if (!p?.id) throw new Error('The product was not created')
        this.$emit('created', p)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not create the product')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.lb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2150;
  background: rgba(10, 12, 24, 0.5);
  display: grid;
  place-items: center;
  padding: 16px;
}
.lb {
  width: min(520px, 100%);
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.lb__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 12px 10px 18px;
}
.lb__head h2 {
  margin: 0;
  font-size: 18px;
}
.lb__code {
  margin: 4px 0 0;
  color: var(--text-2);
  font-size: 13.5px;
}
.lb__code code {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 650;
  color: var(--text);
  background: var(--bg-subtle);
  padding: 2px 6px;
  border-radius: 6px;
  word-break: break-all;
}
.lb__tabs {
  padding: 0 14px;
}
.lb__body {
  padding: 14px 18px;
  overflow-y: auto;
  min-height: 0;
}
.lb__list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lb__row {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.lb__row:hover {
  background: var(--surface-hover);
}
.lb__row.is-selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.lb__avatar {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  background: var(--bg-subtle);
  color: var(--text-2);
}
.lb__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.lb__main strong {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb__main small {
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb__price {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lb__empty {
  padding: 12px 6px;
  color: var(--text-3);
  font-size: 13.5px;
}
.lb__conflict {
  margin-top: 10px;
}
.lb__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.lb__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}
.lb__foot .ui-btn {
  min-height: 44px;
}
.lb__ask {
  text-align: center;
  padding: 18px 22px 24px;
}
.lb__ask-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 10px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 22px;
}
.lb__ask h3 {
  margin: 0 0 6px;
  font-size: 17px;
}
.lb__ask p {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 14px;
}
.spin {
  animation: fa-spin 1s linear infinite;
}
@media (max-width: 480px) {
  .lb-backdrop {
    padding: 0;
    place-items: end stretch;
  }
  .lb {
    width: 100%;
    max-height: 92dvh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .lb__foot .ui-btn {
    flex: 1;
  }
}
</style>
