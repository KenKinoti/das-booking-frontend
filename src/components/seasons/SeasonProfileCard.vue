<template>
  <section class="ui-card spc">
    <div class="ui-card__head">
      <h2><i class="fa-solid fa-holly-berry"></i>&nbsp; Seasonal themes</h2>
    </div>
    <div class="ui-card__body">
      <p class="spc__lead">Holiday and festival looks on buttons, the top bar and a small corner ornament. This is just for you, on every device you sign in on.</p>
      <div class="spc__choices" role="radiogroup" aria-label="Show seasonal themes" data-testid="my-seasons">
        <label v-for="c in choices" :key="c.value" class="spc__choice" :class="{ 'is-on': choice === c.value }">
          <input type="radio" name="my-seasons" :value="c.value" :checked="choice === c.value" :disabled="saving || !loaded" :data-testid="`my-seasons-${c.value}`" @change="save(c.value)" />
          <span class="spc__choice-body">
            <strong>{{ c.label }}</strong>
            <small>{{ c.hint }}</small>
          </span>
        </label>
      </div>
      <p class="spc__status" data-testid="my-seasons-status"><i :class="season.settings.effective ? 'fa-solid fa-wand-magic-sparkles' : 'fa-solid fa-power-off'" aria-hidden="true"></i> {{ status }}</p>
      <p v-if="error" class="spc__error" role="alert">{{ error }}</p>
    </div>
  </section>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { season, saveMySeasons, loadSeasonSettings } from '@/composables/useSeason'

export default {
  name: 'SeasonProfileCard',
  data() {
    return { season, loaded: false, saving: false, error: '' }
  },
  computed: {
    choice() {
      const u = season.settings.user
      return u === true ? 'show' : u === false ? 'hide' : 'org'
    },
    choices() {
      const org = season.settings.org !== false
      return [
        { value: 'org', label: 'Follow my organisation', hint: org ? 'Currently on' : 'Currently off' },
        { value: 'show', label: 'Show', hint: 'Even if my organisation turns them off' },
        { value: 'hide', label: 'Hide', hint: 'Always the normal look' }
      ]
    },
    status() {
      if (!this.loaded) return 'Loading…'
      if (season.settings.global === false) return 'Seasonal themes are switched off on the platform at the moment.'
      if (!season.settings.effective) return 'You see the normal look.'
      const o = season.active && season.reason !== 'preview' ? season.occasion : null
      return o ? `You see seasonal themes — today: ${o.name}.` : 'You see seasonal themes when there is something to celebrate.'
    }
  },
  async mounted() {
    try {
      await loadSeasonSettings()
    } catch (err) {
      this.error = apiErrorMessage(err, 'Could not load your seasonal themes choice')
    } finally {
      this.loaded = true
    }
  },
  methods: {
    async save(value) {
      this.saving = true
      this.error = ''
      try {
        await saveMySeasons(value === 'show' ? true : value === 'hide' ? false : null)
        toast.success(value === 'hide' ? 'Seasonal themes hidden for you' : value === 'show' ? 'Seasonal themes on for you' : 'Following your organisation')
      } catch (err) {
        this.error = apiErrorMessage(err, 'Could not save your choice')
        toast.error(this.error)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.spc .ui-card__head h2 i {
  color: var(--accent);
}

.spc__lead {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 13.5px;
}

.spc__choices {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.spc__choice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.spc__choice:hover {
  background: var(--surface-hover);
}

.spc__choice.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.spc__choice input {
  margin-top: 3px;
  accent-color: var(--accent);
}

.spc__choice-body strong {
  display: block;
  color: var(--text);
  font-size: 13.5px;
}

.spc__choice-body small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.spc__status {
  margin: 14px 0 0;
  color: var(--text-2);
  font-size: 13px;
}

.spc__status i {
  color: var(--accent);
}

.spc__error {
  margin: 8px 0 0;
  color: var(--danger);
  font-size: 13px;
}

@media (max-width: 720px) {
  .spc__choices {
    grid-template-columns: 1fr;
  }
}
</style>
