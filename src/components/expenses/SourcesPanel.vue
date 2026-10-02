<template>
  <div class="sources" data-testid="expense-sources">
    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="!src && !loadError" class="ui-skeleton" style="height: 320px"></div>
    <template v-else-if="src">
      <AutomationPanel ref="auto" />
      <div v-if="!src.can_edit" class="ui-alert"><i class="fa-solid fa-lock"></i><span>Only owners, admins and managers can change expense sources.</span></div>

      <!-- Synergy Wholesale -->
      <section class="ui-card src-card" data-testid="src-synergy">
        <div class="ui-card__head">
          <h2><i class="fa-solid fa-globe head-ic"></i> Synergy Wholesale</h2>
          <span class="ui-badge" :class="syn?.connected ? (syn.last_status === 'error' ? 'ui-badge--danger' : 'ui-badge--success') : 'ui-badge--draft'">
            {{ syn?.connected ? (syn.last_status === 'error' ? 'Error' : 'Connected') : 'Not connected' }}
          </span>
        </div>
        <div class="ui-card__body">
          <p class="lead">Reads your account balance, domains (expiry dates, auto-renew) and hosting plans / renewal dates with the reseller API. The API has no statement or invoice list: Synergy expenses come from the monthly statement (Gmail or upload).</p>
          <div v-if="syn?.last_error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-plug-circle-xmark"></i><span>{{ syn.last_error }}</span></div>
          <div v-if="testMsg" class="ui-alert" :class="testOk ? 'ui-alert--success' : 'ui-alert--danger'">
            <i :class="testOk ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i><span>{{ testMsg }}</span>
          </div>
          <div class="ui-alert ui-alert--warning ip">
            <i class="fa-solid fa-shield-halved"></i>
            <span>
              Synergy only accepts API calls from whitelisted IP addresses. Add
              <strong v-if="src.egress_ip" data-testid="egress-ip">{{ src.egress_ip }}</strong><template v-else>this server's public IP</template>
              in Synergy Wholesale → <em>Account → API Information</em>.
              <template v-if="src.egress_ip"> If DASYIN runs on Google Cloud Run, this address can change unless outbound traffic uses a static IP (Cloud NAT) — see the setup steps.</template>
            </span>
          </div>
          <div class="form-grid">
            <label class="ui-field">
              <span class="ui-label">Reseller ID</span>
              <input v-model.trim="synForm.reseller_id" class="ui-input" autocomplete="off" :disabled="!src.can_edit" placeholder="e.g. 12345" data-testid="syn-reseller" />
            </label>
            <label class="ui-field">
              <span class="ui-label">API key</span>
              <input v-model.trim="synForm.api_key" class="ui-input" type="password" autocomplete="new-password" :disabled="!src.can_edit"
                :placeholder="syn?.connected ? 'Saved — leave blank to keep' : 'Paste your API key'" data-testid="syn-key" />
              <span class="ui-hint">Stored encrypted. Synergy → Account → API Information.</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Low-balance alert below (AUD)</span>
              <input v-model="synForm.low_balance" class="ui-input" type="number" min="0" step="1" :disabled="!src.can_edit" />
            </label>
            <div class="ui-field">
              <span class="ui-label">Synergy expenses</span>
              <span class="ui-hint countnote">Counted from the monthly statements — as service charges or as top-ups from your bank (never both). Choose in <router-link to="/expenses?tab=synergy">Expenses → Synergy → How costs count</router-link>.</span>
            </div>
          </div>
          <div class="meta">
            <span v-if="syn?.balance !== null && syn?.balance !== undefined">Balance <strong :class="{ neg: syn.balance < (synForm.low_balance || 20) }" data-testid="syn-balance">{{ money(syn.balance, 'AUD') }}</strong> · {{ ago(syn.balance_at) }}</span>
            <span v-if="syn?.last_sync_at">Last sync {{ ago(syn.last_sync_at) }}{{ syn.last_result?.renewals ? ` · ${syn.last_result.renewals} domains/services` : '' }}</span>
          </div>
        </div>
        <div v-if="src.can_edit" class="ui-card__foot">
          <button v-if="syn?.connected" class="ui-btn ui-btn--ghost danger" :disabled="busy.syn" @click="disconnectSynergy">Disconnect</button>
          <span class="spacer"></span>
          <button v-if="syn?.connected" class="ui-btn" :disabled="busy.syn" data-testid="syn-test" @click="testSynergy"><i class="fa-solid fa-plug"></i> Test</button>
          <button v-if="syn?.connected" class="ui-btn" :disabled="busy.sync" @click="sync('synergy')"><i class="fa-solid fa-rotate"></i> Sync</button>
          <button class="ui-btn ui-btn--primary" :disabled="busy.syn" data-testid="syn-save" @click="saveSynergy">
            <i :class="busy.syn ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-floppy-disk'"></i> {{ syn?.connected ? 'Save' : 'Save & test' }}
          </button>
        </div>
      </section>

      <!-- Gmail -->
      <section class="ui-card src-card" data-testid="src-gmail">
        <div class="ui-card__head">
          <h2><i class="fa-solid fa-envelope-open-text head-ic"></i> Gmail billing emails</h2>
          <span class="ui-badge" :class="gm?.connected ? (gm.last_status === 'error' ? 'ui-badge--danger' : 'ui-badge--success') : 'ui-badge--draft'">
            {{ gm?.connected ? (gm.last_status === 'error' ? 'Error' : 'Connected') : 'Not connected' }}
          </span>
        </div>
        <div class="ui-card__body">
          <p class="lead">
            Reads (read-only) invoices, receipts and statements from your mailbox — Google Workspace invoices (PDF), Synergy Wholesale receipts and any other sender you add — and puts them in the Expenses inbox for review.
          </p>
          <div v-if="gm?.last_error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ gm.last_error }}</span></div>
          <div v-if="gm?.connected" class="connected"><i class="fa-brands fa-google"></i> {{ gm.account }}</div>
          <fieldset class="presets">
            <legend class="ui-label">Look for</legend>
            <label v-for="p in src.presets" :key="p.key" class="ui-switch">
              <input v-model="gmForm.presets" type="checkbox" :value="p.key" :disabled="!src.can_edit" /> <span>{{ p.label }}</span>
            </label>
          </fieldset>
          <label class="ui-field">
            <span class="ui-label">Other senders</span>
            <input v-model="gmForm.senders" class="ui-input" :disabled="!src.can_edit" placeholder="billing@canva.com, @hostinger.com" />
            <span class="ui-hint">Email addresses or @domains, separated by commas. Emails mentioning invoice, receipt, payment, bill or renewal are read.</span>
          </label>
          <details class="oauth" :open="!src.google_env_client && !gm?.client_id">
            <summary>Google OAuth client {{ src.google_env_client ? '(optional — the platform client is used if blank)' : '(required)' }}</summary>
            <div class="form-grid">
              <label class="ui-field">
                <span class="ui-label">Client ID</span>
                <input v-model.trim="gmForm.client_id" class="ui-input" autocomplete="off" :disabled="!src.can_edit" placeholder="xxxx.apps.googleusercontent.com" data-testid="gm-client-id" />
              </label>
              <label class="ui-field">
                <span class="ui-label">Client secret</span>
                <input v-model.trim="gmForm.client_secret" class="ui-input" type="password" autocomplete="new-password" :disabled="!src.can_edit"
                  :placeholder="gm?.has_client_secret ? 'Saved — leave blank to keep' : 'GOCSPX-…'" data-testid="gm-client-secret" />
              </label>
            </div>
            <div class="redirect">
              Authorised redirect URI: <code data-testid="redirect-uri">{{ src.redirect_uri }}</code>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="copy(src.redirect_uri)"><i class="fa-regular fa-copy"></i> Copy</button>
            </div>
          </details>
          <div class="meta">
            <span v-if="gm?.last_sync_at">Last sync {{ ago(gm.last_sync_at) }}<template v-if="gm.last_result"> · {{ gm.last_result.found }} emails, {{ gm.last_result.created }} new, {{ gm.last_result.duplicates }} duplicates</template></span>
          </div>
        </div>
        <div v-if="src.can_edit" class="ui-card__foot">
          <button v-if="gm?.connected" class="ui-btn ui-btn--ghost danger" :disabled="busy.gm" @click="disconnectGmail">Disconnect</button>
          <span class="spacer"></span>
          <button class="ui-btn" :disabled="busy.gm" @click="saveGmail(false)">Save</button>
          <button v-if="gm?.connected" class="ui-btn" :disabled="busy.sync" @click="sync('gmail')"><i class="fa-solid fa-rotate"></i> Sync</button>
          <button class="ui-btn ui-btn--primary" :disabled="busy.gm" data-testid="gm-connect" @click="connectGmail">
            <i :class="busy.gm ? 'fa-solid fa-circle-notch fa-spin' : 'fa-brands fa-google'"></i> {{ gm?.connected ? 'Reconnect Google' : 'Connect Google' }}
          </button>
        </div>
      </section>

      <!-- Schedule -->
      <section class="ui-card src-card">
        <div class="ui-card__head"><h2><i class="fa-regular fa-clock head-ic"></i> Automatic sync</h2></div>
        <div class="ui-card__body sched">
          <label class="ui-switch"><input v-model="schedForm.auto_sync" type="checkbox" :disabled="!src.can_edit" data-testid="auto-sync" /> <span>Sync every day</span></label>
          <label class="ui-field hour">
            <span class="ui-label">At (your organisation's time)</span>
            <select v-model.number="schedForm.hour" class="ui-select" :disabled="!src.can_edit || !schedForm.auto_sync">
              <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ String(h - 1).padStart(2, '0') }}:00</option>
            </select>
          </label>
          <span class="muted">New alerts (price rises, failed payments, renewals, low balance) are sent to admins as notifications.</span>
          <span v-if="sched?.last_sync_at" class="muted">Last automatic sync {{ ago(sched.last_sync_at) }}</span>
        </div>
        <div v-if="src.can_edit" class="ui-card__foot">
          <span class="spacer"></span>
          <button class="ui-btn" :disabled="busy.sched" @click="saveSchedule">Save</button>
          <button class="ui-btn ui-btn--primary" :disabled="busy.sync || (!syn?.connected && !gm?.connected)" data-testid="sync-now" @click="sync('')">
            <i :class="busy.sync ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate'"></i> Sync now
          </button>
        </div>
      </section>

      <section class="ui-card src-card help">
        <div class="ui-card__head"><h2><i class="fa-solid fa-circle-question head-ic"></i> Setup steps</h2></div>
        <div class="ui-card__body">
          <h3>Synergy Wholesale API</h3>
          <ol>
            <li>Sign in to Synergy Wholesale → <em>Account → API Information</em>.</li>
            <li>Copy your <strong>Reseller ID</strong> and <strong>API key</strong> (generate one if needed).</li>
            <li>Add the IP address shown above to the API IP whitelist. On Google Cloud Run the outbound IP is not fixed: route egress through a Serverless VPC connector + Cloud NAT with a reserved static IP and whitelist that address — or run syncs from a server whose IP is whitelisted.</li>
            <li>Paste both here, <strong>Save &amp; test</strong>. "Unable to login to wholesale system" usually means the IP is not whitelisted yet.</li>
          </ol>
          <h3>Gmail (Google Workspace mailbox)</h3>
          <ol>
            <li>In <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud console</a> create (or pick) a project in your Workspace organisation and enable the <strong>Gmail API</strong>.</li>
            <li><em>APIs &amp; Services → OAuth consent screen</em>: user type <strong>Internal</strong> (no Google verification needed for your own Workspace users); add the scope <code>https://www.googleapis.com/auth/gmail.readonly</code>.</li>
            <li><em>Credentials → Create credentials → OAuth client ID</em> → <strong>Web application</strong>; add the authorised redirect URI <code>{{ src.redirect_uri }}</code>.</li>
            <li>Paste the client ID and secret above, choose what to look for, then <strong>Connect Google</strong> and allow read-only access.</li>
            <li>The first sync reads about 13 months of billing emails; later syncs read new ones only.</li>
          </ol>
          <p class="muted">{{ src.ai_enabled ? 'AI extraction is on: documents the rules cannot read are read by Claude and marked "AI-extracted, please confirm".' : 'Tip: add an Anthropic API key in System settings → AI assistant to let AI read scanned invoices and photos.' }}</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import AutomationPanel from './AutomationPanel.vue'
import { expensesApi, money } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'

export default {
  name: 'SourcesPanel',
  components: { AutomationPanel },
  emits: ['synced', 'changed'],
  data() {
    return {
      src: null,
      loadError: '',
      busy: { syn: false, gm: false, sched: false, sync: false },
      testMsg: '',
      testOk: false,
      synForm: { reseller_id: '', api_key: '', low_balance: 20 },
      gmForm: { presets: ['google_workspace', 'synergy'], senders: '', client_id: '', client_secret: '' },
      schedForm: { auto_sync: false, hour: 6 }
    }
  },
  computed: {
    syn() {
      return this.src?.synergy || null
    },
    gm() {
      return this.src?.gmail || null
    },
    sched() {
      return this.src?.schedule || null
    }
  },
  mounted() {
    this.load()
    const q = this.$route.query
    if (q.gmail === 'connected') {
      toast.success('Gmail connected — syncing your billing emails…')
      this.$router.replace({ query: { ...q, gmail: undefined, message: undefined } })
      this.sync('gmail')
    } else if (q.gmail === 'error') {
      toast.error(q.message || 'Google sign-in failed')
      this.$router.replace({ query: { ...q, gmail: undefined, message: undefined } })
    }
  },
  methods: {
    money,
    ago(v) {
      return v ? formatDateTime(v) : ''
    },
    apply(s) {
      this.src = s
      if (s.synergy) {
        this.synForm.reseller_id = s.synergy.account || ''
        this.synForm.low_balance = s.synergy.settings?.low_balance || 20
      }
      if (s.gmail) {
        this.gmForm.presets = s.gmail.settings?.presets?.length ? [...s.gmail.settings.presets] : this.gmForm.presets
        this.gmForm.senders = (s.gmail.settings?.custom_senders || []).join(', ')
        this.gmForm.client_id = s.gmail.client_id || ''
      }
      if (s.schedule) {
        this.schedForm.auto_sync = !!s.schedule.settings?.auto_sync
        this.schedForm.hour = s.schedule.settings?.hour ?? 6
      }
    },
    async load() {
      this.loadError = ''
      try {
        this.apply(await expensesApi.sources())
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load expense sources')
      }
    },
    async saveSynergy() {
      if (!this.synForm.reseller_id) return toast.error('Enter your reseller ID')
      if (!this.syn?.connected && !this.synForm.api_key) return toast.error('Enter your API key')
      this.busy.syn = true
      try {
        this.apply(
          await expensesApi.saveSynergy({
            reseller_id: this.synForm.reseller_id,
            api_key: this.synForm.api_key,
            low_balance: Number(this.synForm.low_balance) || 0
          })
        )
        this.synForm.api_key = ''
        toast.success('Synergy Wholesale saved')
        this.$emit('changed')
        await this.testSynergy()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.busy.syn = false
      }
    },
    async testSynergy() {
      this.busy.syn = true
      this.testMsg = ''
      try {
        const r = await expensesApi.testSynergy()
        this.testOk = true
        this.testMsg = r.message
      } catch (e) {
        this.testOk = false
        const d = e?.response?.data?.error
        this.testMsg = d?.hint ? `${d.message} — ${d.hint}` : apiErrorMessage(e, 'Connection failed')
      } finally {
        this.busy.syn = false
        this.load()
      }
    },
    async disconnectSynergy() {
      const ok = await confirmDialog({ title: 'Disconnect Synergy Wholesale?', message: 'The reseller ID and API key are removed. Expenses and renewals already imported stay.', confirmText: 'Disconnect', danger: true })
      if (!ok) return
      this.busy.syn = true
      try {
        await expensesApi.deleteSynergy()
        this.synForm = { reseller_id: '', api_key: '', low_balance: 20 }
        this.testMsg = ''
        toast.success('Disconnected')
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not disconnect'))
      } finally {
        this.busy.syn = false
      }
    },
    gmailBody() {
      return {
        client_id: this.gmForm.client_id,
        client_secret: this.gmForm.client_secret,
        presets: this.gmForm.presets,
        custom_senders: this.gmForm.senders.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
      }
    },
    async saveGmail(quiet) {
      this.busy.gm = true
      try {
        this.apply(await expensesApi.saveGmail(this.gmailBody()))
        this.gmForm.client_secret = ''
        if (!quiet) toast.success('Gmail settings saved')
        return true
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
        return false
      } finally {
        this.busy.gm = false
      }
    },
    async connectGmail() {
      if (!this.gmForm.presets.length && !this.gmForm.senders.trim()) return toast.error('Choose what to look for first')
      if (!(await this.saveGmail(true))) return
      this.busy.gm = true
      try {
        const r = await expensesApi.connectGmail()
        window.location.href = r.url
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not start Google sign-in'))
        this.busy.gm = false
      }
    },
    async disconnectGmail() {
      const ok = await confirmDialog({ title: 'Disconnect Gmail?', message: 'DASYIN stops reading your billing emails. Imported expenses stay. You can also remove access in your Google account.', confirmText: 'Disconnect', danger: true })
      if (!ok) return
      try {
        await expensesApi.deleteGmail()
        toast.success('Gmail disconnected')
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not disconnect'))
      }
    },
    async saveSchedule() {
      this.busy.sched = true
      try {
        this.apply(await expensesApi.saveSchedule(this.schedForm))
        toast.success(this.schedForm.auto_sync ? `Daily sync at ${String(this.schedForm.hour).padStart(2, '0')}:00` : 'Automatic sync off')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.busy.sched = false
      }
    },
    async sync(source) {
      this.busy.sync = true
      try {
        const r = await expensesApi.sync(source)
        const parts = []
        for (const x of r.results || []) {
          if (!x.ok) {
            toast.error(`${x.source === 'synergy' ? 'Synergy Wholesale' : 'Gmail'}: ${x.error}${x.hint ? ' — ' + x.hint : ''}`)
            continue
          }
          if (x.source === 'gmail') {
            let t = `${x.created} new from Gmail${x.duplicates ? `, ${x.duplicates} duplicates` : ''}`
            if (x.auto_approved) t += `, ${x.auto_approved} approved automatically`
            if (x.synergy_statements) t += `, ${x.synergy_statements} Synergy statement${x.synergy_statements === 1 ? '' : 's'} imported`
            if (x.synergy_usage) t += `, ${x.synergy_usage} usage report${x.synergy_usage === 1 ? '' : 's'}`
            parts.push(t)
          } else parts.push(`${x.renewals} domains/services from Synergy${x.usage_snapshots ? ` (disk usage of ${x.usage_snapshots})` : ''}`)
        }
        if (parts.length) toast.success('Synced: ' + parts.join(' · '))
        this.$emit('synced')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Sync failed'))
      } finally {
        this.busy.sync = false
        this.load()
        this.$refs.auto?.load()
      }
    },
    async copy(t) {
      try {
        await navigator.clipboard.writeText(t)
        toast.success('Copied')
      } catch {
        toast.info(t)
      }
    }
  }
}
</script>

<style scoped>
.sources {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}
.help {
  grid-column: 1 / -1;
}
.head-ic {
  color: var(--text-3);
  margin-right: 4px;
}
.ui-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.lead {
  color: var(--text-2);
  font-size: 13.5px;
  margin: 0 0 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 10px 0;
}
.ip {
  margin: 10px 0;
}
.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: var(--text-3);
}
.meta strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.meta strong.neg {
  color: var(--danger);
}
.ui-card__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
.spacer {
  flex: 1;
}
.danger {
  color: var(--danger);
}
.connected {
  font-size: 13.5px;
  margin-bottom: 10px;
  color: var(--text);
}
.presets {
  border: 0;
  padding: 0;
  margin: 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.oauth {
  margin: 10px 0;
  font-size: 13px;
}
.oauth summary {
  cursor: pointer;
  color: var(--text-2);
}
.redirect {
  font-size: 12.5px;
  color: var(--text-2);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  word-break: break-all;
}
code {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  font-size: 12px;
}
.sched {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.hour {
  max-width: 220px;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.help h3 {
  font-size: 14px;
  margin: 4px 0 6px;
}
.help ol {
  margin: 0 0 12px;
  padding-left: 20px;
  font-size: 13.5px;
  color: var(--text-2);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
@media (max-width: 900px) {
  .sources {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
