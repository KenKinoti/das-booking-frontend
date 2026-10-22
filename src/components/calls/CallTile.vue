<template>
  <div
    class="tile"
    :class="{ 'is-self': self, 'is-speaking': speaking && mic, 'is-off': !showVideo, 'is-screen': screen, 'is-small': small }"
    :data-peer="peerId || undefined"
    :data-conn="conn || undefined"
    :data-testid="self ? 'tile-self' : 'tile-peer'"
  >
    <video ref="v" class="tile__video" :class="{ mirror }" autoplay playsinline muted></video>
    <div v-if="!showVideo" class="tile__avatar" aria-hidden="true">
      <span>{{ initials }}</span>
    </div>
    <div v-if="status" class="tile__status"><i class="fa-solid fa-circle-notch fa-spin"></i> {{ status }}</div>
    <div class="tile__label">
      <i v-if="!mic" class="fa-solid fa-microphone-slash tile__muted" aria-label="Muted"></i>
      <i v-else-if="speaking && !small" class="fa-solid fa-volume-high" aria-hidden="true"></i>
      <span class="tile__name">{{ label }}</span>
      <span v-if="host" class="tile__host">Host</span>
      <i v-if="screen && !small" class="fa-solid fa-display" title="Sharing their screen"></i>
      <span v-if="!self && quality && !small" class="tile__q" :class="`q-${quality}`" :title="qualityLabel"><i></i><i></i><i></i></span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CallTile',
  props: {
    stream: { type: Object, default: null },
    name: { type: String, default: '' },
    peerId: { type: String, default: '' },
    self: { type: Boolean, default: false },
    mirror: { type: Boolean, default: false },
    mic: { type: Boolean, default: true },
    cam: { type: Boolean, default: true },
    screen: { type: Boolean, default: false },
    host: { type: Boolean, default: false },
    conn: { type: String, default: '' },
    quality: { type: String, default: '' },
    speaking: { type: Boolean, default: false },
    muted: { type: Boolean, default: false }, // remote audio off (speaker toggle / not unlocked yet)
    sinkId: { type: String, default: '' },
    tracks: { type: Number, default: 0 },
    unlock: { type: Number, default: 0 },
    small: { type: Boolean, default: false }
  },
  emits: ['blocked', 'playing'],
  data() {
    return { forced: false }
  },
  computed: {
    label() {
      if (!this.self) return this.name || 'Guest'
      if (!this.name) return 'You'
      return this.small ? this.name : `${this.name} (you)`
    },
    initials() {
      const p = (this.name || '?').trim().split(/\s+/)
      return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
    },
    showVideo() {
      return !!this.stream && (this.cam || this.screen)
    },
    status() {
      if (this.self) return ''
      if (this.conn === 'reconnecting') return 'Reconnecting…'
      if (this.conn === 'failed') return 'Trying again…'
      if (this.conn && this.conn !== 'connected') return 'Connecting…'
      return ''
    },
    qualityLabel() {
      return { good: 'Good connection', fair: 'Fair connection', poor: 'Poor connection' }[this.quality] || ''
    }
  },
  watch: {
    stream() {
      this.attach()
    },
    tracks() {
      this.play()
    },
    unlock() {
      this.forced = false
      this.play()
    },
    muted() {
      this.play()
    },
    sinkId() {
      this.applySink()
    }
  },
  mounted() {
    this.attach()
  },
  beforeUnmount() {
    const v = this.$refs.v
    if (v) v.srcObject = null
  },
  methods: {
    attach() {
      const v = this.$refs.v
      if (!v) return
      if (v.srcObject !== this.stream) v.srcObject = this.stream || null
      this.applySink()
      this.play()
    },
    applySink() {
      const v = this.$refs.v
      if (!v || this.self || !this.sinkId || typeof v.setSinkId !== 'function') return
      v.setSinkId(this.sinkId).catch(() => {})
    },
    play() {
      const v = this.$refs.v
      if (!v) return
      // the element's muted flag is managed here (not bound) so a forced mute can be lifted
      v.muted = this.self || this.muted || this.forced
      if (!v.srcObject) return
      const p = v.play()
      if (p && p.catch) {
        p.then(() => this.$emit('playing')).catch((err) => {
          if (err?.name === 'NotAllowedError' && !v.muted) {
            // sound needs a tap first (iOS / autoplay rules): play muted, offer the button
            this.forced = true
            v.muted = true
            v.play().catch(() => {})
            this.$emit('blocked')
          }
        })
      }
    }
  }
}
</script>

<style scoped>
.tile {
  --scrim: rgba(8, 10, 18, 0.62);
  --on-scrim: #fff;
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  min-height: 0;
  min-width: 0;
  isolation: isolate;
  transition: box-shadow 0.15s var(--ease, ease);
}
.tile.is-speaking {
  box-shadow: 0 0 0 3px var(--success);
}
.tile__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: transparent;
}
.tile.is-screen .tile__video {
  object-fit: contain;
}
.tile__video.mirror {
  transform: scaleX(-1);
}
.tile__avatar {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--bg-subtle);
  z-index: 1;
}
.tile__avatar span {
  width: clamp(56px, 28%, 120px);
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: clamp(18px, 4vw, 38px);
}
.is-small .tile__avatar span {
  font-size: 16px;
  width: 44px;
}
.tile__status {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  background: var(--scrim);
  color: var(--on-scrim);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12.5px;
  white-space: nowrap;
}
.tile__label {
  position: absolute;
  left: 8px;
  bottom: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}
.tile__label > * {
  flex: none;
}
.tile__label {
  color: var(--on-scrim);
  font-size: 13px;
}
.tile__label .tile__name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--scrim);
  padding: 3px 9px;
  border-radius: 999px;
  font-weight: 600;
}
.tile__label > i {
  background: var(--scrim);
  border-radius: 999px;
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
}
.tile__muted {
  color: #ffb4b4;
}
.tile__host {
  background: var(--accent);
  color: var(--accent-contrast);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
}
.is-small .tile__label {
  font-size: 11.5px;
  left: 5px;
  bottom: 5px;
}
.is-small .tile__host {
  display: none;
}
.tile__q {
  margin-left: auto;
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 22px;
  padding: 4px 6px;
  border-radius: 999px;
  background: var(--scrim);
}
.tile__q i {
  width: 3px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.35);
}
.tile__q i:nth-child(1) {
  height: 5px;
}
.tile__q i:nth-child(2) {
  height: 9px;
}
.tile__q i:nth-child(3) {
  height: 13px;
}
.q-good i {
  background: #4ade80;
}
.q-fair i:nth-child(-n + 2) {
  background: #facc15;
}
.q-poor i:nth-child(1) {
  background: #f87171;
}
</style>
