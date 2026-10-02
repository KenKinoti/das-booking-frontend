<template>
  <!-- System settings → AI assistant (super admin): the platform's Anthropic API key and model. -->
  <div class="aik" data-test="ai-settings">
    <div class="aik__head">
      <div>
        <h2>AI assistant</h2>
        <p class="pf-muted">
          The Anthropic API key behind Ask DASYIN, AI meeting summaries, expense reading and market explanations — for every organisation on this platform. Changes work straight
          away.
        </p>
      </div>
      <span v-if="s" class="ui-badge" :class="s.enabled ? 'ui-badge--success' : 'ui-badge--warning'" data-test="ai-state">{{ s.enabled ? 'On' : 'Off — no API key' }}</span>
    </div>

    <div v-if="loadError" class="ui-alert ui-alert--danger">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <div v-if="!s && !loadError">
      <div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 40px; margin-bottom: 14px; max-width: 640px"></div>
    </div>

    <template v-if="s">
      <div class="ui-alert aik__explain" data-test="ai-explainer">
        <i class="fa-solid fa-circle-info"></i>
        <span>
          <strong>Not the same as connecting Claude (MCP).</strong> Connecting Claude to DASYIN with MCP lets you chat with your data from the Claude app and needs no key. Ask DASYIN
          runs inside DASYIN and needs its own Anthropic API key.<br />
          Get an API key at
          <a :href="s.console_url" target="_blank" rel="noopener noreferrer">console.anthropic.com → API keys</a>. API usage is billed separately from a Claude subscription.
        </span>
      </div>

      <div v-if="s.problem" class="ui-alert ui-alert--danger" data-test="ai-problem">
        <i class="fa-solid fa-triangle-exclamation"></i><span>{{ s.problem }}</span>
      </div>

      <!-- Status -->
      <div class="aik__panel">
        <dl class="pf-kv aik__kv">
          <dt>API key</dt>
          <dd data-test="ai-source">
            <span class="ui-badge" :class="sourceClass">{{ s.source_label }}</span>
            <span v-if="s.source === 'settings' && s.key_hint" class="pf-mono aik__hint">{{ s.key_hint }}</span>
            <span v-else-if="s.source === 'environment' && s.env_key_hint" class="pf-mono aik__hint">{{ s.env_key_hint }}</span>
          </dd>
          <template v-if="s.key_set && s.key_updated_at">
            <dt>Saved</dt>
            <dd>{{ formatDateTime(s.key_updated_at) }}<template v-if="s.key_updated_by"> by {{ s.key_updated_by }}</template></dd>
          </template>
          <dt>Model</dt>
          <dd data-test="ai-model">
            <span class="pf-mono">{{ s.model }}</span> <span class="pf-muted pf-small">· {{ modelSourceLabel }}</span>
          </dd>
          <dt>Last test</dt>
          <dd data-test="ai-last-test">
            <template v-if="s.last_test">
              <span :class="s.last_test.ok ? 'pf-success-text' : 'pf-danger-text'">{{ s.last_test.ok ? 'Passed' : 'Failed' }}</span>
              <span class="pf-muted pf-small"> · {{ formatDateTime(s.last_test.at) }}</span>
            </template>
            <span v-else class="pf-muted">Not tested yet</span>
          </dd>
          <dt>Usage today</dt>
          <dd data-test="ai-usage">
            {{ usage(s.usage_today && s.usage_today.platform) }}
            <div class="pf-muted pf-small">Ask DASYIN, all organisations, since midnight UTC · this organisation: {{ usage(s.usage_today && s.usage_today.organization) }}</div>
          </dd>
          <template v-if="s.custom_endpoint">
            <dt>Endpoint</dt>
            <dd><span class="pf-mono">{{ s.endpoint }}</span> <span class="pf-muted pf-small">· from ANTHROPIC_BASE_URL</span></dd>
          </template>
        </dl>
      </div>

      <!-- API key -->
      <form class="aik__section" novalidate @submit.prevent="saveKey">
        <div class="ui-field">
          <label for="aik-key">Anthropic API key</label>

          <div v-if="s.key_set && !replacing" class="aik__row">
            <input id="aik-key" class="ui-input aik__mono" :value="maskedValue" readonly aria-label="Saved API key (hidden)" data-test="ai-key-masked" />
            <button type="button" class="ui-btn" data-test="ai-key-replace" @click="startReplace"><i class="fa-solid fa-rotate"></i> Replace</button>
            <button type="button" class="ui-btn ui-btn--danger" :disabled="removing" data-test="ai-key-remove" @click="removeKey">
              <i :class="removing ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-trash-can'"></i> Remove
            </button>
          </div>

          <div v-else class="aik__row">
            <div class="aik__input">
              <input
                id="aik-key"
                ref="key"
                v-model.trim="draftKey"
                class="ui-input aik__mono"
                :type="reveal ? 'text' : 'password'"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                placeholder="sk-ant-…"
                data-test="ai-key-input"
                @input="keyError = ''"
              />
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" :aria-label="reveal ? 'Hide key' : 'Show key'" @click="reveal = !reveal">
                <i :class="reveal ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
              </button>
            </div>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="!draftKey || savingKey" data-test="ai-key-save">
              <i v-if="savingKey" class="fa-solid fa-circle-notch spin"></i> {{ savingKey ? 'Checking…' : 'Save key' }}
            </button>
            <button v-if="replacing" type="button" class="ui-btn" :disabled="savingKey" @click="cancelReplace">Cancel</button>
          </div>

          <div v-if="keyError" class="ui-alert ui-alert--danger aik__inline" role="alert" data-test="ai-key-error">
            <i class="fa-solid fa-circle-exclamation"></i><span>{{ keyError }}</span>
          </div>
          <span v-else-if="s.key_set && !replacing" class="ui-hint">Saved and hidden — it is encrypted and never shown again. Replace it to use a different key.</span>
          <span v-else-if="s.env_key_set" class="ui-hint">
            A key from the server's <code>ANTHROPIC_API_KEY</code> environment variable is in use. A key saved here takes over from it.
          </span>
          <span v-else class="ui-hint">Paste the key and save. It is checked with Anthropic, encrypted and never shown again. No restart needed.</span>
        </div>
      </form>

      <!-- Model -->
      <form class="aik__section" novalidate @submit.prevent="saveModel">
        <div class="ui-field">
          <label for="aik-model">Model</label>
          <div class="aik__row">
            <input
              id="aik-model"
              v-model.trim="draftModel"
              class="ui-input aik__mono"
              list="aik-models"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              :placeholder="`${fallbackModel} (default)`"
              data-test="ai-model-input"
            />
            <datalist id="aik-models">
              <option v-for="m in models" :key="m.id" :value="m.id">{{ m.label }}{{ m.note ? ` — ${m.note}` : '' }}</option>
            </datalist>
            <button type="submit" class="ui-btn" :disabled="!modelDirty || savingModel" data-test="ai-model-save">
              <i v-if="savingModel" class="fa-solid fa-circle-notch spin"></i> Save model
            </button>
          </div>
          <div class="aik__chips">
            <button v-for="m in suggestions" :key="m.id" type="button" class="aik__chip" :class="{ 'is-active': (draftModel || fallbackModel) === m.id }" :title="m.note || m.label" @click="draftModel = m.id">
              {{ m.label }}
            </button>
          </div>
          <span class="ui-hint">
            Any Anthropic model name works — “Test key” checks it. Leave empty to use the default (<span class="pf-mono">{{ fallbackModel }}</span
            >).
          </span>
        </div>
      </form>

      <!-- Test -->
      <div class="aik__test">
        <div class="aik__test-text">
          <strong>Test key</strong>
          <span class="pf-muted pf-small">{{ testTarget }}</span>
        </div>
        <button type="button" class="ui-btn" :disabled="testing || (!s.enabled && !draftKey)" data-test="ai-test" @click="test">
          <i :class="testing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plug-circle-check'"></i> Test key
        </button>
      </div>
      <div v-if="testResult" class="ui-alert" :class="testResult.ok ? 'ui-alert--success' : 'ui-alert--danger'" role="status" data-test="ai-test-result" :data-code="testResult.code">
        <i :class="testResult.ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
        <span>{{ testResult.message }}<template v-if="testResult.ok && testResult.duration_ms"> ({{ testResult.duration_ms }} ms)</template></span>
      </div>
    </template>
  </div>
</template>

<script>
import '@/components/platform/platform.css'
import api, { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import { loadStatus } from '@/composables/useAssistant'

const SETTINGS_URL = '/super-admin/ai/settings'

export default {
  name: 'AiKeySettings',
  emits: ['changed'],
  data() {
    return {
      s: null,
      loadError: '',
      draftKey: '',
      draftModel: '',
      replacing: false,
      reveal: false,
      keyError: '',
      savingKey: false,
      savingModel: false,
      removing: false,
      testing: false,
      testResult: null,
      liveModels: null
    }
  },
  computed: {
    sourceClass() {
      return { settings: 'ui-badge--success', environment: 'ui-badge--info' }[this.s?.source] || 'ui-badge--warning'
    },
    modelSourceLabel() {
      return { settings: 'saved in app', environment: 'from environment variable', default: 'default' }[this.s?.model_source] || ''
    },
    /** what is used when nothing is saved: the environment's model, else the built-in default */
    fallbackModel() {
      return this.s?.env_model || this.s?.default_model || ''
    },
    modelDirty() {
      return !!this.s && this.draftModel !== (this.s.saved_model || '')
    },
    maskedValue() {
      return `${this.s?.key_hint || '••••'}  (saved)`
    },
    suggestions() {
      return this.s?.model_suggestions || []
    },
    models() {
      const seen = new Set()
      const out = []
      for (const m of [...this.suggestions, ...(this.liveModels || [])]) {
        if (!m?.id || seen.has(m.id)) continue
        seen.add(m.id)
        out.push(m)
      }
      return out
    },
    testTarget() {
      if (this.draftKey) return 'Checks the key you pasted (before saving) with a one-token request.'
      if (!this.s?.enabled) return 'Paste a key first.'
      const which = this.s.source === 'settings' ? 'the saved key' : 'the environment key'
      return `Sends a one-token request with ${which}${this.modelDirty && this.draftModel ? ` and model ${this.draftModel}` : ''}.`
    }
  },
  created() {
    this.load()
  },
  methods: {
    formatDateTime,
    usage(u) {
      if (!u) return '—'
      const n = (x) => Number(x || 0).toLocaleString()
      return `${n(u.input_tokens)} in · ${n(u.output_tokens)} out · ${n(u.responses)} replies`
    },
    apply(d, { keepModelDraft = false } = {}) {
      this.s = d
      if (!keepModelDraft) this.draftModel = d.saved_model || ''
    },
    async load() {
      this.loadError = ''
      try {
        const { data } = await api.get(SETTINGS_URL)
        this.apply(data.data, { keepModelDraft: !!this.s && this.modelDirty })
        this.loadModels()
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the AI settings')
      }
    },
    /** Real model names for this key (falls back to the built-in suggestions). */
    async loadModels() {
      if (!this.s?.enabled) return
      try {
        const { data } = await api.get(`${SETTINGS_URL}/models`)
        this.liveModels = data?.data?.live ? data.data.models : null
      } catch {
        this.liveModels = null
      }
    },
    startReplace() {
      this.replacing = true
      this.draftKey = ''
      this.keyError = ''
      this.$nextTick(() => this.$refs.key?.focus())
    },
    cancelReplace() {
      this.replacing = false
      this.draftKey = ''
      this.keyError = ''
    },
    async saveKey() {
      if (!this.draftKey || this.savingKey) return
      this.savingKey = true
      this.keyError = ''
      this.testResult = null
      try {
        const body = { api_key: this.draftKey }
        if (this.modelDirty) body.model = this.draftModel
        const { data } = await api.put(SETTINGS_URL, body)
        const d = data.data
        this.apply(d)
        this.draftKey = ''
        this.replacing = false
        this.reveal = false
        if (d.test) this.testResult = d.test
        if (d.test && !d.test.ok) toast.warning('API key saved, but the check did not pass — see the message below')
        else toast.success('API key saved — Ask DASYIN is on')
        this.afterChange()
      } catch (e) {
        // 422: Anthropic rejected the key, so it was not saved.
        this.keyError = apiErrorMessage(e, 'Could not save the API key')
        const t = e.response?.data?.test
        if (t) this.testResult = t
      } finally {
        this.savingKey = false
      }
    },
    async saveModel() {
      if (!this.modelDirty || this.savingModel) return
      this.savingModel = true
      try {
        const { data } = await api.put(SETTINGS_URL, { model: this.draftModel })
        this.apply(data.data)
        toast.success(this.s.saved_model ? `Model set to ${this.s.saved_model}` : `Model reset to ${this.s.model}`)
        this.afterChange()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the model'))
      } finally {
        this.savingModel = false
      }
    },
    async removeKey() {
      const env = this.s?.env_key_set
      const ok = await confirmDialog({
        title: 'Remove the API key?',
        message: env
          ? 'The saved key is deleted. The key from the server environment (ANTHROPIC_API_KEY) will be used instead.'
          : 'The saved key is deleted and Ask DASYIN, AI summaries and AI expense reading switch off for everyone until a new key is added.',
        confirmText: 'Remove key',
        danger: true
      })
      if (!ok) return
      this.removing = true
      try {
        const { data } = await api.delete(SETTINGS_URL)
        this.apply(data.data)
        this.testResult = null
        this.liveModels = null
        toast.success(data.data.enabled ? 'Saved key removed — using the environment key' : 'API key removed — Ask DASYIN is off')
        this.afterChange()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the API key'))
      } finally {
        this.removing = false
      }
    },
    async test() {
      if (this.testing) return
      this.testing = true
      this.testResult = null
      this.keyError = ''
      try {
        const body = {}
        if (this.draftKey) body.api_key = this.draftKey
        if (this.modelDirty && this.draftModel) body.model = this.draftModel
        const { data } = await api.post(`${SETTINGS_URL}/test`, body)
        this.testResult = data.data
        if (!this.draftKey) this.load()
      } catch (e) {
        this.testResult = { ok: false, code: 'error', message: apiErrorMessage(e, 'The test could not run') }
      } finally {
        this.testing = false
      }
    },
    /** The open Ask DASYIN panel / page picks the change up at once. */
    afterChange() {
      loadStatus(true)
      this.loadModels()
      this.$emit('changed', this.s)
    }
  }
}
</script>

<style scoped>
.aik {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 880px;
}

.aik__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.aik__head h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 2px;
}

.aik__head p {
  margin: 0;
  max-width: 640px;
}

.aik__head .ui-badge {
  flex-shrink: 0;
}

.aik__explain span {
  line-height: 1.55;
}

.aik__explain a {
  font-weight: 600;
}

.aik__panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  background: var(--surface);
}

.aik__kv dd {
  font-variant-numeric: tabular-nums;
}

.aik__hint {
  margin-left: 8px;
  color: var(--text-2);
}

.aik__section .ui-field {
  margin: 0;
}

.aik__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.aik__row > .ui-input,
.aik__input {
  flex: 1;
  min-width: 0;
}

.aik__input {
  display: flex;
  gap: 4px;
  align-items: center;
}

.aik__input .ui-input {
  flex: 1;
  min-width: 0;
}

.aik__mono {
  font-family: var(--font-mono);
  font-size: 13px;
}

.aik__row .ui-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.aik__inline {
  margin-top: 8px;
}

.aik code {
  font-size: 12px;
}

.aik__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.aik__chip {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12.5px;
  cursor: pointer;
}

.aik__chip:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.aik__chip.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.aik__test {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.aik__test-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

@media (max-width: 720px) {
  .aik__head,
  .aik__test {
    flex-direction: column;
    align-items: stretch;
  }

  .aik__head .ui-badge {
    align-self: flex-start;
  }

  .aik__row {
    flex-wrap: wrap;
  }

  .aik__row > .ui-input,
  .aik__input {
    flex: 1 1 100%;
  }

  .aik__row .ui-btn {
    flex: 1 1 auto;
    justify-content: center;
  }

  .aik__input .ui-btn {
    flex: 0 0 auto;
  }

  .pf-kv.aik__kv {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px 0;
  }

  .aik__kv dd {
    margin-bottom: 10px;
  }
}
</style>
