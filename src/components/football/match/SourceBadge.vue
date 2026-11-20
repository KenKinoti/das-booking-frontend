<template>
  <!-- "Source check" badge: agree / minor difference / conflict (icon + word, never colour alone). Click, Enter or
       hover opens a popover listing each source's value; conflicts never block the page, they are flagged. -->
  <span ref="root" class="fbsb" @mouseenter="hoverOpen" @mouseleave="hoverClose">
    <button
      type="button"
      class="fb-chk"
      :class="'fb-chk--' + st"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      :data-test="'fb-srcchk-' + (testKey || 'badge')"
      :data-status="st"
      @click="toggle"
      @keydown.esc="open = false"
    >
      <i :class="icon" aria-hidden="true"></i><span>{{ word }}</span><span v-if="count" class="fb-muted">· {{ count }}</span>
    </button>
    <div v-if="open" class="fb-pop" :style="popStyle" role="dialog" :aria-label="title + ' — sources'" data-test="fb-srcchk-pop">
      <div class="fb-pop__title">{{ title }}</div>
      <div v-for="(c, i) in items" :key="i" class="fbsb__item">
        <div class="fbsb__stat">
          <span>{{ c.label }}</span>
          <span class="fb-chk fbsb__mini" :class="'fb-chk--' + c.status"><i :class="iconOf(c.status)" aria-hidden="true"></i>{{ wordOf(c.status) }}</span>
        </div>
        <table>
          <tbody>
            <tr v-for="(s, j) in c.sources" :key="j" :class="{ 'is-off': s.agree === false }">
              <td>{{ s.name }}<span v-if="s.when" class="fb-muted"> · {{ s.when }}</span></td>
              <td>
                {{ s.value }}<i v-if="s.agree === false" class="fa-solid fa-not-equal" aria-label="differs" style="margin-left: 4px"></i>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="c.note" class="fb-muted fb-small" style="margin-top: 3px">{{ c.note }}</div>
      </div>
      <div v-if="!items.length" class="fb-muted">No second source covers this yet.</div>
      <div class="fb-muted fb-small fbsb__foot">Differences are flagged, not hidden. The page keeps API-Football's figures.</div>
    </div>
  </span>
</template>

<script>
export const CHECK_WORD = { agree: 'Sources agree', minor: 'Minor difference', conflict: 'Conflict', none: 'One source' }
export const CHECK_ICON = { agree: 'fa-solid fa-circle-check', minor: 'fa-solid fa-circle-minus', conflict: 'fa-solid fa-triangle-exclamation', none: 'fa-regular fa-circle' }

/** Worst status of a list of checks (conflict > minor > agree > none). */
export function worstStatus(list) {
  const order = { conflict: 3, minor: 2, agree: 1, none: 0 }
  let w = 'none'
  for (const c of list || []) if ((order[c?.status] ?? 0) > order[w]) w = c.status
  return w
}

export default {
  name: 'SourceBadge',
  props: {
    // [{ label, status, sources: [{ name, value, agree, when }], note }]
    checks: { type: Array, default: () => [] },
    title: { type: String, default: 'Source check' },
    testKey: { type: String, default: '' },
    short: { type: Boolean, default: false }
  },
  data() {
    return { open: false, pinned: false, timer: null, popStyle: {} }
  },
  computed: {
    items() {
      return (this.checks || []).filter(Boolean)
    },
    st() {
      return worstStatus(this.items)
    },
    word() {
      if (this.short) return { agree: 'Agree', minor: 'Minor', conflict: 'Conflict', none: '1 source' }[this.st]
      return CHECK_WORD[this.st]
    },
    icon() {
      return CHECK_ICON[this.st]
    },
    count() {
      const n = this.items.filter((c) => c.status === this.st).length
      return this.st !== 'agree' && this.st !== 'none' && n > 1 ? n : 0
    },
    ariaLabel() {
      return `${this.title}: ${CHECK_WORD[this.st]}. Show each source's value.`
    }
  },
  mounted() {
    document.addEventListener('click', this.outside, true)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.outside, true)
    clearTimeout(this.timer)
  },
  watch: {
    open(v) {
      if (v) this.place()
    }
  },
  methods: {
    place() {
      // Keep the popover inside the viewport (16 px gutter) wherever the badge sits.
      const r = this.$refs.root?.getBoundingClientRect()
      if (!r) return
      const vw = document.documentElement.clientWidth
      const w = Math.min(340, vw - 32)
      let left = 0
      if (r.left + w > vw - 16) left = vw - 16 - w - r.left
      if (r.left + left < 16) left = 16 - r.left
      this.popStyle = { left: left + 'px', width: w + 'px', maxWidth: w + 'px' }
    },
    iconOf(s) {
      return CHECK_ICON[s] || CHECK_ICON.none
    },
    wordOf(s) {
      return { agree: 'agree', minor: 'minor', conflict: 'conflict', none: '1 source' }[s] || s
    },
    toggle() {
      this.pinned = !this.open || !this.pinned
      this.open = this.pinned
    },
    hoverOpen() {
      if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return
      clearTimeout(this.timer)
      this.open = true
    },
    hoverClose() {
      if (this.pinned) return
      this.timer = setTimeout(() => (this.open = false), 150)
    },
    outside(e) {
      if (this.open && this.$refs.root && !this.$refs.root.contains(e.target)) {
        this.open = false
        this.pinned = false
      }
    }
  }
}
</script>

<style scoped>
.fbsb {
  position: relative;
  display: inline-flex;
}
.fbsb .fb-pop {
  top: calc(100% + 6px);
  left: 0;
}
.fbsb__item + .fbsb__item {
  margin-top: 8px;
}
.fbsb__stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 2px;
}
.fbsb__mini {
  height: 18px;
  font-size: 10.5px;
  padding: 0 6px;
  cursor: default;
}
.fbsb__foot {
  margin-top: 8px;
}
</style>
