<template>
  <article
    class="ui-card card"
    :class="['st-' + o.status, { focus: focused }]"
    :data-opp="o.id"
    :data-status="o.status"
    :data-fit="o.fit"
    data-testid="scout-card"
  >
    <div
      class="fit"
      :class="fitClass"
      :title="'Fit ' + o.fit + ' of 100 — how well it matches your profile and focus'"
    >
      <strong>{{ o.fit }}</strong>
      <small>fit</small>
    </div>

    <div class="main">
      <div class="kicker">
        <span class="type"><i :class="icon"></i> {{ typeLabel }}</span>
        <span v-if="o.country" class="cc">{{ flag }} {{ country }}</span>
        <span v-else-if="o.location" class="cc">{{ o.location }}</span>
        <span v-if="o.status === 'saved'" class="ui-badge ui-badge--info"
          ><i class="fa-solid fa-bookmark"></i> Saved</span
        >
        <span v-if="o.status === 'pursued'" class="ui-badge ui-badge--success"
          ><i class="fa-solid fa-check"></i> In CRM</span
        >
        <span v-if="o.status === 'dismissed'" class="ui-badge">Dismissed · {{ reasonLabel }}</span>
        <span v-if="o.status === 'expired'" class="ui-badge ui-badge--expired"
          >Deadline passed</span
        >
        <span v-if="o.seen_count > 1" class="seen" :title="'Found in ' + o.seen_count + ' scans'"
          ><i class="fa-solid fa-rotate"></i> seen {{ o.seen_count }}×</span
        >
      </div>
      <h3 data-testid="scout-title">{{ o.title }}</h3>
      <p v-if="o.buyer || (o.location && o.country)" class="buyer">
        <template v-if="o.buyer">{{ o.buyer }}</template
        ><template v-if="o.buyer && o.location && o.country"> · </template
        ><template v-if="o.location && o.country">{{ o.location }}</template>
      </p>

      <div class="facts">
        <span class="fact" :class="{ muted: !value }" data-testid="scout-value">
          <i class="fa-solid fa-coins"></i>
          <template v-if="value"
            >{{ value }}<small v-if="homeValue"> ≈ {{ homeValue }}</small></template
          >
          <template v-else>Value not stated</template>
        </span>
        <span class="fact" :class="deadlineClass" data-testid="scout-deadline">
          <i class="fa-regular fa-calendar"></i>
          <template v-if="o.deadline"
            >{{ deadlineText }} <small>· {{ formatDate(o.deadline) }}</small></template
          >
          <template v-else-if="o.deadline_text">{{ o.deadline_text }}</template>
          <template v-else>No fixed deadline</template>
        </span>
        <span v-if="o.effort" class="fact"
          ><i class="fa-solid fa-person-digging"></i> {{ cap(o.effort) }} effort</span
        >
        <span v-if="o.confidence" class="fact"
          ><i class="fa-solid fa-signal"></i> {{ cap(o.confidence) }} confidence</span
        >
      </div>

      <p v-if="o.summary" class="sum">{{ o.summary }}</p>
      <div v-if="o.why_it_fits" class="why">
        <span class="lbl">Why it fits</span>
        <p>{{ o.why_it_fits }}</p>
      </div>
      <button
        v-if="o.fit_reasons && o.fit_reasons.length"
        type="button"
        class="linkish"
        :aria-expanded="showFit"
        data-action="fit"
        @click="showFit = !showFit"
      >
        {{ showFit ? 'Hide' : 'How the fit score adds up' }}
        <i :class="showFit ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
      </button>
      <ul v-if="showFit" class="reasons">
        <li v-for="(r, i) in o.fit_reasons" :key="i" :class="{ neg: r.points < 0 }">
          <span>{{ r.label }}</span
          ><b>{{ r.points > 0 ? '+' : '' }}{{ r.points }}</b>
        </li>
      </ul>
      <p v-if="o.next_step" class="next">
        <i class="fa-solid fa-arrow-right"></i>
        <span><strong>Next step:</strong> {{ o.next_step }}</span>
      </p>

      <div class="sources" data-testid="scout-sources">
        <span class="lbl">Sources</span>
        <ul>
          <li v-for="(s, i) in o.sources" :key="i">
            <a
              v-if="link(s.url)"
              :href="link(s.url)"
              target="_blank"
              rel="noopener noreferrer nofollow"
              referrerpolicy="no-referrer"
              data-action="source"
            >
              {{ s.title || s.domain }} <i class="fa-solid fa-arrow-up-right-from-square ext"></i>
            </a>
            <span v-else>{{ s.title }}</span>
            <small
              >{{ s.domain }}<template v-if="s.page_age"> · {{ s.page_age }}</template></small
            >
          </li>
        </ul>
      </div>

      <p v-if="o.remind_on && o.status !== 'dismissed'" class="remind" data-testid="scout-reminder">
        <i class="fa-regular fa-bell"></i> Reminder {{ o.reminded_at ? 'sent' : 'on' }}
        {{ formatDate(o.remind_on) }}
        <button
          v-if="canEdit && !o.reminded_at"
          type="button"
          class="linkish"
          @click="$emit('remind', o, null)"
        >
          Clear
        </button>
      </p>
      <p v-if="o.status === 'pursued'" class="crm">
        <i class="fa-solid fa-diagram-project"></i> Added to the CRM as a {{ o.crm_kind }}.
        <router-link :to="o.crm_kind === 'lead' ? '/crm?tab=leads' : '/crm'" data-action="open-crm"
          >Open the CRM</router-link
        >
      </p>

      <div v-if="notesOpen || o.notes" class="notes">
        <label :for="'n-' + o.id" class="lbl">Notes</label>
        <textarea
          :id="'n-' + o.id"
          v-model="notes"
          class="ui-textarea"
          rows="2"
          maxlength="4000"
          placeholder="Who to call, what to check…"
          :disabled="!canEdit"
          data-testid="scout-notes"
          @blur="saveNotes"
        ></textarea>
      </div>
    </div>

    <div v-if="canEdit" class="acts">
      <template v-if="o.status === 'new' || o.status === 'saved'">
        <button
          class="ui-btn ui-btn--primary ui-btn--sm"
          type="button"
          :disabled="busy"
          data-action="pursue"
          @click="$emit('pursue', o)"
        >
          <i class="fa-solid fa-diagram-project"></i> Pursue
        </button>
        <button
          class="ui-btn ui-btn--sm"
          type="button"
          :class="{ on: o.status === 'saved' }"
          :aria-pressed="o.status === 'saved'"
          :disabled="busy"
          data-action="save"
          @click="$emit('save', o)"
        >
          <i :class="o.status === 'saved' ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'"></i>
          {{ o.status === 'saved' ? 'Saved' : 'Save' }}
        </button>
        <div class="remind-wrap" :class="{ open: remindOpen }">
          <button
            class="ui-btn ui-btn--sm"
            type="button"
            :disabled="busy"
            data-action="remind"
            :aria-expanded="remindOpen"
            @click="openRemind"
          >
            <i class="fa-regular fa-bell"></i> Remind me
          </button>
          <div
            v-if="remindOpen"
            class="pop"
            role="dialog"
            aria-label="Remind me on"
            @keydown.esc="remindOpen = false"
          >
            <label :for="'r-' + o.id">Remind me on</label>
            <input
              :id="'r-' + o.id"
              v-model="remindDate"
              type="date"
              class="ui-input ui-input--sm"
              :min="today"
              data-testid="scout-remind-date"
            />
            <div class="quick">
              <button
                v-for="q in quick"
                :key="q.label"
                type="button"
                class="ui-btn ui-btn--ghost ui-btn--sm"
                @click="remindDate = q.date"
              >
                {{ q.label }}
              </button>
            </div>
            <div class="pop__acts">
              <button type="button" class="ui-btn ui-btn--sm" @click="remindOpen = false">
                Cancel
              </button>
              <button
                type="button"
                class="ui-btn ui-btn--primary ui-btn--sm"
                :disabled="!remindDate"
                data-action="remind-save"
                @click="setRemind"
              >
                Set reminder
              </button>
            </div>
          </div>
        </div>
        <button
          v-if="!notesOpen && !o.notes"
          class="ui-btn ui-btn--ghost ui-btn--sm"
          type="button"
          data-action="note"
          @click="notesOpen = true"
        >
          <i class="fa-regular fa-note-sticky"></i> Note
        </button>
        <button
          class="ui-btn ui-btn--ghost ui-btn--sm"
          type="button"
          :disabled="busy"
          data-action="dismiss"
          @click="$emit('dismiss', o)"
        >
          <i class="fa-solid fa-xmark"></i> Dismiss
        </button>
      </template>
      <template v-else-if="o.status === 'dismissed' || o.status === 'expired'">
        <button
          class="ui-btn ui-btn--sm"
          type="button"
          :disabled="busy"
          data-action="restore"
          @click="$emit('restore', o)"
        >
          <i class="fa-solid fa-rotate-left"></i> Restore
        </button>
      </template>
    </div>
  </article>
</template>

<script>
import { formatMoney, formatDate, isoDate, addDays } from '@/utils/format'
import { countryName, countryFlag } from '@/utils/currencies'
import { TYPE_LABELS, TYPE_ICONS, safeLink, daysUntil } from '@/services/scout'

export default {
  name: 'ScoutCard',
  props: {
    o: { type: Object, required: true },
    today: { type: String, default: '' },
    home: { type: String, default: '' },
    canEdit: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    focused: { type: Boolean, default: false },
    reasons: { type: Array, default: () => [] },
  },
  emits: ['pursue', 'save', 'dismiss', 'remind', 'restore', 'notes'],
  data() {
    return {
      showFit: false,
      notesOpen: false,
      notes: this.o.notes || '',
      remindOpen: false,
      remindDate: '',
    }
  },
  computed: {
    typeLabel() {
      return TYPE_LABELS[this.o.type] || 'Opportunity'
    },
    icon() {
      return TYPE_ICONS[this.o.type] || 'fa-solid fa-lightbulb'
    },
    country() {
      return countryName(this.o.country) || this.o.country
    },
    flag() {
      return countryFlag(this.o.country)
    },
    fitClass() {
      return this.o.fit >= 70 ? 'hi' : this.o.fit >= 45 ? 'mid' : 'lo'
    },
    value() {
      if (this.o.est_value == null) return ''
      return this.o.currency
        ? formatMoney(this.o.est_value, this.o.currency)
        : Number(this.o.est_value).toLocaleString()
    },
    homeValue() {
      if (this.o.value_home == null || !this.home || this.o.currency === this.home) return ''
      return formatMoney(this.o.value_home, this.home)
    },
    days() {
      return daysUntil(this.o.deadline, this.today)
    },
    deadlineText() {
      const d = this.days
      if (d == null) return ''
      if (d < 0) return 'Closed'
      if (d === 0) return 'Closes today'
      if (d === 1) return 'Closes tomorrow'
      return `${d} days left`
    },
    deadlineClass() {
      const d = this.days
      if (d == null) return 'muted'
      if (d <= 3) return 'urgent'
      if (d <= 10) return 'soon'
      return ''
    },
    reasonLabel() {
      return (this.reasons.find((r) => r.key === this.o.dismiss_reason) || {}).label || 'not a fit'
    },
    quick() {
      const t = this.today || isoDate()
      const q = [
        { label: 'Tomorrow', date: addDays(t, 1) },
        { label: 'In a week', date: addDays(t, 7) },
      ]
      if (this.o.deadline && this.days > 4)
        q.push({
          label: '3 days before the deadline',
          date: addDays(String(this.o.deadline).slice(0, 10), -3),
        })
      return q
    },
  },
  watch: {
    'o.notes'(v) {
      this.notes = v || ''
    },
  },
  methods: {
    formatDate,
    link: safeLink,
    cap(s) {
      return s ? s[0].toUpperCase() + s.slice(1) : ''
    },
    openRemind() {
      this.remindOpen = !this.remindOpen
      if (this.remindOpen && !this.remindDate)
        this.remindDate = this.quick[this.quick.length - 1].date
    },
    setRemind() {
      this.remindOpen = false
      this.$emit('remind', this.o, this.remindDate)
    },
    saveNotes() {
      if ((this.notes || '') !== (this.o.notes || '')) this.$emit('notes', this.o, this.notes)
    },
  },
}
</script>

<style scoped>
.card {
  margin: 0;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 14px;
  padding: 16px;
  align-items: start;
  transition: box-shadow 0.3s;
}

.card.focus {
  box-shadow: 0 0 0 2px var(--accent);
}

.card.st-dismissed,
.card.st-expired {
  opacity: 0.8;
}

.fit {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 9px 4px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  line-height: 1.1;
}

.fit strong {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.fit small {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
}

.fit.hi {
  background: var(--success-soft);
}

.fit.mid {
  background: var(--info-soft);
}

.kicker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 4px;
}

.type {
  font-weight: 650;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
}

.type i {
  margin-right: 3px;
}

.cc {
  padding: 0 7px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-2);
}

.seen {
  font-size: 11.5px;
}

h3 {
  margin: 0 0 2px;
  font-size: 15.5px;
  line-height: 1.35;
  font-weight: 650;
  color: var(--text);
  overflow-wrap: anywhere;
}

.buyer {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-2);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 8px;
}

.fact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 12.5px;
  font-weight: 550;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.fact i {
  color: var(--text-3);
  font-size: 11px;
}

.fact small {
  color: var(--text-3);
  font-weight: 500;
}

.fact.muted {
  color: var(--text-3);
  font-weight: 500;
}

.fact.soon {
  border-color: var(--warning);
  background: var(--warning-soft);
}

.fact.urgent {
  border-color: var(--danger);
  background: var(--danger-soft);
}

.sum {
  margin: 0 0 8px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-2);
}

.lbl {
  display: block;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin-bottom: 2px;
  font-weight: 600;
}

.why {
  border-left: 3px solid var(--accent);
  padding: 2px 0 2px 10px;
  margin: 0 0 6px;
}

.why p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text);
}

.linkish {
  border: 0;
  background: none;
  padding: 0;
  color: var(--accent);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}

.linkish i {
  font-size: 10px;
}

.reasons {
  list-style: none;
  margin: 6px 0 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  font-size: 12.5px;
  max-width: 460px;
}

.reasons li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
  color: var(--text-2);
}

.reasons b {
  font-variant-numeric: tabular-nums;
  color: var(--success);
}

.reasons .neg b {
  color: var(--danger);
}

.next {
  display: flex;
  gap: 8px;
  margin: 8px 0;
  font-size: 13px;
  color: var(--text);
}

.next i {
  color: var(--accent);
  margin-top: 4px;
  font-size: 11px;
}

.sources {
  margin-top: 8px;
}

.sources ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sources li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  font-size: 13px;
  min-width: 0;
}

.sources a {
  color: var(--accent);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.sources a:hover {
  text-decoration: underline;
}

.sources small {
  color: var(--text-3);
  font-size: 11.5px;
}

.ext {
  font-size: 9.5px;
  margin-left: 2px;
}

.remind,
.crm {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--text-2);
}

.remind i,
.crm i {
  color: var(--accent);
  margin-right: 4px;
}

.notes {
  margin-top: 10px;
}

.notes textarea {
  width: 100%;
  min-height: 56px;
}

.acts {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-width: 132px;
}

.acts .on {
  color: var(--accent);
  border-color: var(--accent);
}

.remind-wrap {
  position: relative;
}

.remind-wrap > .ui-btn {
  width: 100%;
}

.pop {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 20;
  width: 250px;
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow-lg, 0 10px 30px rgba(0, 0, 0, 0.15));
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.pop label {
  font-weight: 600;
  color: var(--text);
}

.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pop__acts {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

@media (max-width: 720px) {
  .card {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    padding: 14px 12px;
  }

  .fit {
    flex-direction: row;
    gap: 6px;
    padding: 4px 10px;
    width: max-content;
  }

  .fit strong {
    font-size: 16px;
  }

  .acts {
    flex-direction: row;
    flex-wrap: wrap;
    min-width: 0;
  }

  .acts .ui-btn,
  .remind-wrap {
    flex: 1 1 auto;
  }

  .remind-wrap.open {
    flex-basis: 100%;
  }

  .pop {
    position: static;
    width: auto;
    margin-top: 6px;
  }
}
</style>
