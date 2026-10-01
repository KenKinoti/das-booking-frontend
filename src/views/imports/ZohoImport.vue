<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow"><router-link to="/imports">Import data</router-link> · Zoho Books</div>
        <h1>Import from Zoho Books</h1>
        <p>A read-only connection: we copy your data and never change anything in Zoho or email your customers.</p>
      </div>
      <div class="ui-actions">
        <button v-if="info?.connected" class="ui-btn ui-btn--danger" data-testid="disconnect" :disabled="busy" @click="disconnect"><i class="fa-solid fa-link-slash"></i> Disconnect</button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="callbackError" class="ui-alert ui-alert--danger" data-testid="oauth-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ callbackError }}</span></div>

    <div v-if="!info && !loadError" class="ui-card ui-card__body">
      <div class="ui-skeleton" style="height: 18px; width: 40%; margin-bottom: 12px"></div>
      <div class="ui-skeleton" style="height: 120px"></div>
    </div>

    <template v-if="info">
      <!-- Step 1: connect -->
      <section class="ui-card step" data-testid="connect-card">
        <div class="ui-card__head">
          <h2><span class="step__n" :class="{ done: info.connected }"><i v-if="info.connected" class="fa-solid fa-check"></i><template v-else>1</template></span> Connect your Zoho account</h2>
          <span v-if="info.connected" class="ui-badge ui-badge--success">Connected</span>
        </div>
        <div class="ui-card__body">
          <div v-if="info.connected && !editing" class="conn">
            <div class="conn__row">
              <div>
                <strong>{{ conn.zoho_org_name || 'Zoho Books' }}</strong>
                <small class="muted">
                  {{ dcLabel(conn.dc) }}<template v-if="conn.zoho_currency"> · base currency {{ conn.zoho_currency }}</template><template v-if="conn.connected_at"> · connected {{ dt(conn.connected_at) }}</template><template v-if="conn.last_synced_at"> · last import {{ dt(conn.last_synced_at) }}</template>
                </small>
              </div>
              <div class="conn__btns">
                <button class="ui-btn ui-btn--sm" data-testid="change-org" @click="showOrgPicker = true; loadOrgs()"><i class="fa-solid fa-building"></i> Change organisation</button>
                <button class="ui-btn ui-btn--sm" @click="editing = true"><i class="fa-solid fa-pen"></i> Change app</button>
              </div>
            </div>
            <div v-if="conn.last_error" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ conn.last_error }} <a href="#" @click.prevent="startConnect">Reconnect</a></span></div>
            <div v-if="!conn.zoho_org_id || showOrgPicker" class="ui-field org-pick">
              <label for="zoho-org">Zoho Books organisation to import from</label>
              <div class="org-row">
                <select id="zoho-org" v-model="orgChoice" class="ui-select" data-testid="org-select" @focus="loadOrgs">
                  <option value="" disabled>{{ orgsLoading ? 'Loading…' : 'Choose an organisation' }}</option>
                  <option v-for="o in orgs" :key="o.organization_id" :value="o.organization_id">{{ o.name }} ({{ o.currency_code }})</option>
                </select>
                <button class="ui-btn ui-btn--primary" :disabled="!orgChoice || orgChoice === conn.zoho_org_id || busy" @click="chooseOrg">Use this</button>
              </div>
            </div>
          </div>

          <div v-else class="setup">
            <ol class="howto">
              <li>
                Open the <a :href="dc.console" target="_blank" rel="noopener">Zoho API console ({{ dc.console.replace('https://', '') }})</a>, signed in as a Zoho Books admin, and click <strong>Add client → Server-based Applications</strong>.
              </li>
              <li>
                Client name: <code>DASYIN ERP</code>. Homepage URL: <code>{{ appOrigin }}</code>. Authorized Redirect URI — copy this exactly:
                <div class="copy-row">
                  <input class="ui-input mono" :value="info.redirect_uri" readonly aria-label="Redirect URI" data-testid="redirect-uri" @focus="$event.target.select()" />
                  <button class="ui-btn ui-btn--icon" title="Copy" aria-label="Copy redirect URI" @click="copy(info.redirect_uri)"><i class="fa-regular fa-copy"></i></button>
                </div>
              </li>
              <li>Click <strong>Create</strong>, then copy the <strong>Client ID</strong> and <strong>Client Secret</strong> into the form below and click <strong>Save &amp; connect</strong>. Zoho asks you to approve read-only access ({{ info.scopes.length }} scopes).</li>
            </ol>
            <form class="setup__form" @submit.prevent="saveAndConnect">
              <div class="ui-field">
                <label for="zoho-dc">Zoho data centre</label>
                <select id="zoho-dc" v-model="form.dc" class="ui-select" data-testid="dc-select">
                  <option v-for="d in info.data_centers" :key="d.code" :value="d.code">{{ d.label }}</option>
                </select>
                <span class="ui-hint">The address you sign in at — e.g. books.zoho.com.au is Australia.</span>
              </div>
              <div class="ui-field" :class="{ 'is-invalid': errors.client_id }">
                <label for="zoho-cid">Client ID</label>
                <input id="zoho-cid" v-model.trim="form.client_id" class="ui-input mono" autocomplete="off" placeholder="1000.XXXXXXXXXXXX" data-testid="client-id" />
                <span v-if="errors.client_id" class="ui-hint err">{{ errors.client_id }}</span>
              </div>
              <div class="ui-field" :class="{ 'is-invalid': errors.client_secret }">
                <label for="zoho-secret">Client Secret</label>
                <input id="zoho-secret" v-model.trim="form.client_secret" type="password" class="ui-input mono" autocomplete="new-password" :placeholder="info.has_secret ? 'Saved — leave blank to keep' : ''" data-testid="client-secret" />
                <span v-if="errors.client_secret" class="ui-hint err">{{ errors.client_secret }}</span>
                <span v-else class="ui-hint">Stored encrypted.</span>
              </div>
              <div class="setup__actions">
                <button v-if="info.connected" type="button" class="ui-btn" @click="editing = false">Cancel</button>
                <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="save-connect">
                  <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-plug'"></i> Save &amp; connect
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <!-- Step 2: choose & preview -->
      <section class="ui-card step" :class="{ 'is-disabled': !ready }" data-testid="options-card">
        <div class="ui-card__head">
          <h2><span class="step__n">2</span> Choose what to import</h2>
        </div>
        <div class="ui-card__body">
          <ImportOptions v-model="options" source="zoho_api" :disabled="!ready" :show-overwrite="!!lastZohoJob" />
          <div class="preview-bar">
            <p class="muted small">Next you'll see a preview — counts, samples, duplicates and currencies. Nothing is saved until you click <strong>Start import</strong>.</p>
            <button class="ui-btn ui-btn--primary" :disabled="!ready || busy" data-testid="build-preview" @click="buildPreview">
              <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-magnifying-glass-chart'"></i> {{ lastZohoJob ? 'Preview re-sync' : 'Preview import' }}
            </button>
          </div>
        </div>
      </section>

      <FixItemPrices v-if="info.connected || jobs.length" :connected="!!info.connected" :home-currency="info.home_currency || ''" />

      <section v-if="zohoJobs.length" class="ui-card">
        <div class="ui-card__head"><h2>Previous Zoho imports</h2></div>
        <ul class="jobs">
          <li v-for="j in zohoJobs" :key="j.id">
            <router-link :to="`/imports/jobs/${j.id}`">{{ dt(j.created_at) }}</router-link>
            <span class="ui-badge" :class="(status[j.status] || {}).badge">{{ (status[j.status] || {}).label || j.status }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script>
import { importsApi, JOB_STATUS } from '@/services/imports'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import ImportOptions, { DEFAULT_OPTIONS } from '@/components/imports/ImportOptions.vue'
import FixItemPrices from './FixItemPrices.vue'

export default {
  name: 'ZohoImport',
  components: { ImportOptions, FixItemPrices },
  data() {
    return {
      info: null,
      loadError: '',
      callbackError: '',
      editing: false,
      busy: false,
      form: { dc: 'com.au', client_id: '', client_secret: '' },
      errors: {},
      orgs: [],
      orgsLoading: false,
      orgChoice: '',
      showOrgPicker: false,
      options: DEFAULT_OPTIONS(),
      jobs: [],
      status: JOB_STATUS
    }
  },
  computed: {
    conn() {
      return this.info?.connection || {}
    },
    dc() {
      return (this.info?.data_centers || []).find((d) => d.code === this.form.dc) || { console: 'https://api-console.zoho.com.au' }
    },
    appOrigin() {
      return window.location.origin
    },
    ready() {
      return !!(this.info?.connected && this.conn.zoho_org_id)
    },
    zohoJobs() {
      return this.jobs.filter((j) => j.source === 'zoho_api').slice(0, 5)
    },
    lastZohoJob() {
      return this.zohoJobs.find((j) => j.status === 'completed')
    }
  },
  async created() {
    const q = this.$route.query
    if (q.zoho === 'connected') toast.success('Zoho Books connected')
    if (q.zoho === 'error') this.callbackError = q.message || 'Zoho did not connect.'
    if (q.zoho) this.$router.replace({ query: {} })
    await this.load()
  },
  methods: {
    dt: formatDateTime,
    dcLabel(code) {
      return (this.info?.data_centers || []).find((d) => d.code === code)?.label || code
    },
    async load() {
      this.loadError = ''
      try {
        const [info, jobs] = await Promise.all([importsApi.connection(), importsApi.jobs().catch(() => [])])
        this.info = info
        this.jobs = jobs || []
        this.form.dc = info.connection?.dc || info.default_dc || 'com.au'
        this.form.client_id = info.connection?.client_id || ''
        this.form.client_secret = ''
        this.orgChoice = info.connection?.zoho_org_id || ''
        if (info.connected && !info.connection?.zoho_org_id) this.loadOrgs()
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the Zoho connection')
      }
    },
    async loadOrgs() {
      if (this.orgsLoading || this.orgs.length) return
      this.orgsLoading = true
      try {
        this.orgs = (await importsApi.organizations()) || []
        if (!this.orgChoice && this.orgs.length) this.orgChoice = this.orgs[0].organization_id
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not list your Zoho organisations'))
      } finally {
        this.orgsLoading = false
      }
    },
    async chooseOrg() {
      this.busy = true
      try {
        this.info = await importsApi.chooseOrganization(this.orgChoice)
        this.showOrgPicker = false
        toast.success('Organisation selected')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not select the organisation'))
      } finally {
        this.busy = false
      }
    },
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Copied')
      } catch {
        toast.info('Select the text and copy it')
      }
    },
    validate() {
      this.errors = {}
      if (!this.form.client_id) this.errors.client_id = 'Paste the Client ID from the Zoho API console'
      if (!this.form.client_secret && !this.info.has_secret) this.errors.client_secret = 'Paste the Client Secret'
      return !Object.keys(this.errors).length
    },
    async saveAndConnect() {
      if (!this.validate()) return
      this.busy = true
      try {
        this.info = await importsApi.saveConnection({ ...this.form })
        await this.startConnect()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the Zoho app'))
        this.busy = false
      }
    },
    async startConnect() {
      this.busy = true
      try {
        const res = await importsApi.connect(`${window.location.origin}/imports/zoho`)
        window.location.assign(res.url)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not start the Zoho sign-in'))
        this.busy = false
      }
    },
    async disconnect() {
      const yes = await confirmDialog({ title: 'Disconnect Zoho Books?', message: 'We stop reading from Zoho and forget the access token. Everything already imported stays.', confirmText: 'Disconnect', danger: true })
      if (!yes) return
      this.busy = true
      try {
        await importsApi.disconnect()
        toast.success('Zoho Books disconnected')
        this.orgs = []
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not disconnect'))
      } finally {
        this.busy = false
      }
    },
    async buildPreview() {
      this.busy = true
      try {
        const job = await importsApi.previewZoho(this.options)
        this.$router.push(`/imports/jobs/${job.id}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not start the preview'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.step {
  margin-bottom: 16px;
}
.step.is-disabled {
  opacity: 0.6;
}
.step h2 {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step__n {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 12.5px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.step__n.done {
  background: var(--success-soft);
  color: var(--success);
}
.conn {
  display: grid;
  gap: 14px;
}
.conn__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.conn__row strong {
  display: block;
  font-size: 15px;
}
.muted {
  color: var(--text-3);
}
.conn__btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.small {
  font-size: 12.5px;
}
.org-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.org-row .ui-select {
  flex: 1;
  min-width: 200px;
}
.setup {
  display: grid;
  gap: 18px;
}
.howto {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 10px;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.55;
}
.howto code {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 12.5px;
  word-break: break-all;
}
.copy-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  max-width: 640px;
}
.copy-row .ui-input {
  flex: 1;
  min-width: 0;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}
.setup__form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  align-items: start;
}
.setup__actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.err {
  color: var(--danger);
}
.preview-bar {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}
.preview-bar p {
  margin: 0;
  flex: 1;
  min-width: 220px;
}
.jobs {
  list-style: none;
  margin: 0;
  padding: 4px 16px 12px;
}
.jobs li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  gap: 10px;
}
.jobs li:last-child {
  border-bottom: 0;
}
</style>
