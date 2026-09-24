<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Database</h1>
        <p>Live PostgreSQL health and per-table statistics for the application schema.</p>
      </div>
      <div class="ui-actions">
        <span v-if="data" class="pf-muted pf-small">Checked {{ timeAgo(data.checked_at) }}</span>
        <button class="ui-btn" :disabled="loading" @click="load"><i :class="loading ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Refresh</button>
        <button class="ui-btn ui-btn--primary" :disabled="analyzing || !data" @click="analyze">
          <i :class="analyzing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-chart-simple'"></i> Update statistics
        </button>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 20px">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <div class="ui-kpis pf-kpis-5">
      <template v-if="!data">
        <div v-for="n in 5" :key="n" class="ui-kpi"><div class="ui-skeleton" style="width: 50%"></div><div class="ui-skeleton" style="height: 28px; margin-top: 14px; width: 40%"></div></div>
      </template>
      <template v-else>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-hard-drive"></i></span>Database size</div>
          <div class="ui-kpi__value">{{ formatBytes(data.server.size_bytes) }}</div>
          <div class="ui-kpi__meta">{{ data.server.database }} · schema {{ data.server.schema }}</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-table"></i></span>Tables</div>
          <div class="ui-kpi__value">{{ n(data.table_count) }}</div>
          <div class="ui-kpi__meta">{{ n(nonEmpty) }} contain data</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-list-ol"></i></span>Rows</div>
          <div class="ui-kpi__value">{{ n(data.total_rows) }}</div>
          <div class="ui-kpi__meta">Live-row estimate from Postgres statistics</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon" :class="connTone"><i class="fa-solid fa-plug"></i></span>Connections</div>
          <div class="ui-kpi__value">{{ data.server.connections }}<span class="pf-muted small"> / {{ data.server.max_connections }}</span></div>
          <div class="ui-kpi__meta">App pool: {{ data.pool.in_use || 0 }} in use, {{ data.pool.idle || 0 }} idle</div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon" :class="cacheTone"><i class="fa-solid fa-bolt"></i></span>Cache hit ratio</div>
          <div class="ui-kpi__value">{{ data.server.cache_hit_ratio == null ? '—' : (data.server.cache_hit_ratio * 100).toFixed(1) + '%' }}</div>
          <div class="ui-kpi__meta">Share of table reads served from memory</div>
        </div>
      </template>
    </div>

    <div class="layout">
      <section class="ui-card">
        <div class="pf-toolbar">
          <div>
            <h2 class="card-title">Tables</h2>
            <span class="pf-card-sub">{{ data ? `${filteredTables.length} of ${data.tables.length}` : 'Loading…' }}</span>
          </div>
          <div class="pf-toolbar__right">
            <div class="ui-input-group pf-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="q" class="ui-input" type="search" placeholder="Filter tables…" aria-label="Filter tables" />
            </div>
            <select v-model="sort" class="ui-select pf-select" aria-label="Sort tables">
              <option value="size">Largest first</option>
              <option value="rows">Most rows</option>
              <option value="dead">Most dead rows</option>
              <option value="writes">Most writes</option>
              <option value="name">Name A–Z</option>
            </select>
            <label class="ui-switch small-switch"><input v-model="hideEmpty" type="checkbox" /> Hide empty</label>
          </div>
        </div>

        <div v-if="!data" class="ui-card__body">
          <div v-for="i in 8" :key="i" class="pf-sk-row"><div class="ui-skeleton" style="width: 180px"></div><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 80px"></div></div>
        </div>
        <div v-else-if="!filteredTables.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-table"></i></div>
          <h3>No tables match</h3>
          <p>Try a different filter.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Table</th>
                <th class="num">Rows</th>
                <th class="num pf-hide-md">Dead rows</th>
                <th>Size</th>
                <th class="num pf-hide-md">Writes</th>
                <th class="pf-hide-sm">Last analysed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in pagedTables" :key="t.name">
                <td><span class="pf-mono tname">{{ t.name }}</span></td>
                <td class="num">{{ n(t.rows) }}</td>
                <td class="num pf-hide-md" :class="{ 'pf-danger-text': bloated(t) }" :title="bloated(t) ? 'Many dead rows — autovacuum should reclaim them' : ''">{{ n(t.dead_rows) }}</td>
                <td class="size-cell">
                  <div class="size-line">
                    <span class="size-bar"><span :style="{ width: sizePct(t) + '%' }"></span></span>
                    <span class="size-num">{{ formatBytes(t.total_bytes) }}</span>
                  </div>
                  <small class="pf-muted">{{ formatBytes(t.table_bytes) }} data · {{ formatBytes(t.index_bytes) }} indexes</small>
                </td>
                <td class="num pf-hide-md">{{ n(t.inserts + t.updates + t.deletes) }}</td>
                <td class="pf-hide-sm pf-nowrap" :class="{ 'pf-muted': !t.last_analyzed }">{{ t.last_analyzed ? timeAgo(t.last_analyzed) : 'Never' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer v-if="data && filteredTables.length > shown" class="pf-pager">
          <span class="pf-muted">Showing {{ shown }} of {{ filteredTables.length }}</span>
          <button class="ui-btn ui-btn--sm" @click="shown += 50">Show more</button>
        </footer>
      </section>

      <aside class="side">
        <section class="ui-card">
          <div class="ui-card__head"><h2>Server</h2></div>
          <div class="ui-card__body">
            <div v-if="!data" class="ui-skeleton" style="height: 120px"></div>
            <dl v-else class="pf-kv">
              <dt>Version</dt><dd>{{ shortVersion }}</dd>
              <dt>Database</dt><dd class="pf-mono">{{ data.server.database }}</dd>
              <dt>Schema</dt><dd class="pf-mono">{{ data.server.schema }}</dd>
              <dt>Up since</dt><dd>{{ data.server.started_at ? formatDateTime(data.server.started_at) : '—' }}</dd>
              <dt>Pool limit</dt><dd>{{ data.pool.max_open || 'Unlimited' }}</dd>
              <dt>Dead rows</dt><dd>{{ n(data.dead_rows) }}</dd>
            </dl>
          </div>
        </section>

        <section class="ui-card">
          <div class="ui-card__head"><h2>Maintenance</h2></div>
          <div class="ui-card__body ops">
            <div class="op">
              <span class="op__icon ok"><i class="fa-solid fa-chart-simple"></i></span>
              <div>
                <strong>Update statistics</strong>
                <p>Runs <code>ANALYZE</code> on every application table so the query planner has fresh estimates. Read-only for your data and safe while the app is in use.</p>
              </div>
            </div>
            <div class="op">
              <span class="op__icon"><i class="fa-solid fa-shield-halved"></i></span>
              <div>
                <strong>Backups &amp; restore</strong>
                <p>Handled by the database host (for example Cloud SQL automated backups and point-in-time recovery). In-app backup and restore are not offered: the server has no <code>pg_dump</code>/<code>psql</code>, and restoring a live database from a browser is unsafe.</p>
              </div>
            </div>
            <div class="op">
              <span class="op__icon"><i class="fa-solid fa-seedling"></i></span>
              <div>
                <strong>Sample data</strong>
                <p>The seeder is a separate developer tool and is not available on the production server. Destructive operations (truncate, clearing data) are intentionally not exposed here.</p>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script>
import '@/components/platform/platform.css'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import { platformAPI, timeAgo, formatBytes, ensurePlatformSession } from '@/services/platform'

export default {
  name: 'DatabaseAdmin',
  data: () => ({ data: null, loading: false, analyzing: false, error: '', q: '', sort: 'size', hideEmpty: false, shown: 50 }),
  computed: {
    nonEmpty() {
      return (this.data?.tables || []).filter((t) => t.rows > 0).length
    },
    maxBytes() {
      return Math.max(1, ...(this.data?.tables || []).map((t) => t.total_bytes))
    },
    filteredTables() {
      const q = this.q.trim().toLowerCase()
      const list = (this.data?.tables || []).filter((t) => (!q || t.name.toLowerCase().includes(q)) && (!this.hideEmpty || t.rows > 0))
      const by = {
        size: (a, b) => b.total_bytes - a.total_bytes,
        rows: (a, b) => b.rows - a.rows,
        dead: (a, b) => b.dead_rows - a.dead_rows,
        writes: (a, b) => b.inserts + b.updates + b.deletes - (a.inserts + a.updates + a.deletes),
        name: (a, b) => a.name.localeCompare(b.name)
      }[this.sort]
      return [...list].sort(by)
    },
    pagedTables() {
      return this.filteredTables.slice(0, this.shown)
    },
    shortVersion() {
      const v = this.data?.server?.version || ''
      const m = v.match(/PostgreSQL [\d.]+/)
      return m ? m[0] : v || '—'
    },
    connTone() {
      const s = this.data?.server
      if (!s) return ''
      const ratio = s.connections / (Number(s.max_connections) || 100)
      return ratio > 0.8 ? 'kpi-danger' : ratio > 0.6 ? 'kpi-warning' : 'kpi-success'
    },
    cacheTone() {
      const r = this.data?.server?.cache_hit_ratio
      if (r == null) return ''
      return r < 0.9 ? 'kpi-warning' : 'kpi-success'
    }
  },
  watch: {
    q() {
      this.shown = 50
    },
    sort() {
      this.shown = 50
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
    formatDateTime,
    formatBytes,
    timeAgo,
    n(v) {
      return new Intl.NumberFormat().format(Number(v) || 0)
    },
    bloated(t) {
      return t.dead_rows > 50 && t.dead_rows > t.rows * 0.2
    },
    sizePct(t) {
      return Math.max(2, Math.round((t.total_bytes / this.maxBytes) * 100))
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.data = await platformAPI.database()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not read database statistics')
      } finally {
        this.loading = false
      }
    },
    async analyze() {
      const ok = await confirmDialog({
        title: 'Update database statistics?',
        message: `Runs ANALYZE on all ${this.data.table_count} application tables. It does not change any data and usually takes a few seconds.`,
        confirmText: 'Run ANALYZE'
      })
      if (!ok) return
      this.analyzing = true
      try {
        const res = await platformAPI.analyze()
        if (res.failed) toast.warning(`Statistics updated for ${res.tables - res.failed} tables; ${res.failed} failed`)
        else toast.success(`Statistics updated for ${res.tables} tables in ${(res.duration_ms / 1000).toFixed(1)}s`)
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update statistics'))
      } finally {
        this.analyzing = false
      }
    }
  }
}
</script>

<style scoped>
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }
.kpi-danger { background: var(--danger-soft); color: var(--danger); }

.small {
  font-size: 16px;
  font-weight: 500;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-title {
  font-size: 15px;
  font-weight: 650;
  margin: 0;
}

.small-switch {
  font-size: 13px;
}

.tname {
  font-size: 13px;
  color: var(--text);
}

.size-cell {
  min-width: 180px;
}

.size-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.size-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
  min-width: 60px;
}

.size-bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}

.size-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 13px;
  min-width: 64px;
  text-align: right;
}

.ops {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.op {
  display: flex;
  gap: 12px;
}

.op strong {
  font-size: 14px;
}

.op p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}

.op code {
  font-size: 12px;
}

.op__icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--neutral-soft);
  color: var(--text-2);
}

.op__icon.ok {
  background: var(--accent-soft);
  color: var(--accent);
}

@media (max-width: 1560px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .side {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  }
}

@media (max-width: 900px) {
  .side {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
