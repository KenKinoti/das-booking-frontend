<template>
  <!-- Home / draw / away shares, one row per source, on one shared 0–100% axis. Shares are printed
       inside a block only when they fit; every value is also in the tooltip, the aria-label and the table view. -->
  <div ref="root" class="fbs" :class="{ 'is-narrow': narrow }">
    <div v-for="r in rows" :key="r.key" class="fbs__row" :data-row="r.key">
      <div class="fbs__label">
        <span class="fbs__name"
          ><i v-if="r.dot" class="fbs__dot" :class="{ 'is-ring': r.ring }" :style="r.ring ? { boxShadow: 'inset 0 0 0 2px ' + r.dot } : { background: r.dot }" aria-hidden="true"></i>{{ r.label }}</span
        >
        <span v-if="r.sub" class="fbs__sub">{{ r.sub }}</span>
      </div>
      <div
        class="fbs__bar"
        role="img"
        tabindex="0"
        :aria-label="`${r.label}: ${names[0]} ${pctTxt(r.h)}, ${names[1]} ${pctTxt(r.d)}, ${names[2]} ${pctTxt(r.a)}`"
        @focus="focusRow(r)"
        @blur="tip = null"
      >
        <template v-if="r.h != null">
          <div
            v-for="(seg, i) in segs(r)"
            :key="i"
            class="fbs__seg"
            :class="'fbs__seg--' + seg.k"
            :style="{ flexGrow: seg.v, background: seg.color }"
            :data-p="seg.v.toFixed(4)"
            @pointerenter="onEnter($event, r, seg)"
            @pointermove="onEnter($event, r, seg)"
            @pointerleave="tip = null"
          >
            <span v-if="fits(seg.v)" class="fbs__txt">{{ pctTxt(seg.v, 0) }}</span>
          </div>
        </template>
        <div v-else class="fbs__empty">{{ r.empty || 'Not available' }}</div>
      </div>
    </div>
    <div v-if="tip" class="fb-tip" :style="tip.style" role="status">
      <div class="fb-tip__title">{{ tip.row }}</div>
      <div v-for="l in tip.lines" :key="l.name" class="fb-tip__row">
        <span><i class="fb-key" :style="{ background: l.color }"></i>{{ l.name }}</span>
        <strong>{{ l.value }}</strong>
      </div>
      <div v-if="tip.note" class="fb-tip__row fb-muted" style="margin-top: 2px">{{ tip.note }}</div>
    </div>
  </div>
</template>

<script>
const COLORS = ['var(--fb-home)', 'var(--fb-draw)', 'var(--fb-away)']

export default {
  name: 'FbStack',
  props: {
    // [{ key, label, sub, h, d, a, note, empty, dot? (source colour swatch), ring? (hollow swatch) }]
    rows: { type: Array, default: () => [] },
    names: { type: Array, default: () => ['Home', 'Draw', 'Away'] }
  },
  data() {
    return { width: 0, tip: null, ro: null }
  },
  computed: {
    narrow() {
      return this.width > 0 && this.width < 520
    },
    barWidth() {
      return this.narrow ? this.width : Math.max(80, this.width - 172)
    }
  },
  mounted() {
    this.measure()
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.measure())
      this.ro.observe(this.$refs.root)
    }
  },
  beforeUnmount() {
    if (this.ro) this.ro.disconnect()
  },
  methods: {
    measure() {
      if (this.$refs.root) this.width = this.$refs.root.clientWidth
    },
    segs(r) {
      return [
        { k: 'h', v: Math.max(0, Number(r.h) || 0), color: COLORS[0], name: this.names[0] },
        { k: 'd', v: Math.max(0, Number(r.d) || 0), color: COLORS[1], name: this.names[1] },
        { k: 'a', v: Math.max(0, Number(r.a) || 0), color: COLORS[2], name: this.names[2] }
      ].filter((s) => s.v > 0)
    },
    pctTxt(v, d = 1) {
      return v == null ? '—' : `${(Number(v) * 100).toFixed(d)}%`
    },
    fits(v) {
      return v * this.barWidth >= 38
    },
    lines(r) {
      return [
        { name: this.names[0], value: `${this.pctTxt(r.h)} · fair odds ${r.h > 0 ? (1 / r.h).toFixed(2) : '—'}`, color: COLORS[0] },
        { name: this.names[1], value: `${this.pctTxt(r.d)} · fair odds ${r.d > 0 ? (1 / r.d).toFixed(2) : '—'}`, color: COLORS[1] },
        { name: this.names[2], value: `${this.pctTxt(r.a)} · fair odds ${r.a > 0 ? (1 / r.a).toFixed(2) : '—'}`, color: COLORS[2] }
      ]
    },
    onEnter(e, r, seg) {
      const rect = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const right = px > rect.width / 2
      this.tip = {
        row: r.label + (r.sub ? ` — ${r.sub}` : ''),
        lines: this.lines(r).map((l) => (l.name === seg.name ? { ...l, name: l.name + ' ◂' } : l)),
        note: r.note,
        style: { left: (right ? px - 12 : px + 12) + 'px', top: py + 14 + 'px', transform: right ? 'translateX(-100%)' : 'none' }
      }
    },
    focusRow(r) {
      this.tip = { row: r.label + (r.sub ? ` — ${r.sub}` : ''), lines: this.lines(r), note: r.note, style: { left: '0px', top: '0px', transform: 'translateY(-100%)' } }
    }
  }
}
</script>

<style scoped>
.fbs {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.fbs__row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}
.is-narrow .fbs__row {
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}
.fbs__label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.is-narrow .fbs__label {
  flex-direction: row;
  gap: 6px;
  align-items: baseline;
}
.fbs__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.fbs__dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: 0;
}
.fbs__sub {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fbs__bar {
  display: flex;
  gap: 2px;
  height: 26px;
  min-width: 0;
  border-radius: 4px;
}
.fbs__bar:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.fbs__seg {
  flex-basis: 0;
  min-width: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 7px;
  overflow: visible;
  cursor: default;
  transition: filter 0.12s;
}
.fbs__seg:hover {
  filter: brightness(1.08);
}
.fbs__seg--a {
  justify-content: flex-end;
}
.fbs__seg--d {
  justify-content: center;
}
.fbs__txt {
  color: var(--fb-ink-on-fill);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.fbs__empty {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px dashed var(--border-strong);
  color: var(--text-3);
  font-size: 12px;
}
</style>
