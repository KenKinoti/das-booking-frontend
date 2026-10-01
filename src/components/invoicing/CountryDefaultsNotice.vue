<template>
  <div v-if="m && !hidden" class="ui-alert ui-alert--warning cdn" role="status" data-testid="country-mismatch">
    <i class="fa-solid fa-earth-africa"></i>
    <div class="cdn__body">
      <span class="cdn__msg">{{ m.message }}</span>
      <span v-if="m.suggested.note" class="cdn__note">{{ m.suggested.note }}</span>
      <div class="cdn__acts">
        <select v-if="m.timezone && m.suggested.timezones && m.suggested.timezones.length > 1" v-model="tz" class="ui-select cdn__tz" aria-label="Time zone">
          <option v-for="z in m.suggested.timezones" :key="z" :value="z">{{ z.replace(/_/g, ' ') }}</option>
        </select>
        <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="busy" data-testid="country-mismatch-apply" @click="apply">
          <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Update
        </button>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="busy" data-testid="country-mismatch-dismiss" @click="dismiss">Keep my settings</button>
        <span class="cdn__hint">Existing invoices keep their tax.</span>
      </div>
    </div>
  </div>
</template>

<script>
import { countryDefaultsApi } from '@/utils/countryDefaults'
import { refreshOrgPrefs } from '@/composables/useOrgPrefs'
import { toast } from '@/composables/useToast'
import { apiErrorMessage } from '@/services/api'

/** One-time notice when the organisation's tax / time zone don't match its country. */
export default {
  name: 'CountryDefaultsNotice',
  emits: ['applied'],
  data() {
    return { m: null, tz: '', busy: false, hidden: false }
  },
  async mounted() {
    try {
      const p = await countryDefaultsApi.prefs()
      if (p?.mismatch && p.can_edit) {
        this.m = p.mismatch
        this.tz = p.mismatch.suggested.timezone
      }
    } catch {
      /* the notice is optional */
    }
  },
  methods: {
    async apply() {
      this.busy = true
      try {
        await countryDefaultsApi.apply({ tax: this.m.tax, timezone: this.m.timezone ? this.tz : '' })
        await refreshOrgPrefs()
        toast.success('Tax and time zone updated — existing invoices keep their tax')
        this.hidden = true
        this.$emit('applied')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update'))
      } finally {
        this.busy = false
      }
    },
    async dismiss() {
      this.hidden = true
      try {
        await countryDefaultsApi.dismiss(this.m.key)
      } catch {
        /* hidden for this visit anyway */
      }
    }
  }
}
</script>

<style scoped>
.cdn {
  margin-bottom: 14px;
}
.cdn__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.cdn__msg {
  font-weight: 600;
}
.cdn__note {
  font-size: 12.5px;
}
.cdn__acts {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.cdn__tz {
  width: auto;
  min-width: 180px;
  padding-top: 4px;
  padding-bottom: 4px;
}
.cdn__hint {
  font-size: 12px;
  opacity: 0.85;
}
</style>
