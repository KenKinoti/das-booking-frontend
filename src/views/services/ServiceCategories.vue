<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow"><router-link to="/services" class="crumb">Services</router-link></div>
        <h1>Service categories</h1>
        <p>How your services are grouped. Categories are created when you add a service.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/services" class="ui-btn"><i class="fa-solid fa-list"></i> All services</router-link>
        <button class="ui-btn ui-btn--primary" @click="openCreate('')"><i class="fa-solid fa-plus"></i> New service</button>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 20px">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <section v-if="loading && !loaded" class="cat-grid">
      <div v-for="n in 6" :key="n" class="ui-card sk-tile">
        <div class="ui-skeleton" style="width: 40px; height: 40px; border-radius: 12px"></div>
        <div class="ui-skeleton" style="width: 60%; height: 16px; margin-top: 16px"></div>
        <div class="ui-skeleton" style="width: 40%; margin-top: 10px"></div>
      </div>
    </section>

    <section v-else-if="loaded && !categories.length" class="ui-card">
      <div class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-layer-group"></i></div>
        <h3>No categories yet</h3>
        <p>Add your first service and give it a category, like “Hair”, “Massage” or “Logbook service”.</p>
        <button class="ui-btn ui-btn--primary" style="margin-top: 14px" @click="openCreate('')"><i class="fa-solid fa-plus"></i> New service</button>
      </div>
    </section>

    <template v-else-if="loaded">
      <section class="cat-grid">
        <article v-for="c in categories" :key="c.name" class="ui-card tile">
          <div class="tile__top">
            <span class="tile__icon"><i :class="c.icon"></i></span>
            <div class="tile__menu">
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Rename category" :aria-label="`Rename ${c.name}`" @click="openRename(c)"><i class="fa-regular fa-pen-to-square"></i></button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Add a service to this category" :aria-label="`Add service to ${c.name}`" @click="openCreate(c.name)"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <router-link :to="{ path: '/services', query: { category: c.name } }" class="tile__link">
            <h2>{{ c.name }}</h2>
            <p class="tile__count">{{ c.count }} service{{ c.count === 1 ? '' : 's' }}<template v-if="c.inactive"> · {{ c.inactive }} inactive</template></p>
            <dl class="tile__facts">
              <div>
                <dt>Price</dt>
                <dd>{{ c.min === c.max ? money(c.min) : `${money(c.min)} – ${money(c.max)}` }}</dd>
              </div>
              <div>
                <dt>Avg. duration</dt>
                <dd>{{ duration(c.avgDuration) }}</dd>
              </div>
            </dl>
            <ul class="tile__names">
              <li v-for="n in c.names.slice(0, 3)" :key="n">{{ n }}</li>
              <li v-if="c.names.length > 3" class="more">+{{ c.names.length - 3 }} more</li>
            </ul>
            <span class="tile__cta">View services <i class="fa-solid fa-arrow-right"></i></span>
          </router-link>
        </article>
      </section>

      <section class="ui-card views">
        <div class="ui-card__head">
          <h2>Industry views</h2>
          <span class="muted">Shortcut lists that match services by keyword</span>
        </div>
        <div class="views__grid">
          <router-link v-for="g in groups" :key="g.slug" :to="g.path" class="view">
            <span class="view__icon"><i :class="g.icon"></i></span>
            <span class="view__text">
              <strong>{{ g.title }}</strong>
              <small>{{ g.count ? `${g.count} matching service${g.count === 1 ? '' : 's'}` : 'No matching services' }}</small>
            </span>
            <i class="fa-solid fa-chevron-right view__chev"></i>
          </router-link>
        </div>
      </section>
    </template>

    <ServiceFormModal :show="formOpen" :service="null" :categories="categories.map((c) => c.name)" :preset-category="presetCategory" @close="formOpen = false" @saved="onSaved" />

    <div v-if="renaming" class="ui-modal-backdrop" @mousedown.self="renaming = null">
      <form class="ui-modal" role="dialog" aria-modal="true" aria-label="Rename category" @submit.prevent="rename">
        <div class="ui-modal__head">
          <h2>Rename category</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="renaming = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ui-field">
            <label for="rn">New name for “{{ renaming.name }}”</label>
            <input id="rn" ref="rn" v-model.trim="newName" class="ui-input" maxlength="100" />
            <span class="ui-hint">Updates all {{ renaming.count }} service{{ renaming.count === 1 ? '' : 's' }} in this category.</span>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="renaming = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !newName || newName === renaming.name">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Rename
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import ServiceFormModal from '@/components/services/ServiceFormModal.vue'
import { serviceService, formatDuration, SERVICE_GROUPS, groupForCategory } from '@/services/serviceService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatMoney } from '@/utils/format'

export default {
  name: 'ServiceCategories',
  components: { ServiceFormModal },
  data() {
    return { services: [], loaded: false, loading: false, error: '', formOpen: false, presetCategory: '', renaming: null, newName: '', saving: false }
  },
  computed: {
    categories() {
      const map = new Map()
      for (const s of this.services) {
        const key = s.category || 'Uncategorised'
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(s)
      }
      return [...map.entries()]
        .map(([name, list]) => {
          const prices = list.map((s) => Number(s.price) || 0)
          return {
            name,
            count: list.length,
            inactive: list.filter((s) => !s.is_active).length,
            min: Math.min(...prices),
            max: Math.max(...prices),
            avgDuration: Math.round(list.reduce((t, s) => t + (Number(s.duration) || 0), 0) / list.length),
            names: list.map((s) => s.name).sort(),
            icon: groupForCategory(name)?.icon || 'fa-solid fa-layer-group',
            ids: list.map((s) => s.id)
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    groups() {
      return SERVICE_GROUPS.map((g) => ({
        ...g,
        count: this.services.filter((s) => g.match.some((k) => `${s.category} ${s.name}`.toLowerCase().includes(k))).length
      }))
    }
  },
  created() {
    this.load()
  },
  methods: {
    money: (v) => formatMoney(v),
    duration: formatDuration,
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.services = await serviceService.list()
        this.loaded = true
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load services')
      } finally {
        this.loading = false
      }
    },
    openCreate(cat) {
      this.presetCategory = cat
      this.formOpen = true
    },
    async onSaved() {
      this.formOpen = false
      await this.load()
    },
    openRename(c) {
      this.renaming = c
      this.newName = c.name
      this.$nextTick(() => this.$refs.rn?.select())
    },
    async rename() {
      this.saving = true
      try {
        for (const id of this.renaming.ids) await serviceService.update(id, { category: this.newName })
        toast.success(`Renamed to “${this.newName}”`)
        this.renaming = null
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not rename the category'))
        await this.load()
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.crumb {
  color: var(--text-3);
  text-decoration: none;
}

.crumb:hover {
  color: var(--accent);
}

.crumb::after {
  content: ' /';
}

.muted {
  color: var(--text-3);
  font-size: 13px;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.sk-tile {
  padding: 20px;
}

.tile {
  display: flex;
  flex-direction: column;
  padding: 18px 20px 16px;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.tile:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.tile__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.tile__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 17px;
}

.tile__menu {
  display: flex;
  gap: 2px;
}

.tile__link {
  display: flex;
  flex-direction: column;
  flex: 1;
  color: var(--text);
  text-decoration: none;
  margin-top: 14px;
}

.tile h2 {
  font-size: 17px;
  margin: 0;
  letter-spacing: -0.01em;
}

.tile__count {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.tile__facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0 0;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.tile__facts dt {
  font-size: 12px;
  color: var(--text-3);
}

.tile__facts dd {
  margin: 2px 0 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.tile__names {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  align-content: flex-start;
}

.tile__names li {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
}

.tile__names .more {
  color: var(--text-3);
}

.tile__cta {
  margin-top: 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.views__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  margin: 0 -1px -1px 0;
}

.view {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: var(--surface);
  box-shadow: inset 0 -1px 0 var(--border), inset -1px 0 0 var(--border);
  color: var(--text);
  text-decoration: none;
}

.view:hover {
  background: var(--surface-hover);
}

.view__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-2);
}

.view__text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.view__text small {
  color: var(--text-3);
  font-size: 12.5px;
}

.view__chev {
  color: var(--text-3);
  font-size: 12px;
}

.views {
  overflow: hidden;
}
</style>
