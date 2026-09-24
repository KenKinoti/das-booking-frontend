<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <div class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" :aria-label="isEdit ? 'Edit meeting' : 'Schedule meeting'">
      <div class="ui-modal__head">
        <div>
          <h2>{{ isEdit ? 'Edit meeting' : 'Schedule meeting' }}</h2>
          <p class="sub">{{ isEdit ? 'Changes to time, place or people send an updated invitation.' : 'Pick a time, add people and send calendar invites.' }}</p>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form class="ui-modal__body form" novalidate @submit.prevent="save">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <label class="ui-field">
          <span>Title</span>
          <input ref="titleInput" v-model.trim="form.title" class="ui-input" :class="{ 'is-invalid': touched && !form.title }" maxlength="255" placeholder="e.g. Project kickoff with Acme" />
        </label>

        <div class="row-3">
          <label class="ui-field">
            <span>Date</span>
            <input v-model="form.date" type="date" class="ui-input" :class="{ 'is-invalid': touched && !form.date }" />
          </label>
          <label class="ui-field">
            <span>Start time</span>
            <input v-model="form.start_time" type="time" step="300" class="ui-input" :class="{ 'is-invalid': touched && !form.start_time }" />
          </label>
          <label class="ui-field">
            <span>Timezone</span>
            <select v-model="form.timezone" class="ui-select">
              <option v-for="z in zones" :key="z" :value="z">{{ z.replace(/_/g, ' ') }}</option>
            </select>
          </label>
        </div>

        <div class="ui-field">
          <span>Duration</span>
          <div class="chips" role="group" aria-label="Duration">
            <button v-for="d in durations" :key="d" type="button" class="chip" :class="{ 'is-on': form.duration === d && !customDuration }" @click="setDuration(d)">{{ durLabel(d) }}</button>
            <button type="button" class="chip" :class="{ 'is-on': customDuration }" @click="customDuration = true">Custom</button>
            <input v-if="customDuration" v-model.number="form.duration" type="number" min="5" max="1440" step="5" class="ui-input dur-input" aria-label="Duration in minutes" />
            <span v-if="customDuration" class="ui-hint">minutes</span>
          </div>
          <span v-if="endPreview" class="ui-hint"><i class="fa-regular fa-clock"></i> Ends {{ endPreview }}</span>
        </div>

        <div class="ui-field">
          <span>Location</span>
          <div class="seg" role="radiogroup" aria-label="Location type">
            <button v-for="l in locationTypes" :key="l.value" type="button" role="radio" :aria-checked="form.location_type === l.value" class="seg__btn" :class="{ 'is-on': form.location_type === l.value }" @click="form.location_type = l.value">
              <i :class="l.icon"></i> {{ l.label }}
            </button>
          </div>
          <span v-if="form.location_type === 'in_app'" class="ui-hint">A private room link in this app is created and added to the invite.</span>
          <input v-if="form.location_type === 'external'" v-model.trim="form.join_url" class="ui-input" :class="{ 'is-invalid': touched && !validUrl }" type="url" placeholder="https://zoom.us/j/… or Teams / Google Meet link" />
          <input v-if="form.location_type === 'physical'" v-model.trim="form.location" class="ui-input" :class="{ 'is-invalid': touched && !form.location }" placeholder="Address or room" />
        </div>

        <label class="ui-field">
          <span>Agenda <small class="opt">(optional)</small></span>
          <textarea v-model="form.description" class="ui-textarea" rows="3" placeholder="What will you cover?"></textarea>
        </label>

        <div class="ui-field">
          <span>Participants</span>
          <div class="picker" @focusout="onPickerBlur">
            <div class="ui-input-group">
              <i class="fa-solid fa-user-plus"></i>
              <input
                v-model="query"
                class="ui-input"
                placeholder="Search customers & team, or type an email and press Enter"
                autocomplete="off"
                @focus="openPicker"
                @keydown.enter.prevent="addFromQuery"
                @keydown.down.prevent="move(1)"
                @keydown.up.prevent="move(-1)"
                @keydown.esc="pickerOpen = false"
                @paste="onPaste"
              />
            </div>
            <ul v-if="pickerOpen && (suggestions.length || queryIsEmail || loadingPeople)" class="suggest" role="listbox">
              <li v-if="loadingPeople" class="suggest__muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading contacts…</li>
              <li v-for="(s, i) in suggestions" :key="s.key" role="option" :aria-selected="i === active" :class="{ 'is-active': i === active }" @mousedown.prevent="add(s)">
                <span class="avatar sm">{{ initials(s.name || s.email) }}</span>
                <span class="suggest__text"><strong>{{ s.name || s.email }}</strong><small>{{ s.email || 'No email on file' }}</small></span>
                <span class="ui-badge" :class="s.kind === 'user' ? 'ui-badge--info' : 'ui-badge--draft'">{{ s.kind === 'user' ? 'Team' : 'Customer' }}</span>
              </li>
              <li v-if="queryIsEmail && !suggestions.some((s) => s.email === query.trim().toLowerCase())" :class="{ 'is-active': active === suggestions.length }" @mousedown.prevent="addFromQuery">
                <span class="avatar sm"><i class="fa-regular fa-envelope"></i></span>
                <span class="suggest__text"><strong>Invite {{ query.trim() }}</strong><small>Press Enter to add</small></span>
              </li>
            </ul>
          </div>
          <span v-if="peopleError" class="ui-hint warn">{{ peopleError }} You can still type email addresses.</span>
          <div v-if="form.participants.length" class="people">
            <span v-for="p in form.participants" :key="p.email" class="person">
              <span class="avatar sm">{{ initials(p.name || p.email) }}</span>
              <span class="person__text"><strong>{{ p.name || p.email }}</strong><small v-if="p.name">{{ p.email }}</small></span>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Remove ${p.email}`" @click="removePerson(p)"><i class="fa-solid fa-xmark"></i></button>
            </span>
          </div>
          <span v-else class="ui-hint">No participants yet — you can still schedule it for yourself.</span>
        </div>

        <div class="row-3">
          <label class="ui-field">
            <span>Reminder</span>
            <select v-model.number="form.reminder_minutes" class="ui-select">
              <option :value="0">No reminder</option>
              <option :value="5">5 minutes before</option>
              <option :value="10">10 minutes before</option>
              <option :value="15">15 minutes before</option>
              <option :value="30">30 minutes before</option>
              <option :value="60">1 hour before</option>
              <option :value="1440">1 day before</option>
            </select>
          </label>
          <label class="ui-field">
            <span>Repeat</span>
            <select v-model="form.recurrence" class="ui-select">
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label v-if="form.recurrence !== 'none'" class="ui-field">
            <span>Occurrences</span>
            <input v-model.number="form.recurrence_count" type="number" min="2" max="365" class="ui-input" />
          </label>
        </div>

        <div class="invite-box">
          <label class="ui-switch">
            <input v-model="form.send_invites" type="checkbox" />
            <span>{{ isEdit ? 'Send updated invitation to participants' : 'Send calendar invites to participants' }}</span>
          </label>
          <p v-if="form.send_invites && smtpConfigured" class="ui-hint"><i class="fa-solid fa-envelope-circle-check"></i> Invites are emailed with an .ics calendar file so people can Accept or Decline.</p>
          <p v-else-if="form.send_invites" class="ui-hint warn"><i class="fa-solid fa-triangle-exclamation"></i> Email isn't set up on the server, so nothing is emailed automatically. After saving you'll get a .ics file to download and a pre-filled email to send yourself.</p>
        </div>
      </form>

      <div class="ui-modal__foot">
        <button class="ui-btn" type="button" @click="close">Cancel</button>
        <button class="ui-btn ui-btn--primary" type="button" :disabled="saving" @click="save">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : isEdit ? 'fa-solid fa-check' : 'fa-regular fa-calendar-plus'"></i>
          {{ saving ? 'Saving…' : isEdit ? 'Save changes' : form.send_invites && form.participants.length ? 'Schedule & invite' : 'Schedule' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import api, { listFrom, apiErrorMessage } from '@/services/api'
import { meetingsApi, browserTimezone, timezoneList, partsInZone, initials } from '@/services/meetings'

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

let peopleCache = null

function nextSlot() {
  const d = new Date(Date.now() + 60 * 60000)
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0)
  return d
}

export default {
  name: 'ScheduleMeetingModal',
  props: {
    meeting: { type: Object, default: null },
    smtpConfigured: { type: Boolean, default: false },
    presetDate: { type: String, default: '' }
  },
  emits: ['close', 'saved'],
  data() {
    const m = this.meeting
    const tz = m?.timezone || browserTimezone
    const start = m ? partsInZone(m.start_at, tz) : partsInZone(nextSlot(), tz)
    const duration = m ? Math.max(5, Math.round((new Date(m.end_at) - new Date(m.start_at)) / 60000)) : 30
    return {
      form: {
        title: m?.title || '',
        date: this.presetDate || start.date,
        start_time: start.time,
        duration,
        timezone: tz,
        description: m?.description || '',
        location_type: m?.location_type || 'in_app',
        join_url: m?.location_type === 'external' ? m.join_url : '',
        location: m?.location || '',
        participants: (m?.participants || []).map((p) => ({ name: p.name, email: p.email, customer_id: p.customer_id || '', user_id: p.user_id || '' })),
        reminder_minutes: m ? m.reminder_minutes : 15,
        recurrence: m?.recurrence || 'none',
        recurrence_count: m?.recurrence_count || 4,
        send_invites: true
      },
      durations: [15, 30, 45, 60, 90, 120],
      customDuration: false,
      zones: timezoneList(),
      locationTypes: [
        { value: 'in_app', label: 'In-app room', icon: 'fa-solid fa-video' },
        { value: 'external', label: 'External link', icon: 'fa-solid fa-link' },
        { value: 'physical', label: 'In person', icon: 'fa-solid fa-location-dot' }
      ],
      query: '',
      pickerOpen: false,
      active: 0,
      people: [],
      loadingPeople: false,
      peopleError: '',
      touched: false,
      saving: false,
      error: ''
    }
  },
  computed: {
    isEdit() {
      return !!this.meeting
    },
    validUrl() {
      try {
        const u = new URL(this.form.join_url)
        return u.protocol === 'https:' || u.protocol === 'http:'
      } catch {
        return false
      }
    },
    queryIsEmail() {
      return EMAIL_RE.test(this.query.trim())
    },
    suggestions() {
      const q = this.query.trim().toLowerCase()
      const taken = new Set(this.form.participants.map((p) => p.email))
      return this.people
        .filter((p) => p.email && !taken.has(p.email))
        .filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.includes(q))
        .slice(0, 8)
    },
    endPreview() {
      if (!this.form.start_time || !this.form.duration) return ''
      const [h, m] = this.form.start_time.split(':').map(Number)
      const total = h * 60 + m + Number(this.form.duration)
      const eh = Math.floor(total / 60) % 24
      const em = total % 60
      const d = new Date(2000, 0, 1, eh, em)
      const t = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d)
      return total >= 24 * 60 ? `${t} the next day` : t
    }
  },
  mounted() {
    if (!this.durations.includes(this.form.duration)) this.customDuration = true
    this.$nextTick(() => this.$refs.titleInput?.focus())
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    initials,
    onKey(e) {
      if (e.key === 'Escape' && !this.pickerOpen) this.close()
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    durLabel(d) {
      return d < 60 ? `${d} min` : d % 60 ? `${Math.floor(d / 60)}h ${d % 60}m` : `${d / 60} h`
    },
    setDuration(d) {
      this.customDuration = false
      this.form.duration = d
    },
    async loadPeople() {
      if (peopleCache) {
        this.people = peopleCache
        return
      }
      this.loadingPeople = true
      const [cust, users] = await Promise.allSettled([api.get('/customers'), api.get('/users', { params: { limit: 100 } })])
      const out = []
      if (cust.status === 'fulfilled') {
        for (const c of listFrom(cust.value, 'customers')) {
          const email = String(c.email || '').trim().toLowerCase()
          out.push({ key: `c-${c.id}`, kind: 'customer', name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || '', email, customer_id: c.id })
        }
      }
      if (users.status === 'fulfilled') {
        for (const u of listFrom(users.value, 'users')) {
          const email = String(u.email || '').trim().toLowerCase()
          out.push({ key: `u-${u.id}`, kind: 'user', name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), email, user_id: u.id })
        }
      }
      if (cust.status === 'rejected' && users.status === 'rejected') this.peopleError = 'Could not load customers or team members.'
      out.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
      this.people = out
      if (!this.peopleError) peopleCache = out
      this.loadingPeople = false
    },
    openPicker() {
      this.pickerOpen = true
      this.active = 0
      if (!this.people.length && !this.loadingPeople) this.loadPeople()
    },
    onPickerBlur(e) {
      if (!e.currentTarget.contains(e.relatedTarget)) this.pickerOpen = false
    },
    move(delta) {
      this.pickerOpen = true
      const max = this.suggestions.length + (this.queryIsEmail ? 1 : 0)
      if (!max) return
      this.active = (this.active + delta + max) % max
    },
    add(s) {
      if (!s.email || this.form.participants.some((p) => p.email === s.email)) return
      this.form.participants.push({ name: s.name || '', email: s.email, customer_id: s.customer_id || '', user_id: s.user_id || '' })
      this.query = ''
      this.active = 0
    },
    addFromQuery() {
      const q = this.query.trim()
      if (this.active < this.suggestions.length && this.suggestions[this.active] && !this.queryIsEmail) {
        this.add(this.suggestions[this.active])
        return
      }
      if (this.queryIsEmail) {
        const email = q.toLowerCase()
        const known = this.people.find((p) => p.email === email)
        this.add(known || { email, name: '' })
      } else if (this.suggestions.length === 1) {
        this.add(this.suggestions[0])
      } else if (q) {
        this.error = `"${q}" isn't a valid email address.`
      }
    },
    onPaste(e) {
      const text = e.clipboardData?.getData('text') || ''
      const emails = text.split(/[\s,;]+/).map((s) => s.replace(/^<|>$/g, '').toLowerCase()).filter((s) => EMAIL_RE.test(s))
      if (emails.length > 1) {
        e.preventDefault()
        emails.forEach((email) => this.add(this.people.find((p) => p.email === email) || { email, name: '' }))
      }
    },
    removePerson(p) {
      this.form.participants = this.form.participants.filter((x) => x.email !== p.email)
    },
    validate() {
      const f = this.form
      if (!f.title) return 'Add a title for the meeting.'
      if (!f.date || !f.start_time) return 'Pick a date and start time.'
      if (!f.duration || f.duration < 5 || f.duration > 1440) return 'Duration must be between 5 minutes and 24 hours.'
      if (f.location_type === 'external' && !this.validUrl) return 'Enter a valid meeting link (starting with https://).'
      if (f.location_type === 'physical' && !f.location) return 'Enter the address or room.'
      if (f.recurrence !== 'none' && (!f.recurrence_count || f.recurrence_count < 2)) return 'Repeating meetings need at least 2 occurrences.'
      return ''
    },
    async save() {
      this.touched = true
      this.error = this.validate()
      if (this.error) return
      const f = this.form
      const payload = {
        title: f.title,
        description: f.description,
        date: f.date,
        start_time: f.start_time,
        duration_minutes: Number(f.duration),
        timezone: f.timezone,
        location_type: f.location_type,
        join_url: f.location_type === 'external' ? f.join_url : '',
        location: f.location_type === 'physical' ? f.location : '',
        reminder_minutes: f.reminder_minutes,
        recurrence: f.recurrence,
        recurrence_count: f.recurrence === 'none' ? 0 : Number(f.recurrence_count),
        participants: f.participants,
        send_invites: f.send_invites
      }
      this.saving = true
      try {
        const res = this.isEdit ? await meetingsApi.update(this.meeting.id, payload) : await meetingsApi.create(payload)
        this.$emit('saved', { meeting: res.meeting, invite: res.invite || null, changed: res.changed, mode: this.isEdit ? 'edit' : 'create', sendInvites: f.send_invites })
      } catch (err) {
        this.error = apiErrorMessage(err, 'Could not save the meeting.')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.opt {
  color: var(--text-3);
  font-weight: 400;
}
.row-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.is-invalid {
  border-color: var(--danger) !important;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.chip {
  font: inherit;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
}
.chip:hover {
  background: var(--surface-hover);
}
.chip.is-on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.dur-input {
  width: 90px;
}
.seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  align-self: flex-start;
}
.seg__btn {
  font: inherit;
  font-size: 13px;
  padding: 6px 12px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.seg__btn.is-on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-xs);
  font-weight: 600;
}
.picker {
  position: relative;
}
.suggest {
  position: absolute;
  z-index: 5;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  max-height: 280px;
  overflow: auto;
}
.suggest li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.suggest li.is-active,
.suggest li:hover {
  background: var(--surface-hover);
}
.suggest__muted {
  color: var(--text-3);
  font-size: 13px;
  cursor: default !important;
}
.suggest__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.suggest__text small,
.person__text small {
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.people {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.person {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  max-width: 100%;
}
.person__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 13px;
  line-height: 1.2;
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
.avatar.sm {
  width: 26px;
  height: 26px;
  font-size: 11px;
}
.invite-box {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}
.invite-box .ui-hint {
  margin: 8px 0 0;
}
.warn {
  color: var(--warning);
}
@media (max-width: 640px) {
  .row-3 {
    grid-template-columns: 1fr 1fr;
  }
  .row-3 > :last-child:nth-child(3) {
    grid-column: 1 / -1;
  }
}
</style>
