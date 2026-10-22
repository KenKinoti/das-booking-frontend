<template>
  <div class="scs" data-testid="calls-settings">
    <div class="ui-alert scs-intro">
      <i class="fa-solid fa-circle-info"></i>
      <span>
        Secure calls connect people's browsers directly. On some mobile networks and office Wi-Fi a direct connection isn't possible —
        without a <strong>TURN relay</strong> those people can't connect at all. A TURN relay only forwards the call's encrypted packets: it can't see or hear the call.
        STUN (always on) only helps browsers find their public address.
      </span>
    </div>

    <div v-if="loading" class="ui-skeleton" style="height: 220px"></div>
    <div v-else-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <form v-else class="scs-form" @submit.prevent="save">
      <div class="ui-field">
        <span>Relay</span>
        <div class="scs-modes" role="radiogroup" aria-label="Relay">
          <label v-for="m in modes" :key="m.value" class="scs-mode" :class="{ 'is-on': form.mode === m.value }">
            <input v-model="form.mode" type="radio" name="ice-mode" :value="m.value" :data-testid="`ice-mode-${m.value}`" />
            <span><strong>{{ m.label }}</strong><small>{{ m.hint }}</small></span>
          </label>
        </div>
      </div>

      <label class="ui-field">
        <span>STUN servers <small class="muted">(one per line)</small></span>
        <textarea v-model="form.stun" class="ui-textarea" rows="2" :placeholder="defaults.join('\n')" data-testid="ice-stun"></textarea>
        <small class="ui-hint">Leave empty to use {{ defaults.join(', ') }}.</small>
      </label>

      <template v-if="form.mode !== 'stun'">
        <label class="ui-field">
          <span>TURN servers <small class="muted">(one per line)</small></span>
          <textarea v-model="form.turn" class="ui-textarea" rows="3" placeholder="turn:turn.example.com:3478?transport=udp&#10;turns:turn.example.com:5349?transport=tcp" data-testid="ice-turn"></textarea>
          <small class="ui-hint">Add a <code>turns:</code> address on port 443 or 5349 too — it gets through most strict firewalls.</small>
        </label>
        <div v-if="form.mode === 'static'" class="ui-grid-2">
          <label class="ui-field">
            <span>Username</span>
            <input v-model="form.username" class="ui-input" autocomplete="off" data-testid="ice-username" />
          </label>
          <label class="ui-field">
            <span>Password</span>
            <input v-model="form.credential" class="ui-input" type="password" autocomplete="new-password" :placeholder="saved.credential_set ? `Saved ${saved.credential_hint} — type to replace` : ''" data-testid="ice-credential" />
            <small v-if="saved.credential_set" class="ui-hint">Stored encrypted. <a href="#" @click.prevent="clearCred = !clearCred">{{ clearCred ? 'Keep it' : 'Remove it' }}</a><template v-if="clearCred"> — will be removed on save</template></small>
          </label>
        </div>
        <label v-if="form.mode === 'coturn'" class="ui-field">
          <span>Shared secret</span>
          <input v-model="form.secret" class="ui-input" type="password" autocomplete="new-password" :placeholder="saved.shared_secret_set ? 'Saved — type to replace' : 'static-auth-secret from turnserver.conf'" data-testid="ice-secret" />
          <small class="ui-hint">coturn with <code>use-auth-secret</code>. Each participant gets their own time-limited login, valid until the call's link expires. The secret is stored encrypted and never sent to browsers.</small>
        </label>
      </template>

      <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

      <div class="scs-actions">
        <button class="ui-btn ui-btn--primary" type="submit" :disabled="saving" data-testid="ice-save"><i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-floppy-disk'"></i> Save</button>
        <button class="ui-btn" type="button" :disabled="testing" data-testid="ice-test" @click="test"><i :class="testing ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-stethoscope'"></i> Test from this browser</button>
        <span v-if="saved.updated_at && saved.updated_by" class="muted scs-upd">Last saved {{ fmt(saved.updated_at) }} by {{ saved.updated_by }}</span>
      </div>
      <div v-if="testResult" class="ui-alert" :class="testResult.ok ? 'ui-alert--success' : 'ui-alert--warning'" data-testid="ice-test-result">
        <i :class="testResult.ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i><span>{{ testResult.text }}</span>
      </div>
    </form>
  </div>
</template>

<script>
import { secureCallsApi } from '@/services/secureCall'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDateTime } from '@/utils/format'

const lines = (s) =>
  String(s || '')
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean)

export default {
  name: 'SecureCallSettings',
  data() {
    return {
      loading: true,
      loadError: '',
      saving: false,
      testing: false,
      error: '',
      testResult: null,
      clearCred: false,
      saved: {},
      defaults: [],
      form: { mode: 'stun', stun: '', turn: '', username: '', credential: '', secret: '' },
      modes: [
        { value: 'stun', label: 'No relay (STUN only)', hint: 'Works for most home and mobile connections.' },
        { value: 'static', label: 'TURN with a fixed login', hint: 'A hosted TURN service with one username and password.' },
        { value: 'coturn', label: 'coturn with a shared secret', hint: 'Your own coturn server: time-limited logins per person.' }
      ]
    }
  },
  created() {
    this.load()
  },
  methods: {
    fmt: formatDateTime,
    apply(d) {
      this.saved = d || {}
      this.defaults = d?.default_stun_urls || []
      this.form = { mode: d?.mode || 'stun', stun: (d?.stun_urls || []).join('\n'), turn: (d?.turn_urls || []).join('\n'), username: d?.username || '', credential: '', secret: '' }
      this.clearCred = false
    },
    async load() {
      this.loading = true
      this.loadError = ''
      try {
        const r = await secureCallsApi.settings()
        this.apply(r.data?.data)
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the call settings')
      } finally {
        this.loading = false
      }
    },
    async save() {
      this.saving = true
      this.error = ''
      try {
        const f = this.form
        const r = await secureCallsApi.saveSettings({
          mode: f.mode,
          stun_urls: lines(f.stun),
          turn_urls: f.mode === 'stun' ? [] : lines(f.turn),
          username: f.mode === 'static' ? f.username.trim() : '',
          credential: f.mode === 'static' ? f.credential : '',
          shared_secret: f.mode === 'coturn' ? f.secret : '',
          clear_credential: this.clearCred,
          clear_shared_secret: false
        })
        this.apply(r.data?.data)
        this.testResult = null
        toast.success('Call settings saved')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save')
      } finally {
        this.saving = false
      }
    },
    async test() {
      this.testing = true
      this.testResult = null
      let pc
      try {
        const r = await secureCallsApi.previewIce()
        const ice = r.data?.data || {}
        const relayWanted = !!ice.relay
        pc = new RTCPeerConnection({ iceServers: ice.ice_servers || [], iceTransportPolicy: relayWanted ? 'relay' : 'all' })
        pc.createDataChannel('test')
        const found = { relay: '', srflx: '' }
        const done = new Promise((resolve) => {
          const t = setTimeout(resolve, 8000)
          pc.onicecandidate = (ev) => {
            const c = ev.candidate
            if (!c) {
              clearTimeout(t)
              resolve()
              return
            }
            const type = c.type || (/ typ (\w+)/.exec(c.candidate) || [])[1]
            const addr = c.address || (/ (\d+\.\d+\.\d+\.\d+|[0-9a-f:]+) \d+ typ/.exec(c.candidate) || [])[1] || ''
            if (type === 'relay' && !found.relay) found.relay = addr || 'yes'
            if (type === 'srflx' && !found.srflx) found.srflx = addr || 'yes'
            if (relayWanted ? found.relay : found.srflx) {
              clearTimeout(t)
              resolve()
            }
          }
        })
        await pc.setLocalDescription(await pc.createOffer())
        await done
        if (relayWanted) {
          this.testResult = found.relay
            ? { ok: true, text: `The TURN relay works from this browser (relay address ${found.relay}). People who can't connect directly will go through it.` }
            : { ok: false, text: "No relay address came back within 8 seconds. Check the TURN address, port, transport and login — and that the server's firewall allows it." }
        } else {
          this.testResult = found.srflx
            ? { ok: true, text: `STUN works: this browser's public address is ${found.srflx}. There is no relay, so people on strict networks may not connect.` }
            : { ok: false, text: 'No answer from the STUN servers within 8 seconds (this network may block them).' }
        }
      } catch (e) {
        this.testResult = { ok: false, text: apiErrorMessage(e, 'The test could not run in this browser') }
      } finally {
        try {
          pc?.close()
        } catch {
          /* ignore */
        }
        this.testing = false
      }
    }
  }
}
</script>

<style scoped>
.scs {
  display: grid;
  gap: 18px;
  max-width: 820px;
}
.scs-intro {
  font-size: 13.5px;
  line-height: 1.55;
}
.scs-form {
  display: grid;
  gap: 16px;
}
.scs-modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.scs-mode {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  cursor: pointer;
  background: var(--surface);
}
.scs-mode.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.scs-mode input {
  margin-top: 3px;
  accent-color: var(--accent);
}
.scs-mode span {
  display: grid;
  gap: 2px;
}
.scs-mode small {
  color: var(--text-3);
  font-size: 12.5px;
}
.scs-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.scs-upd {
  font-size: 12.5px;
}
.muted {
  color: var(--text-3);
  font-weight: 400;
}
code {
  background: var(--bg-subtle);
  padding: 0 4px;
  border-radius: 4px;
}
</style>
