<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">
          <router-link v-if="group" to="/services/categories" class="crumb">Service categories</router-link>
          <template v-else>Bookings &amp; Services</template>
        </div>
        <h1 class="title">
          <span v-if="group" class="title__icon"><i :class="group.icon"></i></span>
          {{ group ? group.title : 'Services' }}
        </h1>
        <p>{{ group ? `Services in your ${group.title.toLowerCase()} categories.` : 'Your catalogue of bookable services: duration, price and availability.' }}</p>
      </div>
      <div class="ui-actions">
        <router-link v-if="!group" to="/services/categories" class="ui-btn"><i class="fa-solid fa-layer-group"></i> Categories</router-link>
        <button class="ui-btn" :disabled="!filtered.length" title="Download the current list as CSV" @click="exportCsv"><i class="fa-solid fa-download"></i> Export</button>
        <button class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-plus"></i> New service</button>
      </div>
    </header>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-bell-concierge"></i></span>Services</div>
        <div class="ui-kpi__value"><span v-if="loading && !loaded" class="ui-skeleton sk-val"></span><template v-else>{{ all.length }}</template></div>
        <div class="ui-kpi__meta">{{ activeCount }} active · {{ all.length - activeCount }} inactive</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-layer-group"></i></span>Categories</div>
        <div class="ui-kpi__value"><span v-if="loading && !loaded" class="ui-skeleton sk-val"></span><template v-else>{{ categoryNames.length }}</template></div>
        <div class="ui-kpi__meta">{{ categoryNames.slice(0, 3).join(', ') || 'None yet' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-tag"></i></span>Average price</div>
        <div class="ui-kpi__value"><span v-if="loading && !loaded" class="ui-skeleton sk-val"></span><template v-else>{{ money(avgPrice) }}</template></div>
        <div class="ui-kpi__meta">Across active services</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-regular fa-clock"></i></span>Average duration</div>
        <div class="ui-kpi__value"><span v-if="loading && !loaded" class="ui-skeleton sk-val"></span><template v-else>{{ duration(avgDuration) }}</template></div>
        <div class="ui-kpi__meta">Per appointment</div>
      </div>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="status = t.value">
            {{ t.label }} <span class="count">{{ t.count }}</span>
          </button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search services…" aria-label="Search services" />
          </div>
          <select v-model="category" class="ui-select cat" aria-label="Category" @change="syncQuery">
            <option value="">All categories</option>
            <option v-for="c in categoryNames" :key="c" :value="c">{{ c }}</option>
          </select>
          <select v-model="sort" class="ui-select sort" aria-label="Sort">
            <option value="category">By category</option>
            <option value="name">Name A–Z</option>
            <option value="price_desc">Price: high to low</option>
            <option value="price_asc">Price: low to high</option>
            <option value="duration">Duration</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !loaded" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="sk-row">
          <div class="ui-skeleton" style="flex: 2"></div>
          <div class="ui-skeleton" style="width: 120px"></div>
          <div class="ui-skeleton" style="width: 80px"></div>
          <div class="ui-skeleton" style="width: 80px"></div>
        </div>
      </div>

      <div v-else-if="!filtered.length" class="ui-empty">
        <div class="ui-empty__icon"><i :class="group ? group.icon : 'fa-solid fa-bell-concierge'"></i></div>
        <h3>{{ hasFilters ? 'No services match your filters' : group ? `No ${group.title.toLowerCase()} services yet` : 'No services yet' }}</h3>
        <p>{{ hasFilters ? 'Try a different search, category or status.' : 'Create the services you offer so customers can book them.' }}</p>
        <div style="margin-top: 14px">
          <button v-if="hasFilters" class="ui-btn" @click="clearFilters">Clear filters</button>
          <button v-else class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-plus"></i> New service</button>
        </div>
      </div>

      <div v-else class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Service</th>
              <th class="hide-sm">Category</th>
              <th class="num">Duration</th>
              <th class="num">Price</th>
              <th class="hide-md">Status</th>
              <th class="actions-col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in grouped" :key="row.key">
              <tr v-if="row.header" class="group-row">
                <td colspan="6">
                  <span class="group-name">{{ row.header }}</span>
                  <span class="group-count">{{ row.count }}</span>
                </td>
              </tr>
              <tr v-else class="is-clickable" :class="{ 'is-off': !row.s.is_active }" @click="openEdit(row.s)">
                <td>
                  <div class="svc">
                    <span class="svc__icon" :class="{ 'svc__icon--off': !row.s.is_active }"><i :class="iconFor(row.s)"></i></span>
                    <span class="svc__text">
                      <span class="svc__name">
                        {{ row.s.name }}
                        <span v-if="row.s.requires_vehicle" class="tag" title="Asks for a vehicle when booked"><i class="fa-solid fa-car"></i> Vehicle</span>
                      </span>
                      <small v-if="row.s.description">{{ row.s.description }}</small>
                      <small class="show-sm">{{ row.s.category }}</small>
                    </span>
                  </div>
                </td>
                <td class="hide-sm"><span class="cat-pill">{{ row.s.category }}</span></td>
                <td class="num">{{ duration(row.s.duration) }}</td>
                <td class="num"><strong>{{ money(row.s.price) }}</strong></td>
                <td class="hide-md" @click.stop>
                  <label class="ui-switch" :title="row.s.is_active ? 'Deactivate' : 'Activate'">
                    <input type="checkbox" :checked="row.s.is_active" :disabled="busy === row.s.id" :aria-label="`${row.s.name} active`" @change="toggle(row.s)" />
                    <span class="switch-label">{{ row.s.is_active ? 'Active' : 'Inactive' }}</span>
                  </label>
                </td>
                <td class="actions-col" @click.stop>
                  <div class="row-actions">
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit service" aria-label="Edit service" @click="openEdit(row.s)"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon hide-sm" title="Duplicate" aria-label="Duplicate service" :disabled="busy === row.s.id" @click="duplicate(row.s)"><i class="fa-regular fa-copy"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger" title="Delete service" aria-label="Delete service" @click="remove(row.s)"><i class="fa-regular fa-trash-can"></i></button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <ServiceFormModal
      :show="formOpen"
      :service="editing"
      :categories="allCategoryNames"
      :preset-category="category || (group ? group.category : '')"
      :preset-vehicle="!!group?.vehicle"
      @close="formOpen = false"
      @saved="onSaved"
    />
  </div>
</template>

<script>
import ServiceFormModal from './ServiceFormModal.vue'
import { serviceService, formatDuration, SERVICE_GROUPS, groupForCategory } from '@/services/serviceService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatMoney, downloadBlob, isoDate } from '@/utils/format'

export default {
  name: 'ServiceCatalog',
  components: { ServiceFormModal },
  props: {
    /** slug from SERVICE_GROUPS to show one industry group */
    groupSlug: { type: String, default: '' }
  },
  data() {
    return {
      all: [],
      allCategoryNames: [],
      loaded: false,
      loading: false,
      error: '',
      q: this.$route.query.q || '',
      category: this.$route.query.category || '',
      status: 'all',
      sort: 'category',
      busy: null,
      formOpen: false,
      editing: null
    }
  },
  computed: {
    group() {
      return SERVICE_GROUPS.find((g) => g.slug === this.groupSlug) || null
    },
    activeCount() {
      return this.all.filter((s) => s.is_active).length
    },
    categoryNames() {
      return [...new Set(this.all.map((s) => s.category).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    },
    avgPrice() {
      const a = this.all.filter((s) => s.is_active)
      return a.length ? a.reduce((t, s) => t + Number(s.price || 0), 0) / a.length : 0
    },
    avgDuration() {
      const a = this.all.filter((s) => s.is_active)
      return a.length ? Math.round(a.reduce((t, s) => t + Number(s.duration || 0), 0) / a.length) : 0
    },
    tabs() {
      return [
        { value: 'all', label: 'All', count: this.all.length },
        { value: 'active', label: 'Active', count: this.activeCount },
        { value: 'inactive', label: 'Inactive', count: this.all.length - this.activeCount }
      ]
    },
    hasFilters() {
      return !!(this.q || this.category || this.status !== 'all')
    },
    filtered() {
      const q = this.q.trim().toLowerCase()
      let rows = this.all.filter((s) => {
        if (this.status === 'active' && !s.is_active) return false
        if (this.status === 'inactive' && s.is_active) return false
        if (this.category && s.category.toLowerCase() !== this.category.toLowerCase()) return false
        if (q && ![s.name, s.description, s.category].some((v) => String(v || '').toLowerCase().includes(q))) return false
        return true
      })
      const by = {
        name: (a, b) => a.name.localeCompare(b.name),
        price_desc: (a, b) => b.price - a.price,
        price_asc: (a, b) => a.price - b.price,
        duration: (a, b) => a.duration - b.duration,
        category: (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      }
      rows = [...rows].sort(by[this.sort] || by.category)
      return rows
    },
    grouped() {
      if (this.sort !== 'category' || this.category) return this.filtered.map((s) => ({ key: s.id, s }))
      const out = []
      let current = null
      for (const s of this.filtered) {
        if (s.category !== current) {
          current = s.category
          out.push({ key: 'h:' + current, header: current, count: this.filtered.filter((x) => x.category === current).length })
        }
        out.push({ key: s.id, s })
      }
      return out
    }
  },
  watch: {
    groupSlug() {
      this.category = ''
      this.load()
    },
    '$route.query.category'(v) {
      this.category = v || ''
    },
    q() {
      this.syncQuery()
    }
  },
  created() {
    this.load()
    if (this.$route.query.new) this.openCreate()
  },
  methods: {
    money: (v) => formatMoney(v),
    duration: formatDuration,
    iconFor(s) {
      return groupForCategory(s.category + ' ' + s.name)?.icon || 'fa-solid fa-bell-concierge'
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const params = this.group ? { category_match: this.group.match.join(',') } : {}
        const [rows, cats] = await Promise.all([serviceService.list(params), serviceService.categories().catch(() => [])])
        this.all = rows
        this.allCategoryNames = cats.map((c) => c.name)
        this.loaded = true
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load services')
      } finally {
        this.loading = false
      }
    },
    syncQuery() {
      const query = { ...this.$route.query }
      delete query.new
      if (this.q) query.q = this.q
      else delete query.q
      if (this.category) query.category = this.category
      else delete query.category
      this.$router.replace({ query }).catch(() => {})
    },
    clearFilters() {
      this.q = ''
      this.category = ''
      this.status = 'all'
      this.syncQuery()
    },
    openCreate() {
      this.editing = null
      this.formOpen = true
    },
    openEdit(s) {
      this.editing = { ...s }
      this.formOpen = true
    },
    async onSaved() {
      this.formOpen = false
      await this.load()
    },
    async toggle(s) {
      this.busy = s.id
      try {
        const updated = await serviceService.toggleStatus(s.id)
        Object.assign(s, { is_active: updated?.is_active ?? !s.is_active })
        toast.success(`${s.name} ${s.is_active ? 'activated' : 'deactivated'}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the service'))
      } finally {
        this.busy = null
      }
    },
    async duplicate(s) {
      this.busy = s.id
      try {
        const copy = await serviceService.duplicate(s.id)
        toast.success(`Created “${copy?.name || 'copy'}”`)
        await this.load()
        if (copy) this.openEdit(copy)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not duplicate the service'))
      } finally {
        this.busy = null
      }
    },
    async remove(s) {
      const ok = await confirmDialog({
        title: `Delete “${s.name}”?`,
        message: 'It will no longer be available for new bookings. Past bookings keep their details. Tip: deactivate it instead if you might offer it again.',
        confirmText: 'Delete service',
        danger: true
      })
      if (!ok) return
      try {
        await serviceService.remove(s.id)
        toast.success('Service deleted')
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the service'))
      }
    },
    exportCsv() {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const head = ['Name', 'Category', 'Duration (min)', 'Price', 'Active', 'Requires vehicle', 'Description']
      const lines = this.filtered.map((s) => [s.name, s.category, s.duration, Number(s.price).toFixed(2), s.is_active ? 'Yes' : 'No', s.requires_vehicle ? 'Yes' : 'No', s.description].map(esc).join(','))
      downloadBlob(new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv' }), `services-${isoDate()}.csv`)
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

.title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title__icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: inline-grid;
  place-items: center;
  font-size: 16px;
  background: var(--accent-soft);
  color: var(--accent);
}

.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }

.sk-val {
  display: inline-block;
  width: 60px;
  height: 26px;
}

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
  gap: 8px;
  flex-wrap: wrap;
}

.search {
  width: 260px;
}

.cat {
  width: 180px;
}

.sort {
  width: 170px;
}

.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}

.group-row td {
  background: var(--surface-2);
  padding-top: 8px;
  padding-bottom: 8px;
}

.group-name {
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-2);
}

.group-count {
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-3);
  background: var(--neutral-soft);
  border-radius: 999px;
  padding: 1px 7px;
}

.svc {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
}

.svc__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
  font-size: 14px;
}

.svc__icon--off {
  background: var(--neutral-soft);
  color: var(--text-3);
}

.svc__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.svc__name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.svc__text small {
  color: var(--text-3);
  font-size: 12.5px;
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--info);
  background: var(--info-soft);
  padding: 1px 7px;
  border-radius: 999px;
}

.cat-pill {
  display: inline-block;
  font-size: 12.5px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-2);
  white-space: nowrap;
}

.is-off .svc__name,
.is-off td.num {
  color: var(--text-3);
}

.switch-label {
  font-size: 13px;
  min-width: 52px;
}

.actions-col {
  width: 1%;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.danger:hover {
  color: var(--danger);
}

.show-sm {
  display: none !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 960px) {
  .hide-md {
    display: none;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .show-sm {
    display: block !important;
  }
  .search,
  .cat,
  .sort {
    width: 100%;
  }
  .toolbar__right {
    width: 100%;
  }
  .svc {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .ui-kpis {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 20px;
  }
  .ui-kpi__meta {
    display: none;
  }
}
</style>
