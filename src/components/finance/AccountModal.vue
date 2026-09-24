<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="acc-modal-title" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="acc-modal-title">{{ account ? 'Edit account' : 'New account' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="account && account.is_system" class="ui-alert ui-alert--warning">
          <i class="fa-solid fa-lock"></i><span>This is a system account used by automatic postings. Its code and type are fixed.</span>
        </div>
        <div class="ui-grid-2">
          <label class="ui-field">
            <span class="ui-label">Type</span>
            <select v-model="form.account_type" class="ui-select" :disabled="lockType" @change="onTypeChange">
              <option v-for="t in types" :key="t.value" :value="t.value">{{ t.value }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Code</span>
            <input v-model.trim="form.code" class="ui-input mono" :class="{ 'is-invalid': touched && !form.code }" :disabled="account && account.is_system" maxlength="12" required />
          </label>
        </div>
        <label class="ui-field">
          <span class="ui-label">Name</span>
          <input ref="name" v-model="form.name" class="ui-input" :class="{ 'is-invalid': touched && !form.name.trim() }" placeholder="e.g. Office Supplies" maxlength="120" required />
        </label>
        <label class="ui-field">
          <span class="ui-label">Detail type</span>
          <select v-model="form.sub_type" class="ui-select">
            <option value="">—</option>
            <option v-for="s in subtypes" :key="s" :value="s">{{ s }}</option>
          </select>
          <span class="ui-hint">{{ subtypeHint }}</span>
        </label>
        <label class="ui-field">
          <span class="ui-label">Description <span class="opt">(optional)</span></span>
          <textarea v-model="form.description" class="ui-textarea" rows="2" maxlength="500"></textarea>
        </label>
        <label v-if="account && !account.is_system" class="ui-switch">
          <input v-model="form.is_active" type="checkbox" />
          <span>Active — available for new transactions</span>
        </label>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ account ? 'Save changes' : 'Create account' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { financeApi, ACCOUNT_TYPES } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const RANGES = { Asset: 1000, Liability: 2000, Equity: 3000, Revenue: 4000, Expense: 6000 }

export default {
  name: 'AccountModal',
  props: {
    account: { type: Object, default: null },
    accounts: { type: Array, default: () => [] },
    defaultType: { type: String, default: 'Expense' }
  },
  emits: ['close', 'saved'],
  data() {
    const a = this.account
    return {
      form: {
        code: a?.code || '',
        name: a?.name || '',
        account_type: a?.account_type || this.defaultType,
        sub_type: a?.sub_type || '',
        description: a?.description || '',
        is_active: a ? a.is_active : true
      },
      saving: false,
      touched: false,
      error: ''
    }
  },
  computed: {
    types() {
      return ACCOUNT_TYPES
    },
    subtypes() {
      const list = ACCOUNT_TYPES.find((t) => t.value === this.form.account_type)?.subtypes || []
      return this.form.sub_type && !list.includes(this.form.sub_type) ? [this.form.sub_type, ...list] : list
    },
    lockType() {
      return !!this.account && (this.account.is_system || this.account.has_activity)
    },
    subtypeHint() {
      const t = this.form.account_type
      if (t === 'Expense') return 'Cost of Sales accounts appear above gross profit on the P&L.'
      if (t === 'Asset' || t === 'Liability') return 'Fixed / non-current accounts are shown separately on the balance sheet.'
      return 'Used to organise reports.'
    }
  },
  created() {
    if (!this.account) this.suggestCode()
  },
  mounted() {
    this.$refs.name?.focus()
  },
  methods: {
    onTypeChange() {
      this.form.sub_type = ''
      if (!this.account) this.suggestCode()
    },
    suggestCode() {
      const start = RANGES[this.form.account_type] || 1000
      const used = new Set(this.accounts.map((a) => a.code))
      for (let c = start + 10; c < start + 1000; c += 10) {
        if (!used.has(String(c))) {
          this.form.code = String(c)
          return
        }
      }
    },
    async save() {
      this.touched = true
      this.error = ''
      if (!this.form.code || !this.form.name.trim()) {
        this.error = 'Code and name are required.'
        return
      }
      this.saving = true
      try {
        const payload = { ...this.form, name: this.form.name.trim() }
        const saved = this.account ? await financeApi.updateAccount(this.account.id, payload) : await financeApi.createAccount(payload)
        toast.success(this.account ? 'Account updated' : 'Account created')
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the account')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.mono {
  font-family: var(--font-mono);
}
.opt {
  color: var(--text-3);
  font-weight: 400;
}
.ui-modal__body {
  display: grid;
  gap: 14px;
}
</style>
