<template>
  <!-- The client's-eye view of a Pending-review item: the exact email (sandboxed), SMS or WhatsApp message. -->
  <div class="obp" :class="{ 'is-compact': compact }" data-testid="outbox-preview" :data-channel="channel">
    <div v-if="draft" class="obp__draft" data-testid="preview-draft"><i class="fa-regular fa-pen-to-square"></i> Your unsaved changes — this is how it will look once you save or send.</div>
    <div v-if="!p" class="obp__empty muted small">{{ busy ? 'Building the preview…' : 'No preview available.' }}</div>
    <template v-else>
      <div v-if="p.error" class="ui-alert ui-alert--warning" data-testid="preview-problem"><i class="fa-solid fa-triangle-exclamation"></i><span>The preview couldn’t be built: {{ p.error }} You can still decide on the message.</span></div>

      <!-- Email -->
      <section v-if="channel === 'email'" class="obp__mail" :class="{ 'is-busy': busy }">
        <dl class="obp__meta">
          <div v-if="p.from"><dt>From</dt><dd>{{ p.from }}</dd></div>
          <div><dt>To</dt><dd data-testid="preview-to">{{ p.to || item.to || '—' }}</dd></div>
          <div v-if="(p.cc || []).length"><dt>CC</dt><dd>{{ p.cc.join(', ') }}</dd></div>
          <div v-if="(p.bcc || []).length"><dt>BCC</dt><dd>{{ p.bcc.join(', ') }}</dd></div>
          <div v-if="p.reply_to"><dt>Reply-To</dt><dd>{{ p.reply_to }}</dd></div>
          <div><dt>Subject</dt><dd class="obp__subject" data-testid="preview-subject">{{ p.subject || item.subject }}</dd></div>
          <div v-if="(p.attachments || []).length">
            <dt>Attached</dt>
            <dd class="obp__att" data-testid="preview-attachments">
              <span v-for="(a, i) in p.attachments" :key="i" class="obp__chip" :title="a.note || ''">
                <i :class="a.kind === 'ics' ? 'fa-regular fa-calendar' : 'fa-solid fa-file-pdf'"></i> {{ a.name || a.filename }}
                <button v-if="a.url" type="button" class="ui-btn ui-btn--sm obp__view" :data-testid="'view-attachment-' + i" @click="$emit('view-file', a)"><i class="fa-regular fa-eye"></i> {{ a.kind === 'ics' ? 'Open' : 'View PDF' }}</button>
              </span>
              <small v-if="p.attachments.some((a) => a.note)" class="muted obp__attnote">{{ p.attachments.find((a) => a.note).note }}</small>
            </dd>
          </div>
        </dl>
        <div class="obp__tabs" role="tablist" aria-label="Preview format">
          <button type="button" role="tab" :aria-selected="mode === 'html'" :class="{ on: mode === 'html' }" @click="mode = 'html'"><i class="fa-regular fa-envelope"></i> Email</button>
          <button type="button" role="tab" :aria-selected="mode === 'text'" :class="{ on: mode === 'text' }" data-testid="preview-text-tab" @click="mode = 'text'"><i class="fa-solid fa-align-left"></i> Plain text</button>
        </div>
        <iframe v-if="mode === 'html' && p.html" class="obp__frame" sandbox="" :srcdoc="p.html" title="Email preview — exactly what the client receives" data-testid="preview-frame"></iframe>
        <pre v-else class="obp__text" data-testid="preview-text">{{ p.text || '' }}</pre>
      </section>

      <!-- SMS / WhatsApp: a phone-style bubble -->
      <section v-else class="obp__phone" :class="'is-' + channel">
        <div class="obp__phone-head">
          <i :class="channel === 'whatsapp' ? 'fa-brands fa-whatsapp' : 'fa-solid fa-comment-sms'" aria-hidden="true"></i>
          <span>{{ item.to_name || 'Client' }} <small class="muted">{{ p.to || item.to }}</small></span>
        </div>
        <div class="obp__thread">
          <template v-if="waTemplate">
            <div class="obp__bubble" data-testid="preview-wa-template">
              <small class="obp__tpl"><i class="fa-solid fa-file-lines"></i> Template {{ wa.template }}<template v-if="wa.language"> ({{ wa.language }})</template></small>
              <span v-if="(wa.params || []).length" class="obp__params">
                <span v-for="(v, i) in wa.params" :key="i" class="obp__param"><code v-text="ph(i + 1)"></code> {{ v }}</span>
              </span>
              <span v-else class="obp__bubble-text">{{ p.text }}</span>
              <small class="obp__tpl">The client sees the template’s approved wording with these filled in.</small>
            </div>
          </template>
          <div v-else class="obp__bubble" data-testid="preview-bubble">
            <span class="obp__bubble-text">{{ p.text || item.message || item.sms_text }}</span>
          </div>
        </div>
        <p v-if="p.sms" class="muted small obp__count" data-testid="preview-sms-count">{{ p.sms.chars }} characters · {{ p.sms.segments }} SMS{{ p.sms.segments > 1 ? ' messages' : '' }}</p>
        <p v-if="channel === 'whatsapp' && wa && wa.mode === 'auto'" class="muted small obp__count">Goes as free text if the client wrote in the last 24 hours; otherwise as the template.</p>
        <p v-if="channel === 'whatsapp' && wa && wa.window_open === false && wa.mode !== 'template'" class="muted small obp__count"><i class="fa-regular fa-clock"></i> The client hasn’t written in the last 24 hours — WhatsApp only allows a template now.</p>
      </section>
    </template>
  </div>
</template>

<script>
export default {
  name: 'OutboxPreview',
  props: {
    item: { type: Object, required: true },
    preview: { type: Object, default: null },
    draft: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    compact: { type: Boolean, default: false }
  },
  emits: ['view-file'],
  data() {
    return { mode: 'html' }
  },
  computed: {
    p() {
      return this.preview
    },
    channel() {
      return this.item?.channel || 'email'
    },
    wa() {
      return this.item?.whatsapp || null
    },
    waTemplate() {
      const w = this.wa
      return this.channel === 'whatsapp' && w && (w.mode === 'template' || (w.mode === 'auto' && w.window_open === false)) && !!w.template
    }
  },
  methods: {
    ph: (n) => '{' + '{' + n + '}' + '}'
  }
}
</script>

<style scoped>
.obp {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12.5px;
}
.obp__draft {
  font-size: 12.5px;
  color: var(--warning);
  background: var(--warning-soft);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
}
.obp__empty {
  padding: 30px 0;
  text-align: center;
}
.obp__mail {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: opacity 0.15s;
}
.obp__mail.is-busy {
  opacity: 0.6;
}
.obp__meta {
  margin: 0;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.obp__meta > div {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 8px;
}
.obp__meta dt {
  color: var(--text-3);
}
.obp__meta dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.obp__subject {
  font-weight: 600;
}
.obp__att {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.obp__chip {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 3px 4px 3px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-2);
  max-width: 100%;
  overflow-wrap: anywhere;
}
.obp__chip > i {
  color: var(--danger);
}
.obp__view {
  height: 28px;
}
.obp__attnote {
  flex-basis: 100%;
  font-size: 12px;
}
.obp__tabs {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
.obp__tabs button {
  border: 0;
  background: none;
  color: var(--text-2);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.obp__tabs button.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.obp__frame {
  display: block;
  width: 100%;
  height: 620px;
  border: 0;
  background: #f3f4f8;
}
.is-compact .obp__frame {
  height: 520px;
}
.obp__text {
  margin: 0;
  padding: 14px;
  max-height: 620px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text);
  background: var(--surface);
}
.obp__phone {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  max-width: 460px;
  width: 100%;
}
.obp__phone-head {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  font-weight: 600;
  font-size: 13.5px;
}
.obp__phone-head small {
  font-weight: 400;
  margin-left: 6px;
}
.obp__phone.is-whatsapp .obp__phone-head i {
  color: #25d366;
}
.obp__thread {
  padding: 16px 14px 18px;
  background: var(--bg-subtle);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.obp__phone.is-whatsapp .obp__thread {
  background: color-mix(in srgb, #25d366 7%, var(--bg-subtle));
}
.obp__bubble {
  max-width: 88%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px 14px 4px 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.45;
  box-shadow: var(--shadow-xs);
}
.obp__phone.is-whatsapp .obp__bubble {
  background: color-mix(in srgb, #25d366 16%, var(--surface));
  border-color: color-mix(in srgb, #25d366 30%, var(--border));
}
.obp__bubble-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.obp__tpl {
  color: var(--text-3);
  font-size: 11.5px;
}
.obp__params {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
  color: var(--text-2);
}
.obp__param code {
  font-size: 11px;
  background: var(--surface-2);
  padding: 0 4px;
  border-radius: 4px;
}
.obp__count {
  margin: 0;
  padding: 0 14px 10px;
}
.obp__phone .obp__count:first-of-type {
  padding-top: 8px;
}
@media (max-width: 640px) {
  .obp__frame {
    height: 480px;
  }
  .obp__meta > div {
    grid-template-columns: 64px minmax(0, 1fr);
  }
  .obp__view {
    height: 44px;
    min-width: 44px;
  }
  .obp__tabs button {
    min-height: 44px;
  }
}
</style>
