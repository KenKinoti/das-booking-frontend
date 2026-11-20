<template>
  <Teleport to="body">
    <div v-if="open" class="fbsrc-backdrop" @click.self="$emit('close')">
      <aside ref="panel" class="fb fbsrc" role="dialog" aria-modal="true" aria-labelledby="fbsrc-title" tabindex="-1" data-test="fb-sources" @keydown.esc="$emit('close')">
        <header class="fbsrc__head">
          <div>
            <h2 id="fbsrc-title">Sources</h2>
            <p>Where every figure on this page comes from, and when it was fetched. Times in {{ tz }}.</p>
          </div>
          <button type="button" class="ui-btn ui-btn--icon ui-btn--ghost" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="fbsrc__body">
          <div v-for="g in groups" :key="g.provider" class="fbsrc__group">
            <h3>{{ g.label }}</h3>
            <ul>
              <li v-for="(s, i) in g.items" :key="i" :data-source="s.object">
                <div class="fbsrc__row">
                  <span class="fbsrc__obj">{{ s.object }}<template v-if="s.id"> · <span class="fb-muted">{{ s.id }}</span></template></span>
                  <span v-if="s.stale" class="fb-pill fb-pill--warn">Stale</span>
                  <span v-else class="fb-pill fb-pill--good">Fresh</span>
                </div>
                <div v-if="s.endpoint" class="fbsrc__ep"><code>{{ s.endpoint }}</code></div>
                <div class="fbsrc__meta">
                  Fetched {{ fmtDateTime(s.fetched_at, tz) }} ({{ ago(s.fetched_at, now) }})
                  <template v-if="s.updated_at"> · bookmaker updated {{ fmtDateTime(s.updated_at, tz) }}</template>
                </div>
                <div v-if="s.note" class="fbsrc__meta">{{ s.note }}</div>
                <a v-if="s.url" :href="s.url" target="_blank" rel="noopener noreferrer" class="fbsrc__link">Provider documentation <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
              </li>
            </ul>
          </div>
          <p class="fb-muted fb-small">
            API-Football (api-sports.io, v3) supplies fixtures, results, statistics, line-ups, injuries, players, standings and some bookmakers' odds; The Odds API (v4) supplies more
            bookmakers, including Pinnacle. Prices marked “manual” were typed in by someone in your organisation from a bookmaker's app. DASYIN's model is computed here from the
            stored results.
          </p>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script>
import { fmtDateTime, ago } from '../fb'

const LABELS = { apifootball: 'API-Football', oddsapi: 'The Odds API', dasyin: 'DASYIN model' }

export default {
  name: 'SourcesPanel',
  props: {
    open: { type: Boolean, default: false },
    sources: { type: Array, default: () => [] },
    tz: { type: String, default: 'Africa/Nairobi' },
    now: { type: String, default: '' }
  },
  emits: ['close'],
  computed: {
    groups() {
      const by = new Map()
      for (const s of this.sources) {
        const k = s.provider.startsWith('manual') ? 'manual' : s.provider
        if (!by.has(k)) by.set(k, { provider: k, label: LABELS[k] || (k === 'manual' ? 'Typed in by your organisation' : k), items: [] })
        by.get(k).items.push(s)
      }
      return [...by.values()]
    }
  },
  watch: {
    open(v) {
      if (v) this.$nextTick(() => this.$refs.panel?.focus())
    }
  },
  methods: { fmtDateTime, ago }
}
</script>

<style scoped>
.fbsrc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1060;
  background: rgba(10, 12, 24, 0.45);
  display: flex;
  justify-content: flex-end;
}
.fbsrc {
  width: min(520px, 100vw);
  height: 100%;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  outline: none;
}
.fbsrc__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--border);
}
.fbsrc__head h2 {
  margin: 0;
  font-size: 18px;
}
.fbsrc__head p {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 12.5px;
}
.fbsrc__body {
  overflow-y: auto;
  padding: 12px 20px 24px;
}
.fbsrc__group h3 {
  font-size: 13px;
  font-weight: 650;
  margin: 12px 0 6px;
  color: var(--text-2);
}
.fbsrc__group ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}
.fbsrc__group li {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 11px;
}
.fbsrc__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.fbsrc__obj {
  font-weight: 600;
  font-size: 13px;
}
.fbsrc__ep code {
  font-size: 11.5px;
  color: var(--text-2);
  background: var(--bg-subtle);
  padding: 1px 6px;
  border-radius: 6px;
  word-break: break-all;
}
.fbsrc__meta {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 3px;
}
.fbsrc__link {
  font-size: 12px;
}
</style>
