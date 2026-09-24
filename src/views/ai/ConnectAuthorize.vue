<template>
  <div class="consent-wrap">
    <div class="consent ui-card" data-test="consent">
      <div class="brand">
        <span class="brand__mark"><i class="fa-solid fa-cube"></i></span>
        <span class="brand__name">DASYIN ERP</span>
      </div>

      <div v-if="loading" class="ui-card__body">
        <div class="ui-skeleton" style="height: 22px; width: 70%"></div>
        <div class="ui-skeleton" style="height: 90px; margin-top: 14px"></div>
      </div>

      <div v-else-if="error" class="ui-card__body">
        <div class="state-icon danger"><i class="fa-solid fa-link-slash"></i></div>
        <h1>Can't complete this connection</h1>
        <p class="lead">{{ error }}</p>
        <router-link to="/settings/ai" class="ui-btn">Go to AI &amp; MCP settings</router-link>
      </div>

      <div v-else-if="done" class="ui-card__body">
        <div class="state-icon" :class="done === 'allowed' ? 'success' : ''"><i :class="done === 'allowed' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'"></i></div>
        <h1>{{ done === 'allowed' ? 'Connected' : 'Connection declined' }}</h1>
        <p class="lead">Returning you to {{ req.client.name }}… You can close this tab if nothing happens.</p>
      </div>

      <div v-else class="ui-card__body">
        <h1><strong>{{ req.client.name }}</strong> wants to access your ERP</h1>
        <p class="lead">
          Signed in as <strong>{{ req.user.name || req.user.email }}</strong>{{ ' ' }}<span v-if="req.user.name" class="muted">({{ req.user.email }})</span>
          in <strong>{{ req.organization.name }}</strong>.
        </p>

        <div class="perm-list">
          <div class="perm">
            <i class="fa-solid fa-eye"></i>
            <div>
              <strong>Read your business data</strong>
              <small>Customers, invoices &amp; quotes, bookings, products, reports — {{ req.read_tool_count }} read tools.</small>
            </div>
          </div>
          <label v-if="req.write_requested" class="perm perm--toggle" :class="{ 'is-on': write }">
            <i class="fa-solid fa-pen-to-square"></i>
            <div>
              <strong>Create and update records</strong>
              <small>Create invoices, record payments, book appointments, update customers and more. Destructive actions (void, cancel) are flagged for confirmation.</small>
            </div>
            <span class="ui-switch"><input v-model="write" type="checkbox" data-test="allow-write" aria-label="Allow changes" /></span>
          </label>
        </div>

        <div class="meta">
          <div><i class="fa-solid fa-shield-halved"></i> Access follows your role ({{ roleLabel }}) and your organisation's plan.</div>
          <div><i class="fa-solid fa-arrow-up-right-from-square"></i> You'll be sent back to <span class="mono">{{ req.client.redirect_host }}</span>.</div>
          <div><i class="fa-solid fa-plug-circle-xmark"></i> Disconnect any time in Settings → AI &amp; MCP.</div>
          <div v-if="req.already_connected"><i class="fa-solid fa-circle-info"></i> This app is already connected; approving updates its access.</div>
        </div>

        <div class="actions">
          <button class="ui-btn" :disabled="busy" data-test="deny" @click="decide(false)">Deny</button>
          <button class="ui-btn ui-btn--primary" :disabled="busy" data-test="approve" @click="decide(true)">
            <i v-if="busy" class="fa-solid fa-spinner fa-spin"></i>
            {{ write ? 'Allow read & write' : 'Allow read-only' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'ConnectAuthorize',
  data() {
    return { loading: true, error: '', req: null, write: true, busy: false, done: '' }
  },
  computed: {
    roleLabel() {
      return (this.req?.user?.role || 'user').replace(/_/g, ' ')
    }
  },
  async created() {
    const id = this.$route.query.request
    if (!id) {
      this.error = 'This link is missing its connection request. Start again from the app you are connecting.'
      this.loading = false
      return
    }
    const auth = useAuthStore()
    const signedIn = auth.isAuthenticated || (await auth.initializeAuth())
    if (!signedIn) {
      this.$router.replace({ path: '/login', query: { redirect: this.$route.fullPath } })
      return
    }
    try {
      const { data } = await api.get(`/oauth/requests/${encodeURIComponent(id)}`)
      this.req = data.data
      this.write = !!this.req.write_requested
    } catch (e) {
      this.error = apiErrorMessage(e, 'This connection request could not be loaded.')
    } finally {
      this.loading = false
    }
  },
  methods: {
    async decide(allow) {
      this.busy = true
      try {
        const { data } = await api.post('/oauth/approve', { request: this.req.id, allow, write: allow && this.write })
        this.done = allow ? 'allowed' : 'denied'
        window.location.assign(data.data.redirect_url)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not complete the connection')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.consent-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: var(--bg);
}
.consent { width: 100%; max-width: 520px; }
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 0;
}
.brand__mark {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--accent);
  color: #fff;
}
.brand__name { font-weight: 700; letter-spacing: 0.01em; }
h1 { font-size: 19px; line-height: 1.35; margin: 4px 0 8px; }
.lead { color: var(--text-2); margin: 0 0 16px; line-height: 1.5; font-size: 14px; }
.muted { color: var(--text-3); }
.perm-list { display: grid; gap: 10px; margin-bottom: 16px; }
.perm {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}
.perm > i { color: var(--accent); margin-top: 3px; }
.perm div { display: flex; flex-direction: column; gap: 3px; }
.perm small { color: var(--text-2); line-height: 1.45; }
.perm--toggle { cursor: pointer; }
.perm--toggle.is-on { border-color: var(--accent); background: var(--accent-soft); }
.meta { display: grid; gap: 6px; color: var(--text-2); font-size: 12.5px; margin-bottom: 18px; }
.meta i { width: 16px; color: var(--text-3); margin-right: 4px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.state-icon { font-size: 34px; color: var(--text-3); margin-bottom: 8px; }
.state-icon.success { color: var(--success); }
.state-icon.danger { color: var(--danger); }
@media (max-width: 480px) {
  .actions { flex-direction: column-reverse; }
  .actions .ui-btn { width: 100%; justify-content: center; }
}
</style>
