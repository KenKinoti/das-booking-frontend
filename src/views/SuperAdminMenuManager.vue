<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Navigation map</h1>
        <p>Every menu group and page in the app, the module that unlocks it, and what a given organisation sees.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/module-management" class="ui-btn"><i class="fa-solid fa-puzzle-piece"></i> Entitlements</router-link>
        <router-link to="/super-admin/plans" class="ui-btn ui-btn--primary"><i class="fa-solid fa-tags"></i> Plans & pricing</router-link>
      </div>
    </header>

    <div class="ui-alert info-alert">
      <i class="fa-solid fa-circle-info"></i>
      <span>The menu is defined in the app and filtered per organisation: a page is shown only when the organisation's plan includes its module. Pages without a module are always available. Super admins see everything.</span>
    </div>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-layer-group"></i></span>Menu groups</div>
        <div class="ui-kpi__value">{{ groups.length }}</div>
        <div class="ui-kpi__meta">{{ platformGroups }} platform-admin only</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-bars-staggered"></i></span>Pages</div>
        <div class="ui-kpi__value">{{ itemCount }}</div>
        <div class="ui-kpi__meta">{{ guardedCount }} require a plan module</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-puzzle-piece"></i></span>Modules in use</div>
        <div class="ui-kpi__value">{{ moduleKeys.length }}</div>
        <div class="ui-kpi__meta">Entitlement units referenced by the menu</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-eye"></i></span>Preview</div>
        <div class="ui-kpi__value preview-value">{{ previewOrg ? visibleForPreview : itemCount }}</div>
        <div class="ui-kpi__meta">{{ previewOrg ? `pages visible to ${previewOrg.name}` : 'Pick an organisation to preview' }}</div>
      </div>
    </div>

    <section class="ui-card">
      <div class="pf-toolbar">
        <div class="ui-input-group pf-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="q" class="ui-input" type="search" placeholder="Search pages or routes…" aria-label="Search pages" />
        </div>
        <div class="pf-toolbar__right">
          <select v-model="moduleFilter" class="ui-select pf-select" aria-label="Module">
            <option value="">All modules</option>
            <option value="__none">No module (always on)</option>
            <option v-for="k in moduleKeys" :key="k" :value="k">{{ moduleName(k) }}</option>
          </select>
          <select v-model="previewId" class="ui-select pf-select" aria-label="Preview as organisation" :disabled="!orgs.length">
            <option value="">Preview as… (everything)</option>
            <option v-for="o in orgs" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>
        </div>
      </div>

      <div v-if="orgError" class="ui-card__body" style="padding-bottom: 0">
        <div class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ orgError }} The map below still reflects the app's menu.</span></div>
      </div>

      <div v-if="!filteredGroups.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-magnifying-glass"></i></div>
        <h3>No pages match</h3>
        <p>Try a different search or module.</p>
      </div>

      <div v-else class="groups">
        <div v-for="g in filteredGroups" :key="g.id" class="group">
          <div class="group__head">
            <span class="group__icon"><i :class="g.icon"></i></span>
            <h3>{{ g.label }}</h3>
            <span v-if="g.superAdmin" class="ui-badge ui-badge--converted sm">Super admin</span>
            <span class="pf-muted pf-small">{{ g.items.length }} page{{ g.items.length === 1 ? '' : 's' }}</span>
          </div>
          <ul class="items">
            <li v-for="i in g.items" :key="i.to" :class="{ 'is-hidden': previewOrg && !visible(g, i) }">
              <i :class="i.icon" class="item__icon"></i>
              <span class="item__text">
                <router-link :to="i.to" class="item__label">{{ i.label }}</router-link>
                <code class="pf-mono pf-muted">{{ i.to }}</code>
              </span>
              <span class="item__right">
                <span v-if="i.module && i.module !== 'core'" class="mod-chip"><i class="fa-solid fa-puzzle-piece"></i> {{ moduleName(i.module) }}</span>
                <span v-else class="mod-chip mod-chip--core">{{ g.superAdmin ? 'Platform' : 'Always on' }}</span>
                <template v-if="previewOrg">
                  <span v-if="visible(g, i)" class="vis vis--on" title="Visible"><i class="fa-solid fa-eye"></i></span>
                  <span v-else class="vis vis--off" title="Hidden for this organisation"><i class="fa-solid fa-eye-slash"></i></span>
                </template>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import '@/components/platform/platform.css'
import { navGroups } from '@/navigation'
import { apiErrorMessage } from '@/services/api'
import { platformAPI, ensurePlatformSession } from '@/services/platform'

export default {
  name: 'SuperAdminMenuManager',
  data: () => ({ q: '', moduleFilter: '', previewId: '', orgs: [], modules: [], orgError: '' }),
  computed: {
    groups() {
      return navGroups
    },
    platformGroups() {
      return navGroups.filter((g) => g.superAdmin).length
    },
    itemCount() {
      return navGroups.reduce((s, g) => s + g.items.length, 0)
    },
    guardedCount() {
      return navGroups.reduce((s, g) => s + g.items.filter((i) => i.module && i.module !== 'core').length, 0)
    },
    moduleKeys() {
      const set = new Set()
      navGroups.forEach((g) => g.items.forEach((i) => i.module && set.add(i.module)))
      return Array.from(set)
    },
    previewOrg() {
      return this.orgs.find((o) => o.id === this.previewId) || null
    },
    visibleForPreview() {
      return navGroups.reduce((s, g) => s + g.items.filter((i) => this.visible(g, i)).length, 0)
    },
    filteredGroups() {
      const q = this.q.trim().toLowerCase()
      return navGroups
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => {
            if (q && !`${i.label} ${i.to} ${g.label}`.toLowerCase().includes(q)) return false
            if (this.moduleFilter === '__none') return !i.module || i.module === 'core'
            if (this.moduleFilter && i.module !== this.moduleFilter) return false
            return true
          })
        }))
        .filter((g) => g.items.length)
    }
  },
  created() {
    if (ensurePlatformSession()) {
      window.location.reload()
      return
    }
    this.loadOrgs()
  },
  methods: {
    async loadOrgs() {
      try {
        const res = await platformAPI.modules()
        this.orgs = res.organizations || []
        this.modules = res.modules || []
      } catch (e) {
        this.orgError = apiErrorMessage(e, 'Organisation plans could not be loaded, so previews are unavailable.')
      }
    },
    moduleName(k) {
      if (k === 'core') return 'Core'
      return this.modules.find((m) => m.key === k)?.name || k.charAt(0).toUpperCase() + k.slice(1)
    },
    visible(g, i) {
      const o = this.previewOrg
      if (!o) return true
      if (g.superAdmin) return false
      if (!i.module || i.module === 'core') return true
      return (o.modules || []).includes(i.module)
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

.kpi-info { background: var(--info-soft); color: var(--info); }

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(420px, 100%), 1fr));
  gap: 16px;
  padding: 16px;
}

.group {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
}

.group__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}

.group__head h3 {
  font-size: 14px;
  font-weight: 650;
  margin: 0;
  flex: 1;
}

.group__icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.items li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  transition: opacity 0.15s;
}

.items li:last-child {
  border-bottom: 0;
}

.items li.is-hidden {
  opacity: 0.45;
}

.item__icon {
  width: 18px;
  text-align: center;
  color: var(--text-3);
}

.item__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.item__label {
  font-weight: 550;
  color: var(--text);
  text-decoration: none;
  font-size: 14px;
}

.item__label:hover {
  color: var(--accent);
}

.item__text code {
  font-size: 11.5px;
  background: none;
  padding: 0;
}

.item__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mod-chip {
  font-size: 11.5px;
  font-weight: 550;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  white-space: nowrap;
}

.mod-chip i {
  font-size: 10px;
}

.mod-chip--core {
  background: var(--neutral-soft);
  color: var(--text-3);
}

.vis {
  width: 24px;
  text-align: center;
}

.vis--on {
  color: var(--success);
}

.vis--off {
  color: var(--text-3);
}

.ui-badge.sm {
  height: 20px;
  font-size: 11px;
  padding: 0 8px;
}

.preview-value {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .groups {
    grid-template-columns: 1fr;
    padding: 12px;
  }
}
</style>
