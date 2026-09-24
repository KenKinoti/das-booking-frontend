<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Modules & entitlements</h1>
        <p>Which modules each organisation can use, as enforced by its subscription plan.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="loading" @click="load"><i :class="loading ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Refresh</button>
        <router-link to="/super-admin/plans" class="ui-btn ui-btn--primary"><i class="fa-solid fa-tags"></i> Plans & pricing</router-link>
      </div>
    </header>

    <div class="ui-alert info-alert">
      <i class="fa-solid fa-circle-info"></i>
      <span>Access to a module comes from the organisation's plan (tier, industry bundle and add-ons) and is enforced by the API. To change what an organisation can use, change its plan on <router-link to="/super-admin/plans">Plans & pricing</router-link>.</span>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 20px">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <section class="ui-card" style="margin-bottom: 20px">
      <div class="ui-card__head">
        <div>
          <h2>Module adoption</h2>
          <span class="pf-card-sub">Organisations with access to each module</span>
        </div>
      </div>
      <div class="ui-card__body">
        <div v-if="!data" class="adoption">
          <div v-for="n in 8" :key="n" class="ui-skeleton" style="height: 74px"></div>
        </div>
        <div v-else class="adoption">
          <button v-for="m in data.modules" :key="m.key" class="mod" :class="{ 'is-selected': moduleFilter === m.key, 'is-off': !m.active }" @click="toggleModuleFilter(m.key)">
            <span class="mod__icon"><i :class="m.icon || 'fa-solid fa-puzzle-piece'"></i></span>
            <span class="mod__text">
              <span class="mod__name">{{ m.name }} <span v-if="m.core" class="tag">Core</span><span v-else-if="!m.active" class="tag">Retired</span></span>
              <span class="mod__meta">{{ adoption[m.key] || 0 }} of {{ orgCount }} organisation{{ orgCount === 1 ? '' : 's' }}</span>
              <span class="bar"><span :style="{ width: pctOf(adoption[m.key]) + '%' }"></span></span>
            </span>
          </button>
        </div>
      </div>
    </section>

    <section class="ui-card">
      <div class="pf-toolbar">
        <div>
          <h2 class="card-title">Entitlements by organisation</h2>
          <span class="pf-card-sub">{{ moduleFilter ? `Showing organisations with ${moduleName(moduleFilter)}` : 'Tick = module is available to the organisation' }}</span>
        </div>
        <div class="pf-toolbar__right">
          <div class="ui-input-group pf-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search organisations…" aria-label="Search organisations" />
          </div>
          <select v-model="tier" class="ui-select pf-select" aria-label="Plan tier">
            <option value="">All tiers</option>
            <option v-for="t in (data ? data.tiers : [])" :key="t.key" :value="t.key">{{ t.name }}</option>
          </select>
          <button v-if="moduleFilter" class="ui-btn" @click="moduleFilter = ''"><i class="fa-solid fa-xmark"></i> {{ moduleName(moduleFilter) }}</button>
        </div>
      </div>

      <div v-if="!data && loading" class="ui-card__body">
        <div v-for="n in 5" :key="n" class="pf-sk-row"><div class="ui-skeleton" style="width: 200px"></div><div class="ui-skeleton" style="flex: 1"></div></div>
      </div>
      <div v-else-if="data && !rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-puzzle-piece"></i></div>
        <h3>{{ data.organizations.length ? 'No organisations match' : 'No organisations yet' }}</h3>
        <p>{{ data.organizations.length ? 'Try a different search or filter.' : 'Organisations and their modules will appear here.' }}</p>
      </div>
      <div v-else-if="data" class="ui-table-wrap matrix-wrap">
        <table class="ui-table matrix">
          <thead>
            <tr>
              <th class="sticky">Organisation</th>
              <th>Plan</th>
              <th v-for="m in columns" :key="m.key" class="mcol" :title="m.name">
                <i :class="m.icon || 'fa-solid fa-puzzle-piece'"></i>
                <span>{{ m.name }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in rows" :key="o.id">
              <td class="sticky">
                <router-link :to="`/organizations?open=${o.id}`" class="org-link">
                  <span class="pf-cell__title">{{ o.name }}</span>
                </router-link>
                <span v-if="o.status === 'suspended'" class="ui-badge ui-badge--danger sm">Suspended</span>
              </td>
              <td class="pf-nowrap">
                <template v-if="o.plan">
                  <strong>{{ tierName(o.plan.tier) }}</strong>
                  <span class="ui-badge sm" :class="planBadge(o.plan.status)">{{ o.plan.status }}</span>
                </template>
                <span v-else class="pf-muted">{{ o.error || '—' }}</span>
              </td>
              <td v-for="m in columns" :key="m.key" class="mcell">
                <i v-if="has(o, m.key)" class="fa-solid fa-circle-check yes" :aria-label="`${m.name}: included`"></i>
                <i v-else class="fa-solid fa-minus no" :aria-label="`${m.name}: not included`"></i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import '@/components/platform/platform.css'
import { apiErrorMessage } from '@/services/api'
import { platformAPI, ensurePlatformSession } from '@/services/platform'

export default {
  name: 'ModuleManagement',
  data: () => ({ data: null, loading: false, error: '', q: '', tier: '', moduleFilter: '' }),
  computed: {
    orgCount() {
      return this.data?.organizations?.length || 0
    },
    columns() {
      return (this.data?.modules || []).filter((m) => !m.core)
    },
    adoption() {
      const out = {}
      for (const o of this.data?.organizations || []) for (const k of o.modules || []) out[k] = (out[k] || 0) + 1
      return out
    },
    rows() {
      const q = this.q.trim().toLowerCase()
      return (this.data?.organizations || []).filter((o) => {
        if (q && !o.name.toLowerCase().includes(q)) return false
        if (this.tier && o.plan?.tier !== this.tier) return false
        if (this.moduleFilter && !this.has(o, this.moduleFilter)) return false
        return true
      })
    }
  },
  created() {
    if (ensurePlatformSession()) {
      window.location.reload()
      return
    }
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.data = await platformAPI.modules()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load module entitlements')
      } finally {
        this.loading = false
      }
    },
    has(o, k) {
      return (o.modules || []).includes(k)
    },
    pctOf(n) {
      return this.orgCount ? Math.round(((n || 0) / this.orgCount) * 100) : 0
    },
    moduleName(k) {
      return this.data?.modules?.find((m) => m.key === k)?.name || k
    },
    tierName(k) {
      return this.data?.tiers?.find((t) => t.key === k)?.name || k
    },
    planBadge(s) {
      return { active: 'ui-badge--success', trial: 'ui-badge--info', past_due: 'ui-badge--warning', cancelled: 'ui-badge--danger' }[s] || ''
    },
    toggleModuleFilter(k) {
      this.moduleFilter = this.moduleFilter === k ? '' : k
    }
  }
}
</script>

<style scoped>
.info-alert {
  margin-bottom: 20px;
  background: var(--info-soft);
  color: var(--text-2);
  border: 1px solid var(--border);
}

.info-alert > i {
  color: var(--info);
}

.adoption {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr));
  gap: 12px;
}

.mod {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.mod:hover {
  border-color: var(--border-strong);
}

.mod.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.mod.is-off {
  opacity: 0.6;
}

.mod__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.mod__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.mod__name {
  font-weight: 600;
  font-size: 14px;
}

.mod__meta {
  font-size: 12px;
  color: var(--text-3);
}

.tag {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
  background: var(--neutral-soft);
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 4px;
}

.bar {
  display: block;
  height: 5px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
  margin-top: 4px;
}

.bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}

.card-title {
  font-size: 15px;
  font-weight: 650;
  margin: 0;
}

.matrix th.mcol {
  text-align: center;
  font-size: 11.5px;
  text-transform: none;
  letter-spacing: 0;
  min-width: 104px;
  white-space: normal;
  line-height: 1.25;
  vertical-align: bottom;
}

.matrix th.mcol i {
  display: block;
  font-size: 14px;
  margin-bottom: 6px;
  color: var(--text-2);
}

.matrix td.mcell {
  text-align: center;
}

.yes {
  color: var(--success);
}

.no {
  color: var(--border-strong);
}

.sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--surface);
  min-width: 200px;
}

thead .sticky {
  background: var(--surface-2);
  z-index: 2;
}

.org-link {
  color: var(--text);
  text-decoration: none;
  display: block;
}

.org-link:hover .pf-cell__title {
  color: var(--accent);
}

.ui-badge.sm {
  height: 20px;
  font-size: 11px;
  padding: 0 8px;
  margin-left: 6px;
  text-transform: capitalize;
}

td.sticky .ui-badge.sm {
  margin: 4px 0 0;
}
</style>
