<template>
  <div class="sos">
    <label class="sos__row">
      <span class="sos__text">
        <strong>Seasonal themes</strong>
        <small>
          Holiday and festival looks — Halloween, Christmas, Mashujaa Day, Eid, Diwali and more — on buttons, the top bar and a small corner ornament, for everyone in
          {{ orgName || 'your organisation' }}. National days follow your business country<template v-if="countryName"> ({{ countryName }})</template>. Invoices, printouts and
          customer pages are never themed.
        </small>
      </span>
      <span class="ui-switch">
        <input type="checkbox" :checked="on" :disabled="!canEdit || saving || !loaded" data-testid="org-seasons" aria-label="Seasonal themes for the organisation" @change="save($event.target.checked)" />
        <span class="sos__state">{{ on ? 'On' : 'Off' }}</span>
      </span>
    </label>
    <p class="sos__status" data-testid="org-seasons-status">
      <i :class="statusIcon" aria-hidden="true"></i>
      <span>{{ status }}</span>
    </p>
    <p v-if="loaded && !canEdit" class="sos__hint"><i class="fa-solid fa-lock" aria-hidden="true"></i> Only the organisation's owners and admins can change this. You can still choose for yourself in <router-link to="/profile">My profile</router-link>.</p>
    <p v-else-if="loaded" class="sos__hint">People can still choose for themselves in My profile.</p>
    <p v-if="error" class="sos__error" role="alert">{{ error }}</p>
  </div>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { season, saveOrgSeasons, loadSeasonSettings, refreshSeason } from '@/composables/useSeason'
import { seasonLabel } from './themes'
import { formatDate } from '@/utils/format'

const COUNTRY = { KE: 'Kenya', AU: 'Australia' }

export default {
  name: 'SeasonOrgSettings',
  props: { orgName: { type: String, default: '' } },
  data() {
    return { loaded: false, saving: false, error: '', country: '' }
  },
  computed: {
    on() {
      return season.settings.org !== false
    },
    canEdit() {
      return !!season.settings.can_edit_org
    },
    countryName() {
      if (!this.country) return ''
      try {
        return COUNTRY[this.country] || new Intl.DisplayNames(undefined, { type: 'region' }).of(this.country)
      } catch {
        return this.country
      }
    },
    status() {
      if (!this.loaded) return 'Loading…'
      if (season.settings.global === false) return 'Seasonal themes are switched off for every organisation at the moment.'
      if (!this.on) return 'Off for your organisation.'
      const o = season.reason !== 'preview' && season.active ? season.occasion : null
      if (o) return `Showing now: ${o.name} (${seasonLabel(o.theme)} theme, until ${formatDate(o.theme_to)}).`
      return 'On — nothing to celebrate today, so the normal look shows.'
    },
    statusIcon() {
      return this.on && season.settings.global !== false ? 'fa-solid fa-wand-magic-sparkles' : 'fa-solid fa-power-off'
    }
  },
  async mounted() {
    try {
      const d = await loadSeasonSettings()
      this.country = d.country || ''
      await refreshSeason({ force: true })
    } catch (err) {
      this.error = apiErrorMessage(err, 'Could not load the seasonal themes setting')
    } finally {
      this.loaded = true
    }
  },
  methods: {
    async save(on) {
      this.saving = true
      this.error = ''
      try {
        await saveOrgSeasons(on)
        toast.success(on ? 'Seasonal themes are on for your organisation' : 'Seasonal themes are off for your organisation')
      } catch (err) {
        this.error = apiErrorMessage(err, 'Could not save the setting')
        toast.error(this.error)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sos__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}

.sos__text strong {
  display: block;
  color: var(--text);
}

.sos__text small {
  display: block;
  margin-top: 2px;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.5;
}

.sos__state {
  min-width: 24px;
  font-weight: 600;
  color: var(--text-2);
}

.sos__status {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  color: var(--text-2);
  font-size: 13px;
}

.sos__status i {
  margin-top: 2px;
  color: var(--accent);
}

.sos__hint {
  margin: 10px 0 0;
  color: var(--text-3);
  font-size: 12.5px;
}

.sos__error {
  margin: 8px 0 0;
  color: var(--danger);
  font-size: 13px;
}
</style>
