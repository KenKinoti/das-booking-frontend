<template>
  <div class="bs" data-testid="bar-step">
    <div v-if="loading" aria-busy="true">
      <div class="ui-skeleton" style="height: 44px; margin-bottom: 10px"></div>
      <div class="ui-skeleton" style="height: 44px; margin-bottom: 10px"></div>
      <div class="ui-skeleton" style="height: 180px"></div>
    </div>

    <div v-else-if="loadError" class="ui-alert ui-alert--danger" role="alert">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a> — or skip this step and set up your bars later in Bar stock.</span>
    </div>

    <template v-else>
      <!-- Locations -->
      <section class="bs__sec" aria-labelledby="bs-h-locs">
        <div class="bs__sec-head">
          <h2 id="bs-h-locs"><i class="fa-solid fa-warehouse"></i> Bars &amp; store</h2>
          <p>The <strong>main store</strong> receives deliveries. <strong>Bars</strong> are where the till takes stock from when a drink is sold.</p>
        </div>
        <div class="bs__locs" role="list" aria-label="Bars and stores">
          <div v-for="(l, i) in locations" :key="l.key" class="bs__loc" role="listitem" :data-testid="`bar-loc-${i}`">
            <div class="ui-field bs__loc-name">
              <label :for="`bs-loc-${i}`" class="sr-only">Name of location {{ i + 1 }}</label>
              <input :id="`bs-loc-${i}`" v-model.trim="l.name" class="ui-input" :class="{ 'is-invalid': errors.rows[i] }" maxlength="80" placeholder="e.g. Rooftop bar" autocomplete="off" @input="clearRow(i)" />
            </div>
            <div class="ui-field bs__loc-type">
              <label :for="`bs-lt-${i}`" class="sr-only">Type of {{ l.name || `location ${i + 1}` }}</label>
              <select :id="`bs-lt-${i}`" v-model="l.type" class="ui-select">
                <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <label class="bs__main" :class="{ 'is-on': l.main }">
              <input type="radio" name="bs-main" :checked="l.main" :aria-label="`${l.name || 'This location'} is the main store`" @change="setMain(i)" />
              <span>Main store</span>
            </label>
            <span v-if="l.existing" class="bs__lock" title="Already set up — remove it in Bar stock → Setup"><i class="fa-solid fa-lock"></i><span class="sr-only">Already set up</span></span>
            <button v-else type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Remove ${l.name || `location ${i + 1}`}`" :disabled="locations.length === 1" @click="removeRow(i)"><i class="fa-regular fa-trash-can"></i></button>
            <p v-if="errors.rows[i]" class="field-error bs__loc-err">{{ errors.rows[i] }}</p>
          </div>
        </div>
        <div class="bs__loc-foot">
          <button type="button" class="ui-btn ui-btn--sm" data-testid="bar-add-loc" @click="addRow"><i class="fa-solid fa-plus"></i> Add a bar or store</button>
          <span v-if="existingCount" class="ui-hint"><i class="fa-solid fa-circle-info"></i> {{ existingCount === 1 ? 'One location is' : `${existingCount} locations are` }} already set up — rename here, remove in Bar stock → Setup.</span>
        </div>
        <p v-if="errors.locations" class="field-error" role="alert">{{ errors.locations }}</p>
      </section>

      <!-- Measures -->
      <section class="bs__sec bs__measures" aria-label="Tot size and business day">
        <div class="ui-field">
          <label for="bs-tot">Tot size</label>
          <div class="bs__suffix">
            <input id="bs-tot" v-model.number="totMl" class="ui-input" type="number" min="5" max="100" step="0.5" inputmode="decimal" :class="{ 'is-invalid': errors.tot_ml }" />
            <span>ml</span>
          </div>
          <span v-if="errors.tot_ml" class="field-error">{{ errors.tot_ml }}</span>
          <span class="ui-hint">The measure you pour for one tot (a single). A 750 ml bottle gives {{ totsPerBottle }} tots at this size.</span>
        </div>
        <div class="ui-field">
          <label for="bs-cutoff">Business day ends at</label>
          <input id="bs-cutoff" v-model="dayCutoff" class="ui-input bs__time" type="time" step="900" :class="{ 'is-invalid': errors.day_cutoff }" />
          <span v-if="errors.day_cutoff" class="field-error">{{ errors.day_cutoff }}</span>
          <span class="ui-hint">Sales before this time count for the previous night — a sale at 02:30 on Saturday belongs to Friday night.</span>
        </div>
      </section>

      <!-- Starter stock list -->
      <section class="bs__sec" aria-labelledby="bs-h-cat">
        <div class="bs__sec-head bs__sec-head--row">
          <div>
            <h2 id="bs-h-cat"><i class="fa-solid fa-bottle-droplet"></i> Starter stock list</h2>
            <p>Common drinks and bar supplies, without prices. Tick what you stock — costs come in with your first delivery.</p>
          </div>
          <span class="ui-badge ui-badge--info bs__count" data-testid="bar-selected-count">{{ selectedCount }} of {{ catalog.length }} selected</span>
        </div>

        <div v-if="!catalog.length" class="ui-empty bs__empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-wine-bottle"></i></div>
          <h3>No starter list available</h3>
          <p>Add your stock items in Bar stock after the setup.</p>
        </div>
        <template v-else>
          <div class="bs__tools">
            <div class="ui-input-group bs__search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="q" class="ui-input" type="search" placeholder="Search drinks, e.g. whisky, Tusker, 500 ml" aria-label="Search the starter stock list" data-testid="bar-search" />
            </div>
            <div class="bs__tool-btns">
              <button type="button" class="ui-btn ui-btn--sm" data-testid="bar-select-all" @click="selectShown(true)"><i class="fa-regular fa-square-check"></i> {{ q ? 'Select shown' : 'Select all' }}</button>
              <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" data-testid="bar-select-none" @click="selectShown(false)">{{ q ? 'Clear shown' : 'Select none' }}</button>
            </div>
          </div>

          <div v-for="g in groups" :key="g.category" class="bs__group" :data-category="g.category">
            <div class="bs__group-head">
              <strong>{{ g.label }}</strong>
              <small>{{ groupSelected(g) }}/{{ g.items.length }}</small>
              <span class="bs__spacer"></span>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :aria-label="`Select all ${g.label}`" @click="selectGroup(g, true)">All</button>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :aria-label="`Select no ${g.label}`" @click="selectGroup(g, false)">None</button>
            </div>
            <div class="bs__items">
              <label v-for="it in g.items" :key="it.key" class="bs__item" :class="{ 'is-on': isOn(it.key), 'is-existing': existing.has(it.key) }" :data-key="it.key">
                <input type="checkbox" :checked="isOn(it.key)" :disabled="existing.has(it.key)" @change="toggle(it.key)" />
                <span class="bs__item-text">
                  <strong>{{ it.name }}</strong>
                  <small>{{ unitText(it) }}<template v-if="existing.has(it.key)"> · in your list</template></small>
                </span>
              </label>
            </div>
          </div>
          <p v-if="!groups.length" class="ui-hint bs__nomatch">Nothing in the starter list matches “{{ q }}”. You can add your own items in Bar stock later.</p>

          <div class="bs__menu">
            <label class="ui-switch">
              <input v-model="makeMenu" type="checkbox" data-testid="bar-make-menu" />
              <span>Also create tot and bottle menu items for spirits</span>
            </label>
            <p class="ui-hint">
              <template v-if="spirits">For each of the {{ spirits === 1 ? 'spirit' : `${spirits} spirits` }} you ticked: “… tot” ({{ totLabel }}) and “… bottle” on the till, each linked to its stock. </template>
              <template v-else>Tick some spirits above to get their tot and bottle menu items. </template>
              Check the selling prices in Bar stock → Menu &amp; recipes before your first sale.
            </p>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<script>
import api, { apiErrorMessage, listFrom } from '@/services/api'
import {
  LOCATION_TYPES,
  DEFAULT_TOT_ML,
  DEFAULT_DAY_CUTOFF,
  defaultLocations,
  locationRow,
  locationsFromExisting,
  changedLocations,
  validateBarSetup,
  groupCatalog,
  unitText,
  existingCatalogKeys,
  spiritsSelected,
  normaliseCutoff,
  buildSetupPayload,
  summarise
} from './barSetup'

const data = (r) => (r && r.data && Object.prototype.hasOwnProperty.call(r.data, 'data') ? r.data.data : r?.data)

/**
 * Setup wizard step for the nightclub / bar / lounge type: bars & store,
 * tot size, business-day cutoff and the starter stock list → POST /bar/setup.
 * The wizard calls save() on Continue; it resolves true (done), 'stay'
 * (validation) or throws (API error, shown by the wizard).
 */
export default {
  name: 'BarSetupStep',
  emits: ['saved'],
  data() {
    return {
      loading: true,
      loadError: '',
      types: LOCATION_TYPES,
      locations: defaultLocations(),
      totMl: DEFAULT_TOT_ML,
      dayCutoff: DEFAULT_DAY_CUTOFF,
      catalog: [],
      selected: new Set(),
      existing: new Set(),
      q: '',
      makeMenu: true,
      errors: { rows: {} }
    }
  },
  computed: {
    groups() {
      return groupCatalog(this.catalog, this.q)
    },
    selectedCount() {
      return this.catalog.filter((c) => this.isOn(c.key)).length
    },
    spirits() {
      return spiritsSelected(this.catalog, this.selected)
    },
    totsPerBottle() {
      const t = Number(this.totMl)
      return t > 0 ? Math.floor(750 / t) : '—'
    },
    totLabel() {
      return `${Number(this.totMl) || DEFAULT_TOT_ML} ml`
    },
    existingCount() {
      return this.locations.filter((l) => l.existing).length
    }
  },
  created() {
    this.load()
  },
  methods: {
    unitText,
    async load() {
      this.loading = true
      this.loadError = ''
      try {
        const [cat, locs, settings, items] = await Promise.all([
          api.get('/bar/setup/catalog').then((r) => listFrom(r, 'catalog', 'items')),
          api.get('/bar/locations').then((r) => listFrom(r, 'locations', 'items')).catch(() => []),
          api.get('/bar/settings').then(data).catch(() => null),
          api.get('/bar/items').then((r) => listFrom(r, 'items')).catch(() => [])
        ])
        this.catalog = cat.filter((c) => c && c.key && c.name)
        const rows = locationsFromExisting(locs)
        if (rows.length) this.locations = rows
        if (settings) {
          if (Number(settings.tot_ml) > 0) this.totMl = Number(settings.tot_ml)
          if (settings.day_cutoff) this.dayCutoff = normaliseCutoff(settings.day_cutoff)
        }
        this.existing = existingCatalogKeys(this.catalog, items)
        this.selected = new Set(this.existing)
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the bar setup')
      } finally {
        this.loading = false
      }
    },
    isOn(key) {
      return this.selected.has(key)
    },
    toggle(key) {
      if (this.existing.has(key)) return
      const s = new Set(this.selected)
      if (s.has(key)) s.delete(key)
      else s.add(key)
      this.selected = s
    },
    setKeys(keys, on) {
      const s = new Set(this.selected)
      for (const k of keys) {
        if (this.existing.has(k)) continue
        if (on) s.add(k)
        else s.delete(k)
      }
      this.selected = s
    },
    selectGroup(g, on) {
      this.setKeys(
        g.items.map((i) => i.key),
        on
      )
    },
    selectShown(on) {
      this.setKeys(
        this.groups.flatMap((g) => g.items.map((i) => i.key)),
        on
      )
    },
    groupSelected(g) {
      return g.items.filter((i) => this.isOn(i.key)).length
    },
    addRow() {
      const bars = this.locations.filter((l) => l.type === 'bar').length
      this.locations.push(locationRow(bars ? '' : 'Main bar', 'bar', !this.locations.some((l) => l.main)))
      this.$nextTick(() => document.getElementById(`bs-loc-${this.locations.length - 1}`)?.focus())
    },
    removeRow(i) {
      const [gone] = this.locations.splice(i, 1)
      if (gone?.main && this.locations.length) {
        const next = this.locations.find((l) => l.type === 'store') || this.locations[0]
        next.main = true
      }
      this.errors = { ...this.errors, rows: {} }
    },
    setMain(i) {
      this.locations.forEach((l, j) => (l.main = i === j))
      if (this.errors.locations) this.errors = { ...this.errors, locations: '' }
    },
    clearRow(i) {
      if (this.errors.rows[i]) {
        const rows = { ...this.errors.rows }
        delete rows[i]
        this.errors = { ...this.errors, rows }
      }
    },
    /** Validate and apply. Returns true, or 'stay' when the form needs fixing. */
    async save() {
      if (this.loadError) {
        await this.load()
        return 'stay'
      }
      const { ok, errors } = validateBarSetup({ locations: this.locations, tot_ml: this.totMl, day_cutoff: this.dayCutoff })
      this.errors = errors
      if (!ok) {
        this.$nextTick(() => this.$el?.querySelector?.('.is-invalid, .field-error')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }))
        return 'stay'
      }
      // Locations that already exist keep their stock: rename / retype them in place first.
      for (const l of changedLocations(this.locations)) {
        await api.put(`/bar/locations/${l.id}`, { name: l.name.trim(), type: l.type })
        l.original = l.name.trim()
        l.originalType = l.type
      }
      const payload = buildSetupPayload({
        locations: this.locations,
        tot_ml: this.totMl,
        day_cutoff: this.dayCutoff,
        selected: this.selected,
        make_menu_items: this.makeMenu
      })
      const res = await api.post('/bar/setup', payload).then(data)
      const summary = summarise(res, payload)
      // Whatever was just created is "in your list" if the step is shown again.
      this.existing = new Set([...this.existing, ...payload.catalog_keys])
      this.locations.forEach((l) => {
        l.existing = true
        l.original = l.name
        l.originalType = l.type
      })
      this.$emit('saved', summary)
      return true
    }
  }
}
</script>

<style scoped>
.bs__sec {
  padding: 18px 0;
  border-top: 1px solid var(--border);
}

.bs__sec:first-child {
  padding-top: 0;
  border-top: 0;
}

.bs__sec-head h2 {
  margin: 0 0 4px;
  font-size: 15.5px;
}

.bs__sec-head h2 i {
  margin-right: 6px;
  color: var(--text-3);
  font-size: 14px;
}

.bs__sec-head p {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 13.5px;
  max-width: 66ch;
}

.bs__sec-head--row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.bs__count {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.bs__locs {
  display: grid;
  gap: 8px;
}

.bs__loc {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px auto 36px;
  gap: 8px;
  align-items: center;
}

.bs__loc .ui-field {
  margin: 0;
}

.bs__loc-err {
  grid-column: 1 / -1;
  margin: -2px 0 0;
}

.bs__main {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 550;
  white-space: nowrap;
  cursor: pointer;
}

.bs__main.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.bs__main input {
  margin: 0;
  accent-color: var(--accent);
}

.bs__lock {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: var(--text-3);
  font-size: 13px;
}

.bs__loc-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin-top: 10px;
}

.bs__measures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 18px;
}

.bs__suffix {
  position: relative;
  max-width: 160px;
}

.bs__suffix .ui-input {
  padding-right: 40px;
  font-variant-numeric: tabular-nums;
}

.bs__suffix span {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  font-size: 13px;
  pointer-events: none;
}

.bs__time {
  max-width: 160px;
  font-variant-numeric: tabular-nums;
}

.bs__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.bs__search {
  flex: 1 1 260px;
  min-width: 0;
}

.bs__tool-btns {
  display: flex;
  gap: 6px;
}

.bs__group {
  margin-bottom: 14px;
}

.bs__group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}

.bs__group-head strong {
  font-size: 13.5px;
}

.bs__group-head small {
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.bs__spacer {
  flex: 1;
}

.bs__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px;
}

.bs__item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-width: 0;
}

.bs__item:hover {
  border-color: var(--border-strong);
}

.bs__item.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.bs__item.is-existing {
  cursor: default;
  opacity: 0.75;
}

.bs__item input {
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
  flex-shrink: 0;
  accent-color: var(--accent);
}

.bs__item-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.bs__item-text strong {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  overflow-wrap: anywhere;
}

.bs__item-text small {
  color: var(--text-3);
  font-size: 12px;
}

.bs__nomatch {
  margin: 4px 0 12px;
}

.bs__empty {
  padding: 18px 0;
}

.bs__menu {
  margin-top: 8px;
  padding: 12px 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
}

.bs__menu .ui-switch {
  color: var(--text);
  font-weight: 550;
}

.bs__menu .ui-hint {
  margin: 6px 0 0 46px;
}

.field-error {
  color: var(--danger);
  font-size: 12.5px;
}

@media (max-width: 640px) {
  .bs__loc {
    grid-template-columns: minmax(0, 1fr) 36px;
  }

  .bs__loc-name {
    grid-column: 1 / 2;
  }

  .bs__loc-type {
    grid-column: 1 / 2;
    grid-row: 2;
  }

  .bs__main {
    grid-column: 1 / 2;
    grid-row: 3;
    justify-self: start;
  }

  .bs__loc > .ui-btn,
  .bs__lock {
    grid-column: 2;
    grid-row: 1;
  }

  .bs__loc {
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }

  .bs__measures {
    grid-template-columns: minmax(0, 1fr);
  }

  .bs__sec-head--row {
    flex-direction: column;
  }

  .bs__items {
    grid-template-columns: minmax(0, 1fr);
  }

  .bs__menu .ui-hint {
    margin-left: 0;
  }
}
</style>
