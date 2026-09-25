<template>
  <section v-if="visible" class="rsp" role="region" aria-labelledby="rsp-title" data-testid="region-setup">
    <div class="rsp__icon" aria-hidden="true"><i class="fa-solid fa-earth-africa"></i></div>
    <div class="rsp__body">
      <h2 id="rsp-title">Where is your business based?</h2>
      <p>We use it for your currency and time zone across invoices, POS, bookings, events and reports.</p>
      <form class="rsp__form" @submit.prevent="save">
        <div class="ui-field rsp__country">
          <label for="rsp-country">Country</label>
          <CountryPicker id="rsp-country" v-model="country" :clearable="false" placeholder="Choose a country" @change="onCountry" />
        </div>
        <div class="ui-field rsp__currency">
          <label for="rsp-currency">Currency</label>
          <select id="rsp-currency" v-model="currency" class="ui-select">
            <optgroup v-for="g in groups" :key="g.region" :label="g.region">
              <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
            </optgroup>
          </select>
        </div>
        <div class="rsp__actions">
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="!country || saving">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save
          </button>
          <button type="button" class="ui-btn ui-btn--ghost" :disabled="saving" @click="dismiss">Not now</button>
        </div>
      </form>
      <p v-if="error" class="rsp__error" role="alert">{{ error }}</p>
    </div>
  </section>
</template>

<script>
import CountryPicker from '@/components/customers/CountryPicker.vue'
import { currencyGroups, currencyForCountry, CURRENCY_CODES } from '@/utils/currencies'
import { orgDefaults } from '@/utils/orgDefaults'
import { saveOrgPrefs } from '@/composables/useOrgPrefs'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const KEY = 'region_prompt_dismissed'

function dismissedFor(org) {
  try {
    return (JSON.parse(localStorage.getItem(KEY) || '[]') || []).includes(org)
  } catch {
    return false
  }
}

/**
 * One-time prompt for admins of an organisation that has never said where
 * it is based. Saving sets the organisation's country and home currency
 * (PUT /org/prefs); "Not now" hides it for this organisation on this device.
 */
export default {
  name: 'RegionSetupPrompt',
  components: { CountryPicker },
  data() {
    return { prefs: orgDefaults, country: '', currency: '', saving: false, error: '', dismissed: false, groups: currencyGroups() }
  },
  computed: {
    visible() {
      const p = this.prefs
      if (!p.loaded || !p.needsSetup || !p.canEdit || !p.orgId || this.dismissed) return false
      if (['/settings', '/organizations'].includes(this.$route.path)) return false
      return !dismissedFor(p.orgId)
    }
  },
  watch: {
    'prefs.orgId': {
      immediate: true,
      handler() {
        this.dismissed = false
        this.country = this.prefs.source === 'inferred' ? this.prefs.countryCode : ''
        this.currency = this.prefs.currency || 'AUD'
      }
    },
    'prefs.loaded'(v) {
      if (v && !this.country && this.prefs.source === 'inferred') this.country = this.prefs.countryCode
      if (v) this.currency = this.prefs.currency || this.currency
    }
  },
  methods: {
    onCountry(code) {
      const c = currencyForCountry(code || this.country)
      if (c && CURRENCY_CODES.includes(c)) this.currency = c
    },
    async save() {
      if (!this.country) return
      this.saving = true
      this.error = ''
      try {
        const p = await saveOrgPrefs({ country_code: this.country, currency: this.currency })
        toast.success(`Saved — new invoices, sales and bookings will use ${p.currency}`)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save your country')
      } finally {
        this.saving = false
      }
    },
    dismiss() {
      try {
        const list = JSON.parse(localStorage.getItem(KEY) || '[]') || []
        list.push(this.prefs.orgId)
        localStorage.setItem(KEY, JSON.stringify(list.slice(-20)))
      } catch {
        /* storage unavailable: hide for this session only */
      }
      this.dismissed = true
    }
  }
}
</script>

<style scoped>
.rsp {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  max-width: 1320px;
  margin: 0 auto 20px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.rsp__icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 17px;
}

.rsp__body {
  flex: 1;
  min-width: 0;
}

.rsp h2 {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 650;
}

.rsp p {
  margin: 0 0 12px;
  color: var(--text-2);
  font-size: 13.5px;
}

.rsp__form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.rsp__country {
  flex: 1 1 240px;
  min-width: 0;
  margin: 0;
}

.rsp__currency {
  flex: 1 1 200px;
  min-width: 0;
  margin: 0;
}

.rsp__actions {
  display: flex;
  gap: 8px;
}

.rsp__error {
  margin: 10px 0 0 !important;
  color: var(--danger) !important;
}

@media (max-width: 600px) {
  .rsp {
    padding: 14px;
    gap: 12px;
  }

  .rsp__icon {
    display: none;
  }

  .rsp__actions {
    width: 100%;
  }

  .rsp__actions .ui-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
