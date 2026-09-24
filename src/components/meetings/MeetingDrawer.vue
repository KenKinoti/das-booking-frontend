<template>
  <div class="drawer-backdrop" @mousedown.self="$emit('close')">
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Meeting details">
      <header class="drawer__head">
        <div class="drawer__title">
          <span class="ui-badge" :class="`ui-badge--${status.cls}`">{{ status.label }}</span>
          <h2>{{ m.title }}</h2>
          <p>{{ range }}</p>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <div v-if="m.status !== 'cancelled'" class="drawer__status">
        <button v-if="m.status !== 'completed'" class="ui-btn ui-btn--primary ui-btn--sm" @click="join"><i class="fa-solid fa-video"></i> {{ m.location_type === 'external' ? 'Join (external)' : 'Join room' }}</button>
        <button v-else class="ui-btn ui-btn--sm" @click="openRoom"><i class="fa-solid fa-door-open"></i> Open room</button>
        <button class="ui-btn ui-btn--sm" :disabled="!!busy" @click="$emit('edit', m)"><i class="fa-regular fa-pen-to-square"></i> {{ past ? 'Edit' : 'Edit / reschedule' }}</button>
        <button v-if="m.join_url" class="ui-btn ui-btn--sm ui-btn--ghost" @click="copyLink"><i class="fa-regular fa-copy"></i> Copy link</button>
      </div>

      <div class="drawer__body">
        <div v-if="loading" class="block">
          <div class="ui-skeleton" style="height: 14px; width: 60%; margin-bottom: 10px"></div>
          <div class="ui-skeleton" style="height: 14px; width: 80%"></div>
        </div>

        <section class="block">
          <dl class="facts">
            <div>
              <dt><i class="fa-regular fa-clock"></i> When</dt>
              <dd>
                {{ range }} <span class="muted">· {{ duration }}</span>
                <small v-if="tzDiffers" class="muted d-block">{{ rangeInTz }} ({{ m.timezone }})</small>
                <small v-if="m.recurrence && m.recurrence !== 'none'" class="muted d-block"><i class="fa-solid fa-repeat"></i> Repeats {{ m.recurrence }} · {{ m.recurrence_count }} times</small>
              </dd>
            </div>
            <div>
              <dt><i class="fa-solid fa-location-dot"></i> Where</dt>
              <dd>
                {{ where }}
                <a v-if="m.join_url" :href="m.join_url" class="link d-block" target="_blank" rel="noopener" @click.prevent="join">{{ m.join_url }}</a>
              </dd>
            </div>
            <div>
              <dt><i class="fa-regular fa-user"></i> Organizer</dt>
              <dd>{{ m.organizer_name || '—' }} <small v-if="m.organizer_email" class="muted d-block">{{ m.organizer_email }}</small></dd>
            </div>
            <div v-if="m.reminder_minutes">
              <dt><i class="fa-regular fa-bell"></i> Reminder</dt>
              <dd>{{ reminder }} before</dd>
            </div>
            <div>
              <dt><i class="fa-regular fa-paper-plane"></i> Invites</dt>
              <dd>
                <span v-if="m.invites_sent_at">Emailed {{ fmtDateTime(m.invites_sent_at) }}</span>
                <span v-else class="muted">Not emailed yet</span>
                <small v-if="m.sequence" class="muted d-block">Revision {{ m.sequence }}</small>
              </dd>
            </div>
          </dl>
        </section>

        <section v-if="m.description" class="block">
          <h3>Agenda</h3>
          <p class="pre">{{ m.description }}</p>
        </section>

        <section class="block">
          <div class="block__head">
            <h3>Participants <span class="count">{{ (m.participants || []).length }}</span></h3>
            <button v-if="m.status === 'scheduled' && (m.participants || []).length" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="!!busy" @click="resend"><i :class="busy === 'invite' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane'"></i> Re-send invites</button>
          </div>
          <p v-if="!(m.participants || []).length" class="muted small">No participants. Edit the meeting to invite people.</p>
          <ul v-else class="people">
            <li v-for="p in m.participants" :key="p.id || p.email">
              <span class="avatar">{{ initials(p.name || p.email) }}</span>
              <span class="people__text"><strong>{{ p.name || p.email }}</strong><small>{{ p.email }}</small></span>
              <span v-if="p.customer_id" class="tag">Customer</span>
              <span v-else-if="p.user_id" class="tag">Team</span>
              <i v-if="p.invited_at" class="fa-solid fa-envelope-circle-check ok" :title="`Invited ${fmtDateTime(p.invited_at)}`"></i>
            </li>
          </ul>
        </section>

        <section class="block">
          <div class="block__head">
            <h3>Transcript & summary</h3>
            <button v-if="transcript" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="!!busy" @click="downloadTxt"><i :class="busy === 'txt' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-file-arrow-down'"></i> Download .txt</button>
          </div>
          <div v-if="transcriptLoading" class="ui-skeleton" style="height: 60px"></div>
          <template v-else-if="transcript">
            <p class="summary">{{ transcript.summary }}</p>
            <template v-if="transcript.key_decisions && transcript.key_decisions.length">
              <h4>Key decisions</h4>
              <ul class="bullets">
                <li v-for="(d, i) in transcript.key_decisions" :key="i">{{ d }}</li>
              </ul>
            </template>
            <template v-if="transcript.action_items && transcript.action_items.length">
              <h4>Action items</h4>
              <ul class="actions">
                <li v-for="(a, i) in transcript.action_items" :key="i">
                  <i class="fa-regular fa-square-check"></i>
                  <span>{{ a.text }}<small v-if="a.owner || a.due" class="muted d-block"><span v-if="a.owner">Owner: {{ a.owner }}</span><span v-if="a.owner && a.due"> · </span><span v-if="a.due">Due: {{ a.due }}</span></small></span>
                </li>
              </ul>
            </template>
            <details class="full">
              <summary>Full transcript</summary>
              <pre>{{ transcript.text || '(no spoken transcript — notes only)' }}</pre>
              <template v-if="transcript.notes"><h4>Notes</h4><pre>{{ transcript.notes }}</pre></template>
            </details>
            <p class="muted small">Summary by {{ transcript.summary_source === 'anthropic' ? 'Claude' : 'the built-in summariser' }} · saved {{ fmtDateTime(transcript.updated_at) }}</p>
          </template>
          <div v-else class="empty-t">
            <p class="muted small">No transcript yet. Open the meeting room to record live transcription or paste one in — a summary is created when you save.</p>
            <button v-if="m.status !== 'cancelled'" class="ui-btn ui-btn--sm" @click="openRoom"><i class="fa-solid fa-microphone-lines"></i> Open room & transcribe</button>
          </div>
        </section>
      </div>

      <footer class="drawer__foot">
        <button class="ui-btn ui-btn--sm" :disabled="!!busy" @click="downloadIcs"><i :class="busy === 'ics' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-calendar'"></i> Download .ics</button>
        <span class="spacer"></span>
        <button v-if="m.status === 'scheduled' || m.status === 'in_progress'" class="ui-btn ui-btn--sm ui-btn--danger" :disabled="!!busy" @click="cancelMeeting"><i class="fa-regular fa-calendar-xmark"></i> Cancel meeting</button>
        <button v-else class="ui-btn ui-btn--sm ui-btn--danger" :disabled="!!busy" @click="remove"><i class="fa-regular fa-trash-can"></i> Delete</button>
      </footer>
    </aside>
  </div>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import { meetingsApi, fmtRange, durationLabel, displayStatus, locationLabel, initials, isPast } from '@/services/meetings'

export default {
  name: 'MeetingDrawer',
  props: {
    meeting: { type: Object, required: true }
  },
  emits: ['close', 'edit', 'changed', 'deleted', 'result'],
  data() {
    return { m: { ...this.meeting }, loading: false, transcript: null, transcriptLoading: false, busy: '' }
  },
  computed: {
    status() {
      return displayStatus(this.m)
    },
    past() {
      return isPast(this.m)
    },
    range() {
      return fmtRange(this.m)
    },
    rangeInTz() {
      return fmtRange(this.m, this.m.timezone)
    },
    tzDiffers() {
      try {
        return this.m.timezone && this.rangeInTz !== this.range
      } catch {
        return false
      }
    },
    duration() {
      return durationLabel(this.m)
    },
    where() {
      if (this.m.location_type === 'physical') return this.m.location
      return locationLabel(this.m)
    },
    reminder() {
      const n = this.m.reminder_minutes
      return n >= 1440 ? `${n / 1440} day` : n >= 60 ? `${n / 60} hour` : `${n} min`
    }
  },
  watch: {
    meeting(v) {
      this.m = { ...v }
      this.refresh()
    }
  },
  mounted() {
    this.refresh()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    initials,
    fmtDateTime: formatDateTime,
    onKey(e) {
      if (e.key === 'Escape' && !document.querySelector('.ui-modal-backdrop')) this.$emit('close')
    },
    async refresh() {
      this.loading = !this.m.participants
      try {
        const { meeting } = await meetingsApi.get(this.m.id)
        if (meeting) this.m = meeting
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not load the meeting'))
      } finally {
        this.loading = false
      }
      this.transcript = null
      if (this.m.has_transcript) {
        this.transcriptLoading = true
        try {
          this.transcript = await meetingsApi.getTranscript(this.m.id)
        } catch {
          this.transcript = null
        } finally {
          this.transcriptLoading = false
        }
      }
    },
    join() {
      if (this.m.location_type === 'external' && this.m.join_url) {
        window.open(this.m.join_url, '_blank', 'noopener')
        return
      }
      this.openRoom()
    },
    openRoom() {
      this.$router.push(`/meetings/${this.m.id}`)
    },
    async copyLink() {
      try {
        await navigator.clipboard.writeText(this.m.join_url)
        toast.success('Join link copied')
      } catch {
        toast.error('Copy failed — select the link and copy it manually')
      }
    },
    async downloadIcs() {
      this.busy = 'ics'
      try {
        await meetingsApi.downloadIcs(this.m)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not download the calendar file'))
      } finally {
        this.busy = ''
      }
    },
    async downloadTxt() {
      this.busy = 'txt'
      try {
        await meetingsApi.downloadTranscript(this.m)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not download the transcript'))
      } finally {
        this.busy = ''
      }
    },
    async resend() {
      this.busy = 'invite'
      try {
        const invite = await meetingsApi.invite(this.m.id)
        if (invite.emailed) toast.success(invite.message)
        this.$emit('result', { meeting: this.m, invite, mode: 'resend' })
        this.refresh()
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not send invitations'))
      } finally {
        this.busy = ''
      }
    },
    async cancelMeeting() {
      const n = (this.m.participants || []).length
      const ok = await confirmDialog({
        title: 'Cancel this meeting?',
        message: n ? `A cancellation will be sent to ${n} ${n === 1 ? 'participant' : 'participants'} so it's removed from their calendars.` : 'The meeting will be marked as cancelled.',
        confirmText: 'Cancel meeting',
        cancelText: 'Keep it',
        danger: true
      })
      if (!ok) return
      this.busy = 'cancel'
      try {
        const res = await meetingsApi.cancel(this.m.id)
        this.m = { ...this.m, ...res.meeting }
        this.$emit('changed', this.m)
        if (n) this.$emit('result', { meeting: this.m, invite: res.invite, mode: 'cancel' })
        else toast.success('Meeting cancelled')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not cancel the meeting'))
      } finally {
        this.busy = ''
      }
    },
    async remove() {
      const ok = await confirmDialog({
        title: 'Delete this meeting?',
        message: 'The meeting, its participants and any saved transcript will be permanently deleted. Participants are not notified.',
        confirmText: 'Delete',
        danger: true
      })
      if (!ok) return
      this.busy = 'delete'
      try {
        await meetingsApi.remove(this.m.id)
        toast.success('Meeting deleted')
        this.$emit('deleted', this.m.id)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not delete the meeting'))
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1900;
  background: rgba(10, 12, 24, 0.35);
  animation: fade 0.15s ease-out;
}
.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(500px, 100%);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  animation: slide 0.2s ease-out;
}
@keyframes fade { from { opacity: 0; } }
@keyframes slide { from { transform: translateX(24px); opacity: 0; } }
.drawer__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 20px 14px;
  border-bottom: 1px solid var(--border);
}
.drawer__title {
  min-width: 0;
}
.drawer__title h2 {
  font-size: 19px;
  margin: 10px 0 2px;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}
.drawer__title p {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}
.drawer__status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-subtle);
}
.drawer__body {
  flex: 1;
  overflow: auto;
  padding: 4px 20px 20px;
}
.drawer__foot {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
}
.spacer {
  flex: 1;
}
.block {
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}
.block:last-child {
  border-bottom: 0;
}
.block h3 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
  margin: 0 0 10px;
  font-weight: 650;
}
.block h4 {
  font-size: 13px;
  margin: 14px 0 6px;
}
.block__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.block__head h3 {
  margin: 0;
}
.count {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 7px;
  margin-left: 4px;
  font-size: 11px;
}
.facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.facts > div {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px;
}
.facts dt {
  color: var(--text-3);
  font-size: 13px;
}
.facts dt i {
  width: 16px;
}
.facts dd {
  margin: 0;
  font-size: 14px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.d-block {
  display: block;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 13px;
}
.link {
  color: var(--accent);
  font-size: 13px;
  word-break: break-all;
}
.pre {
  white-space: pre-wrap;
  margin: 0;
  color: var(--text-2);
}
.people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.people li {
  display: flex;
  align-items: center;
  gap: 10px;
}
.people__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 14px;
}
.people__text small {
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: 12px;
}
.tag {
  font-size: 11px;
  color: var(--text-3);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 1px 8px;
}
.ok {
  color: var(--success);
}
.summary {
  margin: 0;
  line-height: 1.55;
}
.bullets {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
}
.actions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}
.actions li {
  display: flex;
  gap: 8px;
}
.actions i {
  color: var(--accent);
  margin-top: 3px;
}
.full {
  margin: 14px 0 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  background: var(--surface-2);
}
.full summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.full pre {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 13px;
  max-height: 280px;
  overflow: auto;
  margin: 8px 0 0;
  color: var(--text-2);
}
.empty-t {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
@media (max-width: 520px) {
  .facts > div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  .drawer__foot {
    flex-wrap: wrap;
  }
}
</style>
