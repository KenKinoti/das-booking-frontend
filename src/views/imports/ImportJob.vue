<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow"><router-link to="/imports">Import data</router-link> · {{ sourceLabel }}</div>
        <h1>{{ title }}</h1>
        <p v-if="job">
          Started {{ dt(job.created_at) }}<template v-if="job.preview?.org_name"> · from <strong>{{ job.preview.org_name }}</strong></template>
          <span class="ui-badge head-badge" :class="statusMeta.badge" data-testid="job-status">{{ statusMeta.label }}</span>
        </p>
      </div>
      <div v-if="job" class="ui-actions">
        <button v-if="isActive" class="ui-btn" data-testid="cancel" :disabled="busy" @click="cancel"><i class="fa-solid fa-stop"></i> Stop</button>
        <button v-if="job.can_resume" class="ui-btn ui-btn--primary" data-testid="resume" :disabled="busy" @click="resume"><i class="fa-solid fa-play"></i> Continue</button>
        <button v-if="job.status === 'completed' && job.source === 'zoho_api'" class="ui-btn" data-testid="resync" :disabled="busy" @click="resync"><i class="fa-solid fa-rotate"></i> Re-sync</button>
        <button v-if="job.can_undo" class="ui-btn ui-btn--danger" data-testid="undo" :disabled="busy" @click="undo"><i class="fa-solid fa-rotate-left"></i> Undo import</button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="!job && !loadError" class="ui-card ui-card__body"><div class="ui-skeleton" style="height: 140px"></div></div>

    <template v-if="job">
      <div v-if="job.error && !isActive && job.status !== 'paused'" class="ui-alert ui-alert--danger" data-testid="job-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>{{ job.message }}<br /><small>{{ job.error }}</small></span>
      </div>
      <div v-if="job.status === 'paused'" class="ui-alert ui-alert--warning">
        <i class="fa-solid fa-hourglass-half"></i>
        <span>{{ job.message }}<template v-if="job.resume_at"> · continues {{ dt(job.resume_at) }}</template><template v-if="job.error"><br /><small>{{ job.error }}</small></template></span>
      </div>

      <!-- Building the preview -->
      <section v-if="job.status === 'previewing'" class="ui-card">
        <div class="ui-card__body working">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <div>
            <strong>Building the preview…</strong>
            <p class="muted">{{ job.message || 'Reading your data' }}</p>
          </div>
        </div>
      </section>

      <!-- Preview -->
      <template v-if="job.status === 'preview' && pv">
        <div class="ui-kpis">
          <div v-for="e in mainEntities" :key="e.entity" class="ui-kpi">
            <div class="ui-kpi__label">{{ e.label }}</div>
            <div class="ui-kpi__value">{{ e.count }}</div>
            <div class="ui-kpi__meta">{{ e.new }} new<template v-if="e.linked"> · {{ e.linked }} imported before</template><template v-if="e.matches"> · {{ e.matches }} already here</template></div>
          </div>
        </div>

        <div v-if="pv.warnings?.length" class="ui-alert ui-alert--warning" data-testid="preview-warnings">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <ul class="warn-list"><li v-for="(w, i) in pv.warnings" :key="i">{{ w }}</li></ul>
        </div>

        <div class="ui-grid-2 pv-grid">
          <section class="ui-card">
            <div class="ui-card__head"><h2>Invoices by currency</h2></div>
            <div v-if="!pv.currencies?.length" class="ui-card__body muted small">No invoices in this import.</div>
            <div v-else class="ui-table-wrap">
              <table class="ui-table">
                <thead><tr><th>Currency</th><th class="num">Invoices</th><th class="num">Total (sent)</th><th class="num">Outstanding</th></tr></thead>
                <tbody>
                  <tr v-for="c in pv.currencies" :key="c.currency">
                    <td>{{ c.currency }} <span v-if="!c.supported" class="ui-badge ui-badge--danger">Not supported</span><span v-else-if="c.currency !== pv.home_currency" class="ui-badge ui-badge--info">Foreign</span></td>
                    <td class="num">{{ c.invoices }}</td>
                    <td class="num">{{ money(c.total, c.currency) }}</td>
                    <td class="num">{{ money(c.outstanding, c.currency) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section class="ui-card">
            <div class="ui-card__head"><h2>Numbering</h2></div>
            <div class="ui-card__body">
              <p v-if="!pv.numbering?.length" class="muted small">Numbering stays as it is.</p>
              <ul v-else class="num-list">
                <li v-for="n in pv.numbering" :key="n.doc_type">
                  <span>{{ n.doc_type === 'quote' ? 'Next quote' : 'Next invoice' }}</span>
                  <strong class="tabular">{{ n.next }}</strong>
                  <small class="muted">after {{ n.highest }}</small>
                </li>
              </ul>
              <p class="muted small">Imported numbers are kept exactly. You can change the next number later in <router-link to="/invoices/settings">Invoice settings</router-link>.</p>
            </div>
          </section>
        </div>

        <section v-if="pv.duplicates?.length" class="ui-card" data-testid="duplicates">
          <div class="ui-card__head"><h2>Already here ({{ pv.duplicates.length }})</h2></div>
          <div class="ui-card__body"><p class="muted small dup-intro">These records match ones you already have. Choose what to do with each — the defaults come from the options below.</p></div>
          <div class="ui-table-wrap">
            <table class="ui-table" v-table-cards>
              <thead><tr><th>Imported record</th><th>Matches</th><th>Action</th></tr></thead>
              <tbody>
                <tr v-for="d in pv.duplicates" :key="d.key">
                  <td>{{ d.label }}</td>
                  <td><span>{{ d.match_label }}</span> <small class="muted">by {{ d.match_by }}</small></td>
                  <td>
                    <select class="ui-select" :value="decisionOf(d)" :aria-label="`Action for ${d.label}`" @change="setDecision(d, $event.target.value)">
                      <template v-if="d.entity === 'contacts'">
                        <option value="merge">Merge</option>
                        <option value="skip">Skip</option>
                        <option value="create">Create new</option>
                      </template>
                      <template v-else>
                        <option value="skip">Skip</option>
                        <option value="overwrite">Replace</option>
                      </template>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="ui-card">
          <div class="ui-card__head">
            <div class="ui-tabs" role="tablist">
              <button v-for="e in sampleEntities" :key="e.entity" class="ui-tab" :class="{ 'is-active': sampleTab === e.entity }" role="tab" @click="sampleTab = e.entity">{{ e.label }}</button>
            </div>
          </div>
          <div v-if="currentSample" class="ui-table-wrap">
            <table class="ui-table" v-table-cards>
              <thead><tr><th v-for="c in currentSample.columns" :key="c">{{ c }}</th></tr></thead>
              <tbody>
                <tr v-for="(row, i) in currentSample.sample" :key="i">
                  <td v-for="c in currentSample.columns" :key="c" :data-label="c">{{ row[c] || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p class="muted small sample-note">First {{ currentSample.sample?.length || 0 }} of {{ currentSample.count }}.</p>
          </div>
        </section>

        <ItemPricingCard v-if="pv.item_pricing && options.items_to_catalog !== false && options.entities?.items !== false" v-model="options.item_prices" :pricing="pv.item_pricing" :files="job.source === 'csv'" />

        <section class="ui-card">
          <div class="ui-card__head"><h2>Options</h2></div>
          <div class="ui-card__body">
            <ImportOptions v-model="options" :source="job.source" :show-overwrite="anyLinked" />
            <div class="go-bar">
              <p class="muted small">Imports run in the background — you can leave this page. Nobody is emailed or notified.</p>
              <div class="go-bar__btns">
                <router-link v-if="job.source === 'csv'" :to="{ path: '/imports/files', query: { job: job.id } }" class="ui-btn">Back to files</router-link>
                <button v-if="optionsChanged" class="ui-btn" :disabled="busy" @click="rebuild"><i class="fa-solid fa-rotate"></i> Update preview</button>
                <button class="ui-btn ui-btn--primary" :disabled="busy" data-testid="start-import" @click="start"><i class="fa-solid fa-file-import"></i> Start import</button>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- Progress & report -->
      <template v-if="showProgress">
        <section class="ui-card" data-testid="progress">
          <div class="ui-card__head">
            <h2>{{ isActive ? 'Importing…' : 'Summary' }}</h2>
            <span v-if="isActive" class="muted small step-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> {{ job.message }}</span>
            <span v-else-if="job.api_calls" class="muted small">{{ job.api_calls }} Zoho API calls</span>
          </div>
          <div class="ui-table-wrap">
            <table class="ui-table counts" v-table-cards>
              <thead>
                <tr>
                  <th>What</th>
                  <th v-if="isActive" class="prog-col">Progress</th>
                  <th class="num">Created</th>
                  <th class="num">Updated</th>
                  <th class="num hide-sm">Unchanged</th>
                  <th class="num">Skipped</th>
                  <th class="num">Failed</th>
                  <th v-if="!isActive" class="hide-sm" data-label=""></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in countRows" :key="r.entity" :data-testid="`count-${r.entity}`">
                  <td><strong>{{ r.label }}</strong></td>
                  <td v-if="isActive" class="prog-col">
                    <div class="bar"><div class="bar__fill" :style="{ width: r.pct + '%' }"></div></div>
                    <small class="muted">{{ r.done }}<template v-if="r.total"> / {{ r.total }}</template></small>
                  </td>
                  <td class="num">{{ r.created }}</td>
                  <td class="num">{{ r.updated }}</td>
                  <td class="num hide-sm">{{ r.unchanged }}</td>
                  <td class="num">{{ r.skipped }}</td>
                  <td class="num" :class="{ 'txt-danger': r.failed }">{{ r.failed }}</td>
                  <td v-if="!isActive" class="hide-sm">
                    <router-link v-if="r.link && job.status !== 'undone'" :to="r.link" class="ui-btn ui-btn--ghost ui-btn--sm">View</router-link>
                  </td>
                </tr>
                <tr v-if="!countRows.length"><td colspan="8" class="muted">Starting…</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <div v-if="summary" class="sum-grid pv-grid">
          <section class="ui-card" data-testid="reconciliation">
            <div class="ui-card__head"><h2>Totals check</h2></div>
            <div v-if="!summary.reconciliation?.length" class="ui-card__body muted small">No sent invoices in this import.</div>
            <div v-else class="ui-table-wrap">
              <table class="ui-table" v-table-cards>
                <thead><tr><th>Currency</th><th class="num">Invoices</th><th class="num">Total in source</th><th class="num">Total here</th><th class="num">Outstanding (source / here)</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="r in summary.reconciliation" :key="r.currency">
                    <td>{{ r.currency }}</td>
                    <td class="num">{{ r.documents }}</td>
                    <td class="num">{{ money(r.source_total, r.currency) }}</td>
                    <td class="num">{{ money(r.local_total, r.currency) }}</td>
                    <td class="num">{{ money(r.source_outstanding, r.currency) }} / {{ money(r.local_outstanding, r.currency) }}</td>
                    <td><span class="ui-badge" :class="r.ok ? 'ui-badge--success' : 'ui-badge--danger'">{{ r.ok ? 'Match' : 'Differs' }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="summary.flags" class="ui-card__body muted small">{{ summary.flags }} document{{ summary.flags === 1 ? '' : 's' }} kept the source's totals or balance where our calculation differs (listed under Issues). They show a note on the document.</div>
          </section>
          <section class="ui-card">
            <div class="ui-card__head"><h2>Numbering</h2></div>
            <div class="ui-card__body">
              <p v-if="!summary.numbering?.length" class="muted small">Numbering was not changed.</p>
              <ul v-else class="num-list">
                <li v-for="n in summary.numbering" :key="n.doc_type">
                  <span>{{ n.doc_type === 'quote' ? 'Next quote' : 'Next invoice' }}</span>
                  <strong class="tabular" data-testid="next-number">{{ n.next_number }}</strong>
                  <small class="muted">after {{ n.highest }}</small>
                </li>
              </ul>
              <p class="muted small">Change it any time in <router-link to="/invoices/settings">Invoice settings</router-link>.</p>
              <p v-if="summary.undo" class="small undo-note" data-testid="undo-result"><i class="fa-solid fa-rotate-left"></i> Undone {{ dt(summary.undo.at) }}: deleted {{ undoText(summary.undo.deleted) }}<template v-if="keptCount(summary.undo)"> · kept {{ undoText(summary.undo.kept) }} (changed since)</template>.</p>
            </div>
          </section>
        </div>

        <section v-if="job.error_count" class="ui-card" data-testid="issues">
          <div class="ui-card__head">
            <h2>Issues ({{ job.error_count }})</h2>
            <button class="ui-btn ui-btn--sm" data-testid="download-errors" @click="downloadErrors"><i class="fa-solid fa-download"></i> Download CSV</button>
          </div>
          <ul class="issues">
            <li v-for="e in issues" :key="e.id">
              <span class="ui-badge" :class="e.severity === 'error' ? 'ui-badge--danger' : 'ui-badge--warning'">{{ e.severity === 'error' ? 'Error' : 'Note' }}</span>
              <span><strong>{{ e.label || labels[e.entity] || e.entity }}</strong><template v-if="e.row"> (row {{ e.row }})</template> — {{ e.message }}</span>
            </li>
            <li v-if="job.error_count > issues.length" class="muted small">…and {{ job.error_count - issues.length }} more in the CSV.</li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<script>
import { importsApi, JOB_STATUS, SOURCE_LABEL, ENTITY_ORDER, entityLink } from '@/services/imports'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime, downloadBlob } from '@/utils/format'
import { formatCurrency } from '@/utils/currencies'
import ImportOptions, { DEFAULT_OPTIONS } from '@/components/imports/ImportOptions.vue'
import ItemPricingCard from './ItemPricingCard.vue'

const ACTIVE = ['previewing', 'running', 'queued']

export default {
  name: 'ImportJob',
  components: { ImportOptions, ItemPricingCard },
  props: { id: { type: String, required: true } },
  data() {
    return { job: null, loadError: '', busy: false, timer: null, options: DEFAULT_OPTIONS(), savedOptions: '', issues: [], sampleTab: '', labels: {} }
  },
  computed: {
    pv() {
      return this.job?.preview || null
    },
    summary() {
      return this.job?.summary || null
    },
    statusMeta() {
      return JOB_STATUS[this.job?.status] || { label: this.job?.status, badge: '' }
    },
    sourceLabel() {
      return SOURCE_LABEL[this.job?.source] || 'Import'
    },
    title() {
      if (!this.job) return 'Import'
      if (this.job.status === 'preview' || this.job.status === 'previewing') return 'Check before importing'
      if (this.isActive) return 'Importing your data'
      return 'Import report'
    },
    isActive() {
      return !!this.job && (ACTIVE.includes(this.job.status) || this.job.running) && this.job.status !== 'previewing' && this.job.status !== 'preview'
    },
    showProgress() {
      return !!this.job && !['draft', 'previewing', 'preview'].includes(this.job.status)
    },
    mainEntities() {
      const order = ['contacts', 'invoices', 'payments', 'quotes', 'credit_notes', 'items']
      return (this.pv?.entities || []).filter((e) => order.includes(e.entity)).sort((a, b) => order.indexOf(a.entity) - order.indexOf(b.entity))
    },
    sampleEntities() {
      return (this.pv?.entities || []).filter((e) => e.sample?.length)
    },
    currentSample() {
      return this.sampleEntities.find((e) => e.entity === this.sampleTab) || this.sampleEntities[0] || null
    },
    anyLinked() {
      return (this.pv?.entities || []).some((e) => e.linked > 0)
    },
    optionsChanged() {
      return this.savedOptions && JSON.stringify(this.stripDecisions(this.options)) !== this.savedOptions
    },
    countRows() {
      const c = this.job?.counts || {}
      return ENTITY_ORDER.filter((k) => c[k] && (c[k].total || c[k].done || c[k].created || c[k].failed)).map((k) => {
        const x = c[k]
        const total = x.total || 0
        return {
          entity: k,
          label: this.labels[k] || k,
          ...x,
          total,
          pct: total ? Math.min(100, Math.round((x.done / total) * 100)) : x.done ? 100 : 0,
          link: entityLink(k, this.job.id)
        }
      })
    }
  },
  watch: {
    id() {
      this.job = null
      this.load()
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    dt: formatDateTime,
    money(v, c) {
      return formatCurrency(v, c)
    },
    stripDecisions(o) {
      const { decisions, item_prices: ip, ...rest } = o || {}
      void decisions
      // Only the source currency of item prices changes the preview (keep/convert/rate don't).
      return { ...rest, item_prices_currency: ip?.currency || '' }
    },
    undoText(m) {
      const names = { documents: 'documents', customers: 'customers', contact_people: 'contact people', payments: 'payments', items: 'items', numbering_restored: 'numbering restored' }
      return Object.entries(m || {}).filter(([, v]) => v).map(([k, v]) => `${v} ${names[k] || k}`).join(', ') || 'nothing'
    },
    keptCount(u) {
      return Object.values(u.kept || {}).reduce((a, b) => a + b, 0)
    },
    async load() {
      clearTimeout(this.timer)
      try {
        const j = await importsApi.job(this.id)
        const firstPreview = j.status === 'preview' && this.job?.status !== 'preview'
        this.job = j
        this.labels = j.labels || {}
        this.loadError = ''
        if (firstPreview) {
          this.options = { ...DEFAULT_OPTIONS(), ...(j.options || {}), decisions: { ...(j.options?.decisions || {}) } }
          const ip = j.preview?.item_pricing
          if (ip) this.options.item_prices = { ...(this.options.item_prices || {}), currency: this.options.item_prices?.currency || ip.source_currency }
          this.savedOptions = JSON.stringify(this.stripDecisions(this.options))
        }
        if (this.showProgress && j.error_count && !this.isActive) this.loadIssues()
        if (ACTIVE.includes(j.status) || j.running || (j.status === 'paused' && j.resume_at)) {
          this.timer = setTimeout(this.load, ACTIVE.includes(j.status) || j.running ? 1200 : 15000)
        }
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the import')
      }
    },
    async loadIssues() {
      try {
        this.issues = (await importsApi.errors(this.id, { limit: 50 })) || []
      } catch {
        this.issues = []
      }
    },
    decisionOf(d) {
      return this.options.decisions?.[d.key] || (d.entity === 'contacts' ? this.options.on_customer_match || 'merge' : this.options.on_doc_match || 'skip')
    },
    setDecision(d, v) {
      this.options = { ...this.options, decisions: { ...(this.options.decisions || {}), [d.key]: v } }
    },
    async rebuild() {
      this.busy = true
      try {
        this.job = await importsApi.preview(this.id, this.options)
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the preview'))
      } finally {
        this.busy = false
      }
    },
    async start() {
      const ip = this.options.item_prices
      if (ip?.mode === 'convert' && !(ip.rate > 0) && this.pv?.item_pricing && this.pv.item_pricing.source_currency !== this.pv.item_pricing.home_currency) {
        toast.error('Enter the exchange rate for item prices, or keep them in ' + this.pv.item_pricing.source_currency)
        return
      }
      this.busy = true
      try {
        this.job = await importsApi.start(this.id, this.options)
        toast.info('Import started — it continues in the background')
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not start the import'))
      } finally {
        this.busy = false
      }
    },
    async cancel() {
      this.busy = true
      try {
        this.job = await importsApi.cancel(this.id)
        toast.info('Import stopped — you can continue it later')
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not stop the import'))
      } finally {
        this.busy = false
      }
    },
    async resume() {
      this.busy = true
      try {
        this.job = await importsApi.resume(this.id)
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not continue the import'))
      } finally {
        this.busy = false
      }
    },
    async resync() {
      this.busy = true
      try {
        const j = await importsApi.previewZoho({ ...DEFAULT_OPTIONS(), ...(this.job.options || {}), decisions: {} })
        this.$router.push(`/imports/jobs/${j.id}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not start the re-sync'))
      } finally {
        this.busy = false
      }
    },
    async undo() {
      const yes = await confirmDialog({
        title: 'Undo this import?',
        message: 'Everything this import created is deleted — customers, invoices, quotes, payments and history — except records changed here since. Numbering goes back to what it was. This cannot be reversed.',
        confirmText: 'Delete imported records',
        danger: true
      })
      if (!yes) return
      this.busy = true
      try {
        this.job = await importsApi.undo(this.id)
        toast.success('Import undone')
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not undo the import'))
      } finally {
        this.busy = false
      }
    },
    async downloadErrors() {
      try {
        const blob = await importsApi.errorsCsv(this.id)
        downloadBlob(blob, `import-issues-${this.id.slice(0, 8)}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not download the issues'))
      }
    }
  }
}
</script>

<style scoped>
.head-badge {
  margin-left: 8px;
  vertical-align: middle;
}
.working {
  display: flex;
  gap: 14px;
  align-items: center;
}
.working > i {
  font-size: 22px;
  color: var(--accent);
}
.working p {
  margin: 2px 0 0;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12.5px;
}
.tabular {
  font-variant-numeric: tabular-nums;
}
.pv-grid {
  margin: 16px 0;
}
.warn-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}
.num-list {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  display: grid;
  gap: 8px;
}
.num-list li {
  display: flex;
  gap: 10px;
  align-items: baseline;
  flex-wrap: wrap;
}
.num-list li span {
  min-width: 100px;
  color: var(--text-2);
}
.dup-intro {
  margin: 0;
}
.sample-note {
  padding: 8px 16px 12px;
  margin: 0;
}
.go-bar {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.go-bar p {
  margin: 0;
  flex: 1;
  min-width: 220px;
}
.go-bar__btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.step-msg {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  overflow-wrap: anywhere;
}
.prog-col {
  min-width: 160px;
}
.bar {
  height: 6px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
  margin-bottom: 3px;
}
.bar__fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.4s;
}
.counts td,
.counts th {
  font-variant-numeric: tabular-nums;
}
.txt-danger {
  color: var(--danger);
  font-weight: 600;
}
.issues {
  list-style: none;
  margin: 0;
  padding: 4px 16px 14px;
  display: grid;
  gap: 8px;
  font-size: 13.5px;
}
.issues li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  line-height: 1.45;
}
.issues li span:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.undo-note {
  color: var(--text-2);
}
.ui-kpis {
  margin-bottom: 16px;
}
.ui-card + .ui-card {
  margin-top: 16px;
}
.sum-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
}
.sum-grid > .ui-card + .ui-card {
  margin-top: 0;
}
@media (max-width: 1100px) {
  .sum-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
