<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow"><router-link to="/imports">Import data</router-link> · Files</div>
        <h1>Import from files</h1>
        <p>Upload Zoho Books exports or CSV/XLSX files from any tool. We recognise the columns; you can adjust anything before importing.</p>
      </div>
      <div v-if="jobId" class="ui-actions">
        <button class="ui-btn" :disabled="busy" @click="discard"><i class="fa-regular fa-trash-can"></i> Start over</button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }}</span></div>
    <div v-if="problems.length" class="ui-alert ui-alert--warning" data-testid="upload-problems">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span><strong>Some files could not be read:</strong><br /><template v-for="p in problems" :key="p">{{ p }}<br /></template></span>
    </div>

    <section class="ui-card">
      <div class="ui-card__body">
        <label class="drop" :class="{ 'is-over': over, 'is-busy': uploading }" @dragover.prevent="over = true" @dragleave.prevent="over = false" @drop.prevent="onDrop">
          <input ref="file" type="file" multiple accept=".csv,.xlsx,.xls,.txt,text/csv" class="sr-only" data-testid="file-input" @change="onPick" />
          <i :class="uploading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-cloud-arrow-up'"></i>
          <strong>{{ uploading ? 'Reading your files…' : jobId ? 'Add more files' : 'Drop files here or click to choose' }}</strong>
          <small>CSV or XLSX · up to 25 MB per upload · in Zoho Books: <em>Sales → (module) → ⋯ → Export</em>, choose CSV</small>
        </label>
        <details class="tips">
          <summary>Which Zoho Books exports do I need?</summary>
          <ul>
            <li><strong>Contacts</strong> and <strong>Contact Persons</strong> (Sales → Customers → Export) — customers and the people copied on invoices.</li>
            <li><strong>Invoices</strong> (Sales → Invoices → Export, all statuses, all time) — one row per line item.</li>
            <li><strong>Customer Payments</strong> (Sales → Payments Received → Export) — so paid invoices get their payment records.</li>
            <li>Optional: <strong>Estimates</strong>, <strong>Credit Notes</strong>, <strong>Items</strong>.</li>
            <li>Files from other tools work too — map the columns below. Old <code>.xls</code> files must be saved as CSV or XLSX first.</li>
          </ul>
        </details>
      </div>
    </section>

    <section v-for="f in files" :key="f.id" class="ui-card file" :data-testid="`file-${f.name}`">
      <div class="ui-card__head file__head">
        <h2><i class="fa-regular fa-file-lines"></i> {{ f.name }} <small class="muted">· {{ f.rows }} row{{ f.rows === 1 ? '' : 's' }}</small></h2>
        <div class="file__tools">
          <select class="ui-select kind" :value="f.kind" :aria-label="`What ${f.name} contains`" data-testid="file-kind" @change="setKind(f, $event.target.value)">
            <option value="">Choose what this file contains…</option>
            <optgroup label="Zoho Books exports">
              <option v-for="k in zohoKinds" :key="k.kind" :value="k.kind">{{ k.label }}</option>
            </optgroup>
            <optgroup label="Other tools">
              <option v-for="k in otherKinds" :key="k.kind" :value="k.kind">{{ k.label }}</option>
            </optgroup>
            <option value="ignore">Don't import this file</option>
          </select>
          <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Remove ${f.name}`" title="Remove file" @click="removeFile(f)"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </div>
      <div class="ui-card__body">
        <div v-if="f.error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ f.error }}</span></div>
        <p v-else-if="!f.kind" class="muted small">We couldn't tell what this file contains — choose it above.</p>
        <template v-else-if="f.kind !== 'ignore'">
          <p class="muted small map-note">
            <i class="fa-solid fa-wand-magic-sparkles"></i> {{ mappedCount(f) }} of {{ fieldsOf(f).length }} fields matched automatically
            <template v-if="missingRequired(f).length"> · <span class="txt-danger">needs: {{ missingRequired(f).join(', ') }}</span></template>
            <button class="linkish" @click="toggle(f.id)">{{ open[f.id] ? 'Hide columns' : 'Check columns' }}</button>
          </p>
          <div v-if="open[f.id]" class="ui-table-wrap">
            <table class="ui-table map">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Column in your file</th>
                  <th class="hide-sm">First value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="fd in fieldsOf(f)" :key="fd.key">
                  <td>{{ fd.label }}<span v-if="fd.required" class="req" title="Required">*</span></td>
                  <td>
                    <select class="ui-select ui-select--sm" :value="f.mapping?.[fd.key] || ''" :aria-label="`Column for ${fd.label}`" @change="setMap(f, fd.key, $event.target.value)">
                      <option value="">— not in this file —</option>
                      <option v-for="h in f.headers" :key="h" :value="h">{{ h }}</option>
                    </select>
                  </td>
                  <td class="hide-sm muted sample">{{ sampleOf(f, fd.key) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </section>

    <section v-if="files.length" class="ui-card">
      <div class="ui-card__head"><h2>Options</h2></div>
      <div class="ui-card__body">
        <ImportOptions v-model="options" source="csv" />
        <div class="go-bar">
          <p class="muted small">Next: a preview with counts, samples and duplicates. Nothing is saved until you start the import.</p>
          <button class="ui-btn ui-btn--primary" :disabled="busy || !canPreview" data-testid="files-preview" @click="preview">
            <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-magnifying-glass-chart'"></i> Preview import
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { importsApi } from '@/services/imports'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import ImportOptions, { DEFAULT_OPTIONS } from '@/components/imports/ImportOptions.vue'

export default {
  name: 'FileImport',
  components: { ImportOptions },
  data() {
    return { jobId: this.$route.query.job || '', files: [], kinds: [], problems: [], over: false, uploading: false, busy: false, loadError: '', open: {}, options: DEFAULT_OPTIONS() }
  },
  computed: {
    zohoKinds() {
      return this.kinds.filter((k) => k.zoho)
    },
    otherKinds() {
      return this.kinds.filter((k) => !k.zoho)
    },
    canPreview() {
      return this.files.some((f) => f.kind && f.kind !== 'ignore' && !f.error && !this.missingRequired(f).length)
    }
  },
  async created() {
    try {
      this.kinds = (await importsApi.fields()) || []
      if (this.jobId) {
        this.files = (await importsApi.files(this.jobId)) || []
        const job = await importsApi.job(this.jobId)
        if (job?.options) this.options = { ...DEFAULT_OPTIONS(), ...job.options }
      }
    } catch (e) {
      this.loadError = apiErrorMessage(e, 'Could not load the import')
    }
  },
  methods: {
    fieldsOf(f) {
      return this.kinds.find((k) => k.kind === f.kind)?.fields || []
    },
    mappedCount(f) {
      return this.fieldsOf(f).filter((fd) => f.mapping?.[fd.key]).length
    },
    missingRequired(f) {
      if (!f.kind || f.kind === 'ignore') return []
      return this.fieldsOf(f).filter((fd) => fd.required && !f.mapping?.[fd.key]).map((fd) => fd.label)
    },
    sampleOf(f, key) {
      const h = f.mapping?.[key]
      if (!h) return ''
      const i = (f.headers || []).indexOf(h)
      const row = (f.sample || [])[0] || []
      return i >= 0 ? row[i] || '' : ''
    },
    toggle(id) {
      this.open = { ...this.open, [id]: !this.open[id] }
    },
    onPick(e) {
      const list = Array.from(e.target.files || [])
      e.target.value = ''
      if (list.length) this.upload(list)
    },
    onDrop(e) {
      this.over = false
      const list = Array.from(e.dataTransfer?.files || [])
      if (list.length) this.upload(list)
    },
    async upload(list) {
      this.uploading = true
      this.problems = []
      try {
        const res = await importsApi.upload(list, this.jobId || undefined)
        if (!this.jobId && res.job) {
          this.jobId = res.job.id
          this.$router.replace({ query: { job: this.jobId } })
        }
        this.files = res.files || []
        this.problems = res.problems || []
        const unknown = this.files.filter((f) => !f.kind).length
        if (unknown) toast.info(`${unknown} file${unknown > 1 ? 's' : ''} need${unknown > 1 ? '' : 's'} you to choose what ${unknown > 1 ? 'they contain' : 'it contains'}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not upload the files'))
      } finally {
        this.uploading = false
      }
    },
    async setKind(f, kind) {
      try {
        this.files = await importsApi.updateFile(this.jobId, f.id, { kind })
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not change the file type'))
      }
    },
    async setMap(f, key, header) {
      const mapping = { ...(f.mapping || {}), [key]: header }
      if (!header) delete mapping[key]
      try {
        this.files = await importsApi.updateFile(this.jobId, f.id, { mapping })
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the column'))
      }
    },
    async removeFile(f) {
      try {
        this.files = await importsApi.removeFile(this.jobId, f.id)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the file'))
      }
    },
    async discard() {
      const yes = await confirmDialog({ title: 'Start over?', message: 'The uploaded files are removed. Nothing has been imported yet.', confirmText: 'Start over', danger: true })
      if (!yes) return
      try {
        await importsApi.removeJob(this.jobId)
      } catch {
        /* already gone */
      }
      this.jobId = ''
      this.files = []
      this.problems = []
      this.$router.replace({ query: {} })
    },
    async preview() {
      this.busy = true
      try {
        await importsApi.preview(this.jobId, this.options)
        this.$router.push(`/imports/jobs/${this.jobId}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not build the preview'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.drop {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 28px 16px;
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg-subtle);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.drop:hover,
.drop.is-over {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.drop i {
  font-size: 26px;
  color: var(--accent);
}
.drop small {
  color: var(--text-3);
}
.drop.is-busy {
  pointer-events: none;
  opacity: 0.8;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.tips {
  margin-top: 12px;
  font-size: 13.5px;
  color: var(--text-2);
}
.tips summary {
  cursor: pointer;
  font-weight: 550;
}
.tips ul {
  margin: 8px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 4px;
  line-height: 1.5;
}
.file {
  margin-top: 14px;
}
.file__head {
  flex-wrap: wrap;
  gap: 10px;
}
.file__head h2 {
  min-width: 0;
  overflow-wrap: anywhere;
}
.file__tools {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}
.kind {
  max-width: 340px;
  min-width: 0;
  flex: 1;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12.5px;
}
.map-note {
  margin: 0 0 10px;
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.linkish {
  border: 0;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-weight: 550;
  padding: 0;
  margin-left: auto;
}
.req {
  color: var(--danger);
  margin-left: 2px;
}
.map .ui-select {
  min-width: 180px;
}
.sample {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.txt-danger {
  color: var(--danger);
}
</style>
