<template>
  <div class="ui-page ui-page--wide composer-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow"><router-link to="/super-admin/announcements">Announcements</router-link></div>
        <h1>{{ isNew ? 'New announcement' : 'Edit announcement' }}</h1>
        <p>Write it once — it appears in the app straight away and is emailed to whoever hasn't read it in time.</p>
      </div>
      <div class="ui-actions">
        <span v-if="statusInfo" class="ui-badge" :class="`ui-badge--${statusInfo.badge}`">{{ statusInfo.label }}</span>
        <router-link :to="isNew ? '/super-admin/announcements' : `/super-admin/announcements/${id}`" class="ui-btn ui-btn--ghost">Close</router-link>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="init">Try again</a></span></div>

    <div v-else-if="loading" class="composer">
      <div class="ui-card"><div class="ui-card__body sk-col"><span v-for="n in 6" :key="n" class="ui-skeleton"></span></div></div>
      <div class="ui-card hide-sm"><div class="ui-card__body sk-col"><span v-for="n in 4" :key="n" class="ui-skeleton"></span></div></div>
    </div>

    <div v-else class="composer">
      <div class="composer__form">
        <!-- Message -->
        <section class="ui-card">
          <div class="ui-card__head"><h2>Message</h2><span v-if="form.occasion_name" class="occ-chip"><i class="fa-regular fa-calendar"></i> {{ form.occasion_name }} · {{ form.occasion_date }}</span></div>
          <div class="ui-card__body form-stack">
            <div class="ui-field">
              <label class="ui-label">Kind</label>
              <div class="kinds" role="radiogroup" aria-label="Kind of announcement">
                <button
                  v-for="k in meta.kinds"
                  :key="k.key"
                  type="button"
                  role="radio"
                  class="kind"
                  :class="[`is-${toneOf(k.key)}`, { 'is-on': form.kind === k.key }]"
                  :aria-checked="form.kind === k.key"
                  @click="setKind(k.key)"
                >
                  <i :class="k.icon"></i>
                  <span><strong>{{ k.label }}</strong><small>{{ k.description }}</small></span>
                </button>
              </div>
            </div>

            <div class="ui-field">
              <label class="ui-label" for="ann-title">Title <span class="ui-req"></span></label>
              <input id="ann-title" v-model="form.title" class="ui-input" :class="{ 'is-invalid': errors.title }" maxlength="140" placeholder="e.g. Happy Mashujaa Day from DASYIN" @input="touched" />
              <div class="field-foot"><span v-if="errors.title" class="ui-field__error">{{ errors.title }}</span><span class="count">{{ form.title.length }}/140</span></div>
            </div>

            <div class="ui-field">
              <div class="label-row">
                <label class="ui-label">Message <span class="ui-req"></span></label>
                <span v-if="form.ai_draft" class="ai-chip" title="Drafted by AI — read it through before sending"><i class="fa-solid fa-wand-magic-sparkles"></i> AI draft{{ aiEdited ? ' · edited' : '' }}</span>
              </div>
              <RichTextEditor ref="editor" v-model="form.body" label="Message" :invalid="!!errors.body" placeholder="Write your message — keep it short and useful." @edited="onBodyEdited">
                <template #extra>
                  <span class="rte-spacer"></span>
                  <button v-if="meta.ai_enabled" type="button" class="ui-btn ui-btn--sm ai-btn" @mousedown.prevent @click="ai.open = !ai.open"><i class="fa-solid fa-wand-magic-sparkles"></i> Write with AI</button>
                </template>
              </RichTextEditor>
              <span v-if="errors.body" class="ui-field__error">{{ errors.body }}</span>
              <div v-if="ai.open" class="ai-panel">
                <label class="ui-label" for="ai-notes">What should it say?</label>
                <textarea id="ai-notes" v-model="ai.notes" class="ui-textarea" rows="3" :placeholder="aiPlaceholder"></textarea>
                <div class="ai-panel__row">
                  <label class="ui-switch"><input v-model="ai.swahili" type="checkbox" /> Also in Kiswahili</label>
                  <span class="ai-panel__grow"></span>
                  <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="ai.open = false">Cancel</button>
                  <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" :disabled="ai.busy" @click="writeWithAI">
                    <i :class="ai.busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-wand-magic-sparkles'"></i> {{ ai.busy ? 'Writing…' : 'Draft it' }}
                  </button>
                </div>
                <p class="ui-hint">Uses the AI assistant key from System settings. The draft replaces the title and message and is marked “AI draft” — read it before sending.</p>
              </div>
            </div>

            <div class="ui-grid-2">
              <div class="ui-field">
                <label class="ui-label" for="ann-cta-label">Button label <span class="opt">optional</span></label>
                <input id="ann-cta-label" v-model="form.cta_label" class="ui-input" :class="{ 'is-invalid': errors.cta_label }" maxlength="40" placeholder="e.g. See plans" @input="touched" />
                <span v-if="errors.cta_label" class="ui-field__error">{{ errors.cta_label }}</span>
              </div>
              <div class="ui-field">
                <label class="ui-label" for="ann-cta-url">Button goes to</label>
                <input id="ann-cta-url" v-model="form.cta_url" class="ui-input" :class="{ 'is-invalid': errors.cta_url }" list="ann-paths" placeholder="/plan or https://…" @input="touched" />
                <datalist id="ann-paths">
                  <option value="/plan">Plan & billing</option>
                  <option value="/dashboard">Dashboard</option>
                  <option value="/settings">Settings</option>
                  <option value="/pos">Point of sale</option>
                  <option value="/bookings">Bookings</option>
                  <option value="/profile">My profile</option>
                </datalist>
                <span v-if="errors.cta_url" class="ui-field__error">{{ errors.cta_url }}</span>
                <span v-else class="ui-hint">An in-app page (starts with /) or an https:// link.</span>
              </div>
            </div>
            <div class="ui-field">
              <label class="ui-label" for="ann-img">Image <span class="opt">optional</span></label>
              <input id="ann-img" v-model="form.image_url" class="ui-input" :class="{ 'is-invalid': errors.image_url }" placeholder="https://…/image.jpg" @input="touched" />
              <span v-if="errors.image_url" class="ui-field__error">{{ errors.image_url }}</span>
              <span v-else class="ui-hint">An https:// image link, shown above the message (about 1200 × 600 works well).</span>
            </div>
          </div>
        </section>

        <!-- Audience -->
        <section class="ui-card">
          <div class="ui-card__head"><h2>Who gets it</h2></div>
          <div class="ui-card__body form-stack">
            <div class="reach" :class="{ 'is-loading': reach.loading }" aria-live="polite">
              <div class="reach__num">
                <strong data-test="recipient-count">{{ reach.data ? reach.data.count : '—' }}</strong>
                <span>{{ reach.data && reach.data.count === 1 ? 'person' : 'people' }}</span>
              </div>
              <div class="reach__detail" v-if="reach.data">
                <div>{{ reach.data.organizations }} organisation{{ reach.data.organizations === 1 ? '' : 's' }} · {{ reach.data.with_email }} with an email address</div>
                <div class="reach__levels">{{ reach.data.by_level.owner }} owners/admins · {{ reach.data.by_level.manager }} managers · {{ reach.data.by_level.staff }} staff</div>
                <div v-if="form.kind === 'promotion' && reach.data.unsubscribed" class="reach__unsub"><i class="fa-solid fa-ban"></i> {{ reach.data.unsubscribed }} left out — they unsubscribed from offers</div>
                <div v-if="reach.data.top_organizations.length" class="reach__orgs">
                  <span v-for="o in reach.data.top_organizations" :key="o.id">{{ o.name }} <b>{{ o.count }}</b></span>
                </div>
              </div>
              <div v-else-if="reach.error" class="reach__detail txt-danger">{{ reach.error }}</div>
            </div>

            <div class="ui-field">
              <label class="ui-label">Role</label>
              <div class="seg" role="radiogroup" aria-label="Role level">
                <button v-for="r in meta.role_levels" :key="r.key" type="button" role="radio" class="seg__btn" :class="{ 'is-on': form.audience.role_level === r.key }" :aria-checked="form.audience.role_level === r.key" @click="form.audience.role_level = r.key">
                  {{ r.label }}
                </button>
              </div>
            </div>

            <div class="ui-field">
              <label class="ui-label">Business types <span class="opt">{{ form.audience.business_types.length ? form.audience.business_types.length + ' chosen' : 'any' }}</span></label>
              <div class="pills">
                <button v-for="b in meta.business_types" :key="b.key" type="button" class="pill" :class="{ 'is-on': form.audience.business_types.includes(b.key) }" :aria-pressed="form.audience.business_types.includes(b.key)" @click="toggle('business_types', b.key)">
                  {{ b.label }}
                </button>
              </div>
            </div>

            <div class="ui-grid-2">
              <div class="ui-field">
                <label class="ui-label">Countries <span class="opt">{{ form.audience.countries.length ? '' : 'any' }}</span></label>
                <div class="pills">
                  <button v-for="c in meta.countries" :key="c.key" type="button" class="pill" :class="{ 'is-on': form.audience.countries.includes(c.key) }" :aria-pressed="form.audience.countries.includes(c.key)" @click="toggle('countries', c.key)">
                    {{ c.label }}<small v-if="c.organizations"> {{ c.organizations }}</small>
                  </button>
                </div>
              </div>
              <div class="ui-field">
                <label class="ui-label">Plan <span class="opt">{{ form.audience.plan_tiers.length ? '' : 'any' }}</span></label>
                <div class="pills">
                  <button v-for="p in meta.plan_tiers" :key="p.key" type="button" class="pill" :class="{ 'is-on': form.audience.plan_tiers.includes(p.key) }" :aria-pressed="form.audience.plan_tiers.includes(p.key)" @click="toggle('plan_tiers', p.key)">
                    {{ p.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="ui-field">
              <label class="ui-label" for="org-search">Organisations <span class="opt">{{ orgChips.length ? orgChips.length + ' chosen' : 'any' }}</span></label>
              <div class="org-pick">
                <div class="ui-input-group">
                  <i class="fa-solid fa-magnifying-glass"></i>
                  <input id="org-search" v-model="orgQuery" class="ui-input" type="search" placeholder="Pick organisations by name…" autocomplete="off" @input="searchOrgs" @focus="searchOrgs" @keydown.esc="orgResults = []" />
                </div>
                <ul v-if="orgResults.length" class="org-pick__menu" role="listbox">
                  <li v-for="o in orgResults" :key="o.id">
                    <button type="button" role="option" @mousedown.prevent="addOrg(o)">
                      <strong>{{ o.name }}</strong><small>{{ typeLabel(o.business_type) }}{{ o.country ? ' · ' + o.country : '' }}</small>
                    </button>
                  </li>
                </ul>
              </div>
              <div v-if="orgChips.length" class="chips">
                <span v-for="o in orgChips" :key="o.id" class="chip">{{ o.name }}<button type="button" :aria-label="`Remove ${o.name}`" @click="removeOrg(o.id)"><i class="fa-solid fa-xmark"></i></button></span>
              </div>
            </div>

            <div class="ui-grid-2">
              <div class="ui-field">
                <label class="ui-label" for="ann-active">Signed in recently</label>
                <select id="ann-active" v-model.number="form.audience.active_within_days" class="ui-select">
                  <option :value="0">Anyone</option>
                  <option :value="7">In the last 7 days</option>
                  <option :value="30">In the last 30 days</option>
                  <option :value="90">In the last 90 days</option>
                </select>
              </div>
              <div class="ui-field switch-field">
                <label class="ui-switch"><input v-model="form.audience.exclude_super_admins" type="checkbox" /> Leave out the DASYIN team (super admins)</label>
              </div>
            </div>
          </div>
        </section>

        <!-- Delivery -->
        <section class="ui-card">
          <div class="ui-card__head"><h2>Delivery</h2></div>
          <div class="ui-card__body form-stack">
            <div class="ui-grid-2">
              <div class="ui-field">
                <label class="ui-label">Priority</label>
                <div class="seg" role="radiogroup" aria-label="Priority">
                  <button type="button" role="radio" class="seg__btn" :class="{ 'is-on': form.priority === 'normal' }" :aria-checked="form.priority === 'normal'" :disabled="form.kind === 'urgent'" @click="setPriority('normal')">Normal</button>
                  <button type="button" role="radio" class="seg__btn is-danger" :class="{ 'is-on': form.priority === 'urgent' }" :aria-checked="form.priority === 'urgent'" @click="setPriority('urgent')"><i class="fa-solid fa-bolt"></i> Urgent</button>
                </div>
                <span class="ui-hint">Urgent shows as a banner on the dashboard.</span>
              </div>
              <div class="ui-field">
                <label class="ui-label" for="ann-delay">Email if unread</label>
                <select id="ann-delay" v-model.number="form.email_delay_minutes" class="ui-select" @change="delayTouched = true">
                  <option v-for="d in meta.delays" :key="d.minutes" :value="d.minutes">{{ d.label }}{{ d.minutes === defaultDelay ? ' (default)' : '' }}</option>
                </select>
                <span class="ui-hint">People who read it in the app first get no email.</span>
              </div>
            </div>
            <div v-if="form.kind === 'promotion'" class="ui-alert ui-alert--warning legal">
              <i class="fa-solid fa-scale-balanced"></i>
              <span>{{ meta.legal_note }} Offers also skip anyone who turned off “Updates from DASYIN” emails.</span>
            </div>
            <div v-else-if="serviceNotice" class="ui-alert ui-alert--danger">
              <i class="fa-solid fa-bolt"></i>
              <span>Urgent messages are emailed even to people who turned off “Updates from DASYIN” emails — keep them for real service notices.</span>
            </div>
            <p v-else class="ui-hint">Updates and reminders follow each person's “Updates from DASYIN” email switch (My profile → Email notifications).</p>
            <div v-if="meta.email && !meta.email.ready" class="ui-alert ui-alert--warning"><i class="fa-solid fa-envelope-circle-check"></i><span>Platform email isn't set up yet{{ meta.email.problem ? ': ' + meta.email.problem : '' }}. Messages still appear in the app; set up email in <router-link to="/system-settings">System settings</router-link>.</span></div>
            <p v-else-if="meta.email" class="ui-hint"><i class="fa-regular fa-envelope"></i> Emails come from {{ meta.email.from }}.</p>
          </div>
        </section>

        <!-- Schedule -->
        <section class="ui-card">
          <div class="ui-card__head"><h2>When</h2></div>
          <div class="ui-card__body form-stack">
            <div class="seg" role="radiogroup" aria-label="When to send">
              <button type="button" role="radio" class="seg__btn" :class="{ 'is-on': mode === 'now' }" :aria-checked="mode === 'now'" @click="setMode('now')"><i class="fa-solid fa-paper-plane"></i> Send now</button>
              <button type="button" role="radio" class="seg__btn" :class="{ 'is-on': mode === 'later' }" :aria-checked="mode === 'later'" @click="setMode('later')"><i class="fa-regular fa-clock"></i> Schedule</button>
            </div>
            <template v-if="mode === 'later'">
              <div class="ui-grid-2">
                <div class="ui-field">
                  <label class="ui-label" for="ann-at">Date and time</label>
                  <input id="ann-at" v-model="form.local_send_at" class="ui-input" :class="{ 'is-invalid': errors.local_send_at }" type="datetime-local" @input="touched" />
                  <span v-if="errors.local_send_at" class="ui-field__error">{{ errors.local_send_at }}</span>
                </div>
                <div class="ui-field">
                  <label class="ui-label" for="ann-tz">Time zone</label>
                  <select id="ann-tz" v-model="form.timezone" class="ui-select">
                    <option v-for="z in meta.timezones" :key="z" :value="z">{{ z.replace('_', ' ') }}</option>
                  </select>
                </div>
              </div>
              <p v-if="sendWhen" class="when-line"><i class="fa-regular fa-calendar-check"></i> {{ sendWhen }}</p>
              <div class="ui-grid-2">
                <div class="ui-field">
                  <label class="ui-label" for="ann-repeat">Repeat</label>
                  <select id="ann-repeat" v-model="form.recurrence" class="ui-select">
                    <option value="none">Doesn't repeat</option>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                  </select>
                </div>
                <div v-if="form.recurrence !== 'none'" class="ui-field">
                  <label class="ui-label" for="ann-until">Until <span class="opt">last day</span></label>
                  <input id="ann-until" v-model="form.repeat_until" class="ui-input" :class="{ 'is-invalid': errors.repeat_until }" type="date" />
                  <span v-if="errors.repeat_until" class="ui-field__error">{{ errors.repeat_until }}</span>
                </div>
              </div>
            </template>
            <div class="ui-field">
              <label class="ui-label" for="ann-exp">Stop showing after <span class="opt">optional</span></label>
              <input id="ann-exp" v-model="form.local_expires_at" class="ui-input" :class="{ 'is-invalid': errors.local_expires_at }" type="datetime-local" @input="touched" />
              <span v-if="errors.local_expires_at" class="ui-field__error">{{ errors.local_expires_at }}</span>
              <span v-else class="ui-hint">After this it disappears from the app and no more emails go out ({{ form.timezone }}).</span>
            </div>
          </div>
        </section>

        <div class="action-bar">
          <button type="button" class="ui-btn" :disabled="busy" @click="saveDraft"><i class="fa-regular fa-floppy-disk"></i> Save draft</button>
          <button type="button" class="ui-btn" :disabled="busy" @click="sendTest"><i class="fa-solid fa-vial"></i> Send test to me</button>
          <span class="action-bar__grow"></span>
          <button v-if="mode === 'now'" type="button" class="ui-btn ui-btn--primary" :disabled="busy" data-test="send-now" @click="sendNow">
            <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane'"></i> Send now{{ reach.data ? ` to ${reach.data.count}` : '' }}
          </button>
          <button v-else type="button" class="ui-btn ui-btn--primary" :disabled="busy" data-test="schedule" @click="schedule">
            <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-calendar-check'"></i> {{ status === 'scheduled' ? 'Update schedule' : 'Schedule' }}
          </button>
        </div>
      </div>

      <!-- Previews -->
      <aside class="composer__preview">
        <div class="ui-card preview-card">
          <div class="preview-tabs ui-tabs" role="tablist">
            <button class="ui-tab" :class="{ 'is-active': pv === 'app' }" role="tab" :aria-selected="pv === 'app'" @click="pv = 'app'"><i class="fa-solid fa-mobile-screen"></i> In the app</button>
            <button class="ui-tab" :class="{ 'is-active': pv === 'email' }" role="tab" :aria-selected="pv === 'email'" @click="pv = 'email'"><i class="fa-regular fa-envelope"></i> Email</button>
          </div>
          <div v-if="pv === 'app'" class="ui-card__body preview-app">
            <div class="pv-label">Notification centre</div>
            <div class="pv-nc">
              <span class="pv-nc__icon" :class="`is-${tone}`"><i :class="kindInfo.icon"></i></span>
              <span class="pv-nc__text">
                <strong>{{ form.title || 'Your title' }}</strong>
                <span>{{ previewText || 'Your message' }}</span>
                <small><b>From DASYIN</b> · Just now<template v-if="sevLabel"> · {{ sevLabel }}</template></small>
              </span>
              <span class="pv-nc__dot"></span>
            </div>
            <template v-if="isUrgent">
              <div class="pv-label">Dashboard banner</div>
              <AnnouncementCard :item="previewItem" compact banner dismissible />
            </template>
            <div class="pv-label">When they open it</div>
            <AnnouncementCard :item="previewItem" />
          </div>
          <div v-else class="ui-card__body preview-email">
            <div class="pv-subject"><span>Subject</span><strong>{{ email.subject || form.title || 'Your title' }}</strong></div>
            <p class="ui-hint">{{ emailWhen }}</p>
            <div class="pv-frame" :class="{ 'is-loading': email.loading }">
              <iframe v-if="email.html" title="Email preview" :srcdoc="email.html" sandbox="" loading="lazy"></iframe>
              <div v-else class="ui-empty"><div class="ui-empty__icon"><i class="fa-regular fa-envelope"></i></div><p>{{ email.error || 'The email preview appears here.' }}</p></div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import RichTextEditor from '@/components/announcements/RichTextEditor.vue'
import AnnouncementCard from '@/components/announcements/AnnouncementCard.vue'
import { announcementsAPI, KINDS, STATUS, zoned, localToDate, localNow, delayLabel } from '@/services/announcements'
import { cleanHtml, plainText } from '@/utils/richtext'
import { apiErrorMessage } from '@/services/api'
import { ensurePlatformSession } from '@/services/platform'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const blankAudience = () => ({ organization_ids: [], business_types: [], plan_tiers: [], countries: [], role_level: 'everyone', active_within_days: 0, exclude_super_admins: true })

function debounce(fn, ms) {
  let t = null
  const d = (...a) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...a), ms)
  }
  d.cancel = () => clearTimeout(t)
  return d
}

export default {
  name: 'AnnouncementComposer',
  components: { RichTextEditor, AnnouncementCard },
  props: { id: { type: String, default: '' } },
  data() {
    return {
      loading: true,
      loadError: '',
      meta: { kinds: [], delays: [], role_levels: [], business_types: [], plan_tiers: [], countries: [], timezones: ['Africa/Nairobi'], ai_enabled: false, legal_note: '' },
      form: this.blank(),
      status: '',
      mode: 'now',
      delayTouched: false,
      errors: {},
      busy: false,
      dirty: false,
      aiEdited: false,
      ai: { open: false, notes: '', swahili: false, busy: false },
      reach: { data: null, loading: false, error: '' },
      orgChips: [],
      orgQuery: '',
      orgResults: [],
      pv: 'app',
      email: { html: '', subject: '', loading: false, error: '' }
    }
  },
  computed: {
    isNew() {
      return !this.id
    },
    statusInfo() {
      return this.status ? STATUS[this.status] : null
    },
    kindInfo() {
      return KINDS[this.form.kind] || KINDS.update
    },
    isUrgent() {
      return this.form.kind === 'urgent' || this.form.priority === 'urgent'
    },
    serviceNotice() {
      return this.form.kind !== 'promotion' && this.isUrgent
    },
    tone() {
      return this.isUrgent ? 'danger' : this.kindInfo.tone
    },
    sevLabel() {
      return { urgent: 'Urgent', promotion: 'Offer', reminder: 'Reminder' }[this.isUrgent ? 'urgent' : this.form.kind] || ''
    },
    defaultDelay() {
      return this.isUrgent ? 60 : 180
    },
    cleanBody() {
      return cleanHtml(this.form.body)
    },
    previewText() {
      const t = plainText(this.cleanBody).replace(/\s+/g, ' ').trim()
      return t.length > 140 ? t.slice(0, 138) + '…' : t
    },
    previewItem() {
      return {
        title: this.form.title,
        body: this.cleanBody,
        body_text: plainText(this.cleanBody),
        kind: this.form.kind,
        priority: this.form.priority,
        cta_label: this.form.cta_label,
        cta_url: this.form.cta_url,
        image_url: /^https:\/\//.test(this.form.image_url) ? this.form.image_url : ''
      }
    },
    sendWhen() {
      const t = localToDate(this.form.local_send_at, this.form.timezone)
      if (!t) return ''
      const here = Intl.DateTimeFormat().resolvedOptions().timeZone
      let s = `Sends ${zoned(t, this.form.timezone, { year: true })}`
      if (here && here !== this.form.timezone) s += ` · ${zoned(t, here)} your time`
      if (this.form.recurrence === 'weekly') s += ' · then every week'
      if (this.form.recurrence === 'monthly') s += ' · then every month'
      if (this.form.recurrence !== 'none' && this.form.repeat_until) s += ` until ${this.form.repeat_until}`
      if (t.getTime() < Date.now() - 60000) s += ' — that time has passed'
      return s
    },
    emailWhen() {
      const d = this.form.email_delay_minutes
      if (d === -1) return 'Never emailed — in the app only.'
      return `${delayLabel(d)} in the app.`
    },
    aiPlaceholder() {
      if (this.form.occasion_name) return `e.g. A warm ${this.form.occasion_name} greeting and a reminder to update opening hours.`
      return 'e.g. Announce that stock counts now work offline on phones; mention it is free on every plan.'
    },
    watchKey() {
      return JSON.stringify([this.form.audience, this.form.kind])
    },
    emailKey() {
      const f = this.form
      return JSON.stringify([f.title, f.body, f.kind, f.priority, f.cta_label, f.cta_url, f.image_url, f.email_delay_minutes])
    }
  },
  watch: {
    watchKey() {
      this.dirty = true
      this.reachSoon()
    },
    emailKey() {
      this.dirty = true
      if (this.pv === 'email') this.emailSoon()
      else this.emailStale = true
    },
    pv(v) {
      if (v === 'email' && (this.emailStale || !this.email.html)) this.emailSoon(50)
    },
    'form.priority'() {
      if (!this.delayTouched) this.form.email_delay_minutes = this.defaultDelay
    },
    'form.kind'() {
      if (!this.delayTouched) this.form.email_delay_minutes = this.defaultDelay
    },
    'form.timezone'() {
      this.dirty = true
    }
  },
  created() {
    if (ensurePlatformSession()) {
      window.location.reload()
      return
    }
    this.reachSoon = debounce(this.loadReach, 350)
    this.emailSoon = (ms = 700) => {
      clearTimeout(this._et)
      this._et = setTimeout(this.loadEmail, ms)
    }
    this.searchSoon = debounce(this.loadOrgs, 250)
    this.init()
  },
  beforeUnmount() {
    this.reachSoon?.cancel?.()
    clearTimeout(this._et)
  },
  async beforeRouteLeave() {
    if (!this.dirty || this.leaving) return true
    return confirmDialog({ title: 'Leave without saving?', message: 'Your changes to this announcement are not saved.', confirmText: 'Leave', danger: true })
  },
  methods: {
    blank() {
      return {
        title: '',
        body: '',
        kind: 'update',
        priority: 'normal',
        cta_label: '',
        cta_url: '',
        image_url: '',
        email_delay_minutes: 180,
        audience: blankAudience(),
        timezone: 'Africa/Nairobi',
        local_send_at: '',
        recurrence: 'none',
        repeat_until: '',
        local_expires_at: '',
        occasion_key: '',
        occasion_date: '',
        occasion_name: '',
        ai_draft: false
      }
    },
    toneOf(k) {
      return (KINDS[k] || KINDS.update).tone
    },
    typeLabel(k) {
      return this.meta.business_types.find((b) => b.key === k)?.label || k
    },
    async init() {
      this.loading = true
      this.loadError = ''
      try {
        this.meta = await announcementsAPI.meta()
        if (this.id) {
          const v = await announcementsAPI.get(this.id)
          const a = v.announcement
          if (a.status !== 'draft' && a.status !== 'scheduled') {
            this.leaving = true
            this.$router.replace(`/super-admin/announcements/${a.id}`)
            return
          }
          this.status = a.status
          this.form = {
            ...this.blank(),
            ...Object.fromEntries(Object.keys(this.blank()).map((k) => [k, a[k] ?? this.blank()[k]])),
            audience: { ...blankAudience(), ...(a.audience || {}) }
          }
          for (const k of ['organization_ids', 'business_types', 'plan_tiers', 'countries']) this.form.audience[k] = this.form.audience[k] || []
          this.mode = a.local_send_at ? 'later' : 'now'
          this.delayTouched = a.email_delay_minutes !== (a.priority === 'urgent' ? 60 : 180)
          if (this.form.audience.organization_ids.length) {
            const r = await announcementsAPI.organizations({ ids: this.form.audience.organization_ids.join(',') })
            this.orgChips = r.organizations || []
          }
        } else {
          this.form.timezone = this.meta.default_timezone || 'Africa/Nairobi'
        }
        if (this.$route.query.ai === '1' && this.meta.ai_enabled) this.ai.open = true
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the composer')
      } finally {
        this.loading = false
        this.$nextTick(() => {
          this.dirty = false
          this.loadReach()
        })
      }
    },
    touched() {
      this.dirty = true
    },
    onBodyEdited() {
      if (this.form.ai_draft) this.aiEdited = true
    },
    setKind(k) {
      this.form.kind = k
      if (k === 'urgent') this.form.priority = 'urgent'
      else if (this.form.priority === 'urgent' && k !== 'urgent' && !this.priorityChosen) this.form.priority = 'normal'
    },
    setPriority(p) {
      this.priorityChosen = true
      this.form.priority = p
    },
    setMode(m) {
      this.mode = m
      if (m === 'later' && !this.form.local_send_at) this.form.local_send_at = localNow(this.form.timezone, 60)
      this.dirty = true
    },
    toggle(field, key) {
      const list = this.form.audience[field]
      const i = list.indexOf(key)
      if (i >= 0) list.splice(i, 1)
      else list.push(key)
    },
    searchOrgs() {
      this.searchSoon()
    },
    async loadOrgs() {
      try {
        const r = await announcementsAPI.organizations({ q: this.orgQuery })
        this.orgResults = (r.organizations || []).filter((o) => !this.form.audience.organization_ids.includes(o.id)).slice(0, 8)
      } catch {
        this.orgResults = []
      }
    },
    addOrg(o) {
      if (!this.form.audience.organization_ids.includes(o.id)) {
        this.form.audience.organization_ids.push(o.id)
        this.orgChips.push(o)
      }
      this.orgQuery = ''
      this.orgResults = []
    },
    removeOrg(id) {
      this.form.audience.organization_ids = this.form.audience.organization_ids.filter((x) => x !== id)
      this.orgChips = this.orgChips.filter((o) => o.id !== id)
    },
    async loadReach() {
      this.reach.loading = true
      try {
        this.reach.data = await announcementsAPI.audience(this.form.audience, this.form.kind)
        this.reach.error = ''
      } catch (e) {
        this.reach.error = apiErrorMessage(e, 'Could not count the recipients')
      } finally {
        this.reach.loading = false
      }
    },
    payload() {
      const f = this.form
      return {
        ...f,
        body: f.body, // the server keeps only the simple rich text (pkg/broadcast/sanitize.go)
        local_send_at: this.mode === 'later' ? f.local_send_at : '',
        recurrence: this.mode === 'later' ? f.recurrence : 'none',
        repeat_until: this.mode === 'later' && f.recurrence !== 'none' ? f.repeat_until : ''
      }
    },
    async loadEmail() {
      this.emailStale = false
      this.email.loading = true
      try {
        const r = await announcementsAPI.emailPreview({ ...this.payload(), local_send_at: '', local_expires_at: '', repeat_until: '' })
        this.email.html = r.html
        this.email.subject = r.subject
        this.email.error = ''
      } catch (e) {
        this.email.error = apiErrorMessage(e, 'Could not render the email')
      } finally {
        this.email.loading = false
      }
    },
    applyErrors(e) {
      const err = e?.response?.data?.error
      this.errors = {}
      if (err?.field) {
        this.errors = { [err.field]: err.message }
        const el = document.getElementById({ title: 'ann-title', cta_label: 'ann-cta-label', cta_url: 'ann-cta-url', image_url: 'ann-img', local_send_at: 'ann-at', local_expires_at: 'ann-exp', repeat_until: 'ann-until' }[err.field])
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      toast.error(apiErrorMessage(e, 'Could not save the announcement'))
    },
    async save() {
      this.errors = {}
      const body = this.payload()
      const v = this.id ? await announcementsAPI.update(this.id, body) : await announcementsAPI.create(body)
      this.dirty = false
      this.status = v.announcement.status
      return v.announcement
    },
    async goTo(path, replace = false) {
      this.leaving = true
      await (replace ? this.$router.replace(path) : this.$router.push(path)).catch(() => {})
    },
    async saveDraft() {
      this.busy = true
      try {
        const a = await this.save()
        toast.success('Draft saved')
        if (this.isNew) await this.goTo(`/super-admin/announcements/${a.id}/edit`, true)
      } catch (e) {
        this.applyErrors(e)
      } finally {
        this.busy = false
      }
    },
    async sendTest() {
      this.busy = true
      try {
        const a = await this.save()
        const r = await announcementsAPI.test(a.id)
        if (r.email_status === 'sent') toast.success(`Test sent to you — it's in your notifications and on its way to ${r.email}.`, { title: 'Test sent' })
        else toast.warning(`It's in your notifications, but the email was not sent: ${r.email_note || r.email_status}`, { title: 'Test sent in the app' })
        if (this.isNew) await this.goTo(`/super-admin/announcements/${a.id}/edit`, true)
      } catch (e) {
        this.applyErrors(e)
      } finally {
        this.busy = false
      }
    },
    async sendNow() {
      const n = this.reach.data?.count ?? 0
      if (!n) {
        toast.warning('Nobody matches this audience yet — widen it first.')
        return
      }
      const ok = await confirmDialog({
        title: `Send to ${n} ${n === 1 ? 'person' : 'people'} now?`,
        message: `“${this.form.title || 'Untitled'}” appears in their app straight away. ${this.form.email_delay_minutes === -1 ? 'It is not emailed.' : delayLabel(this.form.email_delay_minutes) + '.'}`,
        confirmText: 'Send now'
      })
      if (!ok) return
      this.busy = true
      try {
        const a = await this.save()
        const r = await announcementsAPI.sendNow(a.id)
        toast.success(`Sent to ${r.sent_to} ${r.sent_to === 1 ? 'person' : 'people'}`, { title: 'Announcement sent' })
        await this.goTo(`/super-admin/announcements/${a.id}`)
      } catch (e) {
        this.applyErrors(e)
      } finally {
        this.busy = false
      }
    },
    async schedule() {
      if (!this.form.local_send_at) {
        this.errors = { local_send_at: 'Pick a date and time' }
        return
      }
      this.busy = true
      try {
        let a = await this.save()
        if (a.status !== 'scheduled') a = (await announcementsAPI.schedule(a.id)).announcement
        toast.success(`Scheduled for ${zoned(a.next_send_at, a.timezone)}`, { title: 'Announcement scheduled' })
        await this.goTo(`/super-admin/announcements/${a.id}`)
      } catch (e) {
        this.applyErrors(e)
      } finally {
        this.busy = false
      }
    },
    async writeWithAI() {
      this.ai.busy = true
      try {
        const r = await announcementsAPI.aiDraft({
          occasion_key: this.form.occasion_key,
          occasion_date: this.form.occasion_date,
          occasion_name: this.form.occasion_name,
          kind: this.form.kind,
          title: this.form.title,
          notes: this.ai.notes,
          swahili: this.ai.swahili,
          audience: this.form.audience
        })
        this.form.title = r.title || this.form.title
        this.form.body = r.body
        this.form.ai_draft = true
        this.aiEdited = false
        this.ai.open = false
        toast.info(r.swahili ? 'AI draft in English and Kiswahili — read it through before sending.' : 'AI draft ready — read it through before sending.', { title: 'AI draft' })
      } catch (e) {
        toast.error(apiErrorMessage(e, 'The AI draft did not work — try again'))
      } finally {
        this.ai.busy = false
      }
    }
  }
}
</script>

<style scoped>
@media (min-width: 641px) {
  .ui-page-head > div:first-child {
    flex: 1 1 360px;
    min-width: 0;
  }
}
.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 440px);
  gap: 20px;
  align-items: start;
}
.composer__form {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.composer__preview {
  position: sticky;
  top: calc(var(--topbar-h) + 16px);
  min-width: 0;
}
.form-stack {
  display: grid;
  gap: 16px;
}
.ui-eyebrow a {
  color: inherit;
  text-decoration: none;
}
.ui-eyebrow a:hover {
  color: var(--accent);
}
.sk-col {
  display: grid;
  gap: 12px;
}
.sk-col .ui-skeleton {
  height: 18px;
  display: block;
}
.opt {
  font-weight: 400;
  color: var(--text-3);
  font-size: 12px;
  margin-left: 4px;
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.field-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.occ-chip {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 3px 10px;
}

.kinds {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.kind {
  --tone: var(--info);
  --tone-soft: var(--info-soft);
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  min-width: 0;
}
.kind.is-success { --tone: var(--success); --tone-soft: var(--success-soft); }
.kind.is-warning { --tone: var(--warning); --tone-soft: var(--warning-soft); }
.kind.is-danger { --tone: var(--danger); --tone-soft: var(--danger-soft); }
.kind > i {
  color: var(--tone);
  margin-top: 3px;
}
.kind strong {
  display: block;
  font-size: 14px;
}
.kind small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.35;
  margin-top: 2px;
}
.kind:hover {
  border-color: var(--border-strong);
}
.kind.is-on {
  border-color: var(--tone);
  background: color-mix(in srgb, var(--tone-soft) 60%, var(--surface));
  box-shadow: 0 0 0 1px var(--tone) inset;
}

.rte-spacer {
  flex: 1;
}
.ai-btn {
  color: var(--accent);
}
.ai-chip {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 2px 9px;
}
.ai-panel {
  margin-top: 10px;
  padding: 12px;
  border: 1px dashed color-mix(in srgb, var(--accent) 45%, var(--border));
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent-soft) 40%, var(--surface));
  display: grid;
  gap: 8px;
}
.ai-panel__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.ai-panel__grow {
  flex: 1;
}

.reach {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  transition: opacity 0.15s;
}
.reach.is-loading {
  opacity: 0.7;
}
.reach__num {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 76px;
}
.reach__num strong {
  font-size: 30px;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.reach__num span {
  font-size: 12px;
  color: var(--text-2);
}
.reach__detail {
  font-size: 13px;
  color: var(--text-2);
  display: grid;
  gap: 3px;
  min-width: 0;
}
.reach__levels {
  color: var(--text-3);
}
.reach__unsub {
  color: var(--warning);
}
.reach__orgs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  color: var(--text-3);
}
.reach__orgs b {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.txt-danger {
  color: var(--danger);
}

.seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  background: var(--bg-subtle);
  border-radius: 10px;
  max-width: 100%;
}
.seg__btn {
  border: 0;
  background: transparent;
  color: var(--text-2);
  font-weight: 600;
  font-size: 13.5px;
  padding: 7px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.seg__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.seg__btn.is-on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}
.seg__btn.is-danger.is-on {
  color: var(--danger);
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pill {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 13px;
  cursor: pointer;
}
.pill small {
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.pill:hover {
  border-color: var(--border-strong);
}
.pill.is-on {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  color: var(--accent);
  font-weight: 600;
}

.org-pick {
  position: relative;
}
.org-pick__menu {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  max-height: 280px;
  overflow-y: auto;
}
.org-pick__menu button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
}
.org-pick__menu button:hover {
  background: var(--surface-hover);
}
.org-pick__menu small {
  color: var(--text-3);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text);
  font-size: 13px;
}
.chip button {
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 50%;
}
.chip button:hover {
  background: var(--surface-hover);
  color: var(--danger);
}
.switch-field {
  justify-content: flex-end;
  align-self: end;
  padding-bottom: 8px;
}
.legal {
  font-size: 13px;
}
.when-line {
  margin: -6px 0 0;
  font-size: 13px;
  color: var(--text-2);
}
.when-line i {
  color: var(--accent);
  margin-right: 4px;
}

.action-bar {
  position: sticky;
  bottom: 12px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}
.action-bar__grow {
  flex: 1;
}

.preview-card {
  overflow: hidden;
}
.preview-tabs {
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--border);
}
.preview-app {
  display: grid;
  gap: 10px;
  background: var(--bg);
}
.pv-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-top: 4px;
}
.pv-nc {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
}
.pv-nc__icon {
  --tone: var(--info);
  --tone-soft: var(--info-soft);
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--tone-soft);
  color: var(--tone);
}
.pv-nc__icon.is-success { --tone: var(--success); --tone-soft: var(--success-soft); }
.pv-nc__icon.is-warning { --tone: var(--warning); --tone-soft: var(--warning-soft); }
.pv-nc__icon.is-danger { --tone: var(--danger); --tone-soft: var(--danger-soft); }
.pv-nc__text {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
  font-size: 13px;
  color: var(--text-2);
}
.pv-nc__text strong {
  color: var(--text);
  font-size: 13.5px;
  overflow-wrap: anywhere;
}
.pv-nc__text span {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.pv-nc__text small {
  color: var(--text-3);
}
.pv-nc__text small b {
  color: var(--accent);
}
.pv-nc__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 6px;
  flex-shrink: 0;
}
.preview-email {
  display: grid;
  gap: 8px;
}
.pv-subject {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 13.5px;
  min-width: 0;
}
.pv-subject span {
  color: var(--text-3);
  font-size: 12px;
}
.pv-subject strong {
  overflow-wrap: anywhere;
}
.pv-frame {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #f3f4f8;
  transition: opacity 0.15s;
}
.pv-frame.is-loading {
  opacity: 0.6;
}
.pv-frame iframe {
  display: block;
  width: 100%;
  height: 640px;
  border: 0;
}
.pv-frame .ui-empty {
  background: var(--surface);
}

@media (max-width: 1180px) {
  .composer {
    grid-template-columns: minmax(0, 1fr);
  }
  .composer__preview {
    position: static;
    order: 2;
  }
  .kinds {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .kinds {
    grid-template-columns: minmax(0, 1fr);
  }
  .kind small {
    display: none;
  }
  .reach {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .reach__num {
    flex-direction: row;
    gap: 6px;
    align-items: baseline;
  }
  .action-bar {
    bottom: calc(8px + var(--bottom-nav-h, 0px));
  }
  .action-bar .ui-btn {
    flex: 1 1 auto;
    justify-content: center;
  }
  .action-bar__grow {
    display: none;
  }
  .pv-frame iframe {
    height: 560px;
  }
  .hide-sm {
    display: none;
  }
}
</style>
