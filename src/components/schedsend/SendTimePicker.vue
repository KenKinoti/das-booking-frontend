<template>
  <div class="stp" data-testid="send-time-picker">
    <div class="stp-picks" role="radiogroup" aria-label="When to send">
      <button
        v-for="q in picks"
        :key="q.key"
        type="button"
        class="stp-pick"
        :class="{ on: chosen === q.key }"
        role="radio"
        :aria-checked="chosen === q.key"
        :data-testid="'pick-' + q.key"
        @click="usePick(q)"
      >
        <strong>{{ q.label }}</strong>
        <small>{{ q.key === 'custom' ? 'Choose a date and time' : when(q.local) }}</small>
      </button>
    </div>

    <div v-if="chosen === 'custom'" class="stp-custom">
      <div class="ui-field">
        <label :for="uid + '-d'">Date</label>
        <input :id="uid + '-d'" v-model="date" type="date" class="ui-input" :min="today" data-testid="pick-date" @change="emitValue" />
      </div>
      <div class="ui-field">
        <label :for="uid + '-t'">Time</label>
        <input :id="uid + '-t'" v-model="time" type="time" step="300" class="ui-input" data-testid="pick-time" @change="emitValue" />
      </div>
    </div>

    <p class="stp-zone">
      <i class="fa-regular fa-clock"></i>
      <span v-if="modelValue.local_send_at">Sends <strong data-testid="send-when">{{ when(modelValue.local_send_at) }}</strong></span>
      <span v-else>Choose when to send</span>
      <span class="muted">·</span>
      <label class="stp-tz">
        <span class="sr-only">Time zone</span>
        <select v-model="zone" class="stp-tz__select" aria-label="Time zone" data-testid="pick-zone" @change="emitValue">
          <option v-for="z in zones" :key="z" :value="z">{{ z.replace(/_/g, ' ') }}</option>
        </select>
      </label>
    </p>

    <!-- Payment reminders: repeat until paid -->
    <div v-if="reminder" class="stp-repeat">
      <label class="ui-switch"><input v-model="untilPaid" type="checkbox" data-testid="remind-repeat" @change="emitValue" /> Remind again until it's paid</label>
      <div v-if="untilPaid" class="stp-row">
        <span>Every</span>
        <input v-model.number="interval" type="number" min="1" max="90" class="ui-input stp-num" aria-label="Days between reminders" data-testid="remind-every" @input="emitValue" />
        <span>days, at most</span>
        <input v-model.number="count" type="number" min="1" max="50" class="ui-input stp-num" aria-label="Most reminders" data-testid="remind-count" @input="emitValue" />
        <span>times</span>
      </div>
    </div>

    <!-- Recurring messages -->
    <div v-else-if="allowRepeat" class="stp-repeat">
      <div class="ui-field">
        <label :for="uid + '-f'">Repeat</label>
        <select :id="uid + '-f'" v-model="freq" class="ui-select" data-testid="repeat-freq" @change="emitValue">
          <option value="none">Doesn't repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <template v-if="freq !== 'none'">
        <div class="stp-row">
          <span>Every</span>
          <input v-model.number="interval" type="number" min="1" max="365" class="ui-input stp-num" aria-label="Interval" data-testid="repeat-interval" @input="emitValue" />
          <span>{{ unit }}</span>
        </div>
        <div v-if="freq === 'weekly'" class="stp-days" role="group" aria-label="Days of the week">
          <button v-for="d in weekdays" :key="d.value" type="button" class="stp-day" :class="{ on: days.includes(d.value) }" :aria-pressed="days.includes(d.value)" @click="toggleDay(d.value)">
            {{ d.short }}
          </button>
        </div>
        <div v-if="freq === 'monthly'" class="stp-row stp-month">
          <label class="stp-radio"><input v-model="monthMode" type="radio" value="day" @change="emitValue" /> On day</label>
          <input v-model.number="monthDay" type="number" min="1" max="31" class="ui-input stp-num" :disabled="monthMode !== 'day'" aria-label="Day of the month" data-testid="repeat-monthday" @input="emitValue" />
          <label class="stp-radio"><input v-model="monthMode" type="radio" value="last" data-testid="repeat-lastday" @change="emitValue" /> On the last day</label>
        </div>
        <p v-if="freq === 'monthly' && monthMode === 'day' && monthDay > 28" class="ui-hint m0">Shorter months use their last day.</p>
        <div class="stp-row stp-end">
          <span>Ends</span>
          <select v-model="endMode" class="ui-select stp-endsel" aria-label="Ends" data-testid="repeat-end" @change="emitValue">
            <option value="never">Never</option>
            <option value="until">On a date</option>
            <option value="count">After a number of times</option>
          </select>
          <input v-if="endMode === 'until'" v-model="until" type="date" class="ui-input stp-date" :min="date || today" aria-label="Last date" @change="emitValue" />
          <template v-if="endMode === 'count'">
            <input v-model.number="count" type="number" min="1" max="5000" class="ui-input stp-num" aria-label="Number of times" data-testid="repeat-count" @input="emitValue" />
            <span>times</span>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { WEEKDAYS, localLabel, browserTimezone } from '@/services/schedsend'

let seq = 0

/**
 * When to send: quick picks (tomorrow 8:00, next Monday 8:00, in 1 hour —
 * worked out by the server in the chosen time zone) or a date and time, plus
 * the repeat rule. v-model: { local_send_at, timezone, repeat }.
 */
export default {
  name: 'SendTimePicker',
  props: {
    modelValue: { type: Object, required: true },
    meta: { type: Object, default: null },
    allowRepeat: { type: Boolean, default: false },
    reminder: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  data() {
    const v = this.modelValue || {}
    const r = v.repeat || {}
    const [date, time] = (v.local_send_at || '').split('T')
    return {
      uid: 'stp' + ++seq,
      chosen: v.local_send_at ? 'custom' : '',
      date: date || '',
      time: time || '08:00',
      zone: v.timezone || this.meta?.timezone || browserTimezone() || 'Africa/Nairobi',
      freq: r.freq || 'none',
      interval: r.interval || (this.reminder ? 7 : 1),
      days: r.weekdays?.length ? [...r.weekdays] : [],
      monthMode: r.month_day === -1 ? 'last' : 'day',
      monthDay: r.month_day > 0 ? r.month_day : 1,
      endMode: r.until ? 'until' : r.count ? 'count' : 'never',
      until: r.until || '',
      count: r.count || (this.reminder ? 6 : 12),
      untilPaid: this.reminder ? (r.freq ? r.freq !== 'none' : true) : false,
      weekdays: WEEKDAYS
    }
  },
  computed: {
    picks() {
      const q = (this.meta?.quick_picks || []).map((p) => ({ ...p }))
      return [...q, { key: 'custom', label: 'Pick a date & time', local: '' }]
    },
    zones() {
      const list = [this.zone, this.meta?.timezone, this.meta?.org_timezone, browserTimezone(), 'Africa/Nairobi', 'Australia/Adelaide', 'Australia/Sydney', 'UTC']
      return [...new Set(list.filter(Boolean))]
    },
    today() {
      return (this.meta?.now_local || '').slice(0, 10)
    },
    unit() {
      const one = this.interval === 1
      return { daily: one ? 'day' : 'days', weekly: one ? 'week' : 'weeks', monthly: one ? 'month' : 'months', yearly: one ? 'year' : 'years' }[this.freq] || ''
    }
  },
  watch: {
    meta(m) {
      if (m && !this.modelValue.timezone) this.zone = m.timezone
    }
  },
  mounted() {
    if (!this.modelValue.local_send_at && this.meta?.quick_picks?.length) this.usePick(this.meta.quick_picks[0])
    else this.emitValue()
  },
  methods: {
    when(local) {
      return localLabel(local)
    },
    usePick(q) {
      this.chosen = q.key
      if (q.key !== 'custom') {
        const [d, t] = q.local.split('T')
        this.date = d
        this.time = t
      } else if (!this.date) {
        this.date = this.today
      }
      this.emitValue()
    },
    toggleDay(v) {
      this.days = this.days.includes(v) ? this.days.filter((x) => x !== v) : [...this.days, v]
      this.emitValue()
    },
    repeatValue() {
      if (this.reminder) {
        if (!this.untilPaid) return { freq: 'none' }
        return { freq: 'daily', interval: Math.max(1, Number(this.interval) || 7), count: Math.max(1, Number(this.count) || 1), stop_when_paid: true }
      }
      if (!this.allowRepeat || this.freq === 'none') return { freq: 'none' }
      const r = { freq: this.freq, interval: Math.max(1, Number(this.interval) || 1) }
      if (this.freq === 'weekly' && this.days.length) r.weekdays = [...this.days].sort()
      if (this.freq === 'monthly') r.month_day = this.monthMode === 'last' ? -1 : Math.min(31, Math.max(1, Number(this.monthDay) || 1))
      if (this.endMode === 'until' && this.until) r.until = this.until
      if (this.endMode === 'count') r.count = Math.max(1, Number(this.count) || 1)
      return r
    },
    emitValue() {
      const local = this.date && this.time ? `${this.date}T${this.time.slice(0, 5)}` : ''
      this.$emit('update:modelValue', { local_send_at: local, timezone: this.zone, repeat: this.repeatValue() })
    }
  }
}
</script>

<style scoped>
.stp {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stp-picks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}
.stp-pick {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  text-align: left;
  min-width: 0;
}
.stp-pick:hover {
  background: var(--surface-hover);
}
.stp-pick.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.stp-pick strong {
  font-size: 13.5px;
}
.stp-pick small {
  color: var(--text-3);
  font-size: 12px;
}
.stp-custom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.stp-zone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
.stp-tz__select {
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  padding: 0;
  cursor: pointer;
  max-width: 100%;
}
.stp-repeat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.stp-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
}
.stp-num {
  width: 76px;
}
.stp-date {
  width: auto;
  min-width: 150px;
}
.stp-endsel {
  width: auto;
}
.stp-days {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.stp-day {
  min-width: 46px;
  padding: 6px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 600;
}
.stp-day.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}
.stp-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.m0 {
  margin: 0;
}
.muted {
  color: var(--text-3);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
@media (max-width: 520px) {
  .stp-picks {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
