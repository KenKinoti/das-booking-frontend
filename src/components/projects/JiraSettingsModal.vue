<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <div class="ui-modal" style="max-width: 720px" role="dialog" aria-modal="true" aria-label="Jira settings">
      <div class="ui-modal__head">
        <h2><i class="fa-brands fa-jira jira-ic"></i> {{ conn.connected ? 'Jira settings' : 'Connect Jira' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div v-if="loading" class="loading">
          <div class="ui-skeleton" style="height: 40px"></div>
          <div class="ui-skeleton" style="height: 40px; margin-top: 12px"></div>
          <div class="ui-skeleton" style="height: 40px; margin-top: 12px"></div>
        </div>

        <!-- Credentials -->
        <form v-else-if="editingCreds" id="jira-creds" novalidate @submit.prevent="saveCreds">
          <p class="lead">Sync projects and issues from Jira Cloud (read-only). Issues stay in Jira — DASYIN keeps an up-to-date copy for planning and reporting.</p>
          <div v-if="credError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ credError }}</span></div>
          <div v-if="testOk" class="ui-alert ui-alert--success"><i class="fa-solid fa-circle-check"></i><span>Connected as <strong>{{ testOk }}</strong>. Save to continue.</span></div>

          <div class="ui-field">
            <label for="jira-site">Jira site URL</label>
            <div class="ui-input-group">
              <i class="fa-solid fa-globe"></i>
              <input id="jira-site" v-model.trim="form.site_url" class="ui-input" placeholder="https://your-team.atlassian.net" autocomplete="url" required @input="testOk = ''" />
            </div>
          </div>
          <div class="ui-field">
            <label for="jira-email">Atlassian account email</label>
            <div class="ui-input-group">
              <i class="fa-regular fa-envelope"></i>
              <input id="jira-email" v-model.trim="form.email" type="email" class="ui-input" placeholder="you@company.com" autocomplete="email" required @input="testOk = ''" />
            </div>
          </div>
          <div class="ui-field">
            <label for="jira-token">API token</label>
            <div class="ui-input-group">
              <i class="fa-solid fa-key"></i>
              <input
                id="jira-token"
                v-model.trim="form.api_token"
                :type="showToken ? 'text' : 'password'"
                class="ui-input"
                :placeholder="conn.has_token ? `${conn.api_token_masked} (leave blank to keep)` : 'Paste your API token'"
                autocomplete="off"
                @input="testOk = ''"
              />
              <button type="button" class="reveal" :aria-label="showToken ? 'Hide token' : 'Show token'" @click="showToken = !showToken"><i :class="showToken ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i></button>
            </div>
            <p class="ui-hint">
              Create one at
              <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener">id.atlassian.com → Security → API tokens <i class="fa-solid fa-arrow-up-right-from-square"></i></a>.
              It's stored encrypted and never shown again.
            </p>
          </div>
        </form>

        <!-- Connected -->
        <div v-else>
          <div class="conn-card">
            <span class="conn-ic"><i class="fa-brands fa-jira"></i></span>
            <div class="conn-info">
              <strong>{{ siteHost }}</strong>
              <span>{{ conn.account_name ? `${conn.account_name} · ` : '' }}{{ conn.email }} · token {{ conn.api_token_masked }}</span>
            </div>
            <button class="ui-btn ui-btn--sm" @click="editCreds"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
          </div>

          <div class="sync-status" :class="`is-${conn.last_sync_status || 'never'}`">
            <i :class="syncIcon"></i>
            <div>
              <strong v-if="conn.last_sync_at">Last synced {{ dateTime(conn.last_sync_at) }}</strong>
              <strong v-else>Not synced yet</strong>
              <span v-if="conn.last_sync_stats">
                {{ conn.last_sync_stats.issues }} issues · {{ conn.last_sync_stats.created }} new · {{ conn.last_sync_stats.updated }} updated · {{ conn.last_sync_stats.removed }} removed
              </span>
              <span v-if="conn.last_sync_message" class="err">{{ conn.last_sync_message }}</span>
            </div>
          </div>

          <div class="pick-head">
            <h3>Projects to sync <span class="muted">{{ selected.length }} selected</span></h3>
            <div class="ui-input-group pick-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="pq" class="ui-input" type="search" placeholder="Filter projects…" aria-label="Filter Jira projects" />
            </div>
          </div>

          <div v-if="remoteError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ remoteError }} <a href="#" @click.prevent="loadRemote">Retry</a></span></div>
          <div v-else-if="remoteLoading" class="pick-list">
            <div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 44px; margin: 6px"></div>
          </div>
          <div v-else-if="!remote.length" class="pick-empty">No projects are visible to this Jira account.</div>
          <div v-else class="pick-list">
            <label v-for="p in filteredRemote" :key="p.id" class="pick" :class="{ on: selected.includes(p.key) }">
              <input type="checkbox" :checked="selected.includes(p.key)" @change="toggle(p.key)" />
              <span class="pick-key">{{ p.key }}</span>
              <span class="pick-name">
                <strong>{{ p.name }}</strong>
                <small>{{ typeLabel(p.type) }}<template v-if="p.lead"> · Lead {{ p.lead }}</template></small>
              </span>
              <span v-if="p.synced" class="ui-badge ui-badge--success">Synced</span>
            </label>
            <p v-if="!filteredRemote.length" class="pick-empty">No projects match “{{ pq }}”.</p>
          </div>

          <details class="adv" :open="!!form.default_jql">
            <summary>Advanced: issue filter (JQL)</summary>
            <div class="ui-field">
              <input v-model="form.default_jql" class="ui-input mono" placeholder="e.g. updated >= -90d AND issuetype != Epic" aria-label="Issue filter JQL" />
              <p class="ui-hint">Optional. Added to each project's query — only matching issues are synced.</p>
            </div>
          </details>

          <div v-if="lastResult" class="result">
            <div v-for="r in lastResult.projects" :key="r.key" class="result-row">
              <i :class="r.error ? 'fa-solid fa-circle-xmark txt-danger' : 'fa-solid fa-circle-check txt-success'"></i>
              <strong>{{ r.key }}</strong>
              <span v-if="r.error" class="txt-danger">{{ r.error }}</span>
              <span v-else class="muted">{{ r.issues }} issues · {{ r.created }} new · {{ r.updated }} updated · {{ r.removed }} removed</span>
            </div>
          </div>
        </div>
      </div>

      <div class="ui-modal__foot">
        <template v-if="editingCreds && !loading">
          <button v-if="conn.connected" type="button" class="ui-btn" @click="cancelEdit">Cancel</button>
          <span class="spacer"></span>
          <button type="button" class="ui-btn" :disabled="testing || saving" @click="test">
            <i :class="testing ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-plug-circle-check'"></i> Test connection
          </button>
          <button type="submit" form="jira-creds" class="ui-btn ui-btn--primary" :disabled="saving || testing">
            <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-link'"></i> {{ conn.connected ? 'Save' : 'Connect' }}
          </button>
        </template>
        <template v-else-if="!loading">
          <button type="button" class="ui-btn ui-btn--ghost danger-link" :disabled="syncing" @click="disconnect"><i class="fa-solid fa-link-slash"></i> Disconnect</button>
          <span class="spacer"></span>
          <button type="button" class="ui-btn" :disabled="saving || syncing" @click="saveSelection">
            <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-floppy-disk'"></i> Save
          </button>
          <button type="button" class="ui-btn ui-btn--primary" :disabled="syncing || !selected.length" @click="syncNow">
            <i :class="syncing ? 'fa-solid fa-arrows-rotate fa-spin' : 'fa-solid fa-arrows-rotate'"></i> {{ syncing ? 'Syncing…' : 'Sync now' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { pmApi } from '@/services/projects'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'

const TYPE_LABELS = { software: 'Software', business: 'Business', service_desk: 'Service management', product_discovery: 'Product discovery' }

export default {
  name: 'JiraSettingsModal',
  emits: ['close', 'changed'],
  data() {
    return {
      loading: true,
      conn: { connected: false },
      editingCreds: true,
      form: { site_url: '', email: '', api_token: '', default_jql: '' },
      showToken: false,
      credError: '',
      testOk: '',
      testing: false,
      saving: false,
      syncing: false,
      remote: [],
      remoteLoading: false,
      remoteError: '',
      selected: [],
      pq: '',
      lastResult: null,
      dirty: false
    }
  },
  computed: {
    siteHost() {
      return String(this.conn.site_url || '').replace(/^https?:\/\//, '')
    },
    filteredRemote() {
      const q = this.pq.trim().toLowerCase()
      return q ? this.remote.filter((p) => `${p.key} ${p.name}`.toLowerCase().includes(q)) : this.remote
    },
    syncIcon() {
      return {
        success: 'fa-solid fa-circle-check',
        partial: 'fa-solid fa-triangle-exclamation',
        error: 'fa-solid fa-circle-xmark'
      }[this.conn.last_sync_status] || 'fa-regular fa-clock'
    }
  },
  created() {
    this.load()
  },
  methods: {
    dateTime: formatDateTime,
    typeLabel: (t) => TYPE_LABELS[t] || t || 'Project',
    close() {
      this.$emit('close', this.dirty)
    },
    applyConn(c) {
      this.conn = c || { connected: false }
      this.form.site_url = this.conn.site_url || this.form.site_url
      this.form.email = this.conn.email || this.form.email
      this.form.default_jql = this.conn.default_jql || ''
      this.form.api_token = ''
      this.selected = [...(this.conn.project_keys || [])]
    },
    async load() {
      this.loading = true
      try {
        this.applyConn(await pmApi.jiraConnection())
        this.editingCreds = !this.conn.connected
        if (this.conn.connected) this.loadRemote()
      } catch (e) {
        this.credError = apiErrorMessage(e, 'Could not load the Jira connection')
      } finally {
        this.loading = false
      }
    },
    async loadRemote() {
      this.remoteLoading = true
      this.remoteError = ''
      try {
        const data = await pmApi.jiraProjects()
        this.remote = data?.projects || []
      } catch (e) {
        this.remoteError = apiErrorMessage(e, 'Could not list Jira projects')
      } finally {
        this.remoteLoading = false
      }
    },
    credPayload() {
      const p = { site_url: this.form.site_url, email: this.form.email }
      if (this.form.api_token) p.api_token = this.form.api_token
      return p
    },
    validate() {
      if (!this.form.site_url) return 'Enter your Jira site URL, e.g. https://your-team.atlassian.net'
      if (!/^\S+@\S+\.\S+$/.test(this.form.email)) return 'Enter the email address of your Atlassian account'
      if (!this.form.api_token && !this.conn.has_token) return 'Paste an API token'
      return ''
    },
    async test() {
      this.credError = this.validate()
      this.testOk = ''
      if (this.credError) return
      this.testing = true
      try {
        const r = await pmApi.testJira(this.credPayload())
        if (r?.ok === false) this.credError = r.message || 'Connection test failed'
        else this.testOk = r?.account?.display_name || r?.account?.email || 'your account'
      } catch (e) {
        this.credError = apiErrorMessage(e, 'Connection test failed')
      } finally {
        this.testing = false
      }
    },
    async saveCreds() {
      this.credError = this.validate()
      if (this.credError) return
      this.saving = true
      try {
        // verify before saving so a typo doesn't get stored
        const r = await pmApi.testJira(this.credPayload())
        if (r?.ok === false) {
          this.credError = r.message || 'Could not connect to Jira'
          return
        }
        this.applyConn(await pmApi.saveJiraConnection(this.credPayload()))
        this.conn.account_name = r?.account?.display_name || this.conn.account_name
        this.editingCreds = false
        this.testOk = ''
        this.dirty = true
        toast.success('Jira connected')
        this.$emit('changed')
        this.loadRemote()
      } catch (e) {
        this.credError = apiErrorMessage(e, 'Could not connect to Jira')
      } finally {
        this.saving = false
      }
    },
    editCreds() {
      this.editingCreds = true
      this.credError = ''
      this.testOk = ''
    },
    cancelEdit() {
      this.applyConn(this.conn)
      this.editingCreds = false
      this.credError = ''
    },
    toggle(key) {
      const i = this.selected.indexOf(key)
      if (i >= 0) this.selected.splice(i, 1)
      else this.selected.push(key)
    },
    async saveSelection(silent) {
      this.saving = true
      try {
        this.applyConn(await pmApi.saveJiraConnection({ project_keys: this.selected, default_jql: this.form.default_jql }))
        if (silent !== true) toast.success('Jira sync settings saved')
        return true
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save settings'))
        return false
      } finally {
        this.saving = false
      }
    },
    async syncNow() {
      if (!this.selected.length) return
      if (!(await this.saveSelection(true))) return
      this.syncing = true
      this.lastResult = null
      try {
        const r = await pmApi.syncJira(this.selected)
        this.lastResult = r?.result || null
        const res = r?.result || {}
        const summary = `${res.issues || 0} issues from ${(res.projects || []).length - (res.errors || 0)} project(s)`
        if (r?.status === 'success') toast.success(`Synced ${summary}`)
        else toast.warning(`Synced with problems — ${r?.message || 'see details'}`)
        this.dirty = true
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Sync failed'))
      } finally {
        this.syncing = false
        try {
          this.applyConn(await pmApi.jiraConnection())
          this.loadRemote()
        } catch {
          /* keep current view */
        }
      }
    },
    async disconnect() {
      const okd = await confirmDialog({
        title: 'Disconnect Jira?',
        message: 'The saved credentials are deleted and synced Jira projects and issues are removed from DASYIN. Nothing is changed in Jira, and you can reconnect at any time.',
        confirmText: 'Disconnect',
        danger: true
      })
      if (!okd) return
      try {
        await pmApi.disconnectJira()
        toast.success('Jira disconnected')
        this.dirty = true
        this.$emit('changed')
        this.applyConn({ connected: false })
        this.form = { site_url: '', email: '', api_token: '', default_jql: '' }
        this.remote = []
        this.lastResult = null
        this.editingCreds = true
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not disconnect'))
      }
    }
  }
}
</script>

<style scoped>
.jira-ic {
  color: var(--info);
  margin-right: 4px;
}
.ui-alert {
  margin-bottom: 14px;
}
.lead {
  color: var(--text-2);
  margin: 0 0 16px;
  font-size: 14px;
}
.ui-input-group {
  position: relative;
}
.reveal {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--text-3);
  padding: 6px 8px;
  cursor: pointer;
}
#jira-token {
  padding-right: 40px;
}
.ui-hint a {
  color: var(--accent);
}
.ui-hint a i {
  font-size: 10px;
}
.conn-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.conn-ic {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--info-soft);
  color: var(--info);
  font-size: 18px;
  flex-shrink: 0;
}
.conn-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 14px;
  color: var(--text);
}
.conn-info span {
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sync-status {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 12px 0 18px;
  font-size: 13px;
  color: var(--text-2);
}
.sync-status > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sync-status strong {
  color: var(--text);
  font-weight: 600;
}
.sync-status > i {
  margin-top: 2px;
  color: var(--text-3);
}
.sync-status.is-success > i { color: var(--success); }
.sync-status.is-partial > i { color: var(--warning); }
.sync-status.is-error > i { color: var(--danger); }
.sync-status .err {
  color: var(--danger);
  overflow-wrap: anywhere;
}
.pick-head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.pick-head h3 {
  font-size: 15px;
  margin: 0;
  color: var(--text);
}
.pick-head .muted {
  font-weight: 400;
  font-size: 13px;
  margin-left: 6px;
}
.pick-search {
  flex: 0 1 240px;
}
.pick-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 290px;
  overflow-y: auto;
  background: var(--surface);
}
.pick {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.pick:last-child {
  border-bottom: 0;
}
.pick:hover {
  background: var(--surface-hover);
}
.pick.on {
  background: var(--accent-soft);
}
.pick input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  flex-shrink: 0;
}
.pick-key {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  min-width: 56px;
}
.pick-name {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 14px;
  color: var(--text);
}
.pick-name strong {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pick-name small {
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pick-empty {
  color: var(--text-3);
  font-size: 13px;
  padding: 14px;
  margin: 0;
}
.adv {
  margin-top: 14px;
  font-size: 14px;
  color: var(--text-2);
}
.adv summary {
  cursor: pointer;
  margin-bottom: 8px;
}
.mono {
  font-family: var(--font-mono);
  font-size: 13px;
}
.result {
  margin-top: 14px;
  border-top: 1px solid var(--border);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.result-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex-wrap: wrap;
  color: var(--text);
}
.muted { color: var(--text-3); }
.txt-danger { color: var(--danger); }
.txt-success { color: var(--success); }
.spacer { flex: 1; }
.danger-link { color: var(--danger); }
@media (max-width: 520px) {
  .pick {
    gap: 10px;
    padding: 10px 12px;
  }
  .pick-key {
    min-width: 0;
  }
  .pick-search {
    flex: 1 1 100%;
  }
  .ui-modal__foot {
    flex-wrap: wrap;
  }
}
</style>
