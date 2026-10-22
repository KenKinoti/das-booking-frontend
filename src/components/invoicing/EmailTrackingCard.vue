<template>
  <section class="ui-card mb" id="email-tracking" data-testid="email-tracking-card">
    <div class="ui-card__head">
      <h2>Email tracking</h2>
      <span v-if="p" class="ui-badge" :class="p.track_recipients ? 'ui-badge--success' : 'ui-badge--draft'">{{ p.track_recipients ? (p.track_opens ? 'Opens and links' : 'Links only') : 'Off' }}</span>
    </div>
    <div class="ui-card__body">
      <div v-if="loading" class="ui-skeleton" style="height: 120px"></div>
      <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      <template v-else-if="p">
        <p class="ui-hint m0">Applies to invoices, quotes, reminders and receipts emailed from DASYIN. See who got, opened and used each email on the document’s <strong>Emails</strong> tab.</p>
        <div class="et-opts">
          <div class="et-opt">
            <label class="ui-switch">
              <input type="checkbox" :checked="p.track_recipients" :disabled="busy" data-testid="track-recipients" @change="save({ track_recipients: $event.target.checked })" />
              Track each recipient separately
            </label>
            <span class="ui-hint">Everyone on To and CC gets their own copy addressed only to them, with an “Also sent to: …” line naming the others — so you can see who opened it and who clicked View or Pay. BCC copies are never tracked. Off: one message to everyone, as before.</span>
          </div>
          <div class="et-opt">
            <label class="ui-switch" :class="{ 'is-disabled': !p.track_recipients }">
              <input type="checkbox" :checked="p.track_opens" :disabled="busy || !p.track_recipients" data-testid="track-opens" @change="save({ track_opens: $event.target.checked })" />
              Record when emails are opened
            </label>
            <span class="ui-hint">Adds a tiny invisible image to each copy. “Opened” is a hint, not proof: Outlook and other apps often hide images (opens are missed) and Apple Mail can load them by itself (shown as “automatic”). Clicks on View / Pay are recorded either way — those are reliable.</span>
          </div>
          <div class="et-opt">
            <label class="ui-switch" :class="{ 'is-disabled': !p.track_recipients || !p.track_opens }">
              <input type="checkbox" :checked="p.open_notice" :disabled="busy || !p.track_recipients || !p.track_opens" data-testid="open-notice" @change="save({ open_notice: $event.target.checked })" />
              Tell recipients in the email footer
            </label>
            <span class="ui-hint">Adds “{{ p.notice_text }}” under your business details.</span>
          </div>
        </div>
        <div class="et-privacy" data-testid="tracking-privacy">
          <i class="fa-solid fa-scale-balanced"></i>
          <p>
            <strong>Privacy (Kenya Data Protection Act, 2019).</strong> Knowing when a person opened an email is personal data. Use it only for following up your own invoices, mention it in your privacy notice (or turn on the footer line), and turn open tracking off for clients who object. DASYIN keeps the mail app and the network (first three parts of the IP address), never the full IP address.
          </p>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'EmailTrackingCard',
  data() {
    return { p: null, loading: true, busy: false, error: '' }
  },
  async created() {
    try {
      this.p = await invoicingApi.emailTracking()
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the email tracking setting')
    } finally {
      this.loading = false
    }
  },
  methods: {
    async save(change) {
      if (this.busy) return
      const before = { ...this.p }
      this.p = { ...this.p, ...change }
      this.busy = true
      try {
        this.p = await invoicingApi.saveEmailTracking(change)
        toast.success(this.message(change))
      } catch (e) {
        this.p = before
        toast.error(apiErrorMessage(e, 'Could not save the email tracking setting'))
      } finally {
        this.busy = false
      }
    },
    message(c) {
      if ('track_recipients' in c) return c.track_recipients ? 'Each recipient now gets their own tracked copy' : 'Emails go out as one message to everyone (not tracked per person)'
      if ('track_opens' in c) return c.track_opens ? 'Opens are recorded again' : 'Open tracking is off — link clicks are still recorded'
      return c.open_notice ? 'The footer line is added to emails' : 'The footer line is no longer added'
    }
  }
}
</script>

<style scoped>
.et-opts {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 14px;
}
.et-opt {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.et-opt .ui-hint {
  padding-left: 46px;
}
.is-disabled {
  opacity: 0.6;
}
.et-privacy {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.5;
}
.et-privacy i {
  color: var(--text-3);
  margin-top: 3px;
}
.et-privacy p {
  margin: 0;
}
.et-privacy strong {
  color: var(--text);
}
@media (max-width: 640px) {
  .et-opt .ui-hint {
    padding-left: 0;
  }
}
</style>
