<template>
  <div class="wtp" data-testid="wa-template-picker">
    <div class="ui-field">
      <label :for="uid">WhatsApp template <span class="muted">— for people who haven't messaged you in the last 24 hours</span></label>
      <div v-if="loading" class="ui-skeleton" style="height: 40px"></div>
      <select v-else :id="uid" class="ui-select" :value="modelValue.template || ''" data-testid="wa-template" @change="choose($event.target.value)">
        <option value="">No template — skip people without an open conversation</option>
        <option v-for="t in approved" :key="t.name + t.language" :value="t.name">{{ t.name }} ({{ t.language }}{{ t.category ? ' · ' + t.category.toLowerCase() : '' }})</option>
      </select>
      <span v-if="note" class="ui-hint">{{ note }}</span>
      <span v-else-if="pendingCount" class="ui-hint">{{ pendingCount }} template{{ pendingCount === 1 ? ' is' : 's are' }} waiting for Meta's approval and can't be used yet.</span>
    </div>
    <div v-if="current" class="wtp-body">
      <p class="wtp-text"><i class="fa-brands fa-whatsapp"></i> {{ current.body || 'This template has no text body.' }}</p>
      <div v-for="(p, i) in params" :key="i" class="ui-field">
        <label :for="uid + '-p' + i"><code v-text="ph(i + 1)"></code> is</label>
        <input :id="uid + '-p' + i" class="ui-input" :value="p" :data-testid="'wa-param-' + (i + 1)" placeholder="Text or a merge field such as {first_name}" @input="setParam(i, $event.target.value)" @focus="focused = i" />
      </div>
      <div v-if="current.url_button" class="ui-field">
        <label :for="uid + '-btn'">Button link ending</label>
        <input :id="uid + '-btn'" class="ui-input" :value="modelValue.url_button || ''" placeholder="e.g. {invoice_number}" @input="emit({ url_button: $event.target.value })" />
      </div>
      <div v-if="params.length" class="wtp-fields">
        <span class="muted small">Insert into <code v-text="ph(focused + 1)"></code>:</span>
        <button v-for="f in fields" :key="f.name" type="button" class="wtp-chip" :title="f.help" @click="insert(f.name)">{{ '{' + f.name + '}' }}</button>
      </div>
      <label class="ui-switch"><input type="checkbox" :checked="!!modelValue.template_only" @change="emit({ template_only: $event.target.checked })" /> Always use the template (even inside the 24-hour window)</label>
    </div>
  </div>
</template>

<script>
import { schedsendApi } from '@/services/schedsend'

let seq = 0

// Sensible first mappings for common templates (people can change them).
const GUESS = [
  { test: /invoice|pay|due/i, params: ['{first_name}', '{invoice_number}', '{amount_due}', '{due_date}', '{pay_link}'] },
  { test: /statement|balance/i, params: ['{first_name}', '{balance}', '{open_invoices}', '{pay_link}'] }
]

/**
 * Pick an approved WhatsApp template (GET /whatsapp/templates, the
 * organisation's own number) and map its {{1}}, {{2}} … to merge fields.
 * v-model: { template, language, params, url_button, template_only }.
 */
export default {
  name: 'WaTemplatePicker',
  props: {
    modelValue: { type: Object, required: true },
    fields: { type: Array, default: () => [] },
    /** Text used for the 2nd parameter of a generic "Hello {{1}}, {{2}}" template. */
    message: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  data() {
    return { uid: 'wtp' + ++seq, loading: true, templates: [], note: '', focused: 0 }
  },
  computed: {
    approved() {
      return this.templates.filter((t) => t.status === 'APPROVED')
    },
    pendingCount() {
      return this.templates.filter((t) => t.status === 'PENDING').length
    },
    current() {
      return this.approved.find((t) => t.name === this.modelValue.template) || null
    },
    params() {
      const n = this.current?.body_params || 0
      const p = [...(this.modelValue.params || [])]
      while (p.length < n) p.push('')
      return p.slice(0, n)
    }
  },
  async created() {
    try {
      const r = await schedsendApi.waTemplates()
      this.templates = r?.templates || []
      this.note = r?.note || ''
    } catch {
      this.note = 'Could not load the WhatsApp templates.'
    } finally {
      this.loading = false
    }
  },
  methods: {
    ph(n) {
      return '{' + '{' + n + '}' + '}'
    },
    emit(patch) {
      this.$emit('update:modelValue', { ...this.modelValue, ...patch })
    },
    choose(name) {
      const t = this.approved.find((x) => x.name === name)
      if (!t) return this.emit({ template: '', language: '', params: [], url_button: '' })
      const g = GUESS.find((x) => x.test.test(t.name + ' ' + (t.body || '')))
      const params = []
      for (let i = 0; i < (t.body_params || 0); i++) {
        if (g && g.params[i]) params.push(g.params[i])
        else if (i === 0) params.push('{first_name}')
        else if (i === 1 && this.message) params.push(this.message.replace(/\s+/g, ' ').slice(0, 300))
        else params.push('')
      }
      this.emit({ template: t.name, language: t.language, params, url_button: t.url_button ? '{invoice_number}' : '' })
    },
    setParam(i, v) {
      const p = [...this.params]
      p[i] = v
      this.emit({ params: p })
    },
    insert(name) {
      const i = Math.min(this.focused, this.params.length - 1)
      if (i < 0) return
      this.setParam(i, (this.params[i] ? this.params[i] + ' ' : '') + '{' + name + '}')
    }
  }
}
</script>

<style scoped>
.wtp {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wtp-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
}
.wtp-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.wtp-text i {
  color: #25d366;
  margin-right: 4px;
}
.wtp-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.wtp-chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 12px;
  font-family: var(--font-mono);
  cursor: pointer;
}
.wtp-chip:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12px;
}
code {
  font-size: 12px;
}
</style>
