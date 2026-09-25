<template>
  <div>
    <div class="toolbar">
      <div class="ui-input-group search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="q" class="ui-input" type="search" placeholder="Search vendors…" aria-label="Search vendors" />
      </div>
      <div class="toolbar__right">
        <label class="ui-switch small">
          <input v-model="showArchived" type="checkbox" @change="$emit('reload', showArchived)" />
          <span>Show archived</span>
        </label>
        <button class="ui-btn ui-btn--primary" @click="modal = { vendor: null }"><i class="fa-solid fa-plus"></i> New vendor</button>
      </div>
    </div>

    <div v-if="loading && !vendors.length" class="ui-card__body">
      <div v-for="n in 5" :key="n" class="sk-row">
        <div class="ui-skeleton" style="width: 32px; height: 32px"></div>
        <div class="ui-skeleton" style="flex: 1"></div>
        <div class="ui-skeleton" style="width: 100px"></div>
      </div>
    </div>

    <div v-else-if="!rows.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-truck-field"></i></div>
      <h3>{{ q ? 'No vendors match your search' : 'No vendors yet' }}</h3>
      <p>{{ q ? 'Try a different name or email.' : 'Add the suppliers you buy from to start tracking their bills.' }}</p>
      <button v-if="!q" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="modal = { vendor: null }"><i class="fa-solid fa-plus"></i> Add vendor</button>
    </div>

    <div v-else class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th class="hide-md">Contact</th>
            <th class="hide-sm">Terms</th>
            <th class="num hide-sm">Bills</th>
            <th class="num">Outstanding</th>
            <th style="width: 150px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in rows" :key="v.id" class="is-clickable" :class="{ archived: !v.is_active }" @click="$emit('show-bills', v)">
            <td>
              <div class="v-cell">
                <span class="avatar">{{ initials(v.name) }}</span>
                <span>
                  <span class="v-name">{{ v.name }} <span v-if="!v.is_active" class="ui-badge ui-badge--void">Archived</span></span>
                  <small v-if="v.tax_id">ABN {{ v.tax_id }}</small>
                </span>
              </div>
            </td>
            <td class="hide-md">
              <div>{{ v.contact_name || '—' }}</div>
              <small class="muted">{{ [v.email, v.phone].filter(Boolean).join(' · ') }}</small>
            </td>
            <td class="hide-sm muted">{{ termLabel(v.payment_terms) }}</td>
            <td class="num hide-sm">{{ v.bill_count }}</td>
            <td class="num" :class="{ muted: !v.outstanding }"><strong v-if="v.outstanding">{{ money(v.outstanding) }}</strong><template v-else>{{ money(0) }}</template></td>
            <td class="row-actions" @click.stop>
              <button v-if="v.is_active" class="ui-btn ui-btn--sm" title="New bill for this vendor" @click="$emit('new-bill', v)"><i class="fa-solid fa-plus"></i> Bill</button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${v.name}`" title="Edit" @click="modal = { vendor: v }"><i class="fa-solid fa-pen"></i></button>
              <button v-if="v.is_active" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${v.name}`" title="Delete" @click="remove(v)"><i class="fa-regular fa-trash-can"></i></button>
              <button v-else class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Restore ${v.name}`" title="Restore" @click="restore(v)"><i class="fa-solid fa-rotate-left"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <VendorModal v-if="modal" :vendor="modal.vendor" :accounts="accounts" @close="modal = null" @saved="onSaved" />
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import VendorModal from './VendorModal.vue'
import { financeApi, PAYMENT_TERMS } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'VendorsTab',
  components: { VendorModal },
  props: {
    vendors: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['changed', 'reload', 'new-bill', 'show-bills'],
  data() {
    return { q: '', showArchived: false, modal: null }
  },
  computed: {
    rows() {
      const q = this.q.trim().toLowerCase()
      return this.vendors.filter((v) => (this.showArchived || v.is_active) && (!q || `${v.name} ${v.email} ${v.contact_name}`.toLowerCase().includes(q)))
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    termLabel(t) {
      return PAYMENT_TERMS.find((x) => x.value === t)?.label || t || '—'
    },
    initials(name = '') {
      return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    },
    onSaved() {
      this.modal = null
      this.$emit('changed')
    },
    async remove(v) {
      const ok = await confirmDialog({
        title: `Delete ${v.name}?`,
        message: v.bill_count ? `${v.name} has ${v.bill_count} bill${v.bill_count === 1 ? '' : 's'}, so it will be archived and hidden from new bills. Existing bills are kept.` : 'This vendor will be permanently deleted.',
        confirmText: v.bill_count ? 'Archive vendor' : 'Delete vendor',
        danger: true
      })
      if (!ok) return
      try {
        const res = await financeApi.deleteVendor(v.id)
        toast.success(res?.archived ? `${v.name} archived` : `${v.name} deleted`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the vendor'))
      }
    },
    async restore(v) {
      try {
        await financeApi.updateVendor(v.id, { ...v, is_active: true })
        toast.success(`${v.name} restored`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not restore the vendor'))
      }
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.search {
  width: 280px;
}
.small {
  font-size: 13px;
}
.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  align-items: center;
}
.v-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
}
.v-cell small {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.v-name {
  font-weight: 550;
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.muted {
  color: var(--text-3);
}
.archived td {
  opacity: 0.65;
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.row-actions .ui-btn + .ui-btn {
  margin-left: 2px;
}
@media (max-width: 1100px) {
  .hide-md {
    display: none;
  }
}
@media (max-width: 700px) {
  .hide-sm {
    display: none;
  }
  .search,
  .toolbar__right {
    width: 100%;
  }
  .toolbar__right {
    justify-content: space-between;
  }
}
</style>
