<template>
  <!-- System settings → Notifications (super admin): the WhatsApp template the morning brief uses. -->
  <div class="bns" data-testid="brief-notifications">
    <div class="bns__head">
      <div>
        <h2>Morning brief on WhatsApp</h2>
        <p class="pf-muted">
          Each person who switches the morning brief on (My profile → Morning brief) can get it on WhatsApp. Messages DASYIN starts must use a template Meta has approved; while someone
          has messaged the number in the last 24 hours the fuller text goes instead. Organisations without their own WhatsApp number get it from this platform's number.
        </p>
      </div>
      <span v-if="d" class="ui-badge" :class="ready ? 'ui-badge--success' : 'ui-badge--warning'" data-testid="brief-wa-state">{{ ready ? 'Ready' : 'Not ready' }}</span>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="!d && !error"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 40px; margin-bottom: 14px; max-width: 640px"></div></div>

    <template v-if="d">
      <div v-if="!d.whatsapp.ready" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i>
        <span>WhatsApp isn't connected yet. Add the access token, phone number ID and business account ID in the <a href="#" @click.prevent="$emit('tab', 'whatsapp')">WhatsApp</a> tab first.</span>
      </div>

      <section class="bns__panel" data-testid="brief-recommended">
        <h3>1. Submit this template to Meta</h3>
        <p class="pf-muted pf-small">Meta Business Manager → WhatsApp Manager → Message templates → Create template. Approval usually takes minutes to a day.</p>
        <dl class="pf-kv">
          <dt>Name</dt>
          <dd><code>{{ d.recommended.name }}</code> <button class="ui-btn ui-btn--sm ui-btn--ghost" type="button" @click="copy(d.recommended.name)"><i class="fa-regular fa-copy"></i></button></dd>
          <dt>Category</dt>
          <dd>Utility</dd>
          <dt>Language</dt>
          <dd>English (<code>{{ d.recommended.language }}</code>)</dd>
          <dt>Body</dt>
          <dd><code class="wrap" data-testid="brief-recommended-body">{{ d.recommended.body }}</code> <button class="ui-btn ui-btn--sm ui-btn--ghost" type="button" @click="copy(d.recommended.body)"><i class="fa-regular fa-copy"></i></button></dd>
          <dt>Button</dt>
          <dd>Visit website · “{{ d.recommended.button_text }}” · dynamic URL <code class="wrap" data-testid="brief-recommended-url">{{ d.recommended.button_url }}</code> <button class="ui-btn ui-btn--sm ui-btn--ghost" type="button" @click="copy(d.recommended.button_url)"><i class="fa-regular fa-copy"></i></button></dd>
          <dt>Sample</dt>
          <dd class="pf-muted pf-small">{{ d.recommended.example }} — button: {{ sampleURL }}</dd>
        </dl>
      </section>

      <form class="bns__panel" novalidate @submit.prevent="save">
        <h3>2. Choose the approved template</h3>
        <div class="bns__grid">
          <label class="ui-field">
            <span class="ui-label">Template</span>
            <select v-if="d.templates.length" v-model="form.name" class="ui-select" data-testid="brief-template-select">
              <option value="">— none (WhatsApp briefs off) —</option>
              <option v-for="t in d.templates" :key="`${t.name}|${t.language}`" :value="t.name">{{ t.name }} · {{ t.language }} · {{ t.status.toLowerCase() }}</option>
            </select>
            <input v-else v-model.trim="form.name" class="ui-input" placeholder="dasyin_morning_brief" data-testid="brief-template-name" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Language code</span>
            <input v-model.trim="form.language" class="ui-input" placeholder="en" data-testid="brief-template-lang" />
          </label>
        </div>
        <p v-if="d.note" class="pf-muted pf-small"><i class="fa-solid fa-circle-info"></i> {{ d.note }}</p>
        <div v-if="d.chosen" class="ui-alert" :class="d.chosen.ok ? 'ui-alert--success' : 'ui-alert--warning'" data-testid="brief-template-status">
          <i :class="d.chosen.ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
          <span v-if="d.chosen.ok">Approved at Meta, with 3 body parameters and the “Open brief” button — briefs go out with it.</span>
          <span v-else>The chosen template can't be used yet: {{ d.chosen.problems.join('; ') }}.</span>
        </div>
        <div class="bns__foot">
          <span v-if="d.config.updated_by" class="pf-muted pf-small">Saved by {{ d.config.updated_by }}</span>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !dirty" data-testid="brief-template-save">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save
          </button>
        </div>
      </form>

      <section class="bns__panel">
        <h3>3. Delivery statuses</h3>
        <p class="pf-muted pf-small">
          Set the webhook in Meta's app dashboard (WhatsApp → Configuration) to <code class="wrap" data-testid="brief-webhook-url">{{ webhookURL }}</code> with the verify token from the WhatsApp tab, and
          subscribe to <b>messages</b>. Then each brief shows delivered / read, and people's replies open the 24-hour window for the fuller text.
        </p>
      </section>
    </template>
  </div>
</template>

<script>
import { briefAdminApi } from '@/services/brief'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'BriefNotificationSettings',
  emits: ['tab'],
  data() {
    return { d: null, error: '', form: { name: '', language: 'en' }, saving: false }
  },
  computed: {
    ready() {
      return !!this.d?.whatsapp?.ready && !!this.d?.config?.whatsapp_template && (!this.d.chosen || this.d.chosen.ok)
    },
    dirty() {
      return !!this.d && (this.form.name !== (this.d.config.whatsapp_template || '') || this.form.language !== (this.d.config.whatsapp_language || 'en'))
    },
    sampleURL() {
      return (this.d?.recommended?.button_url || '').replace('{{1}}', new Date().toISOString().slice(0, 10))
    },
    webhookURL() {
      const base = String(import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api/v1`).replace(/\/$/, '')
      return `${base}/public/whatsapp/webhook`
    }
  },
  created() {
    this.load()
  },
  methods: {
    apply(d) {
      this.d = d
      this.form = { name: d.config.whatsapp_template || '', language: d.config.whatsapp_language || 'en' }
    },
    async load() {
      this.error = ''
      try {
        this.apply(await briefAdminApi.config())
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the notification settings')
      }
    },
    async save() {
      this.saving = true
      try {
        const t = this.d.templates.find((x) => x.name === this.form.name)
        const language = t && this.form.language === (this.d.config.whatsapp_language || 'en') ? t.language : this.form.language
        this.apply(await briefAdminApi.save({ whatsapp_template: this.form.name, whatsapp_language: language }))
        toast.success('Saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = false
      }
    },
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Copied')
      } catch {
        toast.error('Copy failed — select the text instead')
      }
    }
  }
}
</script>

<style scoped>
.bns {
  display: grid;
  gap: 16px;
  max-width: 860px;
}

.bns__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.bns__head h2 {
  font-size: 18px;
  margin: 0 0 4px;
}

.bns__panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  background: var(--surface-2);
  min-width: 0;
}

.bns__panel h3 {
  font-size: 15px;
  margin: 0 0 6px;
}

.bns__grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 12px;
}

.bns__foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

code.wrap {
  white-space: normal;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .bns__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .bns__head {
    flex-direction: column;
  }
}
</style>
