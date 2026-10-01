<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Administration</div>
        <h1>Import data</h1>
        <p>Bring your customers, invoices, payments and history in from Zoho Books or another tool, and carry on billing from here.</p>
      </div>
    </header>

    <div class="ui-grid-2 sources">
      <section class="ui-card src">
        <div class="ui-card__body src__body">
          <div class="src__icon src__icon--zoho"><i class="fa-solid fa-book"></i></div>
          <div class="src__text">
            <h2>Zoho Books</h2>
            <p>Connect your Zoho account and import everything — including the original PDFs and email history. Re-run any time to pick up changes.</p>
            <p v-if="conn?.connected" class="src__status ok"><i class="fa-solid fa-circle-check"></i> Connected{{ conn.connection?.zoho_org_name ? ' to ' + conn.connection.zoho_org_name : '' }}</p>
            <p v-else-if="conn?.connection?.client_id" class="src__status warn"><i class="fa-solid fa-plug-circle-exclamation"></i> App saved — not connected yet</p>
          </div>
          <router-link to="/imports/zoho" class="ui-btn ui-btn--primary src__go" data-testid="go-zoho">
            {{ conn?.connected ? 'Import or re-sync' : 'Set up' }} <i class="fa-solid fa-arrow-right"></i>
          </router-link>
        </div>
      </section>
      <section class="ui-card src">
        <div class="ui-card__body src__body">
          <div class="src__icon"><i class="fa-solid fa-file-csv"></i></div>
          <div class="src__text">
            <h2>Upload files</h2>
            <p>Zoho Books exports (Contacts, Contact Persons, Invoices, Customer Payments, Credit Notes, Estimates, Items) or CSV/XLSX files from any other tool.</p>
          </div>
          <router-link to="/imports/files" class="ui-btn src__go" data-testid="go-files">Choose files <i class="fa-solid fa-arrow-right"></i></router-link>
        </div>
      </section>
    </div>

    <section class="ui-card">
      <div class="ui-card__head">
        <h2>Imports</h2>
        <button class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="loading" @click="load"><i class="fa-solid fa-rotate"></i> Refresh</button>
      </div>
      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>
      <div v-else-if="loading && !jobs.length" class="ui-card__body">
        <div v-for="n in 3" :key="n" class="sk-row"><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 120px"></div></div>
      </div>
      <div v-else-if="!jobs.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-file-import"></i></div>
        <h3>No imports yet</h3>
        <p>Start with Zoho Books or upload files — you'll see a preview before anything is saved.</p>
      </div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table" v-table-cards>
          <thead>
            <tr>
              <th>Started</th>
              <th>Source</th>
              <th>Status</th>
              <th class="hide-sm">Result</th>
              <th style="width: 44px" data-label=""></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in jobs" :key="j.id" class="is-clickable" @click="open(j)">
              <td class="nowrap">{{ dt(j.created_at) }}</td>
              <td>{{ sourceLabel[j.source] || j.source }}</td>
              <td><span class="ui-badge" :class="statusOf(j).badge">{{ statusOf(j).label }}</span></td>
              <td class="hide-sm muted">{{ resultText(j) }}</td>
              <td class="row-go" @click.stop>
                <router-link :to="`/imports/jobs/${j.id}`" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Open import"><i class="fa-solid fa-chevron-right"></i></router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import { importsApi, JOB_STATUS, SOURCE_LABEL } from '@/services/imports'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/format'

export default {
  name: 'ImportData',
  data() {
    return { jobs: [], conn: null, loading: false, error: '', sourceLabel: SOURCE_LABEL }
  },
  created() {
    this.load()
  },
  methods: {
    dt: formatDateTime,
    statusOf(j) {
      return JOB_STATUS[j.status] || { label: j.status, badge: '' }
    },
    resultText(j) {
      const c = j.counts || {}
      const parts = []
      const add = (k, label) => {
        const x = c[k]
        if (x && (x.created || x.updated)) parts.push(`${x.created + x.updated} ${label}`)
      }
      add('contacts', 'customers')
      add('invoices', 'invoices')
      add('payments', 'payments')
      add('quotes', 'quotes')
      if (j.status === 'draft') return 'Files uploaded — choose what they contain'
      if (j.status === 'preview') return 'Preview ready — waiting for you to start'
      return parts.join(' · ') || j.message || '—'
    },
    open(j) {
      this.$router.push(j.status === 'draft' ? { path: '/imports/files', query: { job: j.id } } : `/imports/jobs/${j.id}`)
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const [jobs, conn] = await Promise.all([importsApi.jobs(), importsApi.connection().catch(() => null)])
        this.jobs = jobs || []
        this.conn = conn
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load imports')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.sources {
  margin-bottom: 20px;
}
.src__body {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px 16px;
  align-items: start;
  height: 100%;
}
.src__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: var(--accent-soft);
  color: var(--accent);
}
.src__icon--zoho {
  background: var(--danger-soft);
  color: var(--danger);
}
.src__text h2 {
  margin: 0 0 4px;
  font-size: 16px;
}
.src__text p {
  margin: 0 0 6px;
  color: var(--text-2);
  font-size: 13.5px;
  line-height: 1.5;
}
.src__status {
  font-weight: 550;
  display: flex;
  gap: 6px;
  align-items: center;
}
.src__status.ok {
  color: var(--success) !important;
}
.src__status.warn {
  color: var(--warning) !important;
}
.src__go {
  grid-column: 2;
  justify-self: start;
}
.sk-row {
  display: flex;
  gap: 12px;
  padding: 10px 0;
}
.nowrap {
  white-space: nowrap;
}
.muted {
  color: var(--text-3);
}
.row-go {
  text-align: right;
}
@media (max-width: 640px) {
  .src__go {
    grid-column: 1 / -1;
  }
}
</style>
