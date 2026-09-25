<template>
  <section class="ui-card dm" data-testid="duplicates-card">
    <div class="ui-card__head dm__head">
      <div>
        <h2><i class="fa-solid fa-code-merge dm__ico"></i> Duplicate check &amp; merge</h2>
        <p class="pf-muted pf-small m0">Organisations with the same name (ignoring case, punctuation and “Pty Ltd”), ABN or email. Merging moves every record into the organisation you keep.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn ui-btn--sm" :disabled="loading" @click="load"><i :class="loading ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Re-scan</button>
        <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Close duplicate check" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>

    <div class="ui-card__body">
      <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      <div v-else-if="loading && !groups.length">
        <div v-for="n in 2" :key="n" class="ui-skeleton" style="height: 120px; margin-bottom: 12px"></div>
      </div>
      <div v-else-if="!groups.length" class="ui-empty dm__empty" data-testid="duplicates-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-circle-check"></i></div>
        <h3>No likely duplicates</h3>
        <p>Checked {{ scanned }} organisation-scoped tables — every organisation looks unique.</p>
      </div>

      <div v-for="g in groups" :key="g.key" class="dm__group" data-testid="duplicate-group">
        <div class="dm__group-head">
          <strong>{{ g.organizations.length }} organisations</strong>
          <span v-for="r in g.reasons" :key="r" class="ui-badge ui-badge--warning">{{ r }}</span>
        </div>

        <div class="dm__orgs" role="radiogroup" :aria-label="`Choose which organisation to keep`">
          <div v-for="o in g.organizations" :key="o.id" class="dm__org" :class="{ 'is-keep': sel[g.key].keep === o.id, 'is-merge': isMerged(g, o) }">
            <label class="dm__keep">
              <input type="radio" :name="`keep-${g.key}`" :value="o.id" :checked="sel[g.key].keep === o.id" :data-testid="`keep-${o.id}`" @change="setKeep(g, o.id)" />
              <span>{{ sel[g.key].keep === o.id ? 'Keep' : 'Keep this' }}</span>
            </label>
            <div class="dm__org-main">
              <div class="dm__org-title">
                <strong>{{ o.name }}</strong>
                <span v-if="o.is_own" class="ui-badge ui-badge--info">You are here</span>
                <span v-if="o.status === 'suspended'" class="ui-badge ui-badge--danger">Suspended</span>
                <code class="pf-muted" :title="o.id">#{{ o.id.slice(0, 6) }}</code>
              </div>
              <div class="pf-muted pf-small">
                Created {{ fmtDate(o.created_at) }}<template v-if="o.country_code"> · {{ o.country_code }} / {{ o.currency }}</template><template v-if="o.admin_emails.length"> · {{ o.admin_emails.slice(0, 2).join(', ') }}<template v-if="o.admin_emails.length > 2"> +{{ o.admin_emails.length - 2 }}</template></template>
              </div>
              <div class="dm__counts">
                <span class="dm__count dm__count--users"><strong>{{ o.users }}</strong> user{{ o.users === 1 ? '' : 's' }}</span>
                <span v-for="c in topCounts(o)" :key="c.table" class="dm__count"><strong>{{ c.n }}</strong> {{ c.label }}</span>
                <span class="dm__count pf-muted"><strong>{{ o.total_records }}</strong> records in total</span>
              </div>
            </div>
            <label v-if="sel[g.key].keep !== o.id" class="dm__merge ui-switch">
              <input v-model="sel[g.key].merge[o.id]" type="checkbox" :disabled="o.is_own" :data-testid="`merge-${o.id}`" />
              <span>{{ o.is_own ? 'Your session — keep it' : 'Merge into kept' }}</span>
            </label>
          </div>
        </div>

        <!-- Preview (dry run) -->
        <div v-if="preview[g.key]" class="dm__preview" data-testid="merge-preview">
          <h3>What will happen</h3>
          <ul class="dm__summary">
            <li><i class="fa-solid fa-right-long"></i><span><strong>{{ preview[g.key].total_moved }}</strong> records move to <strong>{{ keepName(g) }}</strong>, including <strong>{{ preview[g.key].users_moved }}</strong> user{{ preview[g.key].users_moved === 1 ? '' : 's' }}.</span></li>
            <li v-for="m in preview[g.key].merged" :key="m.id"><i class="fa-regular fa-building"></i><span>{{ m.name }}: {{ m.moved }} records → then archived (status “merged”).</span></li>
            <li v-if="preview[g.key].filled_fields.length"><i class="fa-solid fa-fill-drip"></i><span>Fills empty details: {{ preview[g.key].filled_fields.join(', ') }}.</span></li>
            <li v-for="w in preview[g.key].warnings" :key="w" class="dm__warn"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ w }}</span></li>
          </ul>
          <details v-if="movedTables(g).length" class="dm__details">
            <summary>Records by table ({{ movedTables(g).length }})</summary>
            <ul class="dm__tables">
              <li v-for="t in movedTables(g)" :key="t.table"><span>{{ t.label }}</span><span class="pf-muted">{{ t.moved }} moved<template v-if="t.dropped"> · {{ t.dropped }} dropped</template><template v-if="t.renumbered"> · {{ t.renumbered }} renumbered</template></span></li>
            </ul>
          </details>
          <div v-if="preview[g.key].renumbered.length" class="dm__block" data-testid="merge-renumbered">
            <h4><i class="fa-solid fa-hashtag"></i> Renumbered to avoid clashes ({{ preview[g.key].renumbered.length }})</h4>
            <ul class="dm__renum">
              <li v-for="r in preview[g.key].renumbered.slice(0, 50)" :key="r.table + r.id"><span class="pf-muted">{{ r.label }}</span> <code>{{ r.from }}</code> → <code>{{ r.to }}</code></li>
            </ul>
            <p v-if="preview[g.key].renumbered.length > 50" class="pf-muted pf-small">…and {{ preview[g.key].renumbered.length - 50 }} more.</p>
          </div>
          <div v-if="preview[g.key].dropped.length" class="dm__block">
            <h4><i class="fa-regular fa-trash-can"></i> Not moved (the kept organisation's copy wins)</h4>
            <ul class="dm__renum">
              <li v-for="(d, i) in preview[g.key].dropped" :key="i">{{ d.label }} × {{ d.count }} <span class="pf-muted">from {{ d.from }} — {{ d.reason }}</span></li>
            </ul>
          </div>
          <div class="ui-field dm__confirm">
            <label :for="`confirm-${g.key}`">Type <strong>{{ keepName(g) }}</strong> to confirm the merge</label>
            <input :id="`confirm-${g.key}`" v-model="sel[g.key].confirm" class="ui-input" autocomplete="off" spellcheck="false" data-testid="merge-confirm" />
          </div>
        </div>

        <div v-if="sel[g.key].error" class="ui-alert ui-alert--danger dm__err"><i class="fa-solid fa-circle-exclamation"></i><span>{{ sel[g.key].error }}</span></div>

        <div class="dm__actions">
          <span class="pf-muted pf-small">{{ mergeIds(g).length ? `Merging ${mergeIds(g).length} into ${keepName(g)}` : 'Pick at least one organisation to merge' }}</span>
          <div class="ui-actions">
            <button class="ui-btn" :disabled="!mergeIds(g).length || !!sel[g.key].busy" data-testid="merge-preview-btn" @click="dryRun(g)">
              <i :class="sel[g.key].busy === 'preview' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-eye'"></i> {{ preview[g.key] ? 'Refresh preview' : 'Preview merge' }}
            </button>
            <button
              class="ui-btn ui-btn--danger"
              :disabled="!preview[g.key] || sel[g.key].confirm.trim() !== keepName(g) || !!sel[g.key].busy"
              data-testid="merge-run-btn"
              @click="merge(g)"
            >
              <i :class="sel[g.key].busy === 'merge' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-code-merge'"></i> Merge
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { platformAPI } from '@/services/platform'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

// Tables worth showing first in the per-organisation counts.
const PRIORITY = ['customers', 'billing_invoices', 'bookings', 'products', 'pos_transactions', 'services', 'events', 'hr_employees', 'bills', 'smallbiz_entries', 'suppliers', 'pm_projects']

export default {
  name: 'DuplicateMerge',
  emits: ['close', 'merged', 'count'],
  data() {
    return { groups: [], labels: {}, scanned: 0, loading: false, error: '', sel: {}, preview: {} }
  },
  created() {
    this.load()
  },
  methods: {
    fmtDate: formatDate,
    async load() {
      this.loading = true
      this.error = ''
      try {
        const res = await platformAPI.duplicates()
        this.labels = res.labels || {}
        this.scanned = res.tables_scanned || 0
        const sel = {}
        for (const g of res.groups || []) {
          const merge = {}
          for (const o of g.organizations) if (o.id !== g.suggested_keep_id) merge[o.id] = !o.is_own
          sel[g.key] = { keep: g.suggested_keep_id || g.organizations[0].id, merge, confirm: '', busy: '', error: '' }
        }
        this.sel = sel
        this.preview = {}
        this.groups = res.groups || []
        this.$emit('count', this.groups.length)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not check for duplicates')
      } finally {
        this.loading = false
      }
    },
    topCounts(o) {
      const out = []
      for (const t of PRIORITY) if (o.counts[t]) out.push({ table: t, n: o.counts[t], label: (this.labels[t] || t).toLowerCase() })
      return out.slice(0, 6)
    },
    isMerged(g, o) {
      return this.sel[g.key].keep !== o.id && !!this.sel[g.key].merge[o.id]
    },
    setKeep(g, id) {
      const s = this.sel[g.key]
      s.keep = id
      const merge = {}
      for (const o of g.organizations) if (o.id !== id) merge[o.id] = o.is_own ? false : s.merge[o.id] !== false
      s.merge = merge
      s.confirm = ''
      s.error = ''
      this.preview = { ...this.preview, [g.key]: null }
    },
    keepName(g) {
      return g.organizations.find((o) => o.id === this.sel[g.key].keep)?.name || ''
    },
    mergeIds(g) {
      const s = this.sel[g.key]
      return g.organizations.filter((o) => o.id !== s.keep && s.merge[o.id]).map((o) => o.id)
    },
    movedTables(g) {
      const p = this.preview[g.key]
      if (!p) return []
      const by = {}
      for (const m of p.merged) {
        for (const t of m.tables) {
          if (!by[t.table]) by[t.table] = { table: t.table, label: t.label, moved: 0, dropped: 0, renumbered: 0 }
          const x = by[t.table]
          x.moved += t.moved
          x.dropped += t.dropped
          x.renumbered += t.renumbered
        }
      }
      return Object.values(by).sort((a, b) => b.moved - a.moved)
    },
    body(g, dryRun) {
      const s = this.sel[g.key]
      return { keep_id: s.keep, merge_ids: this.mergeIds(g), dry_run: dryRun, confirm_name: dryRun ? '' : s.confirm.trim() }
    },
    async dryRun(g) {
      const s = this.sel[g.key]
      s.busy = 'preview'
      s.error = ''
      try {
        const rep = await platformAPI.merge(this.body(g, true))
        this.preview = { ...this.preview, [g.key]: rep }
      } catch (e) {
        s.error = apiErrorMessage(e, 'Could not preview the merge')
      } finally {
        s.busy = ''
      }
    },
    async merge(g) {
      const s = this.sel[g.key]
      if (s.confirm.trim() !== this.keepName(g)) return
      s.busy = 'merge'
      s.error = ''
      try {
        const rep = await platformAPI.merge(this.body(g, false))
        toast.success(`Merged ${rep.merged.length} organisation${rep.merged.length === 1 ? '' : 's'} into ${rep.keep.name} · ${rep.total_moved} records moved`)
        this.$emit('merged', rep)
        await this.load()
      } catch (e) {
        s.error = apiErrorMessage(e, 'The merge failed and nothing was changed')
      } finally {
        s.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.dm {
  margin-bottom: 20px;
}

.dm__head {
  align-items: flex-start;
  gap: 12px;
}

.dm__head h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dm__ico {
  color: var(--accent);
}

.m0 {
  margin: 4px 0 0;
}

.dm__empty {
  padding: 28px 16px;
}

.dm__group {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px;
  margin-bottom: 16px;
  background: var(--surface);
}

.dm__group:last-child {
  margin-bottom: 0;
}

.dm__group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.dm__orgs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dm__org {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.dm__org.is-keep {
  border-color: var(--success);
  background: var(--success-soft);
}

.dm__org.is-merge {
  border-style: dashed;
}

.dm__keep {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 64px;
  flex-shrink: 0;
  font-size: 11.5px;
  color: var(--text-3);
  cursor: pointer;
  text-align: center;
}

.dm__keep input {
  width: 18px;
  height: 18px;
  accent-color: var(--success);
}

.is-keep .dm__keep span {
  color: var(--success);
  font-weight: 650;
}

.dm__org-main {
  flex: 1;
  min-width: 0;
}

.dm__org-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.dm__org-title strong {
  overflow-wrap: anywhere;
}

.dm__counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.dm__count {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.dm__count--users {
  border-color: var(--accent);
  color: var(--text);
}

.dm__merge {
  flex-shrink: 0;
  font-size: 12.5px;
  align-self: center;
}

.dm__preview {
  margin-top: 14px;
  padding: 14px;
  border-radius: var(--radius);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}

.dm__preview h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.dm__preview h4 {
  margin: 12px 0 6px;
  font-size: 13px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.dm__summary,
.dm__tables,
.dm__renum {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
}

.dm__summary li {
  display: flex;
  gap: 8px;
  padding: 3px 0;
  color: var(--text-2);
}

.dm__summary li i {
  color: var(--text-3);
  margin-top: 3px;
  width: 14px;
  flex-shrink: 0;
}

.dm__warn,
.dm__summary li.dm__warn i {
  color: var(--warning);
}

.dm__details {
  margin-top: 8px;
  font-size: 13px;
}

.dm__details summary {
  cursor: pointer;
  color: var(--accent);
}

.dm__tables li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}

.dm__renum li {
  padding: 2px 0;
  overflow-wrap: anywhere;
}

.dm__renum code {
  font-size: 12px;
}

.dm__confirm {
  margin: 14px 0 0;
  max-width: 420px;
}

.dm__err {
  margin-top: 12px;
}

.dm__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

@media (max-width: 640px) {
  .dm__org {
    flex-wrap: wrap;
  }

  .dm__keep {
    flex-direction: row;
    width: auto;
  }

  .dm__merge {
    width: 100%;
  }

  .dm__actions .ui-actions {
    width: 100%;
  }

  .dm__actions .ui-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
