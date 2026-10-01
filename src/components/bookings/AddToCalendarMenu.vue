<template>
  <div ref="root" class="ui-overflow cal-menu" data-testid="add-to-calendar">
    <button
      type="button"
      class="ui-btn ui-btn--sm"
      aria-haspopup="menu"
      :aria-expanded="open"
      :title="buttonLabel"
      data-testid="add-to-calendar-btn"
      @click="toggle"
    >
      <i :class="cancelled ? 'fa-regular fa-calendar-xmark' : 'fa-regular fa-calendar-plus'"></i> {{ buttonLabel }}
      <i class="fa-solid fa-chevron-down caret" aria-hidden="true"></i>
    </button>
    <transition name="ui-ov">
      <div v-if="open" class="ui-overflow__menu" role="menu" :aria-label="buttonLabel" data-testid="add-to-calendar-menu">
        <div v-if="loading" class="cal-menu__state"><i class="fa-solid fa-circle-notch fa-spin"></i> Getting the links…</div>
        <div v-else-if="error" class="cal-menu__state">
          {{ error }} <button type="button" class="linkish" @click="load">Try again</button>
        </div>
        <template v-else-if="links">
          <template v-if="!cancelled">
            <a class="ui-overflow__item" role="menuitem" :href="links.google_url" target="_blank" rel="noopener" data-testid="cal-google" @click="close">
              <i class="fa-brands fa-google"></i>Google Calendar
            </a>
            <a class="ui-overflow__item" role="menuitem" :href="links.outlook_url" target="_blank" rel="noopener" data-testid="cal-outlook" @click="close">
              <i class="fa-brands fa-microsoft"></i>Outlook (Microsoft 365)
            </a>
            <a class="ui-overflow__item" role="menuitem" :href="links.outlook_live_url" target="_blank" rel="noopener" data-testid="cal-outlook-live" @click="close">
              <i class="fa-regular fa-envelope"></i>Outlook.com
            </a>
          </template>
          <!-- A plain link: phones hand the calendar file to their calendar app. -->
          <a v-if="links.ics_url" class="ui-overflow__item" role="menuitem" :href="links.ics_url" target="_blank" rel="noopener" data-testid="cal-ics" @click="onIcs">
            <i class="fa-brands fa-apple"></i>{{ cancelled ? 'Open the cancellation (.ics)' : 'Apple Calendar / other (.ics)' }}
          </a>
          <button v-else type="button" class="ui-overflow__item" role="menuitem" data-testid="cal-ics" @click="download">
            <i class="fa-solid fa-download"></i>Download .ics
          </button>
          <div class="ui-overflow__sep" role="separator"></div>
          <button v-if="links.ics_url" type="button" class="ui-overflow__item" role="menuitem" data-testid="cal-copy" @click="copy">
            <i class="fa-regular fa-copy"></i>Copy link
          </button>
          <p class="cal-menu__hint">
            <template v-if="cancelled">Opening the file removes this {{ word }} from a calendar it was added to.</template>
            <template v-else>Added it before? Adding the file again updates the same entry.</template>
          </p>
        </template>
      </div>
    </transition>
  </div>
</template>

<script>
/**
 * "Add to calendar" for one booking: Google Calendar, Outlook, the .ics for
 * Apple Calendar and any other app, and Copy link.
 *   <AddToCalendarMenu ref="cal" :booking="booking" />   // this.$refs.cal.show() opens it
 */
import { bookingCalendarApi } from '@/services/recurringBills'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { termLower } from '@/composables/useAccess'
import { downloadBlob } from '@/utils/format'
import { canNavigateToIcs, fetchIcsFile, shareOrSaveIcs, copyText } from '@/utils/calendarLinks'

export default {
  name: 'AddToCalendarMenu',
  props: {
    booking: { type: Object, required: true }
  },
  data() {
    return { open: false, links: null, loading: false, error: '', file: null, seq: 0 }
  },
  computed: {
    word() {
      return termLower('booking')
    },
    cancelled() {
      return this.links ? !!this.links.cancelled : this.booking.status === 'cancelled'
    },
    buttonLabel() {
      return this.cancelled ? 'Remove from calendar' : 'Add to calendar'
    },
    // Reload the links whenever what the calendar entry shows changes
    stamp() {
      const b = this.booking
      return [b.id, b.status, b.start_time, b.end_time, b.updated_at].join('|')
    }
  },
  watch: {
    stamp: { immediate: true, handler: 'load' },
    open(v) {
      if (v) {
        document.addEventListener('pointerdown', this.onDoc, true)
        document.addEventListener('keydown', this.onKey, true)
      } else this.unbind()
    }
  },
  beforeUnmount() {
    this.unbind()
  },
  methods: {
    unbind() {
      document.removeEventListener('pointerdown', this.onDoc, true)
      document.removeEventListener('keydown', this.onKey, true)
    },
    onDoc(e) {
      if (!this.$refs.root?.contains(e.target)) this.open = false
    },
    onKey(e) {
      if (e.key !== 'Escape') return
      // Close the menu only, not the drawer behind it
      e.stopPropagation()
      this.open = false
    },
    toggle() {
      this.open = !this.open
      if (this.open && !this.links && !this.loading) this.load()
    },
    show() {
      this.open = true
    },
    close() {
      this.open = false
    },
    async load() {
      if (!this.booking?.id) return
      const seq = ++this.seq
      this.loading = !this.links
      this.error = ''
      this.file = null
      try {
        const links = await bookingCalendarApi.links(this.booking.id)
        if (seq !== this.seq) return
        this.links = links
        // Inside an installed app on the API's own origin a link cannot open
        // the file — fetch it now so a tap can share it without waiting.
        if (links.ics_url && !canNavigateToIcs(links.ics_url)) {
          fetchIcsFile(links.ics_url, links.filename)
            .then((f) => {
              if (seq === this.seq) this.file = f
            })
            .catch(() => {})
        }
      } catch (e) {
        if (seq === this.seq) this.error = apiErrorMessage(e, 'Could not get the calendar links.')
      } finally {
        if (seq === this.seq) this.loading = false
      }
    },
    async onIcs(e) {
      this.open = false
      if (canNavigateToIcs(this.links.ics_url)) return // the link does the work
      e.preventDefault()
      try {
        const file = this.file || (await fetchIcsFile(this.links.ics_url, this.links.filename))
        const how = await shareOrSaveIcs(file, this.cancelled ? 'Cancelled booking' : 'Booking')
        if (how === 'downloaded') toast.success('Calendar file saved — open it to add the event')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not open the calendar file'))
      }
    },
    async download() {
      this.open = false
      try {
        const blob = await bookingCalendarApi.file(this.booking.id)
        downloadBlob(new Blob([blob], { type: 'text/calendar;charset=utf-8' }), this.links?.filename || 'booking.ics')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not download the calendar file'))
      }
    },
    async copy() {
      this.open = false
      if (await copyText(this.links.ics_url)) toast.success('Calendar link copied')
      else toast.error('Could not copy the link')
    }
  }
}
</script>

<style scoped>
.caret {
  font-size: 10px;
  color: var(--text-3);
  margin-left: 2px;
}
.cal-menu__state {
  padding: 12px;
  font-size: 13.5px;
  color: var(--text-2);
}
.cal-menu__hint {
  margin: 4px 12px 8px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-3);
}
.linkish {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
}
/* The global menu hangs from the right edge; here the button sits on the left. */
@media (min-width: 641px) {
  .cal-menu .ui-overflow__menu {
    left: 0;
    right: auto;
    min-width: 270px;
  }
}
.ui-overflow__item i.fa-brands {
  font-size: 15px;
}
</style>
