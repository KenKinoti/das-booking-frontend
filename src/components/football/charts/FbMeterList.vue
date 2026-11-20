<template>
  <!-- A list of named rows, each with a bar and its figure, bars aligned.
       mode="bars": every bar on one shared 0–max scale (e.g. chance of at least k correct).
       mode="meter": each row against its own limit (e.g. a source's usage against its budget); the track is a
       lighter step of the fill and the fill turns warning/critical near the limit (always with the figure). -->
  <ul ref="root" class="fbml" :class="{ 'is-narrow': narrow }" role="list" :aria-label="ariaLabel">
    <li
      v-for="r in drawn"
      :key="r.key"
      class="fbml__row"
      :data-row="r.key"
      tabindex="0"
      :aria-label="r.aria"
      @pointerenter="onEnter($event, r)"
      @pointermove="onEnter($event, r)"
      @pointerleave="tip = null"
      @focus="onFocus(r)"
      @blur="tip = null"
    >
      <span class="fbml__label">
        <span class="fbml__name">{{ r.label }}</span>
        <span v-if="r.sub" class="fbml__sub">{{ r.sub }}</span>
      </span>
      <span class="fbml__track" :class="{ 'is-meter': mode === 'meter' }" :style="mode === 'meter' ? { background: trackColor(r) } : null">
        <span class="fbml__fill" :style="{ width: r.w + '%', background: r.fill }" :data-v="r.value"></span>
      </span>
      <span class="fbml__fig fb-num">{{ r.valueText }}</span>
    </li>
    <li v-if="tip" class="fb-tip" :style="tip.style" role="status">
      <div class="fb-tip__title">{{ tip.title }}</div>
      <div v-for="t in tip.lines" :key="t[0]" class="fb-tip__row">
        <span>{{ t[0] }}</span><strong>{{ t[1] }}</strong>
      </div>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'FbMeterList',
  props: {
    // [{ key, label, sub, value, max (meter mode), valueText, color, tip: [[name, value]], aria }]
    rows: { type: Array, default: () => [] },
    mode: { type: String, default: 'bars' },
    color: { type: String, default: 'var(--fb-home)' },
    ariaLabel: { type: String, default: 'Bars' }
  },
  data() {
    return { width: 0, tip: null, ro: null }
  },
  computed: {
    narrow() {
      return this.width > 0 && this.width < 460
    },
    shared() {
      return Math.max(...this.rows.map((r) => Number(r.value) || 0), 1e-12)
    },
    drawn() {
      return this.rows.map((r) => {
        const v = Number(r.value) || 0
        const max = this.mode === 'meter' ? Math.max(1e-12, Number(r.max) || 0) : this.shared
        const ratio = Math.max(0, Math.min(1, v / max))
        let fill = r.color || this.color
        if (this.mode === 'meter' && !r.color) fill = ratio >= 1 ? 'var(--fb-bad)' : ratio >= 0.85 ? 'var(--fb-warn)' : this.color
        return { ...r, value: v, ratio, w: v > 0 ? Math.max(0.6, ratio * 100) : 0, fill, aria: r.aria || `${r.label}: ${r.valueText}` }
      })
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
    trackColor(r) {
      return `color-mix(in srgb, ${r.color || this.color} 16%, var(--surface))`
    },
    onEnter(e, r) {
      if (!r.tip) return
      const rect = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const right = px > rect.width / 2
      this.tip = { title: r.label, lines: r.tip, style: { left: (right ? px - 12 : px + 12) + 'px', top: py + 14 + 'px', transform: right ? 'translateX(-100%)' : 'none' } }
    },
    onFocus(r) {
      if (!r.tip) return
      const el = this.$refs.root.querySelector(`[data-row="${r.key}"]`)
      this.tip = { title: r.label, lines: r.tip, style: { left: '0px', top: (el ? el.offsetTop : 0) + 'px', transform: 'translateY(-100%)' } }
    }
  }
}
</script>

<style scoped>
.fbml {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}
.fbml__row {
  display: grid;
  grid-template-columns: minmax(120px, 240px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border-radius: 6px;
}
.fbml__row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.is-narrow .fbml__row {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'label fig' 'track track';
  row-gap: 4px;
}
.is-narrow .fbml__label {
  grid-area: label;
}
.is-narrow .fbml__track {
  grid-area: track;
}
.is-narrow .fbml__fig {
  grid-area: fig;
}
.fbml__label {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.fbml__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.fbml__sub {
  font-size: 11.5px;
  color: var(--text-3);
}
.fbml__track {
  display: block;
  height: 14px;
  min-width: 0;
}
.fbml__track.is-meter {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
}
.fbml__fill {
  display: block;
  height: 100%;
  border-radius: 0 4px 4px 0;
  min-width: 0;
}
.is-meter .fbml__fill {
  border-radius: 999px;
}
.fbml__fig {
  font-size: 12.5px;
  color: var(--text-2);
  white-space: nowrap;
  text-align: right;
}
</style>
