<template>
  <!-- Thin home/draw/away bar beside its figures (no text on the bar; the figures and the label carry the values). -->
  <div class="fbt" :style="{ height: h + 'px' }" role="img" :aria-label="label" :title="label">
    <template v-if="valid">
      <i v-if="p.h > 0" :style="{ flexGrow: p.h, background: 'var(--fb-home)' }"></i>
      <i v-if="p.d > 0" :style="{ flexGrow: p.d, background: 'var(--fb-draw)' }"></i>
      <i v-if="p.a > 0" :style="{ flexGrow: p.a, background: 'var(--fb-away)' }"></i>
    </template>
    <i v-else class="fbt__none"></i>
  </div>
</template>

<script>
export default {
  name: 'FbThin',
  props: {
    home: { type: Number, default: null },
    draw: { type: Number, default: null },
    away: { type: Number, default: null },
    h: { type: Number, default: 6 },
    what: { type: String, default: 'Fair probability' },
    names: { type: Array, default: () => ['Home', 'Draw', 'Away'] }
  },
  computed: {
    valid() {
      return this.home != null && this.draw != null && this.away != null
    },
    p() {
      return { h: Number(this.home) || 0, d: Number(this.draw) || 0, a: Number(this.away) || 0 }
    },
    label() {
      if (!this.valid) return `${this.what}: not available`
      const f = (v) => `${(v * 100).toFixed(1)}%`
      return `${this.what}: ${this.names[0]} ${f(this.p.h)}, ${this.names[1]} ${f(this.p.d)}, ${this.names[2]} ${f(this.p.a)}`
    }
  }
}
</script>

<style scoped>
.fbt {
  display: flex;
  gap: 2px;
  width: 100%;
  min-width: 40px;
}
.fbt i {
  flex-basis: 0;
  min-width: 2px;
  border-radius: 999px;
  display: block;
}
.fbt__none {
  flex: 1;
  background: var(--border);
}
</style>
