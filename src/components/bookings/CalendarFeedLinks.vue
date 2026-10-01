<template>
  <div class="feed" :data-testid="`calendar-feed-${scope}`">
    <template v-if="feed && feed.enabled">
      <div class="feed__buttons">
        <!-- webcal:// opens the device's calendar app with "Subscribe?" -->
        <a class="ui-btn" :href="feed.webcal_url" data-testid="feed-apple"><i class="fa-brands fa-apple"></i> Add to Apple Calendar</a>
        <a class="ui-btn" :href="feed.google_url" target="_blank" rel="noopener" data-testid="feed-google"><i class="fa-brands fa-google"></i> Add to Google Calendar</a>
        <a class="ui-btn" :href="feed.outlook_url" target="_blank" rel="noopener" data-testid="feed-outlook"><i class="fa-brands fa-microsoft"></i> Add to Outlook</a>
        <button type="button" class="ui-btn" :disabled="busy" data-testid="feed-copy" @click="copy"><i class="fa-regular fa-copy"></i> Copy link</button>
      </div>
      <p class="ui-hint feed__hint">
        Personal Outlook.com account? <a :href="feed.outlook_live_url" target="_blank" rel="noopener" data-testid="feed-outlook-live">Add it there</a>.
        Any other calendar app: copy the link and choose “Subscribe” / “Add calendar from URL”.
      </p>
      <div class="feed__foot">
        <span class="feed__meta">
          <i class="fa-solid fa-lock"></i>
          <span>
            Anyone with this link can see these {{ words }} — keep it to yourself.
            <template v-if="feed.last_used_at">Last read by a calendar app {{ formatDateTime(feed.last_used_at) }}.</template>
            <template v-else>No calendar app has read it yet.</template>
          </span>
        </span>
        <span class="feed__foot-btns">
          <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy" data-testid="feed-regenerate" @click="regenerate">
            <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate'"></i> Regenerate link
          </button>
          <button v-if="canTurnOff" type="button" class="ui-btn ui-btn--sm ui-btn--ghost off" :disabled="busy" data-testid="feed-off" @click="turnOff">
            <i class="fa-solid fa-link-slash"></i> Turn off
          </button>
        </span>
      </div>
    </template>
    <template v-else>
      <p class="ui-hint feed__hint">{{ offText }}</p>
      <button type="button" class="ui-btn" :disabled="busy" data-testid="feed-on" @click="$emit('regenerate')">
        <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-link'"></i> {{ onLabel }}
      </button>
    </template>
  </div>
</template>

<script>
/**
 * Subscribe buttons for a calendar feed (my bookings, or the organisation's).
 *   <CalendarFeedLinks :feed="feed" scope="user" :busy="busy" @regenerate="…" @turn-off="…" />
 */
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { termLower } from '@/composables/useAccess'
import { formatDateTime } from '@/utils/format'
import { copyText } from '@/utils/calendarLinks'

export default {
  name: 'CalendarFeedLinks',
  props: {
    feed: { type: Object, default: null },
    scope: { type: String, default: 'user' },
    busy: { type: Boolean, default: false },
    canTurnOff: { type: Boolean, default: false }
  },
  emits: ['regenerate', 'turn-off'],
  computed: {
    words() {
      return termLower('bookings')
    },
    onLabel() {
      return this.scope === 'org' ? 'Create the organisation calendar link' : 'Create my calendar link'
    },
    offText() {
      return this.scope === 'org'
        ? `No organisation calendar yet. Create a link to see every staff member's ${this.words} in one calendar.`
        : 'Your calendar link is turned off.'
    }
  },
  methods: {
    formatDateTime,
    async copy() {
      if (await copyText(this.feed.url)) toast.success('Calendar link copied')
      else toast.error('Could not copy the link')
    },
    async regenerate() {
      const ok = await confirmDialog({
        title: 'Regenerate the calendar link?',
        message: 'The old link stops working straight away. Calendars subscribed with it stop updating until the new link is added to them.',
        confirmText: 'Regenerate link',
        danger: true
      })
      if (ok) this.$emit('regenerate')
    },
    async turnOff() {
      const ok = await confirmDialog({
        title: 'Turn the calendar link off?',
        message: 'The link stops working straight away and subscribed calendars stop updating.',
        confirmText: 'Turn off',
        danger: true
      })
      if (ok) this.$emit('turn-off')
    }
  }
}
</script>

<style scoped>
.feed__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.feed__buttons .ui-btn {
  text-decoration: none;
}
.feed__hint {
  margin: 10px 0 0;
}
.feed__hint a {
  color: var(--accent);
}
.feed__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.feed__meta {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex: 1 1 260px;
  min-width: 0;
  color: var(--text-3);
  font-size: 12.5px;
  line-height: 1.45;
}
.feed__meta i {
  font-size: 11px;
}
.feed__foot-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.off {
  color: var(--danger);
}
@media (max-width: 480px) {
  .feed__buttons .ui-btn {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
