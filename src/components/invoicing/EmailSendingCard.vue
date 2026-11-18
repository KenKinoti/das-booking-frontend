<template>
  <section class="ui-card mb" id="email-sending" data-testid="email-sending-card">
    <div class="ui-card__head">
      <h2>Email — undo send &amp; recall</h2>
      <span v-if="o" class="ui-badge" :class="o.undo_seconds ? 'ui-badge--sent' : 'ui-badge--draft'">{{ o.undo_seconds ? `Undo: ${label(o.undo_seconds)}` : 'Undo off' }}</span>
    </div>
    <div class="ui-card__body">
      <div v-if="loading" class="ui-skeleton" style="height: 140px"></div>
      <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      <template v-else-if="o">
        <div class="es-row">
          <div class="ui-field es-field">
            <label for="es_undo">Undo send</label>
            <select id="es_undo" class="ui-select" :value="o.undo_seconds" :disabled="busy" data-testid="undo-seconds" @change="save({ undo_seconds: Number($event.target.value) })">
              <option v-for="c in o.undo_choices" :key="c" :value="c">{{ c ? label(c) : 'Off — send straight away' }}</option>
            </select>
          </div>
          <p class="ui-hint es-hint">
            After you press Send, invoice, quote, reminder and receipt emails wait this long on the server with <strong>“Sending in {{ label(o.undo_seconds || 120) }} · Undo”</strong> — Undo means nothing is sent and the document stays as it was. It is only marked Sent once the email goes. Emails sent by the AI assistant wait too; scheduled sends go at their time.
          </p>
        </div>
        <div class="es-opt">
          <label class="ui-switch">
            <input type="checkbox" :checked="o.attach_pdf" :disabled="busy" data-testid="attach-pdf" @change="save({ attach_pdf: $event.target.checked })" />
            Attach the PDF to invoice emails
          </label>
          <span class="ui-hint">
            Invoices, quotes and reminders carry a PDF copy. Turn this off to send link-only emails: the client opens the document from the View button, so if you ever recall the email there's nothing left in their inbox to take back. Receipts always carry the receipt PDF.
          </span>
        </div>
        <div class="es-truth" data-testid="recall-explainer">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <strong>What “Recall” can and can't do.</strong>
            Once an email reaches the client's mail server it can't be deleted from their inbox — Outlook's own “Recall” only works inside one Microsoft 365 organisation, and an attached PDF stays wherever it landed. From a document's <strong>Emails</strong> tab DASYIN can:
            <ul>
              <li><strong>Undo</strong> an email while it is still waiting (the window above), or <strong>Cancel</strong> a scheduled send that hasn't gone;</li>
              <li><strong>Recall</strong> a sent email: switch off its View / Pay / accept links (they show a “withdrawn” page and online payment is refused), optionally every link to the document, and email the recipients a short “please disregard” notice;</li>
              <li><strong>Recall and correct</strong>: then open the document to fix it, or void it and start a corrected copy.</li>
            </ul>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

/** Invoice settings → Email: the undo-send window and link-only emails (pkg/invoicing emailopts.go). */
export default {
  name: 'EmailSendingCard',
  data() {
    return { o: null, loading: true, busy: false, error: '' }
  },
  async created() {
    try {
      this.o = await invoicingApi.emailOptions()
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the email options')
    } finally {
      this.loading = false
    }
  },
  methods: {
    label(s) {
      return s >= 60 ? `${s / 60} minute${s === 60 ? '' : 's'}` : `${s} seconds`
    },
    async save(change) {
      if (this.busy) return
      const before = { ...this.o }
      this.o = { ...this.o, ...change }
      this.busy = true
      try {
        this.o = await invoicingApi.saveEmailOptions(change)
        if ('undo_seconds' in change) toast.success(change.undo_seconds ? `Emails now wait ${this.label(change.undo_seconds)} so you can undo them` : 'Undo send is off — emails go straight away')
        else toast.success(change.attach_pdf ? 'Invoice emails carry the PDF again' : 'Invoice emails are now link-only (no PDF attached)')
      } catch (e) {
        this.o = before
        toast.error(apiErrorMessage(e, 'Could not save the email options'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.es-row {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.es-hint {
  margin: 24px 0 0;
}
.es-opt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 16px;
}
.es-opt .ui-hint {
  padding-left: 46px;
}
.es-truth {
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
.es-truth > i {
  color: var(--info);
  margin-top: 3px;
}
.es-truth strong {
  color: var(--text);
}
.es-truth ul {
  margin: 6px 0 0;
  padding-left: 18px;
}
@media (max-width: 640px) {
  .es-row {
    grid-template-columns: 1fr;
  }
  .es-hint {
    margin: 0;
  }
  .es-opt .ui-hint {
    padding-left: 0;
  }
}
</style>
