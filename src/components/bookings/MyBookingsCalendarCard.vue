<template>
  <section v-if="allowed" id="bookings-calendar" class="ui-card" data-testid="my-bookings-calendar">
    <div class="ui-card__head">
      <h2><i class="fa-regular fa-calendar-plus"></i> My {{ words }} calendar</h2>
    </div>
    <div class="ui-card__body">
      <p class="lead">
        Subscribe once and the {{ words }} assigned to you show up in your own calendar and stay up to date — new, moved and cancelled ones included.
      </p>
      <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      <div v-else-if="loading" class="ui-skeleton" style="height: 84px"></div>
      <template v-else>
        <CalendarFeedLinks :feed="feed" scope="user" :busy="busy" @regenerate="regenerate" />
        <p class="ui-hint note">
          <i class="fa-solid fa-circle-info"></i>
          Calendar apps decide how often they check a subscribed calendar. Google Calendar refreshes only every several hours (sometimes longer), so a change is
          not instant there — that's why the emails about individual {{ words }} still arrive.
        </p>
      </template>
    </div>
  </section>
</template>

<script>
import { bookingCalendarApi } from '@/services/recurringBills'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { termLower } from '@/composables/useAccess'
import { ensureEntitlements, hasModule } from '@/composables/useEntitlements'
import CalendarFeedLinks from './CalendarFeedLinks.vue'

export default {
  name: 'MyBookingsCalendarCard',
  components: { CalendarFeedLinks },
  data() {
    return { allowed: false, loading: true, error: '', feed: null, busy: false }
  },
  computed: {
    words() {
      return termLower('bookings')
    }
  },
  async created() {
    await Promise.resolve(ensureEntitlements()).catch(() => {})
    this.allowed = hasModule('bookings')
    if (!this.allowed) return
    await this.load()
    // Arriving from the "Subscribe" button on the bookings page
    if (this.$route?.hash === '#bookings-calendar') this.$nextTick(() => this.$el?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }))
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.feed = (await bookingCalendarApi.feeds()).user
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load your calendar link')
      } finally {
        this.loading = false
      }
    },
    async regenerate() {
      this.busy = true
      const had = this.feed?.enabled
      try {
        this.feed = await bookingCalendarApi.regenerate('user')
        toast.success(had ? 'New calendar link created — the old one no longer works' : 'Calendar link created')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create a new link'))
      } finally {
        this.busy = false
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
.lead {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.5;
}
.note {
  margin: 12px 0 0;
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.ui-alert a {
  color: inherit;
}
</style>
