<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 560px" role="dialog" aria-modal="true" aria-labelledby="loc-title" data-testid="location-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="loc-title">{{ loc ? `Edit ${loc.name}` : 'Add a location' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <label class="ui-field">
          <span class="ui-label is-required">Name</span>
          <input ref="name" v-model.trim="f.name" class="ui-input" required maxlength="100" placeholder="e.g. VIP bar, Rooftop, Cellar" data-testid="loc-name" />
        </label>
        <div class="ui-field">
          <span class="ui-label">Type</span>
          <div class="types" role="radiogroup" aria-label="Location type">
            <button v-for="t in LOCATION_TYPES" :key="t.key" type="button" class="type" :class="{ 'is-active': f.type === t.key }" role="radio" :aria-checked="f.type === t.key" :data-type="t.key" @click="f.type = t.key">
              <i :class="t.icon"></i><span>{{ t.label }}</span>
            </button>
          </div>
        </div>
        <label v-if="f.type === 'store'" class="ui-switch"><input v-model="f.is_main_store" type="checkbox" data-testid="loc-main" /><span>Main store — deliveries are received here</span></label>
        <label v-else class="ui-switch"><input v-model="f.is_default_bar" type="checkbox" data-testid="loc-default-bar" /><span>Default bar — POS sales that don’t say where they were sold come from here</span></label>
        <div v-if="users.length" class="ui-field">
          <span class="ui-label">Staff who work here</span>
          <span class="ui-hint">Optional. When set, these people only see and count stock at the locations they are assigned to.</span>
          <div class="staff">
            <label v-for="u in users" :key="u.id" class="chk"><input v-model="f.staff_ids" type="checkbox" :value="u.id" /> {{ uname(u) }}</label>
          </div>
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="loc-save">{{ busy ? 'Saving…' : loc ? 'Save' : 'Add location' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { usersService } from '@/services/users'
import { toast } from '@/composables/useToast'
import { LOCATION_TYPES } from '@/utils/barUnits'

export default {
  name: 'LocationModal',
  props: { loc: { type: Object, default: null } },
  emits: ['close', 'saved'],
  data() {
    const l = this.loc || {}
    return {
      LOCATION_TYPES,
      f: { name: l.name || '', type: l.type || 'bar', is_main_store: !!l.is_main_store, is_default_bar: !!l.is_default_bar, staff_ids: [...(l.staff_ids || (l.staff || []).map((s) => s.id || s.user_id).filter(Boolean))] },
      users: [],
      busy: false,
      error: ''
    }
  },
  async created() {
    try {
      const r = await usersService.list({ limit: 200 })
      this.users = (r.users || []).filter((u) => u.is_active !== false)
    } catch {
      this.users = [] // no team permission: staff assignment is optional
    }
  },
  mounted() {
    this.$nextTick(() => this.$refs.name?.focus())
  },
  methods: {
    uname(u) {
      return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
    },
    async save() {
      this.error = ''
      if (!this.f.name) {
        this.error = 'Give the location a name'
        return
      }
      const body = { name: this.f.name, type: this.f.type, is_main_store: this.f.type === 'store' && this.f.is_main_store, is_default_bar: this.f.type !== 'store' && this.f.is_default_bar }
      if (this.users.length) body.staff_ids = this.f.staff_ids
      this.busy = true
      try {
        if (this.loc) await barApi.updateLocation(this.loc.id, body)
        else await barApi.createLocation(body)
        toast.success(this.loc ? `${this.f.name} saved` : `${this.f.name} added`)
        this.$emit('saved')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the location')
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.type i {
  font-size: 16px;
}
.type.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.staff {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 4px 12px;
  max-height: 180px;
  overflow-y: auto;
  padding: 6px 2px;
}
.chk {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13.5px;
}
@media (max-width: 480px) {
  .types {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
