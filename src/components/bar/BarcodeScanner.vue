<template>
  <div class="scan-backdrop" role="dialog" aria-modal="true" :aria-label="heading" data-testid="barcode-scanner" @mousedown.self="close">
    <div class="scan" :class="{ 'is-continuous': continuous }">
      <header class="scan__head">
        <strong><i class="fa-solid fa-barcode"></i> {{ heading }}</strong>
        <div class="scan__tools">
          <button v-if="torch" type="button" class="ui-btn ui-btn--ghost ui-btn--icon" :class="{ 'is-on': torchOn }" :aria-pressed="torchOn" :aria-label="torchOn ? 'Torch off' : 'Torch on'" :title="torchOn ? 'Torch off' : 'Torch on'" data-testid="scan-torch" @click="toggleTorch">
            <i class="fa-solid fa-lightbulb"></i>
          </button>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" :aria-pressed="sound" :aria-label="sound ? 'Beep on scan: on' : 'Beep on scan: off'" :title="sound ? 'Mute the beep' : 'Beep on scan'" @click="toggleSound">
            <i :class="sound ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'"></i>
          </button>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close scanner" @click="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>
      <div v-if="mode === 'camera' || mode === 'starting'" class="scan__view">
        <video ref="video" playsinline muted autoplay></video>
        <div class="scan__frame" :class="{ 'is-hit': flash }" aria-hidden="true"><span class="scan__laser"></span></div>
        <div v-if="mode === 'starting'" class="scan__starting"><i class="fa-solid fa-circle-notch fa-spin"></i> Starting the camera…</div>
        <p v-else class="scan__hint">{{ hint }}</p>
        <transition name="scan-toast">
          <div v-if="note" :key="note.key" class="scan__toast" :class="note.ok ? 'is-ok' : 'is-warn'" role="status" data-testid="scan-toast">
            <i :class="note.ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
            <span>{{ note.text }}</span>
          </div>
        </transition>
      </div>
      <div v-else class="scan__msg">
        <i class="fa-solid fa-keyboard"></i>
        <p>{{ message }}</p>
      </div>
      <p v-if="mode === 'camera'" class="scan__note" data-testid="scan-engine">{{ engineNote }}</p>
      <form class="scan__manual" @submit.prevent="submitManual">
        <input ref="manual" v-model.trim="manual" class="ui-input" inputmode="numeric" autocomplete="off" placeholder="Or type the barcode / SKU" aria-label="Barcode" data-testid="scan-manual" />
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="!manual">{{ continuous ? 'Add' : 'Find' }}</button>
        <button v-if="continuous" type="button" class="ui-btn" data-testid="scan-done" @click="close">Done</button>
      </form>
    </div>
  </div>
</template>

<script>
// Camera barcode scanning (utils/barcode/scanner.js): the browser's
// BarcodeDetector where it has one, the built-in decoder everywhere else
// (iPhone Safari, Firefox, desktop) for EAN-13/8, UPC-A/E, Code 128 and
// Code 39; QR codes need BarcodeDetector. Bluetooth / USB scanners type into
// the field too.
// Mounted only when the person taps a Scan button (the camera never starts
// on its own); the track goes through mediaGuard, so signing out or leaving
// the page turns the camera off, and so does closing this or leaving it in a
// hidden tab for 30 seconds.
//   single:     <BarcodeScanner @code="fill" @close="…" />          (the parent closes it)
//   continuous: <BarcodeScanner continuous :feedback="add" @close="…" />
//     feedback(code, format) → { ok, text, stop } (or a Promise of it)
import { cameraAvailable, CameraScanner, makeBeeper } from '@/utils/barcode/scanner'
import { whenHiddenFor } from '@/services/mediaGuard'

const SOUND_KEY = 'pos.scan.sound.v1'

export default {
  name: 'BarcodeScanner',
  props: {
    continuous: { type: Boolean, default: false },
    title: { type: String, default: '' },
    feedback: { type: Function, default: null },
    debounceMs: { type: Number, default: 1500 }
  },
  emits: ['code', 'close'],
  data() {
    let sound = true
    try {
      sound = localStorage.getItem(SOUND_KEY) !== 'off'
    } catch {
      sound = true
    }
    return { mode: 'starting', message: '', manual: '', engine: '', qr: false, torch: false, torchOn: false, sound, note: null, flash: false, closed: false }
  },
  computed: {
    heading() {
      return this.title || (this.continuous ? 'Scan barcodes' : 'Scan a barcode')
    },
    hint() {
      return this.continuous ? 'Hold each barcode in the frame — it adds itself' : 'Point the camera at the barcode'
    },
    engineNote() {
      if (this.engine === 'native') return this.qr ? 'Reads barcodes and QR codes.' : 'Reads barcodes. QR codes aren’t available on this device.'
      return 'Reads EAN, UPC and Code 128 barcodes. QR codes aren’t available in this browser (they need Chrome on Android).'
    }
  },
  async mounted() {
    this.unwatchHidden = whenHiddenFor(30 * 1000, () => this.close())
    if (!cameraAvailable()) {
      this.toManual('This browser doesn’t give the page a camera. Type the code, or use a Bluetooth / USB scanner.')
      return
    }
    this.beeper = makeBeeper()
    await this.$nextTick()
    this.scanner = new CameraScanner({
      video: this.$refs.video,
      continuous: this.continuous,
      debounceMs: this.debounceMs,
      alive: () => !this.closed,
      onCode: (c, f) => this.onCode(c, f)
    })
    if (typeof window !== 'undefined') window.__mposScan = this.scanner.stats
    try {
      await this.scanner.start()
      if (this.closed) return
      this.engine = this.scanner.engine
      this.qr = this.scanner.qr
      this.torch = this.scanner.torch
      this.mode = 'camera'
    } catch (e) {
      this.scanner?.stop()
      if (e?.closed || this.closed) return
      this.toManual(e?.name === 'NotAllowedError' ? 'Camera access was refused. Allow the camera for this site to scan, or type the code.' : 'The camera isn’t available. Type the code, or use a Bluetooth / USB scanner.')
    }
  },
  beforeUnmount() {
    this.stop()
  },
  methods: {
    toManual(msg) {
      this.mode = 'manual'
      this.message = msg
      this.$nextTick(() => this.$refs.manual?.focus())
    },
    async onCode(code, format) {
      if (this.closed) return
      if (!this.continuous || !this.feedback) {
        this.signal(true)
        this.$emit('code', code, format)
        return
      }
      let r
      try {
        r = await this.feedback(code, format)
      } catch {
        r = { ok: false, text: 'Couldn’t add that code' }
      }
      r = r || { ok: true, text: code }
      this.signal(r.ok !== false)
      this.show(r)
      if (r.stop) this.close()
    },
    signal(ok) {
      if (this.sound) this.beeper?.beep(ok ? 1760 : 440, ok ? 70 : 160)
      try {
        if (navigator.vibrate) navigator.vibrate(ok ? 40 : [40, 60, 40])
      } catch {
        /* no vibration */
      }
      this.flash = true
      clearTimeout(this.flashTimer)
      this.flashTimer = setTimeout(() => (this.flash = false), 260)
    },
    show(r) {
      this.note = { ok: r.ok !== false, text: r.text || '', key: Date.now() }
      clearTimeout(this.noteTimer)
      this.noteTimer = setTimeout(() => (this.note = null), 2600)
    },
    async toggleTorch() {
      if (!this.scanner) return
      this.torchOn = await this.scanner.setTorch(!this.torchOn)
    },
    toggleSound() {
      this.sound = !this.sound
      try {
        localStorage.setItem(SOUND_KEY, this.sound ? 'on' : 'off')
      } catch {
        /* per-device preference */
      }
    },
    stop() {
      this.closed = true
      clearTimeout(this.noteTimer)
      clearTimeout(this.flashTimer)
      this.unwatchHidden?.()
      this.unwatchHidden = null
      this.scanner?.stop()
      this.beeper?.close()
      this.beeper = null
    },
    async submitManual() {
      if (!this.manual) return
      const code = this.manual
      if (this.continuous && this.feedback) {
        this.manual = ''
        let r
        try {
          r = await this.feedback(code, 'typed')
        } catch {
          r = { ok: false, text: 'Couldn’t add that code' }
        }
        if (r) this.show(r)
        if (r?.stop) this.close()
        return
      }
      this.$emit('code', code, 'typed')
    },
    close() {
      this.stop()
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.scan-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  background: rgba(0, 0, 0, 0.7);
  display: grid;
  place-items: center;
  padding: 16px;
}
.scan {
  width: min(480px, 100%);
  max-height: calc(100dvh - 32px);
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.scan__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 16px;
  border-bottom: 1px solid var(--border);
}
.scan__tools {
  display: flex;
  gap: 2px;
}
.scan__tools .is-on {
  color: var(--warning);
  background: var(--warning-soft);
}
.scan__view {
  position: relative;
  overflow: hidden; /* the frame's dimming shadow stays on the picture */
  background: #000;
  aspect-ratio: 4 / 3;
  min-height: 0;
}
.scan__view video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.scan__frame {
  position: absolute;
  left: 8%;
  right: 8%;
  top: 22%;
  bottom: 22%;
  border: 3px solid var(--accent);
  border-radius: 12px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.35);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.scan__frame.is-hit {
  border-color: var(--success);
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.25), 0 0 0 6px color-mix(in srgb, var(--success) 45%, transparent);
}
.scan__laser {
  position: absolute;
  left: 6%;
  right: 6%;
  top: 50%;
  height: 2px;
  background: color-mix(in srgb, var(--danger) 85%, transparent);
  box-shadow: 0 0 8px var(--danger);
  animation: scan-laser 1.6s ease-in-out infinite alternate;
}
@keyframes scan-laser {
  from {
    transform: translateY(-34px);
  }
  to {
    transform: translateY(34px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .scan__laser {
    animation: none;
  }
}
.scan__hint,
.scan__starting {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 8px;
  margin: 0;
  text-align: center;
  color: #fff;
  font-size: 13px;
  text-shadow: 0 1px 2px #000;
}
.scan__starting {
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  font-size: 14px;
}
.scan__toast {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-lg);
}
.scan__toast span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scan__toast.is-ok i {
  color: var(--success);
}
.scan__toast.is-warn i {
  color: var(--warning);
}
.scan-toast-enter-active,
.scan-toast-leave-active {
  transition: opacity 0.18s, transform 0.18s;
}
.scan-toast-enter-from,
.scan-toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.scan__note {
  margin: 0;
  padding: 8px 14px 0;
  font-size: 12px;
  color: var(--text-3);
}
.scan__msg {
  padding: 28px 20px;
  text-align: center;
  color: var(--text-2);
}
.scan__msg i {
  font-size: 26px;
  color: var(--text-3);
}
.scan__msg p {
  margin: 10px 0 0;
  font-size: 14px;
}
.scan__manual {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border);
  margin-top: 8px;
}
.scan__manual .ui-input {
  flex: 1;
  min-width: 0;
  height: 46px;
  font-size: 16px;
}
.scan__manual .ui-btn {
  height: 46px;
}
@media (max-width: 480px) {
  .scan-backdrop {
    padding: 0;
    place-items: end stretch;
  }
  .scan {
    width: 100%;
    max-height: 100dvh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .scan__view {
    aspect-ratio: 3 / 4;
    max-height: 58dvh;
  }
  .scan__frame {
    top: 30%;
    bottom: 30%;
  }
}
</style>
