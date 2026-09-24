<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Administration · AI &amp; MCP</div>
        <h1>Connect Claude (MCP)</h1>
        <p>Let Claude and other AI assistants look up and update your ERP records securely, with your permissions.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="testing" data-test="test-connection" @click="testConnection">
          <i :class="testing ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug-circle-check'"></i> Test connection
        </button>
        <button class="ui-btn ui-btn--primary" data-test="new-token" @click="openCreate"><i class="fa-solid fa-key"></i> New token</button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="loadAll">Try again</a></span></div>

    <div v-if="testResult" class="ui-alert" :class="testResult.ok ? 'ui-alert--success' : 'ui-alert--danger'" data-test="test-result">
      <i :class="testResult.ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
      <span v-if="testResult.ok">
        Connection works — the MCP server answered with <strong>{{ testResult.tool_count }} tools</strong>
        ({{ testResult.read_tools }} read, {{ testResult.write_tools }} write) using protocol {{ testResult.protocol_version }} in {{ testResult.duration_ms }} ms.
      </span>
      <span v-else>{{ testResult.message }}</span>
    </div>

    <!-- Server URL -->
    <section class="ui-card url-card">
      <div class="ui-card__head">
        <h2><i class="fa-solid fa-server"></i> Your MCP server URL</h2>
        <div class="head-badges" v-if="info">
          <span class="ui-badge ui-badge--info">{{ info.tool_count }} tools</span>
          <span class="ui-badge">MCP {{ info.protocol_version }}</span>
        </div>
      </div>
      <div class="ui-card__body">
        <div class="url-row">
          <div class="ui-input-group url-input">
            <i class="fa-solid fa-link"></i>
            <input class="ui-input mono" :value="serverUrl" readonly aria-label="MCP server URL" data-test="server-url" @focus="$event.target.select()" />
          </div>
          <button class="ui-btn" @click="copy(serverUrl, 'Server URL copied')"><i class="fa-regular fa-copy"></i> Copy</button>
        </div>
        <p class="ui-hint">Uses the Streamable HTTP transport. Sign-in is by OAuth (one click from Claude) or a personal access token.</p>
        <div v-if="info && !info.oauth_ready" class="ui-alert ui-alert--warning small-alert">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>The server's <code>PUBLIC_APP_URL</code> isn't set, so one-click connectors can't show the sign-in page yet. Tokens still work.</span>
        </div>
      </div>
    </section>

    <!-- Setup steps -->
    <div class="steps">
      <section class="ui-card step">
        <div class="ui-card__head"><h2><span class="step-num">1</span> Claude.ai &amp; Claude Desktop</h2><span class="ui-badge ui-badge--success">Easiest</span></div>
        <div class="ui-card__body">
          <ol class="howto">
            <li>Open <strong>Settings → Connectors</strong> in Claude.</li>
            <li>Choose <strong>Add custom connector</strong>.</li>
            <li>Name it “DASYIN ERP” and paste the server URL.</li>
            <li>Click <strong>Connect</strong>, sign in here and approve access.</li>
          </ol>
          <p class="ui-hint">Nothing else needed — no token to copy. You choose read-only or read &amp; write when you approve.</p>
          <button class="ui-btn ui-btn--sm" @click="copy(serverUrl, 'Server URL copied')"><i class="fa-regular fa-copy"></i> Copy URL</button>
        </div>
      </section>

      <section class="ui-card step">
        <div class="ui-card__head"><h2><span class="step-num">2</span> Claude Code</h2></div>
        <div class="ui-card__body">
          <p class="step-text">Create a token below, then run in your terminal:</p>
          <pre class="code" data-test="claude-code-cmd">{{ claudeCodeCmd }}</pre>
          <button class="ui-btn ui-btn--sm" @click="copy(claudeCodeCmd, 'Command copied')"><i class="fa-regular fa-copy"></i> Copy command</button>
          <p v-if="!lastSecret" class="ui-hint">Replace <code>&lt;token&gt;</code> with a token that starts with <code>dsy_</code>.</p>
        </div>
      </section>

      <section class="ui-card step">
        <div class="ui-card__head"><h2><span class="step-num">3</span> Other MCP clients</h2></div>
        <div class="ui-card__body">
          <p class="step-text">For clients configured with JSON (Cursor, VS Code, Windsurf …):</p>
          <pre class="code">{{ jsonConfig }}</pre>
          <button class="ui-btn ui-btn--sm" @click="copy(jsonConfig, 'Configuration copied')"><i class="fa-regular fa-copy"></i> Copy JSON</button>
        </div>
      </section>
    </div>

    <!-- Tabs -->
    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.key" class="ui-tab" :class="{ 'is-active': tab === t.key }" role="tab" :aria-selected="tab === t.key" :data-test="'tab-' + t.key" @click="setTab(t.key)">
            {{ t.label }}<span v-if="t.count !== null" class="tab-count">{{ t.count }}</span>
          </button>
        </div>
        <div class="toolbar__right">
          <div v-if="tab === 'tools'" class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="toolQuery" class="ui-input" type="search" placeholder="Search tools…" aria-label="Search tools" />
          </div>
          <template v-if="tab === 'activity'">
            <label class="ui-switch"><input v-model="writesOnly" type="checkbox" @change="loadActivity" /> Changes only</label>
            <label v-if="canViewOrg" class="ui-switch"><input v-model="orgActivity" type="checkbox" @change="loadActivity" /> Whole organisation</label>
            <button class="ui-btn ui-btn--ghost ui-btn--sm" aria-label="Refresh activity" @click="loadActivity"><i class="fa-solid fa-rotate"></i></button>
          </template>
        </div>
      </div>

      <!-- Tokens -->
      <div v-if="tab === 'tokens'">
        <div v-if="loading" class="pad"><div class="ui-skeleton" style="height: 120px"></div></div>
        <div v-else-if="!tokens.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-key"></i></div>
          <h3>No access tokens yet</h3>
          <p>Tokens let tools like Claude Code connect without a browser sign-in.</p>
          <button class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-plus"></i> Create a token</button>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-test="tokens-table">
            <thead>
              <tr><th>Name</th><th class="hide-sm">Token</th><th>Access</th><th class="hide-md">Created</th><th class="hide-sm">Last used</th><th class="hide-md">Expires</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="t in tokens" :key="t.id">
                <td class="strong">{{ t.name }}</td>
                <td class="hide-sm mono muted">{{ t.prefix }}…</td>
                <td><span class="ui-badge" :class="t.scope === 'read_write' ? 'ui-badge--warning' : 'ui-badge--info'">{{ scopeLabel(t.scope) }}</span></td>
                <td class="hide-md muted nowrap">{{ formatDate(t.created_at) }}</td>
                <td class="muted hide-sm nowrap">{{ t.last_used_at ? formatDateTime(t.last_used_at) : 'Never' }}</td>
                <td class="hide-md muted nowrap">{{ t.expires_at ? formatDate(t.expires_at) : 'Never' }}</td>
                <td><span class="ui-badge" :class="statusClass(t.status)">{{ t.status }}</span></td>
                <td class="num">
                  <button v-if="t.status === 'active'" class="ui-btn ui-btn--ghost ui-btn--sm danger-text" :data-test="'revoke-' + t.name" @click="revokeToken(t)">Revoke</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Connected apps -->
      <div v-else-if="tab === 'apps'">
        <div v-if="!connections.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-plug"></i></div>
          <h3>No connected apps</h3>
          <p>Apps you approve from Claude (Add custom connector) appear here. You can disconnect them at any time.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-test="apps-table">
            <thead><tr><th>App</th><th class="hide-sm">Redirects to</th><th>Access</th><th class="hide-md">Connected</th><th>Last used</th><th></th></tr></thead>
            <tbody>
              <tr v-for="c in connections" :key="c.id">
                <td class="strong">{{ c.client_name }}</td>
                <td class="hide-sm mono muted">{{ c.redirect_host }}</td>
                <td><span class="ui-badge" :class="c.scope === 'read_write' ? 'ui-badge--warning' : 'ui-badge--info'">{{ scopeLabel(c.scope) }}</span></td>
                <td class="hide-md muted">{{ formatDate(c.created_at) }}</td>
                <td class="muted">{{ c.last_used_at ? formatDateTime(c.last_used_at) : 'Never' }}</td>
                <td class="num"><button class="ui-btn ui-btn--ghost ui-btn--sm danger-text" @click="revokeConnection(c)">Disconnect</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tools -->
      <div v-else-if="tab === 'tools'" class="pad tools" data-test="tools-list">
        <div v-if="!filteredGroups.length" class="ui-empty"><h3>No tools match “{{ toolQuery }}”</h3></div>
        <div v-for="g in filteredGroups" :key="g.area" class="tool-group">
          <h3 class="group-title">{{ g.area }} <span class="muted">{{ g.tools.length }}</span></h3>
          <div class="tool-grid">
            <div v-for="t in g.tools" :key="t.name" class="tool">
              <div class="tool__head">
                <code class="tool__name">{{ t.name }}</code>
                <span class="ui-badge" :class="t.read_only ? 'ui-badge--success' : 'ui-badge--warning'">{{ t.read_only ? 'Read' : 'Write' }}</span>
                <span v-if="t.destructive" class="ui-badge ui-badge--danger">Destructive</span>
              </div>
              <div class="tool__title">{{ t.title }}</div>
              <p class="tool__desc">{{ t.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Activity -->
      <div v-else-if="tab === 'activity'">
        <div v-if="!activity.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <h3>No AI activity yet</h3>
          <p>Every tool call made by Claude or another AI client is recorded here.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-test="activity-table">
            <thead><tr><th>When</th><th>Action</th><th class="hide-sm">Via</th><th>Result</th><th class="hide-md num">Time</th><th class="hide-md">Details</th></tr></thead>
            <tbody>
              <tr v-for="a in activity" :key="a.id">
                <td class="muted nowrap">{{ formatDateTime(a.created_at) }}</td>
                <td>
                  <code class="tool__name">{{ a.tool }}</code>
                  <span v-if="!a.read_only" class="ui-badge ui-badge--warning change">change</span>
                </td>
                <td class="hide-sm muted">{{ a.client_name || sourceLabel(a.source) }}</td>
                <td>
                  <span v-if="a.ok" class="ui-badge ui-badge--success">OK</span>
                  <span v-else class="ui-badge ui-badge--danger" :title="a.error">Error</span>
                  <div v-if="!a.ok" class="err">{{ a.error }}</div>
                </td>
                <td class="hide-md num muted">{{ a.duration_ms }} ms</td>
                <td class="hide-md args mono" :title="a.args">{{ a.args }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Create token -->
    <div v-if="showCreate" class="ui-modal-backdrop" @mousedown.self="closeCreate">
      <div class="ui-modal" role="dialog" aria-labelledby="new-token-title" style="max-width: 520px">
        <div class="ui-modal__head">
          <h2 id="new-token-title">{{ created ? 'Copy your token' : 'New access token' }}</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="closeCreate"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div v-if="!created" class="ui-modal__body">
          <div class="ui-field">
            <label for="tk-name">Name</label>
            <input id="tk-name" v-model="form.name" class="ui-input" maxlength="120" placeholder="e.g. Claude Code on my laptop" data-test="token-name" @keydown.enter="createToken" />
            <div v-if="formError" class="field-error">{{ formError }}</div>
          </div>
          <div class="ui-field">
            <label>Access</label>
            <div class="scope-options">
              <label class="scope-opt" :class="{ 'is-selected': form.scope === 'read' }">
                <input v-model="form.scope" type="radio" value="read" name="scope" />
                <span><strong>Read only</strong><small>Look up customers, invoices, bookings, stock and reports.</small></span>
              </label>
              <label class="scope-opt" :class="{ 'is-selected': form.scope === 'read_write' }">
                <input v-model="form.scope" type="radio" value="read_write" name="scope" data-test="scope-rw" />
                <span><strong>Read &amp; write</strong><small>Also create and update records (invoices, bookings, customers …).</small></span>
              </label>
            </div>
          </div>
          <div class="ui-field">
            <label for="tk-exp">Expires</label>
            <select id="tk-exp" v-model="form.expires" class="ui-select">
              <option :value="30">In 30 days</option>
              <option :value="90">In 90 days</option>
              <option :value="365">In 1 year</option>
              <option :value="0">Never</option>
            </select>
          </div>
        </div>
        <div v-else class="ui-modal__body">
          <div class="ui-alert ui-alert--warning"><i class="fa-solid fa-eye-slash"></i><span>This is the only time the token is shown. Store it somewhere safe.</span></div>
          <div class="url-row">
            <input class="ui-input mono" :value="created.secret" readonly aria-label="New token" data-test="token-secret" @focus="$event.target.select()" />
            <button class="ui-btn ui-btn--primary" @click="copy(created.secret, 'Token copied')"><i class="fa-regular fa-copy"></i> Copy</button>
          </div>
          <p class="ui-hint">Claude Code command with this token:</p>
          <pre class="code">{{ claudeCodeCmd }}</pre>
          <button class="ui-btn ui-btn--sm" @click="copy(claudeCodeCmd, 'Command copied')"><i class="fa-regular fa-copy"></i> Copy command</button>
        </div>
        <div class="ui-modal__foot">
          <template v-if="!created">
            <button class="ui-btn" @click="closeCreate">Cancel</button>
            <button class="ui-btn ui-btn--primary" :disabled="saving" data-test="create-token" @click="createToken">
              <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> Create token
            </button>
          </template>
          <button v-else class="ui-btn ui-btn--primary" data-test="token-done" @click="closeCreate">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, formatDateTime } from '@/utils/format'

const TAB_KEYS = ['tokens', 'apps', 'tools', 'activity']

export default {
  name: 'AiSettings',
  data() {
    return {
      info: null,
      tokens: [],
      connections: [],
      tools: [],
      activity: [],
      canViewOrg: false,
      loading: true,
      loadError: '',
      tab: TAB_KEYS.includes(this.$route.query.tab) ? this.$route.query.tab : 'tokens',
      toolQuery: '',
      writesOnly: false,
      orgActivity: false,
      testing: false,
      testResult: null,
      showCreate: false,
      form: { name: '', scope: 'read', expires: 90 },
      formError: '',
      saving: false,
      created: null,
      lastSecret: ''
    }
  },
  computed: {
    serverUrl() {
      if (this.info?.server_url) return this.info.server_url
      const base = (api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '')
      return (base.startsWith('http') ? base : window.location.origin) + '/mcp'
    },
    claudeCodeCmd() {
      return `claude mcp add --transport http dasyin ${this.serverUrl} --header "Authorization: Bearer ${this.lastSecret || '<token>'}"`
    },
    jsonConfig() {
      return JSON.stringify({ mcpServers: { dasyin: { type: 'http', url: this.serverUrl, headers: { Authorization: `Bearer ${this.lastSecret || '<token>'}` } } } }, null, 2)
    },
    tabs() {
      return [
        { key: 'tokens', label: 'Access tokens', count: this.tokens.filter((t) => t.status === 'active').length },
        { key: 'apps', label: 'Connected apps', count: this.connections.length },
        { key: 'tools', label: 'Available tools', count: this.tools.length },
        { key: 'activity', label: 'AI activity', count: null }
      ]
    },
    filteredGroups() {
      const q = this.toolQuery.trim().toLowerCase()
      const groups = {}
      for (const t of this.tools) {
        if (q && !`${t.name} ${t.title} ${t.description} ${t.area}`.toLowerCase().includes(q)) continue
        ;(groups[t.area] ||= []).push(t)
      }
      return Object.keys(groups)
        .sort((a, b) => (a === 'Overview' ? -1 : b === 'Overview' ? 1 : a.localeCompare(b)))
        .map((area) => ({ area, tools: groups[area].sort((x, y) => Number(y.read_only) - Number(x.read_only) || x.name.localeCompare(y.name)) }))
    }
  },
  created() {
    this.loadAll()
  },
  methods: {
    formatDate,
    formatDateTime,
    async loadAll() {
      this.loading = true
      this.loadError = ''
      try {
        const [info, tokens, conns, tools] = await Promise.all([
          api.get('/mcp/info'),
          api.get('/mcp/tokens'),
          api.get('/mcp/connections'),
          api.get('/mcp/tools')
        ])
        this.info = info.data.data
        this.tokens = tokens.data.data.tokens || []
        this.connections = conns.data.data.connections || []
        this.tools = tools.data.data.tools || []
        await this.loadActivity()
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load AI & MCP settings')
      } finally {
        this.loading = false
      }
    },
    async loadTokens() {
      const { data } = await api.get('/mcp/tokens')
      this.tokens = data.data.tokens || []
    },
    async loadActivity() {
      try {
        const params = { limit: 50 }
        if (this.writesOnly) params.writes_only = 'true'
        if (this.orgActivity) params.scope = 'org'
        const { data } = await api.get('/mcp/activity', { params })
        this.activity = data.data.activity || []
        this.canViewOrg = !!data.data.can_view_org
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load activity'))
      }
    },
    setTab(key) {
      this.tab = key
      this.$router.replace({ query: { ...this.$route.query, tab: key } })
      if (key === 'activity') this.loadActivity()
    },
    scopeLabel(s) {
      return s === 'read_write' ? 'Read & write' : 'Read only'
    },
    statusClass(s) {
      return { active: 'ui-badge--success', revoked: 'ui-badge--void', expired: 'ui-badge--draft' }[s] || ''
    },
    sourceLabel(s) {
      return { token: 'Access token', oauth: 'Connected app', assistant: 'In-app assistant', test: 'Connection test' }[s] || s
    },
    async copy(text, msg) {
      try {
        await navigator.clipboard.writeText(text)
        toast.success(msg)
      } catch {
        toast.error('Copy failed — select the text and copy it manually')
      }
    },
    async testConnection() {
      this.testing = true
      this.testResult = null
      try {
        const { data } = await api.post('/mcp/test')
        this.testResult = data.data
      } catch (e) {
        this.testResult = { ok: false, message: apiErrorMessage(e, 'The MCP server did not respond') }
      } finally {
        this.testing = false
      }
    },
    openCreate() {
      this.form = { name: '', scope: 'read', expires: 90 }
      this.formError = ''
      this.created = null
      this.showCreate = true
      this.$nextTick(() => document.getElementById('tk-name')?.focus())
    },
    closeCreate() {
      this.showCreate = false
      this.created = null
    },
    async createToken() {
      if (!this.form.name.trim()) {
        this.formError = 'Give the token a name so you can recognise it later'
        return
      }
      this.saving = true
      this.formError = ''
      try {
        const { data } = await api.post('/mcp/tokens', { name: this.form.name.trim(), scope: this.form.scope, expires_in_days: Number(this.form.expires) || 0 })
        this.created = data.data
        this.lastSecret = data.data.secret
        await this.loadTokens()
        toast.success('Token created')
      } catch (e) {
        this.formError = apiErrorMessage(e, 'Could not create the token')
      } finally {
        this.saving = false
      }
    },
    async revokeToken(t) {
      const ok = await confirmDialog({ title: 'Revoke token?', message: `“${t.name}” will stop working immediately. Clients using it will be disconnected.`, confirmText: 'Revoke', danger: true })
      if (!ok) return
      try {
        await api.delete(`/mcp/tokens/${t.id}`)
        await this.loadTokens()
        toast.success('Token revoked')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not revoke the token'))
      }
    },
    async revokeConnection(c) {
      const ok = await confirmDialog({ title: `Disconnect ${c.client_name}?`, message: 'The app loses access immediately. You can connect it again later.', confirmText: 'Disconnect', danger: true })
      if (!ok) return
      try {
        await api.delete(`/mcp/connections/${c.id}`)
        const { data } = await api.get('/mcp/connections')
        this.connections = data.data.connections || []
        toast.success('App disconnected')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not disconnect the app'))
      }
    }
  }
}
</script>

<style scoped>
.url-card { margin-bottom: 16px; }
.head-badges { display: flex; gap: 6px; }
.url-row { display: flex; gap: 8px; align-items: center; }
.url-input { flex: 1; min-width: 0; }
.url-row .ui-input { flex: 1; min-width: 0; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; }
.small-alert { margin-top: 12px; margin-bottom: 0; }
.ui-card__head h2 i { color: var(--text-3); margin-right: 6px; }

.steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.step .ui-card__body { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.step-num {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  margin-right: 6px;
}
.howto { margin: 0; padding-left: 18px; color: var(--text-2); line-height: 1.7; font-size: 13.5px; }
.step-text { margin: 0; color: var(--text-2); font-size: 13.5px; }
.code {
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 220px;
  overflow: auto;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar__right { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.search { width: 260px; }
.tab-count { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--text-3); font-variant-numeric: tabular-nums; }
.pad { padding: 16px; }
.strong { font-weight: 600; }
.muted { color: var(--text-3); }
.nowrap { white-space: nowrap; }
.danger-text { color: var(--danger); }
.num { text-align: right; font-variant-numeric: tabular-nums; }

.tool-group + .tool-group { margin-top: 20px; }
.group-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-2); margin: 0 0 10px; }
.group-title .muted { font-weight: 500; margin-left: 4px; }
.tool-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
.tool { border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; background: var(--surface); }
.tool__head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tool__name { font-size: 12.5px; color: var(--text); background: var(--bg-subtle); padding: 2px 6px; border-radius: 6px; }
.tool__title { font-weight: 600; margin-top: 8px; font-size: 13.5px; }
.tool__desc { margin: 4px 0 0; color: var(--text-2); font-size: 12.5px; line-height: 1.5; }
.change { margin-left: 6px; }
.err { color: var(--danger); font-size: 12px; margin-top: 4px; max-width: 320px; }
.args { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-3); }

.scope-options { display: grid; gap: 8px; }
.scope-opt {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--surface);
}
.scope-opt.is-selected { border-color: var(--accent); background: var(--accent-soft); }
.scope-opt input { margin-top: 3px; }
.scope-opt span { display: flex; flex-direction: column; gap: 2px; }
.scope-opt small { color: var(--text-2); font-size: 12.5px; }
.field-error { color: var(--danger); font-size: 12.5px; margin-top: 4px; }

@media (max-width: 1100px) {
  .steps { grid-template-columns: 1fr; }
  .hide-md { display: none; }
}
@media (max-width: 700px) {
  .hide-sm { display: none; }
  .search { width: 100%; }
  .toolbar__right { width: 100%; }
  .url-row { flex-wrap: wrap; }
  .url-row .ui-btn { width: 100%; justify-content: center; }
  .tool-grid { grid-template-columns: 1fr; }
}
</style>
