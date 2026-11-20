<template>
  <!-- Team or competition crest from the provider; falls back to the short code when the image is missing. -->
  <span class="fb-crest" :style="{ width: size + 'px', height: size + 'px', fontSize: Math.max(9, Math.round(size * 0.36)) + 'px' }" :title="name" aria-hidden="true">
    <img v-if="src && !failed" :src="src" alt="" loading="lazy" decoding="async" @error="failed = true" />
    <span v-else>{{ initials }}</span>
  </span>
</template>

<script>
export default {
  name: 'FbCrest',
  props: {
    src: { type: String, default: '' },
    name: { type: String, default: '' },
    code: { type: String, default: '' },
    size: { type: Number, default: 22 }
  },
  data() {
    return { failed: false }
  },
  computed: {
    initials() {
      if (this.code) return this.code.slice(0, 3)
      const w = (this.name || '?').split(/\s+/).filter(Boolean)
      return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase()
    }
  },
  watch: {
    src() {
      this.failed = false
    }
  }
}
</script>
