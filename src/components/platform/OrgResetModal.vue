<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <div class="ui-modal orr" role="dialog" aria-modal="true" aria-labelledby="orr-title" data-testid="org-reset-modal">
      <div class="ui-modal__head orr__head">
        <h2 id="orr-title"><i class="fa-solid fa-rotate-left orr__ico" aria-hidden="true"></i> Reset {{ org.name }} for handover</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" :disabled="busy === 'reset'" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- ───────────── result ───────────── -->
      <div v-if="result" class="ui-modal__body" data-testid="org-reset-result">
        <div class="ui-alert ui-alert--success">
          <i class="fa-solid fa-circle-check"></i>
          <span><strong>{{ org.name }} is ready for handover.</strong> {{ n(result.totals.removed) }} test record{{ result.totals.removed === 1 ? '' : 's' }} removed<template v-if="result.totals.updated">, {{ n(result.totals.updated) }} updated</template>.</span>
        </div>
        <ul class="orr__done">
          <li v-for="g in resultGroups" :key="g.key">
            <span>{{ g.label }}</span>
            <span class="orr__num">{{ n(g.rows) }} removed<template v-if="g.updated"> · {{ n(g.updated) }} updated</template></span>
          </li>
        </ul>
        <div class="orr__facts">
          <p><i class="fa-solid fa-wand-magic-sparkles"></i><span>The setup wizard<template v-if="result.hooks.length"> and the getting-started steps</template> will show on the next sign-in of <strong>{{ ownerList(result) }}</strong>.</span></p>
          <p v-if="result.numbering.length"><i class="fa-solid fa-hashtag"></i><span>Numbering restarts: {{ result.numbering.slice(0, 4).map((x) => x.next).join(', ') }}<template v-if="result.numbering.length > 4">…</template></span></p>
          <p v-if="keptLabels(result).length"><i class="fa-solid fa-box-archive"></i><span>Kept: {{ keptLabels(result).join(', ') }}, settings, branding, plan and integrations.</span></p>
        </div>
      </div>

      <!-- ───────────── form ───────────── -->
      <div v-else class="ui-modal__body">
        <p class="orr__intro">
          Use this when you have finished setting up and testing an organisation for a client. It permanently deletes the test records — sales, invoices, bookings, stock
          movements, messages, the activity log and so on — and restarts the numbering, but keeps the organisation, its plan, business type, branding, preferences, email and
          payment settings, integrations and the owners' accounts. The owner is then taken through the setup wizard on their next sign-in.
        </p>

        <div v-if="refusal" class="ui-alert ui-alert--danger" data-testid="org-reset-refused">
          <i class="fa-solid fa-ban"></i><span>{{ refusal }}</span>
        </div>

        <template v-else>
          <fieldset class="orr__opts" :disabled="!!busy">
            <legend>What to keep</legend>
            <label class="ui-switch orr__opt">
              <input v-model="opts.keep_customers" type="checkbox" data-testid="keep-customers" @change="optionsChanged" />
              <span><strong>Keep customers &amp; guests</strong><small>Customers with their contacts and copy (cc) lists, vehicles and participants.</small></span>
            </label>
            <label class="ui-switch orr__opt">
              <input v-model="opts.keep_catalogue" type="checkbox" data-testid="keep-catalogue" @change="optionsChanged" />
              <span><strong>Keep catalogue</strong><small>Products, categories, services, stock items with recipes and par levels, stores and bars, terminals, suppliers and price lists.</small></span>
            </label>
            <label class="ui-switch orr__opt">
              <input v-model="opts.keep_staff" type="checkbox" data-testid="keep-staff" @change="optionsChanged" />
              <span>
                <strong>Keep staff accounts</strong>
                <small v-if="preview && preview.staff_users">Off: {{ preview.staff_users === 1 ? 'the 1 user' : `the ${preview.staff_users} users` }} other than {{ ownerList(preview) || 'the admins' }} {{ preview.staff_users === 1 ? 'is' : 'are' }} removed.</small>
                <small v-else-if="preview">There are no users other than {{ ownerList(preview) || 'the admins' }}.</small>
                <small v-else>Off: every user except the organisation's admins / owners is removed.</small>
              </span>
            </label>
          </fieldset>

          <!-- preview -->
          <section class="orr__preview" aria-live="polite">
            <div class="orr__preview-head">
              <h3>Preview</h3>
              <button type="button" class="ui-btn ui-btn--sm" :disabled="!!busy" data-testid="org-reset-preview" @click="loadPreview">
                <i :class="busy === 'preview' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-eye'"></i> {{ preview ? 'Refresh preview' : 'Preview' }}
              </button>
            </div>

            <div v-if="busy === 'preview' && !preview">
              <div v-for="i in 4" :key="i" class="ui-skeleton" style="height: 34px; margin-bottom: 8px"></div>
            </div>
            <p v-else-if="!preview" class="pf-muted pf-small m0">Run the preview to see exactly what will be removed.</p>

            <template v-else>
              <p v-if="stale" class="orr__stale"><i class="fa-solid fa-rotate"></i> Options changed — refresh the preview.</p>
              <div class="orr__totals" data-testid="org-reset-totals">
                <div class="orr__total orr__total--danger"><strong>{{ n(preview.totals.removed) }}</strong><span>records removed</span></div>
                <div class="orr__total"><strong>{{ n(preview.totals.updated) }}</strong><span>updated</span></div>
                <div class="orr__total orr__total--ok"><strong>{{ n(preview.totals.kept) }}</strong><span>kept (options)</span></div>
              </div>

              <div class="orr__groups" data-testid="org-reset-groups">
                <details v-for="g in shownGroups" :key="g.key" class="orr__group" :class="'is-' + g.action" :data-group="g.key">
                  <summary>
                    <span class="orr__gname">
                      <span class="ui-badge" :class="g.action === 'keep' ? 'ui-badge--success' : 'ui-badge--danger'">{{ g.action === 'keep' ? 'Keep' : 'Remove' }}</span>
                      <span>{{ g.label }}</span>
                    </span>
                    <span class="orr__num">
                      {{ n(g.rows) }}<template v-if="g.updated"> <small class="pf-muted">+{{ n(g.updated) }} upd.</small></template>
                    </span>
                  </summary>
                  <p class="orr__gdesc">{{ g.description }}</p>
                  <ul class="orr__tables">
                    <li v-for="t in tablesOf(g)" :key="t.table + t.label">
                      <span class="orr__tname">
                        {{ t.label }} <code>{{ t.table }}</code>
                        <small v-if="t.note" class="pf-muted">{{ t.note }}</small>
                      </span>
                      <span class="orr__num">
                        <template v-if="t.action === 'update'">{{ n(t.rows) }} updated</template>
                        <template v-else-if="t.action === 'keep'">{{ n(t.rows) }} kept</template>
                        <template v-else>{{ n(t.rows) }}<small v-if="t.remaining" class="pf-muted"> · {{ n(t.remaining) }} kept</small></template>
                      </span>
                    </li>
                  </ul>
                </details>
              </div>
              <button v-if="emptyGroups" type="button" class="orr__link" @click="showEmpty = !showEmpty">
                {{ showEmpty ? 'Hide' : 'Show' }} {{ emptyGroups }} group{{ emptyGroups === 1 ? '' : 's' }} with nothing to remove
              </button>

              <ul class="orr__facts-list">
                <li><i class="fa-solid fa-wand-magic-sparkles"></i><span>Setup wizard<template v-if="preview.hooks.length"> and getting-started steps</template> shown again to <strong>{{ ownerList(preview) || 'the admin' }}</strong>.</span></li>
                <li v-if="preview.numbering.length"><i class="fa-solid fa-hashtag"></i><span>Numbering restarts at {{ preview.numbering.map((x) => x.next).join(', ') }}.</span></li>
                <li v-if="preview.hooks.length"><i class="fa-solid fa-plug"></i><span>Also reset by modules: {{ hookSummary }}.</span></li>
              </ul>

              <div v-if="preview.unclassified.length" class="ui-alert ui-alert--warning orr__unclassified" data-testid="org-reset-unclassified">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>
                  <strong>{{ preview.unclassified.length }} table{{ preview.unclassified.length === 1 ? '' : 's' }} not classified — not touched:</strong>
                  {{ preview.unclassified.map((u) => `${u.table} (${u.rows})`).join(', ') }}
                </span>
              </div>
              <details class="orr__nt">
                <summary>Not touched ({{ preview.not_touched.length }} settings tables{{ preview.unclassified.length ? ` + ${preview.unclassified.length} unclassified` : '' }})</summary>
                <ul class="orr__tables">
                  <li v-for="t in notTouched" :key="t.reason">
                    <span class="orr__tname">{{ t.reason }} <code>{{ t.tables.join(', ') }}</code></span>
                    <span class="orr__num">{{ n(t.rows) }}</span>
                  </li>
                </ul>
                <p class="pf-muted pf-small">Also never touched: the organisation itself, its plan, business type and the owners' accounts.</p>
              </details>
            </template>
          </section>

          <!-- backup -->
          <section class="orr__backup" :class="{ 'is-done': backup }">
            <div>
              <h3><i :class="backup ? 'fa-solid fa-circle-check' : 'fa-solid fa-shield-halved'"></i> {{ backup ? 'Backup downloaded' : 'Download a backup first' }}</h3>
              <p v-if="backup" class="pf-small m0">{{ backup.filename }} · {{ size(backup.size) }}</p>
              <p v-else class="pf-small m0">Strongly recommended: a ZIP of JSON files (one per table) of everything this reset removes or changes, with the options above.</p>
            </div>
            <button type="button" class="ui-btn ui-btn--sm" :class="{ 'ui-btn--primary': !backup }" :disabled="!!busy" data-testid="org-reset-backup" @click="downloadBackup">
              <i :class="busy === 'backup' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-download'"></i> {{ backup ? 'Download again' : 'Download backup' }}
            </button>
          </section>
          <label v-if="!backup" class="orr__skip">
            <input v-model="skipBackup" type="checkbox" data-testid="org-reset-skip-backup" /> I don't need a backup of this test data
          </label>

          <div class="ui-field orr__confirm">
            <label for="orr-confirm">Type <strong>{{ org.name }}</strong> to confirm</label>
            <input id="orr-confirm" v-model="confirm" class="ui-input" autocomplete="off" spellcheck="false" :disabled="!!busy" data-testid="org-reset-confirm" @keydown.enter.prevent="doReset" />
          </div>
        </template>

        <div v-if="error" class="ui-alert ui-alert--danger orr__err" data-testid="org-reset-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>

      <div class="ui-modal__foot orr__foot">
        <template v-if="result">
          <button type="button" class="ui-btn" @click="close">Done</button>
          <button type="button" class="ui-btn ui-btn--primary" data-testid="org-reset-login-as" @click="$emit('login-as', org)">
            <i class="fa-solid fa-right-to-bracket"></i> Log in as to check
          </button>
        </template>
        <template v-else>
          <span v-if="blockReason" class="orr__why pf-small">{{ blockReason }}</span>
          <button type="button" class="ui-btn" :disabled="busy === 'reset'" @click="close">Cancel</button>
          <button type="button" class="ui-btn ui-btn--danger" :disabled="!!blockReason || !!busy" data-testid="org-reset-run" @click="doReset">
            <i :class="busy === 'reset' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate-left'"></i> Reset organisation
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { orgResetAPI, RESET_DEFAULTS } from '@/services/orgReset'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { downloadBlob } from '@/utils/format'

const REFUSED = ['OWN_ORGANIZATION', 'HAS_SUPER_ADMINS', 'PLATFORM_SESSION_REQUIRED']

export default {
  name: 'OrgResetModal',
  props: {
    org: { type: Object, required: true }
  },
  emits: ['close', 'reset', 'login-as'],
  data() {
    return {
      opts: { ...RESET_DEFAULTS },
      preview: null,
      stale: false,
      showEmpty: false,
      backup: null,
      skipBackup: false,
      confirm: '',
      busy: '',
      error: '',
      refusal: '',
      result: null
    }
  },
  computed: {
    shownGroups() {
      const gs = this.preview?.groups || []
      return this.showEmpty ? gs : gs.filter((g) => g.rows || g.updated)
    },
    emptyGroups() {
      return (this.preview?.groups || []).filter((g) => !g.rows && !g.updated).length
    },
    notTouched() {
      const by = {}
      for (const t of this.preview?.not_touched || []) {
        const r = (by[t.reason] = by[t.reason] || { reason: t.reason, tables: [], rows: 0 })
        r.tables.push(t.table)
        r.rows += t.rows
      }
      for (const t of this.preview?.unclassified || []) {
        const r = (by['Unclassified'] = by['Unclassified'] || { reason: 'Unclassified', tables: [], rows: 0 })
        r.tables.push(t.table)
        r.rows += t.rows
      }
      return Object.values(by)
    },
    hookSummary() {
      const rows = {}
      for (const t of this.preview?.hook_tables || []) {
        const name = (t.reason || '').replace(/^Cleared by the | module$/g, '')
        rows[name] = (rows[name] || 0) + t.rows
      }
      return (this.preview?.hooks || []).map((h) => (rows[h.name] != null ? `${h.name} (${this.n(rows[h.name])} record${rows[h.name] === 1 ? '' : 's'})` : h.name)).join(', ')
    },
    resultGroups() {
      return (this.result?.groups || []).filter((g) => g.action === 'remove' && (g.rows || g.updated))
    },
    blockReason() {
      if (this.refusal) return 'This organisation cannot be reset'
      if (!this.preview) return 'Run the preview first'
      if (this.stale) return 'Refresh the preview'
      if (!this.backup && !this.skipBackup) return 'Download a backup or tick the box'
      if (this.confirm.trim() !== this.org.name) return 'Type the name to confirm'
      return ''
    }
  },
  created() {
    this.loadPreview()
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    n(v) {
      return Number(v || 0).toLocaleString()
    },
    size(b) {
      if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB'
      if (b >= 1024) return Math.round(b / 1024) + ' KB'
      return b + ' B'
    },
    ownerList(rep) {
      return (rep?.owners || []).map((o) => o.email).join(', ')
    },
    keptLabels(rep) {
      return (rep?.groups || []).filter((g) => g.action === 'keep').map((g) => g.label.toLowerCase())
    },
    tablesOf(g) {
      return this.showEmpty ? g.tables : g.tables.filter((t) => t.rows)
    },
    onKey(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      if (this.busy === 'reset') return
      this.$emit('close')
    },
    optionsChanged() {
      this.backup = null
      if (this.preview) this.stale = true
      this.loadPreview()
    },
    handle(e, fallback) {
      const code = e?.response?.data?.error?.code
      const msg = apiErrorMessage(e, fallback)
      if (REFUSED.includes(code)) this.refusal = msg
      else this.error = msg
    },
    async loadPreview() {
      this.busy = 'preview'
      this.error = ''
      try {
        this.preview = await orgResetAPI.preview(this.org.id, this.opts)
        this.stale = false
      } catch (e) {
        this.handle(e, 'Could not preview the reset')
      } finally {
        this.busy = ''
      }
    },
    async downloadBackup() {
      this.busy = 'backup'
      this.error = ''
      try {
        const slug = (this.org.name || 'organisation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'organisation'
        const res = await orgResetAPI.backup(this.org.id, this.opts)
        const filename = res.filename && !res.filename.startsWith('organisation-backup-') ? res.filename : `${slug}-backup-${new Date().toISOString().slice(0, 10)}.zip`
        downloadBlob(res.blob, filename)
        this.backup = { filename, size: res.size }
        toast.success('Backup downloaded')
      } catch (e) {
        this.handle(e, 'Could not download the backup')
      } finally {
        this.busy = ''
      }
    },
    async doReset() {
      if (this.blockReason || this.busy) return
      this.busy = 'reset'
      this.error = ''
      try {
        this.result = await orgResetAPI.reset(this.org.id, this.opts, this.confirm.trim())
        toast.success(`${this.org.name} reset for handover`)
        this.$emit('reset', this.result)
      } catch (e) {
        this.handle(e, 'The reset failed')
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.orr {
  max-width: 760px;
  border-top: 3px solid var(--danger);
}

.orr__head h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.orr__ico {
  color: var(--danger);
}

.orr__intro {
  margin: 0 0 16px;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.55;
}

.m0 {
  margin: 0;
}

.orr__opts {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px 4px;
  margin: 0 0 16px;
  min-width: 0;
}

.orr__opts legend {
  padding: 0 6px;
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.orr__opt {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
}

.orr__opt input {
  margin-top: 2px;
}

.orr__opt span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.orr__opt strong {
  color: var(--text);
  font-weight: 600;
}

.orr__opt small {
  color: var(--text-3);
  font-size: 12.5px;
}

.orr__preview {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
  padding: 12px 14px;
  margin-bottom: 14px;
}

.orr__preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.orr__preview h3,
.orr__backup h3 {
  margin: 0;
  font-size: 14px;
}

.orr__stale {
  margin: 0 0 8px;
  font-size: 12.5px;
  color: var(--warning);
}

.orr__totals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.orr__total {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
}

.orr__total strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.orr__total span {
  font-size: 12px;
  color: var(--text-3);
}

.orr__total--danger strong {
  color: var(--danger);
}

.orr__total--ok strong {
  color: var(--success);
}

.orr__groups {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.orr__group {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.orr__group.is-remove {
  border-left: 3px solid var(--danger);
}

.orr__group.is-keep {
  border-left: 3px solid var(--success);
}

.orr__group summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13.5px;
  list-style: none;
}

.orr__group summary::-webkit-details-marker {
  display: none;
}

.orr__gname {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.orr__gname .ui-badge {
  flex-shrink: 0;
}

.orr__gdesc {
  margin: 0;
  padding: 0 10px 6px;
  font-size: 12.5px;
  color: var(--text-3);
}

.orr__num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: right;
}

.orr__tables {
  list-style: none;
  margin: 0;
  padding: 0 10px 8px;
  font-size: 12.5px;
}

.orr__tables li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 0;
  border-top: 1px solid var(--border);
}

.orr__tname {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-2);
}

.orr__tname code {
  font-size: 11px;
  color: var(--text-3);
}

.orr__tname small {
  display: block;
}

.orr__link {
  background: none;
  border: 0;
  padding: 6px 0 0;
  color: var(--accent);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}

.orr__facts-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  font-size: 13px;
  color: var(--text-2);
}

.orr__facts-list li,
.orr__facts p {
  display: flex;
  gap: 8px;
  padding: 3px 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.orr__facts-list i,
.orr__facts i {
  width: 14px;
  margin-top: 3px;
  color: var(--text-3);
  flex-shrink: 0;
}

.orr__unclassified {
  margin-top: 10px;
}

.orr__nt {
  margin-top: 10px;
  font-size: 13px;
}

.orr__nt summary {
  cursor: pointer;
  color: var(--accent);
  margin-bottom: 6px;
}

.orr__backup {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--warning);
  background: var(--warning-soft);
  margin-bottom: 8px;
}

.orr__backup h3 i {
  color: var(--warning);
  margin-right: 4px;
}

.orr__backup.is-done {
  border-color: var(--success);
  background: var(--success-soft);
}

.orr__backup.is-done h3 i {
  color: var(--success);
}

.orr__backup p {
  color: var(--text-2);
  overflow-wrap: anywhere;
}

.orr__backup .ui-btn {
  flex-shrink: 0;
}

.orr__skip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-2);
  margin-bottom: 14px;
  cursor: pointer;
}

.orr__confirm {
  margin: 8px 0 0;
}

.orr__err {
  margin-top: 12px;
}

.orr__foot {
  flex-wrap: wrap;
  align-items: center;
}

.orr__why {
  margin-right: auto;
  color: var(--text-3);
}

.orr__done {
  list-style: none;
  margin: 14px 0;
  padding: 0;
  font-size: 13.5px;
}

.orr__done li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.orr__facts {
  font-size: 13.5px;
  color: var(--text-2);
}

@media (max-width: 560px) {
  .orr__totals {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
  }

  .orr__total {
    padding: 6px 8px;
  }

  .orr__total strong {
    font-size: 16px;
  }

  .orr__backup {
    flex-direction: column;
    align-items: stretch;
  }

  .orr__why {
    width: 100%;
    margin: 0 0 4px;
  }
}
</style>
