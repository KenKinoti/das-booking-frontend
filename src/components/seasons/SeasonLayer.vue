<template>
  <!-- Greeting chip in the top bar (after the breadcrumb) -->
  <Teleport v-if="chipHost && showChip" :to="chipHost">
    <div class="season-chip" :class="{ 'is-preview': isPreview }" :data-season-chip="theme" :title="chipTitle" :aria-label="chipTitle" role="note">
      <i :class="icon" class="season-chip__icon" aria-hidden="true"></i>
      <span class="season-chip__text">{{ chipText }}</span>
      <button v-if="isPreview" type="button" class="season-chip__stop" data-testid="season-stop-preview" aria-label="Stop preview" title="Stop preview" @click="stop">
        <i class="fa-solid fa-stop" aria-hidden="true"></i><span class="season-chip__wide">Stop preview</span>
      </button>
      <button v-else type="button" class="season-chip__x" aria-label="Hide greeting" title="Hide greeting" @click="hide"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </div>
  </Teleport>

  <!-- Corner ornament in the page gutter (never over content) -->
  <Teleport v-if="cornerHost && theme && ornSize >= 18" :to="cornerHost">
    <div class="season-corner" :style="cornerStyle" aria-hidden="true">
      <SeasonOrnament :theme="theme" />
    </div>
  </Teleport>
</template>

<script>
import router from '@/router'
import SeasonOrnament from './SeasonOrnament.vue'
import { season, seasonTheme, stopPreview, hideGreeting } from '@/composables/useSeason'
import { seasonIcon } from './themes'

export default {
  name: 'SeasonLayer',
  components: { SeasonOrnament },
  data() {
    return { chipHost: null, cornerHost: null, padTop: 0, padRight: 0, observer: null, resizeObs: null }
  },
  computed: {
    theme() {
      return seasonTheme()
    },
    isPreview() {
      return season.reason === 'preview'
    },
    showChip() {
      return !!this.theme && !!season.occasion && (this.isPreview || (!season.greetingHidden && !!season.occasion.greeting))
    },
    icon() {
      return seasonIcon(this.theme)
    },
    chipText() {
      const o = season.occasion || {}
      return this.isPreview ? `Preview: ${o.name || ''}` : o.greeting
    },
    chipTitle() {
      const o = season.occasion || {}
      return this.isPreview ? `Previewing the ${o.name} theme — only you see this` : `${o.greeting} — ${o.name}`
    },
    // The ornament box: its drawing stays inside a quarter circle the size
    // of the box, which must not reach the content corner (padding-right,
    // padding-top) — so the box is no bigger than that distance.
    ornSize() {
      return Math.min(44, Math.floor(Math.hypot(this.padTop, this.padRight)))
    },
    cornerStyle() {
      return { top: `-${this.padTop}px`, right: `-${this.padRight}px`, width: `${this.ornSize}px`, height: `${this.ornSize}px` }
    }
  },
  watch: {
    theme() {
      this.$nextTick(this.ensureHosts)
    }
  },
  mounted() {
    this.ensureHosts()
    const app = document.getElementById('app')
    if (app && 'MutationObserver' in window) {
      // The app shell mounts / unmounts as people sign in and out.
      this.observer = new MutationObserver(() => this.ensureHosts())
      this.observer.observe(app, { childList: true })
    }
    window.addEventListener('resize', this.measure, { passive: true })
    this.offRoute = router.afterEach(() => this.$nextTick(this.ensureHosts))
  },
  beforeUnmount() {
    this.observer?.disconnect()
    this.resizeObs?.disconnect()
    this.offRoute?.()
    window.removeEventListener('resize', this.measure)
  },
  methods: {
    ensureHosts() {
      const left = document.querySelector('.tb__left')
      if (left) {
        if (!this.chipHost || !left.contains(this.chipHost)) {
          const h = document.createElement('div')
          h.className = 'season-chip-host'
          left.appendChild(h)
          this.chipHost = h
        }
      } else if (this.chipHost && !this.chipHost.isConnected) {
        this.chipHost = null
      }
      const main = document.querySelector('.app-content')
      if (main) {
        if (!this.cornerHost || !main.contains(this.cornerHost)) {
          const h = document.createElement('div')
          h.className = 'season-corner-host'
          h.setAttribute('aria-hidden', 'true')
          main.insertBefore(h, main.firstChild)
          this.cornerHost = h
          this.resizeObs?.disconnect()
          if ('ResizeObserver' in window) {
            this.resizeObs = new ResizeObserver(() => this.measure())
            this.resizeObs.observe(main)
          }
        }
        this.measure()
      } else if (this.cornerHost && !this.cornerHost.isConnected) {
        this.cornerHost = null
      }
    },
    measure() {
      const main = this.cornerHost?.parentElement
      if (!main) return
      const cs = getComputedStyle(main)
      this.padTop = parseFloat(cs.paddingTop) || 0
      this.padRight = parseFloat(cs.paddingRight) || 0
    },
    stop() {
      stopPreview()
    },
    hide() {
      hideGreeting()
    }
  }
}
</script>
