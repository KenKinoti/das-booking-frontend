<template>
  <div class="ui-page ui-page--wide st">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Seasonal themes</h1>
        <p>Holiday, festival and shopping-season looks for every organisation. National days follow each organisation's country.</p>
      </div>
      <div class="ui-actions">
        <label class="ui-switch st__global" :title="globalEnabled ? 'Turn seasonal themes off for everyone' : 'Turn seasonal themes on'">
          <input type="checkbox" :checked="globalEnabled" :disabled="savingGlobal || !loaded" data-testid="season-global" aria-label="Seasonal themes on for everyone" @change="setGlobal($event.target.checked)" />
          <span>{{ globalEnabled ? 'On for everyone' : 'Off for everyone' }}</span>
        </label>
        <button class="ui-btn ui-btn--primary" :disabled="!loaded" @click="openEdit(null)"><i class="fa-solid fa-plus"></i> Add occasion</button>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger st__alert"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="loaded && !globalEnabled" class="ui-alert ui-alert--warning st__alert"><i class="fa-solid fa-power-off"></i><span>Seasonal themes are off for everyone. Organisations and people can't turn them on until you switch them back on.</span></div>
    <div v-if="season.preview" class="ui-alert st__alert st__preview" data-testid="season-preview-banner">
      <i class="fa-solid fa-eye"></i>
      <span>Previewing <strong>{{ previewName }}</strong> — only you see it, in this tab. Browse the app to see it everywhere.</span>
      <button class="ui-btn ui-btn--sm" @click="stopPreview"><i class="fa-solid fa-stop"></i> Stop preview</button>
    </div>

    <div class="ui-kpis st__kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label">Showing today</div>
        <div class="ui-kpi__icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="ui-kpi__value st__kpi-text" data-testid="kpi-today">{{ todayLabel }}</div>
        <div class="ui-kpi__meta">{{ todayMeta }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label">Next theme</div>
        <div class="ui-kpi__icon"><i class="fa-regular fa-calendar"></i></div>
        <div class="ui-kpi__value st__kpi-text">{{ next ? next.name : '—' }}</div>
        <div class="ui-kpi__meta">{{ next ? `${formatDate(next.theme_from)} · ${relativeDays(next.theme_from)}` : 'Nothing scheduled' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label">Custom occasions</div>
        <div class="ui-kpi__icon"><i class="fa-solid fa-star"></i></div>
        <div class="ui-kpi__value">{{ custom.length }}</div>
        <div class="ui-kpi__meta">{{ custom.filter((c) => c.enabled).length }} on</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label">Themes switched off</div>
        <div class="ui-kpi__icon"><i class="fa-solid fa-toggle-off"></i></div>
        <div class="ui-kpi__value">{{ offCount }}</div>
        <div class="ui-kpi__meta">of {{ keys.length }} occasions</div>
      </div>
    </div>

    <!-- Themes -->
    <section class="ui-card">
      <div class="ui-card__head">
        <div>
          <h2>Themes</h2>
          <p class="sub">Preview any theme live across the app — only you see a preview.</p>
        </div>
      </div>
      <div class="ui-card__body">
        <div v-if="!loaded && !error" class="st__themes">
          <div v-for="n in 8" :key="n" class="ui-skeleton" style="height: 180px"></div>
        </div>
        <div v-else class="st__themes">
          <article v-for="t in themes" :key="t.key" class="st__theme" :data-theme-key="t.key">
            <SeasonSample :theme="t.key" :greeting="t.label">
              <button
                class="ui-btn ui-btn--primary ui-btn--sm"
                :data-testid="`preview-${t.key}`"
                :aria-pressed="season.preview === t.key"
                @click="season.preview === t.key ? stopPreview() : preview(t.key)"
              >
                <i :class="season.preview === t.key ? 'fa-solid fa-stop' : 'fa-solid fa-eye'"></i>
                {{ season.preview === t.key ? 'Stop preview' : `Preview now` }}
              </button>
            </SeasonSample>
            <div class="st__theme-text">
              <h3>{{ t.label }}</h3>
              <p>{{ t.description }}</p>
              <div class="st__swatches" aria-hidden="true">
                <span :style="{ background: t.accent }" :title="`Light ${t.accent}`"></span>
                <span :style="{ background: t.accent_dark }" :title="`Dark ${t.accent_dark}`"></span>
                <small>{{ usedBy(t.key) }}</small>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Calendar -->
    <section class="ui-card">
      <div class="ui-card__head st__cal-head">
        <div>
          <h2>Calendar</h2>
          <p class="sub">Kenyan and Australian public holidays, observances and shopping seasons. Moon-dependent dates are marked — confirm them closer to the day.</p>
        </div>
      </div>
      <div class="st__toolbar">
        <div class="ui-tabs" role="tablist" aria-label="Year">
          <button v-for="y in years" :key="y" class="ui-tab" :class="{ 'is-active': year === y }" role="tab" :aria-selected="year === y" @click="setYear(y)">{{ y }}</button>
        </div>
        <div class="st__filters">
          <select v-model="country" class="ui-select" aria-label="Country" @change="loadCalendar">
            <option value="">All countries</option>
            <option value="KE">Kenya</option>
            <option value="AU">Australia</option>
          </select>
          <select v-model="kind" class="ui-select" aria-label="Kind">
            <option value="">All kinds</option>
            <option value="public_holiday">Public holidays</option>
            <option value="observance">Observances</option>
            <option value="commercial">Shopping seasons</option>
            <option value="custom">Custom</option>
          </select>
          <div class="ui-input-group st__search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model.trim="q" class="ui-input" type="search" placeholder="Search occasions" aria-label="Search occasions" />
          </div>
        </div>
      </div>
      <div v-if="calLoading" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="ui-skeleton" style="height: 44px; margin-bottom: 8px"></div>
      </div>
      <div v-else-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-regular fa-calendar-xmark"></i></div>
        <h3>No occasions match</h3>
        <p>Try another year, country or kind.</p>
      </div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table" v-table-cards>
          <thead>
            <tr>
              <th>Date</th>
              <th>Occasion</th>
              <th class="hide-sm">Where</th>
              <th>Theme</th>
              <th>Theme on</th>
              <th class="actions-col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in rows" :key="o.key + o.date + (o.countries || []).join() + o.kind" :data-occasion="o.key">
              <td class="st__date">
                <strong>{{ formatDate(o.date) }}</strong>
                <small>{{ weekday(o.date) }}</small>
              </td>
              <td class="card-title">
                <div class="st__occ">
                  <strong>{{ o.name }}</strong>
                  <span class="st__badges">
                    <span class="ui-badge" :class="kindBadge(o.kind)">{{ KIND_LABELS[o.kind] || o.kind }}</span>
                    <span v-if="o.important" class="ui-badge ui-badge--warning" title="Platform announcements nudge you before it"><i class="fa-solid fa-star"></i> Important</span>
                    <span v-if="o.tentative" class="ui-badge ui-badge--info" title="Depends on the moon sighting / lunar calendar">Confirm date</span>
                  </span>
                  <small v-if="o.note" class="st__note">{{ o.note }}</small>
                </div>
              </td>
              <td class="hide-sm card-show">{{ countriesLabel(o) }}</td>
              <td>
                <span v-if="o.theme" class="st__theme-cell">
                  <i :class="seasonIcon(o.theme)"></i>
                  <span>{{ seasonLabel(o.theme) }}<small>{{ windowLabel(o) }}</small></span>
                </span>
                <span v-else class="muted">No theme</span>
              </td>
              <td>
                <label v-if="o.theme" class="ui-switch" :title="o.kind === 'custom' ? 'Show this custom occasion' : 'Show this occasion’s theme (every year)'">
                  <input type="checkbox" :checked="themeOn(o)" :disabled="busyKey === toggleId(o)" :aria-label="`${o.name} theme on`" :data-testid="`toggle-${o.key}`" @change="toggle(o, $event.target.checked)" />
                </label>
              </td>
              <td class="actions-col">
                <button v-if="o.theme" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :title="`Preview ${o.name}`" :aria-label="`Preview ${o.name}`" @click="preview(o.kind === 'custom' ? o.id : o.key)"><i class="fa-regular fa-eye"></i></button>
                <a v-if="o.source" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :href="o.source" target="_blank" rel="noopener noreferrer" :title="`Source: ${host(o.source)}`" :aria-label="`Source for ${o.name}`"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="ui-grid-2 st__grid">
      <!-- Custom occasions -->
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Custom occasions</h2>
            <p class="sub">Your own dates — a launch, an anniversary, a local festival — with any theme and your accent colour.</p>
          </div>
          <button class="ui-btn ui-btn--sm" :disabled="!loaded" @click="openEdit(null)"><i class="fa-solid fa-plus"></i> Add</button>
        </div>
        <div v-if="!custom.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-star"></i></div>
          <h3>No custom occasions</h3>
          <p>Add one to theme the app for your own dates.</p>
        </div>
        <ul v-else class="st__customs">
          <li v-for="c in custom" :key="c.id" :data-custom="c.id">
            <span class="st__custom-icon" :style="c.accent ? { color: c.accent } : null"><i :class="seasonIcon(c.theme)"></i></span>
            <span class="st__custom-text">
              <strong>{{ c.name }}</strong>
              <small>{{ formatDate(c.theme_from) }} – {{ formatDate(c.theme_to) }}{{ c.yearly ? ' · every year' : '' }} · {{ countriesLabel(c) }}</small>
            </span>
            <span class="ui-badge" :class="c.enabled ? 'ui-badge--success' : 'ui-badge--draft'">{{ c.enabled ? 'On' : 'Off' }}</span>
            <span class="st__custom-actions">
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Preview ${c.name}`" title="Preview" @click="preview(c.id)"><i class="fa-regular fa-eye"></i></button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${c.name}`" title="Edit" @click="openEdit(c)"><i class="fa-regular fa-pen-to-square"></i></button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${c.name}`" title="Delete" @click="remove(c)"><i class="fa-regular fa-trash-can"></i></button>
            </span>
          </li>
        </ul>
      </section>

      <!-- What shows when -->
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Check a date</h2>
            <p class="sub">Which theme an organisation sees on a day (before its own and its people's switches).</p>
          </div>
        </div>
        <div class="ui-card__body">
          <div class="st__check">
            <label class="ui-field">
              <span class="ui-label">Date</span>
              <input v-model="check.date" type="date" class="ui-input" data-testid="check-date" @change="resolve" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Organisation in</span>
              <select v-model="check.country" class="ui-select" @change="resolve">
                <option value="KE">Kenya</option>
                <option value="AU">Australia</option>
                <option value="GB">Elsewhere (e.g. United Kingdom)</option>
              </select>
            </label>
          </div>
          <div class="st__result" data-testid="check-result" aria-live="polite">
            <template v-if="check.loading"><i class="fa-solid fa-circle-notch spin"></i> Checking…</template>
            <template v-else-if="check.result">
              <SeasonSample :theme="check.result.theme" :greeting="check.result.greeting" compact>
                <span class="st__result-text"><strong>{{ check.result.name }}</strong> · {{ seasonLabel(check.result.theme) }} theme · {{ windowLabel(check.result) }}</span>
              </SeasonSample>
            </template>
            <p v-else-if="check.done" class="muted"><i class="fa-regular fa-moon"></i> No theme that day — the normal look.</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Add / edit a custom occasion -->
    <div v-if="ed.open" class="ui-modal-backdrop" @mousedown.self="close">
      <form class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-labelledby="so-ed-title" novalidate @submit.prevent="save">
        <div class="ui-modal__head">
          <h2 id="so-ed-title">{{ ed.id ? `Edit ${ed.form.name || 'occasion'}` : 'Add an occasion' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="ed.error" class="ui-alert ui-alert--danger" style="margin-bottom: 14px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ ed.error }}</span></div>
          <div class="st__form">
            <label class="ui-field st__span-2">
              <span class="ui-label">Name *</span>
              <input id="so-name" v-model.trim="ed.form.name" class="ui-input" :class="{ 'is-invalid': ed.field === 'name' }" maxlength="120" placeholder="e.g. DASYIN anniversary" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Date *</span>
              <input id="so-date" v-model="ed.form.date" type="date" class="ui-input" :class="{ 'is-invalid': ed.field === 'date' }" @change="syncWindow" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Theme *</span>
              <select id="so-theme" v-model="ed.form.theme" class="ui-select" :class="{ 'is-invalid': ed.field === 'theme' }">
                <option v-for="t in themes" :key="t.key" :value="t.key">{{ t.label }}</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Theme shows from</span>
              <input id="so-from" v-model="ed.form.theme_from" type="date" class="ui-input" :class="{ 'is-invalid': ed.field === 'theme_from' }" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Theme shows until</span>
              <input id="so-to" v-model="ed.form.theme_to" type="date" class="ui-input" :class="{ 'is-invalid': ed.field === 'theme_to' }" />
            </label>
            <label class="ui-field st__span-2">
              <span class="ui-label">Countries</span>
              <input id="so-countries" v-model="ed.form.countriesText" class="ui-input" :class="{ 'is-invalid': ed.field === 'countries' }" placeholder="Everywhere — or two-letter codes, e.g. KE, AU" />
              <span class="ui-hint">Leave empty for every organisation.</span>
            </label>
            <label class="ui-field st__span-2">
              <span class="ui-label">Greeting in the top bar</span>
              <input id="so-greeting" v-model.trim="ed.form.greeting" class="ui-input" maxlength="140" placeholder="e.g. Happy anniversary, DASYIN" />
            </label>
            <div class="ui-field">
              <span class="ui-label">Accent (light mode)</span>
              <div class="st__colour">
                <input :value="hex(ed.form.accent) || themeOf(ed.form.theme).accent || '#5b4cf0'" type="color" class="st__picker" aria-label="Light-mode accent colour" @input="ed.form.accent = $event.target.value" />
                <input id="so-accent" v-model.trim="ed.form.accent" class="ui-input" :class="{ 'is-invalid': ed.field === 'accent' }" placeholder="Theme default" />
              </div>
              <span class="ui-hint" :class="{ 'st__bad': accentContrast && accentContrast < 4.5 }">{{ accentContrast ? `${accentContrast.toFixed(1)}:1 with white button text ${accentContrast >= 4.5 ? '— passes AA' : '— needs 4.5:1'}` : 'Empty: the theme’s own colours.' }}</span>
            </div>
            <div class="ui-field">
              <span class="ui-label">Accent (dark mode)</span>
              <div class="st__colour">
                <input :value="hex(ed.form.accent_dark) || themeOf(ed.form.theme).accent_dark || '#8b7fff'" type="color" class="st__picker" aria-label="Dark-mode accent colour" @input="ed.form.accent_dark = $event.target.value" />
                <input id="so-accent-dark" v-model.trim="ed.form.accent_dark" class="ui-input" placeholder="Worked out from the light one" />
              </div>
              <span class="ui-hint" :class="{ 'st__bad': darkContrast && darkContrast < 4.5 }">{{ darkContrast ? `${darkContrast.toFixed(1)}:1 on the dark theme ${darkContrast >= 4.5 ? '— passes AA' : '— needs 4.5:1'}` : 'Empty: lightened from the light one.' }}</span>
            </div>
            <label class="ui-field st__span-2">
              <span class="ui-label">Note</span>
              <input v-model.trim="ed.form.note" class="ui-input" maxlength="300" placeholder="Optional — shown in the calendar" />
            </label>
            <div class="st__span-2 st__checks">
              <label class="ui-switch"><input v-model="ed.form.enabled" type="checkbox" /> <span>On</span></label>
              <label class="ui-switch"><input v-model="ed.form.yearly" type="checkbox" /> <span>Every year</span></label>
              <label class="ui-switch"><input v-model="ed.form.important" type="checkbox" /> <span>Important (announcement reminder)</span></label>
            </div>
            <div class="st__span-2">
              <span class="ui-label">Preview</span>
              <SeasonSample :theme="ed.form.theme" :greeting="ed.form.greeting || ed.form.name" compact :style="samplePalette">
                <button type="button" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-solid fa-check"></i> Primary button</button>
                <button type="button" class="ui-btn ui-btn--sm">Secondary</button>
              </SeasonSample>
            </div>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="close">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="ed.saving"><i :class="ed.saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ ed.id ? 'Save' : 'Add occasion' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, relativeDays, isoDate, addDays } from '@/utils/format'
import { season, previewSeason, stopPreview } from '@/composables/useSeason'
import { globalTheme } from '@/composables/useTheme'
import SeasonSample from '@/components/seasons/SeasonSample.vue'
import { seasonIcon, seasonLabel, countriesLabel, KIND_LABELS, contrast } from '@/components/seasons/themes'

function blank(theme = 'new_year') {
  const today = isoDate()
  return { name: '', date: today, theme_from: today, theme_to: today, countriesText: '', theme, greeting: '', accent: '', accent_dark: '', note: '', important: false, enabled: true, yearly: false }
}

export default {
  name: 'SeasonalThemes',
  components: { SeasonSample },
  data() {
    const y = new Date().getFullYear()
    return {
      season,
      KIND_LABELS,
      loaded: false,
      error: '',
      globalEnabled: true,
      savingGlobal: false,
      themes: [],
      keys: [],
      custom: [],
      occasions: [],
      upcoming: [],
      today: '',
      todayKE: null,
      todayAU: null,
      year: y,
      years: [y, y + 1, y + 2],
      country: '',
      kind: '',
      q: '',
      calLoading: false,
      busyKey: '',
      check: { date: isoDate(), country: 'KE', result: null, loading: false, done: false },
      ed: { open: false, id: '', form: blank(), saving: false, error: '', field: '' }
    }
  },
  computed: {
    keyMap() {
      return Object.fromEntries(this.keys.map((k) => [k.key, k]))
    },
    offCount() {
      return this.keys.filter((k) => !k.enabled).length
    },
    rows() {
      const q = this.q.toLowerCase()
      return this.occasions.filter((o) => (!this.kind || o.kind === this.kind) && (!q || `${o.name} ${o.key} ${o.note || ''} ${seasonLabel(o.theme)}`.toLowerCase().includes(q)))
    },
    next() {
      const today = this.today || isoDate()
      return this.upcoming.find((o) => o.theme && o.theme_enabled !== false && String(o.theme_from).slice(0, 10) > today) || null
    },
    todayLabel() {
      const names = [this.todayKE, this.todayAU].filter(Boolean).map((o) => o.name)
      return names.length ? [...new Set(names)].join(' · ') : 'Normal look'
    },
    todayMeta() {
      const part = (o, c) => `${c}: ${o ? seasonLabel(o.theme) : 'none'}`
      return `${part(this.todayKE, 'Kenya')} · ${part(this.todayAU, 'Australia')}`
    },
    previewName() {
      return season.occasion?.name || seasonLabel(season.preview)
    },
    accentContrast() {
      return /^#[0-9a-f]{6}$/i.test(this.ed.form.accent || '') ? contrast(this.ed.form.accent, '#ffffff') : 0
    },
    darkContrast() {
      const c = this.ed.form.accent_dark
      return /^#[0-9a-f]{6}$/i.test(c || '') ? Math.min(contrast(c, '#121521'), contrast(c, '#0d0b1f')) : 0
    },
    // Live preview of a custom accent inside the modal sample.
    samplePalette() {
      const ok = (v) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : '')
      const light = ok(this.ed.form.accent)
      const dark = ok(this.ed.form.accent_dark) || light
      if (!light && !dark) return null
      if (globalTheme.isDark.value) {
        if (!ok(this.ed.form.accent_dark)) return null // the server lightens it on save
        return { '--accent': dark, '--accent-600': `color-mix(in srgb, ${dark} 84%, #fff)`, '--accent-soft': `color-mix(in srgb, ${dark} 14%, transparent)`, '--accent-contrast': '#0d0b1f', '--orn-1': dark }
      }
      if (!light) return null
      return { '--accent': light, '--accent-600': `color-mix(in srgb, ${light} 84%, #000)`, '--accent-soft': `color-mix(in srgb, ${light} 11%, #fff)`, '--accent-contrast': '#ffffff', '--orn-1': light }
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    formatDate,
    relativeDays,
    seasonIcon,
    seasonLabel,
    countriesLabel,
    stopPreview,
    hex(v) {
      return /^#[0-9a-f]{6}$/i.test(v || '') ? v.toLowerCase() : ''
    },
    themeOf(key) {
      return this.themes.find((t) => t.key === key) || {}
    },
    weekday(d) {
      try {
        return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(String(d).slice(0, 10) + 'T00:00:00'))
      } catch {
        return ''
      }
    },
    host(url) {
      try {
        return new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return url
      }
    },
    kindBadge(kind) {
      return { public_holiday: 'ui-badge--success', observance: 'ui-badge--info', commercial: 'ui-badge--partial', custom: 'ui-badge--converted' }[kind] || 'ui-badge--draft'
    },
    windowLabel(o) {
      const f = String(o.theme_from || '').slice(0, 10)
      const t = String(o.theme_to || '').slice(0, 10)
      if (!f) return ''
      return f === t ? formatDate(f, 'short') : `${formatDate(f, 'short')} – ${formatDate(t, 'short')}`
    },
    usedBy(theme) {
      const names = this.keys.filter((k) => k.theme === theme).map((k) => k.name)
      return names.length ? [...new Set(names)].join(', ') : 'Custom occasions'
    },
    themeOn(o) {
      if (o.kind === 'custom') return !!this.custom.find((c) => c.id === o.id)?.enabled
      return this.keyMap[o.key] ? this.keyMap[o.key].enabled : o.theme_enabled
    },
    toggleId(o) {
      return o.kind === 'custom' ? o.id : o.key
    },
    async load() {
      this.error = ''
      try {
        // "Today" is the server's calendar day (the same clock the themes use).
        const [list, ke, au] = await Promise.all([
          api.get('/super-admin/occasions', { params: { from: `${this.year}-01-01`, to: `${this.year}-12-31`, country: this.country || undefined } }),
          api.get('/super-admin/occasions/resolve', { params: { country: 'KE' } }),
          api.get('/super-admin/occasions/resolve', { params: { country: 'AU' } })
        ])
        const d = list.data?.data || {}
        const today = d.today || isoDate()
        if (this.today !== today) this.check.date = today
        this.today = today
        const upcoming = await api.get('/super-admin/occasions', { params: { from: today, to: addDays(today, 400) } })
        this.globalEnabled = d.global_enabled !== false
        this.themes = d.themes || []
        this.keys = d.keys || []
        this.custom = d.custom || []
        this.occasions = d.occasions || []
        this.upcoming = upcoming.data?.data?.occasions || []
        this.todayKE = ke.data?.data?.occasion || null
        this.todayAU = au.data?.data?.occasion || null
        this.loaded = true
        this.resolve()
      } catch (err) {
        this.error = apiErrorMessage(err, 'Could not load seasonal themes')
      }
    },
    async loadCalendar() {
      this.calLoading = true
      try {
        const res = await api.get('/super-admin/occasions', { params: { from: `${this.year}-01-01`, to: `${this.year}-12-31`, country: this.country || undefined } })
        const d = res.data?.data || {}
        this.occasions = d.occasions || []
        this.keys = d.keys || this.keys
        this.custom = d.custom || this.custom
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not load the calendar'))
      } finally {
        this.calLoading = false
      }
    },
    setYear(y) {
      this.year = y
      this.loadCalendar()
    },
    async setGlobal(on) {
      if (!on && !(await confirmDialog({ title: 'Turn seasonal themes off?', message: 'No organisation will see a seasonal theme until you switch them back on.', confirmText: 'Turn off', danger: true }))) {
        this.globalEnabled = true
        return
      }
      this.savingGlobal = true
      try {
        const res = await api.put('/super-admin/occasions/settings', { enabled: on })
        this.globalEnabled = res.data?.data?.global_enabled !== false
        toast.success(this.globalEnabled ? 'Seasonal themes are on' : 'Seasonal themes are off for everyone')
        previewSeason(season.preview)
        this.load()
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not change the setting'))
      } finally {
        this.savingGlobal = false
      }
    },
    async toggle(o, on) {
      this.busyKey = this.toggleId(o)
      try {
        if (o.kind === 'custom') {
          const c = this.custom.find((x) => x.id === o.id)
          if (c) await api.put(`/super-admin/occasions/custom/${c.id}`, { ...this.payloadFrom(c), enabled: on })
        } else {
          await api.put(`/super-admin/occasions/toggles/${o.key}`, { enabled: on })
        }
        toast.success(`${o.name}: theme ${on ? 'on' : 'off'}`)
        await this.loadCalendar()
        previewSeason(season.preview)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not change the theme'))
        await this.loadCalendar()
      } finally {
        this.busyKey = ''
      }
    },
    async preview(key) {
      await previewSeason(key)
      if (season.reason === 'preview') toast.info(`Previewing ${season.occasion?.name || seasonLabel(key)} — only you see it`)
    },
    async resolve() {
      if (!this.check.date) return
      this.check.loading = true
      try {
        const res = await api.get('/super-admin/occasions/resolve', { params: { date: this.check.date, country: this.check.country } })
        this.check.result = res.data?.data?.occasion || null
      } catch (err) {
        this.check.result = null
        toast.error(apiErrorMessage(err, 'Could not check the date'))
      } finally {
        this.check.loading = false
        this.check.done = true
      }
    },
    payloadFrom(c) {
      return {
        name: c.name,
        date: String(c.date).slice(0, 10),
        theme_from: String(c.theme_from).slice(0, 10),
        theme_to: String(c.theme_to).slice(0, 10),
        countries: c.countries || [],
        theme: c.theme,
        accent: c.accent || '',
        accent_dark: c.accent_dark || '',
        greeting: c.greeting || '',
        note: c.note || '',
        important: !!c.important,
        enabled: !!c.enabled,
        yearly: !!c.yearly
      }
    },
    openEdit(c) {
      if (c) {
        const p = this.payloadFrom(c)
        this.ed = { open: true, id: c.id, form: { ...p, countriesText: (c.countries || []).join(', ') }, saving: false, error: '', field: '' }
      } else {
        this.ed = { open: true, id: '', form: blank(this.themes[0]?.key), saving: false, error: '', field: '' }
      }
      this.$nextTick(() => document.getElementById('so-name')?.focus())
    },
    close() {
      if (!this.ed.saving) this.ed.open = false
    },
    syncWindow() {
      const f = this.ed.form
      if (!f.theme_from || f.theme_from > f.date) f.theme_from = f.date
      if (!f.theme_to || f.theme_to < f.date) f.theme_to = f.date
    },
    async save() {
      const f = this.ed.form
      this.ed.error = ''
      this.ed.field = ''
      if (!f.name) {
        this.ed.error = 'Give the occasion a name'
        this.ed.field = 'name'
        return
      }
      if (!f.date) {
        this.ed.error = 'Pick the occasion’s date'
        this.ed.field = 'date'
        return
      }
      const body = {
        ...f,
        countries: f.countriesText
          .split(/[\s,;]+/)
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean)
      }
      delete body.countriesText
      this.ed.saving = true
      try {
        if (this.ed.id) await api.put(`/super-admin/occasions/custom/${this.ed.id}`, body)
        else await api.post('/super-admin/occasions/custom', body)
        toast.success(this.ed.id ? 'Occasion saved' : 'Occasion added')
        this.ed.saving = false
        this.ed.open = false
        await this.load()
        previewSeason(season.preview)
      } catch (err) {
        this.ed.saving = false
        this.ed.error = apiErrorMessage(err, 'Could not save the occasion')
        this.ed.field = err?.response?.data?.field || ''
      }
    },
    async remove(c) {
      const ok = await confirmDialog({ title: `Delete ${c.name}?`, message: 'Its theme stops showing straight away. This cannot be undone.', confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await api.delete(`/super-admin/occasions/custom/${c.id}`)
        toast.success('Occasion deleted')
        if (season.preview === c.id) await stopPreview()
        else previewSeason(season.preview)
        await this.load()
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not delete the occasion'))
      }
    }
  }
}
</script>

<style scoped>
.st__alert {
  margin-bottom: 16px;
}

.st__preview {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border: 1px dashed color-mix(in srgb, var(--accent) 50%, var(--border));
  background: var(--accent-soft);
  color: var(--text);
}

.st__preview > span {
  flex: 1 1 260px;
}

.st__global span {
  white-space: nowrap;
}

.st__kpis {
  margin-bottom: 20px;
}

.st__kpi-text {
  font-size: 18px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.ui-card + .ui-card,
.ui-card + .st__grid,
.st__grid {
  margin-top: 20px;
}

.sub {
  margin: 2px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.st__themes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.st__theme {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.st__theme-text h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  color: var(--text);
}

.st__theme-text p {
  margin: 3px 0 6px;
  color: var(--text-2);
  font-size: 12.5px;
  line-height: 1.45;
}

.st__swatches {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.st__swatches span {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
}

.st__swatches small {
  min-width: 0;
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.st__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 20px 14px;
}

.st__filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.st__filters .ui-select {
  width: auto;
  min-width: 140px;
}

.st__search {
  min-width: 200px;
}

.st__date strong {
  display: block;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.st__date small,
.st__theme-cell small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.st__occ {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.st__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.st__note {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.4;
  max-width: 60ch;
}

.st__theme-cell {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
}

.st__theme-cell > i {
  margin-top: 2px;
  color: var(--accent);
}

.st__customs {
  list-style: none;
  margin: 0;
  padding: 0 8px 8px;
}

.st__customs li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.st__customs li:last-child {
  border-bottom: 0;
}

.st__custom-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
}

.st__custom-text {
  flex: 1 1 auto;
  min-width: 0;
}

.st__custom-text strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.st__custom-text small {
  color: var(--text-3);
  font-size: 12px;
}

.st__custom-actions {
  display: flex;
  gap: 2px;
}

.st__check {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.st__result-text {
  color: var(--text-2);
  font-size: 13px;
}

.st__form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.st__span-2 {
  grid-column: span 2;
}

.st__colour {
  display: flex;
  gap: 8px;
  align-items: center;
}

.st__picker {
  width: 42px;
  height: 38px;
  flex-shrink: 0;
  padding: 2px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  cursor: pointer;
}

.st__bad {
  color: var(--danger);
}

.st__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.muted {
  color: var(--text-3);
}

@media (max-width: 720px) {
  .st__toolbar {
    padding: 0 16px 12px;
  }
  .st__filters,
  .st__filters .ui-select,
  .st__search {
    width: 100%;
  }
  .st__check,
  .st__form {
    grid-template-columns: 1fr;
  }
  .st__span-2 {
    grid-column: auto;
  }
  .st__customs li {
    flex-wrap: wrap;
  }
}
</style>
