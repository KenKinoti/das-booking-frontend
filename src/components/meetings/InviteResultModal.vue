<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 540px" role="dialog" aria-modal="true" aria-label="Invitation status">
      <div class="ui-modal__head">
        <div class="head">
          <span class="badge-icon" :class="tone"><i :class="icon"></i></span>
          <div>
            <h2>{{ heading }}</h2>
            <p class="sub">{{ meeting.title }} · {{ when }}</p>
          </div>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <template v-if="invite && invite.emailed">
          <p class="lead">{{ cancelled ? 'Cancellation' : 'Calendar invitation' }} emailed to <strong>{{ invite.sent }} {{ invite.sent === 1 ? 'person' : 'people' }}</strong>. {{ cancelled ? 'It will be removed from their calendars.' : 'They can Accept or Decline from their inbox.' }}</p>
          <div v-if="invite.failed && invite.failed.length" class="ui-alert ui-alert--warning">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Couldn't email {{ invite.failed.map((f) => f.email).join(', ') }} — {{ invite.failed[0].error }}</span>
          </div>
        </template>

        <template v-else-if="!recipients.length">
          <p class="lead">No participants were added, so no invitations were sent. You can add the meeting to your own calendar with the .ics file.</p>
        </template>

        <template v-else>
          <div class="ui-alert ui-alert--warning">
            <i class="fa-solid fa-envelope-circle-check"></i>
            <span v-if="invite && invite.smtp_configured">Email sending failed{{ invite.failed && invite.failed[0] ? ': ' + invite.failed[0].error : '' }}. Send the invitation yourself instead:</span>
            <span v-else><strong>Nothing was emailed</strong> — email (SMTP) isn't configured on the server. Send the invitation yourself in two steps:</span>
          </div>
          <ol class="steps">
            <li>
              <div><strong>Download the calendar file</strong><small>{{ cancelled ? 'A cancellation .ics that removes the event from calendars.' : 'An .ics invite that works with Outlook, Gmail and Apple Calendar.' }}</small></div>
              <button class="ui-btn ui-btn--sm" :disabled="downloading" @click="downloadIcs"><i :class="downloading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-download'"></i> Download .ics</button>
            </li>
            <li>
              <div><strong>Open a pre-filled email</strong><small>To {{ recipients.length }} {{ recipients.length === 1 ? 'person' : 'people' }} — attach the downloaded .ics before sending.</small></div>
              <a class="ui-btn ui-btn--sm ui-btn--primary" :href="mailto"><i class="fa-regular fa-envelope"></i> Open in email app</a>
            </li>
          </ol>
          <p class="ui-hint">Recipients: {{ recipients.join(', ') }}</p>
        </template>

        <div v-if="!cancelled && meeting.join_url" class="join">
          <span class="join__url" :title="meeting.join_url">{{ meeting.join_url }}</span>
          <button class="ui-btn ui-btn--sm ui-btn--ghost" @click="copy"><i class="fa-regular fa-copy"></i> Copy link</button>
        </div>
      </div>

      <div class="ui-modal__foot">
        <button v-if="invite && invite.emailed" class="ui-btn" :disabled="downloading" @click="downloadIcs"><i class="fa-solid fa-download"></i> .ics</button>
        <button v-else-if="!recipients.length" class="ui-btn" :disabled="downloading" @click="downloadIcs"><i class="fa-solid fa-download"></i> Download .ics</button>
        <button class="ui-btn ui-btn--primary" @click="$emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { meetingsApi, mailtoLink, fmtRange } from '@/services/meetings'

export default {
  name: 'InviteResultModal',
  props: {
    meeting: { type: Object, required: true },
    invite: { type: Object, default: null },
    mode: { type: String, default: 'create' } // create | edit | resend | cancel
  },
  emits: ['close'],
  data() {
    return { downloading: false }
  },
  computed: {
    cancelled() {
      return this.mode === 'cancel'
    },
    recipients() {
      return this.invite?.recipients?.length ? this.invite.recipients : (this.meeting.participants || []).map((p) => p.email)
    },
    when() {
      return fmtRange(this.meeting)
    },
    mailto() {
      return mailtoLink(this.meeting, { cancelled: this.cancelled })
    },
    heading() {
      if (this.cancelled) return 'Meeting cancelled'
      if (this.mode === 'edit') return 'Meeting updated'
      if (this.mode === 'resend') return this.invite?.emailed ? 'Invitations re-sent' : 'Send invitations'
      return 'Meeting scheduled'
    },
    tone() {
      if (this.cancelled) return 'danger'
      return this.invite?.emailed || !this.recipients.length ? 'success' : 'warning'
    },
    icon() {
      if (this.cancelled) return 'fa-solid fa-calendar-xmark'
      return this.invite?.emailed || !this.recipients.length ? 'fa-solid fa-calendar-check' : 'fa-solid fa-envelope-open-text'
    }
  },
  methods: {
    async downloadIcs() {
      this.downloading = true
      try {
        await meetingsApi.downloadIcs(this.meeting)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not download the calendar file'))
      } finally {
        this.downloading = false
      }
    },
    async copy() {
      try {
        await navigator.clipboard.writeText(this.meeting.join_url)
        toast.success('Join link copied')
      } catch {
        toast.error('Copy failed — select the link and copy it manually')
      }
    }
  }
}
</script>

<style scoped>
.head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.badge-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 17px;
}
.badge-icon.success { background: var(--success-soft); color: var(--success); }
.badge-icon.warning { background: var(--warning-soft); color: var(--warning); }
.badge-icon.danger { background: var(--danger-soft); color: var(--danger); }
.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13px;
}
.lead {
  margin: 0 0 12px;
  color: var(--text-2);
}
.steps {
  margin: 14px 0 10px;
  padding: 0;
  list-style: none;
  counter-reset: s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.steps li {
  counter-increment: s;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.steps li::before {
  content: counter(s);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}
.steps li > div {
  flex: 1 1 200px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.steps small {
  color: var(--text-3);
  font-size: 12px;
}
.join {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 8px 8px 12px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
}
.join__url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-2);
}
@media (max-width: 520px) {
  .steps li {
    flex-wrap: wrap;
  }
  .steps li .ui-btn {
    margin-left: 36px;
  }
}
</style>
