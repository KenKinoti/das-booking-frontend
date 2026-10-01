<template>
  <div data-testid="booking-email-settings">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="!form" class="ui-skeleton" style="height: 90px"></div>
    <fieldset v-else :disabled="!canEdit || saving" class="plain">
      <label class="toggle">
        <span><strong>Email staff about their bookings</strong><small>New, rescheduled, reassigned, cancelled and no-show bookings — with a calendar invite (.ics) that updates their calendar.</small></span>
        <span class="ui-switch"><input v-model="form.staff_emails" type="checkbox" aria-label="Email staff about their bookings" data-testid="be-staff" @change="save" /></span>
      </label>
      <label class="toggle">
        <span><strong>Daily agenda</strong><small>Each morning at {{ hourLabel(form.agenda_hour) }} ({{ tz }}), staff get a list of today's bookings.</small></span>
        <span class="ui-switch"><input v-model="form.daily_agenda" type="checkbox" aria-label="Daily agenda email" data-testid="be-agenda" :disabled="!form.staff_emails" @change="save" /></span>
      </label>
      <div v-if="form.daily_agenda" class="agenda-row">
        <label class="ui-field">
          <span class="ui-label">Agenda time</span>
          <select v-model.number="form.agenda_hour" class="ui-select" aria-label="Agenda time" @change="save">
            <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ hourLabel(h - 1) }}</option>
          </select>
        </label>
        <button type="button" class="ui-btn ui-btn--sm" :disabled="sending" @click="sendNow"><i :class="sending ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-paper-plane'"></i> Send today's agenda now</button>
      </div>
      <p class="ui-hint">Staff can turn these emails off for themselves in My profile. Customers aren't emailed from here.</p>
    </fieldset>
  </div>
</template>

<script>
import { bookingEmailsApi } from '@/services/recurringBills'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { ensureEntitlements, hasModule } from '@/composables/useEntitlements'

export default {
  name: 'BookingEmailSettingsPanel',
  props: { canEdit: { type: Boolean, default: true } },
  data() {
    return { form: null, tz: '', saving: false, sending: false, error: '' }
  },
  async created() {
    await Promise.resolve(ensureEntitlements()).catch(() => {})
    if (!hasModule('bookings')) {
      this.error = 'Staff booking emails are part of the Bookings module, which isn’t in your plan.'
      return
    }
    this.load()
  },
  methods: {
    hourLabel(h) {
      return `${String(h).padStart(2, '0')}:00`
    },
    async load() {
      this.error = ''
      try {
        const d = await bookingEmailsApi.settings()
        this.form = { ...d.settings }
        this.tz = d.timezone
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load booking email settings')
      }
    },
    async save() {
      this.saving = true
      try {
        const d = await bookingEmailsApi.saveSettings({ staff_emails: this.form.staff_emails, daily_agenda: this.form.daily_agenda, agenda_hour: this.form.agenda_hour })
        this.form = { ...d.settings }
        toast.success('Booking email settings saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
        this.load()
      } finally {
        this.saving = false
      }
    },
    async sendNow() {
      this.sending = true
      try {
        const r = await bookingEmailsApi.sendAgenda()
        toast.success(r.sent ? `Agenda sent to ${r.to.join(', ')}` : 'No staff have bookings today')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not send the agenda'))
      } finally {
        this.sending = false
      }
    }
  }
}
</script>

<style scoped>
.plain {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.toggle small {
  display: block;
  color: var(--text-3);
  font-size: 13px;
  margin-top: 2px;
}
.agenda-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.agenda-row .ui-field {
  width: 160px;
}
.ui-hint {
  margin: 10px 0 0;
}
</style>
