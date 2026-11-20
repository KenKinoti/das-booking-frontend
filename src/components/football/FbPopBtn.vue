<template>
  <!-- A small button that opens a popover kept inside the viewport (click / Enter; Escape or a click outside closes). -->
  <span ref="root" class="fbpb">
    <button type="button" :class="btnClass" :aria-expanded="open" :aria-label="label" :data-test="testId" @click="open = !open" @keydown.esc="open = false">
      <slot name="button" />
    </button>
    <div v-if="open" class="fb-pop" :style="style" role="dialog" :aria-label="label">
      <slot />
    </div>
  </span>
</template>

<script>
export default {
  name: 'FbPopBtn',
  props: {
    label: { type: String, default: 'Details' },
    btnClass: { type: [String, Array, Object], default: 'fb-linkbtn' },
    testId: { type: String, default: null }
  },
  data() {
    return { open: false, style: {} }
  },
  watch: {
    open(v) {
      if (!v) return
      const r = this.$refs.root?.getBoundingClientRect()
      if (!r) return
      const vw = document.documentElement.clientWidth
      const w = Math.min(320, vw - 32)
      let left = 0
      if (r.left + w > vw - 16) left = vw - 16 - w - r.left
      if (r.left + left < 16) left = 16 - r.left
      this.style = { left: left + 'px', width: w + 'px', top: 'calc(100% + 6px)' }
    }
  },
  mounted() {
    document.addEventListener('click', this.outside, true)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.outside, true)
  },
  methods: {
    outside(e) {
      if (this.open && this.$refs.root && !this.$refs.root.contains(e.target)) this.open = false
    }
  }
}
</script>

<style scoped>
.fbpb {
  position: relative;
  display: inline-flex;
}
</style>
