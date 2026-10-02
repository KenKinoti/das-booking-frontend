<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal imp" style="max-width: 920px" role="dialog" aria-modal="true" aria-labelledby="pbimp-title" data-testid="import-modal">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">Price lists</div>
          <h2 id="pbimp-title">Import prices from a CSV</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div class="drop" :class="{ over: dragging }" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
          <i class="fa-solid fa-file-csv"></i>
          <div class="drop__text">
            <strong>{{ fileName || 'Drop your price list here' }}</strong>
            <span>One row per price. Rows already on a list are updated (matched on supplier + kind + name + TLD + period) and the old price is kept in the history.</span>
          </div>
          <div class="drop__acts">
            <label class="ui-btn ui-btn--primary">
              <i class="fa-solid fa-folder-open"></i> Choose file
              <input ref="file" type="file" accept=".csv,text/csv,text/plain" class="hidden" data-testid="import-file" @change="onFile" />
            </label>
            <button type="button" class="ui-btn" data-testid="import-template" @click="template"><i class="fa-solid fa-download"></i> Template</button>
          </div>
        </div>

        <details class="docs" :open="!preview" data-testid="import-docs">
          <summary>The columns</summary>
          <div class="header">
            <code data-testid="csv-header">{{ header }}</code>
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="copyHeader"><i class="fa-regular fa-copy"></i> Copy</button>
          </div>
          <div class="ui-table-wrap">
            <table class="ui-table doc">
              <thead><tr><th>Column</th><th>What goes in it</th><th class="hide-sm">Example</th></tr></thead>
              <tbody>
                <tr v-for="d in docs" :key="d.name">
                  <td><code>{{ d.name }}</code><small class="block muted">{{ { yes: 'required', domains: 'for domains', no: 'optional' }[d.required] }}</small></td>
                  <td>{{ d.help }}</td>
                  <td class="hide-sm"><code>{{ d.example }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="ui-hint">Tolerant on purpose: column order and capital letters do not matter, blank numbers are fine, and currency symbols or thousand separators in prices are ignored. Lines starting with # are skipped.</p>
        </details>

        <div v-if="busy && !preview" class="ui-skeleton" style="height: 140px"></div>
        <div v-if="error" class="ui-alert ui-alert--danger" data-testid="import-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <template v-if="preview">
          <div class="sum" data-testid="import-summary" :data-created="preview.created" :data-updated="preview.updated" :data-unchanged="preview.unchanged" :data-errors="preview.errors">
            <span class="ui-badge ui-badge--draft">{{ preview.total }} row{{ preview.total === 1 ? '' : 's' }}</span>
            <span class="ui-badge ui-badge--success">{{ preview.created }} new</span>
            <span class="ui-badge ui-badge--info">{{ preview.updated }} updated</span>
            <span class="ui-badge ui-badge--draft">{{ preview.unchanged }} unchanged</span>
            <span v-if="preview.duplicates" class="ui-badge ui-badge--warning">{{ preview.duplicates }} repeated</span>
            <span v-if="preview.errors" class="ui-badge ui-badge--danger">{{ preview.errors }} with errors</span>
            <span class="spacer"></span>
            <label v-if="problems" class="ui-switch"><input v-model="onlyProblems" type="checkbox" /> <span>Only problems</span></label>
          </div>
          <p v-if="preview.new_suppliers.length" class="newsup"><i class="fa-solid fa-circle-plus"></i> New supplier{{ preview.new_suppliers.length === 1 ? '' : 's' }}: <strong>{{ preview.new_suppliers.join(', ') }}</strong></p>
          <p v-if="preview.errors" class="ui-hint">Rows with errors are skipped; everything else is imported. Fix them in the file and import it again — rows already imported will show as unchanged.</p>
          <div class="ui-table-wrap rows">
            <table class="ui-table" data-testid="import-rows">
              <thead>
                <tr><th class="num">Line</th><th>Supplier</th><th>Price for</th><th class="num">Price</th><th>Result</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in rowsShown" :key="r.line" :class="'a-' + r.action" :data-action="r.action">
                  <td class="num">{{ r.line }}</td>
                  <td>{{ r.supplier || '—' }}</td>
                  <td>{{ r.tld ? r.tld + ' ' : '' }}{{ r.tld ? kindShort(r.kind) : r.name || '—' }}<small v-if="r.kind && !r.tld" class="block muted">{{ kindOf(r.kind).label }} · {{ r.period }}</small></td>
                  <td class="num">
                    <template v-if="r.action !== 'error'">{{ cur(r.price, r.currency || r.supplier_currency) }}<small v-if="r.old_price != null" class="block muted">was {{ cur(r.old_price, r.currency) }}</small></template>
                    <template v-else>—</template>
                  </td>
                  <td>
                    <span class="ui-badge" :class="tone(r.action)">{{ label(r.action) }}</span>
                    <small v-for="(e, i) in r.errors" :key="'e' + i" class="block err">{{ e }}</small>
                    <small v-for="(w, i) in r.warnings" :key="'w' + i" class="block muted">{{ w }}</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="rowsAll.length > rowsShown.length" class="muted">Showing the first {{ rowsShown.length }} of {{ rowsAll.length }} rows.</p>
        </template>
      </div>
      <div class="ui-modal__foot">
        <span v-if="preview && !changes" class="muted">Nothing to import: every row is already on the price lists{{ preview.errors ? ' or has an error' : '' }}.</span>
        <span class="spacer"></span>
        <button type="button" class="ui-btn" @click="$emit('close')">{{ done ? 'Close' : 'Cancel' }}</button>
        <button type="button" class="ui-btn ui-btn--primary" :disabled="busy || !preview || !changes" data-testid="import-confirm" @click="run">
          <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-file-import'"></i> Import {{ changes || '' }} price{{ changes === 1 ? '' : 's' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { pricebookApi, kindOf, cur, readFileText } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { downloadBlob } from '@/utils/format'

export default {
  name: 'PricebookImportModal',
  props: {
    header: { type: String, default: '' },
    docs: { type: Array, default: () => [] }
  },
  emits: ['close', 'imported'],
  data() {
    return { text: '', fileName: '', preview: null, error: '', busy: false, dragging: false, onlyProblems: false, done: false }
  },
  computed: {
    changes() {
      return this.preview ? this.preview.created + this.preview.updated : 0
    },
    problems() {
      return this.preview ? this.preview.rows.filter((r) => r.action === 'error' || r.action === 'duplicate' || r.warnings.length).length : 0
    },
    rowsAll() {
      const rows = this.preview?.rows || []
      return this.onlyProblems ? rows.filter((r) => r.action === 'error' || r.action === 'duplicate' || r.warnings.length) : rows
    },
    rowsShown() {
      return this.rowsAll.slice(0, 300)
    }
  },
  methods: {
    cur,
    kindOf,
    kindShort(k) {
      return kindOf(k).short.toLowerCase()
    },
    label(a) {
      return { create: 'New', update: 'Update', unchanged: 'Unchanged', error: 'Error', duplicate: 'Repeated' }[a] || a
    },
    tone(a) {
      return { create: 'ui-badge--success', update: 'ui-badge--info', unchanged: 'ui-badge--draft', error: 'ui-badge--danger', duplicate: 'ui-badge--warning' }[a] || 'ui-badge--draft'
    },
    onDrop(e) {
      this.dragging = false
      const f = e.dataTransfer?.files?.[0]
      if (f) this.load(f)
    },
    onFile(e) {
      const f = e.target.files?.[0]
      if (f) this.load(f)
      e.target.value = ''
    },
    async load(file) {
      this.error = ''
      this.preview = null
      this.done = false
      this.fileName = file.name
      if (file.size > 2 * 1024 * 1024) {
        this.error = 'The file is larger than 2 MB.'
        return
      }
      this.busy = true
      try {
        this.text = await readFileText(file)
        this.preview = await pricebookApi.importCsv(this.text, true)
        this.onlyProblems = false
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not read the file')
      } finally {
        this.busy = false
      }
    },
    async run() {
      if (!this.text || this.busy) return
      this.busy = true
      this.error = ''
      try {
        const r = await pricebookApi.importCsv(this.text, false)
        toast.success(`Imported: ${r.created} new, ${r.updated} updated${r.errors ? `, ${r.errors} skipped with errors` : ''}`)
        this.done = true
        this.$emit('imported', r)
        if (!r.errors) this.$emit('close')
        else this.preview = await pricebookApi.importCsv(this.text, true)
      } catch (e) {
        this.error = apiErrorMessage(e, 'The import failed')
      } finally {
        this.busy = false
      }
    },
    async template() {
      try {
        downloadBlob(await pricebookApi.template(), 'supplier-prices-template.csv')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not download the template'))
      }
    },
    async copyHeader() {
      try {
        await navigator.clipboard.writeText(this.header)
        toast.success('Header copied')
      } catch {
        toast.info('Select the header and copy it')
      }
    }
  }
}
</script>

<style scoped>
.drop {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--bg-subtle);
}
.drop.over {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.drop > i {
  font-size: 26px;
  color: var(--accent);
}
.drop__text {
  flex: 1 1 260px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.drop__text strong {
  overflow-wrap: anywhere;
}
.drop__text span {
  color: var(--text-2);
  font-size: 13px;
}
.drop__acts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.docs {
  margin: 14px 0;
  font-size: 13px;
}
.docs summary {
  cursor: pointer;
  color: var(--text-2);
  width: fit-content;
  font-weight: 600;
}
.header {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 10px 0;
}
.header code {
  flex: 1;
  min-width: 0;
  display: block;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  font-size: 12px;
  overflow-wrap: anywhere;
  color: var(--text);
}
.doc td {
  vertical-align: top;
  font-size: 12.5px;
}
.doc code {
  font-size: 12px;
  color: var(--text);
}
.sum {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  margin: 14px 0 8px;
}
.spacer {
  flex: 1;
}
.newsup {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-2);
}
.newsup i {
  color: var(--success);
}
.rows {
  max-height: 340px;
  overflow: auto;
}
.rows td {
  vertical-align: top;
  font-size: 13px;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.block {
  display: block;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.err {
  color: var(--danger);
  font-size: 12.5px;
}
tr.a-unchanged td {
  color: var(--text-3);
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
}
</style>
