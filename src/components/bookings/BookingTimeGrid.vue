<template>
  <div class="tg-scroll">
    <div class="tg" :class="{ 'tg--single': days.length === 1 }" :style="{ '--cols': days.length, '--hour': hourPx + 'px' }">
      <!-- header -->
      <div class="tg__corner"></div>
      <div v-for="d in days" :key="'h' + d.toISOString()" class="tg__dayhead" :class="{ 'is-today': isToday(d) }">
        <span class="dow">{{ dow(d) }}</span>
        <span class="dnum">{{ d.getDate() }}</span>
        <span v-if="countFor(d)" class="dcount">{{ countFor(d) }}</span>
      </div>

      <!-- body -->
      <div class="tg__times" :style="{ height: bodyHeight + 'px' }">
        <div v-for="h in hours" :key="'t' + h" class="tg__time" :style="{ top: (h - startHour) * hourPx + 'px' }">{{ hourLabel(h) }}</div>
      </div>
      <div
        v-for="(d, di) in days"
        :key="'c' + d.toISOString()"
        class="tg__col"
        :class="{ 'is-today': isToday(d), 'is-weekend': isWeekend(d) }"
        :style="{ height: bodyHeight + 'px' }"
      >
        <button
          v-for="s in slots"
          :key="s"
          type="button"
          class="tg__slot"
          :class="{ 'is-hour': s % 2 === 0, 'is-past': isPast(d, s) }"
          :style="{ top: s * (hourPx / 2) + 'px', height: hourPx / 2 + 'px' }"
          :aria-label="`New booking ${dow(d)} ${d.getDate()} at ${slotLabel(s)}`"
          @click="$emit('slot', slotDate(d, s))"
        >
          <span class="tg__plus"><i class="fa-solid fa-plus"></i> {{ slotLabel(s) }}</span>
        </button>

        <div v-if="isToday(d) && nowTop !== null" class="tg__now" :style="{ top: nowTop + 'px' }"></div>

        <button
          v-for="ev in layout[di]"
          :key="ev.b.id"
          type="button"
          class="tg__ev"
          :class="[`st-${ev.b.status}`, { 'is-short': ev.height < 38 }]"
          :style="{ top: ev.top + 'px', height: ev.height + 'px', left: `calc(${(ev.lane / ev.lanes) * 100}% + 2px)`, width: `calc(${100 / ev.lanes}% - 4px)` }"
          :title="tooltip(ev.b)"
          @click.stop="$emit('select', ev.b)"
        >
          <span class="ev__time">{{ formatTime(ev.b.start_time) }}<template v-if="days.length === 1"> – {{ formatTime(ev.b.end_time) }}</template></span>
          <span class="ev__name">{{ personName(ev.b.customer) || 'Booking' }}</span>
          <span v-if="ev.height >= 50" class="ev__svc">{{ serviceNames(ev.b) }}</span>
          <span v-if="days.length === 1 && ev.height >= 68 && ev.b.staff" class="ev__svc"><i class="fa-regular fa-user"></i> {{ personName(ev.b.staff) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { personName, formatTime, statusMeta, sameDay } from './bookingUtils'

export default {
  name: 'BookingTimeGrid',
  props: {
    days: { type: Array, required: true }, // Date[] (local midnight)
    bookings: { type: Array, default: () => [] },
    hourPx: { type: Number, default: 56 }
  },
  emits: ['slot', 'select'],
  data() {
    return { now: new Date(), timer: null }
  },
  computed: {
    visible() {
      return this.bookings.filter((b) => this.days.some((d) => sameDay(d, b.start_time)))
    },
    startHour() {
      let h = 7
      for (const b of this.visible) h = Math.min(h, new Date(b.start_time).getHours())
      return h
    },
    endHour() {
      let h = 20
      for (const b of this.visible) {
        const e = new Date(b.end_time)
        const eh = sameDay(e, b.start_time) ? e.getHours() + (e.getMinutes() ? 1 : 0) : 24
        h = Math.max(h, eh)
      }
      return Math.min(24, h)
    },
    hours() {
      const out = []
      for (let h = this.startHour; h < this.endHour; h++) out.push(h)
      return out
    },
    slots() {
      return Array.from({ length: (this.endHour - this.startHour) * 2 }, (_, i) => i)
    },
    bodyHeight() {
      return (this.endHour - this.startHour) * this.hourPx
    },
    nowTop() {
      const mins = this.now.getHours() * 60 + this.now.getMinutes() - this.startHour * 60
      if (mins < 0 || mins > (this.endHour - this.startHour) * 60) return null
      return (mins / 60) * this.hourPx
    },
    layout() {
      return this.days.map((d) => {
        const dayStart = new Date(d)
        dayStart.setHours(this.startHour, 0, 0, 0)
        const items = this.visible
          .filter((b) => sameDay(d, b.start_time))
          .map((b) => {
            const s = new Date(b.start_time)
            let e = new Date(b.end_time)
            if (!sameDay(e, s)) {
              e = new Date(s)
              e.setHours(this.endHour, 0, 0, 0)
            }
            const top = ((s - dayStart) / 3600000) * this.hourPx
            const height = Math.max(22, ((e - s) / 3600000) * this.hourPx - 2)
            return { b, s: +s, e: +e, top, height, lane: 0, lanes: 1 }
          })
          .sort((a, b) => a.s - b.s || b.e - a.e)
        // group overlapping bookings into clusters and assign lanes
        let cluster = []
        let clusterEnd = 0
        const flush = () => {
          const lanesEnd = []
          for (const it of cluster) {
            let lane = lanesEnd.findIndex((end) => end <= it.s)
            if (lane === -1) {
              lane = lanesEnd.length
              lanesEnd.push(it.e)
            } else lanesEnd[lane] = it.e
            it.lane = lane
          }
          for (const it of cluster) it.lanes = lanesEnd.length
          cluster = []
        }
        for (const it of items) {
          if (cluster.length && it.s >= clusterEnd) flush()
          cluster.push(it)
          clusterEnd = Math.max(clusterEnd, it.e)
        }
        flush()
        return items
      })
    }
  },
  mounted() {
    this.timer = setInterval(() => (this.now = new Date()), 60000)
    this.$nextTick(this.scrollToNow)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    personName,
    formatTime,
    isToday(d) {
      return sameDay(d, this.now)
    },
    isWeekend(d) {
      return d.getDay() === 0 || d.getDay() === 6
    },
    dow(d) {
      return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d)
    },
    countFor(d) {
      return this.visible.filter((b) => sameDay(d, b.start_time) && !['cancelled', 'no_show'].includes(b.status)).length
    },
    hourLabel(h) {
      const d = new Date(2000, 0, 1, h)
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(d)
    },
    slotDate(d, s) {
      const x = new Date(d)
      x.setHours(this.startHour, s * 30, 0, 0)
      return x
    },
    slotLabel(s) {
      return formatTime(this.slotDate(new Date(2000, 0, 1), s))
    },
    isPast(d, s) {
      return this.slotDate(d, s) < this.now
    },
    serviceNames(b) {
      return (b.services || []).map((s) => s.name).join(', ')
    },
    tooltip(b) {
      return `${personName(b.customer)} · ${formatTime(b.start_time)}–${formatTime(b.end_time)} · ${statusMeta(b.status).label}${this.serviceNames(b) ? '\n' + this.serviceNames(b) : ''}`
    },
    scrollToNow() {
      const el = this.$el
      if (!el || el.scrollHeight <= el.clientHeight) return
      const first = Math.min(...this.layout.flat().map((i) => i.top), this.nowTop ?? Infinity)
      if (Number.isFinite(first)) el.scrollTop = Math.max(0, first - this.hourPx)
    }
  }
}
</script>

<style scoped>
.tg-scroll {
  overflow: auto;
  max-height: calc(100vh - 250px);
  min-height: 420px;
}

.tg {
  display: grid;
  grid-template-columns: 56px repeat(var(--cols), minmax(0, 1fr));
  min-width: 760px;
  position: relative;
}

.tg--single { min-width: 0; }

.tg__corner,
.tg__dayhead {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.tg__dayhead {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 4px;
  border-left: 1px solid var(--border);
  font-size: 13px;
}

.dow {
  color: var(--text-3);
  font-weight: 550;
  text-transform: uppercase;
  font-size: 11.5px;
  letter-spacing: 0.04em;
}

.dnum {
  font-weight: 650;
  font-size: 15px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-variant-numeric: tabular-nums;
}

.tg__dayhead.is-today .dnum {
  background: var(--accent);
  color: var(--accent-contrast, #fff);
}

.tg__dayhead.is-today .dow { color: var(--accent); }

.dcount {
  font-size: 11px;
  background: var(--neutral-soft);
  color: var(--text-3);
  padding: 1px 6px;
  border-radius: 999px;
}

.tg__times {
  position: relative;
}

.tg__time {
  position: absolute;
  right: 8px;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tg__time:first-child { transform: none; }

.tg__col {
  position: relative;
  border-left: 1px solid var(--border);
}

.tg__col.is-weekend { background: var(--bg-subtle); }
.tg__col.is-today { background: color-mix(in srgb, var(--accent-soft) 45%, transparent); }

.tg__slot {
  position: absolute;
  left: 0;
  right: 0;
  border: 0;
  border-top: 1px dashed color-mix(in srgb, var(--border) 60%, transparent);
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
}

.tg__slot.is-hour { border-top: 1px solid var(--border); }
.tg__slot:first-child { border-top: 0; }

.tg__plus {
  opacity: 0;
  margin: 3px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  pointer-events: none;
}

.tg__slot:hover,
.tg__slot:focus-visible {
  background: var(--accent-soft);
  outline: none;
}

.tg__slot:hover .tg__plus,
.tg__slot:focus-visible .tg__plus { opacity: 1; }

.tg__slot.is-past:hover { background: var(--surface-hover); }
.tg__slot.is-past .tg__plus { color: var(--text-3); }

.tg__now {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--danger);
  z-index: 2;
  pointer-events: none;
}

.tg__now::before {
  content: '';
  position: absolute;
  left: -5px;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--danger);
}

.tg__ev {
  --c: var(--info);
  --bgc: var(--info-soft);
  position: absolute;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  overflow: hidden;
  padding: 4px 7px;
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  border-left: 3px solid var(--c);
  border-radius: 7px;
  background: var(--surface);
  background-image: linear-gradient(var(--bgc), var(--bgc));
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition: box-shadow 0.15s, transform 0.15s;
}

.tg__ev:hover {
  box-shadow: var(--shadow);
  z-index: 2;
}

.tg__ev:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.tg__ev.is-short {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding-top: 0;
  padding-bottom: 0;
}

.ev__time {
  font-size: 11px;
  font-weight: 600;
  color: var(--c);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.ev__name {
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.ev__svc {
  font-size: 11.5px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.st-confirmed { --c: var(--accent); --bgc: var(--accent-soft); }
.st-in_progress { --c: var(--warning); --bgc: var(--warning-soft); }
.st-completed { --c: var(--success); --bgc: var(--success-soft); }
.st-cancelled,
.st-no_show { --c: var(--text-3); --bgc: var(--neutral-soft); opacity: 0.75; }
.st-cancelled .ev__name,
.st-no_show .ev__name { text-decoration: line-through; }
</style>
