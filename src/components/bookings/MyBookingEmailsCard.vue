<template>
  <section v-if="allowed" class="ui-card" data-testid="my-booking-emails">
    <div class="ui-card__head">
      <h2><i class="fa-regular fa-calendar-check"></i> Booking emails</h2>
    </div>
    <div class="ui-card__body">
      <div v-if="loading" class="ui-skeleton" style="height: 44px"></div>
      <template v-else>
        <label class="toggle">
          <span>
            <strong>Email me about my bookings</strong>
            <small>When a booking is assigned to you, moved, reassigned or cancelled — with a calendar invite that keeps your calendar up to date.</small>
          </span>
          <span class="ui-switch"><input v-model="on" type="checkbox" aria-label="Email me about my bookings" data-testid="my-booking-emails-toggle" :disabled="saving" @change="save" /></span>
        </label>
        <p v-if="!orgOn" class="ui-hint"><i class="fa-solid fa-circle-info"></i> Booking emails are currently switched off for the whole organisation by an admin.</p>
      </template>
    </div>
  </section>
</template>

<script>
import { bookingEmailsApi } from '@/services/recurringBills'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { ensureEntitlements, hasModule } from '@/composables/useEntitlements'

export default {
  name: 'MyBookingEmailsCard',
  data() {
    return { on: true, orgOn: true, loading: true, saving: false, allowed: false }
  },
  async created() {
    await Promise.resolve(ensureEntitlements()).catch(() => {})
    this.allowed = hasModule('bookings')
    if (!this.allowed) return
    try {
      const d = await bookingEmailsApi.me()
      this.on = d.booking_emails
      this.orgOn = d.org_staff_emails
    } catch {
      /* default on */
    } finally {
      this.loading = false
    }
  },
  methods: {
    async save() {
      this.saving = true
      try {
        const d = await bookingEmailsApi.saveMe({ booking_emails: this.on })
        this.on = d.booking_emails
        toast.success(this.on ? 'You’ll get emails about your bookings' : 'Booking emails turned off')
      } catch (e) {
        this.on = !this.on
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.ui-card__head h2 i {
  color: var(--accent);
  margin-right: 6px;
}
.toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}
.toggle small {
  display: block;
  color: var(--text-3);
  font-size: 13px;
  margin-top: 2px;
}
.ui-hint {
  margin: 10px 0 0;
}
</style>
