<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <div class="ui-modal" style="max-width: 860px" role="dialog" aria-modal="true" aria-labelledby="im-title" data-testid="import-modal">
      <div class="ui-modal__head">
        <h2 id="im-title">Import subscriptions</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <p class="hs-lead">Bring existing clients over in one go: one row per service (a catalogue service by name, or a description and a price); rows with the same customer and <code>group</code> become one subscription (e.g. hosting + a .co.ke domain). <code>next_renewal</code> is where billing starts, so clients who already paid up to then aren't invoiced again.</p>
        <div class="im-row">
          <label class="ui-btn"><i class="fa-solid fa-file-csv"></i> Choose CSV file<input type="file" accept=".csv,text/csv" hidden data-testid="im-file" @change="onFile" /></label>
          <button type="button" class="ui-btn ui-btn--ghost" @click="downloadTemplate"><i class="fa-solid fa-download"></i> Template</button>
          <span v-if="fileName" class="ui-hint">{{ fileName }}</span>
        </div>
        <div class="ui-field">
          <label for="im-text">…or paste the CSV</label>
          <textarea id="im-text" v-model="csv" class="ui-textarea mono" rows="6" placeholder="customer_email,customer_name,service,price,period,next_renewal,site,supplier,group" data-testid="im-text" @input="result = null"></textarea>
        </div>
        <label class="ui-switch"><input v-model="createCustomers" type="checkbox" data-testid="im-create-customers" @change="result = null" /> <span>Create customers that don't exist yet (needs customer_email and customer_name)</span></label>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <template v-if="result">
          <div class="ui-alert" :class="result.invalid ? 'ui-alert--warning' : 'ui-alert--success'" data-testid="im-summary">
            <i :class="result.invalid ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'"></i>
            <span v-if="!result.dry_run">{{ result.created }} subscription{{ result.created === 1 ? '' : 's' }} created{{ result.customers_created ? `, ${result.customers_created} new customer${result.customers_created === 1 ? '' : 's'}` : '' }}.</span>
            <span v-else>{{ result.valid }} row{{ result.valid === 1 ? '' : 's' }} ready, {{ result.invalid }} with problems{{ result.invalid ? ' — fix them and check again' : '' }}.</span>
          </div>
          <div class="ui-table-wrap">
            <table class="ui-table" v-table-cards>
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Period</th>
                  <th>Billing starts</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in result.rows" :key="r.line" :data-testid="`im-row-${r.line}`">
                  <td class="card-title">{{ r.line }}</td>
                  <td>{{ r.customer }}<span v-if="r.new_customer" class="ui-badge ui-badge--info">new</span></td>
                  <td>{{ r.service || '—' }}<small v-if="r.group" class="sub">group {{ r.group }}</small></td>
                  <td>{{ r.period || '—' }}</td>
                  <td>{{ r.start || 'today' }}</td>
                  <td>
                    <span v-if="r.number" class="ui-badge ui-badge--success">{{ r.number }}</span>
                    <span v-else-if="r.ok" class="ui-badge ui-badge--info">OK</span>
                    <span v-else class="err">{{ r.error }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">{{ result && !result.dry_run ? 'Done' : 'Cancel' }}</button>
        <button type="button" class="ui-btn" :disabled="!csv.trim() || !!busy" data-testid="im-check" @click="run(true)"><i :class="busy === 'dry' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-list-check'"></i> Check</button>
        <button type="button" class="ui-btn ui-btn--primary" :disabled="!canImport || !!busy" data-testid="im-import" @click="run(false)"><i :class="busy === 'run' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-file-import'"></i> Import {{ result?.valid || '' }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { subscriptionsApi } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { downloadBlob } from '@/utils/format'

export default {
  name: 'ImportModal',
  emits: ['close', 'imported'],
  data() {
    return { csv: '', fileName: '', createCustomers: false, result: null, busy: '', error: '' }
  },
  computed: {
    canImport() {
      return !!this.result && this.result.dry_run && this.result.valid > 0 && this.result.invalid === 0
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    async onFile(e) {
      const file = e.target.files?.[0]
      if (!file) return
      this.fileName = file.name
      this.csv = await file.text()
      this.result = null
      this.run(true)
    },
    async downloadTemplate() {
      try {
        downloadBlob(await subscriptionsApi.template(), 'subscriptions-template.csv')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not download the template'))
      }
    },
    async run(dry) {
      this.error = ''
      this.busy = dry ? 'dry' : 'run'
      try {
        this.result = await subscriptionsApi.importCsv(this.csv, { dryRun: dry, createCustomers: this.createCustomers })
        if (!dry) {
          toast.success(`${this.result.created} subscription${this.result.created === 1 ? '' : 's'} imported`)
          this.$emit('imported', this.result)
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not read the file')
        this.result = null
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.hs-lead {
  margin: 0 0 12px;
  font-size: 13.5px;
  color: var(--text-2);
}
.im-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.err {
  color: var(--danger);
  font-size: 13px;
}
code {
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12.5px;
}
.ui-badge {
  margin-left: 6px;
}
</style>
