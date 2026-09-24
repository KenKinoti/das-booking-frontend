<template>
  <section id="about" class="ui-card about" aria-labelledby="about-title">
    <div class="ui-card__head">
      <h2 id="about-title"><i class="fa-solid fa-circle-info about__head-icon"></i> About {{ appName }}</h2>
      <span class="ui-version">{{ versionLabel }}</span>
    </div>
    <div class="ui-card__body">
      <div class="about__brand">
        <BrandMark :size="44" />
        <div>
          <strong>{{ appName }} {{ versionShort }}</strong>
          <small>Bookings, invoicing, POS, inventory and operations in one place.</small>
        </div>
      </div>

      <dl class="about__facts">
        <div>
          <dt>App version</dt>
          <dd class="tabular">{{ appVersion }}</dd>
        </div>
        <div>
          <dt>Build date</dt>
          <dd>{{ buildDate || '—' }}</dd>
        </div>
        <div>
          <dt>Server version</dt>
          <dd class="tabular">
            <span v-if="backend.loading" class="ui-skeleton about__skel"></span>
            <template v-else-if="backend.version">
              {{ backend.version }}
              <span v-if="backend.version !== appVersion" class="ui-badge ui-badge--warning about__mismatch" title="The app and the server are on different releases">Different release</span>
            </template>
            <span v-else class="about__muted">Unavailable</span>
          </dd>
        </div>
        <div>
          <dt>Server status</dt>
          <dd>
            <span v-if="backend.loading" class="ui-skeleton about__skel"></span>
            <span v-else-if="backend.ok" class="ui-badge ui-badge--success">Online</span>
            <span v-else class="ui-badge ui-badge--danger">Unreachable</span>
          </dd>
        </div>
      </dl>

      <div v-if="!compact" class="about__new">
        <h3>What’s new in {{ versionShort }}</h3>
        <ul>
          <li v-for="h in highlights" :key="h.text"><i :class="h.icon"></i><span>{{ h.text }}</span></li>
        </ul>
        <p class="about__modules">
          <span v-for="m in modules" :key="m" class="about__chip">{{ m }}</span>
        </p>
      </div>
    </div>
  </section>
</template>

<script>
import { API_ORIGIN, APP_NAME } from '@/config'
import { APP_VERSION, VERSION_LABEL, VERSION_SHORT, RELEASE_HIGHLIGHTS, buildDateLabel } from '@/version'
import BrandMark from './BrandMark.vue'

export default {
  name: 'AboutCard',
  components: { BrandMark },
  props: {
    compact: { type: Boolean, default: false }
  },
  data() {
    return {
      appName: APP_NAME,
      appVersion: APP_VERSION,
      versionLabel: VERSION_LABEL,
      versionShort: VERSION_SHORT,
      buildDate: buildDateLabel(),
      highlights: RELEASE_HIGHLIGHTS,
      modules: [
        'New design',
        'Invoicing & quotes',
        'Point of sale',
        'Bookings',
        'Events',
        'Finance & banking',
        'Suppliers & inventory',
        'Analytics & market',
        'Meetings',
        'Projects (Jira)',
        'Plans & tiers',
        'Business hub',
        'Multi-currency',
        'HR',
        'Manufacturing',
        'E-commerce import',
        'Platform admin'
      ],
      backend: { loading: true, ok: false, version: '' }
    }
  },
  async mounted() {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 6000)
      const res = await fetch(`${API_ORIGIN}/health`, { signal: ctrl.signal })
      clearTimeout(t)
      const body = await res.json().catch(() => ({}))
      this.backend = { loading: false, ok: res.ok, version: body.version || '' }
    } catch {
      this.backend = { loading: false, ok: false, version: '' }
    }
  }
}
</script>

<style scoped>
.about {
  scroll-margin-top: calc(var(--topbar-h) + 16px);
}

.about h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.about__head-icon {
  color: var(--accent);
}

.about__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.about__brand strong {
  display: block;
  font-size: 15px;
}

.about__brand small {
  color: var(--text-3);
  font-size: 12.5px;
}

.about__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.about__facts > div {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  min-width: 0;
}

.about__facts dt {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.about__facts dd {
  margin: 2px 0 0;
  font-weight: 650;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.about__muted {
  color: var(--text-3);
  font-weight: 500;
}

.about__skel {
  width: 70px;
  height: 14px;
  display: inline-block;
}

.about__mismatch {
  height: 20px;
  font-size: 11px;
}

.about__new {
  margin-top: 18px;
}

.about__new h3 {
  font-size: 14px;
  margin: 0 0 8px;
}

.about__new ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
  font-size: 13.5px;
  color: var(--text-2);
}

.about__new li {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.about__new li i {
  width: 14px;
  text-align: center;
  color: var(--accent);
  font-size: 12px;
}

.about__modules {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 0;
}

.about__chip {
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--neutral-soft);
  color: var(--text-2);
}
</style>
