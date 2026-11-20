<template>
  <!-- One stacked home/draw/away bar per jackpot game on a shared 0–100% scale. The pick is marked with a
       solid ink rule under its block and a check; a second choice (double/triple) gets a hollow rule.
       Shares are printed inside a block only when they fit; every value is in the tooltip, the aria-label
       and the table view (FbFigure). -->
  <div ref="root" class="fbjb" :class="{ 'is-narrow': narrow }">
    <div v-for="g in games" :key="g.key" class="fbjb__row" :data-game="g.n" :data-pick="g.pick">
      <div class="fbjb__label">
        <span class="fbjb__n fb-num">{{ g.n }}</span>
        <span class="fbjb__name" :title="g.label">{{ g.label }}</span>
        <span v-if="g.sub" class="fbjb__sub">{{ g.sub }}</span>
      </div>
      <div class="fbjb__track">
        <div
          class="fbjb__bar"
          role="img"
          tabindex="0"
          :aria-label="aria(g)"
          @focus="focusRow(g)"
          @blur="tip = null"
        >
          <template v-if="g.h != null">
            <div
              v-for="seg in segs(g)"
              :key="seg.k"
              class="fbjb__seg"
              :class="['fbjb__seg--' + seg.k, { 'is-pick': seg.sym === g.pick, 'is-second': (g.extra || []).includes(seg.sym) }]"
              :style="{ flexGrow: seg.v }"
              :data-sym="seg.sym"
              :data-p="seg.v.toFixed(4)"
              @pointerenter="onEnter($event, g, seg)"
              @pointermove="onEnter($event, g, seg)"
              @pointerleave="tip = null"
            >
              <span class="fbjb__fill" :style="{ background: seg.color }">
                <span v-if="fits(seg.v, seg.sym === g.pick)" class="fbjb__txt">
                  <i v-if="seg.sym === g.pick" class="fa-solid fa-check" aria-hidden="true"></i>{{ seg.sym === g.pick ? seg.sym + ' ' : '' }}{{ pctTxt(seg.v, 0) }}
                </span>
              </span>
              <span class="fbjb__rule" aria-hidden="true"></span>
            </div>
          </template>
          <div v-else class="fbjb__empty">{{ g.empty || 'No probabilities yet' }}</div>
        </div>
      </div>
      <div class="fbjb__pick">
        <b class="fbjb__sym" :class="{ 'is-multi': (g.extra || []).length }">{{ [g.pick, ...(g.extra || [])].filter(Boolean).join('') || '—' }}</b>
        <span class="fb-num fbjb__pp">{{ g.pick ? pctTxt(pOf(g, g.pick), 0) : '' }}</span>
      </div>
    </div>
    <div v-if="tip" class="fb-tip" :style="tip.style" role="status">
      <div class="fb-tip__title">{{ tip.title }}</div>
      <div v-for="l in tip.lines" :key="l.name" class="fb-tip__row">
        <span><i class="fb-key" :style="{ background: l.color }"></i>{{ l.name }}</span>
        <strong>{{ l.value }}</strong>
      </div>
      <div v-if="tip.note" class="fb-tip__row fb-muted" style="margin-top: 2px">{{ tip.note }}</div>
    </div>
  </div>
</template>

<script>
const COLORS = { h: 'var(--fb-home)', d: 'var(--fb-draw)', a: 'var(--fb-away)' }
const SYM = { h: '1', d: 'X', a: '2' }

export default {
  name: 'FbJackpotBoard',
  props: {
    // [{ key, n, label, sub, h, d, a, pick: '1'|'X'|'2', extra: ['X'], names: [home, away], note }]
    games: { type: Array, default: () => [] }
  },
  data() {
    return { width: 0, tip: null, ro: null }
  },
  computed: {
    narrow() {
      return this.width > 0 && this.width < 560
    },
    barWidth() {
      return this.narrow ? this.width - 64 : Math.max(80, this.width - 260 - 64)
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
    segs(g) {
      return ['h', 'd', 'a'].map((k) => ({ k, sym: SYM[k], v: Math.max(0, Number(g[k]) || 0), color: COLORS[k] })).filter((s) => s.v > 0)
    },
    pOf(g, sym) {
      return sym === '1' ? g.h : sym === 'X' ? g.d : g.a
    },
    pctTxt(v, d = 1) {
      return v == null ? '—' : `${(Number(v) * 100).toFixed(d)}%`
    },
    fits(v, pick) {
      return v * this.barWidth >= (pick ? 64 : 36)
    },
    names(g) {
      const n = g.names || ['Home', 'Away']
      return { '1': `1 · ${n[0]}`, X: 'X · Draw', '2': `2 · ${n[1]}` }
    },
    lines(g) {
      const nm = this.names(g)
      return this.segs(g).map((s) => ({
        name: nm[s.sym] + (s.sym === g.pick ? ' (pick)' : (g.extra || []).includes(s.sym) ? ' (cover)' : ''),
        value: `${this.pctTxt(s.v)} · fair odds ${s.v > 0 ? (1 / s.v).toFixed(2) : '—'}`,
        color: s.color
      }))
    },
    aria(g) {
      if (g.h == null) return `${g.n}. ${g.label}: no probabilities yet`
      const nm = this.names(g)
      return `${g.n}. ${g.label}: ${nm['1']} ${this.pctTxt(g.h)}, ${nm.X} ${this.pctTxt(g.d)}, ${nm['2']} ${this.pctTxt(g.a)}. Pick ${g.pick}${(g.extra || []).length ? ', also covering ' + g.extra.join(' and ') : ''}.`
    },
    onEnter(e, g, seg) {
      const rect = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const right = px > rect.width / 2
      this.tip = {
        title: `${g.n}. ${g.label}`,
        lines: this.lines(g).map((l) => (l.name.startsWith(seg.sym + ' ') ? { ...l, name: l.name + ' ◂' } : l)),
        note: g.note,
        style: { left: (right ? px - 12 : px + 12) + 'px', top: py + 14 + 'px', transform: right ? 'translateX(-100%)' : 'none' }
      }
    },
    focusRow(g) {
      const el = this.$refs.root.querySelector(`[data-game="${g.n}"]`)
      const top = el ? el.offsetTop : 0
      this.tip = { title: `${g.n}. ${g.label}`, lines: this.lines(g), note: g.note, style: { left: '0px', top: top + 'px', transform: 'translateY(-100%)' } }
    }
  }
}
</script>

<style scoped>
.fbjb {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}
.fbjb__row {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 10px;
}
.is-narrow .fbjb__row {
  grid-template-columns: minmax(0, 1fr) 54px;
  grid-template-areas: 'label label' 'track pick';
  row-gap: 3px;
}
.is-narrow .fbjb__label {
  grid-area: label;
}
.is-narrow .fbjb__track {
  grid-area: track;
}
.is-narrow .fbjb__pick {
  grid-area: pick;
}
.fbjb__label {
  min-width: 0;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  column-gap: 6px;
  line-height: 1.25;
}
.fbjb__n {
  grid-row: span 2;
  font-size: 12px;
  font-weight: 650;
  color: var(--text-3);
  padding-top: 1px;
}
.fbjb__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fbjb__sub {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fbjb__track {
  min-width: 0;
}
.fbjb__bar {
  display: flex;
  gap: 2px;
  min-width: 0;
  border-radius: 4px;
}
.fbjb__bar:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.fbjb__seg {
  flex-basis: 0;
  min-width: 3px;
  display: grid;
  grid-template-rows: 24px 3px;
  row-gap: 3px;
  cursor: default;
}
.fbjb__fill {
  display: flex;
  align-items: center;
  padding: 0 7px;
  border-radius: 4px;
  transition: filter 0.12s;
}
.fbjb__seg:hover .fbjb__fill {
  filter: brightness(1.08);
}
.fbjb__seg--d .fbjb__fill {
  justify-content: center;
}
.fbjb__seg--a .fbjb__fill {
  justify-content: flex-end;
}
.fbjb__txt {
  color: var(--fb-ink-on-fill);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.fbjb__txt i {
  font-size: 10px;
}
.fbjb__rule {
  border-radius: 2px;
}
.fbjb__seg.is-pick .fbjb__rule {
  background: var(--text);
}
.fbjb__seg.is-second .fbjb__rule {
  box-shadow: inset 0 0 0 1px var(--text-2);
}
.fbjb__pick {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}
.fbjb__sym {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 24px;
  padding: 0 4px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 750;
  background: var(--neutral-soft);
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.fbjb__sym.is-multi {
  background: var(--accent-soft);
}
.fbjb__pp {
  font-size: 12px;
  color: var(--text-2);
  min-width: 28px;
  text-align: right;
}
.is-narrow .fbjb__pp {
  display: none;
}
.fbjb__empty {
  flex: 1;
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px dashed var(--border-strong);
  color: var(--text-3);
  font-size: 12px;
}
</style>
