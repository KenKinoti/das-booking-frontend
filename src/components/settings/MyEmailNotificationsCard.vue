<template>
  <section class="ui-card" data-testid="my-email-notifications">
    <div class="ui-card__head">
      <div>
        <h2><i class="fa-regular fa-bell"></i> Email notifications</h2>
        <p class="sub">Which emails {{ orgName || 'your organisation' }} sends you. Customer emails you send are not affected.</p>
      </div>
    </div>
    <div class="ui-card__body">
      <div v-if="loading" class="sk"><div v-for="n in 2" :key="n" class="ui-skeleton" style="height: 44px"></div></div>
      <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      <p v-else-if="!d.member" class="ui-hint">You aren’t a member of this organisation, so it doesn’t email you.</p>
      <template v-else>
        <div v-if="d.all_locked" class="ui-alert ui-alert--warning" data-testid="my-emails-all-locked"><i class="fa-solid fa-lock"></i><span>All your emails are turned off by your administrator.</span></div>
        <label class="en-row master">
          <span>
            <strong>Pause all my emails</strong>
            <small>Stop every email below until you switch this off again.</small>
          </span>
          <span class="ui-switch"><input :checked="d.all_off" type="checkbox" aria-label="Pause all my emails" data-testid="my-emails-pause" :disabled="!!saving" @change="pause($event.target.checked)" /></span>
        </label>
        <label v-for="c in cats" :key="c.key" class="en-row" :class="{ 'is-locked': c.locked }" :data-testid="c.key === 'bookings' ? 'my-booking-emails' : `my-email-${c.key}`">
          <span>
            <strong>{{ c.label }}</strong>
            <small>{{ c.description }}</small>
            <em v-if="c.locked" class="lock" :data-testid="`my-email-lock-${c.key}`"><i class="fa-solid fa-lock"></i> {{ c.reason_text || 'Turned off by your administrator' }}</em>
            <em v-else-if="c.reason === 'admin_on'" class="note">{{ c.reason_text }}</em>
          </span>
          <span class="ui-switch">
            <input
              :checked="!c.locked && c.self_on && !d.all_off"
              type="checkbox"
              :aria-label="c.label"
              :disabled="c.locked || d.all_off || saving === c.key"
              :data-testid="c.key === 'bookings' ? 'my-booking-emails-toggle' : `my-email-toggle-${c.key}`"
              @change="toggle(c, $event.target.checked)"
            />
          </span>
        </label>
        <p v-if="!cats.length" class="ui-hint">No emails are sent to your role.</p>
        <p v-if="bookingsOff" class="ui-hint"><i class="fa-solid fa-circle-info"></i> {{ termCap }} emails are currently switched off for the whole organisation by an admin.</p>
      </template>
    </div>
  </section>
</template>

<script>
import { myEmailPrefsApi, categoryShown, localCategory } from '@/services/emailPrefs'
import { bookingEmailsApi } from '@/services/recurringBills'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { ensureEntitlements, hasModule } from '@/composables/useEntitlements'
import { term } from '@/composables/useAccess'

export default {
  name: 'MyEmailNotificationsCard',
  props: { orgName: { type: String, default: '' } },
  data() {
    return { d: null, loading: true, error: '', saving: '', orgBookings: true }
  },
  computed: {
    cats() {
      // Spoken to the person: "assigned to you", "your bookings".
      return (this.d?.categories || [])
        .filter(categoryShown)
        .map(localCategory)
        .map((c) => ({ ...c, description: c.description.replace(/\bthem\b/g, 'you').replace(/\btheir\b/g, 'your') }))
    },
    termCap() {
      return term('booking')
    },
    bookingsOff() {
      return !this.orgBookings && this.cats.some((c) => c.key === 'bookings')
    }
  },
  async created() {
    await Promise.resolve(ensureEntitlements()).catch(() => {})
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.d = await myEmailPrefsApi.get()
        if (hasModule('bookings') && this.d.categories?.some((c) => c.key === 'bookings')) {
          bookingEmailsApi
            .me()
            .then((b) => (this.orgBookings = b.org_staff_emails !== false))
            .catch(() => {})
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load your email notifications')
      } finally {
        this.loading = false
      }
    },
    async save(body, key, msg) {
      this.saving = key
      try {
        this.d = await myEmailPrefsApi.save(body)
        toast.success(msg)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
        await this.load()
      } finally {
        this.saving = ''
      }
    },
    toggle(c, on) {
      const msg = c.key === 'bookings' ? (on ? 'You’ll get emails about your bookings' : 'Booking emails turned off') : `${c.label} turned ${on ? 'on' : 'off'}`
      this.save({ categories: { [c.key]: on } }, c.key, msg)
    },
    pause(off) {
      this.save({ all_off: off }, 'all', off ? 'All your emails are paused' : 'Your emails are back on')
    }
  }
}
</script>

<style scoped>
.ui-card__head h2 i {
  color: var(--accent);
  margin-right: 6px;
}

.sub {
  margin: 2px 0 0;
  color: var(--text-3);
  font-size: 13px;
}

.sk {
  display: grid;
  gap: 10px;
}

.en-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.en-row:last-of-type {
  border-bottom: 0;
}

.en-row.master {
  padding-top: 4px;
}

.en-row.is-locked {
  cursor: default;
}

.en-row strong {
  display: block;
  font-size: 14px;
}

.en-row small {
  display: block;
  color: var(--text-3);
  font-size: 13px;
  margin-top: 2px;
}

.en-row em {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-style: normal;
  font-size: 12.5px;
  font-weight: 550;
}

.lock {
  color: var(--warning);
}

.note {
  color: var(--success);
}

.ui-alert {
  margin-bottom: 8px;
}

.ui-hint {
  margin: 10px 0 0;
}
</style>
