<template>
  <div class="syn-up" data-testid="synergy-upload">
    <div
      class="drop"
      :class="{ over, busy, compact: compact && !files.length && !results.length }"
      @dragenter.prevent="over = true"
      @dragover.prevent="over = true"
      @dragleave.prevent="over = false"
      @drop.prevent="onDrop"
    >
      <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-file-csv'"></i>
      <div class="txt">
        <strong>{{ busy ? `Importing ${files.length} file${files.length === 1 ? '' : 's'}…` : 'Drop your Synergy Wholesale files here' }}</strong>
        <span>Statements (statement-September-2026.csv) and hosting usage reports (hosting-account-usage-2026-10-01.csv) — several at once. Re-uploading never duplicates.</span>
      </div>
      <label class="ui-btn ui-btn--sm" :class="{ disabled: busy }">
        <i class="fa-solid fa-paperclip"></i> Choose files
        <input type="file" multiple accept=".csv,text/csv,.pdf,application/pdf,image/*" hidden :disabled="busy" data-testid="synergy-file" @change="onPick" />
      </label>
    </div>

    <!-- Review before importing: detected type, snapshot date -->
    <div v-if="files.length && !busy" class="review" data-testid="synergy-review">
      <div class="review__head">
        <strong>{{ files.length }} file{{ files.length === 1 ? '' : 's' }} ready</strong>
        <span class="muted">Check the type and, for usage reports, the date of the snapshot.</span>
      </div>
      <ul>
        <li v-for="(f, i) in files" :key="f.key" :data-file="f.file.name">
          <i :class="kindIcon(f.kind)" class="kic"></i>
          <div class="fname">
            <strong>{{ f.file.name }}</strong>
            <span class="ui-badge" :class="f.kind === 'other' ? 'ui-badge--draft' : 'ui-badge--info'">{{ kindLabel(f.kind) }}</span>
          </div>
          <label v-if="f.kind === 'usage'" class="date">
            <span>Snapshot date</span>
            <input v-model="f.date" type="date" class="ui-input" :max="today" :aria-label="'Snapshot date of ' + f.file.name" data-testid="snapshot-date" />
            <small :class="f.date ? 'muted' : 'txt-warn'">{{ f.date ? (f.date === f.fromName ? 'from the file name' : 'chosen') : 'choose a date' }}</small>
          </label>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="'Remove ' + f.file.name" @click="files.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button>
        </li>
      </ul>
      <div class="review__foot">
        <button type="button" class="ui-btn ui-btn--ghost" @click="files = []">Cancel</button>
        <button type="button" class="ui-btn ui-btn--primary" :disabled="!canImport" data-testid="synergy-import" @click="importAll">
          <i class="fa-solid fa-file-import"></i> Import {{ files.length }} file{{ files.length === 1 ? '' : 's' }}
        </button>
      </div>
    </div>

    <!-- Upload summary -->
    <div v-if="results.length" class="results" data-testid="synergy-summary">
      <div class="results__head">
        <strong><i class="fa-solid fa-list-check"></i> Upload summary</strong>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="results = []">Hide</button>
      </div>
      <div v-for="r in results" :key="r.key" class="res" :class="r.error ? 'is-err' : ''" :data-file="r.file" :data-type="r.syn?.file_type || r.kind">
        <div class="res__title">
          <i :class="r.error ? 'fa-solid fa-circle-xmark txt-danger' : r.warn ? 'fa-solid fa-triangle-exclamation txt-warn' : 'fa-solid fa-circle-check txt-ok'"></i>
          <strong>{{ r.file }}</strong>
          <span class="ui-badge ui-badge--draft">{{ kindLabel(r.syn?.file_type || r.kind) }}</span>
        </div>
        <p v-if="r.error" class="txt-danger">{{ r.error }}</p>
        <template v-else-if="r.syn">
          <div class="nums">
            <span><b>{{ r.syn.rows_read }}</b> rows read</span>
            <span data-k="new"><b>{{ r.syn.new }}</b> new</span>
            <span data-k="duplicates"><b>{{ r.syn.duplicates }}</b> already imported</span>
            <span v-if="r.syn.updated"><b>{{ r.syn.updated }}</b> updated</span>
            <span v-if="r.syn.file_type === 'statement'">{{ formatDate(r.syn.period_from) }} – {{ formatDate(r.syn.period_to) }}</span>
            <span v-else>snapshot {{ formatDate(r.syn.snapshot_date) }} <small class="muted">({{ r.syn.date_source }})</small></span>
          </div>
          <div v-if="r.syn.file_type === 'statement'" class="bal" data-testid="balance-check">
            <span>Opening <b>{{ aud(r.syn.opening_balance) }}</b></span>
            <i class="fa-solid fa-arrow-right muted"></i>
            <span>Closing <b>{{ aud(r.syn.closing_balance) }}</b></span>
            <span v-if="r.syn.reconciled && !r.syn.gaps.length" class="ui-badge ui-badge--success"><i class="fa-solid fa-check"></i> balance reconciles{{ r.syn.continuity === 'ok' ? ' with the other months' : '' }}</span>
            <span v-else class="ui-badge ui-badge--warning"><i class="fa-solid fa-triangle-exclamation"></i> {{ r.syn.gaps.length }} gap{{ r.syn.gaps.length === 1 ? '' : 's' }}</span>
            <span class="muted">Costs {{ aud(r.syn.expenses) }} · top-ups {{ aud(r.syn.topups) }} (not an expense)</span>
          </div>
          <div v-if="r.syn.file_type === 'usage' && (r.syn.appeared?.length || r.syn.gone?.length)" class="bal">
            <span v-if="r.syn.appeared?.length">New since {{ formatDate(r.syn.previous_snapshot) }}: <b>{{ r.syn.appeared.join(', ') }}</b></span>
            <span v-if="r.syn.gone?.length">Gone: <b>{{ r.syn.gone.join(', ') }}</b></span>
          </div>
          <ul v-if="r.syn.gaps?.length || r.syn.warnings?.length" class="warns">
            <li v-for="g in r.syn.gaps" :key="g.after + g.before"><i class="fa-solid fa-link-slash"></i> {{ g.message }}</li>
            <li v-for="w in r.syn.warnings.slice(0, 6)" :key="w"><i class="fa-solid fa-circle-info"></i> {{ w }}</li>
          </ul>
          <p v-if="r.syn.accounting" class="muted" data-testid="upload-accounting">
            <i class="fa-solid fa-circle-check txt-ok"></i>
            Synergy expenses ({{ r.syn.accounting.mode === 'topups' ? 'top-ups' : 'service charges' }}): {{ r.syn.accounting.created }} created, {{ r.syn.accounting.updated }} updated<template v-if="r.syn.accounting.approved">, {{ r.syn.accounting.approved }} approved — in your P&amp;L now</template><template v-else-if="!r.syn.accounting.auto_approve"> — approve them in the Inbox</template>.
          </p>
        </template>
        <p v-else class="muted">{{ r.created }} added to the Expenses inbox{{ r.skipped ? ` · ${r.skipped} already there` : '' }}.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { expensesApi, synergyKindOf, dateFromFileName, aud } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

let seq = 0

export default {
  name: 'SynergyUpload',
  props: { compact: { type: Boolean, default: false } },
  emits: ['uploaded'],
  data() {
    const d = new Date()
    return {
      over: false,
      busy: false,
      files: [],
      results: [],
      today: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  },
  computed: {
    canImport() {
      return this.files.length > 0 && this.files.every((f) => f.kind !== 'usage' || !!f.date)
    }
  },
  methods: {
    aud,
    formatDate,
    kindLabel(k) {
      return { statement: 'Statement', usage: 'Hosting usage', other: 'Invoice / receipt' }[k] || 'File'
    },
    kindIcon(k) {
      return { statement: 'fa-solid fa-file-invoice-dollar', usage: 'fa-solid fa-hard-drive', other: 'fa-regular fa-file' }[k] || 'fa-regular fa-file'
    },
    onDrop(e) {
      this.over = false
      this.add([...(e.dataTransfer?.files || [])])
    },
    onPick(e) {
      this.add([...(e.target.files || [])])
      e.target.value = ''
    },
    async add(list) {
      if (this.busy) return
      for (const file of list) {
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 15 MB`)
          continue
        }
        let kind = 'other'
        if (/\.csv$/i.test(file.name) || /csv/.test(file.type)) {
          try {
            const head = await file.slice(0, 600).text()
            kind = synergyKindOf(head.split(/\r?\n/)[0]) || 'other'
          } catch {
            kind = 'other'
          }
        }
        const fromName = kind === 'usage' ? dateFromFileName(file.name) : ''
        this.files = this.files.filter((f) => f.file.name !== file.name)
        this.files.push({ key: ++seq, file, kind, fromName, date: fromName })
      }
    },
    async importAll() {
      if (!this.canImport) return
      this.busy = true
      const dates = {}
      for (const f of this.files) if (f.kind === 'usage' && f.date && f.date !== f.fromName) dates[f.file.name] = f.date
      const kinds = Object.fromEntries(this.files.map((f) => [f.file.name, f.kind]))
      try {
        const r = await expensesApi.upload(
          this.files.map((f) => f.file),
          { dates }
        )
        const out = []
        for (const res of r.results || []) {
          const syn = res.synergy || null
          out.push({ key: ++seq, file: res.file, kind: kinds[res.file], syn, created: res.created, skipped: res.skipped, warn: syn && (syn.gaps?.length || !syn.reconciled) })
        }
        for (const e of r.errors || []) out.push({ key: ++seq, file: e.file, kind: kinds[e.file], error: e.message })
        this.results = out
        const synN = out.filter((x) => x.syn).length
        const added = out.reduce((a, x) => a + (x.syn ? x.syn.new + (x.syn.updated || 0) : 0), 0)
        if (synN) toast.success(`${synN} Synergy file${synN === 1 ? '' : 's'} imported — ${added} new row${added === 1 ? '' : 's'}`)
        if (r.errors?.length) toast.error(`${r.errors.length} file${r.errors.length === 1 ? '' : 's'} could not be imported`)
        this.files = []
        this.$emit('uploaded', out)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Upload failed'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.syn-up {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.drop {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 18px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg-subtle);
  transition: border-color 0.15s, background 0.15s;
}
.drop.compact {
  padding: 10px 14px;
}
.drop.over {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.drop > i {
  font-size: 24px;
  color: var(--accent);
}
.txt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.txt strong {
  font-size: 14px;
}
.txt span {
  font-size: 12.5px;
  color: var(--text-3);
}
.disabled {
  opacity: 0.6;
  pointer-events: none;
}
.review,
.results {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 12px 14px;
}
.review__head,
.results__head {
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.review ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.review li {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
}
.kic {
  color: var(--accent);
  width: 18px;
  text-align: center;
}
.fname {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.fname strong {
  overflow-wrap: anywhere;
  font-size: 13.5px;
}
.date {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--text-2);
}
.date .ui-input {
  width: auto;
  padding: 4px 8px;
  min-height: 0;
}
.review__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.res {
  padding: 10px 0;
  border-top: 1px solid var(--border);
}
.res:first-of-type {
  border-top: 0;
}
.res__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.res__title strong {
  overflow-wrap: anywhere;
}
.nums,
.bal {
  display: flex;
  gap: 6px 14px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 13px;
  color: var(--text-2);
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
.nums b,
.bal b {
  color: var(--text);
}
.warns {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: var(--text-2);
}
.warns i {
  color: var(--warning);
  margin-right: 4px;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.txt-ok {
  color: var(--success);
}
.txt-warn {
  color: var(--warning);
}
.txt-danger {
  color: var(--danger);
}
.res p {
  margin: 6px 0 0;
  font-size: 13px;
}
</style>
